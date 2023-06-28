import Fab from '@mui/material/Fab';
import { Add, Close } from '@mui/icons-material';
import React, { FunctionComponent, useState } from 'react';
import makeStyles from '@mui/styles/makeStyles';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import { Field, Form, Formik, FormikConfig } from 'formik';
import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import { graphql, useMutation } from 'react-relay';
import * as Yup from 'yup';
import TextField from '../../../../components/TextField';
import type { Theme } from '../../../../components/Theme';
import { useFormatter } from '../../../../components/i18n';
import {
  VocabularyAddInput,
  VocabularyCategory,
  VocabularyCreationMutation,
} from './__generated__/VocabularyCreationMutation.graphql';
import { insertNode } from '../../../../utils/store';
import { VocabulariesLines_DataQuery$variables } from './__generated__/VocabulariesLines_DataQuery.graphql';
import { fieldSpacingContainerStyle } from '../../../../utils/field';
import { Option } from '../../common/form/ReferenceField';
import AutocompleteFreeSoloField from '../../../../components/AutocompleteFreeSoloField';

interface VocabularyCreationProps {
  paginationOptions: VocabulariesLines_DataQuery$variables;
  category: VocabularyCategory;
  isCategoryOrdered: boolean;
}

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
  createButton: {
    position: 'fixed',
    bottom: 30,
    right: 230,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    left: 5,
    color: 'inherit',
  },
  header: {
    backgroundColor: theme.palette.background.nav,
    padding: '20px 20px 20px 60px',
  },
  container: {
    padding: '10px 20px 20px 20px',
  },
  buttons: {
    marginTop: 20,
    textAlign: 'right',
  },
  button: {
    marginLeft: theme.spacing(2),
  },
}));

const vocabularyAdd = graphql`
  mutation VocabularyCreationMutation($input: VocabularyAddInput!) {
    vocabularyAdd(input: $input) {
      ...useVocabularyCategory_Vocabularynode
    }
  }
`;

const labelValidation = (t: (v: string) => string, isCategoryOrdered: boolean) => {
  const shape = [['name', Yup.mixed().required(t('This field is required'))]];
  if (isCategoryOrdered) {
    shape.push(['order', Yup.mixed().required(t('This field is required'))]);
  }
  return Yup.object().shape({
    ...Object.fromEntries(shape),
  });
};

const VocabularyCreation: FunctionComponent<VocabularyCreationProps> = ({
  paginationOptions,
  category,
  isCategoryOrdered,
}) => {
  const classes = useStyles();
  const { t } = useFormatter();

  const [open, setOpen] = useState(false);
  const [addVocab] = useMutation<VocabularyCreationMutation>(vocabularyAdd);

  const handleClose = () => setOpen(false);

  interface FormInterface {
    name: string;
    description: string;
    aliases: { value: string }[];
    order?: number;
  }
  const onSubmit: FormikConfig<FormInterface>['onSubmit'] = (
    values,
    { resetForm },
  ) => {
    const data: VocabularyAddInput = {
      name: values.name,
      description: values.description,
      aliases: values.aliases.map((a) => a.value),
      category,
    };
    let finalData: VocabularyAddInput;
    if (isCategoryOrdered) {
      finalData = {
        ...data,
        order: parseInt(String(values.order), 10),
      };
    } else {
      finalData = data;
    }
    addVocab({
      variables: {
        input: finalData,
      },
      updater: (store) => insertNode(
        store,
        'Pagination_vocabularies',
        paginationOptions,
        'vocabularyAdd',
      ),
      onCompleted: () => {
        resetForm();
        handleClose();
      },
    });
  };

  return (
    <div>
      <Fab
        onClick={() => setOpen(true)}
        color="secondary"
        aria-label="Add"
        className={classes.createButton}
      >
        <Add />
      </Fab>
      <Drawer
        open={open}
        anchor="right"
        sx={{ zIndex: 1202 }}
        elevation={1}
        classes={{ paper: classes.drawerPaper }}
        onClose={handleClose}
      >
        <div className={classes.header}>
          <IconButton
            aria-label="Close"
            className={classes.closeButton}
            onClick={handleClose}
            size="large"
            color="primary"
          >
            <Close fontSize="small" color="primary" />
          </IconButton>
          <Typography variant="h6">{t('Create a vocabulary')}</Typography>
        </div>
        <div className={classes.container}>
          <Formik
            initialValues={{
              name: '',
              description: '',
              aliases: [] as { value: string }[],
            }}
            validationSchema={labelValidation(t, isCategoryOrdered)}
            onSubmit={onSubmit}
            onReset={handleClose}
          >
            {({ submitForm, handleReset, isSubmitting }) => (
              <Form style={{ margin: '20px 0 20px 0' }}>
                <Field
                  component={TextField}
                  variant="standard"
                  name="name"
                  label={t('Name')}
                  fullWidth={true}
                />
                <Field
                  component={TextField}
                  variant="standard"
                  name="description"
                  label={t('Description')}
                  fullWidth={true}
                  style={fieldSpacingContainerStyle}
                />
                <Field
                  component={AutocompleteFreeSoloField}
                  style={fieldSpacingContainerStyle}
                  name="aliases"
                  multiple={true}
                  textfieldprops={{
                    variant: 'standard',
                    label: t('Aliases'),
                  }}
                  options={[]}
                  renderOption={(
                    props: Record<string, unknown>,
                    option: Option,
                  ) => (
                    <li {...props}>
                      <div className={classes.text}>{option.label}</div>
                    </li>
                  )}
                  classes={{ clearIndicator: classes.autoCompleteIndicator }}
                />
                {isCategoryOrdered
                  && <Field
                    component={TextField}
                    variant="standard"
                    name="order"
                    label={t('Order')}
                    fullWidth={true}
                    type="number"
                    style={{ marginTop: 20 }}
                  />
                }
                <div className={classes.buttons}>
                  <Button
                    variant="contained"
                    onClick={handleReset}
                    disabled={isSubmitting}
                    classes={{ root: classes.button }}
                  >
                    {t('Cancel')}
                  </Button>
                  <Button
                    variant="contained"
                    color="secondary"
                    onClick={submitForm}
                    disabled={isSubmitting}
                    classes={{ root: classes.button }}
                  >
                    {t('Create')}
                  </Button>
                </div>
              </Form>
            )}
          </Formik>
        </div>
      </Drawer>
    </div>
  );
};

export default VocabularyCreation;
