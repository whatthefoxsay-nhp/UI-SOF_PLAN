import React from "react";
import { Modal } from "antd";

const TableTransferModal = ({ visible, onCancel, onTransfer, ...props }) => {
  return (
    <Modal
      title="Chuyển bàn"
      open={visible}
      onCancel={onCancel}
      onOk={onTransfer}
      {...props}
    >
      <p>Chức năng chuyển bàn đang được phát triển</p>
    </Modal>
  );
};

export default TableTransferModal;
