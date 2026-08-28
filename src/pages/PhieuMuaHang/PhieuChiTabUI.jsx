import React, { useState, useEffect } from "react";
import {
  Table,
  Button,
  Space,
  Typography,
  Tag,
  Modal,
  Popconfirm,
  message,
} from "antd";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { listPhieuChi, deletePhieuChi } from "../../services/apiServices";
import NhapPhieuChiNhanh from "../KeToanTienMat/PhieuChi/NhapPhieuChiNhanh";
import dayjs from "dayjs";

const PhieuChiTabUI = ({ maPMH, tongTien }) => {
  const { hasPermission } = useAuth();
  const MODULE_CODE = "Ac0019"; // Payment Vouchers
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  const fetchData = async () => {
    if (!maPMH) return;
    setLoading(true);
    try {
      const result = await listPhieuChi({ maPMH });
      const rawData = Array.isArray(result) ? result : result?.data || [];
      setData(rawData);
    } catch (error) {
      console.error("Lỗi khi tải danh sách phiếu chi:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [maPMH]);

  const handleCreate = () => {
    if (!hasPermission(MODULE_CODE, "Add")) {
      message.error("Bạn không có quyền thêm phiếu chi");
      return;
    }
    setEditingRecord(null);
    setIsModalOpen(true);
  };

  const handleEdit = (record) => {
    if (!hasPermission(MODULE_CODE, "Edit")) {
      message.error("Bạn không có quyền cập nhật phiếu chi");
      return;
    }
    setEditingRecord(record);
    setIsModalOpen(true);
  };

  const handleDelete = async (record) => {
    if (!hasPermission(MODULE_CODE, "Del")) {
      message.error("Bạn không có quyền xóa phiếu chi");
      return;
    }
    try {
      await deletePhieuChi(record.lv001);
      message.success("Xóa phiếu chi thành công");
      fetchData();
    } catch (error) {
      console.error("Lỗi khi xóa phiếu chi:", error);
      message.error("Không thể xóa phiếu chi");
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingRecord(null);
    fetchData();
  };

  const columns = [
    {
      title: "Mã Phiếu",
      dataIndex: "lv001",
      key: "lv001",
    },
    {
      title: "Ngày CT",
      dataIndex: "lv014",
      key: "lv014",
      render: (text) => (text ? dayjs(text).format("DD/MM/YYYY") : ""),
    },
    {
      title: "Đối tượng",
      dataIndex: "lv005",
      key: "lv005",
    },
    {
      title: "Lý do",
      dataIndex: "lv007",
      key: "lv007",
    },
    {
      title: "Số hoá đơn",
      dataIndex: "lv015",
      key: "lv015",
    },
    {
      title: "Tổng tiền",
      dataIndex: "lv069",
      key: "lv069",
      align: "right",
      render: (val) => Number(val || 0).toLocaleString("vi-VN"),
    },
    {
      title: "Trạng thái",
      key: "status",
      render: (_, record) => (
        <Space size="small">
          {record.lv016 > 0 ? (
            <Tag color="success">Đã duyệt</Tag>
          ) : (
            <Tag color="warning">Chưa duyệt</Tag>
          )}
        </Space>
      ),
    },
    {
      title: "Thao tác",
      key: "action",
      render: (_, record) => (
        <Space size="middle">
          <Button
            type="text"
            icon={<Pencil size={16} />}
            onClick={() => handleEdit(record)}
            disabled={record.lv016 > 0}
          />
          <Popconfirm
            title="Xóa phiếu chi?"
            description="Bạn có chắc chắn muốn xóa phiếu chi này không?"
            onConfirm={() => handleDelete(record)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Button
              type="text"
              danger
              icon={<Trash2 size={16} />}
              disabled={record.lv016 > 0}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: "0 12px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <Typography.Title level={5}>Danh sách Phiếu chi</Typography.Title>
        <Button type="primary" icon={<Plus size={16} />} onClick={handleCreate}>
          Tạo phiếu chi nhanh
        </Button>
      </div>

      <Table
        rowKey="lv001"
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={false}
        size="small"
        summary={(pageData) => {
          let total = 0;
          pageData.forEach(({ lv069 }) => {
            total += Number(lv069) || 0;
          });
          return (
            <Table.Summary fixed>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={5} align="right">
                  <Typography.Text strong>Tổng cộng:</Typography.Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1} align="right">
                  <Typography.Text strong>
                    {total.toLocaleString("vi-VN")}
                  </Typography.Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2} colSpan={2}></Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          );
        }}
      />

      <Modal
        title={editingRecord ? "Cập nhật Phiếu Chi" : "Nhập Phiếu Chi Nhanh"}
        open={isModalOpen}
        onCancel={handleCloseModal}
        footer={null}
        width={1100}
        destroyOnClose
      >
        <NhapPhieuChiNhanh
          editingRecord={editingRecord}
          onSuccess={handleCloseModal}
          initialData={
            !editingRecord ? { lv116: maPMH, lv813: maPMH, tongTien } : {}
          }
        />
      </Modal>
    </div>
  );
};

export default PhieuChiTabUI;
