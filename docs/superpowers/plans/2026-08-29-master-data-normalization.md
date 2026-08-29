# Master Data Normalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace free-text `customer_name`/`project_type` with real, reusable master-data tables (searchable + creatable in the UI), and harden `department_code` validation against the real `hr_lv0002` table it was already silently trusting.

**Architecture:** Two new small master tables (`wf_customer`, `wf_project_type`) owned entirely within `workflow-api`. FK columns added to `wf_project`/`wf_workflow`, with the existing free-text columns kept as a denormalized display cache (not dropped). A single "get-or-create by exact name" save primitive per table backs a creatable `<Select>` in the two places these values are entered.

**Tech Stack:** PHP 8.3 + mysqli (workflow-api), MySQL 8, React 18 + antd. No automated test suite anywhere in this stack — verify via standalone PHP harnesses + `npm start`/build, same as Phase 1.

**Spec:** `docs/superpowers/specs/2026-08-29-master-data-normalization-design.md`

## Global Constraints

- **No version control on the PHP backend** (`c:/laragon/www/v2.des.plan.banhangonline.top/workflow-api/`) — read each function in full before editing, no git safety net.
- **No DB-level FK from any `wf_*` table to `hr_lv0002`** — verified charset mismatch (`hr_lv0002` is `utf8mb3`, `wf_*` tables are `utf8mb4`) makes this infeasible without a legacy-table charset migration outside this project's scope. Department validation is application-level only.
- `wf_customer`/`wf_project_type` "save" is a get-or-create-by-exact-name primitive (`INSERT ... ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)`), not a general CRUD save — there is no edit/delete in this phase.
- MySQL connection for standalone scripts/harnesses: `mysqli_connect('localhost','root','')` + `mysqli_select_db($link,'hao_erp_sofv5_0')`.
- PHP CLI: `/c/laragon/bin/php/php-8.3.30-Win32-vs16-x64/php.exe` (Git Bash path), `php -l` required on every touched PHP file.
- Laragon (MySQL+Apache) must be running for any live verification.

---

### Task 1: DB schema migration + backfill

**Files:**
- Create: `docs/superpowers/plans/sql/2026-08-29-master-data-normalization.sql`

**Interfaces:**
- Produces: `wf_customer(id, name, created_by, created_at)`, `wf_project_type(id, name, created_by, created_at)`, `wf_project.customer_id`, `wf_workflow.project_type_id` — every later task reads/writes these.

- [ ] **Step 1: Write and apply the migration**

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

- [ ] **Step 2: Backfill existing distinct values**

Run (as a standalone PHP script, not raw SQL, so `TRIM()`-normalized dedup logic is easy to express — direct mysqli, same pattern as every prior script this session):

```php
<?php
$link = mysqli_connect('localhost', 'root', '');
mysqli_select_db($link, 'hao_erp_sofv5_0');

$r = mysqli_query($link, "SELECT id, customer_name FROM wf_project WHERE customer_name IS NOT NULL AND TRIM(customer_name) <> ''");
while ($row = mysqli_fetch_assoc($r)) {
    $name = trim($row['customer_name']);
    $stmt = mysqli_prepare($link, "INSERT INTO wf_customer (name) VALUES (?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)");
    mysqli_stmt_bind_param($stmt, 's', $name);
    mysqli_stmt_execute($stmt);
    $customerId = mysqli_insert_id($link);
    $upd = mysqli_prepare($link, "UPDATE wf_project SET customer_id=? WHERE id=?");
    mysqli_stmt_bind_param($upd, 'ii', $customerId, $row['id']);
    mysqli_stmt_execute($upd);
}

$r = mysqli_query($link, "SELECT id, project_type FROM wf_workflow WHERE project_type IS NOT NULL AND TRIM(project_type) <> ''");
while ($row = mysqli_fetch_assoc($r)) {
    $name = trim($row['project_type']);
    $stmt = mysqli_prepare($link, "INSERT INTO wf_project_type (name) VALUES (?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)");
    mysqli_stmt_bind_param($stmt, 's', $name);
    mysqli_stmt_execute($stmt);
    $typeId = mysqli_insert_id($link);
    $upd = mysqli_prepare($link, "UPDATE wf_workflow SET project_type_id=? WHERE id=?");
    mysqli_stmt_bind_param($upd, 'ii', $typeId, $row['id']);
    mysqli_stmt_execute($upd);
}
echo "Backfill done.\n";
```

Note: `mysqli_insert_id()` after an `ON DUPLICATE KEY UPDATE ... id=LAST_INSERT_ID(id)` correctly returns the EXISTING row's id when a duplicate name is hit (this is the documented MySQL behavior this exact SQL idiom relies on) — verify this is actually true empirically in Step 3, don't just assume the idiom works as documented, since a wrong assumption here would silently link projects to the wrong customer.

- [ ] **Step 3: Verify**

Confirm `SELECT COUNT(*) FROM wf_customer` = number of distinct trimmed `customer_name` values in `wf_project` (7 at time of writing, all already distinct — confirm no accidental collapsing happened). Confirm every `wf_project.customer_id` is non-null and points at the row whose `name` matches its own `customer_name` (trimmed). Same checks for `wf_project_type`/`wf_workflow`. Re-run the backfill script a second time and confirm `wf_customer`/`wf_project_type` row counts do NOT change (the `ON DUPLICATE KEY UPDATE` idiom must be idempotent).

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/plans/sql/2026-08-29-master-data-normalization.sql
git commit -m "Add DB migration for Master Data normalization (wf_customer, wf_project_type)"
```

---

### Task 2: Backend — customer/project-type list+save handlers, route registration

**Files:**
- Modify: `c:/laragon/www/v2.des.plan.banhangonline.top/workflow-api/handlers/workflow.php`
- Modify: `c:/laragon/www/v2.des.plan.banhangonline.top/workflow-api/index.php`

**Interfaces:**
- Consumes: `wf_customer`/`wf_project_type` tables from Task 1.
- Produces: routes `customer.list`, `customer.save`, `project_type.list`, `project_type.save`. Task 3 (project/workflow creation) and Task 5 (frontend service) both depend on these exact route names.

- [ ] **Step 1: Add the four handler functions to `workflow.php`**

Add near `wf_h_departments_list` (same "meta" grouping):

```php
function wf_h_customer_list($input)
{
    $rows = wf_query("SELECT id, name FROM wf_customer ORDER BY name");
    wf_json_response(['success' => true, 'data' => $rows]);
}

function wf_h_customer_save($input)
{
    $name = trim((string)($input['name'] ?? ''));
    if ($name === '') wf_error('Thiếu tên khách hàng');
    wf_execute("INSERT INTO wf_customer (name, created_by) VALUES (?, ?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)", 'ss', [$name, wf_current_user()]);
    $link = db_connect();
    $id = mysqli_insert_id($link);
    wf_json_response(['success' => true, 'data' => ['id' => $id, 'name' => $name]]);
}

function wf_h_project_type_list($input)
{
    $rows = wf_query("SELECT id, name FROM wf_project_type ORDER BY name");
    wf_json_response(['success' => true, 'data' => $rows]);
}

function wf_h_project_type_save($input)
{
    $name = trim((string)($input['name'] ?? ''));
    if ($name === '') wf_error('Thiếu tên loại dự án');
    wf_execute("INSERT INTO wf_project_type (name, created_by) VALUES (?, ?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)", 'ss', [$name, wf_current_user()]);
    $link = db_connect();
    $id = mysqli_insert_id($link);
    wf_json_response(['success' => true, 'data' => ['id' => $id, 'name' => $name]]);
}
```

`wf_execute` (db.php) doesn't itself return the insert id in a form usable after an `ON DUPLICATE KEY UPDATE` — call `mysqli_insert_id($link)` directly afterward (as above), which correctly reflects `LAST_INSERT_ID(id)`'s value per the SQL idiom. Verify this empirically in Step 3, don't assume.

- [ ] **Step 2: Register the 4 routes in `index.php`**

Add to the `$routes` array, in the `meta.*` grouping:

```php
'customer.list' => 'handlers/workflow.php:wf_h_customer_list',
'customer.save' => 'handlers/workflow.php:wf_h_customer_save',
'project_type.list' => 'handlers/workflow.php:wf_h_project_type_list',
'project_type.save' => 'handlers/workflow.php:wf_h_project_type_save',
```

- [ ] **Step 3: `php -l` + live verification**

```bash
"/c/laragon/bin/php/php-8.3.30-Win32-vs16-x64/php.exe" -l "c:/laragon/www/v2.des.plan.banhangonline.top/workflow-api/handlers/workflow.php"
"/c/laragon/bin/php/php-8.3.30-Win32-vs16-x64/php.exe" -l "c:/laragon/www/v2.des.plan.banhangonline.top/workflow-api/index.php"
```

Write a standalone script that requires `db.php` + `workflow.php` directly (stub `db_connect()`/`getallheaders()` as admin, same pattern used throughout this session) and calls `wf_h_customer_save(['name' => 'Test Co A'])` twice in a row — confirm the SAME `id` comes back both times (proving the get-or-create idiom actually works, not just that it looks right), and confirm `wf_h_customer_list` includes it exactly once. Clean up the test row afterward. Repeat for `wf_h_project_type_save`.

---

### Task 3: Project/workflow creation resolve customer_id / project_type_id

**Files:**
- Modify: `c:/laragon/www/v2.des.plan.banhangonline.top/workflow-api/handlers/project.php`
- Modify: `c:/laragon/www/v2.des.plan.banhangonline.top/workflow-api/handlers/workflow.php`

**Interfaces:**
- Consumes: `wf_customer`/`wf_project_type` tables and their save primitives from Task 2.
- Produces: `wf_h_project_create` and `wf_h_workflow_save` now write `customer_id`/`project_type_id` alongside the existing denormalized text columns.

- [ ] **Step 1: `wf_h_project_create` resolves `customer_id`**

Near the top of `wf_h_project_create` (project.php), where `$customerName` is currently read, add:

```php
$customerId = (int)($input['customer_id'] ?? 0);
if ($customerId <= 0 && $customerName !== '') {
    wf_execute("INSERT INTO wf_customer (name, created_by) VALUES (?, ?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)", 'ss', [$customerName, $actor]);
    $customerId = mysqli_insert_id(db_connect());
} elseif ($customerId > 0) {
    $rows = wf_query("SELECT name FROM wf_customer WHERE id=?", 'i', [$customerId]);
    if (count($rows) > 0) $customerName = $rows[0]['name'];
}
```

(Place this after `$actor = wf_current_user();` is assigned, since it's used above — check the existing variable order in the function before inserting, do not assume it's already available at the point you edit.) Add `customer_id` to the `wf_project` INSERT's column list/VALUES/params using `$customerId` (or `null` if it's still `0`/unresolved — use `$customerId > 0 ? $customerId : null`).

- [ ] **Step 2: `wf_h_workflow_save` resolves `project_type_id`, insert branch only**

Same pattern in `wf_h_workflow_save`'s INSERT branch (not the UPDATE branch — matches this function's existing precedent of only touching insert-time defaults elsewhere in this file, e.g. `wf_seed_default_status_map`):

```php
$projectTypeId = (int)($input['project_type_id'] ?? 0);
if ($projectTypeId <= 0 && $projectType !== '') {
    wf_execute("INSERT INTO wf_project_type (name, created_by) VALUES (?, ?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)", 'ss', [$projectType, $actor]);
    $projectTypeId = mysqli_insert_id(db_connect());
} elseif ($projectTypeId > 0) {
    $rows = wf_query("SELECT name FROM wf_project_type WHERE id=?", 'i', [$projectTypeId]);
    if (count($rows) > 0) $projectType = $rows[0]['name'];
}
```

Add `project_type_id` to the `wf_workflow` INSERT's column list/VALUES/params.

- [ ] **Step 3: `php -l` + live verification**

Syntax-check both files. Live-test: call `wf_h_project_create` with `customer_name: 'Test Co B'` (no `customer_id`) → confirm a `wf_customer` row was created and `wf_project.customer_id` points at it. Call it again with `customer_id` set to that same id and no name → confirm `wf_project.customer_name` on the new row was correctly backfilled from the customer table. Same two scenarios for `wf_h_workflow_save`/`project_type`. Clean up test rows.

---

### Task 4: Department validation hardening

**Files:**
- Modify: `c:/laragon/www/v2.des.plan.banhangonline.top/workflow-api/handlers/workflow.php`

**Interfaces:**
- Consumes: legacy `hr_lv0002` table (read-only, pre-existing).
- Produces: `wf_h_stage_save` and `wf_h_task_template_save` now reject unknown department codes.

- [ ] **Step 1: Add a validation helper**

Add near the top of `workflow.php`:

```php
// Kiem tra 1 danh sach ma phong ban co ton tai that trong hr_lv0002 hay
// khong. Tra ve ma dau tien khong hop le, hoac null neu tat ca hop le.
function wf_first_invalid_department_code($codes)
{
    $codes = array_values(array_unique(array_filter(array_map('trim', $codes), fn($c) => $c !== '')));
    if (count($codes) === 0) return null;
    $placeholders = implode(',', array_fill(0, count($codes), '?'));
    $types = str_repeat('s', count($codes));
    $found = wf_query("SELECT lv001 FROM hr_lv0002 WHERE lv001 IN ($placeholders)", $types, $codes);
    $foundCodes = array_map(fn($r) => $r['lv001'], $found);
    foreach ($codes as $c) {
        if (!in_array($c, $foundCodes, true)) return $c;
    }
    return null;
}
```

- [ ] **Step 2: Call it in `wf_h_stage_save`**

Right after `$departments = is_array($input['departments'] ?? null) ? $input['departments'] : [];` is read, add:

```php
$invalidDept = wf_first_invalid_department_code($departments);
if ($invalidDept !== null) wf_error("Mã phòng ban không hợp lệ: $invalidDept");
```

- [ ] **Step 3: Call it in `wf_h_task_template_save`**

Right after `$confirmDepartments = is_array($input['confirm_departments'] ?? null) ? $input['confirm_departments'] : [];` is read, add:

```php
$deptsToCheck = array_filter(array_merge([$departmentCode], $confirmDepartments), fn($c) => $c !== '');
$invalidDept = wf_first_invalid_department_code($deptsToCheck);
if ($invalidDept !== null) wf_error("Mã phòng ban không hợp lệ: $invalidDept");
```

(`$departmentCode` is allowed to be empty per this function's existing behavior — the `array_filter` above drops empty strings before checking, so an unset department stays unset rather than being flagged.)

- [ ] **Step 4: `php -l` + live verification**

Test: `wf_h_stage_save` with `departments: ['PB001', 'ZZZZZZ']` → rejected with the exact invalid code named. With `departments: ['PB001', 'PB002']` (both real) → succeeds normally (no regression — re-run one of Task 2's original stage-save scenarios to confirm). Same for `wf_h_task_template_save` with a bad `department_code` and with a bad entry in `confirm_departments`.

---

### Task 5: `workflowApi.js` — new exports

**Files:**
- Modify: `e:/SOF/PLAN/SOF_PLAN/src/services/workflowApi.js`

**Interfaces:**
- Consumes: the 4 routes from Task 2.
- Produces: `listCustomers()`, `saveCustomer(name)`, `listProjectTypes()`, `saveProjectType(name)` — Tasks 6/7 (frontend) depend on these exact names.

- [ ] **Step 1: Add the exports**

In the `// ---- Meta ----` section, after `getDepartments`:

```js
export const listCustomers = () => callWorkflowApi("customer.list");
export const saveCustomer = (name) => callWorkflowApi("customer.save", { name });
export const listProjectTypes = () => callWorkflowApi("project_type.list");
export const saveProjectType = (name) => callWorkflowApi("project_type.save", { name });
```

- [ ] **Step 2: Verify**

`npm run build` succeeds; ESLint clean.

---

### Task 6: `ProjectList.jsx` — creatable customer select

**Files:**
- Modify: `e:/SOF/PLAN/SOF_PLAN/src/pages/QuanLyQuyTrinhDuAn/ProjectList.jsx`

**Interfaces:**
- Consumes: `workflowApi.listCustomers()`/`saveCustomer()` (Task 5).

- [ ] **Step 1: Load customers, track search text**

Add state near the existing `workflows` state:
```js
const [customers, setCustomers] = useState([]);
const [customerSearch, setCustomerSearch] = useState("");
```

In `load()`, extend the `Promise.all` to also fetch customers:
```js
const [p, w, c] = await Promise.all([workflowApi.listProjects(), workflowApi.listWorkflows(), workflowApi.listCustomers()]);
setProjects(p || []);
setWorkflows((w || []).filter((x) => x.is_active));
setCustomers(c || []);
```

- [ ] **Step 2: Replace the `customer_name` Form.Item with a creatable Select**

```jsx
<Form.Item name="customer_id" label="Khách hàng / CTY">
  <Select
    showSearch
    placeholder="Chọn hoặc gõ tên khách hàng mới..."
    filterOption={(input, option) => (option?.label ?? "").toLowerCase().includes(input.toLowerCase())}
    onSearch={setCustomerSearch}
    options={[
      ...customers.map((c) => ({ value: c.id, label: c.name })),
      ...(customerSearch.trim() && !customers.some((c) => c.name.toLowerCase() === customerSearch.trim().toLowerCase())
        ? [{ value: `__new__:${customerSearch.trim()}`, label: `+ Tạo mới "${customerSearch.trim()}"` }]
        : []),
    ]}
    onChange={async (value) => {
      if (typeof value === "string" && value.startsWith("__new__:")) {
        const name = value.slice("__new__:".length);
        try {
          const created = await workflowApi.saveCustomer(name);
          setCustomers((prev) => [...prev, created]);
          form.setFieldsValue({ customer_id: created.id });
        } catch (e) {
          message.error(e.message);
        }
      }
    }}
  />
</Form.Item>
```

Note: `Select`'s `onChange` fires with the synthetic `__new__:...` value first (since it was a real option the user clicked); the handler then overwrites the field with the real numeric id once creation succeeds, so the form ultimately submits a real `customer_id`. This two-step flow is necessary because antd's `Select` has no built-in "create" mode — it's a standard, documented recipe for retrofitting one, not an improvised hack.

- [ ] **Step 3: `submit()` needs no change**

`workflowApi.createProject(values)` already spreads the whole form object — `customer_id` rides along automatically, same as Task 5's dependency fields did in Phase 1's WorkflowManager.jsx.

- [ ] **Step 4: Manual verification**

Via `npm start`: create a project with a brand-new customer name → confirm it's created once and appears in the dropdown on a second project-creation attempt without re-creating a duplicate row (verify via a direct DB query if browser access isn't available: `SELECT COUNT(*) FROM wf_customer WHERE name='...'` should stay 1 after two attempts to "create" the same name through the UI).

---

### Task 7: `WorkflowManager.jsx` — creatable project-type select

**Files:**
- Modify: `e:/SOF/PLAN/SOF_PLAN/src/pages/QuanLyQuyTrinhDuAn/WorkflowManager.jsx`

**Interfaces:**
- Consumes: `workflowApi.listProjectTypes()`/`saveProjectType()` (Task 5).

- [ ] **Step 1: Load project types, track search text**

Add state near the existing `departments` state:
```js
const [projectTypes, setProjectTypes] = useState([]);
const [projectTypeSearch, setProjectTypeSearch] = useState("");
```

In the mount `useEffect` that currently calls `workflowApi.getDepartments()`/`getMyProfile()`, add:
```js
workflowApi.listProjectTypes().then(setProjectTypes).catch(() => {});
```

- [ ] **Step 2: Replace the `project_type` Form.Item with the same creatable-Select recipe as Task 6**

```jsx
<Form.Item name="project_type_id" label="Loại dự án">
  <Select
    showSearch
    placeholder="Chọn hoặc gõ loại dự án mới..."
    filterOption={(input, option) => (option?.label ?? "").toLowerCase().includes(input.toLowerCase())}
    onSearch={setProjectTypeSearch}
    options={[
      ...projectTypes.map((t) => ({ value: t.id, label: t.name })),
      ...(projectTypeSearch.trim() && !projectTypes.some((t) => t.name.toLowerCase() === projectTypeSearch.trim().toLowerCase())
        ? [{ value: `__new__:${projectTypeSearch.trim()}`, label: `+ Tạo mới "${projectTypeSearch.trim()}"` }]
        : []),
    ]}
    onChange={async (value) => {
      if (typeof value === "string" && value.startsWith("__new__:")) {
        const name = value.slice("__new__:".length);
        try {
          const created = await workflowApi.saveProjectType(name);
          setProjectTypes((prev) => [...prev, created]);
          wfForm.setFieldsValue({ project_type_id: created.id });
        } catch (e) {
          message.error(e.message);
        }
      }
    }}
  />
</Form.Item>
```

(`wfForm` is this file's existing form instance for the workflow modal — confirm the exact variable name by reading the file before editing; use whichever `Form.useForm()` instance backs the workflow create/edit modal, not the stage or task forms.)

- [ ] **Step 3: `submitWorkflow()` needs no change** — same generic-passthrough reasoning as Task 6.

- [ ] **Step 4: Manual verification**

Same shape as Task 6 Step 4, for `project_type`/`wf_project_type`.

---

### Task 8: End-to-end manual verification

**Files:** none.

Cannot be performed by a subagent (no browser/login access). Present to the human partner:

- [ ] Create a new project, type a brand-new customer name into the customer field, confirm "+ Tạo mới ..." appears and selecting it creates + selects the customer.
- [ ] Create a second project with the SAME customer name — confirm it now appears as a normal option (not offered again as "create new"), and selecting it does not create a duplicate row.
- [ ] Same two checks for a new Workflow's "Loại dự án" field.
- [ ] In the Workflow Designer, attempt to save a stage with a department that doesn't exist (if reachable from the UI — otherwise confirm via a direct API call) and confirm a clear rejection.
- [ ] Confirm existing projects/workflows (created before this phase) still display their customer/project-type text correctly — the backfill should have linked them, not blanked them.
