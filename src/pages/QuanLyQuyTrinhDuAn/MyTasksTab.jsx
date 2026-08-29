import React, { useEffect, useState, useCallback } from "react";
import { Table, Tag, Select, message, Empty, Input, Space } from "antd";
import { Search } from "lucide-react";
import * as workflowApi from "../../services/workflowApi";
import TaskDrawer from "./TaskDrawer";

const PRIORITY_COLOR = { LOW: "default", NORMAL: "blue", HIGH: "orange", URGENT: "red" };

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
    return matchesSearch && matchesPriority && matchesBlocked;
  });

  const columns = [
    { title: "Mã CV", dataIndex: "code", width: 110, render: (v) => <span className="wf-code">{v}</span> },
    {
      title: "Tên công việc",
      dataIndex: "name",
      render: (v, r) => (
        <span>
          <b>{v}</b>
          {r.linked_plan_task_id ? <Tag color="purple" style={{ marginLeft: 6 }}>Đã liên kết kế hoạch</Tag> : null}
        </span>
      ),
    },
    { title: "Dự án", render: (_, r) => `${r.project_code} — ${r.project_name}` },
    { title: "Giai đoạn", render: (_, r) => <Tag color="cyan">{r.stage_code} — {r.stage_name}</Tag> },
    { title: "Deadline", dataIndex: "deadline", width: 110, render: (v) => v || "—" },
    {
      title: "Ưu tiên",
      dataIndex: "priority",
      width: 100,
      render: (v) => <Tag color={PRIORITY_COLOR[v]}>{workflowApi.TASK_PRIORITY_LABELS[v] || v}</Tag>,
    },
    {
      title: "Xác nhận",
      width: 100,
      render: (_, r) =>
        r.confirm_total > 0 ? (
          <Tag color={r.confirm_done === r.confirm_total ? "green" : "gold"}>
            {r.confirm_done}/{r.confirm_total}
          </Tag>
        ) : (
          "—"
        ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      width: 150,
      render: (v, r) => (
        <Space direction="vertical" size={2}>
          <Select
            size="small"
            value={v}
            style={{ width: 130 }}
            options={(r.columns || []).map((c) => ({ value: c.code, label: c.label }))}
            onClick={(e) => e.stopPropagation()}
            onChange={(val) => changeStatus(r.id, val)}
          />
          {r.execution_state === "BLOCKED" && <Tag color="red" style={{ margin: 0 }}>Bị chặn</Tag>}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 12 }}>
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
              { value: "ALL", label: "Tất cả (kể cả bị block)" },
              { value: "BLOCKED_ONLY", label: "Chỉ công việc bị block" },
              { value: "HIDE_BLOCKED", label: "Ẩn công việc bị block" },
            ]}
          />
          <span style={{ color: "#64748b", fontSize: 13 }}>{filteredTasks.length} / {tasks.length} công việc</span>
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
