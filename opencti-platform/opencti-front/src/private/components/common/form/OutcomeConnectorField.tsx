import React, { FunctionComponent, useState } from 'react';
import { Field } from 'formik';
import { Label } from 'mdi-material-ui';
import makeStyles from '@mui/styles/makeStyles';
import { graphql } from 'react-relay';
import { fetchQuery } from '../../../../relay/environment';
import AutocompleteField from '../../../../components/AutocompleteField';
import { useFormatter } from '../../../../components/i18n';
import { OutcomeConnectorFieldSearchQuery$data } from './__generated__/OutcomeConnectorFieldSearchQuery.graphql';

const useStyles = makeStyles(() => ({
  icon: {
    paddingTop: 4,
    display: 'inline-block',
  },
  text: {
    display: 'inline-block',
    flexGrow: 1,
    marginLeft: 10,
  },
  autoCompleteIndicator: {
    display: 'none',
  },
}));

interface OutcomeConnectorFieldProps {
  name: string
  style?: { marginTop: number }
  helpertext?: string
  disabled?: boolean
  onChange?: (name: string, value: { label: string, value: string, schema: string }) => void
}

const OutcomeConnectorFieldQuery = graphql`
  query OutcomeConnectorFieldSearchQuery {
    connectorsForNotification {
      id
      name
      connector_schema
    }
  }
`;

const OutcomeConnectorField: FunctionComponent<OutcomeConnectorFieldProps> = ({ name, style, onChange, disabled, helpertext }) => {
  const classes = useStyles();
  const { t } = useFormatter();

  const [connectors, setConnectors] = useState<{ label: string | undefined; value: string | undefined; }[]>([]);

  const searchOutcomeConnectors = (event: React.ChangeEvent<HTMLInputElement>) => {
    fetchQuery(OutcomeConnectorFieldQuery, { search: event && event.target.value ? event.target.value : '' }).toPromise().then((data) => {
      const outcomeConnectors = ((data as OutcomeConnectorFieldSearchQuery$data)?.connectorsForNotification ?? []).map((n) => ({
        label: n?.name,
        value: n?.id,
        schema: n?.connector_schema,
      }));
      setConnectors(outcomeConnectors);
    });
  };

  return (
    <div style={{ width: '100%' }}>
      <Field
        component={AutocompleteField}
        name={name}
        multiple={false}
        style={style}
        disabled={disabled}
        onChange={typeof onChange === 'function' ? onChange.bind(this) : null}
        textfieldprops={{ variant: 'standard', label: t('Notification connector'), helperText: helpertext, onFocus: searchOutcomeConnectors }}
        noOptionsText={t('No available options')}
        options={connectors}
        onInputChange={searchOutcomeConnectors}
        renderOption={(props: React.HTMLAttributes<HTMLLIElement>, option: { color: string; label: string }) => (
          <li {...props}>
            <div className={classes.icon} style={{ color: option.color }}>
              <Label />
            </div>
            <div className={classes.text}>{option.label}</div>
          </li>
        )}
        classes={{ clearIndicator: classes.autoCompleteIndicator }}
      />
    </div>
  );
};

export default OutcomeConnectorField;
