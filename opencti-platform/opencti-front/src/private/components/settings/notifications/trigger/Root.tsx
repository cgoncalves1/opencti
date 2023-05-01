import React from 'react';
import makeStyles from '@mui/styles/makeStyles';
import NotificationMenu from '../../NotificationMenu';
import { Theme } from '../../../../../components/Theme';

const useStyles = makeStyles<Theme>(() => ({
  container: {
    margin: 0,
    padding: '0 200px 0 0',
  },
}));

const Root = () => {
  const classes = useStyles();
  return <div className={classes.container}>
    <NotificationMenu />
    <div>Platform triggers will be available soon</div>
  </div>;
};

export default Root;
