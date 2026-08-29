-- Dependency & Execution Engine schema (audit Phase 1)
-- Apply against database hao_erp_sofv5_0 (both workflow-api and legacy
-- backend share this one DB per logged-in session).

ALTER TABLE wf_stage ADD COLUMN dependency_join_type VARCHAR(5) NOT NULL DEFAULT 'ALL' AFTER completion_condition;
ALTER TABLE wf_task_template ADD COLUMN dependency_join_type VARCHAR(5) NOT NULL DEFAULT 'ALL' AFTER default_priority;
ALTER TABLE wf_project_stage ADD COLUMN dependency_join_type VARCHAR(5) NOT NULL DEFAULT 'ALL' AFTER completion_condition;
ALTER TABLE wf_project_stage ADD COLUMN execution_state VARCHAR(10) NOT NULL DEFAULT 'READY' AFTER status;
ALTER TABLE wf_project_task ADD COLUMN dependency_join_type VARCHAR(5) NOT NULL DEFAULT 'ALL' AFTER priority;
ALTER TABLE wf_project_task ADD COLUMN execution_state VARCHAR(10) NOT NULL DEFAULT 'READY' AFTER status;

CREATE TABLE wf_stage_dependency (
  id INT NOT NULL AUTO_INCREMENT,
  stage_id INT NOT NULL,
  depends_on_stage_id INT NOT NULL,
  dependency_type VARCHAR(10) NOT NULL DEFAULT 'FS',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_wf_stage_dep (stage_id, depends_on_stage_id),
  KEY idx_wf_stage_dep_stage (stage_id),
  KEY idx_wf_stage_dep_depends_on (depends_on_stage_id),
  CONSTRAINT fk_wf_stage_dep_stage FOREIGN KEY (stage_id) REFERENCES wf_stage(id) ON DELETE CASCADE,
  CONSTRAINT fk_wf_stage_dep_depends_on FOREIGN KEY (depends_on_stage_id) REFERENCES wf_stage(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE wf_task_template_dependency (
  id INT NOT NULL AUTO_INCREMENT,
  task_template_id INT NOT NULL,
  depends_on_task_template_id INT NOT NULL,
  dependency_type VARCHAR(10) NOT NULL DEFAULT 'FS',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_wf_task_tpl_dep (task_template_id, depends_on_task_template_id),
  KEY idx_wf_task_tpl_dep_task (task_template_id),
  KEY idx_wf_task_tpl_dep_depends_on (depends_on_task_template_id),
  CONSTRAINT fk_wf_task_tpl_dep_task FOREIGN KEY (task_template_id) REFERENCES wf_task_template(id) ON DELETE CASCADE,
  CONSTRAINT fk_wf_task_tpl_dep_depends_on FOREIGN KEY (depends_on_task_template_id) REFERENCES wf_task_template(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE wf_project_stage_dependency (
  id INT NOT NULL AUTO_INCREMENT,
  project_id INT NOT NULL,
  stage_id INT NOT NULL,
  depends_on_stage_id INT NOT NULL,
  dependency_type VARCHAR(10) NOT NULL DEFAULT 'FS',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_wf_pstage_dep (stage_id, depends_on_stage_id),
  KEY idx_wf_pstage_dep_project (project_id),
  KEY idx_wf_pstage_dep_stage (stage_id),
  KEY idx_wf_pstage_dep_depends_on (depends_on_stage_id),
  CONSTRAINT fk_wf_pstage_dep_project FOREIGN KEY (project_id) REFERENCES wf_project(id) ON DELETE CASCADE,
  CONSTRAINT fk_wf_pstage_dep_stage FOREIGN KEY (stage_id) REFERENCES wf_project_stage(id) ON DELETE CASCADE,
  CONSTRAINT fk_wf_pstage_dep_depends_on FOREIGN KEY (depends_on_stage_id) REFERENCES wf_project_stage(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE wf_project_task_dependency (
  id INT NOT NULL AUTO_INCREMENT,
  project_id INT NOT NULL,
  task_id INT NOT NULL,
  depends_on_task_id INT NOT NULL,
  dependency_type VARCHAR(10) NOT NULL DEFAULT 'FS',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_wf_ptask_dep (task_id, depends_on_task_id),
  KEY idx_wf_ptask_dep_project (project_id),
  KEY idx_wf_ptask_dep_task (task_id),
  KEY idx_wf_ptask_dep_depends_on (depends_on_task_id),
  CONSTRAINT fk_wf_ptask_dep_project FOREIGN KEY (project_id) REFERENCES wf_project(id) ON DELETE CASCADE,
  CONSTRAINT fk_wf_ptask_dep_task FOREIGN KEY (task_id) REFERENCES wf_project_task(id) ON DELETE CASCADE,
  CONSTRAINT fk_wf_ptask_dep_depends_on FOREIGN KEY (depends_on_task_id) REFERENCES wf_project_task(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
