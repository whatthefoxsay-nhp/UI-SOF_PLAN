-- Master Data Normalization: Create wf_customer and wf_project_type tables
-- Date: 2026-08-29
-- Purpose: Normalize free-text customer_name and project_type fields into master data tables

CREATE TABLE wf_customer (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  created_by VARCHAR(32) DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_wf_customer_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE wf_project_type (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  created_by VARCHAR(32) DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_wf_project_type_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

ALTER TABLE wf_project ADD COLUMN customer_id INT DEFAULT NULL AFTER customer_name;
ALTER TABLE wf_project ADD CONSTRAINT fk_wf_project_customer FOREIGN KEY (customer_id) REFERENCES wf_customer(id);

ALTER TABLE wf_workflow ADD COLUMN project_type_id INT DEFAULT NULL AFTER project_type;
ALTER TABLE wf_workflow ADD CONSTRAINT fk_wf_workflow_project_type FOREIGN KEY (project_type_id) REFERENCES wf_project_type(id);
