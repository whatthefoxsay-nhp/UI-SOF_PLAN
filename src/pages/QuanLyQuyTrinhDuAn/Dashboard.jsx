import React, { useCallback, useEffect, useState } from "react";
import { Card, Row, Col, Table, Empty, message, Button, Tag, Typography } from "antd";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from "recharts";
import { RefreshCw, FolderKanban, CheckCircle2, AlertTriangle, Lock, Activity, Clock } from "lucide-react";
import * as workflowApi from "../../services/workflowApi";

const { Text, Title } = Typography;

const HISTORY_ACTION_CONFIG = {
  CREATE: { label: "Tạo mới", color: "green" },
  UPDATE: { label: "Cập nhật", color: "blue" },
  DELETE: { label: "Xóa", color: "red" },
  STAGE_DONE: { label: "Hoàn thành giai đoạn", color: "purple" },
  STAGE_OPEN: { label: "Mở giai đoạn", color: "cyan" },
  PROJECT_DONE: { label: "Hoàn thành dự án", color: "geekblue" },
};

function CustomChartTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          background: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(10px)",
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          padding: "10px 14px",
          boxShadow: "0 10px 25px -4px rgba(15, 23, 42, 0.12)",
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a", marginBottom: 6 }}>
          Phòng ban: {label}
        </div>
        {payload.map((item) => (
          <div
            key={item.dataKey}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              fontSize: 12,
              color: "#475569",
              marginTop: 3,
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: item.color }} />
              {item.name}:
            </span>
            <span style={{ fontWeight: 700, color: "#0f172a" }}>{item.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    workflowApi
      .getDashboardSummary()
      .then(setSummary)
      .catch((e) => message.error(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!summary) return null;

  const activityColumns = [
    {
      title: "Thời gian",
      dataIndex: "created_at",
      width: 170,
      render: (v) => (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "#64748b", fontSize: 12 }}>
          <Clock size={12} />
          {v}
        </span>
      ),
    },
    {
      title: "Dự án",
      width: 220,
      render: (_, r) =>
        r.project_code ? (
          <div>
            <span className="wf-code" style={{ color: "#2563eb", fontWeight: 700, fontSize: 12 }}>
              {r.project_code}
            </span>
            <span style={{ color: "#475569", fontSize: 12.5, marginLeft: 6 }}>{r.project_name}</span>
          </div>
        ) : (
          "—"
        ),
    },
    {
      title: "Đối tượng",
      dataIndex: "entity_type",
      width: 110,
      render: (v) => (
        <Tag style={{ borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
          {v === "PROJECT" ? "Dự án" : v === "STAGE" ? "Giai đoạn" : v === "TASK" ? "Công việc" : v}
        </Tag>
      ),
    },
    {
      title: "Hành động",
      dataIndex: "action",
      width: 160,
      render: (v) => {
        const conf = HISTORY_ACTION_CONFIG[v] || { label: v, color: "default" };
        return (
          <Tag color={conf.color} style={{ borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
            {conf.label}
          </Tag>
        );
      },
    },
    {
      title: "Nội dung",
      dataIndex: "detail",
      render: (v) => <span style={{ color: "#334155", fontSize: 13 }}>{v}</span>,
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Top Bar Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <Title level={4} style={{ margin: 0, color: "#0f172a", fontWeight: 700 }}>
            Tổng quan tiến độ & vận hành dự án
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Báo cáo tổng hợp số liệu thời gian thực theo toàn bộ luồng quy trình
          </Text>
        </div>
        <Button
          type="primary"
          icon={<RefreshCw size={14} className={loading ? "loading" : ""} />}
          loading={loading}
          onClick={load}
          style={{
            background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
            border: "none",
            boxShadow: "0 4px 12px rgba(37, 99, 235, 0.2)",
          }}
        >
          Làm mới dữ liệu
        </Button>
      </div>

      {/* 4 KPI Stat Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <div
            className="modern-stat-card"
            style={{
              "--stat-accent": "#2563eb",
              background: "linear-gradient(180deg, #ffffff 0%, #f0f7ff 100%)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: "#64748b" }}>Dự án đang chạy</span>
                <div style={{ fontSize: 32, fontWeight: 800, color: "#0f172a", margin: "6px 0 4px" }}>
                  {summary.projects.active}
                </div>
                <div className="badge-pill" style={{ background: "#dbeafe", color: "#1d4ed8" }}>
                  <Activity size={12} /> Đang triển khai
                </div>
              </div>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ffffff",
                  boxShadow: "0 8px 16px -2px rgba(37, 99, 235, 0.35)",
                }}
              >
                <FolderKanban size={22} />
              </div>
            </div>
          </div>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <div
            className="modern-stat-card"
            style={{
              "--stat-accent": "#6366f1",
              background: "linear-gradient(180deg, #ffffff 0%, #f5f3ff 100%)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: "#64748b" }}>Công việc đang làm</span>
                <div style={{ fontSize: 32, fontWeight: 800, color: "#0f172a", margin: "6px 0 4px" }}>
                  {summary.tasks.in_progress}
                </div>
                <div className="badge-pill" style={{ background: "#ede9fe", color: "#5b21b6" }}>
                  <CheckCircle2 size={12} /> Tiến độ ổn định
                </div>
              </div>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ffffff",
                  boxShadow: "0 8px 16px -2px rgba(99, 102, 241, 0.35)",
                }}
              >
                <Activity size={22} />
              </div>
            </div>
          </div>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <div
            className="modern-stat-card"
            style={{
              "--stat-accent": "#ef4444",
              background: "linear-gradient(180deg, #ffffff 0%, #fef2f2 100%)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: "#64748b" }}>Công việc quá hạn</span>
                <div style={{ fontSize: 32, fontWeight: 800, color: "#dc2626", margin: "6px 0 4px" }}>
                  {summary.tasks.overdue}
                </div>
                <div className="badge-pill" style={{ background: "#fee2e2", color: "#b91c1c" }}>
                  <AlertTriangle size={12} /> Cần can thiệp gấp
                </div>
              </div>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ffffff",
                  boxShadow: "0 8px 16px -2px rgba(239, 68, 68, 0.35)",
                }}
              >
                <AlertTriangle size={22} />
              </div>
            </div>
          </div>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <div
            className="modern-stat-card"
            style={{
              "--stat-accent": "#f59e0b",
              background: "linear-gradient(180deg, #ffffff 0%, #fffbeb 100%)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: "#64748b" }}>Công việc bị chặn</span>
                <div style={{ fontSize: 32, fontWeight: 800, color: "#d97706", margin: "6px 0 4px" }}>
                  {summary.tasks.blocked}
                </div>
                <div className="badge-pill" style={{ background: "#fef3c7", color: "#92400e" }}>
                  <Lock size={12} /> Chờ phụ thuộc
                </div>
              </div>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ffffff",
                  boxShadow: "0 8px 16px -2px rgba(245, 158, 11, 0.35)",
                }}
              >
                <Lock size={22} />
              </div>
            </div>
          </div>
        </Col>
      </Row>

      {/* Chart Section */}
      <Card
        className="glass-card"
        title={
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 0" }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: "#0f172a" }}>
              Khối lượng công việc theo phòng ban
            </span>
            <Tag color="blue" style={{ borderRadius: 6, fontWeight: 600 }}>
              {summary.by_department?.length || 0} phòng ban
            </Tag>
          </div>
        }
        loading={loading}
      >
        {summary.by_department.length === 0 ? (
          <Empty description="Không có dữ liệu phân bổ" style={{ padding: "40px 0" }} />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={summary.by_department} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="department_code" stroke="#64748b" fontSize={12} tickLine={false} />
              <YAxis allowDecimals={false} stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomChartTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                wrapperStyle={{ paddingBottom: 12, fontSize: 12.5 }}
              />
              <Bar dataKey="count" name="Tổng công việc" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={40} />
              <Bar dataKey="overdue" name="Quá hạn" fill="#ef4444" radius={[6, 6, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Activity Table */}
      <Card
        className="glass-card"
        title={
          <span style={{ fontWeight: 700, fontSize: 15, color: "#0f172a" }}>Hoạt động gần đây</span>
        }
        loading={loading}
      >
        <Table
          rowKey="id"
          size="middle"
          dataSource={summary.activity}
          columns={activityColumns}
          pagination={false}
          locale={{ emptyText: <Empty description="Chưa có hoạt động ghi nhận" style={{ padding: 24 }} /> }}
        />
      </Card>
    </div>
  );
}
