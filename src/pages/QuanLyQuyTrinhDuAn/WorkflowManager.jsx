import React, { useEffect, useState, useCallback } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  Space,
  Tag,
  Empty,
  message,
  Popconfirm,
  Card,
  Collapse,
  InputNumber,
} from "antd";
import { Plus, Copy, Trash2, GripVertical, Pencil, Save } from "lucide-react";
import * as workflowApi from "../../services/workflowApi";

const STAGE_TYPES = [
  { value: "GENERIC", label: "Thông thường" },
  { value: "CONTRACT", label: "Hợp đồng & lợi nhuận" },
  { value: "EXECUTION", label: "Thực thi lập trình" },
  { value: "TESTER", label: "Tester" },
  { value: "HANDOVER", label: "Bàn giao" },
  { value: "PAYMENT", label: "Thu tiền" },
  { value: "MAINTENANCE", label: "Bảo trì" },
];

const COMPLETION_CONDITIONS = [
  { value: "ALL_TASKS_DONE", label: "Tất cả công việc DONE" },
  { value: "MANUAL", label: "Đóng thủ công" },
];

export default function WorkflowManager() {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null); // full workflow detail
  const [departments, setDepartments] = useState([]);
  const [profile, setProfile] = useState(null);
  const isAdmin = !!profile?.is_admin;

  const [wfModalOpen, setWfModalOpen] = useState(false);
  const [wfForm] = Form.useForm();
  const [cloneTarget, setCloneTarget] = useState(null);
  const [cloneCode, setCloneCode] = useState("");

  const [stageModalOpen, setStageModalOpen] = useState(false);
  const [stageForm] = Form.useForm();
  const [editingStage, setEditingStage] = useState(null);

  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskForm] = Form.useForm();
  const [editingTask, setEditingTask] = useState(null);
  const [taskStageId, setTaskStageId] = useState(null);

  const [dragStageId, setDragStageId] = useState(null);

  const [kanbanCols, setKanbanCols] = useState([]);
  const [savingCols, setSavingCols] = useState(false);

  useEffect(() => {
    setKanbanCols(selected?.columns || []);
  }, [selected]);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const data = await workflowApi.listWorkflows();
      setWorkflows(data || []);
    } catch (e) {
      message.error(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDetail = useCallback(async (id) => {
    try {
      const data = await workflowApi.getWorkflow(id);
      setSelected(data);
    } catch (e) {
      message.error(e.message);
    }
  }, []);

  useEffect(() => {
    loadList();
    workflowApi.getDepartments().then(setDepartments).catch(() => {});
    workflowApi.getMyProfile().then(setProfile).catch(() => {});
  }, [loadList]);

  const openCreateWorkflow = () => {
    wfForm.resetFields();
    setWfModalOpen(true);
  };

  const submitWorkflow = async () => {
    const values = await wfForm.validateFields();
    try {
      await workflowApi.saveWorkflow(values);
      message.success("Đã lưu workflow");
      setWfModalOpen(false);
      loadList();
    } catch (e) {
      message.error(e.message);
    }
  };

  const doToggle = async (row) => {
    try {
      await workflowApi.toggleWorkflow(row.id, !row.is_active);
      loadList();
    } catch (e) {
      message.error(e.message);
    }
  };

  const doDelete = async (row) => {
    try {
      await workflowApi.deleteWorkflow(row.id);
      message.success("Đã xóa");
      loadList();
      if (selected?.id === row.id) setSelected(null);
    } catch (e) {
      message.error(e.message);
    }
  };

  const doClone = async () => {
    try {
      await workflowApi.cloneWorkflow(cloneTarget.id, cloneCode);
      message.success("Đã nhân bản workflow");
      setCloneTarget(null);
      setCloneCode("");
      loadList();
    } catch (e) {
      message.error(e.message);
    }
  };

  // ---- Stage ----
  const openCreateStage = () => {
    setEditingStage(null);
    stageForm.resetFields();
    stageForm.setFieldsValue({
      is_required: true,
      is_parallel: false,
      completion_condition: "ALL_TASKS_DONE",
      lock_enabled: false,
      stage_type: "GENERIC",
      departments: [],
    });
    setStageModalOpen(true);
  };

  const openEditStage = (stage) => {
    setEditingStage(stage);
    stageForm.setFieldsValue({
      code: stage.code,
      name: stage.name,
      is_required: !!stage.is_required,
      is_parallel: !!stage.is_parallel,
      completion_condition: stage.completion_condition,
      lock_enabled: !!stage.lock_enabled,
      stage_type: stage.stage_type,
      departments: stage.departments,
    });
    setStageModalOpen(true);
  };

  const submitStage = async () => {
    const values = await stageForm.validateFields();
    try {
      const data = await workflowApi.saveStage({
        id: editingStage?.id,
        workflow_id: selected.id,
        ...values,
      });
      message.success("Đã lưu giai đoạn");
      setStageModalOpen(false);
      setSelected(data);
    } catch (e) {
      message.error(e.message);
    }
  };

  const doDeleteStage = async (stage) => {
    try {
      const data = await workflowApi.deleteStage(stage.id, selected.id);
      message.success("Đã xóa giai đoạn");
      setSelected(data);
    } catch (e) {
      message.error(e.message);
    }
  };

  const onDropStage = async (targetStage) => {
    if (!dragStageId || dragStageId === targetStage.id) return;
    const ids = selected.stages.map((s) => s.id);
    const fromIdx = ids.indexOf(dragStageId);
    const toIdx = ids.indexOf(targetStage.id);
    ids.splice(toIdx, 0, ids.splice(fromIdx, 1)[0]);
    try {
      const data = await workflowApi.reorderStages(selected.id, ids);
      setSelected(data);
    } catch (e) {
      message.error(e.message);
    }
    setDragStageId(null);
  };

  // ---- Task template ----
  const openCreateTask = (stageId) => {
    setEditingTask(null);
    setTaskStageId(stageId);
    taskForm.resetFields();
    taskForm.setFieldsValue({ default_priority: "NORMAL", confirm_departments: [] });
    setTaskModalOpen(true);
  };

  const openEditTask = (stageId, task) => {
    setEditingTask(task);
    setTaskStageId(stageId);
    taskForm.setFieldsValue({
      name: task.name,
      department_code: task.department_code,
      default_priority: task.default_priority,
      deadline_offset_days: task.deadline_offset_days,
      confirm_departments: task.confirm_departments,
    });
    setTaskModalOpen(true);
  };

  const submitTask = async () => {
    const values = await taskForm.validateFields();
    try {
      const data = await workflowApi.saveTaskTemplate({
        id: editingTask?.id,
        stage_id: taskStageId,
        ...values,
      });
      message.success("Đã lưu công việc mẫu");
      setTaskModalOpen(false);
      setSelected(data);
    } catch (e) {
      message.error(e.message);
    }
  };

  const doDeleteTask = async (task) => {
    try {
      const data = await workflowApi.deleteTaskTemplate(task.id, selected.id);
      message.success("Đã xóa công việc mẫu");
      setSelected(data);
    } catch (e) {
      message.error(e.message);
    }
  };

  // ---- Cot Kanban (dong, tuy chinh theo tung Workflow) ----
  const updateKanbanCol = (idx, patch) => {
    setKanbanCols((cols) => cols.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  };

  const addKanbanCol = () => {
    setKanbanCols((cols) => {
      const doneIdx = cols.findIndex((c) => c.code === "DONE");
      const newCol = { code: "", label: "", color: "default" };
      const insertAt = doneIdx >= 0 ? doneIdx : cols.length;
      return [...cols.slice(0, insertAt), newCol, ...cols.slice(insertAt)];
    });
  };

  const removeKanbanCol = (idx) => {
    setKanbanCols((cols) => cols.filter((_, i) => i !== idx));
  };

  const saveKanbanCols = async () => {
    for (const c of kanbanCols) {
      if (!c.code.trim() || !c.label.trim()) {
        message.error("Mỗi cột cần có mã và tên hiển thị");
        return;
      }
    }
    setSavingCols(true);
    try {
      const data = await workflowApi.saveKanbanColumns(selected.id, kanbanCols);
      message.success("Đã lưu cột Kanban");
      setKanbanCols(data);
      setSelected((prev) => ({ ...prev, columns: data }));
    } catch (e) {
      message.error(e.message);
    } finally {
      setSavingCols(false);
    }
  };

  const columns = [
    { title: "Mã", dataIndex: "code", width: 140 },
    { title: "Tên workflow", dataIndex: "name" },
    { title: "Loại dự án", dataIndex: "project_type", width: 160 },
    { title: "Số giai đoạn", dataIndex: "stage_count", width: 110, align: "center" },
    { title: "Số dự án dùng", dataIndex: "project_count", width: 120, align: "center" },
    {
      title: "Kích hoạt",
      dataIndex: "is_active",
      width: 100,
      render: (v, row) =>
        isAdmin ? (
          <Switch checked={!!v} onChange={() => doToggle(row)} onClick={(e) => e?.stopPropagation?.()} />
        ) : (
          <Tag color={v ? "green" : "default"}>{v ? "Đang dùng" : "Ngừng"}</Tag>
        ),
    },
    ...(isAdmin
      ? [
          {
            title: "Thao tác",
            width: 160,
            render: (_, row) => (
              <Space onClick={(e) => e.stopPropagation()}>
                <Button size="small" icon={<Copy size={14} />} onClick={() => setCloneTarget(row)}>
                  Nhân bản
                </Button>
                <Popconfirm title="Xóa workflow này?" onConfirm={() => doDelete(row)}>
                  <Button size="small" danger icon={<Trash2 size={14} />} />
                </Popconfirm>
              </Space>
            ),
          },
        ]
      : []),
  ];

  const departmentName = (code) => departments.find((d) => d.code === code)?.name || code;

  return (
    <div style={{ display: "flex", gap: 16 }}>
      <div style={{ flex: selected ? "0 0 40%" : "1 1 100%", minWidth: 0 }}>
        {isAdmin ? (
          <Space style={{ marginBottom: 12 }}>
            <Button type="primary" icon={<Plus size={14} />} onClick={openCreateWorkflow}>
              Tạo Workflow
            </Button>
          </Space>
        ) : (
          <div style={{ marginBottom: 12, color: "#999", fontSize: 12 }}>
            Bạn đang xem ở chế độ chỉ đọc — chỉ quản trị viên mới cấu hình được Workflow.
          </div>
        )}
        <Table
          rowKey="id"
          size="small"
          loading={loading}
          dataSource={workflows}
          columns={columns}
          scroll={selected ? { x: "max-content" } : undefined}
          onRow={(row) => ({ onClick: () => loadDetail(row.id), style: { cursor: "pointer" } })}
          rowClassName={(row) => (selected?.id === row.id ? "wf-row-selected" : "")}
        />
      </div>

      {selected && (
        <div style={{ flex: "1 1 60%", minWidth: 0 }}>
          {isAdmin && (
            <Card size="small" title="Cột Kanban của Workflow này" style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: "#999", marginBottom: 8 }}>
                Tùy chỉnh cột Kanban cho dự án tạo từ workflow này (thêm/bớt/đổi tên tùy ý). Cột mã "DONE" bắt buộc phải có, không thể xóa.
              </div>
              <Space direction="vertical" style={{ width: "100%" }}>
                {kanbanCols.map((col, idx) => (
                  <Space key={idx} wrap>
                    <Input
                      placeholder="Mã (VD: REVIEW)"
                      value={col.code}
                      disabled={col.code === "DONE"}
                      style={{ width: 130 }}
                      onChange={(e) => updateKanbanCol(idx, { code: e.target.value.toUpperCase() })}
                    />
                    <Input
                      placeholder="Tên hiển thị"
                      value={col.label}
                      style={{ width: 140 }}
                      onChange={(e) => updateKanbanCol(idx, { label: e.target.value })}
                    />
                    <Select
                      value={col.color}
                      style={{ width: 100 }}
                      options={["default", "blue", "purple", "orange", "gold", "green", "red", "cyan"].map((c) => ({ value: c, label: c }))}
                      onChange={(v) => updateKanbanCol(idx, { color: v })}
                    />
                    <Button size="small" danger disabled={col.code === "DONE"} icon={<Trash2 size={13} />} onClick={() => removeKanbanCol(idx)} />
                  </Space>
                ))}
                <Space>
                  <Button size="small" icon={<Plus size={13} />} onClick={addKanbanCol}>
                    Thêm cột
                  </Button>
                  <Button size="small" type="primary" icon={<Save size={13} />} loading={savingCols} onClick={saveKanbanCols}>
                    Lưu cột Kanban
                  </Button>
                </Space>
              </Space>
            </Card>
          )}
          <Card
            size="small"
            title={`${selected.code} — ${selected.name}`}
            extra={
              isAdmin && (
                <Button size="small" icon={<Plus size={14} />} onClick={openCreateStage}>
                  Thêm giai đoạn
                </Button>
              )
            }
          >
            {selected.stages.length === 0 && <Empty description="Chưa có giai đoạn nào" />}
            <Collapse
              items={selected.stages.map((stage) => ({
                key: stage.id,
                label: (
                  <div
                    draggable
                    onDragStart={() => setDragStageId(stage.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => onDropStage(stage)}
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <GripVertical size={14} style={{ cursor: "grab", opacity: 0.5 }} />
                    <b>{stage.code}</b> — {stage.name}
                    <Tag color="blue">{STAGE_TYPES.find((t) => t.value === stage.stage_type)?.label}</Tag>
                    {!!stage.lock_enabled && <Tag color="orange">LOCK</Tag>}
                    {!stage.is_required && <Tag>Không bắt buộc</Tag>}
                    {stage.departments.map((d) => (
                      <Tag key={d}>{departmentName(d)}</Tag>
                    ))}
                  </div>
                ),
                extra: isAdmin && (
                  <Space onClick={(e) => e.stopPropagation()}>
                    <Button size="small" icon={<Pencil size={13} />} onClick={() => openEditStage(stage)} />
                    <Popconfirm title="Xóa giai đoạn này?" onConfirm={() => doDeleteStage(stage)}>
                      <Button size="small" danger icon={<Trash2 size={13} />} />
                    </Popconfirm>
                  </Space>
                ),
                children: (
                  <div>
                    {isAdmin && (
                      <Space style={{ marginBottom: 8 }}>
                        <Button size="small" icon={<Plus size={13} />} onClick={() => openCreateTask(stage.id)}>
                          Thêm công việc mẫu
                        </Button>
                      </Space>
                    )}
                    <Table
                      size="small"
                      rowKey="id"
                      pagination={false}
                      dataSource={stage.tasks}
                      columns={[
                        { title: "Tên công việc", dataIndex: "name" },
                        { title: "Phòng ban", dataIndex: "department_code", render: departmentName, width: 140 },
                        { title: "Ưu tiên", dataIndex: "default_priority", width: 100 },
                        { title: "Deadline (+ngày)", dataIndex: "deadline_offset_days", width: 120 },
                        {
                          title: "Cần xác nhận",
                          dataIndex: "confirm_departments",
                          render: (arr) => arr.map((d) => <Tag key={d}>{departmentName(d)}</Tag>),
                        },
                        ...(isAdmin
                          ? [
                              {
                                title: "",
                                width: 90,
                                render: (_, task) => (
                                  <Space>
                                    <Button size="small" icon={<Pencil size={12} />} onClick={() => openEditTask(stage.id, task)} />
                                    <Popconfirm title="Xóa?" onConfirm={() => doDeleteTask(task)}>
                                      <Button size="small" danger icon={<Trash2 size={12} />} />
                                    </Popconfirm>
                                  </Space>
                                ),
                              },
                            ]
                          : []),
                      ]}
                    />
                  </div>
                ),
              }))}
            />
          </Card>
        </div>
      )}

      <Modal title="Workflow" open={wfModalOpen} onCancel={() => setWfModalOpen(false)} onOk={submitWorkflow} destroyOnClose>
        <Form form={wfForm} layout="vertical">
          <Form.Item name="code" label="Mã workflow" rules={[{ required: true }]}>
            <Input placeholder="VD: WF-SW-002" />
          </Form.Item>
          <Form.Item name="name" label="Tên workflow" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="project_type" label="Loại dự án">
            <Input placeholder="VD: Phần mềm, Kho vận..." />
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`Nhân bản workflow: ${cloneTarget?.name || ""}`}
        open={!!cloneTarget}
        onCancel={() => setCloneTarget(null)}
        onOk={doClone}
        okButtonProps={{ disabled: !cloneCode }}
      >
        <Input placeholder="Mã workflow mới" value={cloneCode} onChange={(e) => setCloneCode(e.target.value)} />
      </Modal>

      <Modal
        title={editingStage ? "Sửa giai đoạn" : "Thêm giai đoạn"}
        open={stageModalOpen}
        onCancel={() => setStageModalOpen(false)}
        onOk={submitStage}
        destroyOnClose
      >
        <Form form={stageForm} layout="vertical">
          <Form.Item name="code" label="Mã giai đoạn" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="name" label="Tên giai đoạn" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="stage_type" label="Loại giai đoạn (quyết định panel dữ liệu riêng)">
            <Select options={STAGE_TYPES} />
          </Form.Item>
          <Form.Item name="departments" label="Phòng ban tham gia">
            <Select mode="multiple" options={departments.map((d) => ({ value: d.code, label: d.name }))} />
          </Form.Item>
          <Form.Item name="completion_condition" label="Điều kiện hoàn thành">
            <Select options={COMPLETION_CONDITIONS} />
          </Form.Item>
          <Space>
            <Form.Item name="is_required" label="Bắt buộc" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item name="is_parallel" label="Song song" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item name="lock_enabled" label="Cho phép LOCK dữ liệu" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Space>
        </Form>
      </Modal>

      <Modal
        title={editingTask ? "Sửa công việc mẫu" : "Thêm công việc mẫu"}
        open={taskModalOpen}
        onCancel={() => setTaskModalOpen(false)}
        onOk={submitTask}
        destroyOnClose
      >
        <Form form={taskForm} layout="vertical">
          <Form.Item name="name" label="Tên công việc" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="department_code" label="Phòng ban thực hiện" rules={[{ required: true }]}>
            <Select options={departments.map((d) => ({ value: d.code, label: d.name }))} />
          </Form.Item>
          <Form.Item name="default_priority" label="Độ ưu tiên">
            <Select
              options={[
                { value: "LOW", label: "Thấp" },
                { value: "NORMAL", label: "Bình thường" },
                { value: "HIGH", label: "Cao" },
                { value: "URGENT", label: "Khẩn cấp" },
              ]}
            />
          </Form.Item>
          <Form.Item name="deadline_offset_days" label="Deadline (số ngày sau khi giai đoạn mở)">
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="confirm_departments" label="Phòng ban cần xác nhận (để trống nếu không cần)">
            <Select mode="multiple" options={departments.map((d) => ({ value: d.code, label: d.name }))} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
