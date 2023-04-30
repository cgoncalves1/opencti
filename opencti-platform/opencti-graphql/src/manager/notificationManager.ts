import * as R from 'ramda';
import * as jsonpatch from 'fast-json-patch';
import { clearIntervalAsync, setIntervalAsync, SetIntervalAsyncTimer } from 'set-interval-async/fixed';
import type { Moment } from 'moment';
import {
  createStreamProcessor,
  fetchRangeNotifications,
  lockResource,
  storeNotificationEvent,
  StreamProcessor
} from '../database/redis';
import conf, { booleanConf, logApp } from '../config/conf';
import { TYPE_LOCK_ERROR } from '../config/errors';
import { executionContext, SYSTEM_USER } from '../utils/access';
import type { DataEvent, SseEvent, StreamNotifEvent, UpdateEvent } from '../types/event';
import type { AuthContext, AuthUser } from '../types/user';
import { utcDate } from '../utils/format';
import { EVENT_TYPE_CREATE, EVENT_TYPE_DELETE, EVENT_TYPE_UPDATE } from '../database/utils';
import type { StixCoreObject } from '../types/stix-common';
import {
  BasicStoreEntityDigestTrigger,
  BasicStoreEntityLiveTrigger,
  BasicStoreEntityTrigger,
  ENTITY_TYPE_TRIGGER
} from '../modules/notification/notification-types';
import { isStixMatchFilters } from '../utils/filtering';
import { getEntitiesFromCache } from '../database/cache';
import { ENTITY_TYPE_USER } from '../schema/internalObject';

const NOTIFICATION_ENGINE_KEY = conf.get('notification_manager:lock_key');
const EVENT_NOTIFICATION_VERSION = '1';
const CRON_SCHEDULE_TIME = 60000; // 1 minute
const STREAM_SCHEDULE_TIME = 10000;

interface ResolvedTrigger {
  users: Array<AuthUser>
  trigger: BasicStoreEntityTrigger
}

interface ResolvedLive {
  users: Array<AuthUser>
  trigger: BasicStoreEntityLiveTrigger
}

export interface ResolvedDigest {
  users: Array<AuthUser>
  trigger: BasicStoreEntityDigestTrigger
}

export interface NotificationUser {
  user_id: string
  user_email: string
  outcomes: Array<string>
}

export interface NotificationEvent extends StreamNotifEvent {
  type: 'live'
  targets: Array<{ user: NotificationUser, type: string }>
  data: StixCoreObject
}

export interface DigestEvent extends StreamNotifEvent {
  type: 'digest'
  target: NotificationUser
  data: Array<{ notification_id: string, instance: StixCoreObject, type: string }>
}

export const isLive = (n: ResolvedTrigger): n is ResolvedLive => n.trigger.trigger_type === 'live';
export const isDigest = (n: ResolvedTrigger): n is ResolvedDigest => n.trigger.trigger_type === 'digest';

export const getNotifications = async (context: AuthContext): Promise<Array<ResolvedTrigger>> => {
  const triggers = await getEntitiesFromCache<BasicStoreEntityTrigger>(context, SYSTEM_USER, ENTITY_TYPE_TRIGGER);
  const platformUsers = await getEntitiesFromCache<AuthUser>(context, SYSTEM_USER, ENTITY_TYPE_USER);
  return triggers.map((trigger) => {
    const triggerGroupIds = trigger.group_ids ?? [];
    const usersFromGroups = platformUsers.filter((user) => user.groups.map((g) => g.internal_id)
      .some((id: string) => triggerGroupIds.includes(id)));
    const triggerUserIds = trigger.user_ids ?? [];
    const usersFromIds = platformUsers.filter((user) => triggerUserIds.includes(user.id));
    return { users: [...usersFromGroups, ...usersFromIds], trigger };
  });
};

export const getLiveNotifications = async (context: AuthContext): Promise<Array<ResolvedLive>> => {
  const liveNotifications = await getNotifications(context);
  return liveNotifications.filter(isLive);
};

export const isTimeTrigger = (digest: ResolvedDigest, baseDate: Moment): boolean => {
  const now = baseDate.clone().startOf('minutes'); // 2022-11-25T19:11:00.000Z
  const { trigger } = digest;
  const triggerTime = trigger.trigger_time;
  switch (trigger.period) {
    case 'hour': {
      // Need to check if time is aligned on the perfect hour
      const nowHourAlign = now.clone().startOf('hours');
      return now.isSame(nowHourAlign);
    }
    case 'day': {
      // Need to check if time is aligned on the day hour (like 19:11:00.000Z)
      const dayTime = `${now.clone().format('HH:mm:ss.SSS')}Z`;
      return triggerTime === dayTime;
    }
    case 'week': {
      // Need to check if time is aligned on the week hour (like 1-19:11:00.000Z)
      // 1 being Monday and 7 being Sunday.
      const weekTime = `${now.clone().isoWeekday()}-${now.clone().format('HH:mm:ss.SSS')}Z`;
      return triggerTime === weekTime;
    }
    case 'month': {
      // Need to check if time is aligned on the month hour (like 22-19:11:00.000Z)
      const monthTime = `${now.clone().date()}-${now.clone().format('HH:mm:ss.SSS')}Z`;
      return triggerTime === monthTime;
    }
    default:
      return false;
  }
};

export const getDigestNotifications = async (context: AuthContext, baseDate: Moment): Promise<Array<ResolvedDigest>> => {
  const notifications = await getNotifications(context);
  return notifications.filter(isDigest).filter((digest) => isTimeTrigger(digest, baseDate));
};

const convertToNotificationUser = (user: AuthUser, outcomes: Array<string>): NotificationUser => {
  return {
    user_id: user.internal_id,
    user_email: user.user_email,
    outcomes,
  };
};

const eventTypeTranslater = (isPreviousMatch: boolean, isCurrentlyMatch: boolean, currentType: string) => {
  if (isPreviousMatch && !isCurrentlyMatch) { // No longer visible
    return EVENT_TYPE_DELETE;
  }
  if (!isPreviousMatch && isCurrentlyMatch) { // Newly visible
    return EVENT_TYPE_CREATE;
  }
  return currentType;
};

const notificationStreamHandler = async (streamEvents: Array<SseEvent<DataEvent>>) => {
  try {
    const context = executionContext('notification_manager');
    const liveNotifications = await getLiveNotifications(context);
    for (let index = 0; index < streamEvents.length; index += 1) {
      const { data: { data }, event: eventType } = streamEvents[index];
      // For each event we need to check if
      for (let notifIndex = 0; notifIndex < liveNotifications.length; notifIndex += 1) {
        const { users, trigger }: ResolvedLive = liveNotifications[notifIndex];
        const { internal_id: notification_id, filters, event_types, outcomes } = trigger;
        const { trigger_type: type } = trigger;
        const targets: Array<{ user: NotificationUser, type: string }> = [];
        const frontendFilters = JSON.parse(filters);
        if (eventType === EVENT_TYPE_UPDATE) {
          const { context: dataContext } = streamEvents[index].data as UpdateEvent;
          const { newDocument: previous } = jsonpatch.applyPatch(R.clone(data), dataContext.reverse_patch);
          for (let indexUser = 0; indexUser < users.length; indexUser += 1) {
            const user = users[indexUser];
            const isPreviousMatch = await isStixMatchFilters(context, user, previous, frontendFilters);
            const isCurrentlyMatch = await isStixMatchFilters(context, user, data, frontendFilters);
            const translatedType = eventTypeTranslater(isPreviousMatch, isCurrentlyMatch, eventType);
            if (isPreviousMatch && !isCurrentlyMatch && event_types.includes(translatedType)) { // No longer visible
              targets.push({ user: convertToNotificationUser(user, outcomes), type: translatedType });
            } else if (!isPreviousMatch && isCurrentlyMatch && event_types.includes(translatedType)) { // Newly visible
              targets.push({ user: convertToNotificationUser(user, outcomes), type: translatedType });
            } else if (isCurrentlyMatch && event_types.includes(translatedType)) { // Just an update
              targets.push({ user: convertToNotificationUser(user, outcomes), type: translatedType });
            }
          }
        } else if (event_types.includes(eventType)) { // create or delete
          for (let indexUser = 0; indexUser < users.length; indexUser += 1) {
            const user = users[indexUser];
            const isCurrentlyMatch = await isStixMatchFilters(context, user, data, frontendFilters);
            if (isCurrentlyMatch) {
              targets.push({ user: convertToNotificationUser(user, outcomes), type: eventType });
            }
          }
        }
        if (targets.length > 0) {
          const version = EVENT_NOTIFICATION_VERSION;
          const notificationEvent: NotificationEvent = { version, notification_id, type, targets, data };
          await storeNotificationEvent(context, notificationEvent);
        }
      }
    }
  } catch (e) {
    logApp.error('[OPENCTI-MODULE] Error executing notification manager (live)', { error: e });
  }
};

const notificationDigestHandler = async () => {
  const context = executionContext('notification_manager');
  const baseDate = utcDate().startOf('minutes');
  try {
    // Get digest that need to be executed
    const digestNotifications = await getDigestNotifications(context, baseDate);
    // Iter on each digest an generate the output
    for (let index = 0; index < digestNotifications.length; index += 1) {
      const { trigger, users } = digestNotifications[index];
      const { period, trigger_ids: triggerIds, outcomes, internal_id: notification_id, trigger_type: type } = trigger;
      const fromDate = baseDate.clone().subtract(1, period).toDate();
      const rangeNotifications = await fetchRangeNotifications<NotificationEvent>(fromDate, baseDate.toDate());
      const digestContent = rangeNotifications.filter((n) => triggerIds.includes(n.notification_id));
      if (digestContent.length > 0) {
        // Range of results must filtered to keep only data related to the digest
        // And related to the users participating to the digest
        for (let userIndex = 0; userIndex < users.length; userIndex += 1) {
          const user = users[userIndex];
          const userNotifications = digestContent.filter((d) => d.targets
            .map((t) => t.user.user_id).includes(user.internal_id));
          if (userNotifications.length > 0) {
            const version = EVENT_NOTIFICATION_VERSION;
            const target = convertToNotificationUser(user, outcomes);
            const data = userNotifications.map((n) => {
              const userTarget = n.targets.find((t) => t.user.user_id === user.internal_id);
              return ({ notification_id: n.notification_id, type: userTarget?.type ?? type, instance: n.data });
            });
            const digestEvent: DigestEvent = { version, notification_id, type, target, data };
            await storeNotificationEvent(context, digestEvent);
          }
        }
      }
    }
  } catch (e) {
    logApp.error('[OPENCTI-MODULE] Error executing notification manager (digest)', { error: e });
  }
};

const initNotificationManager = () => {
  const WAIT_TIME_ACTION = 2000;
  let streamScheduler: SetIntervalAsyncTimer<[]>;
  let cronScheduler: SetIntervalAsyncTimer<[]>;
  let streamProcessor: StreamProcessor;
  let notificationListening = true;
  const wait = (ms: number) => {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  };
  const notificationHandler = async () => {
    if (!notificationListening) return;
    let lock;
    try {
      // Lock the manager
      lock = await lockResource([NOTIFICATION_ENGINE_KEY], { retryCount: 0 });
      logApp.info('[OPENCTI-MODULE] Running notification manager');
      streamProcessor = createStreamProcessor(SYSTEM_USER, 'Notification manager', notificationStreamHandler);
      await streamProcessor.start('live');
      while (notificationListening) {
        await wait(WAIT_TIME_ACTION);
      }
    } catch (e: any) {
      if (e.name === TYPE_LOCK_ERROR) {
        logApp.debug('[OPENCTI-MODULE] Notification manager already started by another API');
      } else {
        logApp.error('[OPENCTI-MODULE] Notification manager failed to start', { error: e });
      }
    } finally {
      if (streamProcessor) await streamProcessor.shutdown();
      if (lock) await lock.unlock();
    }
  };
  return {
    start: async () => {
      streamScheduler = setIntervalAsync(async () => {
        if (notificationListening) {
          await notificationHandler();
        }
      }, STREAM_SCHEDULE_TIME);
      cronScheduler = setIntervalAsync(async () => {
        await notificationDigestHandler();
      }, CRON_SCHEDULE_TIME);
    },
    status: () => {
      return {
        id: 'NOTIFICATION_MANAGER',
        enable: booleanConf('notification_manager:enabled', false),
        running: false,
      };
    },
    shutdown: async () => {
      notificationListening = false;
      if (streamScheduler) await clearIntervalAsync(streamScheduler);
      if (cronScheduler) await clearIntervalAsync(cronScheduler);
      return true;
    },
  };
};
const notificationManager = initNotificationManager();

export default notificationManager;
