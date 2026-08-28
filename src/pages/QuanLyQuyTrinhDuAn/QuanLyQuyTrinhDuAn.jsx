import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import { Tabs } from "antd";
import WorkflowManager from "./WorkflowManager";
import ProjectList from "./ProjectList";
import ProjectDetail from "./ProjectDetail";
import "./styles.css";

export default function QuanLyQuyTrinhDuAn() {
  const location = useLocation();
  const initialTab = new URLSearchParams(location.search).get("tab") === "workflow" ? "workflow" : "projects";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [openProjectId, setOpenProjectId] = useState(null);

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
