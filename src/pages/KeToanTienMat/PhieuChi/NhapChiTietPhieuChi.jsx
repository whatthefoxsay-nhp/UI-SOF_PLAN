import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Space,
  Popconfirm,
  message,
  Row,
  Col,
  InputNumber,
} from "antd";
import { Plus, Edit, Trash2, FileText, TrendingUp } from "lucide-react";
import { useAuth } from "../../../contexts/AuthContext";
import SelectTaiKhoan from "../../../components/DropDown/SelectTaiKhoan";
import { lv_LoadDataAPI } from "../../../services/apiServices";
import "../PhieuThu/NhapChiTietThuTien.css";
import "./KeToanLuong/TraTienLuong.css";

const vclass = "ac_lv0077";
const vfunc = "NhapChiTietChiTien"; // Đổi từ ThuTien -> ChiTien để tránh nhầm lẫn

const NhapChiTietPhieuChi = ({
  temporaryId,
  setChiTietCount,
  isEditMode = false,
  initialData,
}) => {
  const { hasPermission } = useAuth();
  const MODULE_CODE = "Ac0019"; // Payment Vouchers
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form] = Form.useForm();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const payload = temporaryId ? { lv002: temporaryId } : {};
      // Gọi API khác nhau tùy vào chế độ
      const funcName = isEditMode ? "loadChiTietPhieuChiDaLuu" : "load" + vfunc;
      const data = await lv_LoadDataAPI(vclass, funcName, payload);
      if (data && Array.isArray(data)) {
        setList(data.map((item) => ({ ...item, key: item.lv001 })));
      }
    } catch (error) {
      console.error("Error loading details:", error);
      message.error("Không thể tải chi tiết");
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [temporaryId, isEditMode]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Báo cho component cha biết số lượng chi tiết vừa được load lại
  useEffect(() => {
    if (setChiTietCount) {
      setChiTietCount(list.length);
    }
  }, [list, setChiTietCount]);

  const handleAdd = useCallback(() => {
    if (!hasPermission(MODULE_CODE, "Add")) {
      message.error("Bạn không có quyền thêm chi tiết phiếu chi");
      return;
    }
    setEditingItem(null);
    form.resetFields();
    form.setFieldsValue({
      lv003: initialData?.tongTien || null,
      lv004: initialData?.tongTien || null,
      lv005: "3312",
      lv006: "1111",
      lv007: "Phải trả NCC",
    });
    setIsModalVisible(true);
  }, [form, initialData, hasPermission]);

  const handleEdit = useCallback(
    (record) => {
      if (!hasPermission(MODULE_CODE, "Edit")) {
        message.error("Bạn không có quyền cập nhật chi tiết phiếu chi");
        return;
      }
      setEditingItem(record);
      form.setFieldsValue({ ...record });
      setIsModalVisible(true);
    },
    [form, hasPermission],
  );

  const handleDelete = useCallback(
    async (id) => {
      if (!hasPermission(MODULE_CODE, "Del")) {
        message.error("Bạn không có quyền xóa chi tiết phiếu chi");
        return;
      }
      try {
        // Gọi API khác nhau tùy vào chế độ
        const apiFunc = isEditMode
          ? "deleteChiTietPhieuChiDaLuu"
          : "delete" + vfunc;
        await lv_LoadDataAPI(vclass, apiFunc, { lv001: id });
        message.success("Xóa thành công");
        loadData();
      } catch (error) {
        console.error("Error deleting:", error);
        message.error("Không thể xóa");
      }
    },
    [loadData, isEditMode],
  );

  const handleSubmit = async (values) => {
    try {
      const payload = { ...values };
      if (temporaryId) {
        payload.lv002 = temporaryId; // Đính kèm ID tạm
      }

      if (editingItem) {
        payload.lv001 = editingItem.lv001;
        // Gọi API khác nhau tùy vào chế độ
        const apiFunc = isEditMode
          ? "updateChiTietPhieuChiDaLuu"
          : "update" + vfunc;
        await lv_LoadDataAPI(vclass, apiFunc, payload);
        message.success("Cập nhật thành công");
      } else {
        // Gọi API khác nhau tùy vào chế độ
        const apiFunc = isEditMode ? "addChiTietPhieuChiDaLuu" : "add" + vfunc;
        await lv_LoadDataAPI(vclass, apiFunc, payload);
        message.success("Thêm thành công");
      }
      setIsModalVisible(false);
      form.resetFields();
      loadData();
    } catch (error) {
      console.error("Error saving:", error);
      message.error("Có lỗi xảy ra");
    }
  };

  const columns = useMemo(
    () => [
      {
        title: "Tiền",
        dataIndex: "lv003",
        key: "lv003",
        render: (val) => (val ? Number(val).toLocaleString("vi-VN") : "0"),
      },
      {
        title: "Quy đổi",
        dataIndex: "lv004",
        key: "lv004",
        render: (val) => (val ? Number(val).toLocaleString("vi-VN") : "0"),
      },
      {
        title: "Tài khoản nợ",
        key: "lv005",
        render: (_, record) => record.lv005 + " - " + record.taikhoanno,
      },
      {
        title: "Tài khoản có",
        dataIndex: "taikhoanco",
        key: "lv006",
        render: (_, record) => record.lv006 + " - " + record.taikhoanco,
      },
      {
        title: "Mô tả",
        dataIndex: "lv007",
        key: "lv007",
      },
      {
        title: "Thao tác",
        key: "action",
        width: 200,
        fixed: "right",
        render: (_, record) => (
          <Space size="small">
            <Button
              type="link"
              icon={<Edit size={16} />}
              onClick={() => handleEdit(record)}
            >
              Sửa
            </Button>
            <Popconfirm
              title="Xóa?"
              onConfirm={() => handleDelete(record.lv001)}
            >
              <Button type="link" danger icon={<Trash2 size={16} />}>
                Xóa
              </Button>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [handleEdit, handleDelete],
  );

  return (
    <div className="chi-tiet-thu-tien-wrapper">
      <Card
        className="chi-tiet-thu-tien-card"
        title={
          <div className="chi-tiet-header">
            <div className="chi-tiet-header-left">
              <div className="chi-tiet-header-icon">
                <FileText />
              </div>
              <div>
                <div className="chi-tiet-header-title">
                  Nhập chi tiết chi tiền
                </div>
                <div className="chi-tiet-header-subtitle">
                  Quản lý các khoản chi chi tiết
                </div>
              </div>
            </div>
            <Button
              type="primary"
              className="chi-tiet-add-btn"
              icon={<Plus size={18} />}
              onClick={handleAdd}
            >
              Thêm mới
            </Button>
          </div>
        }
      >
        <Table
          columns={columns}
          scroll={{ x: "max-content" }}
          dataSource={list}
          loading={loading}
          pagination={{
            defaultPageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `Tổng số: ${total}`,
          }}
          size="small"
          summary={(pageData) => {
            let totalTien = 0;
            let totalQuyDoi = 0;
            pageData.forEach(({ lv003, lv004 }) => {
              totalTien += Number(lv003) || 0;
              totalQuyDoi += Number(lv004) || 0;
            });
            return (
              <Table.Summary>
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0}>
                    <span className="summary-total-value">
                      {totalTien.toLocaleString("vi-VN")} ₫
                    </span>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={1}>
                    <span className="summary-total-value">
                      {totalQuyDoi.toLocaleString("vi-VN")} ₫
                    </span>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={2}>
                    <span
                      style={{
                        color: "#059669",
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <TrendingUp size={16} /> Tổng cộng chi
                    </span>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={3}></Table.Summary.Cell>
                  <Table.Summary.Cell index={4}></Table.Summary.Cell>
                  <Table.Summary.Cell index={5}></Table.Summary.Cell>
                </Table.Summary.Row>
              </Table.Summary>
            );
          }} bordered />
      </Card>

      <Modal
        title={editingItem ? "Sửa chi tiết" : "Thêm chi tiết"}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        onOk={() => form.submit()}
        width={700}
        style={{ top: 20 }}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="lv003" label="Tiền" rules={[{ required: true }]}>
                <InputNumber
                  style={{ width: "100%" }}
                  formatter={(value) =>
                    `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                  }
                  parser={(value) => value.replace(/\$\s?|(,*)/g, "")}
                  onChange={(value) => form.setFieldValue("lv004", value)}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="lv004" label="Quy đổi">
                <InputNumber
                  style={{ width: "100%" }}
                  formatter={(value) =>
                    `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                  }
                  parser={(value) => value.replace(/\$\s?|(,*)/g, "")}
                  disabled
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="lv005"
                label="Tài khoản nợ"
                rules={[{ required: true }]}
              >
                <SelectTaiKhoan />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="lv006"
                label="Tài khoản có"
                rules={[{ required: true }]}
              >
                <SelectTaiKhoan />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item name="lv007" label="Mô tả">
                <Input.TextArea rows={2} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default NhapChiTietPhieuChi;
