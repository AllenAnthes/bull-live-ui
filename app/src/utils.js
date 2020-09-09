import React from 'react';
import { format, formatDistanceStrict, formatDistanceToNow } from 'date-fns';
import Typography from '@material-ui/core/Typography';
import LinearProgress from '@material-ui/core/LinearProgress';

const getDate = ({ fieldOrDate, data }) => {
  if (fieldOrDate instanceof Date) return fieldOrDate;
  if (!data[fieldOrDate]) return;
  return new Date(data[fieldOrDate]);
};

const formatTime = (fieldOrDate) => (data) => {
  const date = getDate({ fieldOrDate, data });
  if (!date) return;

  const time = format(date, 'HH:mm:ss');
  const fromNow = formatDistanceToNow(date, { includeSeconds: true, addSuffix: true });
  return (
    <>
      <Typography variant="body2">{time}</Typography>
      <Typography variant="caption">({fromNow})</Typography>
    </>
  );
};

export const getColumns = ({ classes, tab }) => {
  return [
    {
      title: 'Id',
      field: 'id',
      width: 75,
      render: (data) => {
        if (data.id.length > 12) {
          return `#${data.id.slice(0, 12)}...`;
        }
        return `#${data.id}`;
      },
    },
    {
      title: 'Progress',
      field: 'progress',
      removable: true,
      width: 50,
      render: (data) => (
        <LinearProgress
          thickness={10}
          color="primary"
          classes={{
            barColorPrimary: data.failedReason ? classes.progressBarError : classes.progressBar,
          }}
          value={data.progress}
          variant="determinate"
        />
      ),
    },
    {
      title: 'Created',
      field: 'timestamp',
      render: formatTime('timestamp'),
      width: 200,
    },
    {
      title: 'Next Run',
      hidden: tab !== 'delayed',
      render: (data) => {
        const date = new Date(data.timestamp + data.delay);
        return formatTime(date)(data);
      },
    },
    {
      title: 'Job Started',
      field: 'processedOn',
      render: formatTime('processedOn'),
      width: 200,
      hidden: ['waiting', 'delayed'].includes(tab),
    },
    {
      title: 'Waited',
      field: 'processedOn',
      width: 200,
      render: (data) => {
        if (!data.processedOn) return;
        return formatDistanceStrict(new Date(data.processedOn), new Date(data.timestamp), {
          unit: 'second',
        });
      },
      hidden: ['waiting', 'delayed'].includes(tab),
    },
    {
      title: 'Finished',
      field: 'finishedOn',
      width: 200,
      render: formatTime('finishedOn'),
      hidden: !['latest', 'completed', 'failed'].includes(tab),
    },
    {
      title: 'Run Time',
      field: 'finishedOn',
      width: 100,
      render: (data) => {
        if (!data.finishedOn) return;
        return formatDistanceStrict(new Date(data.finishedOn), new Date(data.timestamp), {
          unit: 'second',
        });
      },
      hidden: !['latest', 'completed', 'failed'].includes(tab),
    },
    {
      title: 'Execution Time',
      field: 'finishedOn',
      width: 100,
      render: (data) => {
        if (!data.finishedOn) return;
        return formatDistanceStrict(new Date(data.finishedOn), new Date(data.processedOn), {
          unit: 'second',
        });
      },
      hidden: !['latest', 'completed', 'failed'].includes(tab),
    },
    { title: 'Failed Reason', field: 'failedReason', hidden: tab !== 'failed' },
  ];
};
