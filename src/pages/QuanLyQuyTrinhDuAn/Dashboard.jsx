import React, { useEffect, useState } from "react";
import { Card, Row, Col, Statistic, Table, Empty, message } from "antd";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import * as workflowApi from "../../services/workflowApi";

const HISTORY_ACTION_LABELS = {
  CREATE: "Tạo mới",
  UPDATE: "Cập nhật",
  DELETE: "Xóa",
  STAGE_DONE: "Hoàn thành giai đoạn",
  STAGE_OPEN: "Mở giai đoạn",
  PROJECT_DONE: "Hoàn thành dự án",
};

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    workflowApi
      .getDashboardSummary()
      .then(setSummary)
      .catch((e) => message.error(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (!summary) return null;

  const activityColumns = [
    { title: "Thời gian", dataIndex: "created_at", width: 150 },
    {
      title: "Dự án",
      width: 200,
      render: (_, r) => (r.project_code ? `${r.project_code} — ${r.project_name}` : "—"),
    },
    { title: "Loại", dataIndex: "entity_type", width: 100 },
    {
      title: "Hành động",
      dataIndex: "action",
      width: 150,
      render: (v) => HISTORY_ACTION_LABELS[v] || v,
    },
    { title: "Nội dung", dataIndex: "detail" },
  ];

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card loading={loading}>
            <Statistic title="Dự án đang chạy" value={summary.projects.active} />
          </Card>
        </Col>
        <Col span={6}>
          <Card loading={loading}>
            <Statistic title="Công việc đang thực hiện" value={summary.tasks.in_progress} />
          </Card>
        </Col>
        <Col span={6}>
          <Card loading={loading}>
            <Statistic title="Quá hạn" value={summary.tasks.overdue} valueStyle={{ color: "#ff4d4f" }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card loading={loading}>
            <Statistic title="Bị chặn" value={summary.tasks.blocked} valueStyle={{ color: "#fa8c16" }} />
          </Card>
        </Col>
      </Row>

      <Card title="Khối lượng công việc theo phòng ban" style={{ marginBottom: 16 }} loading={loading}>
        {summary.by_department.length === 0 ? (
          <Empty description="Không có dữ liệu" />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={summary.by_department}>
              <XAxis dataKey="department_code" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" name="Tổng công việc" fill="#4f46e5" />
              <Bar dataKey="overdue" name="Quá hạn" fill="#ff4d4f" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      <Card title="Hoạt động gần đây" loading={loading}>
        <Table
          rowKey="id"
          size="small"
          dataSource={summary.activity}
          columns={activityColumns}
          pagination={false}
          locale={{ emptyText: <Empty description="Chưa có hoạt động" /> }}
        />
      </Card>
    </div>
  );
}
