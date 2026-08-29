# Master Data Normalization — Design Spec

**Status:** Phase 2 of the audit-driven roadmap (Phase 1: Dependency & Execution Engine, complete). Executed under the same standing autonomy as Phase 1 — no further per-phase approval requested, per the audit's own priority order (M01 Master Data) and the human partner's explicit continuation authorization.

**Source:** `docs/Audit_va_de_xuat_he_thong_Quan_ly_Quy_trinh_Du_an.docx` §14 ("Single Source of Truth"), §28 ("Workflow phải data-driven... không hard-code").

## 1. Problem

Verified directly in code and the live DB:

- `wf_project.customer_name` and `wf_workflow.project_type` are free-text `varchar` columns with no backing master table — confirmed via direct query: 7 distinct customer names already show inconsistent conventions (`Cong ty ABC` vs `Công ty TNHH ABC` vs `Cty XYZ`), exactly the "typo/duplicate" risk free-text master data invites. Both fields are plain `<Input>` in the frontend today, no autocomplete or reuse.
- `department_code` fields (on `wf_stage`, `wf_task_template`, `wf_project_task`, etc.) have real underlying master data — the legacy `hr_lv0002` table (5 rows, PB001-PB005) — but it is used only to power a dropdown list (`wf_h_departments_list`); no save handler (`wf_h_stage_save`, `wf_h_task_template_save`) actually validates a submitted `department_code` exists there. A typo'd or stale code is silently accepted.

## 2. Scope

**In scope:**
- New `wf_customer` and `wf_project_type` tables (owned entirely within `workflow-api`, no cross-schema constraint issues).
- `wf_project.customer_id` / `wf_workflow.project_type_id` FK columns, backfilled from existing free-text values (deduplicated), with the free-text column kept as a denormalized display cache updated alongside the FK going forward (not dropped — other legacy pages were found to read customer-name-like fields from unrelated sources, so nothing else in the codebase is broken by keeping it, and dropping it is not necessary to achieve the SSOT goal).
- Frontend: replace the two free-text `<Input>` fields with a searchable, creatable `<Select>` (existing options reusable, typing a new value offers to create it inline) — same "reuse existing, minimize re-entry" principle as every other master-data picker already in this app (department, employee).
- Application-level validation: `wf_h_stage_save` and `wf_h_task_template_save` reject a `department_code`/`confirm_departments` entry that doesn't exist in `hr_lv0002`.

**Explicitly out of scope, with reason:**
- **A real DB-level FK from any `wf_*` table to `hr_lv0002`.** Verified: `hr_lv0002` is `utf8mb3`, every `wf_*` table is `utf8mb4` — InnoDB FK constraints require matching column charset, so this would require converting a legacy HR table's charset (or the reverse), a change with blast radius far outside this project's ownership. Application-level validation achieves the same practical correctness (reject invalid codes at write time) without that risk.
- **Dropping `customer_name`/`project_type` text columns.** They stay as a denormalized cache; removing them is a separate, riskier migration with no stated benefit here.
- **Editing/deleting customer or project-type master rows.** Only create-on-first-use is in scope, matching how department codes are managed today (no admin CRUD screen for `hr_lv0002` exists in this app either — it's managed by a different legacy HR module).

## 3. Data model

```sql
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
```

`name` is unique (case-sensitive, matching this schema's existing convention of application-level normalization rather than DB-level case-insensitive collation tricks — the "create if not exists by exact name" flow below is where de-duplication actually happens).

## 4. Backend behavior

- **`wf_h_customer_list` / `wf_h_customer_save`** (new, workflow.php): list returns `id, name`; save does `INSERT ... ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)` keyed on `name` (case-sensitive exact match) — this is the "reuse if it exists, create if it doesn't" primitive the frontend's creatable-select needs in one round trip. Same shape for `wf_h_project_type_list` / `wf_h_project_type_save`.
- **`wf_h_project_create`**: accepts `customer_id` (preferred) OR `customer_name` (back-compat / the creatable-select's "just created" case can pass either) — resolves to a `customer_id`, writes both `customer_id` and a denormalized `customer_name` (looked up from `wf_customer.name` if only `customer_id` was given, or via the customer save primitive if only a name was given and doesn't exist yet).
- **`wf_h_workflow_save`**: same pattern for `project_type_id`/`project_type`.
- **`wf_h_stage_save`**: before saving, validate every `departments` entry and (if present) every existing dependency's implied department exists in `hr_lv0002` — actually only `departments` itself needs validation here (dependencies don't carry department codes). Reject with `wf_error('Mã phòng ban không hợp lệ: <code>')` listing the first invalid code found.
- **`wf_h_task_template_save`**: validate `department_code` and every `confirm_departments` entry the same way.
- **Backfill migration**: for the 7 existing distinct `wf_project.customer_name` values and the 1 existing distinct `wf_workflow.project_type` value, insert into the new tables and backfill the FK columns on existing rows — a one-off SQL/PHP step, not application code.

## 5. Frontend behavior

- **`ProjectList.jsx`**: replace the `customer_name` `<Input>` with a `<Select showSearch>` populated from `workflowApi.listCustomers()`, plus a "Tạo mới: “<đã gõ>”" option injected into the dropdown when the typed search text doesn't match any existing option (standard antd creatable-select recipe: track search text in state, filter `options` client-side, append a synthetic option whose `value` is a sentinel and whose `label` reads "+ Tạo mới ...", handle its selection by calling `workflowApi.saveCustomer(name)` then setting the field to the real returned `id`).
- **`WorkflowManager.jsx`**: identical pattern for `project_type` against `workflowApi.listProjectTypes()`/`saveProjectType()`.
- **`workflowApi.js`**: add `listCustomers`, `saveCustomer`, `listProjectTypes`, `saveProjectType` — same one-line passthrough shape as every other export in this file.

## 6. Self-review

- **Placeholder scan**: none — every table, function, and UI behavior above is concrete.
- **Internal consistency**: the customer and project-type patterns are deliberately identical (same table shape, same save-handler shape, same frontend recipe) — a later implementer can pattern-match one from the other, reducing ambiguity.
- **Scope check**: bounded to 2 new tables + 2 FK columns + 4 new handlers + 2 frontend field replacements + 1 validation hardening + 1 backfill — smaller and lower-risk than Phase 1, appropriately so given this is a "close a gap" phase, not a new engine.
- **Ambiguity check**: the department FK infeasibility (charset mismatch) is stated as fact with the verifying evidence inline, not left for an implementer to rediscover or silently work around differently.
