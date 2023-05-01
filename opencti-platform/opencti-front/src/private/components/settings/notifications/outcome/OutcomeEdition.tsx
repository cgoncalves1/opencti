import React, { FunctionComponent, createRef } from 'react';
import validator from '@rjsf/validator-ajv8';
import CoreForm from '@rjsf/core';
import JsonForm from '@rjsf/mui';
import { graphql, PreloadedQuery, usePreloadedQuery, useMutation, useFragment } from 'react-relay';
import { Field, Form, Formik } from 'formik';
import makeStyles from '@mui/styles/makeStyles';
import Button from '@mui/material/Button';
import * as Yup from 'yup';
import Loader, { LoaderVariant } from '../../../../../components/Loader';
import useQueryLoading from '../../../../../utils/hooks/useQueryLoading';
import { OutcomeEditionQuery } from './__generated__/OutcomeEditionQuery.graphql';
import TextField from '../../../../../components/TextField';
import { useFormatter } from '../../../../../components/i18n';
import OutcomeConnectorField from '../../../common/form/OutcomeConnectorField';
import { Theme } from '../../../../../components/Theme';
import { Option } from '../../../common/form/ReferenceField';
import { OutcomeEdition_edition$key } from './__generated__/OutcomeEdition_edition.graphql';
import { uiSchema } from './OutcomeUtils';

const useStyles = makeStyles<Theme>((theme) => ({
  buttons: {
    marginTop: 20,
    textAlign: 'right',
  },
  button: {
    marginLeft: theme.spacing(2),
  },
}));

const outcomeMutationFieldPatch = graphql`
    mutation OutcomeEditionFieldPatchMutation($id: ID!, $input: [EditInput!]!) {
        outcomeFieldPatch(id: $id, input: $input) {
            ...OutcomeLine_node
            ...OutcomeEdition_edition
        }
    }
`;

const outcomeEditionFragment = graphql`
    fragment OutcomeEdition_edition on Outcome {
        id
        name
        description
        outcome_connector {
            id
            name
            description
            connector_schema
        }
        outcome_connector_id
        outcome_configuration
    }
`;

export const outcomeEditionQuery = graphql`
    query OutcomeEditionQuery($id: String!) {
        outcome(id: $id) {
            ...OutcomeEdition_edition
        }
    }
`;

const outcomeValidation = (t: (n: string) => string) => Yup.object().shape({
  name: Yup.string().required(t('This field is required')),
  description: Yup.string().nullable(),
});

interface OutcomeEditionComponentProps {
  queryRef: PreloadedQuery<OutcomeEditionQuery>,
}

const OutcomeEditionComponent: FunctionComponent<OutcomeEditionComponentProps> = ({ queryRef }) => {
  const { t } = useFormatter();
  const classes = useStyles();
  const formRef = createRef<CoreForm>();
  const { outcome } = usePreloadedQuery<OutcomeEditionQuery>(outcomeEditionQuery, queryRef);
  const data = useFragment<OutcomeEdition_edition$key>(outcomeEditionFragment, outcome);
  const [commitFieldPatch] = useMutation(outcomeMutationFieldPatch);
  const initialValues = {
    name: data?.name,
    description: data?.description,
    outcome_connector_id: { value: data?.outcome_connector?.id, label: data?.outcome_connector?.name } as Option,
  };
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const submitForm = (setSubmitting, values, current) => {
    if (current.validateForm()) {
      setSubmitting(true);
      const inputs = [
        { key: 'name', value: [values.name] },
        { key: 'description', value: [values.description] },
        { key: 'outcome_connector_id', value: [values.outcome_connector_id?.value] },
        { key: 'outcome_configuration', value: [JSON.stringify(current.state.formData)] },
      ];
      commitFieldPatch({ variables: { id: data?.id, input: inputs } });
      setSubmitting(false);
    }
  };
  return (
    <div>
      <Formik enableReinitialize={true} initialValues={initialValues}
              validationSchema={outcomeValidation(t)} onSubmit={() => {}}>
          {({ values, setSubmitting, isSubmitting }) => (
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
              <OutcomeConnectorField disabled={true} name="outcome_connector_id" style={{ marginTop: 20 }}/>
              <JsonForm uiSchema={uiSchema} ref={formRef} showErrorList={false} liveValidate
                  schema={JSON.parse(data?.outcome_connector?.connector_schema ?? ' {}')}
                  formData={JSON.parse(data?.outcome_configuration ?? ' {}')}
                  validator={validator}
              />
              <div className={classes.buttons}>
                  <Button variant="contained"
                      color="secondary"
                      onClick={() => submitForm(setSubmitting, values, formRef.current)}
                      disabled={isSubmitting}
                      classes={{ root: classes.button }}>
                      {t('Save')}
                  </Button>
              </div>
          </Form>
          )}
      </Formik>
    </div>
  );
};

interface OutcomeEditionProps {
  id: string,
}
const OutcomeEdition: FunctionComponent<OutcomeEditionProps> = ({ id }) => {
  const queryRef = useQueryLoading<OutcomeEditionQuery>(outcomeEditionQuery, { id });
  return queryRef ? (
        <React.Suspense fallback={<Loader variant={LoaderVariant.inElement} />}>
            <OutcomeEditionComponent queryRef={queryRef} />
        </React.Suspense>
  ) : (
        <Loader variant={LoaderVariant.inElement} />
  );
};

export default OutcomeEdition;
