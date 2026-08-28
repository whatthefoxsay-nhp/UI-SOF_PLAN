import React, { useState } from 'react';
import { Drawer, List, Checkbox, Button, Input, Space, Empty, Typography } from 'antd';
import { Search, RotateCcw, Trash2, Clock } from 'lucide-react';
import { useTabs } from '../../../contexts/TabContext';
import { IconRenderer } from '../../../utils/menuUtils';

const { Text } = Typography;

const TabHistoryDrawer = ({ visible, onClose }) => {
  const { history, restoreTabs, clearHistory } = useTabs();
  const [selectedPaths, setSelectedPaths] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Reset selection on close
  const handleClose = () => {
    setSelectedPaths([]);
    setSearchQuery('');
    onClose();
  };

  const handleCheckboxChange = (path, checked) => {
    if (checked) {
      setSelectedPaths(prev => [...prev, path]);
    } else {
      setSelectedPaths(prev => prev.filter(p => p !== path));
    }
  };

  const handleSelectAll = () => {
    const filteredHistory = getFilteredHistory();
    if (selectedPaths.length === filteredHistory.length) {
      setSelectedPaths([]);
    } else {
      setSelectedPaths(filteredHistory.map(item => item.path));
    }
  };

  const handleRestore = () => {
    if (selectedPaths.length === 0) return;
    restoreTabs(selectedPaths);
    handleClose();
  };

  const handleClear = () => {
    clearHistory();
    setSelectedPaths([]);
  };

  const getFilteredHistory = () => {
    return history.filter(item => 
      item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.path.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const filteredHistory = getFilteredHistory();

  return (
    <Drawer
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={18} style={{ color: 'var(--primary-color)' }} />
          <span>Lịch sử các trang đã mở</span>
        </div>
      }
      placement="right"
      width={400}
      onClose={handleClose}
      open={visible}
      extra={
        history.length > 0 && (
          <Button 
            type="text" 
            danger 
            icon={<Trash2 size={14} style={{ marginRight: 4, display: 'inline-block', verticalAlign: 'middle' }} />}
            onClick={handleClear}
          >
            Xóa lịch sử
          </Button>
        )
      }
      footer={
        selectedPaths.length > 0 ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text type="secondary">Đã chọn: {selectedPaths.length} trang</Text>
            <Space>
              <Button onClick={() => setSelectedPaths([])}>Hủy chọn</Button>
              <Button 
                type="primary" 
                icon={<RotateCcw size={14} style={{ marginRight: 4, display: 'inline-block', verticalAlign: 'middle' }} />}
                onClick={handleRestore}
              >
                Phục hồi
              </Button>
            </Space>
          </div>
        ) : null
      }
    >
      <Space direction="vertical" style={{ width: '100%', height: '100%' }} size="middle">
        <Input
          placeholder="Tìm kiếm trang..."
          prefix={<Search size={16} style={{ color: '#bfbfbf' }} />}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          allowClear
        />

        {history.length > 0 && filteredHistory.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 4px' }}>
            <Checkbox 
              checked={filteredHistory.length > 0 && selectedPaths.length === filteredHistory.length}
              indeterminate={selectedPaths.length > 0 && selectedPaths.length < filteredHistory.length}
              onChange={handleSelectAll}
            >
              Chọn tất cả
            </Checkbox>
            <Text type="secondary">Tối đa {history.length} trang gần đây</Text>
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto', maxHeight: 'calc(100vh - 250px)' }}>
          <List
            dataSource={filteredHistory}
            locale={{ emptyText: <Empty description="Không có lịch sử trang đã mở" /> }}
            renderItem={item => {
              const isChecked = selectedPaths.includes(item.path);
              const formattedTime = new Date(item.timestamp).toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <List.Item
                  style={{
                    padding: '12px 8px',
                    borderRadius: '6px',
                    marginBottom: '4px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    background: isChecked ? '#e6f7ff' : 'transparent',
                    border: '1px solid transparent',
                  }}
                  className="history-list-item"
                  onClick={() => handleCheckboxChange(item.path, !isChecked)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '12px' }}>
                    <Checkbox 
                      checked={isChecked}
                      onChange={e => {
                        e.stopPropagation();
                        handleCheckboxChange(item.path, e.target.checked);
                      }}
                      onClick={e => e.stopPropagation()}
                    />
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      width: '32px',
                      height: '32px',
                      borderRadius: '6px',
                      background: '#f5f5f5',
                      color: '#555'
                    }}>
                      <IconRenderer name={item.iconName} size={18} />
                    </div>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ fontWeight: 500, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                        {item.label}
                      </div>
                      <div style={{ fontSize: '11px', color: '#8c8c8c', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                        {item.path}
                      </div>
                    </div>
                    <div style={{ fontSize: '12px', color: '#bfbfbf' }}>
                      {formattedTime}
                    </div>
                  </div>
                </List.Item>
              );
            }}
          />
        </div>
      </Space>
    </Drawer>
  );
};

export default TabHistoryDrawer;
