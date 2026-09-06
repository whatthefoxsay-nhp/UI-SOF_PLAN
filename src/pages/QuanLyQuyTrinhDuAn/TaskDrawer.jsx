import React, { useEffect, useState, useCallback } from "react";
import { Drawer, Form, Select, Input, Button, Divider, List, Tag, message, Tooltip } from "antd";
import { Trash2, CheckCircle2, Lock } from "lucide-react";
import * as workflowApi from "../../services/workflowApi";

export const ITEM_TYPES = [
  { value: "CHECKLIST", label: "Checklist bàn giao" },
  { value: "BUG", label: "Bug (Tester)" },
  { value: "ALLOCATION", label: "Phân bổ ngày công" },
  { value: "TICKET", label: "Ticket bảo trì" },
];

export default function TaskDrawer({ taskId, employees, departments, profile, onClose, onChanged }) {
  const [task, setTask] = useState(null);
  const [form] = Form.useForm();
  const [itemForm] = Form.useForm();

  const reload = useCallback(async () => {
    if (!taskId) return;
    const data = await workflowApi.getTask(taskId);
    setTask(data);
    form.setFieldsValue({
      assignee_code: data.assignee_code,
      deadline: data.deadline || "",
      priority: data.priority,
      confirm_departments: data.confirms.map((c) => c.department_code),
    });
  }, [taskId, form]);

  useEffect(() => {
    reload();
  }, [reload]);

  if (!taskId) return null;

  const canActOn = (departmentCode) => !!profile && (profile.is_admin || profile.department_code === departmentCode);

  const saveInfo = async () => {
    const values = await form.validateFields();
    try {
      await workflowApi.saveTask({ id: taskId, name: task.name, department_code: task.department_code, ...values });
      message.success("Đã lưu");
      reload();
      onChanged();
    } catch (e) {
      message.error(e.message);
    }
  };

  const doConfirm = async (dept) => {
    try {
      await workflowApi.confirmTask(taskId, dept);
      message.success("Đã xác nhận");
      reload();
      onChanged();
    } catch (e) {
      message.error(e.message);
    }
  };

  const addItem = async () => {
    const values = await itemForm.validateFields();
    try {
      await workflowApi.saveTaskItem({ task_id: taskId, ...values });
      itemForm.resetFields();
      reload();
    } catch (e) {
      message.error(e.message);
    }
  };

  const deleteItem = async (id) => {
    await workflowApi.deleteTaskItem(id);
    reload();
  };

  const departmentName = (code) => departments.find((d) => d.code === code)?.name || code;

  return (
    <Drawer title={task ? `${task.code} — ${task.name}` : "..."} open={!!taskId} onClose={onClose} width={480}>
      {task && (
        <>
          <Form form={form} layout="vertical" disabled={!canActOn(task.department_code)}>
            <Form.Item name="assignee_code" label="Người phụ trách">
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                options={employees.map((e) => ({ value: e.code, label: `${e.name} (${e.code})` }))}
              />
            </Form.Item>
            <Form.Item name="deadline" label="Deadline">
              <Input type="date" />
            </Form.Item>
            <Form.Item name="priority" label="Độ ưu tiên">
              <Select
                options={[
                  { value: "LOW", label: "Thấp" },
                  { value: "NORMAL", label: "Bình thường" },
                  { value: "HIGH", label: "Cao" },
                  { value: "URGENT", label: "Khẩn cấp" },
                ]}
              />
            </Form.Item>
            <Form.Item
              name="confirm_departments"
              label="Phòng ban cần xác nhận"
              tooltip="Phòng ban vừa được thêm vào đây sẽ nhận thông báo yêu cầu xác nhận sau khi lưu"
            >
              <Select
                mode="multiple"
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder="Chọn phòng ban cần xác nhận"
                options={departments.map((d) => ({ value: d.code, label: d.name }))}
              />
            </Form.Item>
            <Button size="small" onClick={saveInfo}>
              Lưu thông tin
            </Button>
          </Form>
          {!canActOn(task.department_code) && (
            <div style={{ fontSize: 12, color: "#999", marginTop: 4 }}>
              <Lock size={11} style={{ verticalAlign: -1 }} /> Bạn không thuộc phòng {departmentName(task.department_code)} nên chỉ xem được, không sửa được.
            </div>
          )}

          {task.confirms.length > 0 && (
            <>
              <Divider>Xác nhận phòng ban</Divider>
              <List
                size="small"
                dataSource={task.confirms}
                renderItem={(c) => (
                  <List.Item
                    actions={[
                      c.status === "CONFIRMED" ? (
                        <Tag icon={<CheckCircle2 size={12} />} color="green">
                          Đã xác nhận
                        </Tag>
                      ) : canActOn(c.department_code) ? (
                        <Button size="small" onClick={() => doConfirm(c.department_code)}>
                          Xác nhận
                        </Button>
                      ) : (
                        <Tooltip title={`Chỉ phòng ${departmentName(c.department_code)} mới xác nhận được`}>
                          <Tag color="default">Chờ xác nhận</Tag>
                        </Tooltip>
                      ),
                    ]}
                  >
                    {departmentName(c.department_code)}
                  </List.Item>
                )}
              />
            </>
          )}

          <Divider>Dữ liệu phát sinh (checklist / bug / phân bổ / ticket)</Divider>
          <List
            size="small"
            dataSource={task.items}
            locale={{ emptyText: "Chưa có mục nào" }}
            renderItem={(it) => (
              <List.Item actions={[<Button size="small" danger icon={<Trash2 size={12} />} onClick={() => deleteItem(it.id)} />]}>
                <Tag>{ITEM_TYPES.find((t) => t.value === it.item_type)?.label || it.item_type}</Tag> {it.title}
                {it.status ? <Tag style={{ marginLeft: 6 }}>{it.status}</Tag> : null}
              </List.Item>
            )}
          />
          <Form form={itemForm} layout="inline" style={{ marginTop: 8, rowGap: 8 }}>
            <Form.Item name="item_type" rules={[{ required: true }]} style={{ minWidth: 140 }}>
              <Select placeholder="Loại" options={ITEM_TYPES} />
            </Form.Item>
            <Form.Item name="title" rules={[{ required: true }]} style={{ minWidth: 160 }}>
              <Input placeholder="Tiêu đề" />
            </Form.Item>
            <Form.Item name="status">
              <Input placeholder="Trạng thái" style={{ width: 110 }} />
            </Form.Item>
            <Button size="small" type="primary" onClick={addItem}>
              Thêm
            </Button>
          </Form>
        </>
      )}
    </Drawer>
  );
}
