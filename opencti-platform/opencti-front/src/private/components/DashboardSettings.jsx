import { SettingsOutlined } from '@mui/icons-material';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import ListSubheader from '@mui/material/ListSubheader';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Slide from '@mui/material/Slide';
import React, { useState } from 'react';
import { graphql } from 'react-relay';
import { useFormatter } from '../../components/i18n';
import { QueryRenderer } from '../../relay/environment';
import useAuth from '../../utils/hooks/useAuth';
import { EXPLORE } from '../../utils/hooks/useGranted';
import Security from '../../utils/Security';

const Transition = React.forwardRef((props, ref) => (
  <Slide direction="up" ref={ref} {...props} />
));
Transition.displayName = 'TransitionSlide';

export const dashboardSettingsDashboardsQuery = graphql`
  query DashboardSettingsDashboardsQuery(
    $count: Int!
    $orderBy: WorkspacesOrdering
    $orderMode: OrderingMode
    $filters: [WorkspacesFiltering!]
  ) {
    workspaces(
      first: $count
      orderBy: $orderBy
      orderMode: $orderMode
      filters: $filters
    ) {
      edges {
        node {
          id
          name
        }
      }
    }
  }
`;

const DashboardSettings = ({
  handleChangeTimeField,
  timeField,
  handleChangeDashboard,
  dashboard,
}) => {
  const { t } = useFormatter();
  const { me: { default_dashboards: dashboards } } = useAuth();

  const [open, setOpen] = useState(false);

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  return (
    <span>
        <IconButton onClick={handleOpen} size="medium">
          <SettingsOutlined fontSize="small" />
        </IconButton>
        <Dialog
          open={open}
          PaperProps={{ elevation: 1 }}
          TransitionComponent={Transition}
          onClose={handleClose}
          maxWidth="xs"
          fullWidth={true}
        >
          <DialogTitle>{t('Dashboard settings')}</DialogTitle>
          <DialogContent>
            <Security
              needs={[EXPLORE]}
              placeholder={
                <div>
                  <FormControl style={{ width: '100%' }}>
                    <InputLabel id="timeField" variant="standard">
                      {t('Date reference')}
                    </InputLabel>
                    <Select
                      labelId="timeField"
                      variant="standard"
                      value={timeField === null ? '' : timeField}
                      onChange={handleChangeTimeField}
                      fullWidth={true}
                    >
                      <MenuItem value="technical">
                        {t('Technical date')}
                      </MenuItem>
                      <MenuItem value="functional">
                        {t('Functional date')}
                      </MenuItem>
                    </Select>
                  </FormControl>
                </div>
              }
            >
              <QueryRenderer
                query={dashboardSettingsDashboardsQuery}
                variables={{
                  count: 50,
                  orderBy: 'name',
                  orderMode: 'asc',
                  filters: [{ key: 'type', values: ['dashboard'] }],
                }}
                render={({ props }) => {
                  if (props) {
                    return (
                      <div>
                        <FormControl style={{ width: '100%' }}>
                          <InputLabel id="timeField" variant="standard">
                            {t('Date reference')}
                          </InputLabel>
                          <Select
                            labelId="timeField"
                            variant="standard"
                            value={timeField === null ? '' : timeField}
                            onChange={handleChangeTimeField}
                            fullWidth={true}
                          >
                            <MenuItem value="technical">
                              {t('Technical date')}
                            </MenuItem>
                            <MenuItem value="functional">
                              {t('Functional date')}
                            </MenuItem>
                          </Select>
                        </FormControl>
                        <FormControl style={{ width: '100%', marginTop: 20 }}>
                          <InputLabel id="timeField" variant="standard">
                            {t('Custom dashboard')}
                          </InputLabel>
                          <Select
                            labelId="dashboard"
                            variant="standard"
                            value={dashboard === null ? '' : dashboard}
                            onChange={handleChangeDashboard}
                            fullWidth={true}
                          >
                            {dashboards?.length > 0 && (
                              <>
                                <ListSubheader>{t('Default Dashboards')}</ListSubheader>
                                <>
                                  {dashboards.map(({ id, name }) => (
                                    <MenuItem
                                      key={id}
                                      value={id}
                                    >
                                      {name}
                                    </MenuItem>
                                  ))}
                                </>
                              </>
                            )}
                            <ListSubheader>{t('Dashboards')}</ListSubheader>
                            {[
                              ...(props.workspaces?.edges ?? []),
                              {
                                node: {
                                  id: 'b9bea5e1-027d-47ef-9a12-02beaae6ba9d',
                                  name: 'Default',
                                },
                              },
                            ].map(({ node }) => (
                              <MenuItem
                                key={node.id}
                                value={node.id}
                              >
                                {node.name}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </div>
                    );
                  }
                  return <div />;
                }}
              />
            </Security>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>{t('Close')}</Button>
          </DialogActions>
        </Dialog>
      </span>
  );
};

export default DashboardSettings;
