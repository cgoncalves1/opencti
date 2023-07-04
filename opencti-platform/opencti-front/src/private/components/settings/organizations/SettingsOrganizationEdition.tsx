import { Edit } from '@mui/icons-material';
import Drawer from '@mui/material/Drawer';
import Fab from '@mui/material/Fab';
import MenuItem from '@mui/material/MenuItem';
import makeStyles from '@mui/styles/makeStyles';
import { Field, Form, Formik } from 'formik';
import { FormikConfig } from 'formik/dist/types';
import React, { useState } from 'react';
import { graphql } from 'react-relay';
import * as Yup from 'yup';
import { useFormatter } from '../../../../components/i18n';
import MarkdownField from '../../../../components/MarkdownField';
import SelectField from '../../../../components/SelectField';
import { SubscriptionFocus } from '../../../../components/Subscription';
import TextField from '../../../../components/TextField';
import { Theme } from '../../../../components/Theme';
import { fieldSpacingContainerStyle } from '../../../../utils/field';
import { useSchemaEditionValidation } from '../../../../utils/hooks/useEntitySettings';
import useFormEditor, { GenericData } from '../../../../utils/hooks/useFormEditor';
import { adaptFieldValue } from '../../../../utils/String';
import CommitMessage from '../../common/form/CommitMessage';
import { Option } from '../../common/form/ReferenceField';
import { RootSettingsOrganizationQuery$data } from './__generated__/RootSettingsOrganizationQuery.graphql';
import { SettingsOrganization_organization$data } from './__generated__/SettingsOrganization_organization.graphql';

const useStyles = makeStyles<Theme>((theme) => ({
  editButton: {
    position: 'fixed',
    bottom: 30,
    right: 230,
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
  container: {
    padding: '10px 20px 20px 20px',
  },
}));

const organizationMutationFieldPatch = graphql`
  mutation SettingsOrganizationEditionMutation(
    $id: ID!
    $input: [EditInput]!
    $commitMessage: String
    $references: [String]
  ) {
    organizationEdit(id: $id) {
      fieldPatch(
        input: $input
        commitMessage: $commitMessage
        references: $references
      ) {
        ...SettingsOrganization_organization
      }
    }
  }
`;

export const organizationEditionOverviewFocus = graphql`
  mutation SettingsOrganizationEditionFocusMutation(
    $id: ID!
    $input: EditContext!
  ) {
    organizationEdit(id: $id) {
      contextPatch(input: $input) {
        id
      }
    }
  }
`;

const organizationMutationRelationAdd = graphql`
  mutation SettingsOrganizationEditionRelationAddMutation(
    $id: ID!
    $input: StixRefRelationshipAddInput!
  ) {
    organizationEdit(id: $id) {
      relationAdd(input: $input) {
        from {
          ...OrganizationEditionOverview_organization
        }
      }
    }
  }
`;

const organizationMutationRelationDelete = graphql`
  mutation SettingsOrganizationEditionRelationDeleteMutation(
    $id: ID!
    $toId: StixRef!
    $relationship_type: String!
  ) {
    organizationEdit(id: $id) {
      relationDelete(toId: $toId, relationship_type: $relationship_type) {
        ...OrganizationEditionOverview_organization
      }
    }
  }
`;

interface SettingsOrganizationFormValues {
  name: string
  description: string | null
  x_opencti_organization_type: string | null
  contact_information: string | null
  default_dashboard?: string
  message?: string
  references?: Option[]
}

interface SettingsOrganizationEditionProps {
  organization: SettingsOrganization_organization$data
  context: readonly ({
    readonly focusOn: string | null;
    readonly name: string;
  } | null)[] | null
  enableReferences?: boolean
  workspaces: RootSettingsOrganizationQuery$data['workspaces']
}

const SettingsOrganizationEdition = ({
  organization,
  context,
  workspaces,
  enableReferences = false,
}: SettingsOrganizationEditionProps) => {
  const classes = useStyles();
  const { t } = useFormatter();

  const basicShape = {
    name: Yup.string().min(2).required(t('This field is required')),
    description: Yup.string().nullable(),
    contact_information: Yup.string().nullable(),
    x_opencti_organization_type: Yup.string().nullable(),
    default_dashboard: Yup.string().nullable(),
  };
  const organizationValidator = useSchemaEditionValidation('Organization', basicShape);

  const queries = {
    fieldPatch: organizationMutationFieldPatch,
    relationAdd: organizationMutationRelationAdd,
    relationDelete: organizationMutationRelationDelete,
    editionFocus: organizationEditionOverviewFocus,
  };
  const editor = useFormEditor(organization as unknown as GenericData, enableReferences, queries, organizationValidator);

  const [open, setOpen] = useState(false);

  const initialValues = {
    name: organization.name,
    description: organization.description,
    x_opencti_organization_type: organization.x_opencti_organization_type,
    contact_information: organization.contact_information,
    default_dashboard: organization.default_dashboard?.id,
  };

  const onSubmit: FormikConfig<SettingsOrganizationFormValues>['onSubmit'] = (values, { setSubmitting }) => {
    const { message, references, ...otherValues } = values;
    const commitMessage = message ?? '';
    const commitReferences = (references ?? []).map(({ value }) => value);
    const inputValues = Object.entries(otherValues)
      .map(([key, value]) => ({ key, value: adaptFieldValue(value) }));
    editor.fieldPatch({
      variables: {
        id: organization.id,
        input: inputValues,
        commitMessage: commitMessage && commitMessage.length > 0 ? commitMessage : null,
        references: commitReferences,
      },
      onCompleted: () => {
        setSubmitting(false);
        setOpen(false);
      },
    });
  };

  const handleSubmitField = (key: string, value: string) => {
    if (!enableReferences) {
      organizationValidator
        .validateAt(key, { [key]: value })
        .then(() => {
          editor.fieldPatch({
            variables: {
              id: organization.id,
              input: {
                key,
                value,
              },
            },
          });
        })
        .catch(() => false);
    }
  };

  return (
    <>
      <Fab
        onClick={() => setOpen(true)}
        color="secondary"
        aria-label="Edit"
        className={classes.editButton}
      >
        <Edit />
      </Fab>
      <Drawer
        open={open}
        anchor="right"
        elevation={1}
        sx={{ zIndex: 1202 }}
        classes={{ paper: classes.drawerPaper }}
        onClose={() => setOpen(false)}
      >
        <div className={classes.container}>
          <Formik
            enableReinitialize={true}
            initialValues={initialValues}
            validationSchema={organizationValidator}
            onSubmit={onSubmit}
          >
            {({
              submitForm,
              isSubmitting,
              isValid,
              dirty,
              setFieldValue,
              values,
            }) => (
              <Form style={{ margin: '20px 0 20px 0' }}>
                <Field
                  component={TextField}
                  variant="standard"
                  name="name"
                  label={t('Name')}
                  fullWidth={true}
                  onFocus={editor.changeFocus}
                  onSubmit={handleSubmitField}
                  helperText={
                    <SubscriptionFocus context={context} fieldName="name" />
                  }
                />
                <Field
                  component={MarkdownField}
                  name="description"
                  label={t('Description')}
                  fullWidth={true}
                  multiline={true}
                  rows="4"
                  style={{ marginTop: 20 }}
                  onFocus={editor.changeFocus}
                  onSubmit={handleSubmitField}
                  helperText={
                    <SubscriptionFocus context={context} fieldName="description" />
                  }
                />
                <Field
                  component={SelectField}
                  variant="standard"
                  name="x_opencti_organization_type"
                  onChange={handleSubmitField}
                  label={t('Organization type')}
                  fullWidth={true}
                  inputProps={{
                    name: 'x_opencti_organization_type',
                    id: 'x_opencti_organization_type',
                  }}
                  containerstyle={fieldSpacingContainerStyle}
                  helpertext={
                    <SubscriptionFocus context={context} fieldName="x_opencti_organization_type" />
                  }
                >
                  <MenuItem value="constituent">{t('Constituent')}</MenuItem>
                  <MenuItem value="csirt">{t('CSIRT')}</MenuItem>
                  <MenuItem value="partner">{t('Partner')}</MenuItem>
                  <MenuItem value="vendor">{t('Vendor')}</MenuItem>
                  <MenuItem value="other">{t('Other')}</MenuItem>
                </Field>
                <Field
                  component={TextField}
                  variant="standard"
                  name="contact_information"
                  label={t('Contact information')}
                  fullWidth={true}
                  multiline={true}
                  rows="4"
                  style={{ marginTop: 20 }}
                  onFocus={editor.changeFocus}
                  onSubmit={handleSubmitField}
                  helperText={
                    <SubscriptionFocus context={context} fieldName="contact_information" />
                  }
                />
                <Field
                  component={SelectField}
                  variant="standard"
                  name="default_dashboard"
                  onChange={handleSubmitField}
                  label={t('Default dashboard')}
                  fullWidth={true}
                  inputProps={{
                    name: 'default_dashboard',
                    id: 'default_dashboard',
                  }}
                  containerstyle={fieldSpacingContainerStyle}
                  helpertext={
                    <SubscriptionFocus context={context} fieldName="default_dashboard" />
                  }
                >
                  {[
                    ...(workspaces?.edges ?? []),
                    { node: { id: 'b9bea5e1-027d-47ef-9a12-02beaae6ba9d', name: 'Default' } },
                  ].map(({ node }) => (
                    <MenuItem value={node.id}>{node.name}</MenuItem>
                  ))}
                </Field>
                {enableReferences && (
                  <CommitMessage
                    submitForm={submitForm}
                    disabled={isSubmitting || !isValid || !dirty}
                    setFieldValue={setFieldValue}
                    open={false}
                    values={values.references}
                    id={organization.id}
                  />
                )}
              </Form>
            )}
          </Formik>
        </div>
      </Drawer>
    </>
  );
};

export default SettingsOrganizationEdition;
