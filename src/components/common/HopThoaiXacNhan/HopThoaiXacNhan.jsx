import React from 'react';
import { Modal } from 'antd';

const HopThoaiXacNhan = ({
  visible,
  title = 'Xác nhận',
  content,
  onOk,
  onCancel,
  okText = 'Đồng ý',
  cancelText = 'Hủy',
  okType = 'primary',
  centered = true,
  width = 400,
  ...props
}) => {
  return (
    <Modal
      open={visible}
      title={title}
      onOk={onOk}
      onCancel={onCancel}
      okText={okText}
      cancelText={cancelText}
      okType={okType}
      centered={centered}
      width={width}
      {...props}
    >
      {content}
    </Modal>
  );
};

export default HopThoaiXacNhan;
