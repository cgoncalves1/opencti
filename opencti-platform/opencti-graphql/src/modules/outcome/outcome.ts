import { v4 as uuidv4 } from 'uuid';
import notificationTypeDefs from './outcome.graphql';
import webhookResolvers from './outcome-resolver';
import { ENTITY_TYPE_OUTCOME, StixOutcome, StoreEntityOutcome } from './outcome-types';
import { ABSTRACT_INTERNAL_OBJECT } from '../../schema/general';
import type { ModuleDefinition } from '../../schema/module';
import { registerDefinition } from '../../schema/module';
import { convertOutcomeToStix } from './outcome-converter';

const OUTCOME_DEFINITION: ModuleDefinition<StoreEntityOutcome, StixOutcome> = {
  type: {
    id: 'outcomes',
    name: ENTITY_TYPE_OUTCOME,
    category: ABSTRACT_INTERNAL_OBJECT
  },
  graphql: {
    schema: notificationTypeDefs,
    resolver: webhookResolvers,
  },
  identifier: {
    definition: {
      [ENTITY_TYPE_OUTCOME]: () => uuidv4(),
    },
  },
  attributes: [
    { name: 'name', type: 'string', mandatoryType: 'internal', multiple: false, upsert: false },
    { name: 'description', type: 'string', mandatoryType: 'no', multiple: false, upsert: false },
    { name: 'built_in', type: 'boolean', mandatoryType: 'no', multiple: false, upsert: false },
    { name: 'outcome_connector_id', type: 'string', mandatoryType: 'internal', multiple: false, upsert: false },
    { name: 'outcome_configuration', type: 'json', mandatoryType: 'no', multiple: false, upsert: false },
    { name: 'outcome_restricted_members_ids', type: 'string', mandatoryType: 'no', multiple: true, upsert: false },
  ],
  relations: [],
  representative: (stix: StixOutcome) => {
    return stix.name;
  },
  converter: convertOutcomeToStix
};
registerDefinition(OUTCOME_DEFINITION);
