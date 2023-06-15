import { SemanticAttributes } from '@opentelemetry/semantic-conventions';
import type { BasicStoreIdentifier, StoreEntity, StoreRelation } from '../types/store';
import { UnsupportedError } from '../config/errors';
import { telemetry } from '../config/tracing';
import type { AuthContext, AuthUser } from '../types/user';
import type { StixId, StixObject } from '../types/stix-common';
import {
  ENTITY_TYPE_GROUP,
  ENTITY_TYPE_ROLE,
  ENTITY_TYPE_STREAM_COLLECTION,
  ENTITY_TYPE_USER
} from '../schema/internalObject';
import { ENTITY_TYPE_RESOLVED_FILTERS } from '../schema/stixDomainObject';
import { ENTITY_TYPE_TRIGGER } from '../modules/notification/notification-types';
import { convertStoreToStix } from './stix-converter';

const STORE_ENTITIES_LINKS: Record<string, string[]> = {
  // Filters must be reset depending on stream and triggers modifications
  [ENTITY_TYPE_STREAM_COLLECTION]: [ENTITY_TYPE_RESOLVED_FILTERS],
  [ENTITY_TYPE_TRIGGER]: [ENTITY_TYPE_RESOLVED_FILTERS],
  // Users must be reset depending on roles and groups modifications
  [ENTITY_TYPE_ROLE]: [ENTITY_TYPE_USER],
  [ENTITY_TYPE_GROUP]: [ENTITY_TYPE_USER],
};

const cache: any = {};

const buildStoreEntityMap = <T extends BasicStoreIdentifier>(entities: Array<T>) => {
  const entityById = new Map();
  for (let i = 0; i < entities.length; i += 1) {
    const entity = entities[i];
    const ids = [entity.internal_id, ...(entity.x_opencti_stix_ids ?? [])];
    if (entity.standard_id) {
      ids.push(entity.standard_id);
    }
    for (let index = 0; index < ids.length; index += 1) {
      const id = ids[index];
      entityById.set(id, entity);
    }
  }
  return entityById;
};

export const writeCacheForEntity = (entityType: string, data: unknown) => {
  cache[entityType] = data;
};

export const resetCacheForEntity = (entityType: string) => {
  const types = [entityType, ...(STORE_ENTITIES_LINKS[entityType] ?? [])];
  types.forEach((type) => {
    if (cache[type]) {
      cache[type].values = undefined;
    } else {
      // This entity type is not part of the caching system
    }
  });
};

export const dynamicCacheUpdater = (
  context: AuthContext,
  user: AuthUser,
  instance: StoreEntity | StoreRelation,
) => {
  // Dynamic update of filtering cache
  const currentFiltersValues = cache[ENTITY_TYPE_RESOLVED_FILTERS]?.values;
  if (currentFiltersValues?.has(instance.internal_id)) {
    const convertedInstance = convertStoreToStix(instance);
    currentFiltersValues.set(instance.internal_id, convertedInstance);
  }
};

export const getEntitiesFromCache = async <T extends BasicStoreIdentifier | StixObject>(
  context: AuthContext, user: AuthUser, type: string
): Promise<Array<T> | Map<string, T>> => {
  const getEntitiesFromCacheFn = async (): Promise<Array<T> | Map<string, T>> => {
    const fromCache = cache[type];
    if (!fromCache) {
      throw UnsupportedError(`${type} is not supported in cache configuration`);
    }
    if (!fromCache.values) {
      fromCache.values = await fromCache.fn();
    }
    return fromCache.values ?? (type === ENTITY_TYPE_RESOLVED_FILTERS ? new Map() : []);
  };
  return telemetry(context, user, `CACHE ${type}`, {
    [SemanticAttributes.DB_NAME]: 'cache_engine',
    [SemanticAttributes.DB_OPERATION]: 'select',
  }, getEntitiesFromCacheFn);
};

export const getEntitiesMapFromCache = async <T extends BasicStoreIdentifier | StixObject>(
  context: AuthContext, user: AuthUser, type: string
): Promise<Map<string | StixId, T>> => {
  if (type === ENTITY_TYPE_RESOLVED_FILTERS) {
    return await getEntitiesFromCache(context, user, type) as Map<string, T>;
  }
  const data = await getEntitiesFromCache(context, user, type) as BasicStoreIdentifier[];
  return buildStoreEntityMap(data);
};

export const getEntityFromCache = async <T extends BasicStoreIdentifier>(context: AuthContext, user: AuthUser, type: string): Promise<T> => {
  if (type === ENTITY_TYPE_RESOLVED_FILTERS) {
    throw Error('Can\'t fetch an entity from a map.');
  }
  const data = await getEntitiesFromCache<T>(context, user, type) as T[];
  return data[0];
};
