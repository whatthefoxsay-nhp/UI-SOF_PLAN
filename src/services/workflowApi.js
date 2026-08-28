import axios from "axios";
import { getAuthHeaders } from "./apiLogin";
import { url_api } from "./url";

const WORKFLOW_API_URL = `${url_api}/workflow-api/index.php`;

async function callWorkflowApi(action, data = {}) {
  const headers = await getAuthHeaders();
  const res = await axios.post(`${WORKFLOW_API_URL}?action=${encodeURIComponent(action)}`, data, {
    headers,
  });
  if (res.data && res.data.success === false) {
    throw new Error(res.data.message || "Có lỗi xảy ra");
  }
  return res.data?.data;
}

// ---- Meta ----
export const getDepartments = () => callWorkflowApi("meta.departments");
export const getEmployees = () => callWorkflowApi("meta.employees");
export const getMyProfile = () => callWorkflowApi("meta.myProfile");

// ---- Workflow template ----
export const listWorkflows = () => callWorkflowApi("workflow.list");
export const getWorkflow = (id) => callWorkflowApi("workflow.get", { id });
export const saveWorkflow = (data) => callWorkflowApi("workflow.save", data);
export const cloneWorkflow = (id, newCode) => callWorkflowApi("workflow.clone", { id, new_code: newCode });
export const toggleWorkflow = (id, isActive) => callWorkflowApi("workflow.toggle", { id, is_active: isActive ? 1 : 0 });
export const deleteWorkflow = (id) => callWorkflowApi("workflow.delete", { id });

// ---- Stage template ----
export const saveStage = (data) => callWorkflowApi("stage.save", data);
export const deleteStage = (id, workflowId) => callWorkflowApi("stage.delete", { id, workflow_id: workflowId });
export const reorderStages = (workflowId, orderedIds) =>
  callWorkflowApi("stage.reorder", { workflow_id: workflowId, ordered_ids: orderedIds });

// ---- Task template ----
export const saveTaskTemplate = (data) => callWorkflowApi("task_template.save", data);
export const deleteTaskTemplate = (id, workflowId) => callWorkflowApi("task_template.delete", { id, workflow_id: workflowId });

// ---- Project ----
export const listProjects = () => callWorkflowApi("project.list");
export const getProject = (id) => callWorkflowApi("project.get", { id });
export const createProject = (data) => callWorkflowApi("project.create", data);

// ---- Kanban column config (dynamic per workflow, snapshot per project) ----
export const saveKanbanColumns = (workflowId, columns) =>
  callWorkflowApi("kanban_column.save", { workflow_id: workflowId, columns });

// ---- Kanban / task ----
export const getKanbanBoard = (projectStageId) => callWorkflowApi("kanban.board", { project_stage_id: projectStageId });
export const getKanbanProjectBoard = (projectId) => callWorkflowApi("kanban.projectBoard", { project_id: projectId });
export const getMyTasks = () => callWorkflowApi("task.myTasks");
export const getTask = (id) => callWorkflowApi("task.get", { id });
export const saveTask = (data) => callWorkflowApi("task.save", data);
export const updateTaskStatus = (id, status) => callWorkflowApi("task.updateStatus", { id, status });
export const confirmTask = (taskId, departmentCode, note = "") =>
  callWorkflowApi("task.confirm", { task_id: taskId, department_code: departmentCode, note });
export const saveTaskItem = (data) => callWorkflowApi("task.item.save", data);
export const deleteTaskItem = (id) => callWorkflowApi("task.item.delete", { id });
export const saveStageExtra = (id, extraData, lockNow = false) =>
  callWorkflowApi("stage.extra.save", { id, extra_data: extraData, lock_now: lockNow });

// ---- Lock request ----
export const requestUnlock = (projectStageId, reason) =>
  callWorkflowApi("lock.request", { project_stage_id: projectStageId, reason });
export const decideLockRequest = (id, approve) => callWorkflowApi("lock.decide", { id, approve });
export const listLockRequests = (projectStageId = null) =>
  callWorkflowApi("lock.list", projectStageId ? { project_stage_id: projectStageId } : {});

// ---- History ----
export const listHistory = (projectId = null, limit = 100) =>
  callWorkflowApi("history.list", { project_id: projectId, limit });

export const TASK_PRIORITY_LABELS = {
  LOW: "Thấp",
  NORMAL: "Bình thường",
  HIGH: "Cao",
  URGENT: "Khẩn cấp",
};

export const STAGE_STATUS_LABELS = {
  PENDING: "Chưa mở",
  OPEN: "Đang mở",
  DONE: "Hoàn thành",
};
