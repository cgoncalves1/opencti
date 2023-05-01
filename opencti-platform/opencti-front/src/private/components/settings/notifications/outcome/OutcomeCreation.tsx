import React, { FunctionComponent, useState, createRef } from 'react';
import { Field, Form, Formik } from 'formik';
import validator from '@rjsf/validator-ajv8';
import CoreForm from '@rjsf/core';
import * as Yup from 'yup';
import JsonForm from '@rjsf/mui';
import Drawer from '@mui/material/Drawer';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import makeStyles from '@mui/styles/makeStyles';
import Fab from '@mui/material/Fab';
import { Add, Close } from '@mui/icons-material';
import { graphql, useMutation } from 'react-relay';
import { RecordSourceSelectorProxy } from 'relay-runtime';
import { useFormatter } from '../../../../../components/i18n';
import { Theme } from '../../../../../components/Theme';
import TextField from '../../../../../components/TextField';
import { handleErrorInForm } from '../../../../../relay/environment';
import { insertNode } from '../../../../../utils/store';
import { OutcomeLinesPaginationQuery$variables } from './__generated__/OutcomeLinesPaginationQuery.graphql';
import OutcomeConnectorField from '../../../common/form/OutcomeConnectorField';
import { uiSchema } from './OutcomeUtils';

const useStyles = makeStyles<Theme>((theme) => ({
  drawerPaper: {
    minHeight: '100vh',
    width: '50%',
    position: 'fixed',
    transition: theme.transitions.create('width', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
    padding: 0,
  },
  dialogActions: {
    padding: '0 17px 20px 0',
  },
  createButton: {
    position: 'fixed',
    bottom: 30,
    right: 230,
  },
  buttons: {
    marginTop: 20,
    textAlign: 'right',
  },
  button: {
    marginLeft: theme.spacing(2),
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
  importButton: {
    position: 'absolute',
    top: 15,
    right: 20,
  },
  container: {
    padding: '10px 20px 20px 20px',
  },
}));

const outcomeMutation = graphql`
  mutation OutcomeCreationMutation($input: OutcomeAddInput!) {
    outcomeAdd(input: $input) {
      id
      name
      description
      entity_type
      parent_types
      outcome_connector {
        name
        description
      }
      ...OutcomeLine_node
    }
  }
`;

interface OutcomeAddInput {
  name: string,
  description: string,
}

interface OutcomeFormProps {
  updater: (store: RecordSourceSelectorProxy, key: string) => void
  onReset?: () => void
  onCompleted?: () => void
  inputValue?: string
}

const outcomeValidation = (t: (value: string) => string) => Yup.object().shape({
  name: Yup.string().required(t('This field is required')),
  description: Yup.string().nullable(),
  outcome_connector_id: Yup.object().required(t('This field is required')),
});

export const OutcomeCreationForm: FunctionComponent<OutcomeFormProps> = ({ updater, onReset, inputValue, onCompleted }) => {
  const classes = useStyles();
  const { t } = useFormatter();
  const formRef = createRef<CoreForm>();
  const [currentSchema, setCurrentSchema] = useState<string | null>(null);
  const initialValues: OutcomeAddInput = {
    name: inputValue || '',
    description: '',
  };
  const [commit] = useMutation(outcomeMutation);
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const submitForm = (values, current, { setErrors, setSubmitting, resetForm }) => {
    outcomeValidation(t).validate(values).then(() => {
      if (current.validateForm()) {
        const input = {
          name: values.name,
          description: values.description,
          outcome_connector_id: values.outcome_connector_id?.value,
          outcome_configuration: JSON.stringify(current.state.formData),
        };
        commit({
          variables: { input },
          updater: (store) => {
            if (updater) {
              updater(store, 'outcomeAdd');
            }
          },
          onError: (error: Error) => {
            handleErrorInForm(error, setErrors);
            setSubmitting(false);
          },
          onCompleted: () => {
            setSubmitting(false);
            resetForm();
            if (onCompleted) {
              onCompleted();
            }
          },
        });
      }
    }).catch(() => {});
  };

  return <Formik<OutcomeAddInput>
      initialValues={initialValues}
      validationSchema={outcomeValidation(t)}
      onSubmit={() => {}}
      onReset={onReset}>
    {({ setErrors, resetForm, handleReset, values, setSubmitting, isSubmitting }) => (
        <Form style={{ margin: '20px 0 20px 0' }}>
          <Field component={TextField}
                 variant="standard"
                 name="name"
                 label={t('Name')}
                 fullWidth={true}
          />
          <Field component={TextField}
                 name="description"
                 variant="standard"
                 label={t('Description')}
                 fullWidth={true}
                 style={{ marginTop: 20 }}
          />
          <OutcomeConnectorField name="outcome_connector_id"
                                 onChange={(name, data) => setCurrentSchema(data.schema) }
                                 style={{ marginTop: 20 }}/>
          {currentSchema && <JsonForm uiSchema={uiSchema} ref={formRef} showErrorList={false} liveValidate
              schema={JSON.parse(currentSchema ?? ' {}')}
              validator={validator}
          />}
          <div className={classes.buttons}>
            <Button
                variant="contained"
                onClick={handleReset}
                disabled={isSubmitting}
                classes={{ root: classes.button }}>
              {t('Cancel')}
            </Button>
            <Button
                variant="contained"
                color="secondary"
                onClick={() => submitForm(values, formRef.current, { setErrors, setSubmitting, resetForm })}
                classes={{ root: classes.button }}>
              {t('Create')}
            </Button>
          </div>
        </Form>
    )}
  </Formik>;
};

const OutcomeCreation: FunctionComponent<{
  contextual?: boolean,
  display?: boolean,
  inputValue?: string,
  paginationOptions: OutcomeLinesPaginationQuery$variables }> = ({
  inputValue,
  paginationOptions,
}) => {
  const { t } = useFormatter();
  const classes = useStyles();
  const [open, setOpen] = useState(false);
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);
  const updater = (store: RecordSourceSelectorProxy) => insertNode(store, 'Pagination_outcomes', paginationOptions, 'outcomeAdd');
  return <div>
    <Fab onClick={handleOpen} color="secondary" aria-label="Add" className={classes.createButton}>
      <Add />
    </Fab>
    <Drawer open={open} anchor="right" elevation={1} sx={{ zIndex: 1202 }}
            classes={{ paper: classes.drawerPaper }}
            onClose={handleClose}>
      <div className={classes.header}>
        <IconButton aria-label="Close"
            className={classes.closeButton}
            onClick={handleClose} size="large" color="primary">
          <Close fontSize="small" color="primary" />
        </IconButton>
        <Typography variant="h6">{t('Create an outcome')}</Typography>
      </div>
      <div className={classes.container}>
        <OutcomeCreationForm inputValue={inputValue} updater={updater}
                             onCompleted={handleClose} onReset={handleClose}/>
      </div>
    </Drawer>
  </div>;
};

export default OutcomeCreation;
