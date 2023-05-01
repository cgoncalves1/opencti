import React from 'react';
import makeStyles from '@mui/styles/makeStyles';
import NotificationMenu from '../../NotificationMenu';
import { Theme } from '../../../../../components/Theme';
import ListLines from '../../../../../components/list_lines/ListLines';
import { usePaginationLocalStorage } from '../../../../../utils/hooks/useLocalStorage';
import useEntityToggle from '../../../../../utils/hooks/useEntityToggle';
import {
  OutcomeLinesPaginationQuery,
  OutcomeLinesPaginationQuery$variables,
} from './__generated__/OutcomeLinesPaginationQuery.graphql';
import useQueryLoading from '../../../../../utils/hooks/useQueryLoading';
import OutcomeLines, { OutcomeLinesQuery } from './OutcomeLines';
import { OutcomeLine_node$data } from './__generated__/OutcomeLine_node.graphql';
import { OutcomeLineDummy } from './OutcomeLine';
import OutcomeCreation from './OutcomeCreation';

const LOCAL_STORAGE_KEY = 'view-outcome';

const useStyles = makeStyles<Theme>(() => ({
  container: {
    margin: 0,
    padding: '0 200px 0 0',
  },
}));

const Outcome = () => {
  const classes = useStyles();
  const { viewStorage, paginationOptions, helpers: storageHelpers } = usePaginationLocalStorage<OutcomeLinesPaginationQuery$variables>(
    LOCAL_STORAGE_KEY,
    {
      numberOfElements: { number: 0, symbol: '', original: 0 },
      filters: {},
      searchTerm: '',
      sortBy: 'created',
      orderAsc: false,
      openExports: false,
      count: 25,
    },
  );

  const { numberOfElements, filters, searchTerm, sortBy, orderAsc } = viewStorage;
  const { selectedElements, deSelectedElements, selectAll, onToggleEntity } = useEntityToggle<OutcomeLine_node$data>(LOCAL_STORAGE_KEY);
  const dataColumns = {
    connector: {
      label: 'connector',
      width: '20%',
      isSortable: false,
    },
    name: {
      label: 'name',
      width: '20%',
      isSortable: false,
    },
    description: {
      label: 'description',
      width: '60%',
      isSortable: false,
    },
  };
  const queryRef = useQueryLoading<OutcomeLinesPaginationQuery>(OutcomeLinesQuery, paginationOptions);

  return (
        <div className={classes.container}>
            <NotificationMenu />
            <OutcomeCreation paginationOptions={paginationOptions} />
            <ListLines sortBy={sortBy}
                       orderAsc={orderAsc}
                       dataColumns={dataColumns}
                       handleSort={storageHelpers.handleSort}
                       handleSearch={storageHelpers.handleSearch}
                       handleAddFilter={storageHelpers.handleAddFilter}
                       handleRemoveFilter={storageHelpers.handleRemoveFilter}
                       selectAll={selectAll}
                       keyword={searchTerm}
                       filters={filters}
                       paginationOptions={paginationOptions}
                       numberOfElements={numberOfElements}
                       availableFilterKeys={[
                         'created_start_date',
                         'created_end_date',
                       ]}>
                {queryRef && (
                    <React.Suspense fallback={<>{Array(20).fill(0).map((idx) => (<OutcomeLineDummy key={idx} dataColumns={dataColumns}/>))}</>}>
                        <OutcomeLines
                            queryRef={queryRef}
                            paginationOptions={paginationOptions}
                            dataColumns={dataColumns}
                            onLabelClick={storageHelpers.handleAddFilter}
                            selectedElements={selectedElements}
                            deSelectedElements={deSelectedElements}
                            onToggleEntity={onToggleEntity}
                            selectAll={selectAll}
                            setNumberOfElements={storageHelpers.handleSetNumberOfElements}
                        />
                    </React.Suspense>
                )}
            </ListLines>
        </div>
  );
};

export default Outcome;
