import React, { useEffect, useState, useCallback } from "react";
import { Table, Tag, Select, message, Empty } from "antd";
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
      message.success("Đã cập nhật");
      load();
    } catch (e) {
      message.error(e.message);
    }
  };

  const columns = [
    { title: "Mã CV", dataIndex: "code", width: 110 },
    { title: "Tên công việc", dataIndex: "name" },
    { title: "Dự án", render: (_, r) => `${r.project_code} — ${r.project_name}` },
    { title: "Giai đoạn", render: (_, r) => `${r.stage_code} — ${r.stage_name}` },
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
        <Select
          size="small"
          value={v}
          style={{ width: 130 }}
          options={(r.columns || []).map((c) => ({ value: c.code, label: c.label }))}
          onClick={(e) => e.stopPropagation()}
          onChange={(val) => changeStatus(r.id, val)}
        />
      ),
    },
  ];

  return (
    <div>
      <p style={{ color: "#999", fontSize: 13, marginBottom: 12 }}>
        Danh sách công việc được giao cho bạn, hoặc chưa có người phụ trách nhưng thuộc phòng ban của bạn.
      </p>
      <Table
        rowKey="id"
        size="small"
        loading={loading}
        dataSource={tasks}
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
