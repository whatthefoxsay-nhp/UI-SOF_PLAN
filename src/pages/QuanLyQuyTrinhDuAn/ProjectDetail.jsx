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
  Segmented,
  message,
  Empty,
  Modal,
  Timeline,
  Tooltip,
} from "antd";
import { ArrowLeft, Lock, Unlock, Plus, History, CheckCircle2, LayoutGrid, Columns3, GripVertical, Calendar } from "lucide-react";
import * as workflowApi from "../../services/workflowApi";
import TaskDrawer from "./TaskDrawer";
import khStyles from "../QuanLyKeHoach/QuanLyKeHoach.module.css";

const PRIORITY_COLOR = { LOW: "default", NORMAL: "blue", HIGH: "orange", URGENT: "red" };

// Cung bo mau + class avatar voi Kanban cua module "Quan ly ke hoach" de 2 noi
// nhin dong bo (dung chung QuanLyKeHoach.module.css thay vi tu ve lai tu dau).
const COLUMN_THEMES = [
  { bg: "rgba(241, 245, 249, 0.55)", border: "rgba(203, 213, 225, 0.5)", text: "#334155", badgeBg: "rgba(203, 213, 225, 0.7)", badgeText: "#1e293b", accent: "#64748b" },
  { bg: "rgba(238, 242, 255, 0.55)", border: "rgba(199, 210, 254, 0.5)", text: "#4f46e5", badgeBg: "rgba(199, 210, 254, 0.7)", badgeText: "#3730a3", accent: "#6366f1" },
  { bg: "rgba(209, 250, 229, 0.45)", border: "rgba(167, 243, 208, 0.5)", text: "#065f46", badgeBg: "rgba(167, 243, 208, 0.7)", badgeText: "#064e3b", accent: "#10b981" },
  { bg: "rgba(254, 243, 199, 0.45)", border: "rgba(253, 230, 138, 0.5)", text: "#92400e", badgeBg: "rgba(253, 230, 138, 0.7)", badgeText: "#78350f", accent: "#f59e0b" },
  { bg: "rgba(252, 231, 243, 0.45)", border: "rgba(251, 207, 232, 0.5)", text: "#9d174d", badgeBg: "rgba(251, 207, 232, 0.7)", badgeText: "#831843", accent: "#ec4899" },
  { bg: "rgba(204, 251, 241, 0.45)", border: "rgba(153, 246, 228, 0.5)", text: "#075985", badgeBg: "rgba(153, 246, 228, 0.7)", badgeText: "#0c4a6e", accent: "#14b8a6" },
  { bg: "rgba(243, 232, 255, 0.45)", border: "rgba(233, 213, 252, 0.5)", text: "#6b21a8", badgeBg: "rgba(233, 213, 252, 0.7)", badgeText: "#581c87", accent: "#a855f7" },
];

const GRADIENT_CLASSES = ["luxuryGradient1", "luxuryGradient2", "luxuryGradient3", "luxuryGradient4", "luxuryGradient5"];

function hashCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

function TaskCard({ task, onClick, showStage }) {
  const isDone = task.status === "DONE";
  const overdue = task.deadline && !isDone && new Date(task.deadline) < new Date();
  const avatarSeed = task.assignee_code || task.department_code || task.code || "?";
  const initials = avatarSeed.slice(0, 2).toUpperCase();
  const gradientClass = khStyles[GRADIENT_CLASSES[hashCode(avatarSeed) % GRADIENT_CLASSES.length]];

  return (
    <div
      className={khStyles.kanbanCard}
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/plain", String(task.id))}
      onClick={onClick}
    >
      <div className={khStyles.kanbanCardInner} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Space size={6}>
            <span className={`${khStyles.detailLink} wf-code`} style={{ fontSize: 12, fontWeight: 700 }}>
              {task.code}
            </span>
            {showStage && task.stage_code && (
              <Tag color="cyan" style={{ fontSize: 10, margin: 0, padding: "0 4px", lineHeight: "16px" }}>
                {task.stage_code}
              </Tag>
            )}
          </Space>
          {task.confirm_total > 0 && (
            <Tag
              color={task.confirm_done === task.confirm_total ? "green" : "gold"}
              style={{ fontSize: 10, margin: 0, padding: "0 4px", lineHeight: "16px" }}
            >
              {task.confirm_done}/{task.confirm_total}
            </Tag>
          )}
        </div>

        <Tag color={PRIORITY_COLOR[task.priority]} style={{ width: "fit-content", fontSize: 10, margin: 0 }}>
          {workflowApi.TASK_PRIORITY_LABELS[task.priority] || task.priority}
        </Tag>

        <div style={{ fontWeight: 700, fontSize: 13.5, color: "#1e293b" }}>{task.name}</div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
          {task.deadline ? (
            <div style={{ display: "flex", alignItems: "center", gap: 4, color: overdue ? "#ff4d4f" : "#94a3b8", fontSize: 10.5 }}>
              <Calendar size={12} />
              <span>{task.deadline}</span>
              {overdue && <span>· Quá hạn</span>}
            </div>
          ) : (
            <span />
          )}
          <div className={`${khStyles.userAvatar} ${gradientClass}`}>{initials}</div>
        </div>
      </div>
    </div>
  );
}

function StagePipeline({ stages, activeStageId, viewMode, onSelect }) {
  return (
    <div className="wf-pipeline">
      {stages.map((stage, idx) => {
        const isDone = stage.status === "DONE";
        const isActive = stage.status === "OPEN";
        const nodeClass = isDone ? "wf-pipeline-node-done" : isActive ? "wf-pipeline-node-active" : "wf-pipeline-node-pending";
        const selected = viewMode === "stage" && activeStageId === stage.id;
        const totalTasks = Object.values(stage.task_counts).reduce((a, b) => a + b, 0);

        return (
          <div className="wf-pipeline-item" key={stage.id}>
            <Tooltip title={`${stage.task_counts.DONE || 0}/${totalTasks} công việc hoàn thành`}>
              <div className={`wf-pipeline-node-wrap ${selected ? "wf-pipeline-selected" : ""}`} onClick={() => onSelect(stage.id)}>
                <div className={`wf-pipeline-node ${nodeClass}`}>
                  {isDone ? <CheckCircle2 size={16} /> : stage.status === "PENDING" ? <Lock size={13} /> : idx + 1}
                </div>
                <div className="wf-pipeline-label">
                  <span className="wf-pipeline-label-code">{stage.code}</span>
                  {stage.name}
                </div>
              </div>
            </Tooltip>
            {idx < stages.length - 1 && <div className={`wf-pipeline-connector ${isDone ? "wf-pipeline-connector-done" : ""}`} />}
          </div>
        );
      })}
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
  const [viewMode, setViewMode] = useState("stage"); // "stage" | "overview"
  const [overviewTasks, setOverviewTasks] = useState(null);
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

  const loadOverview = useCallback(async () => {
    const data = await workflowApi.getKanbanProjectBoard(projectId);
    setOverviewTasks(data.tasks);
  }, [projectId]);

  useEffect(() => {
    loadProject();
    workflowApi.getEmployees().then(setEmployees).catch(() => {});
    workflowApi.getDepartments().then(setDepartments).catch(() => {});
    workflowApi.getMyProfile().then(setProfile).catch(() => {});
  }, [loadProject]);

  useEffect(() => {
    if (viewMode === "stage") loadBoard();
  }, [loadBoard, viewMode]);

  useEffect(() => {
    if (viewMode === "overview") loadOverview();
  }, [loadOverview, viewMode]);

  const refreshAll = async () => {
    await loadProject();
    if (viewMode === "overview") await loadOverview();
    else await loadBoard();
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
        <b className="wf-code">{project.code}</b> — {project.name}
        {project.customer_name && <span> · Khách hàng: {project.customer_name}</span>}
        <span> · Workflow: {project.workflow_name}</span>
        <Tag style={{ marginLeft: 8 }}>{project.status}</Tag>
      </Card>

      <StagePipeline
        stages={project.stages}
        activeStageId={activeStageId}
        viewMode={viewMode}
        onSelect={(id) => {
          setActiveStageId(id);
          setViewMode("stage");
        }}
      />

      <Segmented
        style={{ marginBottom: 16 }}
        value={viewMode}
        onChange={setViewMode}
        options={[
          { label: "Kanban theo giai đoạn", value: "stage", icon: <Columns3 size={13} /> },
          { label: "Kanban tổng thể dự án", value: "overview", icon: <LayoutGrid size={13} /> },
        ]}
      />

      {viewMode === "stage" && activeStage && (
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
              <div className={khStyles.kanbanBoardContainer}>
                <div className={khStyles.kanbanBoard}>
                  {(project.columns || []).map((col, colIdx) => {
                    const theme = COLUMN_THEMES[colIdx % COLUMN_THEMES.length];
                    const colTasks = board.tasks.filter((t) => t.status === col.code);
                    return (
                      <div
                        key={col.code}
                        className={khStyles.kanbanColumn}
                        style={{ backgroundColor: theme.bg, borderColor: theme.border, borderTopColor: theme.accent }}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          const id = e.dataTransfer.getData("text/plain");
                          onDropColumn(id, col.code);
                        }}
                      >
                        <div className={khStyles.kanbanColumnHeader} style={{ borderBottomColor: theme.border }}>
                          <Space size={6}>
                            <div className={khStyles.columnDragHandle} style={{ color: theme.accent, cursor: "default" }}>
                              <GripVertical size={16} />
                            </div>
                            <span style={{ fontWeight: 700, fontSize: 13, color: theme.text, textTransform: "uppercase" }}>{col.label}</span>
                          </Space>
                          <Tag style={{ borderRadius: 10, fontWeight: 700, border: "none", backgroundColor: theme.badgeBg, color: theme.badgeText }}>
                            {colTasks.length}
                          </Tag>
                        </div>
                        <div className={khStyles.columnDropZone}>
                          <div className={khStyles.tasksContainer}>
                            {colTasks.map((t) => (
                              <TaskCard key={t.id} task={t} onClick={() => setActiveTaskId(t.id)} />
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <Empty />
            )}
          </div>
        </div>
      )}

      {viewMode === "overview" && (
        <div>
          {overviewTasks ? (
            <div className={khStyles.kanbanBoardContainer}>
              <div className={khStyles.kanbanBoard}>
                {(project.columns || []).map((col, colIdx) => {
                  const theme = COLUMN_THEMES[colIdx % COLUMN_THEMES.length];
                  const colTasks = overviewTasks.filter((t) => t.status === col.code);
                  return (
                    <div
                      key={col.code}
                      className={khStyles.kanbanColumn}
                      style={{ backgroundColor: theme.bg, borderColor: theme.border, borderTopColor: theme.accent }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        const id = e.dataTransfer.getData("text/plain");
                        onDropColumn(id, col.code);
                      }}
                    >
                      <div className={khStyles.kanbanColumnHeader} style={{ borderBottomColor: theme.border }}>
                        <Space size={6}>
                          <div className={khStyles.columnDragHandle} style={{ color: theme.accent, cursor: "default" }}>
                            <GripVertical size={16} />
                          </div>
                          <span style={{ fontWeight: 700, fontSize: 13, color: theme.text, textTransform: "uppercase" }}>{col.label}</span>
                        </Space>
                        <Tag style={{ borderRadius: 10, fontWeight: 700, border: "none", backgroundColor: theme.badgeBg, color: theme.badgeText }}>
                          {colTasks.length}
                        </Tag>
                      </div>
                      <div className={khStyles.columnDropZone}>
                        <div className={khStyles.tasksContainer}>
                          {colTasks.map((t) => (
                            <TaskCard key={t.id} task={t} showStage onClick={() => setActiveTaskId(t.id)} />
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <Empty />
          )}
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
