import type { BasicStoreEntity, StoreEntity } from '../../types/store';
import type { StixObject, StixOpenctiExtensionSDO } from '../../types/stix-common';
import { STIX_EXT_OCTI } from '../../types/stix-extensions';

export const ENTITY_TYPE_OUTCOME = 'Outcome';

export interface BasicStoreEntityOutcome extends BasicStoreEntity {
  internal_id: string
  name: string
  description: string
  built_in: boolean
  outcome_connector_id: string
  outcome_configuration: string
  outcome_restricted_members_ids: string[]
  outcome_restricted_users_ids?: string[]
}

export interface StoreEntityOutcome extends StoreEntity {
  name: string
  description: string
}

export interface StixOutcome extends StixObject {
  name: string
  description: string
  extensions: {
    [STIX_EXT_OCTI]: StixOpenctiExtensionSDO
  }
}
