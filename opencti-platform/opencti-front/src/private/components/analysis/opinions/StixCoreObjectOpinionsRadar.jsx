import React, { useState } from 'react';
import * as PropTypes from 'prop-types';
import * as R from 'ramda';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import IconButton from '@mui/material/IconButton';
import Slider from '@mui/material/Slider';
import { ThumbsUpDownOutlined } from '@mui/icons-material';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import { Field, Form, Formik } from 'formik';
import { createRefetchContainer, graphql, useMutation } from 'react-relay';
import makeStyles from '@mui/styles/makeStyles';
import { useTheme } from '@mui/styles';
import Chart from '../../common/charts/Chart';
import { QueryRenderer } from '../../../../relay/environment';
import { useFormatter } from '../../../../components/i18n';
import Security from '../../../../utils/Security';
import useGranted, { KNOWLEDGE_KNPARTICIPATE, KNOWLEDGE_KNUPDATE } from '../../../../utils/hooks/useGranted';
import { opinionCreationMutation, opinionCreationUserMutation } from './OpinionCreation';
import MarkdownField from '../../../../components/MarkdownField';
import { adaptFieldValue } from '../../../../utils/String';
import { opinionMutationFieldPatch } from './OpinionEditionOverview';
import { radarChartOptions } from '../../../../utils/Charts';
import { fieldSpacingContainerStyle } from '../../../../utils/field';
import ConfidenceField from '../../common/form/ConfidenceField';
import generateGreenToRedColors from '../../../../utils/ColorsGenerator';

const useStyles = makeStyles(() => ({
  paper: {
    height: 300,
    minHeight: 300,
    maxHeight: 300,
    margin: '10px 0 0 0',
    padding: 0,
    borderRadius: 6,
  },
}));

const stixCoreObjectOpinionsRadarMyOpinionQuery = graphql`
  query StixCoreObjectOpinionsRadarMyOpinionQuery($id: String!) {
    myOpinion(id: $id) {
      id
      opinion
      explanation
      confidence
    }
  }
`;

const StixCoreObjectOpinionsRadarComponent = (props) => {
  const classes = useStyles();
  const { t } = useFormatter();
  const theme = useTheme();
  const { stixCoreObjectId, data, variant, height, marginTop, paginationOptions } = props;

  const opinionOptions = props.data.vocabularies.edges
    .map((edge) => edge.node)
    .sort((n1, n2) => {
      if (n1.order === n2.order) {
        return n1.name.localeCompare(n2.name);
      }
      return n1.order - n2.order;
    })
    .map((node, idx) => ({
      label: node.name.toLowerCase(),
      value: idx + 1,
    }));
  const opinionLabel = (currentOpinionValue) => opinionOptions[currentOpinionValue - 1].label;
  const opinionValue = (label) => opinionOptions.find((m) => m.label === label)?.value;

  const [open, setOpen] = useState(false);
  const [currentOpinion, setCurrentOpinion] = useState(null);

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const handleChangeCurrentOpinion = (value) => setCurrentOpinion(value);

  const userIsKnowledgeEditor = useGranted([KNOWLEDGE_KNUPDATE]);
  const [commitCreation] = useMutation(userIsKnowledgeEditor ? opinionCreationMutation : opinionCreationUserMutation);
  const [commitEdition] = useMutation(opinionMutationFieldPatch);

  const onSubmit = (values, { setSubmitting, resetForm }) => {
    const { alreadyExistingOpinion } = values;
    const opinion = currentOpinion ?? Math.round(opinionOptions.length / 2);
    if (alreadyExistingOpinion) {
      const inputValues = R.pipe(
        R.dissoc('alreadyExistingOpinion'),
        R.assoc('confidence', parseInt(values.confidence, 10)),
        R.assoc('opinion', opinionLabel(opinion)),
        R.toPairs,
        R.map((n) => ({
          key: n[0],
          value: adaptFieldValue(n[1]),
        })),
      )(values);
      commitEdition({
        variables: {
          id: alreadyExistingOpinion,
          input: inputValues,
        },
        onCompleted: () => {
          props.relay.refetch(paginationOptions);
          setSubmitting(false);
          resetForm();
        },
      });
    } else {
      const adaptedValues = R.pipe(
        R.dissoc('alreadyExistingOpinion'),
        R.assoc('confidence', parseInt(values.confidence, 10)),
        R.assoc('opinion', opinionLabel(opinion)),
        R.assoc('objects', [stixCoreObjectId]),
      )(values);
      commitCreation({
        variables: {
          input: adaptedValues,
        },
        setSubmitting,
        onCompleted: () => {
          props.relay.refetch(paginationOptions);
          setSubmitting(false);
          resetForm();
        },
      });
    }
  };

  const onReset = () => handleClose();

  const renderContent = () => {
    if (data && data.opinionsDistribution) {
      let distributionData = data.opinionsDistribution.map((n) => ({
        ...n,
        label: n.label.toLowerCase(),
      }));
      distributionData = R.indexBy(R.prop('label'), distributionData);
      const chartData = [
        {
          name: t('Opinions'),
          data: opinionOptions.map((m) => distributionData[m.label]?.value || 0),
        },
      ];
      const labels = opinionOptions.map((m) => m.label);
      const colors = generateGreenToRedColors(opinionOptions.length);
      return (
        <Chart
          options={radarChartOptions(
            theme,
            labels,
            colors,
            true,
            true,
          )}
          series={chartData}
          type="radar"
          width="100%"
          height={height}
        />
      );
    }

    return (
      <div
        style={{
          display: 'table',
          height: '100%',
          width: '100%',
        }}
      >
        <span
          style={{
            display: 'table-cell',
            verticalAlign: 'middle',
            textAlign: 'center',
          }}
        >
          {data ? t('No entities of this type has been found.') : <CircularProgress size={40} thickness={2} />}
        </span>
      </div>
    );
  };

  return (
      <div style={{ height: height || '100%', marginTop: marginTop || 0 }}>
        <Typography
          variant={variant === 'inEntity' ? 'h3' : 'h4'}
          gutterBottom={true}
          style={{ float: 'left' }}
        >
          {t('Distribution of opinions')}
        </Typography>
        <Security needs={[KNOWLEDGE_KNUPDATE, KNOWLEDGE_KNPARTICIPATE]}>
          <IconButton
            color="secondary"
            aria-label="Label"
            onClick={handleOpen}
            style={{ float: 'left', margin: '-15px 0 0 -2px' }}
            size="large"
          >
            <ThumbsUpDownOutlined fontSize="small" />
          </IconButton>
          <Dialog
            PaperProps={{ elevation: 1 }}
            open={open}
            onClose={handleClose}
            fullWidth={true}
          >
            <QueryRenderer
              query={stixCoreObjectOpinionsRadarMyOpinionQuery}
              variables={{ id: stixCoreObjectId }}
              render={({ props: containerProps }) => {
                if (containerProps) {
                  const value = currentOpinion || opinionValue(containerProps.myOpinion?.opinion) || Math.round(opinionOptions.length / 2);
                  return (
                    <Formik
                      enableReinitialize={true}
                      initialValues={{
                        alreadyExistingOpinion: containerProps.myOpinion?.id ?? '',
                        explanation: containerProps.myOpinion?.explanation ?? '',
                        confidence: containerProps.myOpinion?.confidence ?? 75,
                      }}
                      onSubmit={onSubmit}
                      onReset={onReset}
                    >
                      {({ submitForm, handleReset, isSubmitting }) => (
                        <Form>
                          <DialogTitle>{containerProps.myOpinion ? t('Update opinion') : t('Create an opinion')}</DialogTitle>
                          <DialogContent>
                            <div style={{ marginLeft: 10, marginRight: 10 }}>
                              <Slider
                                sx={{
                                  '& .MuiSlider-markLabel': {
                                    textOverflow: 'ellipsis',
                                    maxWidth: 50,
                                    overflow: 'hidden',
                                  },
                                  '& .MuiSlider-thumb[style*="left: 0%"] .MuiSlider-valueLabelOpen': {
                                    left: -5,
                                    '&:before': {
                                      left: '22%',
                                    },
                                  },
                                  '& .MuiSlider-thumb[style*="left: 100%"] .MuiSlider-valueLabelOpen': {
                                    right: -5,
                                    '&:before': {
                                      left: '88%',
                                    },
                                  },
                                }}
                                style={{ marginTop: 30 }}
                                value={value}
                                onChange={(_, v) => handleChangeCurrentOpinion(v)}
                                step={1}
                                valueLabelDisplay="on"
                                valueLabelFormat={(v) => opinionOptions[v - 1].label}
                                marks={opinionOptions}
                                min={1}
                                max={opinionOptions.length}
                              />
                            </div>
                            <Field
                              component={MarkdownField}
                              name="explanation"
                              label={t('Explanation')}
                              fullWidth={true}
                              multiline={true}
                              rows="4"
                              style={{ marginTop: 20 }}
                            />
                            <ConfidenceField
                              entityType="Opinion"
                              containerStyle={fieldSpacingContainerStyle}
                            />
                          </DialogContent>
                          <DialogActions>
                            <Button
                              onClick={handleReset}
                              disabled={isSubmitting}
                            >
                              {t('Cancel')}
                            </Button>
                            <Button
                              color="secondary"
                              onClick={submitForm}
                              disabled={isSubmitting}
                            >
                              {t('Update')}
                            </Button>
                          </DialogActions>
                        </Form>
                      )}
                    </Formik>
                  );
                }
                return <div />;
              }}
            />
          </Dialog>
        </Security>
        <div className="clearfix" />
        {variant === 'inLine' || variant === 'inEntity' ? (
          renderContent()
        ) : (
          <Paper classes={{ root: classes.paper }} variant="outlined">
            {renderContent()}
          </Paper>
        )}
      </div>
  );
};

StixCoreObjectOpinionsRadarComponent.propTypes = {
  stixCoreObjectId: PropTypes.string,
  data: PropTypes.object,
  variant: PropTypes.string,
  height: PropTypes.number,
  marginTop: PropTypes.number,
  paginationOptions: PropTypes.object,
};

export const stixCoreObjectOpinionsRadarDistributionQuery = graphql`
  query StixCoreObjectOpinionsRadarDistributionQuery(
    $objectId: String
    $field: String!
    $operation: StatsOperation!
    $limit: Int
    $category: VocabularyCategory!
  ) {
    ...StixCoreObjectOpinionsRadar_distribution
      @arguments(
        objectId: $objectId
        field: $field
        operation: $operation
        limit: $limit
        category: $category
      )
  }
`;

const StixCoreObjectOpinionsRadar = createRefetchContainer(
  StixCoreObjectOpinionsRadarComponent,
  {
    data: graphql`
      fragment StixCoreObjectOpinionsRadar_distribution on Query
      @argumentDefinitions(
        objectId: { type: "String" }
        field: { type: "String!" }
        operation: { type: "StatsOperation!" }
        limit: { type: "Int", defaultValue: 1000 }
        category: { type: "VocabularyCategory!" }
      ) {
        opinionsDistribution(
          objectId: $objectId
          field: $field
          operation: $operation
          limit: $limit
        ) {
          label
          value
          entity {
            ... on Identity {
              name
            }
            ... on Malware {
              name
            }
          }
        }
        vocabularies(category: $category) {
          edges {
            node {
              id
              name
              description
              order
            }
          }
        }
      }
    `,
  },
  stixCoreObjectOpinionsRadarDistributionQuery,
);

export default StixCoreObjectOpinionsRadar;
