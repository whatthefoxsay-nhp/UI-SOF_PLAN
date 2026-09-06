import React, { useEffect, useState, useCallback } from "react";
import { Drawer, Form, Select, Input, Button, Divider, List, Tag, message, Tooltip, Modal, Space } from "antd";
import { Trash2, CheckCircle2, Lock, XCircle } from "lucide-react";
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
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectLoading, setRejectLoading] = useState(false);
  const [handoffLoading, setHandoffLoading] = useState(false);
  const [employeeWorkload, setEmployeeWorkload] = useState({});

  const reload = useCallback(async () => {
    if (!taskId) return;
    const data = await workflowApi.getTask(taskId);
    setTask(data);
    form.setFieldsValue({
      assignee_code: data.assignee_code,
      deadline: data.deadline || "",
      priority: data.priority,
      confirm_departments: (data.confirms || []).map((c) => c.department_code),
    });
  }, [taskId, form]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    if (!taskId) {
      setEmployeeWorkload({});
      return;
    }
    workflowApi.getEmployeeWorkload().then((data) => setEmployeeWorkload(data || {})).catch(() => setEmployeeWorkload({}));
  }, [taskId]);

  if (!taskId) return null;

  const activeHandoff = task?.handoff?.find((step) => step.status === "ACTIVE") || null;
  const canActOn = (departmentCode) => {
    if (!profile) return false;
    if (profile.is_admin) return true;
    if (activeHandoff) return profile.department_code === activeHandoff.department_code && departmentCode === activeHandoff.department_code;
    return profile.department_code === departmentCode;
  };
  const canEditTask = !!profile && (profile.is_admin || (activeHandoff ? profile.department_code === activeHandoff.department_code : profile.department_code === task?.department_code));

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

  const openRejectModal = (dept) => {
    setRejectTarget(dept);
    setRejectReason("");
  };

  const closeRejectModal = () => {
    if (rejectLoading) return;
    setRejectTarget(null);
    setRejectReason("");
  };

  const doReject = async () => {
    const reason = rejectReason.trim();
    if (!reason) {
      message.error("Vui lòng nhập lý do từ chối");
      return;
    }
    if (reason.length > 500) {
      message.error("Lý do từ chối không được vượt quá 500 ký tự");
      return;
    }

    setRejectLoading(true);
    try {
      await workflowApi.rejectTaskConfirm(taskId, rejectTarget, reason);
      message.success("Đã từ chối và chuyển công việc về làm lại");
      setRejectTarget(null);
      setRejectReason("");
      await reload();
      onChanged();
    } catch (e) {
      message.error(e.message);
    } finally {
      setRejectLoading(false);
    }
  };

  const doCompleteHandoff = async () => {
    setHandoffLoading(true);
    try {
      await workflowApi.completeTaskHandoff(taskId);
      message.success("Đã hoàn tất bước và chuyển tiếp công việc");
      await reload();
      onChanged();
    } catch (e) {
      message.error(e.message);
    } finally {
      setHandoffLoading(false);
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
          <Form form={form} layout="vertical" disabled={!canEditTask}>
            <Form.Item name="assignee_code" label="Người phụ trách">
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                options={employees.map((e) => ({
                  value: e.code,
                  label: `${e.name} (${e.code}) — ${employeeWorkload[e.code] || 0} việc đang làm`,
                }))}
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
            <Button size="small" onClick={saveInfo} disabled={!canEditTask}>
              Lưu thông tin
            </Button>
          </Form>
          {!canEditTask && (
            <div style={{ fontSize: 12, color: "#999", marginTop: 4 }}>
              <Lock size={11} style={{ verticalAlign: -1 }} />
              {activeHandoff
                ? ` Chỉ phòng ${departmentName(activeHandoff.department_code)} đang giữ bước handoff mới được thao tác.`
                : ` Bạn không thuộc phòng ${departmentName(task.department_code)} nên chỉ xem được, không sửa được.`}
            </div>
          )}

          {task.handoff?.length > 0 && (
            <>
              <Divider>Handoff tuần tự</Divider>
              <List
                size="small"
                dataSource={task.handoff}
                renderItem={(step) => (
                  <List.Item>
                    <Space>
                      <Tag color={step.status === "DONE" ? "green" : step.status === "ACTIVE" ? "blue" : "default"}>
                        Bước {step.sequence}
                      </Tag>
                      <span>{departmentName(step.department_code)}</span>
                      {step.status === "DONE" ? (
                        <Tag icon={<CheckCircle2 size={12} />} color="green">
                          Đã hoàn tất
                        </Tag>
                      ) : step.status === "ACTIVE" ? (
                        <Tag color="blue">Đang xử lý</Tag>
                      ) : (
                        <Tag>Chờ đến lượt</Tag>
                      )}
                    </Space>
                  </List.Item>
                )}
              />
              {activeHandoff && canActOn(activeHandoff.department_code) ? (
                <Button type="primary" size="small" loading={handoffLoading} onClick={doCompleteHandoff}>
                  Hoàn tất tại đây, chuyển tiếp
                </Button>
              ) : activeHandoff ? (
                <div style={{ fontSize: 12, color: "#999", marginTop: 4 }}>
                  Đang chờ phòng {departmentName(activeHandoff.department_code)} hoàn tất bước hiện tại.
                </div>
              ) : (
                <Tag color="green">Chuỗi handoff đã hoàn tất — tiếp tục xác nhận nếu cần</Tag>
              )}
            </>
          )}

          {task.confirms?.length > 0 && (
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
                      ) : c.status === "REJECTED" ? (
                        <Tooltip title={c.reject_reason || "Đã bị từ chối, cần cập nhật và gửi lại để xác nhận"}>
                          <Tag icon={<XCircle size={12} />} color="red">
                            Đã từ chối
                          </Tag>
                        </Tooltip>
                      ) : canActOn(c.department_code) ? (
                        <Space key="confirm-actions" size={4}>
                          <Button size="small" onClick={() => doConfirm(c.department_code)}>
                            Xác nhận
                          </Button>
                          <Button size="small" danger onClick={() => openRejectModal(c.department_code)}>
                            Từ chối
                          </Button>
                        </Space>
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

          <Modal
            title={`Từ chối xác nhận - ${departmentName(rejectTarget || "")}`}
            open={!!rejectTarget}
            onCancel={closeRejectModal}
            onOk={doReject}
            confirmLoading={rejectLoading}
            okButtonProps={{ danger: true }}
            okText="Từ chối"
            cancelText="Hủy"
            destroyOnClose
          >
            <Input.TextArea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Nhập lý do từ chối (bắt buộc)"
              autoSize={{ minRows: 4, maxRows: 8 }}
              maxLength={500}
              showCount
            />
          </Modal>

          <Divider>Dữ liệu phát sinh (checklist / bug / phân bổ / ticket)</Divider>
          <List
            size="small"
            dataSource={task.items}
            locale={{ emptyText: "Chưa có mục nào" }}
            renderItem={(it) => (
              <List.Item actions={[<Button size="small" danger disabled={!canEditTask} icon={<Trash2 size={12} />} onClick={() => deleteItem(it.id)} />]}>
                <Tag>{ITEM_TYPES.find((t) => t.value === it.item_type)?.label || it.item_type}</Tag> {it.title}
                {it.status ? <Tag style={{ marginLeft: 6 }}>{it.status}</Tag> : null}
              </List.Item>
            )}
          />
          <Form form={itemForm} layout="inline" disabled={!canEditTask} style={{ marginTop: 8, rowGap: 8 }}>
            <Form.Item name="item_type" rules={[{ required: true }]} style={{ minWidth: 140 }}>
              <Select placeholder="Loại" options={ITEM_TYPES} />
            </Form.Item>
            <Form.Item name="title" rules={[{ required: true }]} style={{ minWidth: 160 }}>
              <Input placeholder="Tiêu đề" />
            </Form.Item>
            <Form.Item name="status">
              <Input placeholder="Trạng thái" style={{ width: 110 }} />
            </Form.Item>
            <Button size="small" type="primary" onClick={addItem} disabled={!canEditTask}>
              Thêm
            </Button>
          </Form>
        </>
      )}
    </Drawer>
  );
}
