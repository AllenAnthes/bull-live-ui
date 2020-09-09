import React from 'react';
import ReactJson from 'react-json-view';
import Card from '@material-ui/core/Card';
import CardHeader from '@material-ui/core/CardHeader';
import CardContent from '@material-ui/core/CardContent';

const JsonDetailCard = ({ data, title }) => (
  <Card elevation={0}>
    <CardHeader title={title} />
    <CardContent>
      <ReactJson
        collapsed={3}
        displayDataTypes={false}
        enableClipboard={false}
        src={data}
        shouldCollapse={({ src }) => Array.isArray(src) && src.length > 5}
        name={null}
      />
    </CardContent>
  </Card>
);

export default JsonDetailCard;
