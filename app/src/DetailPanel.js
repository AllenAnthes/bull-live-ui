import React from 'react';
import Grid from '@material-ui/core/Grid';

import JsonDetailCard from './JsonDetailCard';

const DetailPanel = ({ rowData }) => (
  <Grid container spacing={2} justify="space-evenly" style={{ padding: '1rem' }}>
    {rowData.stacktrace?.length > 0 && (
      <Grid item xs={12}>
        <JsonDetailCard data={rowData.stacktrace} title="Stacktrace:" />
      </Grid>
    )}
    <Grid item xs={12}>
      <JsonDetailCard data={rowData.data} title="Data:" />
    </Grid>
    <Grid item xs={12}>
      <JsonDetailCard data={rowData.opts} title="Options:" />
    </Grid>
  </Grid>
);

export default DetailPanel;
