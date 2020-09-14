import React, { useEffect, useRef, useState } from 'react';
import { StringParam, useQueryParam } from 'use-query-params';
import MaterialTable from 'material-table';
import makeStyles from '@material-ui/core/styles/makeStyles';
import Paper from '@material-ui/core/Paper';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import Typography from '@material-ui/core/Typography';
import PlayArrowIcon from '@material-ui/icons/PlayArrow';
import socketIOClient from 'socket.io-client';

import DetailPanel from './DetailPanel';
import { getColumns } from './utils';
import DeleteConfirmationDialog from './DeleteConfirmationDialog';

const useStyles = makeStyles((theme) => ({
  progressBar: {
    backgroundColor: theme.palette.success.main,
  },
  progressBarError: {
    backgroundColor: theme.palette.error.main,
  },
  liveUpdateButton: {
    color: ({ isLiveUpdating }) =>
      isLiveUpdating ? theme.palette.success.main : theme.palette.action.disabled,
  },
  title: {
    fontSize: 14,
  },
  container: {
    maxWidth: '100%',
    minWidth: '75%',
  },
}));

const socket = socketIOClient(process.env.REACT_APP_SOCKET_IO_URI, {
  transports: ['websocket', 'polling'],
});

const Table = ({ name: queueName }) => {
  const tableRef = useRef();
  const isFirstRender = useRef(true);
  const [tab, setTab] = useQueryParam('tab', StringParam);
  const [counts, setCounts] = useState({});
  const [tabToClear, setTabToClear] = useState(null);
  const [isLiveUpdating, setIsLiveUpdating] = useState(true);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const classes = useStyles({ isLiveUpdating });

  const baseUrl = `${window.location.origin}${window.location.pathname}queues/${queueName}`;

  useEffect(() => {
    if (isLiveUpdating) {
      socket.emit('subQueue', { queueName }, (ackResponse) => {
        setCounts(ackResponse.counts);
      });
    } else {
      socket.emit('unsubQueue', { queueName });
    }
    return () => void socket.emit('unsubQueue', { queueName });
  }, [isLiveUpdating, queueName]);

  useEffect(() => {
    // re-fetch when different queue is selected
    if (!isFirstRender.current && tableRef.current) {
      tableRef.current.onQueryChange();
    }
    isFirstRender.current = false;
  }, [queueName]);

  useEffect(() => {
    socket.removeAllListeners();
    socket.on('progress', (data) => {
      tableRef.current && tableRef.current.onQueryChange();
      setCounts(data.counts);
    });
  }, []);

  const columns = getColumns({ classes, tab });

  const getDataForTable = (query) => {
    const url = new URL(`${baseUrl}/jobs`);
    Object.entries(query)
      .filter(([key, val]) => Boolean(val))
      .forEach(([key, val]) => url.searchParams.append(key, val));

    if (tab !== 'latest') url.searchParams.append('type', tab);

    return fetch(url.toString())
      .then((res) => res.json())
      .then((res) => {
        const { jobs, counts: newCounts } = res ?? {};
        const { totalCount, page, data } = jobs ?? {};

        setCounts(newCounts);

        const maxPages = Math.floor(jobs.totalCount / query.pageSize);
        return { totalCount, page: Math.min(maxPages, page), data };
      });
  };

  const actions = [
    {
      isFreeAction: true,
      tooltip: `${isLiveUpdating ? 'Disable' : 'Enable'} Live Updates`,
      icon: () => <PlayArrowIcon className={classes.liveUpdateButton} />,
      onClick: () => setIsLiveUpdating((prev) => !prev),
    },
    {
      isFreeAction: true,
      tooltip: `Delete all ${tab} jobs`,
      icon: 'delete',
      iconProps: { color: 'error' },
      onClick: () => setTabToClear(tab),
      hidden: tab === 'latest',
    },
    {
      icon: 'delete',
      tooltip: 'Remove job',
      iconProps: { color: 'error' },
      onClick: (event, rowData) =>
        fetch(`${baseUrl}/jobs/${rowData.id}`, { method: 'DELETE' }).then(
          tableRef.current.onQueryChange
        ),
    },
    (rowData) => ({
      icon: 'replay',
      disabled: !rowData.failedReason,
      toolTip: 'Retry',
      onClick: (event, { id }) =>
        fetch(`${baseUrl}/jobs/${id}/retry`, { method: 'POST' }).then(
          tableRef.current.onQueryChange
        ),
      hidden: !rowData.failedReason,
    }),
  ];

  const tableOptions = {
    initialPage: 0,
    loadingType: 'linear',
    pageSize: rowsPerPage,
    pageSizeOptions: [5, 10, 20, 50, 100],
    actionsColumnIndex: -1,
    columnsButton: true,
    search: false,
    sorting: false,
  };

  return (
    <Paper square className={classes.container}>
      <Tabs
        value={tab || 'latest'}
        onChange={(event, newTab) => {
          setTab(newTab);
          tableRef.current && tableRef.current.onQueryChange();
        }}
      >
        {['latest', 'active', 'waiting', 'completed', 'failed', 'delayed', 'paused'].map(
          (type, index) => (
            <Tab
              key={type}
              label={
                <Typography>
                  {`${type}  `}
                  {counts[type] ? (
                    <Typography variant="caption">({counts[type]})</Typography>
                  ) : null}
                </Typography>
              }
              value={type}
              aria-controls={`tabpanel-${index}`}
              id={`tab-${index}`}
            />
          )
        )}
      </Tabs>
      <MaterialTable
        onChangeRowsPerPage={(numRows) => setRowsPerPage(numRows)}
        tableRef={tableRef}
        actions={actions}
        options={tableOptions}
        data={getDataForTable}
        title={queueName}
        columns={columns}
        detailPanel={(rowData) => <DetailPanel rowData={rowData} />}
      />

      {tabToClear && (
        <DeleteConfirmationDialog
          onClose={() => setTabToClear(null)}
          tab={tabToClear}
          tableRef={tableRef}
          baseUrl={baseUrl}
        />
      )}
    </Paper>
  );
};

export default Table;
