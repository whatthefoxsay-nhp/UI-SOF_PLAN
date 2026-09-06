-- Phase 6: sequential task handoff.
-- Handoff status is application-validated VARCHAR, not ENUM.

-- Phase 5 compatibility: REJECTED needs no ALTER because status is VARCHAR.
-- Keep this migration safe when Phase 5 was already applied in the database.
SET @wf_reject_reason_sql = IF(
    EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'wf_task_confirm'
          AND column_name = 'reject_reason'
    ),
    'SELECT 1',
    'ALTER TABLE wf_task_confirm ADD COLUMN reject_reason VARCHAR(500) DEFAULT NULL AFTER note'
);
PREPARE wf_reject_reason_stmt FROM @wf_reject_reason_sql;
EXECUTE wf_reject_reason_stmt;
DEALLOCATE PREPARE wf_reject_reason_stmt;

CREATE TABLE wf_task_template_handoff (
    id INT NOT NULL AUTO_INCREMENT,
    task_template_id INT NOT NULL,
    sequence INT NOT NULL,
    department_code VARCHAR(32) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_wf_tt_handoff_sequence (task_template_id, sequence),
    KEY idx_wf_tt_handoff_template (task_template_id),
    CONSTRAINT fk_wf_tt_handoff_template
        FOREIGN KEY (task_template_id) REFERENCES wf_task_template (id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE wf_task_handoff (
    id INT NOT NULL AUTO_INCREMENT,
    task_id INT NOT NULL,
    project_id INT NOT NULL,
    sequence INT NOT NULL,
    department_code VARCHAR(32) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    started_at DATETIME DEFAULT NULL,
    completed_at DATETIME DEFAULT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_wf_task_handoff_sequence (task_id, sequence),
    KEY idx_wf_task_handoff_task (task_id),
    KEY idx_wf_task_handoff_project (project_id),
    KEY idx_wf_task_handoff_active (task_id, status),
    CONSTRAINT fk_wf_task_handoff_task
        FOREIGN KEY (task_id) REFERENCES wf_project_task (id)
        ON DELETE CASCADE,
    CONSTRAINT fk_wf_task_handoff_project
        FOREIGN KEY (project_id) REFERENCES wf_project (id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
