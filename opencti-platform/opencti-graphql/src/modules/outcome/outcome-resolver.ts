import type { Resolvers } from '../../generated/graphql';
import { addOutcome, outcomeDelete, outcomeEdit, outcomeGet, outcomesFind, usableOutcomes } from './outcome-domain';
import { BUILTIN_OUTCOMES_CONNECTORS } from './outcome-statics';

const outcomeResolvers: Resolvers = {
  Query: {
    outcome: (_, { id }, context) => outcomeGet(context, context.user, id),
    outcomes: (_, args, context) => outcomesFind(context, context.user, args),
    notificationOutcomes: (_, __, context) => usableOutcomes(context, context.user),
  },
  Outcome: {
    outcome_connector: (outcome, _, __) => BUILTIN_OUTCOMES_CONNECTORS[outcome.outcome_connector_id],
  },
  Mutation: {
    outcomeAdd: (_, { input }, context) => addOutcome(context, context.user, input),
    outcomeDelete: (_, { id }, context) => outcomeDelete(context, context.user, id),
    outcomeFieldPatch: (_, { id, input }, context) => outcomeEdit(context, context.user, id, input),
  },
};

export default outcomeResolvers;
