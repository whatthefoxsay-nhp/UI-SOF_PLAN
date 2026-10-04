import React, { useEffect, useState, useCallback } from "react";
import { Table, Tag, Select, message, Empty, Input, Space } from "antd";
import { Search, AlertTriangle, Lock } from "lucide-react";
import * as workflowApi from "../../services/workflowApi";
import TaskDrawer from "./TaskDrawer";

const PRIORITY_COLOR = { LOW: "default", NORMAL: "blue", HIGH: "orange", URGENT: "red" };

// "Hoan thanh" theo dung cot Kanban cua workflow (is_done_status), khong doan
// theo ma trang thai co dinh vi moi workflow tu dinh nghia bo cot rieng.
function isTaskDone(t) {
  const col = (t.columns || []).find((c) => c.code === t.status);
  return col ? col.is_done_status === 1 : t.status === "DONE";
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export default function MyTasksTab() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [profile, setProfile] = useState(null);
  const [activeTaskId, setActiveTaskId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [blockedFilter, setBlockedFilter] = useState("ALL");
  const [dueFilter, setDueFilter] = useState("ALL");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await workflowApi.getMyTasks();
      setTasks(data || []);
    } catch (e) {
      message.error(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    workflowApi.getEmployees().then(setEmployees).catch(() => {});
    workflowApi.getDepartments().then(setDepartments).catch(() => {});
    workflowApi.getMyProfile().then(setProfile).catch(() => {});
  }, [load]);

  const changeStatus = async (taskId, status) => {
    try {
      await workflowApi.updateTaskStatus(taskId, status);
      message.success("Đã cập nhật trạng thái");
      load();
    } catch (e) {
      message.error(e.message);
    }
  };

  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      !searchQuery.trim() ||
      (t.name && t.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.code && t.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.project_name && t.project_name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesPriority = priorityFilter === "ALL" || t.priority === priorityFilter;
    const matchesBlocked =
      blockedFilter === "ALL" ||
      (blockedFilter === "BLOCKED_ONLY" && t.execution_state === "BLOCKED") ||
      (blockedFilter === "HIDE_BLOCKED" && t.execution_state !== "BLOCKED");

    let matchesDue = true;
    if (dueFilter !== "ALL") {
      const done = isTaskDone(t);
      const today = startOfDay(new Date());
      const deadline = t.deadline ? startOfDay(new Date(t.deadline)) : null;
      if (dueFilter === "OVERDUE") matchesDue = !done && deadline && deadline < today;
      else if (dueFilter === "TODAY") matchesDue = !done && deadline && deadline.getTime() === today.getTime();
      else if (dueFilter === "UPCOMING") {
        const in7Days = new Date(today);
        in7Days.setDate(in7Days.getDate() + 7);
        matchesDue = !done && deadline && deadline >= today && deadline <= in7Days;
      } else if (dueFilter === "IN_PROGRESS") matchesDue = !done && t.execution_state !== "BLOCKED";
      else if (dueFilter === "WAITING_CONFIRM") matchesDue = t.confirm_total > 0 && t.confirm_done < t.confirm_total;
      else if (dueFilter === "DONE") matchesDue = done;
    }

    return matchesSearch && matchesPriority && matchesBlocked && matchesDue;
  });

  const columns = [
    {
      title: "Mã CV",
      dataIndex: "code",
      width: 110,
      render: (v) => (
        <span
          className="wf-code"
          style={{
            fontSize: 11.5,
            fontWeight: 700,
            color: "#2563eb",
            background: "#eff6ff",
            padding: "2px 7px",
            borderRadius: 5,
          }}
        >
          {v}
        </span>
      ),
    },
    {
      title: "Tên công việc",
      dataIndex: "name",
      render: (v, r) => (
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <span style={{ fontWeight: 650, color: "#0f172a" }}>{v}</span>
          {r.linked_plan_task_id && (
            <Tag color="purple" style={{ width: "fit-content", fontSize: 10.5, borderRadius: 4, margin: 0, padding: "0 6px" }}>
              Liên kết kế hoạch
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: "Dự án",
      render: (_, r) => (
        <div>
          <span className="wf-code" style={{ color: "#2563eb", fontWeight: 600, fontSize: 11.5 }}>
            {r.project_code}
          </span>
          <span style={{ color: "#475569", marginLeft: 6, fontSize: 12.5 }}>{r.project_name}</span>
        </div>
      ),
    },
    {
      title: "Giai đoạn",
      render: (_, r) => (
        <Tag color="cyan" style={{ borderRadius: 6, fontWeight: 550 }}>
          {r.stage_code} — {r.stage_name}
        </Tag>
      ),
    },
    {
      title: "Hạn chót",
      dataIndex: "deadline",
      width: 125,
      render: (v, r) => {
        if (!v) return <span style={{ color: "#94a3b8" }}>—</span>;
        const overdue = !isTaskDone(r) && startOfDay(new Date(v)) < startOfDay(new Date());
        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: overdue ? "2px 7px" : "0",
              background: overdue ? "#fee2e2" : "transparent",
              borderRadius: 6,
              color: overdue ? "#dc2626" : "#64748b",
              fontWeight: overdue ? 650 : 500,
              fontSize: 12,
            }}
          >
            {overdue && <AlertTriangle size={12} />}
            {v}
          </span>
        );
      },
    },
    {
      title: "Ưu tiên",
      dataIndex: "priority",
      width: 110,
      render: (v) => (
        <Tag color={PRIORITY_COLOR[v]} style={{ borderRadius: 5, fontWeight: 600, border: "none" }}>
          {workflowApi.TASK_PRIORITY_LABELS[v] || v}
        </Tag>
      ),
    },
    {
      title: "Xác nhận",
      width: 110,
      render: (_, r) =>
        r.confirm_total > 0 ? (
          <Tag
            color={r.confirm_done === r.confirm_total ? "success" : "warning"}
            style={{ borderRadius: 5, fontWeight: 600, border: "none" }}
          >
            {r.confirm_done}/{r.confirm_total}
          </Tag>
        ) : (
          <span style={{ color: "#94a3b8" }}>—</span>
        ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      width: 160,
      render: (v, r) => (
        <Space direction="vertical" size={4}>
          <Select
            size="small"
            value={v}
            style={{ width: 140 }}
            options={(r.columns || []).map((c) => ({ value: c.code, label: c.label }))}
            onClick={(e) => e.stopPropagation()}
            onChange={(val) => changeStatus(r.id, val)}
          />
          {r.execution_state === "BLOCKED" && (
            <Tag color="error" style={{ margin: 0, borderRadius: 4, fontSize: 10.5, border: "none" }}>
              <Lock size={10} style={{ marginRight: 2, display: "inline-block", verticalAlign: "middle" }} /> Bị chặn
            </Tag>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="wf-project-toolbar">
        <Space wrap>
          <Input
            placeholder="Tìm theo tên công việc, mã, dự án..."
            prefix={<Search size={14} style={{ color: "#94a3b8" }} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: 260 }}
            allowClear
          />
          <Select
            value={priorityFilter}
            onChange={setPriorityFilter}
            style={{ width: 150 }}
            options={[
              { value: "ALL", label: "Tất cả mức ưu tiên" },
              { value: "LOW", label: "Thấp" },
              { value: "NORMAL", label: "Bình thường" },
              { value: "HIGH", label: "Cao" },
              { value: "URGENT", label: "Khẩn cấp" },
            ]}
          />
          <Select
            value={blockedFilter}
            onChange={setBlockedFilter}
            style={{ width: 170 }}
            options={[
              { value: "ALL", label: "Tất cả trạng thái chặn" },
              { value: "BLOCKED_ONLY", label: "Chỉ công việc bị chặn" },
              { value: "HIDE_BLOCKED", label: "Ẩn công việc bị chặn" },
            ]}
          />
          <Select
            value={dueFilter}
            onChange={setDueFilter}
            style={{ width: 170 }}
            options={[
              { value: "ALL", label: "Tất cả thời hạn" },
              { value: "OVERDUE", label: "Quá hạn" },
              { value: "TODAY", label: "Hôm nay" },
              { value: "UPCOMING", label: "Sắp đến hạn (7 ngày)" },
              { value: "IN_PROGRESS", label: "Đang làm" },
              { value: "WAITING_CONFIRM", label: "Chờ xác nhận" },
              { value: "DONE", label: "Hoàn thành" },
            ]}
          />
          <span className="wf-project-count">{filteredTasks.length} / {tasks.length} công việc</span>
        </Space>
      </div>

      <Table
        rowKey="id"
        size="small"
        loading={loading}
        dataSource={filteredTasks}
        columns={columns}
        locale={{ emptyText: <Empty description="Không có công việc nào" /> }}
        onRow={(row) => ({ onClick: () => setActiveTaskId(row.id), style: { cursor: "pointer" } })}
      />
      <TaskDrawer
        taskId={activeTaskId}
        employees={employees}
        departments={departments}
        profile={profile}
        onClose={() => setActiveTaskId(null)}
        onChanged={load}
      />
    </div>
  );
}
