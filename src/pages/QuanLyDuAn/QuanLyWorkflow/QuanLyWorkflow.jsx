import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Card,
  Tag,
  Space,
  Modal,
  Form,
  Input,
  Switch,
  Select,
  Drawer,
  Popconfirm,
  Typography,
  Tooltip,
  Badge,
  Row,
  Col,
  Divider,
  message,
} from 'antd';
import {
  PlusOutlined,
  CopyOutlined,
  EditOutlined,
  DeleteOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  CheckCircleOutlined,
  SettingOutlined,
  LockOutlined,
  BranchesOutlined,
} from '@ant-design/icons';
import { Layers, Workflow, CheckSquare, Users, GitFork } from 'lucide-react';
import projectWorkflowService from '../../../services/projectWorkflowService';
import styles from '../../NhanVien/styles.module.css';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const DEPARTMENT_OPTIONS = [
  'Marketing',
  'Kinh doanh',
  'Kỹ thuật',
  'Tester',
  'Bàn giao',
  'Kế toán',
  'Bảo trì',
  'Ban Giám đốc',
];

export default function QuanLyWorkflow() {
  const [workflows, setWorkflows] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState(null);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [form] = Form.useForm();

  // Temporary stages state inside drawer
  const [stages, setStages] = useState([]);
  const [activeStageId, setActiveStageId] = useState(null);
  const [stageForm] = Form.useForm();
  const [stageModalVisible, setStageModalVisible] = useState(false);
  const [editingStage, setEditingStage] = useState(null);

  // Task state
  const [taskModalVisible, setTaskModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [taskForm] = Form.useForm();

  const loadWorkflows = () => {
    const data = projectWorkflowService.getWorkflows();
    setWorkflows(data);
  };

  useEffect(() => {
    loadWorkflows();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingWorkflow(null);
    form.resetFields();
    form.setFieldsValue({
      code: `WF-SW-00${workflows.length + 1}`,
      isActive: true,
    });
    setModalVisible(true);
  };

  const handleOpenEditModal = (record) => {
    setEditingWorkflow(record);
    form.setFieldsValue({
      code: record.code,
      name: record.name,
      description: record.description,
      isActive: record.isActive,
    });
    setModalVisible(true);
  };

  const handleSaveWorkflow = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        ...(editingWorkflow || {}),
        ...values,
        stages: editingWorkflow ? editingWorkflow.stages : [],
      };
      projectWorkflowService.saveWorkflow(payload);
      message.success(editingWorkflow ? 'Cập nhật Workflow thành công!' : 'Tạo Workflow thành công!');
      setModalVisible(false);
      loadWorkflows();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCloneWorkflow = (id) => {
    projectWorkflowService.cloneWorkflow(id);
    message.success('Đã nhân bản Workflow thành công!');
    loadWorkflows();
  };

  const handleToggleStatus = (id) => {
    projectWorkflowService.toggleWorkflowStatus(id);
    message.success('Đã thay đổi trạng thái Workflow');
    loadWorkflows();
  };

  const handleDeleteWorkflow = (id) => {
    projectWorkflowService.deleteWorkflow(id);
    message.success('Đã xóa Workflow!');
    loadWorkflows();
  };

  // Open Stage Config Drawer
  const handleOpenConfigDrawer = (record) => {
    setSelectedWorkflow(record);
    setStages(record.stages || []);
    setDrawerVisible(true);
  };

  const handleSaveDrawerStages = () => {
    if (!selectedWorkflow) return;
    const updated = {
      ...selectedWorkflow,
      stages: stages,
    };
    projectWorkflowService.saveWorkflow(updated);
    message.success('Đã lưu cấu hình giai đoạn cho Workflow!');
    loadWorkflows();
    setDrawerVisible(false);
  };

  // Stage Handlers
  const handleOpenStageModal = (stg = null) => {
    setEditingStage(stg);
    stageForm.resetFields();
    if (stg) {
      stageForm.setFieldsValue({
        code: stg.code,
        name: stg.name,
        departments: stg.departments,
        isMandatory: stg.isMandatory !== false,
        isLockable: stg.isLockable || false,
      });
    } else {
      const nextOrder = stages.length + 1;
      stageForm.setFieldsValue({
        code: `GD0${nextOrder}`,
        name: `Giai đoạn 0${nextOrder}`,
        departments: ['Kinh doanh'],
        isMandatory: true,
        isLockable: false,
      });
    }
    setStageModalVisible(true);
  };

  const handleSaveStage = async () => {
    try {
      const values = await stageForm.validateFields();
      if (editingStage) {
        setStages((prev) =>
          prev.map((s) => (s.id === editingStage.id ? { ...s, ...values } : s))
        );
      } else {
        const newStage = {
          id: values.code || `GD-${Date.now()}`,
          ...values,
          order: stages.length + 1,
          tasks: [],
        };
        setStages((prev) => [...prev, newStage]);
      }
      setStageModalVisible(false);
      message.success('Cập nhật giai đoạn thành công');
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteStage = (stageId) => {
    setStages((prev) =>
      prev.filter((s) => s.id !== stageId).map((s, idx) => ({ ...s, order: idx + 1 }))
    );
    message.success('Đã xóa giai đoạn');
  };

  const handleMoveStage = (index, direction) => {
    const newStages = [...stages];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newStages.length) return;

    const temp = newStages[index];
    newStages[index] = newStages[targetIndex];
    newStages[targetIndex] = temp;

    // Recalculate order
    newStages.forEach((s, idx) => (s.order = idx + 1));
    setStages(newStages);
  };

  // Task Handlers
  const handleOpenTaskModal = (stageId, task = null) => {
    setActiveStageId(stageId);
    setEditingTask(task);
    taskForm.resetFields();
    if (task) {
      taskForm.setFieldsValue(task);
    } else {
      taskForm.setFieldsValue({
        code: `TASK-${Math.floor(Math.random() * 900 + 100)}`,
        department: 'Kinh doanh',
        confirmDepartments: ['Kinh doanh'],
        estimatedDays: 2,
      });
    }
    setTaskModalVisible(true);
  };

  const handleSaveTask = async () => {
    try {
      const values = await taskForm.validateFields();
      setStages((prevStages) =>
        prevStages.map((stg) => {
          if (stg.id !== activeStageId) return stg;
          const currentTasks = stg.tasks || [];
          let updatedTasks = [];
          if (editingTask) {
            updatedTasks = currentTasks.map((t) =>
              t.code === editingTask.code ? { ...t, ...values } : t
            );
          } else {
            updatedTasks = [...currentTasks, values];
          }
          return { ...stg, tasks: updatedTasks };
        })
      );
      setTaskModalVisible(false);
      message.success('Cập nhật công việc mẫu thành công');
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteTask = (stageId, taskCode) => {
    setStages((prevStages) =>
      prevStages.map((stg) => {
        if (stg.id !== stageId) return stg;
        return { ...stg, tasks: (stg.tasks || []).filter((t) => t.code !== taskCode) };
      })
    );
    message.success('Đã xóa công việc mẫu');
  };

  const columns = [
    {
      title: 'Mã Workflow',
      dataIndex: 'code',
      key: 'code',
      render: (text) => (
        <Space>
          <Workflow className="w-4 h-4 text-blue-600" />
          <Text strong style={{ color: '#1677ff' }}>
            {text}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Tên Chuỗi Quy trình',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <div>
          <Text strong style={{ fontSize: 15 }}>{text}</Text>
          <div>
            <Text type="secondary" style={{ fontSize: 13 }}>{record.description}</Text>
          </div>
        </div>
      ),
    },
    {
      title: 'Số Giai đoạn',
      key: 'stagesCount',
      render: (_, record) => (
        <Badge
          count={record.stages?.length || 0}
          showZero
          style={{ backgroundColor: '#52c41a' }}
        />
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive, record) => (
        <Switch
          checked={isActive}
          onChange={() => handleToggleStatus(record.id)}
          checkedChildren="Đang dùng"
          unCheckedChildren="Ngừng dùng"
        />
      ),
    },
    {
      title: 'Ngày cập nhật',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      render: (val) => <Text type="secondary">{val}</Text>,
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Cấu hình Giai đoạn & Công việc mẫu">
            <Button
              type="primary"
              icon={<SettingOutlined />}
              onClick={() => handleOpenConfigDrawer(record)}
            >
              Cấu hình Quy trình
            </Button>
          </Tooltip>

          <Tooltip title="Sửa thông tin Workflow">
            <Button icon={<EditOutlined />} onClick={() => handleOpenEditModal(record)} />
          </Tooltip>

          <Tooltip title="Nhân bản mẫu Workflow này">
            <Button icon={<CopyOutlined />} onClick={() => handleCloneWorkflow(record.id)} />
          </Tooltip>

          <Popconfirm
            title="Xóa Workflow này?"
            description="Bạn có chắc chắn muốn xóa mẫu quy trình này?"
            onConfirm={() => handleDeleteWorkflow(record.id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Button icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const filteredWorkflows = workflows.filter(
    (w) =>
      w.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.code?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={styles.container}>
      <Card
        title={
          <Space>
            <BranchesOutlined style={{ fontSize: 22, color: '#1677ff' }} />
            <div>
              <Title level={4} style={{ margin: 0 }}>
                Quản lý Workflow & Mẫu Quy Trình Dự Án
              </Title>
              <Text type="secondary">
                Cấu hình chuỗi động các Giai đoạn, Phòng ban phối hợp, Công việc tự sinh & Điều kiện Lock cho từng Loại Dự án
              </Text>
            </div>
          </Space>
        }
        extra={
          <Button type="primary" icon={<PlusOutlined />} size="large" onClick={handleOpenCreateModal}>
            Tạo Workflow Mới
          </Button>
        }
        style={{ borderRadius: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}
      >
        <div style={{ marginBottom: 16 }}>
          <Input.Search
            placeholder="Tìm kiếm mẫu Workflow theo mã hoặc tên..."
            allowClear
            size="large"
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ maxWidth: 450 }}
          />
        </div>

        <Table
          columns={columns}
          dataSource={filteredWorkflows}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* Modal Tạo/Sửa Workflow thông tin chung */}
      <Modal
        title={editingWorkflow ? 'Chỉnh sửa Workflow' : 'Tạo mới Workflow Mẫu'}
        open={modalVisible}
        onOk={handleSaveWorkflow}
        onCancel={() => setModalVisible(false)}
        okText="Lưu thông tin"
        cancelText="Hủy"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="code"
            label="Mã Workflow"
            rules={[{ required: true, message: 'Vui lòng nhập mã Workflow' }]}
          >
            <Input placeholder="VD: WF-SW-001" />
          </Form.Item>

          <Form.Item
            name="name"
            label="Tên Chuỗi Quy Trình"
            rules={[{ required: true, message: 'Vui lòng nhập tên chuỗi quy trình' }]}
          >
            <Input placeholder="VD: Xây dựng phần mềm theo yêu cầu" />
          </Form.Item>

          <Form.Item name="description" label="Mô tả Quy trình">
            <Input.TextArea rows={3} placeholder="Mô tả phạm vi áp dụng của mẫu quy trình này..." />
          </Form.Item>

          <Form.Item name="isActive" label="Trạng thái kích hoạt" valuePropName="checked">
            <Switch checkedChildren="Đang áp dụng" unCheckedChildren="Tạm dừng" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Drawer Cấu hình Chi tiết Giai đoạn & Công việc mẫu */}
      <Drawer
        title={
          <Space>
            <SettingOutlined className="text-blue-600" />
            <span>
              Cấu hình Giai đoạn Quy trình: <strong>{selectedWorkflow?.name}</strong> ({selectedWorkflow?.code})
            </span>
          </Space>
        }
        width={900}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        extra={
          <Space>
            <Button onClick={() => setDrawerVisible(false)}>Hủy</Button>
            <Button type="primary" onClick={handleSaveDrawerStages}>
              Lưu Cấu Hình Giai Đoạn
            </Button>
          </Space>
        }
      >
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Text strong style={{ fontSize: 16 }}>
              Danh Sách Giai Đoạn Chuỗi (Order 1 → {stages.length})
            </Text>
            <Paragraph type="secondary" style={{ margin: 0 }}>
              Các giai đoạn sẽ tự động tạo khi phát sinh dự án mới từ Workflow này.
            </Paragraph>
          </div>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenStageModal()}>
            Thêm Giai Đoạn
          </Button>
        </div>

        {stages.map((stg, index) => (
          <Card
            key={stg.id}
            size="small"
            style={{
              marginBottom: 16,
              borderRadius: 8,
              borderLeft: stg.isLockable ? '4px solid #f5222d' : '4px solid #1677ff',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            }}
            title={
              <Space>
                <Tag color="blue">Order {stg.order}</Tag>
                <Text strong style={{ fontSize: 15 }}>
                  {stg.code} – {stg.name}
                </Text>
                {stg.isLockable && (
                  <Tag color="red" icon={<LockOutlined />}>
                    Cho phép LOCK Dữ liệu
                  </Tag>
                )}
                {stg.isMandatory ? (
                  <Tag color="gold">Bắt buộc</Tag>
                ) : (
                  <Tag color="default">Tùy chọn</Tag>
                )}
              </Space>
            }
            extra={
              <Space>
                <Tooltip title="Di chuyển lên">
                  <Button
                    size="small"
                    icon={<ArrowUpOutlined />}
                    disabled={index === 0}
                    onClick={() => handleMoveStage(index, -1)}
                  />
                </Tooltip>
                <Tooltip title="Di chuyển xuống">
                  <Button
                    size="small"
                    icon={<ArrowDownOutlined />}
                    disabled={index === stages.length - 1}
                    onClick={() => handleMoveStage(index, 1)}
                  />
                </Tooltip>
                <Button size="small" icon={<EditOutlined />} onClick={() => handleOpenStageModal(stg)} />
                <Popconfirm title="Xóa giai đoạn này?" onConfirm={() => handleDeleteStage(stg.id)}>
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            }
          >
            <div style={{ marginBottom: 10 }}>
              <Text type="secondary">Phòng ban tham gia: </Text>
              {(stg.departments || []).map((dept) => (
                <Tag color="cyan" key={dept}>
                  {dept}
                </Tag>
              ))}
            </div>

            <Divider style={{ margin: '8px 0' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text strong style={{ color: '#434343' }}>
                <CheckSquare style={{ display: 'inline', width: 14, height: 14, marginRight: 4 }} />
                Công việc tự sinh thuộc giai đoạn này ({stg.tasks?.length || 0} tasks):
              </Text>
              <Button size="small" icon={<PlusOutlined />} onClick={() => handleOpenTaskModal(stg.id)}>
                Thêm Công Việc Mẫu
              </Button>
            </div>

            {(stg.tasks || []).length === 0 ? (
              <Text type="secondary" style={{ fontStyle: 'italic' }}>
                Chưa có công việc mẫu nào. Nhấn "Thêm Công Việc Mẫu" để cấu hình.
              </Text>
            ) : (
              <Table
                size="small"
                pagination={false}
                rowKey="code"
                dataSource={stg.tasks}
                columns={[
                  {
                    title: 'Mã CV',
                    dataIndex: 'code',
                    render: (t) => <Tag color="geekblue">{t}</Tag>,
                  },
                  {
                    title: 'Tên Công việc mẫu',
                    dataIndex: 'name',
                    render: (t) => <Text strong>{t}</Text>,
                  },
                  {
                    title: 'Phòng ban thực hiện',
                    dataIndex: 'department',
                    render: (t) => <Tag color="blue">{t}</Tag>,
                  },
                  {
                    title: 'Phòng ban cùng xác nhận',
                    dataIndex: 'confirmDepartments',
                    render: (depts) =>
                      (depts || []).map((d) => (
                        <Tag color="purple" key={d}>
                          {d}
                        </Tag>
                      )),
                  },
                  {
                    title: 'Số ngày dự kiến',
                    dataIndex: 'estimatedDays',
                    render: (d) => `${d} ngày`,
                  },
                  {
                    title: '',
                    key: 'opt',
                    render: (_, tsk) => (
                      <Space>
                        <Button
                          type="text"
                          size="small"
                          icon={<EditOutlined />}
                          onClick={() => handleOpenTaskModal(stg.id, tsk)}
                        />
                        <Button
                          type="text"
                          danger
                          size="small"
                          icon={<DeleteOutlined />}
                          onClick={() => handleDeleteTask(stg.id, tsk.code)}
                        />
                      </Space>
                    ),
                  },
                ]}
              />
            )}
          </Card>
        ))}
      </Drawer>

      {/* Modal Thêm/Sửa Giai Đoạn */}
      <Modal
        title={editingStage ? 'Sửa Giai Đoạn' : 'Thêm Giai Đoạn Mới'}
        open={stageModalVisible}
        onOk={handleSaveStage}
        onCancel={() => setStageModalVisible(false)}
      >
        <Form form={stageForm} layout="vertical">
          <Form.Item name="code" label="Mã Giai Đoạn" rules={[{ required: true }]}>
            <Input placeholder="VD: GD01" />
          </Form.Item>
          <Form.Item name="name" label="Tên Giai Đoạn" rules={[{ required: true }]}>
            <Input placeholder="VD: Khách hàng tiềm năng" />
          </Form.Item>
          <Form.Item name="departments" label="Phòng ban tham gia" rules={[{ required: true }]}>
            <Select mode="multiple" placeholder="Chọn phòng ban">
              {DEPARTMENT_OPTIONS.map((dept) => (
                <Option key={dept} value={dept}>
                  {dept}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="isMandatory" label="Giai đoạn bắt buộc" valuePropName="checked">
                <Switch checkedChildren="Bắt buộc" unCheckedChildren="Tùy chọn" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="isLockable" label="Cho phép LOCK dữ liệu chốt" valuePropName="checked">
                <Switch checkedChildren="Có LOCK" unCheckedChildren="Không" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Modal Thêm/Sửa Công Việc Mẫu */}
      <Modal
        title={editingTask ? 'Sửa Công Việc Mẫu' : 'Thêm Công Việc Mẫu Cho Giai Đoạn'}
        open={taskModalVisible}
        onOk={handleSaveTask}
        onCancel={() => setTaskModalVisible(false)}
      >
        <Form form={taskForm} layout="vertical">
          <Form.Item name="code" label="Mã Công Việc (Tự động/Nhập)" rules={[{ required: true }]}>
            <Input placeholder="VD: KD001" />
          </Form.Item>
          <Form.Item name="name" label="Tên Công Việc" rules={[{ required: true }]}>
            <Input placeholder="VD: Tìm kiếm khách hàng tiềm năng" />
          </Form.Item>
          <Form.Item name="department" label="Phòng ban phụ trách thực hiện" rules={[{ required: true }]}>
            <Select placeholder="Chọn phòng ban">
              {DEPARTMENT_OPTIONS.map((d) => (
                <Option key={d} value={d}>
                  {d}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="confirmDepartments"
            label="Các Phòng Ban Phải Cùng Xác Nhận Mới DONE"
            rules={[{ required: true }]}
          >
            <Select mode="multiple" placeholder="Chọn các phòng ban cần xác nhận">
              {DEPARTMENT_OPTIONS.map((d) => (
                <Option key={d} value={d}>
                  {d}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="estimatedDays" label="Ước tính số ngày thực hiện">
            <Input type="number" suffix="ngày" />
          </Form.Item>

          <Form.Item name="description" label="Mô tả công việc">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
