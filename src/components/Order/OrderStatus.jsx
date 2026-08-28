import React, { useState, useEffect } from 'react';
import { Tag, Tooltip, Space } from 'antd';
import { 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Truck, 
  ChefHat,
  CreditCard
} from 'lucide-react';

const OrderStatus = ({ invoice, realTimeStatus }) => {
  const [currentStatus, setCurrentStatus] = useState('pending');

  useEffect(() => {
    if (realTimeStatus) {
      setCurrentStatus(realTimeStatus.status || 'pending');
    }
  }, [realTimeStatus]);

  const getStatusConfig = (status) => {
    const configs = {
      pending: {
        color: 'default',
        icon: <Clock size={12} />,
        text: 'Chờ xác nhận',
        description: 'Đơn hàng đang chờ xác nhận'
      },
      confirmed: {
        color: 'processing',
        icon: <CheckCircle size={12} />,
        text: 'Đã xác nhận',
        description: 'Đơn hàng đã được xác nhận'
      },
      preparing: {
        color: 'warning',
        icon: <ChefHat size={12} />,
        text: 'Đang chuẩn bị',
        description: 'Bếp đang chuẩn bị món ăn'
      },
      ready: {
        color: 'success',
        icon: <Truck size={12} />,
        text: 'Sẵn sàng',
        description: 'Món ăn đã sẵn sàng phục vụ'
      },
      completed: {
        color: 'success',
        icon: <CreditCard size={12} />,
        text: 'Hoàn thành',
        description: 'Đơn hàng đã hoàn thành và thanh toán'
      },
      cancelled: {
        color: 'error',
        icon: <AlertCircle size={12} />,
        text: 'Đã hủy',
        description: 'Đơn hàng đã bị hủy'
      }
    };

    return configs[status] || configs.pending;
  };

  const config = getStatusConfig(currentStatus);

  return (
    <Tooltip title={config.description}>
      <Tag 
        color={config.color} 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 4,
          padding: '4px 8px',
          border: 'none',
          borderRadius: 6
        }}
      >
        <Space size={4}>
          {config.icon}
          <span>{config.text}</span>
        </Space>
      </Tag>
    </Tooltip>
  );
};

export default OrderStatus;