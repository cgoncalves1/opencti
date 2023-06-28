import { Promise } from 'bluebird';
import { executionContext, SYSTEM_USER } from '../utils/access';
import { logApp } from '../config/conf';
import { ES_MAX_CONCURRENCY } from '../database/engine';
import { READ_INDEX_STIX_META_OBJECTS } from '../database/utils';
import { openVocabularies } from '../modules/vocabulary/vocabulary-utils';
import { VocabularyCategory, VocabularyFilter } from '../generated/graphql';
import { listAllEntities } from '../database/middleware-loader';
import { ENTITY_TYPE_VOCABULARY } from '../modules/vocabulary/vocabulary-types';
import { patchAttribute } from '../database/middleware';

export const up = async (next) => {
  const context = executionContext('migration');
  const start = new Date().getTime();
  logApp.info('[MIGRATION] Adding default order value to opinion open vocabulary');

  const defaultVocabularies = new Map((openVocabularies.opinion_ov ?? []).map((v) => [v.key, v]));
  const filters = [{ key: [VocabularyFilter.Category], values: [VocabularyCategory.OpinionOv] }];
  const vocabularies = await listAllEntities(context, SYSTEM_USER, [ENTITY_TYPE_VOCABULARY], {
    indices: [READ_INDEX_STIX_META_OBJECTS],
    connectionFormat: false,
    filters,
  });

  const updateVocabulary = async (vocabulary) => {
    let order = 0;
    const defaultVocabulary = defaultVocabularies.get(vocabulary.name);
    if (defaultVocabulary) {
      order = defaultVocabulary.order;
    }
    const patch = { order };
    await patchAttribute(context, SYSTEM_USER, vocabulary.id, ENTITY_TYPE_VOCABULARY, patch);
  };

  await Promise.map(vocabularies, updateVocabulary, { concurrency: ES_MAX_CONCURRENCY });
  logApp.info(`[MIGRATION] Adding default order value to opinion open vocabulary done in ${new Date() - start} ms`);
  next();
};

export const down = async (next) => {
  next();
};
