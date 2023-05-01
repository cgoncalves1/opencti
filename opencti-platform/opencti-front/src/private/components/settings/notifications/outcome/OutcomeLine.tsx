import React, { FunctionComponent, useState } from 'react';
import { graphql, useFragment } from 'react-relay';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import { Close } from '@mui/icons-material';
import Drawer from '@mui/material/Drawer';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Skeleton from '@mui/material/Skeleton';
import makeStyles from '@mui/styles/makeStyles';
import { DataColumns } from '../../../../../components/list_lines';
import { OutcomeLine_node$key } from './__generated__/OutcomeLine_node.graphql';
import { Theme } from '../../../../../components/Theme';
import ItemIcon from '../../../../../components/ItemIcon';
import { useFormatter } from '../../../../../components/i18n';
import OutcomeEdition from './OutcomeEdition';

const useStyles = makeStyles<Theme>((theme) => ({
  item: {
    paddingLeft: 10,
    height: 50,
  },
  itemIcon: {
    color: theme.palette.primary.main,
  },
  bodyItem: {
    height: 20,
    fontSize: 13,
    float: 'left',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    paddingRight: 5,
  },
  goIcon: {
    position: 'absolute',
    right: -10,
  },
  itemIconDisabled: {
    color: theme.palette.grey?.[700],
  },
  placeholder: {
    display: 'inline-block',
    height: '1em',
    backgroundColor: theme.palette.grey?.[700],
  },
  drawerPaper: {
    minHeight: '100vh',
    width: '50%',
    position: 'fixed',
    overflow: 'auto',
    transition: theme.transitions.create('width', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
    padding: 0,
  },
  header: {
    backgroundColor: theme.palette.background.nav,
    padding: '20px 20px 20px 60px',
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    left: 5,
    color: 'inherit',
  },
  container: {
    padding: '10px 20px 20px 20px',
  },
}));

interface OutcomeLineProps {
  node: OutcomeLine_node$key;
  dataColumns: DataColumns;
  onLabelClick: (
    k: string,
    id: string,
    value: Record<string, unknown>,
    event: React.KeyboardEvent
  ) => void;
}

const OutcomeLineFragment = graphql`
    fragment OutcomeLine_node on Outcome {
        id
        entity_type
        name
        description
        outcome_connector {
            name
            description
        }
    }
`;

export const OutcomeLine: FunctionComponent<OutcomeLineProps> = ({ dataColumns, node }) => {
  const classes = useStyles();
  const { t } = useFormatter();
  const [selectedOutcome, setSelectedOutcome] = useState<string | null>(null);
  const data = useFragment(OutcomeLineFragment, node);
  return (
        <>
            { selectedOutcome && <Drawer open={true} anchor="right" elevation={1}
                                         sx={{ zIndex: 1202 }} classes={{ paper: classes.drawerPaper }} onClose={() => setSelectedOutcome(null)}>
                <div className={classes.header}>
                    <IconButton aria-label="Close" className={classes.closeButton} onClick={() => setSelectedOutcome(null)}
                                size="large" color="primary">
                        <Close fontSize="small" color="primary" />
                    </IconButton>
                    <Typography variant="h6" classes={{ root: classes.title }}>{t('Outcome edition')}</Typography>
                    <div className="clearfix" />
                </div>
                <div className={classes.container}>
                    <OutcomeEdition id={selectedOutcome}/>
                </div>
            </Drawer>}
            <ListItem classes={{ root: classes.item }} divider={true} button={true} onClick={() => setSelectedOutcome(data.id)}>
                <ListItemIcon classes={{ root: classes.itemIcon }}>
                    <ItemIcon type={'Report'} />
                </ListItemIcon>
                <ListItemText
                    primary={
                        <div>
                            <div className={classes.bodyItem} style={{ width: dataColumns.connector.width }}>
                                {data.outcome_connector.name}
                            </div>
                            <div className={classes.bodyItem} style={{ width: dataColumns.name.width }}>
                                {data.name}
                            </div>
                            <div className={classes.bodyItem} style={{ width: dataColumns.description.width }}>
                                {data.description}
                            </div>
                        </div>
                    }
                />
            </ListItem>
        </>
  );
};

export const OutcomeLineDummy = ({ dataColumns }: { dataColumns: DataColumns; }) => {
  const classes = useStyles();
  return (
        <ListItem classes={{ root: classes.item }} divider={true}>
            <ListItemIcon classes={{ root: classes.itemIconDisabled }}>
                <Skeleton animation="wave" variant="circular" width={30} height={30}/>
            </ListItemIcon>
            <ListItemText
                primary={
                    <div>
                        <div className={classes.bodyItem} style={{ width: dataColumns.connector.width }}>
                            <Skeleton
                                animation="wave"
                                variant="rectangular"
                                width="90%"
                                height="100%"
                            />
                        </div>
                        <div className={classes.bodyItem} style={{ width: dataColumns.name.width }}>
                            <Skeleton
                                animation="wave"
                                variant="rectangular"
                                width="90%"
                                height="100%"
                            />
                        </div>
                        <div className={classes.bodyItem} style={{ width: dataColumns.description.width }}>
                            <Skeleton
                                animation="wave"
                                variant="rectangular"
                                width="90%"
                                height="100%"
                            />
                        </div>
                    </div>
                }
            />
        </ListItem>
  );
};
