import React from 'react';
import { Typography, Tag } from 'antd';

const { Text } = Typography;

const HienThiTrangThai = ({ 
  status, 
  statusConfig = {},
  showText = true,
  size = 'default',
  ...props 
}) => {
  const getStatusInfo = (status) => {
    const defaultConfig = {
      active: { color: 'success', text: 'Hoạt động' },
      inactive: { color: 'default', text: 'Không hoạt động' },
      pending: { color: 'processing', text: 'Đang chờ' },
      approved: { color: 'success', text: 'Khoá' },
      rejected: { color: 'error', text: 'Đã từ chối' },
      completed: { color: 'success', text: 'Hoàn thành' },
      cancelled: { color: 'error', text: 'Đã hủy' },
      available: { color: 'success', text: 'Có sẵn' },
      occupied: { color: 'error', text: 'Đang sử dụng' },
      reserved: { color: 'warning', text: 'Đã đặt' },
    };

    const config = { ...defaultConfig, ...statusConfig };
    return config[status] || { color: 'default', text: status };
  };

  const statusInfo = getStatusInfo(status);

  if (!showText) {
    return <Tag color={statusInfo.color} size={size} {...props} />;
  }

  return (
    <Tag color={statusInfo.color} size={size} {...props}>
      {statusInfo.text}
    </Tag>
  );
};

export default HienThiTrangThai;
