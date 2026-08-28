-- ============================================================================
-- WORKFLOW ENGINE SCHEMA - "Quan ly Quy trinh Du an"
-- Theo yeu cau: SOF_PLAN/docs/Yeu cau Xay dung Phan mem Quan ly Quy trinh Du an.docx
--
-- Thiet ke moi, tach rieng khoi cac bang cu (da_lh00xx, cr_lv00xx) vi kien truc
-- khac han: cu la 1 quy trinh co dinh hard-code, moi la Workflow Template dong,
-- co the cau hinh nhieu Workflow cho nhieu loai du an (nguyen tac #1 trong doc).
--
-- Prefix bang: wf_
-- Database: hao_erp_sofv5_0 (local mock)
-- ============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------------------------------------------------------
-- 0. Bo sung 2 phong ban con thieu trong du lieu mau de dung dung vi du trong
--    tai lieu yeu cau (Ke toan, Tester) - chi them vao DB mock local, khong
--    dung toi du lieu that cua cong ty.
-- ----------------------------------------------------------------------------
INSERT INTO `hr_lv0002` (lv001, lv003, lv007, lv099, lv100, lv101, lv102, lv198, lv199, lv200, lv300)
SELECT 'PB004', 'Phong Ke toan', '', '', '', '', '', '', '', '', ''
WHERE NOT EXISTS (SELECT 1 FROM hr_lv0002 WHERE lv001 = 'PB004');

INSERT INTO `hr_lv0002` (lv001, lv003, lv007, lv099, lv100, lv101, lv102, lv198, lv199, lv200, lv300)
SELECT 'PB005', 'Phong Tester', '', '', '', '', '', '', '', '', ''
WHERE NOT EXISTS (SELECT 1 FROM hr_lv0002 WHERE lv001 = 'PB005');

-- ----------------------------------------------------------------------------
-- 1. wf_workflow - Workflow Template (moi loai du an co 1 Workflow rieng)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `wf_workflow`;
CREATE TABLE `wf_workflow` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(50) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `project_type` VARCHAR(100) DEFAULT NULL,
  `description` VARCHAR(1000) DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_by` VARCHAR(32) DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_wf_workflow_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- 2. wf_stage - Giai doan trong 1 Workflow Template
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `wf_stage`;
CREATE TABLE `wf_stage` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `workflow_id` INT NOT NULL,
  `code` VARCHAR(50) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `order_no` INT NOT NULL DEFAULT 0,
  `is_required` TINYINT(1) NOT NULL DEFAULT 1,
  `is_parallel` TINYINT(1) NOT NULL DEFAULT 0,
  `completion_condition` VARCHAR(50) NOT NULL DEFAULT 'ALL_TASKS_DONE',
  `lock_enabled` TINYINT(1) NOT NULL DEFAULT 0,
  `stage_type` VARCHAR(30) DEFAULT 'GENERIC',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_wf_stage_workflow` (`workflow_id`),
  CONSTRAINT `fk_wf_stage_workflow` FOREIGN KEY (`workflow_id`) REFERENCES `wf_workflow` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- 3. wf_stage_department - Phong ban tham gia 1 giai doan (nhieu-nhieu)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `wf_stage_department`;
CREATE TABLE `wf_stage_department` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `stage_id` INT NOT NULL,
  `department_code` VARCHAR(32) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_wf_stage_dept_stage` (`stage_id`),
  CONSTRAINT `fk_wf_stage_dept_stage` FOREIGN KEY (`stage_id`) REFERENCES `wf_stage` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- 4. wf_task_template - Mau cong viec trong 1 giai doan cua Workflow
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `wf_task_template`;
CREATE TABLE `wf_task_template` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `stage_id` INT NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `department_code` VARCHAR(32) DEFAULT NULL,
  `default_priority` VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
  `deadline_offset_days` INT DEFAULT NULL,
  `order_no` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_wf_task_template_stage` (`stage_id`),
  CONSTRAINT `fk_wf_task_template_stage` FOREIGN KEY (`stage_id`) REFERENCES `wf_stage` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- 5. wf_task_template_confirm_dept - Phong ban can xac nhan cho 1 mau cong viec
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `wf_task_template_confirm_dept`;
CREATE TABLE `wf_task_template_confirm_dept` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `task_template_id` INT NOT NULL,
  `department_code` VARCHAR(32) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_wf_ttcd_template` (`task_template_id`),
  CONSTRAINT `fk_wf_ttcd_template` FOREIGN KEY (`task_template_id`) REFERENCES `wf_task_template` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- 6. wf_department_code_prefix - Ma phong ban dung de sinh Ma cong viec tu dong
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `wf_department_code_prefix`;
CREATE TABLE `wf_department_code_prefix` (
  `department_code` VARCHAR(32) NOT NULL,
  `prefix` VARCHAR(10) NOT NULL,
  `next_seq` INT NOT NULL DEFAULT 1,
  PRIMARY KEY (`department_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `wf_department_code_prefix` (department_code, prefix, next_seq) VALUES
('PB001', 'TEC', 1),
('PB002', 'KD', 1),
('PB003', 'NS', 1),
('PB004', 'ACC', 1),
('PB005', 'TST', 1);

-- ----------------------------------------------------------------------------
-- 7. wf_project - Du an thuc te, sinh ra tu 1 Workflow Template
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `wf_project`;
CREATE TABLE `wf_project` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(50) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `customer_name` VARCHAR(255) DEFAULT NULL,
  `workflow_id` INT NOT NULL,
  `status` VARCHAR(30) NOT NULL DEFAULT 'IN_PROGRESS',
  `current_stage_id` INT DEFAULT NULL,
  `created_by` VARCHAR(32) DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_wf_project_code` (`code`),
  KEY `idx_wf_project_workflow` (`workflow_id`),
  CONSTRAINT `fk_wf_project_workflow` FOREIGN KEY (`workflow_id`) REFERENCES `wf_workflow` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- 8. wf_project_stage - Ban sao (instance) cua giai doan cho 1 du an cu the
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `wf_project_stage`;
CREATE TABLE `wf_project_stage` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `project_id` INT NOT NULL,
  `stage_template_id` INT DEFAULT NULL,
  `code` VARCHAR(50) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `order_no` INT NOT NULL DEFAULT 0,
  `is_required` TINYINT(1) NOT NULL DEFAULT 1,
  `is_parallel` TINYINT(1) NOT NULL DEFAULT 0,
  `completion_condition` VARCHAR(50) NOT NULL DEFAULT 'ALL_TASKS_DONE',
  `stage_type` VARCHAR(30) DEFAULT 'GENERIC',
  `lock_enabled` TINYINT(1) NOT NULL DEFAULT 0,
  `is_locked` TINYINT(1) NOT NULL DEFAULT 0,
  `status` VARCHAR(30) NOT NULL DEFAULT 'PENDING',
  `department_json` VARCHAR(500) DEFAULT NULL,
  `extra_data` JSON DEFAULT NULL,
  `started_at` DATETIME DEFAULT NULL,
  `completed_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_wf_pstage_project` (`project_id`),
  CONSTRAINT `fk_wf_pstage_project` FOREIGN KEY (`project_id`) REFERENCES `wf_project` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- 9. wf_project_task - Cong viec thuc te trong 1 giai doan cua du an
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `wf_project_task`;
CREATE TABLE `wf_project_task` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `project_id` INT NOT NULL,
  `project_stage_id` INT NOT NULL,
  `code` VARCHAR(30) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `department_code` VARCHAR(32) DEFAULT NULL,
  `assignee_code` VARCHAR(32) DEFAULT NULL,
  `deadline` DATE DEFAULT NULL,
  `priority` VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
  `status` VARCHAR(20) NOT NULL DEFAULT 'TODO',
  `completion_condition` VARCHAR(50) DEFAULT NULL,
  `order_no` INT NOT NULL DEFAULT 0,
  `extra_data` JSON DEFAULT NULL,
  `created_by` VARCHAR(32) DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `completed_at` DATETIME DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_wf_ptask_code` (`code`),
  KEY `idx_wf_ptask_stage` (`project_stage_id`),
  KEY `idx_wf_ptask_project` (`project_id`),
  CONSTRAINT `fk_wf_ptask_stage` FOREIGN KEY (`project_stage_id`) REFERENCES `wf_project_stage` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- 10. wf_task_confirm - Xac nhan cua tung phong ban tren 1 cong viec
--     (Cong viec chi DONE khi tat ca dong PENDING -> CONFIRMED)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `wf_task_confirm`;
CREATE TABLE `wf_task_confirm` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `task_id` INT NOT NULL,
  `department_code` VARCHAR(32) NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  `confirmed_by` VARCHAR(32) DEFAULT NULL,
  `confirmed_at` DATETIME DEFAULT NULL,
  `note` VARCHAR(500) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_wf_taskconfirm_task` (`task_id`),
  CONSTRAINT `fk_wf_taskconfirm_task` FOREIGN KEY (`task_id`) REFERENCES `wf_project_task` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- 11. wf_task_item - Du lieu con linh hoat gan vao 1 cong viec: checklist ban
--     giao, bug cua Tester, phan bo ngay cong lap trinh, dot thanh toan ke
--     toan, ticket bao tri... phan biet boi item_type de khong phai tao rieng
--     6 bang cung nhac lai cung 1 cau truc.
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `wf_task_item`;
CREATE TABLE `wf_task_item` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `task_id` INT NOT NULL,
  `item_type` VARCHAR(30) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `status` VARCHAR(30) DEFAULT NULL,
  `priority` VARCHAR(20) DEFAULT NULL,
  `assignee_code` VARCHAR(32) DEFAULT NULL,
  `extra_data` JSON DEFAULT NULL,
  `created_by` VARCHAR(32) DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_wf_taskitem_task` (`task_id`),
  CONSTRAINT `fk_wf_taskitem_task` FOREIGN KEY (`task_id`) REFERENCES `wf_project_task` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- 12. wf_lock_request - Yeu cau mo khoa giai doan da LOCK (vd: Hop dong & loi
--     nhuan), can nguoi co quyen duyet
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `wf_lock_request`;
CREATE TABLE `wf_lock_request` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `project_stage_id` INT NOT NULL,
  `reason` VARCHAR(500) DEFAULT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  `requested_by` VARCHAR(32) DEFAULT NULL,
  `requested_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `approved_by` VARCHAR(32) DEFAULT NULL,
  `approved_at` DATETIME DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_wf_lockreq_stage` (`project_stage_id`),
  CONSTRAINT `fk_wf_lockreq_stage` FOREIGN KEY (`project_stage_id`) REFERENCES `wf_project_stage` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- 13. wf_history - Nhat ky hoat dong (ai lam gi, luc nao, xac nhan luc nao)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `wf_history`;
CREATE TABLE `wf_history` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `project_id` INT DEFAULT NULL,
  `entity_type` VARCHAR(30) NOT NULL,
  `entity_id` INT NOT NULL,
  `action` VARCHAR(100) NOT NULL,
  `actor_code` VARCHAR(32) DEFAULT NULL,
  `detail` VARCHAR(1000) DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_wf_history_project` (`project_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- SEED: 1 Workflow mau dung dung vi du trong tai lieu yeu cau (muc 19)
-- ============================================================================
INSERT INTO `wf_workflow` (id, code, name, project_type, description, is_active, created_by) VALUES
(1, 'WF-SW-001', 'Xay dung phan mem theo yeu cau', 'Phan mem', 'Quy trinh mau: Khach hang tiem nang -> Tu van -> Hop dong -> Lap trinh -> Tester -> Ban giao -> Thu tien -> Bao tri', 1, 'admin');

INSERT INTO `wf_stage` (id, workflow_id, code, name, order_no, is_required, is_parallel, completion_condition, lock_enabled, stage_type) VALUES
(1, 1, 'GD01', 'Khach hang tiem nang', 1, 1, 0, 'ALL_TASKS_DONE', 0, 'GENERIC'),
(2, 1, 'GD02', 'Tu van & bao gia', 2, 1, 0, 'ALL_TASKS_DONE', 0, 'GENERIC'),
(3, 1, 'GD03', 'Hop dong & loi nhuan', 3, 1, 0, 'ALL_TASKS_DONE', 1, 'CONTRACT'),
(4, 1, 'GD04', 'Thuc thi lap trinh', 4, 1, 0, 'ALL_TASKS_DONE', 0, 'EXECUTION'),
(5, 1, 'GD05', 'Tester', 5, 1, 0, 'ALL_TASKS_DONE', 0, 'TESTER'),
(6, 1, 'GD06', 'Ban giao', 6, 1, 0, 'ALL_TASKS_DONE', 0, 'HANDOVER'),
(7, 1, 'GD07', 'Thu tien', 7, 1, 0, 'ALL_TASKS_DONE', 0, 'PAYMENT'),
(8, 1, 'GD08', 'Bao tri', 8, 0, 0, 'MANUAL', 0, 'MAINTENANCE');

INSERT INTO `wf_stage_department` (stage_id, department_code) VALUES
(1, 'PB002'), -- Kinh doanh
(2, 'PB002'), (2, 'PB001'), -- Kinh doanh + Ky thuat
(3, 'PB002'), (3, 'PB001'),
(4, 'PB001'), (4, 'PB005'),
(5, 'PB005'), (5, 'PB001'),
(6, 'PB001'), (6, 'PB002'),
(7, 'PB004'), (7, 'PB002'),
(8, 'PB001');

INSERT INTO `wf_task_template` (stage_id, name, department_code, default_priority, deadline_offset_days, order_no) VALUES
(1, 'Tim khach hang', 'PB002', 'NORMAL', 5, 1),
(1, 'Goi dien tu van', 'PB002', 'NORMAL', 7, 2),
(1, 'Xac dinh nhu cau', 'PB002', 'NORMAL', 10, 3),
(2, 'Tiep nhan yeu cau', 'PB002', 'NORMAL', 3, 1),
(2, 'Uoc tinh ngay cong', 'PB001', 'HIGH', 5, 2),
(2, 'Hoan thien bao gia', 'PB002', 'HIGH', 7, 3),
(3, 'Chot hop dong', 'PB002', 'HIGH', 5, 1),
(4, 'Phan cong lap trinh vien', 'PB001', 'HIGH', 2, 1),
(5, 'Kiem thu chuc nang', 'PB005', 'HIGH', 5, 1),
(6, 'Chuan bi checklist ban giao', 'PB001', 'NORMAL', 3, 1),
(7, 'Theo doi cong no', 'PB004', 'NORMAL', 3, 1),
(8, 'Tiep nhan yeu cau bao tri', 'PB001', 'NORMAL', NULL, 1);

INSERT INTO `wf_task_template_confirm_dept` (task_template_id, department_code)
SELECT id, 'PB002' FROM wf_task_template WHERE stage_id = 3 AND name = 'Chot hop dong';
INSERT INTO `wf_task_template_confirm_dept` (task_template_id, department_code)
SELECT id, 'PB001' FROM wf_task_template WHERE stage_id = 3 AND name = 'Chot hop dong';
