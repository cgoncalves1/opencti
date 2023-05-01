import React, { FunctionComponent } from 'react';
import { graphql, PreloadedQuery } from 'react-relay';
import { OutcomeLine, OutcomeLineDummy } from './OutcomeLine';
import { OutcomeLine_node$data } from './__generated__/OutcomeLine_node.graphql';
import {
  OutcomeLinesPaginationQuery,
  OutcomeLinesPaginationQuery$variables,
} from './__generated__/OutcomeLinesPaginationQuery.graphql';
import { OutcomeLines_data$key } from './__generated__/OutcomeLines_data.graphql';
import { HandleAddFilter, UseLocalStorageHelpers } from '../../../../../utils/hooks/useLocalStorage';
import { DataColumns } from '../../../../../components/list_lines';
import usePreloadedPaginationFragment from '../../../../../utils/hooks/usePreloadedPaginationFragment';
import ListLinesContent from '../../../../../components/list_lines/ListLinesContent';

const nbOfRowsToLoad = 50;

const OutcomeLineFragment = graphql`
    fragment OutcomeLines_data on Query
    @argumentDefinitions(
        search: { type: "String" }
        count: { type: "Int", defaultValue: 25 }
        cursor: { type: "ID" }
        orderBy: { type: "OutcomeOrdering", defaultValue: created }
        orderMode: { type: "OrderingMode", defaultValue: desc }
        filters: { type: "[OutcomeFiltering!]" }
    )
    @refetchable(queryName: "OutcomeLinesRefetchQuery") {
        outcomes(
            search: $search
            first: $count
            after: $cursor
            orderBy: $orderBy
            orderMode: $orderMode
            filters: $filters
        ) @connection(key: "Pagination_outcomes") {
            edges {
                node {
                    ...OutcomeLine_node
                }
            }
            pageInfo {
                endCursor
                hasNextPage
                globalCount
            }
        }
    }
`;

export const OutcomeLinesQuery = graphql`
    query OutcomeLinesPaginationQuery(
        $search: String
        $count: Int!
        $cursor: ID
        $orderBy: OutcomeOrdering
        $orderMode: OrderingMode
        $filters: [OutcomeFiltering!]
    ) {
        ...OutcomeLines_data
        @arguments(
            search: $search
            count: $count
            cursor: $cursor
            orderBy: $orderBy
            orderMode: $orderMode
            filters: $filters
        )
    }
`;

interface OutcomeLinesProps {
  setNumberOfElements: UseLocalStorageHelpers['handleSetNumberOfElements'];
  dataColumns: DataColumns;
  paginationOptions: OutcomeLinesPaginationQuery$variables;
  queryRef: PreloadedQuery<OutcomeLinesPaginationQuery>;
  selectedElements: Record<string, OutcomeLine_node$data>;
  deSelectedElements: Record<string, OutcomeLine_node$data>;
  onToggleEntity: (entity: OutcomeLine_node$data, event: React.SyntheticEvent) => void;
  selectAll: boolean;
  onLabelClick?: HandleAddFilter;
}

const OutcomeLines: FunctionComponent<OutcomeLinesProps> = ({
  paginationOptions,
  queryRef,
  dataColumns,
  onLabelClick,
  setNumberOfElements,
  onToggleEntity,
  selectedElements,
  deSelectedElements,
  selectAll,
}) => {
  const { data, hasMore, loadMore, isLoadingMore } = usePreloadedPaginationFragment<
  OutcomeLinesPaginationQuery,
  OutcomeLines_data$key
  >({
    linesQuery: OutcomeLinesQuery,
    linesFragment: OutcomeLineFragment,
    queryRef,
    nodePath: ['outcomes', 'pageInfo', 'globalCount'],
    setNumberOfElements,
  });

  return (
        <ListLinesContent
            initialLoading={!data}
            loadMore={loadMore}
            hasMore={hasMore}
            isLoading={isLoadingMore}
            dataList={data?.outcomes?.edges ?? []}
            globalCount={data?.outcomes?.pageInfo?.globalCount ?? nbOfRowsToLoad}
            LineComponent={OutcomeLine}
            DummyLineComponent={OutcomeLineDummy}
            dataColumns={dataColumns}
            nbOfRowsToLoad={nbOfRowsToLoad}
            paginationOptions={paginationOptions}
            onLabelClick={onLabelClick}
            selectedElements={selectedElements}
            deSelectedElements={deSelectedElements}
            selectAll={selectAll}
            onToggleEntity={onToggleEntity}
        />
  );
};

export default OutcomeLines;
