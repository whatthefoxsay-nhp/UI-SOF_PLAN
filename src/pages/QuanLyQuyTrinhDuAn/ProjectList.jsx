import React, { useEffect, useState, useCallback } from "react";
import { Button, Modal, Form, Input, Select, Tag, message, Spin, Empty, Space } from "antd";
import { Plus, Building2, Search } from "lucide-react";
import * as workflowApi from "../../services/workflowApi";

const STATUS_COLOR = { IN_PROGRESS: "processing", DONE: "success", CANCELLED: "default" };
const STATUS_LABEL = { IN_PROGRESS: "Đang thực hiện", DONE: "Hoàn thành", CANCELLED: "Đã hủy" };

export default function ProjectList({ onOpenProject }) {
  const [projects, setProjects] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [customers, setCustomers] = useState([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, w, c] = await Promise.all([workflowApi.listProjects(), workflowApi.listWorkflows(), workflowApi.listCustomers()]);
      setProjects(p || []);
      setWorkflows((w || []).filter((x) => x.is_active));
      setCustomers(c || []);
    } catch (e) {
      message.error(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    form.resetFields();
    // Xoa text tim kiem con sot lai tu lan mo truoc: rc-select khong goi
    // onSearch khi chon xong hay khi blur, nen neu khong reset o day thi lan
    // mo sau dropdown se hien 1 option "+ Tao moi ..." cho text khong ai vua go.
    setCustomerSearch("");
    setModalOpen(true);
  };

  const submit = async () => {
    const values = await form.validateFields();
    try {
      const data = await workflowApi.createProject(values);
      message.success(`Đã tạo dự án ${data.code}, tự sinh ${data.stages.length} giai đoạn`);
      setModalOpen(false);
      load();
      onOpenProject(data.id);
    } catch (e) {
      message.error(e.message);
    }
  };

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      !searchQuery.trim() ||
      (p.name && p.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.code && p.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.customer_name && p.customer_name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === "ALL" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div>
      <div className="wf-project-toolbar">
        <Space wrap>
          <Input
            placeholder="Tìm kiếm dự án, mã, khách hàng..."
            prefix={<Search size={14} style={{ color: "#94a3b8" }} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: 260 }}
            allowClear
          />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 160 }}
            options={[
              { value: "ALL", label: "Tất cả trạng thái" },
              { value: "IN_PROGRESS", label: "Đang thực hiện" },
              { value: "DONE", label: "Hoàn thành" },
              { value: "CANCELLED", label: "Đã hủy" },
            ]}
          />
          <span className="wf-project-count">{filteredProjects.length} / {projects.length} dự án</span>
        </Space>
        <Button type="primary" icon={<Plus size={14} />} onClick={openCreate}>
          Tạo dự án mới
        </Button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60 }}>
          <Spin size="large" />
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="wf-empty-state">
          <Empty description="Không tìm thấy dự án phù hợp" />
        </div>
      ) : (
        <div className="wf-project-grid">
          {filteredProjects.map((row) => (
            <div key={row.id} className="wf-project-card" onClick={() => onOpenProject(row.id)}>
              <div className="wf-project-card-top">
                <span className="wf-project-code">{row.code}</span>
                <Tag color={STATUS_COLOR[row.status]} style={{ margin: 0 }}>
                  {STATUS_LABEL[row.status] || row.status}
                </Tag>
              </div>
              <div className="wf-project-name">{row.name}</div>
              <div className="wf-project-meta">
                {row.customer_name && (
                  <>
                    <Building2 size={12} />
                    <span>{row.customer_name}</span>
                    <span className="wf-project-meta-dot">·</span>
                  </>
                )}
                <span>{row.workflow_name}</span>
              </div>
              <div className="wf-project-track">
                {Array.from({ length: row.stage_count || 0 }).map((_, i) => (
                  <span key={i} className={`wf-project-track-seg ${i < row.stage_done_count ? "wf-project-track-seg-done" : ""}`} />
                ))}
              </div>
              <div className="wf-project-track-text">
                {row.stage_done_count}/{row.stage_count} giai đoạn hoàn thành
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Khoa nut OK trong luc dang tao khach hang moi: neu khong, nguoi dung
          bam OK truoc khi saveCustomer tra ve se gui di gia tri sentinel
          "__new__:<ten>" (server ep ve 0) => du an khong gan duoc khach hang nao. */}
      <Modal
        title="Tạo dự án mới"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={submit}
        okButtonProps={{ disabled: savingCustomer }}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Tên dự án" rules={[{ required: true, message: "Vui lòng nhập tên dự án" }]}>
            <Input placeholder="Ví dụ: Xây dựng Website Bán Hàng Online" />
          </Form.Item>
          <Form.Item name="customer_id" label="Khách hàng / CTY">
            <Select
              showSearch
              placeholder="Chọn hoặc gõ tên khách hàng mới..."
              // Phai trim input truoc khi so khop: label cua option tong hop
              // "+ Tao moi ..." duoc dung tu text DA TRIM, nen neu nguoi dung go
              // co khoang trang o cuoi thi input tho se khong nam trong label va
              // chinh option "+ Tao moi" vua them lai bi loc mat khoi dropdown.
              filterOption={(input, option) => (option?.label ?? "").toLowerCase().includes(input.trim().toLowerCase())}
              onSearch={setCustomerSearch}
              options={[
                ...customers.map((c) => ({ value: c.id, label: c.name })),
                ...(customerSearch.trim() && !customers.some((c) => c.name.toLowerCase() === customerSearch.trim().toLowerCase())
                  ? [{ value: `__new__:${customerSearch.trim()}`, label: `+ Tạo mới "${customerSearch.trim()}"` }]
                  : []),
              ]}
              onChange={async (value) => {
                if (typeof value === "string" && value.startsWith("__new__:")) {
                  const name = value.slice("__new__:".length);
                  setSavingCustomer(true);
                  try {
                    const created = await workflowApi.saveCustomer(name);
                    // created.name la ten CHUAN dang luu trong DB, co the khac
                    // ten vua go (unique key khong phan biet dau/hoa thuong) va
                    // co the la 1 khach hang DA co trong danh sach. Vi vay ghi
                    // de theo id thay vi luon them moi, neu khong danh sach se
                    // co 2 dong cung id.
                    setCustomers((prev) =>
                      prev.some((c) => c.id === created.id)
                        ? prev.map((c) => (c.id === created.id ? created : c))
                        : [...prev, created]
                    );
                    form.setFieldsValue({ customer_id: created.id });
                  } catch (e) {
                    form.setFieldsValue({ customer_id: undefined });
                    message.error(e.message);
                  } finally {
                    setSavingCustomer(false);
                    setCustomerSearch("");
                  }
                } else {
                  // Chon 1 khach hang DA co (hoac xoa lua chon): cung phai xoa
                  // text tim kiem, neu khong no se con lai lam option "+ Tao moi" ma.
                  setCustomerSearch("");
                }
              }}
            />
          </Form.Item>
          <Form.Item name="workflow_id" label="Workflow Template (loại quy trình dự án)" rules={[{ required: true, message: "Vui lòng chọn workflow" }]}>
            <Select
              placeholder="Chọn workflow quy trình mẫu đang kích hoạt"
              options={workflows.map((w) => ({ value: w.id, label: `${w.code} — ${w.name}` }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
