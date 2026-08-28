import React, { useEffect, useState, useCallback } from "react";
import { Table, Button, Modal, Form, Input, Select, Tag, Progress, Space, message } from "antd";
import { Plus } from "lucide-react";
import * as workflowApi from "../../services/workflowApi";

const STATUS_COLOR = { IN_PROGRESS: "processing", DONE: "success", CANCELLED: "default" };
const STATUS_LABEL = { IN_PROGRESS: "Đang thực hiện", DONE: "Hoàn thành", CANCELLED: "Đã hủy" };

export default function ProjectList({ onOpenProject }) {
  const [projects, setProjects] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, w] = await Promise.all([workflowApi.listProjects(), workflowApi.listWorkflows()]);
      setProjects(p || []);
      setWorkflows((w || []).filter((x) => x.is_active));
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

  const columns = [
    { title: "Mã dự án", dataIndex: "code", width: 130 },
    { title: "Tên dự án", dataIndex: "name" },
    { title: "Khách hàng", dataIndex: "customer_name", width: 180 },
    { title: "Workflow", dataIndex: "workflow_name", width: 200 },
    {
      title: "Tiến độ giai đoạn",
      width: 220,
      render: (_, row) => (
        <Progress percent={row.stage_count ? Math.round((row.stage_done_count / row.stage_count) * 100) : 0} size="small" format={() => `${row.stage_done_count}/${row.stage_count}`} />
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      width: 140,
      render: (v) => <Tag color={STATUS_COLOR[v]}>{STATUS_LABEL[v] || v}</Tag>,
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 12 }}>
        <Button type="primary" icon={<Plus size={14} />} onClick={openCreate}>
          Tạo dự án
        </Button>
      </Space>
      <Table
        rowKey="id"
        size="small"
        loading={loading}
        dataSource={projects}
        columns={columns}
        onRow={(row) => ({ onClick: () => onOpenProject(row.id), style: { cursor: "pointer" } })}
      />

      <Modal title="Tạo dự án mới" open={modalOpen} onCancel={() => setModalOpen(false)} onOk={submit} destroyOnClose>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Tên dự án" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="customer_name" label="Khách hàng">
            <Input />
          </Form.Item>
          <Form.Item name="workflow_id" label="Workflow (loại dự án)" rules={[{ required: true }]}>
            <Select
              placeholder="Chọn workflow đang kích hoạt"
              options={workflows.map((w) => ({ value: w.id, label: `${w.code} — ${w.name}` }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
