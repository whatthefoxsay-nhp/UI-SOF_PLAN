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
  Select,
  Typography,
  Progress,
  Badge,
  Row,
  Col,
  Statistic,
  Tooltip,
  message,
} from 'antd';
import {
  PlusOutlined,
  FolderOpenOutlined,
  UserOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  SyncOutlined,
  RocketOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import projectWorkflowService from '../../../services/projectWorkflowService';
import styles from '../../NhanVien/styles.module.css';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

export default function QuanLyDuAnWorkflow() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [form] = Form.useForm();

  const loadData = () => {
    const prjs = projectWorkflowService.getProjects();
    const wfs = projectWorkflowService.getWorkflows();
    setProjects(prjs);
    setWorkflows(wfs.filter((w) => w.isActive));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCreateModal = () => {
    form.resetFields();
    if (workflows.length > 0) {
      form.setFieldsValue({
        workflowId: workflows[0].id,
        projectType: 'Xây dựng phần mềm theo yêu cầu',
      });
    }
    setModalVisible(true);
  };

  const handleCreateProject = async () => {
    try {
      const values = await form.validateFields();
      const newPrj = projectWorkflowService.createProjectFromWorkflow(values);
      message.success(`Tạo thành công dự án "${newPrj.name}" và tự động khởi tạo quy trình!`);
      setModalVisible(false);
      loadData();
    } catch (e) {
      console.error(e);
      message.error(e.message || 'Lỗi khi khởi tạo dự án');
    }
  };

  const getStageProgress = (project) => {
    if (!project.stages || project.stages.length === 0) return 0;
    const doneStages = project.stages.filter((s) => s.status === 'DONE').length;
    return Math.round((doneStages / project.stages.length) * 100);
  };

  const filteredProjects = projects.filter((p) => {
    const matchSearch =
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const columns = [
    {
      title: 'Mã & Tên Dự Án',
      key: 'name',
      render: (_, record) => (
        <div>
          <Space>
            <Tag color="geekblue">{record.code}</Tag>
            <Text strong style={{ fontSize: 15, color: '#1677ff', cursor: 'pointer' }} onClick={() => navigate(`/quan-ly-du-an/chi-tiet/${record.id}`)}>
              {record.name}
            </Text>
          </Space>
          <div style={{ marginTop: 4 }}>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Khách hàng: <strong>{record.customerName}</strong>
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: 'Workflow Mẫu Áp Dụng',
      key: 'workflow',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Tag color="purple">{record.workflowCode || 'WF-SW-001'}</Tag>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.workflowName || 'Xây dựng phần mềm theo yêu cầu'}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Giai đoạn hiện tại',
      key: 'currentStage',
      render: (_, record) => {
        const currentStg = (record.stages || []).find((s) => s.stageCode === record.currentStageId) || record.stages?.[0];
        return (
          <Tag color="blue" style={{ padding: '4px 8px', fontSize: 13, fontWeight: 500 }}>
            {currentStg?.name || record.currentStageId || 'GD01'}
          </Tag>
        );
      },
    },
    {
      title: 'Tiến độ Quy trình',
      key: 'progress',
      render: (_, record) => {
        const percent = getStageProgress(record);
        return (
          <div style={{ width: 140 }}>
            <Progress percent={percent} size="small" status={percent === 100 ? 'success' : 'active'} />
            <Text type="secondary" style={{ fontSize: 11 }}>
              {(record.stages || []).filter((s) => s.status === 'DONE').length} / {record.stages?.length || 8} Giai đoạn DONE
            </Text>
          </div>
        );
      },
    },
    {
      title: 'Quản lý Dự án (PM)',
      dataIndex: 'managerName',
      key: 'managerName',
      render: (val) => (
        <Space>
          <UserOutlined />
          <Text style={{ fontSize: 13 }}>{val || 'Chưa gán'}</Text>
        </Space>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        if (status === 'COMPLETED') return <Tag color="success" icon={<CheckCircleOutlined />}>Hoàn thành</Tag>;
        if (status === 'IN_PROGRESS') return <Tag color="processing" icon={<SyncOutlined spin />}>Đang thực hiện</Tag>;
        return <Tag color="warning" icon={<ClockCircleOutlined />}>Tạm dừng</Tag>;
      },
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_, record) => (
        <Button
          type="primary"
          icon={<RightOutlined />}
          onClick={() => navigate(`/quan-ly-du-an/chi-tiet/${record.id}`)}
        >
          Chi Tiết Quy Trình
        </Button>
      ),
    },
  ];

  return (
    <div className={styles.container}>
      {/* Top Statistics */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col span={6}>
          <Card style={{ borderRadius: 12, boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
            <Statistic
              title="Tổng số Dự án Quy trình"
              value={projects.length}
              prefix={<FolderOpenOutlined style={{ color: '#1677ff' }} />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card style={{ borderRadius: 12, boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
            <Statistic
              title="Đang Thực Thi Quy Trình"
              value={projects.filter((p) => p.status === 'IN_PROGRESS').length}
              valueStyle={{ color: '#1890ff' }}
              prefix={<SyncOutlined spin />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card style={{ borderRadius: 12, boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
            <Statistic
              title="Dự án Hoàn Thành"
              value={projects.filter((p) => p.status === 'COMPLETED').length}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card style={{ borderRadius: 12, boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
            <Statistic
              title="Workflow Mẫu Hoạt Động"
              value={workflows.length}
              valueStyle={{ color: '#722ed1' }}
              prefix={<RocketOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title={
          <div>
            <Title level={4} style={{ margin: 0 }}>
              Danh Sách Dự Án & Quản Lý Quy Trình Thực Thi
            </Title>
            <Text type="secondary">
              Khi tạo Dự án mới và chọn Workflow mẫu, hệ thống sẽ tự động khởi tạo toàn bộ chuỗi Giai đoạn & Công việc tương ứng.
            </Text>
          </div>
        }
        extra={
          <Button type="primary" icon={<PlusOutlined />} size="large" onClick={handleOpenCreateModal}>
            Tạo Dự Án Quy Trình Mới
          </Button>
        }
        style={{ borderRadius: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}
      >
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={12}>
            <Input.Search
              placeholder="Tìm theo mã dự án, tên dự án hoặc tên khách hàng..."
              allowClear
              size="large"
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </Col>
          <Col span={6}>
            <Select
              size="large"
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: '100%' }}
            >
              <Option value="ALL">Tất cả trạng thái</Option>
              <Option value="IN_PROGRESS">Đang thực hiện</Option>
              <Option value="COMPLETED">Hoàn thành</Option>
              <Option value="ON_HOLD">Tạm dừng</Option>
            </Select>
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={filteredProjects}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* Modal Khởi tạo Dự án từ Workflow Mẫu */}
      <Modal
        title="Tạo Mới Dự Án & Tự Động Sinh Quy Trình"
        open={modalVisible}
        onOk={handleCreateProject}
        onCancel={() => setModalVisible(false)}
        okText="Tạo Dự Án & Sinh Quy Trình"
        cancelText="Hủy"
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="Tên Dự Án"
            rules={[{ required: true, message: 'Vui lòng nhập tên dự án' }]}
          >
            <Input placeholder="VD: ABC – Xây dựng phần mềm quản lý kho" />
          </Form.Item>

          <Form.Item
            name="customerName"
            label="Tên Khách Hàng / Đối Tác"
            rules={[{ required: true, message: 'Vui lòng nhập tên khách hàng' }]}
          >
            <Input placeholder="VD: Công ty Cổ phần Thương mại ABC" />
          </Form.Item>

          <Form.Item
            name="projectType"
            label="Loại Dự Án"
            rules={[{ required: true, message: 'Vui lòng nhập loại dự án' }]}
          >
            <Input placeholder="VD: Xây dựng phần mềm theo yêu cầu" />
          </Form.Item>

          <Form.Item
            name="workflowId"
            label="Chọn Mẫu Workflow Quy Trình"
            rules={[{ required: true, message: 'Vui lòng chọn Workflow mẫu' }]}
          >
            <Select placeholder="Chọn Workflow để tự động sinh giai đoạn & công việc">
              {workflows.map((wf) => (
                <Option key={wf.id} value={wf.id}>
                  <strong>{wf.code}</strong> – {wf.name} ({wf.stages?.length || 0} giai đoạn)
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="managerName" label="Quản lý Dự án (PM) phụ trách">
            <Input placeholder="VD: Nguyễn Văn Quyền (PM)" />
          </Form.Item>

          <Paragraph type="secondary" style={{ fontStyle: 'italic', fontSize: 13 }}>
            * Chú ý: Ngay sau khi bấm nút "Tạo Dự Án", phần mềm sẽ tự động nhân bản toàn bộ chuỗi Giai đoạn (GD01 - GD08) cùng các mã công việc tự sinh tương ứng để các phòng ban cùng phối hợp thực hiện.
          </Paragraph>
        </Form>
      </Modal>
    </div>
  );
}
