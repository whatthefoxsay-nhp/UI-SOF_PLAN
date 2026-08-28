import React, { useEffect, useState, useCallback } from "react";
import {
  Card,
  Button,
  Tag,
  Space,
  Drawer,
  Form,
  Input,
  Select,
  message,
  Empty,
  Modal,
  Timeline,
  Tooltip,
} from "antd";
import { ArrowLeft, Lock, Unlock, Plus, History, CheckCircle2 } from "lucide-react";
import * as workflowApi from "../../services/workflowApi";
import TaskDrawer from "./TaskDrawer";

const COLUMNS = [
  { key: "TODO", label: "Cần làm" },
  { key: "IN_PROGRESS", label: "Đang làm" },
  { key: "WAITING", label: "Chờ xử lý" },
  { key: "DONE", label: "Hoàn thành" },
];

const PRIORITY_COLOR = { LOW: "default", NORMAL: "blue", HIGH: "orange", URGENT: "red" };

function TaskCard({ task, onClick }) {
  const overdue = task.deadline && task.status !== "DONE" && new Date(task.deadline) < new Date();
  return (
    <div
      className="wf-task-card"
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/plain", String(task.id))}
      onClick={onClick}
    >
      <div style={{ fontWeight: 600 }}>{task.code}</div>
      <div>{task.name}</div>
      <Space size={4} wrap style={{ marginTop: 4 }}>
        <Tag color={PRIORITY_COLOR[task.priority]}>{workflowApi.TASK_PRIORITY_LABELS[task.priority] || task.priority}</Tag>
        {task.confirm_total > 0 && (
          <Tag color={task.confirm_done === task.confirm_total ? "green" : "gold"}>
            Xác nhận {task.confirm_done}/{task.confirm_total}
          </Tag>
        )}
        {overdue && <Tag color="red">Quá hạn</Tag>}
      </Space>
      {task.deadline && <div style={{ fontSize: 12, opacity: 0.65 }}>Hạn: {task.deadline}</div>}
    </div>
  );
}

function StageExtraPanel({ stage, profile, onSaved }) {
  const [form] = Form.useForm();
  const [reasonOpen, setReasonOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pendingRequests, setPendingRequests] = useState([]);

  useEffect(() => {
    form.setFieldsValue(stage.extra_data || {});
    workflowApi.listLockRequests(stage.id).then((rows) => setPendingRequests((rows || []).filter((r) => r.status === "PENDING")));
  }, [stage, form]);

  if (!["CONTRACT", "EXECUTION", "PAYMENT"].includes(stage.stage_type)) return null;

  const save = async (lockNow = false) => {
    const values = form.getFieldsValue();
    try {
      const data = await workflowApi.saveStageExtra(stage.id, values, lockNow);
      message.success(lockNow ? "Đã chốt và LOCK dữ liệu" : "Đã lưu");
      onSaved(data);
    } catch (e) {
      message.error(e.message);
    }
  };

  const submitUnlockRequest = async () => {
    try {
      await workflowApi.requestUnlock(stage.id, reason);
      message.success("Đã gửi yêu cầu mở khóa");
      setReasonOpen(false);
      setReason("");
      const rows = await workflowApi.listLockRequests(stage.id);
      setPendingRequests(rows.filter((r) => r.status === "PENDING"));
    } catch (e) {
      message.error(e.message);
    }
  };

  const decide = async (id, approve) => {
    try {
      await workflowApi.decideLockRequest(id, approve);
      message.success(approve ? "Đã duyệt mở khóa" : "Đã từ chối");
      const rows = await workflowApi.listLockRequests(stage.id);
      setPendingRequests(rows.filter((r) => r.status === "PENDING"));
      const fresh = await workflowApi.getProject(stage.project_id);
      const freshStage = fresh.stages.find((s) => s.id === stage.id);
      onSaved(freshStage);
    } catch (e) {
      message.error(e.message);
    }
  };

  const locked = !!stage.is_locked;
  const isContract = stage.stage_type === "CONTRACT";
  const isPayment = stage.stage_type === "PAYMENT";
  const isExecution = stage.stage_type === "EXECUTION";
  const canEdit = !!profile && (profile.is_admin || (stage.departments || []).includes(profile.department_code));
  const canApprove = !!profile && profile.is_admin;

  return (
    <Card
      size="small"
      title={
        isContract ? "Hợp đồng & lợi nhuận" : isPayment ? "Theo dõi thu tiền" : "Phân bổ ngày công"
      }
      extra={
        stage.lock_enabled ? (
          locked ? (
            <Tag color="red" icon={<Lock size={12} />}>
              Đã LOCK
            </Tag>
          ) : (
            <Tag color="green" icon={<Unlock size={12} />}>
              Đang mở
            </Tag>
          )
        ) : null
      }
      style={{ marginBottom: 12 }}
    >
      <Form form={form} layout="vertical" disabled={locked || !canEdit}>
        {isContract && (
          <>
            <Form.Item name="gia_ban" label="Giá bán (VNĐ)"><Input type="number" /></Form.Item>
            <Form.Item name="chi_phi_du_kien" label="Chi phí dự kiến (VNĐ)"><Input type="number" /></Form.Item>
            <Form.Item name="chi_phi_nhan_su" label="Chi phí nhân sự (VNĐ)"><Input type="number" /></Form.Item>
            <Form.Item name="so_ngay_cong" label="Số ngày công"><Input type="number" /></Form.Item>
            <Form.Item name="chi_phi_khac" label="Chi phí khác (VNĐ)"><Input type="number" /></Form.Item>
            <Form.Item name="hop_dong" label="Số hợp đồng"><Input /></Form.Item>
          </>
        )}
        {isExecution && (
          <>
            <Form.Item name="tong_ngay_cong_ke_hoach" label="Kế hoạch (ngày công)"><Input type="number" /></Form.Item>
            <Form.Item name="tong_ngay_cong_da_dung" label="Đã sử dụng (ngày công)"><Input type="number" /></Form.Item>
          </>
        )}
        {isPayment && (
          <>
            <Form.Item name="gia_tri_hop_dong" label="Giá trị hợp đồng (VNĐ)"><Input type="number" /></Form.Item>
            <Form.Item name="da_thu" label="Đã thu (VNĐ)"><Input type="number" /></Form.Item>
            <Form.Item name="con_phai_thu" label="Còn phải thu (VNĐ)"><Input type="number" /></Form.Item>
          </>
        )}
        {!locked ? (
          canEdit && (
            <Space>
              <Button size="small" onClick={() => save(false)}>
                Lưu
              </Button>
              {stage.lock_enabled && (
                <Button size="small" type="primary" icon={<Lock size={13} />} onClick={() => save(true)}>
                  Chốt & LOCK
                </Button>
              )}
            </Space>
          )
        ) : (
          <Space direction="vertical" style={{ width: "100%" }}>
            {pendingRequests.length === 0 ? (
              canEdit && (
                <Button size="small" onClick={() => setReasonOpen(true)}>
                  Yêu cầu mở khóa
                </Button>
              )
            ) : (
              pendingRequests.map((r) =>
                canApprove && r.requested_by !== profile?.code ? (
                  <Card key={r.id} size="small" type="inner" title={`Yêu cầu #${r.id} bởi ${r.requested_by}`}>
                    <div style={{ marginBottom: 8 }}>{r.reason}</div>
                    <Space>
                      <Button size="small" type="primary" onClick={() => decide(r.id, true)}>
                        Duyệt mở khóa
                      </Button>
                      <Button size="small" danger onClick={() => decide(r.id, false)}>
                        Từ chối
                      </Button>
                    </Space>
                  </Card>
                ) : (
                  <Tag key={r.id} color="gold">
                    Yêu cầu #{r.id} bởi {r.requested_by} đang chờ quản trị viên khác duyệt
                  </Tag>
                ),
              )
            )}
          </Space>
        )}
      </Form>

      <Modal title="Yêu cầu mở khóa" open={reasonOpen} onCancel={() => setReasonOpen(false)} onOk={submitUnlockRequest}>
        <Input.TextArea rows={3} placeholder="Lý do cần mở khóa" value={reason} onChange={(e) => setReason(e.target.value)} />
      </Modal>
    </Card>
  );
}

export default function ProjectDetail({ projectId, onBack }) {
  const [project, setProject] = useState(null);
  const [activeStageId, setActiveStageId] = useState(null);
  const [board, setBoard] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [activeTaskId, setActiveTaskId] = useState(null);
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [addTaskForm] = Form.useForm();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState([]);
  const [profile, setProfile] = useState(null);

  const loadProject = useCallback(async () => {
    const data = await workflowApi.getProject(projectId);
    setProject(data);
    setActiveStageId((prev) => prev || data.current_stage_id || data.stages[0]?.id);
  }, [projectId]);

  const loadBoard = useCallback(async () => {
    if (!activeStageId) return;
    const data = await workflowApi.getKanbanBoard(activeStageId);
    setBoard(data);
  }, [activeStageId]);

  useEffect(() => {
    loadProject();
    workflowApi.getEmployees().then(setEmployees).catch(() => {});
    workflowApi.getDepartments().then(setDepartments).catch(() => {});
    workflowApi.getMyProfile().then(setProfile).catch(() => {});
  }, [loadProject]);

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  const refreshAll = async () => {
    await loadProject();
    await loadBoard();
  };

  const onDropColumn = async (taskId, status) => {
    if (!taskId) return;
    try {
      await workflowApi.updateTaskStatus(taskId, status);
      await refreshAll();
    } catch (e) {
      message.error(e.message);
    }
  };

  const openAddTask = () => {
    addTaskForm.resetFields();
    setAddTaskOpen(true);
  };

  const submitAddTask = async () => {
    const values = await addTaskForm.validateFields();
    try {
      await workflowApi.saveTask({ project_stage_id: activeStageId, ...values });
      message.success("Đã thêm công việc phát sinh");
      setAddTaskOpen(false);
      await refreshAll();
    } catch (e) {
      message.error(e.message);
    }
  };

  const openHistory = async () => {
    const rows = await workflowApi.listHistory(projectId, 200);
    setHistory(rows || []);
    setHistoryOpen(true);
  };

  if (!project) return null;

  const activeStage = project.stages.find((s) => s.id === activeStageId);

  return (
    <div>
      <Space style={{ marginBottom: 12 }}>
        <Button icon={<ArrowLeft size={14} />} onClick={onBack}>
          Quay lại danh sách
        </Button>
        <Button icon={<History size={14} />} onClick={openHistory}>
          Lịch sử hoạt động
        </Button>
        {profile && (
          <Tag color={profile.is_admin ? "gold" : "default"}>
            {profile.name} ({departments.find((d) => d.code === profile.department_code)?.name || profile.department_code || "—"})
            {profile.is_admin ? " · Quản trị viên" : ""}
          </Tag>
        )}
      </Space>

      <Card size="small" style={{ marginBottom: 12 }}>
        <b>{project.code}</b> — {project.name}
        {project.customer_name && <span> · Khách hàng: {project.customer_name}</span>}
        <span> · Workflow: {project.workflow_name}</span>
        <Tag style={{ marginLeft: 8 }}>{project.status}</Tag>
      </Card>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {project.stages.map((stage) => (
          <Tooltip key={stage.id} title={`${stage.task_counts.DONE}/${Object.values(stage.task_counts).reduce((a, b) => a + b, 0)} công việc hoàn thành`}>
            <div
              onClick={() => setActiveStageId(stage.id)}
              className={`wf-stage-chip wf-stage-${stage.status.toLowerCase()} ${activeStageId === stage.id ? "wf-stage-active" : ""}`}
            >
              {stage.status === "DONE" && <CheckCircle2 size={13} />}
              {stage.status === "PENDING" && <Lock size={13} />}
              {stage.code} · {stage.name}
            </div>
          </Tooltip>
        ))}
      </div>

      {activeStage && (
        <div style={{ display: "flex", gap: 16 }}>
          <div style={{ flex: "0 0 320px" }}>
            <StageExtraPanel
              stage={{ ...activeStage, project_id: project.id }}
              profile={profile}
              onSaved={(updated) => {
                setProject((p) => ({
                  ...p,
                  stages: p.stages.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)),
                }));
              }}
            />
            <Card size="small" title="Phòng ban tham gia">
              {activeStage.departments.map((d) => (
                <Tag key={d}>{departments.find((x) => x.code === d)?.name || d}</Tag>
              ))}
            </Card>
          </div>

          <div style={{ flex: 1 }}>
            <Space style={{ marginBottom: 8 }}>
              <Button size="small" icon={<Plus size={13} />} onClick={openAddTask}>
                Thêm công việc phát sinh
              </Button>
            </Space>
            {board ? (
              <div style={{ display: "flex", gap: 12 }}>
                {COLUMNS.map((col) => (
                  <div
                    key={col.key}
                    className="wf-kanban-column"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      const id = e.dataTransfer.getData("text/plain");
                      onDropColumn(id, col.key);
                    }}
                  >
                    <div className="wf-kanban-column-title">
                      {col.label} ({board.tasks.filter((t) => t.status === col.key).length})
                    </div>
                    {board.tasks
                      .filter((t) => t.status === col.key)
                      .map((t) => (
                        <TaskCard key={t.id} task={t} onClick={() => setActiveTaskId(t.id)} />
                      ))}
                  </div>
                ))}
              </div>
            ) : (
              <Empty />
            )}
          </div>
        </div>
      )}

      <TaskDrawer
        taskId={activeTaskId}
        employees={employees}
        departments={departments}
        profile={profile}
        onClose={() => setActiveTaskId(null)}
        onChanged={refreshAll}
      />

      <Modal title="Thêm công việc phát sinh" open={addTaskOpen} onCancel={() => setAddTaskOpen(false)} onOk={submitAddTask} destroyOnClose>
        <Form form={addTaskForm} layout="vertical">
          <Form.Item name="name" label="Tên công việc" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="department_code" label="Phòng ban">
            <Select options={departments.map((d) => ({ value: d.code, label: d.name }))} />
          </Form.Item>
          <Form.Item name="priority" label="Độ ưu tiên" initialValue="NORMAL">
            <Select
              options={[
                { value: "LOW", label: "Thấp" },
                { value: "NORMAL", label: "Bình thường" },
                { value: "HIGH", label: "Cao" },
                { value: "URGENT", label: "Khẩn cấp" },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer title="Lịch sử hoạt động" open={historyOpen} onClose={() => setHistoryOpen(false)} width={420}>
        <Timeline
          items={history.map((h) => ({
            children: (
              <div>
                <b>{h.actor_code}</b> — {h.action} <span style={{ opacity: 0.6 }}>({h.entity_type} #{h.entity_id})</span>
                <div style={{ fontSize: 12, opacity: 0.65 }}>{h.created_at}</div>
                {h.detail && <div style={{ fontSize: 12 }}>{h.detail}</div>}
              </div>
            ),
          }))}
        />
        {history.length === 0 && <Empty description="Chưa có hoạt động" />}
      </Drawer>
    </div>
  );
}
