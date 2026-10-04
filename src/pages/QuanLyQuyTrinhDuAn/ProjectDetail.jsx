import React, { useEffect, useState, useCallback, useRef } from "react";
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
  Progress,
} from "antd";
import { ArrowLeft, Lock, Unlock, Plus, History, CheckCircle2, LayoutGrid, Columns3, GripVertical, Calendar, GitBranch, ChevronLeft, ChevronRight } from "lucide-react";
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

// Bao ngoai kanbanBoardContainer bang 2 nut mui ten luon hien ro khi con noi
// dung de cuon - khong phu thuoc trinh duyet co quyet dinh ve thanh cuon hay
// khong (thanh cuon tuy bien co the an/hien khac nhau theo zoom/OS, day la
// dieu khien chac chan thay the, khong phai thay the co che cuon chuot/kep).
function ScrollableKanbanRow({ children }) {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(el);
    window.addEventListener("resize", updateScrollState);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateScrollState);
    };
  }, [updateScrollState, children]);

  const scrollByColumn = (direction) => {
    scrollRef.current?.scrollBy({ left: direction * 340, behavior: "smooth" });
  };

  return (
    <div className={khStyles.kanbanScrollWrap}>
      {canScrollLeft && (
        <button
          type="button"
          className={`${khStyles.kanbanScrollBtn} ${khStyles.kanbanScrollBtnLeft}`}
          onClick={() => scrollByColumn(-1)}
          aria-label="Cuộn sang trái"
        >
          <ChevronLeft size={18} />
        </button>
      )}
      <div className={khStyles.kanbanBoardContainer} ref={scrollRef}>
        <div className={khStyles.kanbanBoard}>{children}</div>
      </div>
      {canScrollRight && (
        <button
          type="button"
          className={`${khStyles.kanbanScrollBtn} ${khStyles.kanbanScrollBtnRight}`}
          onClick={() => scrollByColumn(1)}
          aria-label="Cuộn sang phải"
        >
          <ChevronRight size={18} />
        </button>
      )}
    </div>
  );
}

function TaskCard({ task, onClick, showStage }) {
  const isDone = task.status === "DONE";
  const isBlocked = task.execution_state === "BLOCKED";
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
      style={{
        borderRadius: 14,
        border: "1px solid #e2e8f0",
        background: "#ffffff",
        boxShadow: "0 2px 8px rgba(15, 23, 42, 0.04)",
        transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      <div className={khStyles.kanbanCardInner} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Space size={6}>
            <span
              className="wf-code"
              style={{
                fontSize: 11.5,
                fontWeight: 700,
                color: "#2563eb",
                background: "#eff6ff",
                padding: "1px 6px",
                borderRadius: 5,
              }}
            >
              {task.code}
            </span>
            {showStage && task.stage_code && (
              <Tag color="cyan" style={{ fontSize: 10.5, margin: 0, padding: "0 6px", borderRadius: 4, lineHeight: "18px", border: "none" }}>
                {task.stage_code}
              </Tag>
            )}
            {isBlocked && (
              <Tag
                color="error"
                style={{ fontSize: 10.5, margin: 0, padding: "0 6px", borderRadius: 4, lineHeight: "18px", border: "none" }}
                title="Đang chờ công việc phụ thuộc hoàn thành"
              >
                <Lock size={10} style={{ marginRight: 2, display: "inline-block", verticalAlign: "middle" }} /> Chờ
              </Tag>
            )}
          </Space>
          {task.confirm_total > 0 && (
            <Tag
              color={task.confirm_done === task.confirm_total ? "success" : "warning"}
              style={{ fontSize: 10.5, margin: 0, padding: "0 6px", borderRadius: 4, lineHeight: "18px", border: "none", fontWeight: 600 }}
            >
              {task.confirm_done}/{task.confirm_total}
            </Tag>
          )}
        </div>

        <Tag
          color={PRIORITY_COLOR[task.priority]}
          style={{ width: "fit-content", fontSize: 10.5, margin: 0, borderRadius: 4, border: "none", fontWeight: 600 }}
        >
          {workflowApi.TASK_PRIORITY_LABELS[task.priority] || task.priority}
        </Tag>

        <div style={{ fontWeight: 650, fontSize: 13.5, color: "#0f172a", lineHeight: 1.4 }}>{task.name}</div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
          {task.deadline ? (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: overdue ? "2px 7px" : "0",
                background: overdue ? "#fee2e2" : "transparent",
                borderRadius: 6,
                color: overdue ? "#dc2626" : "#64748b",
                fontSize: 11,
                fontWeight: overdue ? 600 : 500,
              }}
            >
              <Calendar size={12} />
              <span>{task.deadline}</span>
              {overdue && <span>(Quá hạn)</span>}
            </div>
          ) : (
            <span />
          )}
          <div
            className={`${khStyles.userAvatar} ${gradientClass}`}
            style={{
              width: 26,
              height: 26,
              fontSize: 11,
              fontWeight: 700,
              boxShadow: "0 2px 5px rgba(0, 0, 0, 0.1)",
            }}
          >
            {initials}
          </div>
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

// Kanban tong: 1 cot = 1 giai doan, tra loi "Project dang o dau?" (muc 7 audit).
// Khac voi Kanban chi tiet (1 cot = 1 trang thai task trong 1 giai doan),
// noi day khong co task card / drag-drop - chi click de vao xem chi tiet.
function StageOverviewCard({ stage, theme, onOpen }) {
  const totalTasks = Object.values(stage.task_counts).reduce((a, b) => a + b, 0);
  const doneCount = stage.task_counts.DONE || 0;
  const percent = totalTasks > 0 ? Math.round((doneCount / totalTasks) * 100) : stage.status === "DONE" ? 100 : 0;
  const isBlocked = stage.execution_state === "BLOCKED";
  const statusColor = stage.status === "DONE" ? "green" : stage.status === "OPEN" ? "blue" : "default";

  return (
    <div
      className={khStyles.kanbanColumn}
      style={{ backgroundColor: theme.bg, borderColor: theme.border, borderTopColor: theme.accent, cursor: "pointer" }}
      onClick={onOpen}
    >
      <div className={khStyles.kanbanColumnHeader} style={{ borderBottomColor: theme.border, alignItems: "flex-start" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: theme.text, textTransform: "uppercase" }}>{stage.name}</div>
          <span style={{ fontSize: 10.5, color: theme.text, opacity: 0.7 }}>{stage.code}</span>
        </div>
        <Space size={4}>
          {isBlocked && (
            <Tag color="red" style={{ fontSize: 10, margin: 0 }} title="Đang chờ giai đoạn phụ thuộc hoàn thành">
              <Lock size={10} style={{ marginRight: 2 }} /> Chờ
            </Tag>
          )}
          <Tag color={statusColor} style={{ fontSize: 10, margin: 0 }}>
            {workflowApi.STAGE_STATUS_LABELS[stage.status] || stage.status}
          </Tag>
        </Space>
      </div>
      <div style={{ padding: "12px 14px" }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: theme.text }}>{totalTasks}</div>
        <div style={{ fontSize: 11, color: theme.text, opacity: 0.7, marginBottom: 8 }}>công việc</div>
        <Progress percent={percent} size="small" strokeColor={theme.accent} />
        <div style={{ fontSize: 10.5, color: theme.text, opacity: 0.7, marginTop: 6 }}>
          {doneCount}/{totalTasks} hoàn thành
        </div>
      </div>
    </div>
  );
}

function timelineDate(value) {
  if (!value) return null;
  const raw = String(value);
  const date = new Date(raw.length === 10 ? `${raw}T00:00:00` : raw.replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfDay(date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function formatTimelineDate(date) {
  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

function DependencyIndicator({ ids, nodesById }) {
  if (!ids?.length) return null;
  const labels = ids.map((id) => {
    const node = nodesById.get(String(id));
    return node ? `${node.code} — ${node.name}` : `#${id}`;
  });
  return (
    <Tooltip
      title={
        <div>
          <div>Phụ thuộc vào:</div>
          {labels.map((label) => <div key={label}>{label}</div>)}
        </div>
      }
    >
      <GitBranch size={14} color="#7c3aed" aria-label={`Phụ thuộc vào ${labels.join(", ")}`} />
    </Tooltip>
  );
}

function ProjectTimeline({ project, onTaskClick }) {
  const stages = project.stages || [];
  const doneCodes = new Set(
    (project.columns || []).filter((column) => Number(column.is_done_status) === 1).map((column) => column.code),
  );
  const projectCreatedAt = timelineDate(project.created_at) || new Date();
  const today = startOfDay(new Date());
  const stageNodesById = new Map();
  const taskNodesById = new Map();
  stages.forEach((stage) => {
    stageNodesById.set(String(stage.id), { code: stage.code, name: stage.name });
    (stage.tasks || []).forEach((task) => taskNodesById.set(String(task.id), { code: task.code, name: task.name }));
  });

  const makeBar = (node, done) => {
    const start = timelineDate(node.started_at) || timelineDate(node.created_at) || projectCreatedAt;
    const end = done
      ? timelineDate(node.completed_at) || start
      : timelineDate(node.deadline) || today;
    return { start, end: end < start ? start : end, done };
  };

  const rows = [];
  stages.forEach((stage) => {
    rows.push({
      key: `stage-${stage.id}`,
      type: "stage",
      code: stage.code,
      name: stage.name,
      status: stage.status,
      dependencies: stage.depends_on_stage_ids || [],
      bar: makeBar(stage, stage.status === "DONE"),
    });
    (stage.tasks || []).forEach((task) => {
      rows.push({
        key: `task-${task.id}`,
        type: "task",
        code: task.code,
        name: task.name,
        status: task.status,
        dependencies: task.depends_on_task_ids || [],
        task,
        bar: makeBar(task, doneCodes.has(task.status)),
      });
    });
  });

  if (rows.length === 0) return <Empty description="Chưa có stage/công việc để hiển thị Timeline" />;

  const minDate = startOfDay(new Date(Math.min(...rows.map((row) => row.bar.start.getTime()))));
  const maxDate = startOfDay(new Date(Math.max(...rows.map((row) => row.bar.end.getTime()))));
  const axisStart = new Date(minDate);
  axisStart.setDate(axisStart.getDate() - 1);
  const axisEnd = new Date(maxDate);
  axisEnd.setDate(axisEnd.getDate() + 1);
  const totalMs = Math.max(axisEnd.getTime() - axisStart.getTime(), 24 * 60 * 60 * 1000);
  const position = (date) => Math.max(0, Math.min(100, ((date.getTime() - axisStart.getTime()) / totalMs) * 100));

  return (
    <Card size="small" title="Timeline" style={{ borderRadius: 12 }}>
      <Space size={8} style={{ marginBottom: 10 }}>
        <Tag color="blue">Đang thực hiện</Tag>
        <Tag color="green">Đã hoàn thành</Tag>
        <span style={{ fontSize: 12, color: "#64748b" }}>Chỉ đọc · không kéo-thả đổi lịch</span>
      </Space>
      <div style={{ overflowX: "auto" }}>
        <div style={{ minWidth: 760 }}>
          <div style={{ display: "flex", borderBottom: "1px solid #e2e8f0", paddingBottom: 6, color: "#64748b", fontSize: 11 }}>
            <div style={{ flex: "0 0 310px" }}>Stage / công việc</div>
            <div style={{ flex: 1, display: "flex", justifyContent: "space-between" }}>
              <span>{formatTimelineDate(axisStart)}</span>
              <span>{formatTimelineDate(axisEnd)}</span>
            </div>
          </div>
          {rows.map((row) => {
            const left = position(row.bar.start);
            const width = Math.max(1.5, position(row.bar.end) - left);
            const isStage = row.type === "stage";
            const isOverdue = !row.bar.done && row.bar.end < today;
            const barColor = row.bar.done ? "#52c41a" : isOverdue ? "#ff7875" : "#1677ff";
            return (
              <div key={row.key} style={{ display: "flex", alignItems: "center", minHeight: 42, borderBottom: "1px solid #f1f5f9" }}>
                <div style={{ flex: "0 0 310px", padding: isStage ? "8px 10px 8px 0" : "8px 10px 8px 22px", fontWeight: isStage ? 700 : 400, color: isStage ? "#1e293b" : "#475569" }}>
                  <Space size={6}>
                    <span className="wf-code" style={{ fontSize: 11 }}>{row.code}</span>
                    <span>{row.name}</span>
                    <DependencyIndicator
                      ids={row.dependencies}
                      nodesById={isStage ? stageNodesById : taskNodesById}
                    />
                  </Space>
                </div>
                <div style={{ flex: 1, position: "relative", height: 26, borderRadius: 6, background: "repeating-linear-gradient(90deg, #f8fafc 0, #f8fafc calc(25% - 1px), #e2e8f0 calc(25% - 1px), #e2e8f0 25%)" }}>
                  <Tooltip title={`${row.code} · ${row.name}`}>
                    <div
                      style={{ position: "absolute", left: `${left}%`, width: `${width}%`, top: 6, height: 14, minWidth: 8, borderRadius: 7, background: barColor, opacity: 0.9 }}
                      aria-label={`${row.code} ${row.name}`}
                    />
                  </Tooltip>
                </div>
                <div style={{ flex: "0 0 100px", paddingLeft: 10, fontSize: 11, color: "#64748b" }}>
                  {isStage ? row.status : (row.task?.deadline || "Không deadline")}
                </div>
                {row.task && (
                  <Button type="link" size="small" onClick={() => onTaskClick(row.task.id)} aria-label={`Mở ${row.name}`}>
                    Mở
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

function StageExtraPanel({ stage, profile, onSaved }) {
  const [form] = Form.useForm();
  const [reasonOpen, setReasonOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pendingRequests, setPendingRequests] = useState([]);
  const [calcValues, setCalcValues] = useState({});

  useEffect(() => {
    const data = stage.extra_data || {};
    form.setFieldsValue(data);
    setCalcValues(data);
    workflowApi.listLockRequests(stage.id).then((rows) => setPendingRequests((rows || []).filter((r) => r.status === "PENDING")));
  }, [stage, form]);

  const save = async (lockNow = false) => {
    const values = form.getFieldsValue();
    try {
      const data = await workflowApi.saveStageExtra(stage.id, values, lockNow);
      message.success(lockNow ? "Đã chốt và LOCK dữ liệu thành công" : "Đã lưu thông tin giai đoạn");
      onSaved(data);
    } catch (e) {
      message.error(e.message);
    }
  };

  const submitUnlockRequest = async () => {
    try {
      await workflowApi.requestUnlock(stage.id, reason);
      message.success("Đã gửi yêu cầu mở khóa đến Quản trị viên");
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
      message.success(approve ? "Đã duyệt mở khóa thành công" : "Đã từ chối mở khóa");
      const rows = await workflowApi.listLockRequests(stage.id);
      setPendingRequests(rows.filter((r) => r.status === "PENDING"));
      const fresh = await workflowApi.getProject(stage.project_id);
      const freshStage = fresh.stages.find((s) => s.id === stage.id);
      onSaved(freshStage);
    } catch (e) {
      message.error(e.message);
    }
  };

  const handleValuesChange = (_, allValues) => {
    setCalcValues(allValues);
  };

  const locked = !!stage.is_locked;
  const isContract = stage.stage_type === "CONTRACT";
  const isPayment = stage.stage_type === "PAYMENT";
  const isExecution = stage.stage_type === "EXECUTION";
  const isTester = stage.stage_type === "TESTER";
  const isHandover = stage.stage_type === "HANDOVER";
  const isMaintenance = stage.stage_type === "MAINTENANCE";

  const canEdit = !!profile && (profile.is_admin || (stage.departments || []).includes(profile.department_code));
  const canApprove = !!profile && profile.is_admin;

  // Real-time financial & metric calculations
  const giaBan = Number(calcValues.gia_ban) || 0;
  const chiPhiDuKien = Number(calcValues.chi_phi_du_kien) || 0;
  const chiPhiNhanSu = Number(calcValues.chi_phi_nhan_su) || 0;
  const chiPhiKhac = Number(calcValues.chi_phi_khac) || 0;
  const loiNhuan = giaBan - (chiPhiDuKien + chiPhiNhanSu + chiPhiKhac);
  const tySuatLoiNhuan = giaBan > 0 ? ((loiNhuan / giaBan) * 100).toFixed(1) : 0;

  const plannedDays = Number(calcValues.tong_ngay_cong_ke_hoach) || 0;
  const usedDays = Number(calcValues.tong_ngay_cong_da_dung) || 0;
  const remainingDays = Math.max(0, plannedDays - usedDays);
  const executionPercent = plannedDays > 0 ? Math.min(100, Math.round((usedDays / plannedDays) * 100)) : 0;

  const giaTriHopDong = Number(calcValues.gia_tri_hop_dong) || 0;
  const daThu = Number(calcValues.da_thu) || 0;
  const conPhaiThu = Math.max(0, giaTriHopDong - daThu);
  const paymentPercent = giaTriHopDong > 0 ? Math.min(100, Math.round((daThu / giaTriHopDong) * 100)) : 0;

  const titleMap = {
    CONTRACT: "Hợp đồng & Lợi nhuận (GD03)",
    EXECUTION: "Thực thi lập trình (GD04)",
    TESTER: "Kiểm thử & QA (GD05)",
    HANDOVER: "Bàn giao & Nghiệm thu (GD06)",
    PAYMENT: "Theo dõi Thu tiền (GD07)",
    MAINTENANCE: "Quản lý Bảo trì (GD08)",
  };

  return (
    <Card
      size="small"
      title={titleMap[stage.stage_type] || `Chi tiết ${stage.name}`}
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
      style={{ marginBottom: 12, borderRadius: 12 }}
    >
      <Form form={form} layout="vertical" disabled={locked || !canEdit} onValuesChange={handleValuesChange}>
        {isContract && (
          <>
            <Form.Item name="gia_ban" label="Giá bán (VNĐ)"><Input type="number" placeholder="Ví dụ: 100000000" /></Form.Item>
            <Form.Item name="chi_phi_du_kien" label="Chi phí dự kiến (VNĐ)"><Input type="number" placeholder="Ví dụ: 30000000" /></Form.Item>
            <Form.Item name="chi_phi_nhan_su" label="Chi phí nhân sự (VNĐ)"><Input type="number" placeholder="Ví dụ: 40000000" /></Form.Item>
            <Form.Item name="so_ngay_cong" label="Tổng số ngày công"><Input type="number" placeholder="Ví dụ: 100" /></Form.Item>
            <Form.Item name="chi_phi_khac" label="Chi phí khác (VNĐ)"><Input type="number" placeholder="0" /></Form.Item>
            <Form.Item name="hop_dong" label="Số / Mã Hợp đồng"><Input placeholder="HD-2026-001" /></Form.Item>

            {giaBan > 0 && (
              <Card size="small" type="inner" style={{ background: loiNhuan >= 0 ? "#f6ffed" : "#fff2f0", borderColor: loiNhuan >= 0 ? "#b7eb8f" : "#ffccc7", marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700 }}>
                  <span>Lợi nhuận dự kiến:</span>
                  <span style={{ color: loiNhuan >= 0 ? "#52c41a" : "#ff4d4f" }}>
                    {loiNhuan.toLocaleString("vi-VN")} VNĐ ({tySuatLoiNhuan}%)
                  </span>
                </div>
              </Card>
            )}
          </>
        )}

        {isExecution && (
          <>
            <Form.Item name="tong_ngay_cong_ke_hoach" label="Kế hoạch (số ngày công)"><Input type="number" placeholder="100" /></Form.Item>
            <Form.Item name="tong_ngay_cong_da_dung" label="Đã sử dụng (số ngày công)"><Input type="number" placeholder="60" /></Form.Item>
            
            {plannedDays > 0 && (
              <Card size="small" type="inner" style={{ background: "#e6f4ff", borderColor: "#91caff", marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#1677ff", marginBottom: 4 }}>
                  Tiến độ ngày công: {usedDays}/{plannedDays} ngày (Còn lại: {remainingDays} ngày)
                </div>
                <div style={{ height: 8, background: "#d9d9d9", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${executionPercent}%`, background: executionPercent > 90 ? "#ff4d4f" : "#1677ff" }} />
                </div>
              </Card>
            )}
          </>
        )}

        {isPayment && (
          <>
            <Form.Item name="gia_tri_hop_dong" label="Giá trị hợp đồng (VNĐ)"><Input type="number" placeholder="100000000" /></Form.Item>
            <Form.Item name="da_thu" label="Đã thu (VNĐ)"><Input type="number" placeholder="70000000" /></Form.Item>
            <Form.Item name="con_phai_thu" label="Còn phải thu (VNĐ)"><Input type="number" value={conPhaiThu} readOnly style={{ background: "#fafafa" }} /></Form.Item>
            
            {giaTriHopDong > 0 && (
              <Card size="small" type="inner" style={{ background: "#f6ffed", borderColor: "#b7eb8f", marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#52c41a", marginBottom: 4 }}>
                  Tỷ lệ thu tiền: {paymentPercent}% ({daThu.toLocaleString("vi-VN")} / {giaTriHopDong.toLocaleString("vi-VN")} VNĐ)
                </div>
                <div style={{ height: 8, background: "#d9d9d9", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${paymentPercent}%`, background: "#52c41a" }} />
                </div>
              </Card>
            )}
          </>
        )}

        {isTester && (
          <>
            <Form.Item name="tong_test_case" label="Tổng số Test Cases"><Input type="number" placeholder="50" /></Form.Item>
            <Form.Item name="test_case_passed" label="Số Test Cases PASSED"><Input type="number" placeholder="45" /></Form.Item>
            <Form.Item name="ghi_chu_kierm_thu" label="Ghi chú kết quả kiểm thử"><Input.TextArea rows={2} placeholder="Nội dung test..." /></Form.Item>
          </>
        )}

        {isHandover && (
          <>
            <Form.Item name="ngay_ban_giao" label="Ngày bàn giao chính thức"><Input type="date" /></Form.Item>
            <Form.Item name="bien_ban_ban_giao" label="Số biên bản bàn giao / Link tài liệu"><Input placeholder="BBBG-2026-001" /></Form.Item>
            <Form.Item name="nguoi_xac_nhan_khach_hang" label="Người đại diện KH xác nhận"><Input placeholder="Nguyễn Văn A" /></Form.Item>
          </>
        )}

        {isMaintenance && (
          <>
            <Form.Item name="thoi_han_bao_tri" label="Thời hạn bảo trì (tháng)"><Input type="number" placeholder="12" /></Form.Item>
            <Form.Item name="ngay_het_han_bao_tri" label="Ngày hết hạn bảo trì"><Input type="date" /></Form.Item>
            <Form.Item name="dau_moi_ho_tro" label="Đầu mối hỗ trợ kỹ thuật"><Input placeholder="Dev Lead / Hotline" /></Form.Item>
          </>
        )}

        {!locked ? (
          canEdit && (
            <Space style={{ marginTop: 8 }}>
              <Button size="small" onClick={() => save(false)}>
                Lưu thay đổi
              </Button>
              {stage.lock_enabled && (
                <Button size="small" type="primary" icon={<Lock size={13} />} onClick={() => save(true)}>
                  Chốt & LOCK
                </Button>
              )}
            </Space>
          )
        ) : (
          <Space direction="vertical" style={{ width: "100%", marginTop: 8 }}>
            {pendingRequests.length === 0 ? (
              canEdit && (
                <Button size="small" onClick={() => setReasonOpen(true)}>
                  Yêu cầu mở khóa
                </Button>
              )
            ) : (
              pendingRequests.map((r) =>
                canApprove && r.requested_by !== profile?.code ? (
                  <Card key={r.id} size="small" type="inner" title={`Yêu cầu mở khóa #${r.id} bởi ${r.requested_by}`}>
                    <div style={{ marginBottom: 8, fontSize: 12 }}>{r.reason}</div>
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
                    Yêu cầu mở khóa #{r.id} (bởi {r.requested_by}) đang chờ Quản trị viên duyệt
                  </Tag>
                ),
              )
            )}
          </Space>
        )}
      </Form>

      <Modal title="Lý do gửi Yêu cầu Mở khóa" open={reasonOpen} onCancel={() => setReasonOpen(false)} onOk={submitUnlockRequest}>
        <Input.TextArea rows={3} placeholder="Ghi rõ lý do tại sao cần điều chỉnh dữ liệu đã LOCK..." value={reason} onChange={(e) => setReason(e.target.value)} />
      </Modal>
    </Card>
  );
}

export default function ProjectDetail({ projectId, onBack }) {
  const [project, setProject] = useState(null);
  const [activeStageId, setActiveStageId] = useState(null);
  const [board, setBoard] = useState(null);
  const [viewMode, setViewMode] = useState("stage"); // "stage" | "overview" | "timeline"
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
    if (viewMode === "stage") loadBoard();
  }, [loadBoard, viewMode]);

  const refreshAll = async () => {
    await loadProject();
    if (viewMode === "stage") await loadBoard();
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

      <div
        className="glass-card"
        style={{
          padding: "16px 20px",
          marginBottom: 16,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span
            className="wf-code"
            style={{
              fontSize: 13,
              fontWeight: 800,
              color: "#2563eb",
              background: "#eff6ff",
              padding: "4px 10px",
              borderRadius: 6,
              border: "1px solid #dbeafe",
            }}
          >
            {project.code}
          </span>
          <span style={{ fontSize: 17, fontWeight: 750, color: "#0f172a" }}>{project.name}</span>
          {project.customer_name && (
            <Tag color="blue" style={{ borderRadius: 6, fontWeight: 600, margin: 0, padding: "2px 8px" }}>
              Khách hàng: {project.customer_name}
            </Tag>
          )}
          <Tag color="purple" style={{ borderRadius: 6, fontWeight: 600, margin: 0, padding: "2px 8px" }}>
            Quy trình: {project.workflow_name}
          </Tag>
        </div>
        <div>
          <Tag
            color={project.status === "DONE" ? "success" : project.status === "IN_PROGRESS" ? "processing" : "default"}
            style={{ borderRadius: 9999, fontWeight: 700, padding: "3px 12px", fontSize: 12 }}
          >
            {project.status === "IN_PROGRESS" ? "Đang triển khai" : project.status === "DONE" ? "Hoàn thành" : project.status}
          </Tag>
        </div>
      </div>

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
          { label: "Timeline", value: "timeline", icon: <Calendar size={13} /> },
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

          <div style={{ flex: 1, minWidth: 0 }}>
            <Space style={{ marginBottom: 8 }}>
              <Button size="small" icon={<Plus size={13} />} onClick={openAddTask}>
                Thêm công việc phát sinh
              </Button>
            </Space>
            {board ? (
              <ScrollableKanbanRow>
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
              </ScrollableKanbanRow>
            ) : (
              <Empty />
            )}
          </div>
        </div>
      )}

      {viewMode === "overview" && (
        <ScrollableKanbanRow>
          {project.stages.map((stage, idx) => (
            <StageOverviewCard
              key={stage.id}
              stage={stage}
              theme={COLUMN_THEMES[idx % COLUMN_THEMES.length]}
              onOpen={() => {
                setActiveStageId(stage.id);
                setViewMode("stage");
              }}
            />
          ))}
        </ScrollableKanbanRow>
      )}

      {viewMode === "timeline" && <ProjectTimeline project={project} onTaskClick={setActiveTaskId} />}

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
