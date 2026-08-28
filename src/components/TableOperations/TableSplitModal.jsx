import React from "react";
import { Modal } from "antd";

const TableSplitModal = ({ visible, onCancel, onSplit, ...props }) => {
  return (
    <Modal
      title="Tách bàn"
      open={visible}
      onCancel={onCancel}
      onOk={onSplit}
      {...props}
    >
      <p>Chức năng tách bàn đang được phát triển</p>
    </Modal>
  );
};

export default TableSplitModal;
