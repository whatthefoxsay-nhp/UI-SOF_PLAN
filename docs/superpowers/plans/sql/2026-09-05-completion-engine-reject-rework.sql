-- Phase 5: Completion Engine Reject -> Rework
-- Database: hao_erp_sofv5_0
-- wf_task_confirm.status is already VARCHAR(20), so REJECTED is accepted by
-- the application without an ALTER TABLE enum/type change.

ALTER TABLE wf_task_confirm
  ADD COLUMN reject_reason VARCHAR(500) DEFAULT NULL AFTER note;
