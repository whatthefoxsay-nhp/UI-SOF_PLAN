import React from "react";
import { Modal } from "antd";

const TableMergeModal = ({ visible, onCancel, onMerge, ...props }) => {
  return (
    <Modal
      title="Gộp bàn"
      open={visible}
      onCancel={onCancel}
      onOk={onMerge}
      {...props}
    >
      <p>Chức năng gộp bàn đang được phát triển</p>
    </Modal>
  );
};

export default TableMergeModal;
