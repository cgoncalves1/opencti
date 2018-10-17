import {addUser, assertAdmin, deleteUser, findAll, findById} from "../domain/user";
import uuid from "uuid/v4";
import {assoc} from "ramda";
import {pubsub} from "../config/bus";

export const USER_ADDED_TOPIC = 'USER_ADDED_TOPIC';

// noinspection JSUnusedGlobalSymbols
export const userResolvers = {
    Query: {
        users: (_, {first = 25, offset = 0}, context) => {
            assertAdmin(context.user);
            return findAll(first, offset);
        },
        user: (_, {id}, context) => {
            assertAdmin(context.user);
            return findById(id);
        },
        me: (_, args, context) => {
            return findById(context.user.id);
        },
    },
    Subscription: {
        userAdded: {
            subscribe: () => pubsub.asyncIterator(USER_ADDED_TOPIC)
        }
    },
    Mutation: {
        addUser: (_, {input}, context) => {
            assertAdmin(context.user);
            let user = assoc('id', uuid(), input);
            return addUser(user);
        },
        deleteUser: (_, {id}) => {
            return deleteUser(id);
        }
    }
};