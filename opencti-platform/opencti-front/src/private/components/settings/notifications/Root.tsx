/* eslint-disable @typescript-eslint/no-explicit-any */
// TODO Remove this when V6
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import React from 'react';
import { Route, Switch } from 'react-router-dom';
import Outcome from './outcome/Root';
import Trigger from './trigger/Root';

const RootNotification = () => {
  return (
        <Switch>
            <Route exact path="/dashboard/settings/notification/outcome" render={() => <Outcome/>}/>
            <Route exact path="/dashboard/settings/notification/trigger" render={() => <Trigger/>}/>
        </Switch>
  );
};

export default RootNotification;
