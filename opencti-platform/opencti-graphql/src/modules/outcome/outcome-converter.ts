import { STIX_EXT_OCTI } from '../../types/stix-extensions';
import { buildStixObject, cleanObject } from '../../database/stix-converter';
import type { StixOutcome, StoreEntityOutcome } from './outcome-types';

export const convertOutcomeToStix = (instance: StoreEntityOutcome): StixOutcome => {
  const stixObject = buildStixObject(instance);
  return {
    ...stixObject,
    name: instance.name,
    description: instance.description,
    extensions: {
      [STIX_EXT_OCTI]: cleanObject({
        ...stixObject.extensions[STIX_EXT_OCTI],
        extension_type: 'new-sdo',
      })
    }
  };
};
