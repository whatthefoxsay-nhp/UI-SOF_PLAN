import React from 'react';
import { FixedSizeList as List } from 'react-window';
import { Table } from 'antd';

const VirtualizedTable = ({ data, columns, height = 400, itemSize = 50 }) => {
  const Row = ({ index, style }) => {
    const record = data[index];
    return (
      <div style={style}>
        <Table
          dataSource={[record]}
          columns={columns}
          pagination={false}
          showHeader={index === 0}
          size="small"
          bordered={false}
        />
      </div>
    );
  };

  return (
    <List
      height={height}
      itemCount={data.length}
      itemSize={itemSize}
      width="100%"
    >
      {Row}
    </List>
  );
};

export default VirtualizedTable;