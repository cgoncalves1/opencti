import Ajv from 'ajv';
import type { AuthContext, AuthUser } from '../../types/user';
import { createEntity, deleteElementById, updateAttribute } from '../../database/middleware';
import { notify } from '../../database/redis';
import { BUS_TOPICS } from '../../config/conf';
import type { EditInput, OutcomeAddInput, QueryOutcomesArgs } from '../../generated/graphql';
import { listEntitiesPaginated, storeLoadById, } from '../../database/middleware-loader';
import { now } from '../../utils/format';
import type { BasicStoreEntityOutcome } from './outcome-types';
import { ENTITY_TYPE_OUTCOME } from './outcome-types';
import { OUTCOMES_CONNECTORS } from './outcome-statics';
import { UnsupportedError } from '../../config/errors';
import { isEmptyField } from '../../database/utils';
import { getEntitiesFromCache } from '../../database/cache';
import { SYSTEM_USER } from '../../utils/access';

const ajv = new Ajv();

export const addOutcome = async (context: AuthContext, user: AuthUser, outcome: OutcomeAddInput): Promise<BasicStoreEntityOutcome> => {
  const outcomeConnector = OUTCOMES_CONNECTORS[outcome.outcome_connector_id];
  if (isEmptyField(outcomeConnector)) {
    throw UnsupportedError('Invalid outcome connector', { id: outcome.outcome_connector_id });
  }
  const validate = ajv.compile(outcomeConnector.schema);
  const isValidConfiguration = validate(JSON.parse(outcome.outcome_configuration));
  if (!isValidConfiguration) {
    throw UnsupportedError('This configuration is invalid', { configuration: outcome.outcome_configuration });
  }
  const outcomeToCreate = { ...outcome, created: now(), updated: now() };
  const created = await createEntity(context, user, outcomeToCreate, ENTITY_TYPE_OUTCOME);
  return notify(BUS_TOPICS[ENTITY_TYPE_OUTCOME].ADDED_TOPIC, created, user);
};

export const outcomeGet = (context: AuthContext, user: AuthUser, outcomeId: string): BasicStoreEntityOutcome => {
  return storeLoadById(context, user, outcomeId, ENTITY_TYPE_OUTCOME) as unknown as BasicStoreEntityOutcome;
};

export const outcomeEdit = async (context: AuthContext, user: AuthUser, triggerId: string, input: EditInput[]) => {
  const { element: updatedElem } = await updateAttribute(context, user, triggerId, ENTITY_TYPE_OUTCOME, input);
  return notify(BUS_TOPICS[ENTITY_TYPE_OUTCOME].EDIT_TOPIC, updatedElem, user);
};

export const outcomeDelete = async (context: AuthContext, user: AuthUser, triggerId: string) => {
  const element = await deleteElementById(context, user, triggerId, ENTITY_TYPE_OUTCOME);
  await notify(BUS_TOPICS[ENTITY_TYPE_OUTCOME].DELETE_TOPIC, element, user);
  return triggerId;
};

export const outcomesFind = (context: AuthContext, user: AuthUser, opts: QueryOutcomesArgs) => {
  return listEntitiesPaginated<BasicStoreEntityOutcome>(context, user, [ENTITY_TYPE_OUTCOME], opts);
};

export const usableOutcomes = async (context: AuthContext, user: AuthUser) => {
  const outcomes = await getEntitiesFromCache<BasicStoreEntityOutcome>(context, SYSTEM_USER, ENTITY_TYPE_OUTCOME);
  const filterPredicate = (o: BasicStoreEntityOutcome) => isEmptyField(o.outcome_restricted_users_ids) || o.outcome_restricted_members_ids.includes(user.internal_id);
  return outcomes.filter(filterPredicate).sort((a, b) => {
    if (a.name < b.name) return -1;
    if (a.name > b.name) return 1;
    return 0;
  });
};
