import React from 'react';
import { Card, Typography, Badge, Spin } from 'antd';
import { Table, Users, Clock, CheckCircle } from 'lucide-react';
import '../../styles/tables/TableGrid.css';

const { Text } = Typography;

const TableCard = ({ table, isSelected, onClick }) => {
  const getStatusIcon = () => {
    // Hiện tại chỉ có trạng thái trống vì API chưa trả về trạng thái
    return <Table size={32} />;
  };

  const getStatusText = () => {
    // Mặc định là trống vì API chưa có trạng thái
    return 'Sẵn sàng';
  };

  const getStatusClass = () => {
    // Mặc định là trống
    return 'trong';
  };

  return (
    <div 
      className={`table-card ${getStatusClass()} ${isSelected ? 'selected' : ''}`}
      onClick={() => onClick(table)}
    >
      <div className="table-icon">
        {getStatusIcon()}
      </div>
      <div className="table-name">
        {table.tenBan}
      </div>
      <div className="table-status">
        {getStatusText()}
      </div>
      <div className="table-order-info">
        {table.idKhuVuc}
      </div>
    </div>
  );
};

const TableGrid = ({ tables, loading, selectedTable, onTableSelect, selectedKhuVuc }) => {
  // Filter tables theo khu vực
  const filteredTables = selectedKhuVuc === 'all' 
    ? tables 
    : tables.filter(table => table.idKhuVuc === selectedKhuVuc);

  if (loading) {
    return (
      <div className="loading-container">
        <Spin size="large" />
        <div className="loading-text">Đang tải danh sách bàn...</div>
      </div>
    );
  }

  if (filteredTables.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">
          <Table size={48} />
        </div>
        <Text type="secondary">
          {selectedKhuVuc === 'all' ? 'Không có bàn nào' : `Không có bàn nào trong khu vực ${selectedKhuVuc}`}
        </Text>
      </div>
    );
  }

  return (
    <div className="tables-grid">
      {filteredTables.map((table) => (
        <TableCard
          key={table.id}
          table={table}
          isSelected={selectedTable?.id === table.id}
          onClick={onTableSelect}
        />
      ))}
    </div>
  );
};

export default TableGrid;
