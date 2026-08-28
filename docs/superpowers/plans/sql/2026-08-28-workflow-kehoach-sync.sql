-- 2026-08-28-workflow-kehoach-sync.sql
-- Run against the per-tenant MySQL database used by both workflow-api and
-- the legacy services.sof.vn backend (same DB_DATABASE).

ALTER TABLE cr_lv0004 ADD COLUMN wf_project_id INT NULL;
ALTER TABLE cr_lv0005 ADD COLUMN wf_task_id INT NULL;

CREATE TABLE wf_kanban_status_map (
  id INT AUTO_INCREMENT PRIMARY KEY,
  workflow_id INT NOT NULL,
  column_code VARCHAR(50) NOT NULL,
  plan_status_value TINYINT NOT NULL,
  is_reverse_target TINYINT(1) NOT NULL DEFAULT 0,
  UNIQUE KEY uq_workflow_column (workflow_id, column_code)
);
