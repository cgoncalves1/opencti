import React from 'react';
import * as PropTypes from 'prop-types';
import { QueryRenderer } from '../../../../relay/environment';
import StixCoreObjectOpinionsRadar, { stixCoreObjectOpinionsRadarDistributionQuery } from './StixCoreObjectOpinionsRadar';
import useVocabularyCategory from '../../../../utils/hooks/useVocabularyCategory';

const StixCoreObjectOpinions = (props) => {
  const { stixCoreObjectId, variant, height, marginTop } = props;
  const { typeToCategory } = useVocabularyCategory();
  const opinionsDistributionVariables = {
    objectId: stixCoreObjectId,
    field: 'opinion',
    operation: 'count',
    limit: 8,
    category: typeToCategory('opinion-ov'),
  };
  return (
      <QueryRenderer
        query={stixCoreObjectOpinionsRadarDistributionQuery}
        variables={opinionsDistributionVariables}
        render={({ props: containerProps }) => {
          if (containerProps) {
            return (
              <StixCoreObjectOpinionsRadar
                stixCoreObjectId={stixCoreObjectId}
                data={containerProps}
                variant={variant}
                height={height}
                marginTop={marginTop}
                paginationOptions={opinionsDistributionVariables}
              />
            );
          }
          return <div />;
        }}
      />
  );
};

StixCoreObjectOpinions.propTypes = {
  stixCoreObjectId: PropTypes.string,
  variant: PropTypes.string,
  height: PropTypes.number,
  marginTop: PropTypes.number,
};

export default StixCoreObjectOpinions;
