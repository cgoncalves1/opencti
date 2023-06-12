import * as R from 'ramda';
import { ENTITY_TYPE_CASE_TEMPLATE } from '../modules/case/case-template/case-template-types';
import { generateInternalId, generateStandardId } from '../schema/identifier';
import { ENTITY_TYPE_BACKGROUND_TASK } from '../schema/internalObject';
import { now } from '../utils/format';
import { BYPASS } from '../utils/access';
import { KNOWLEDGE_DELETE } from '../schema/general';
import { ForbiddenAccess } from '../config/errors';
import { elIndex } from '../database/engine';
import { INDEX_INTERNAL_OBJECTS } from '../database/utils';
import { ENTITY_TYPE_NOTIFICATION } from '../modules/notification/notification-types';
import { isStixCoreObject } from '../schema/stixCoreObject';
import { isStixCoreRelationship } from '../schema/stixCoreRelationship';
import { publishUserAction } from '../listener/UserActionListener';
import { storeLoadById } from '../database/middleware-loader';

export const ACTION_TYPE_DELETE = 'DELETE';
export const TASK_TYPE_LIST = 'LIST';
export const ACTION_TYPE_SHARE = 'SHARE';
export const ACTION_TYPE_UNSHARE = 'UNSHARE';

export const checkActionValidity = (user, actions) => {
  const askForDeletion = actions.filter((a) => a.type === ACTION_TYPE_DELETE).length > 0;
  if (askForDeletion) {
    // If deletion action available, user need to have the right capability
    const userCapabilities = R.flatten(user.capabilities.map((c) => c.name.split('_')));
    const isAuthorized = userCapabilities.includes(BYPASS) || userCapabilities.includes(KNOWLEDGE_DELETE);
    if (!isAuthorized) {
      throw ForbiddenAccess();
    }
  }
};

export const createDefaultTask = (user, input, taskType, taskExpectedNumber) => {
  const taskId = generateInternalId();
  return {
    id: taskId,
    internal_id: taskId,
    standard_id: generateStandardId(ENTITY_TYPE_BACKGROUND_TASK, input),
    entity_type: ENTITY_TYPE_BACKGROUND_TASK,
    initiator_id: user.internal_id,
    created_at: now(),
    completed: false,
    // Task related
    type: taskType,
    last_execution_date: null,
    task_position: null, // To mark the progress.
    task_processed_number: 0, // Initial number of processed element
    task_expected_number: taskExpectedNumber, // Expected number of element processed
    errors: [], // To stock the errors
  };
};

const buildListTask = async (user, input) => {
  const { actions, ids } = input;
  const task = createDefaultTask(user, input, TASK_TYPE_LIST, ids.length);
  const listTask = { ...task, actions, task_ids: ids };
  await publishUserAction({
    user,
    event_type: 'mutation',
    event_scope: 'create',
    event_access: 'extended',
    message: 'creates `background task`',
    context_data: { entity_type: ENTITY_TYPE_BACKGROUND_TASK, input: listTask }
  });
  await elIndex(INDEX_INTERNAL_OBJECTS, listTask);
  return listTask;
};

export const createListTask = async (user, input) => {
  const { actions } = input;
  checkActionValidity(user, actions);
  const listTask = await buildListTask(user, input);
  return listTask;
};

const isNotification = async (context, user, narrativeId) => {
  return storeLoadById(context, user, narrativeId, ENTITY_TYPE_NOTIFICATION)
    .then((data) => {
      if (data) {
        return true;
      }
      return false;
    });
};

export const createNotificationListTask = async (context, user, input) => {
  const { ids } = input;
  const areNotifications = await Promise.all(ids.map((id) => isNotification(context, user, id)));
  // the list task should be on notifications (else: call createListTask that check action validity)
  if (areNotifications.some((n) => !n)) {
    throw Error('The task should concern notifications.');
  }
  const listTask = await buildListTask(user, input);
  return listTask;
};

export const isTaskEnabledEntity = (entityType) => {
  return isStixCoreObject(entityType) || isStixCoreRelationship(entityType) || [ENTITY_TYPE_NOTIFICATION, ENTITY_TYPE_CASE_TEMPLATE].includes(entityType);
};
