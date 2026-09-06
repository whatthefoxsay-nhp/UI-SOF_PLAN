import React, { useState, useEffect } from "react";
import { useLocation, useParams } from "react-router-dom";
import { Tabs } from "antd";
import WorkflowManager from "./WorkflowManager";
import ProjectList from "./ProjectList";
import ProjectDetail from "./ProjectDetail";
import MyTasksTab from "./MyTasksTab";
import Dashboard from "./Dashboard";
import "./styles.css";

function resolveTab(tabParam) {
  if (tabParam === "workflow") return "workflow";
  if (tabParam === "my-tasks") return "my-tasks";
  if (tabParam === "dashboard") return "dashboard";
  return "projects";
}

export default function QuanLyQuyTrinhDuAn() {
  const location = useLocation();
  const params = useParams();
  const searchParams = new URLSearchParams(location.search);
  const tabParam = searchParams.get("tab");
  const projectIdParam = searchParams.get("projectId") || params.projectId;

  const [activeTab, setActiveTab] = useState(resolveTab(tabParam));
  const [openProjectId, setOpenProjectId] = useState(projectIdParam ? Number(projectIdParam) : null);

  useEffect(() => {
    setOpenProjectId(projectIdParam ? Number(projectIdParam) : null);
    if (projectIdParam) {
      setActiveTab("projects");
    } else {
      setActiveTab(resolveTab(tabParam));
    }
  }, [tabParam, projectIdParam]);

  return (
    <div style={{ padding: 16 }}>
      <Tabs
        activeKey={activeTab}
        onChange={(key) => {
          setActiveTab(key);
          if (key !== "projects") setOpenProjectId(null);
        }}
        items={[
          {
            key: "dashboard",
            label: "Tổng quan",
            children: <Dashboard />,
          },
          {
            key: "my-tasks",
            label: "Công việc của tôi",
            children: <MyTasksTab />,
          },
          {
            key: "projects",
            label: "Dự án",
            children: openProjectId ? (
              <ProjectDetail projectId={openProjectId} onBack={() => setOpenProjectId(null)} />
            ) : (
              <ProjectList onOpenProject={setOpenProjectId} />
            ),
          },
          {
            key: "workflow",
            label: "Workflow mẫu",
            children: <WorkflowManager />,
          },
        ]}
      />
    </div>
  );
}
