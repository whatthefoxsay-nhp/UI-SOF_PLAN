import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Steps,
  Tag,
  Button,
  Typography,
  Space,
  Table,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Badge,
  Progress,
  Tabs,
  Checkbox,
  Statistic,
  Divider,
  Alert,
  Timeline,
  Select,
  Tooltip,
  message,
} from 'antd';
import {
  CheckCircleOutlined,
  LockOutlined,
  UnlockOutlined,
  ArrowRightOutlined,
  UserOutlined,
  DollarOutlined,
  BugOutlined,
  FileDoneOutlined,
  ToolOutlined,
  CodeOutlined,
  HistoryOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
  ExclamationCircleOutlined,
  ScheduleOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import projectWorkflowService from '../../../services/projectWorkflowService';
import styles from '../../NhanVien/styles.module.css';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

export default function ChiTietDuAnWorkflow() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [activeStageCode, setActiveStageCode] = useState('GD01');
  const [financialForm] = Form.useForm();
  const [unlockModalVisible, setUnlockModalVisible] = useState(false);
  const [unlockReason, setUnlockReason] = useState('');

  // Modals state
  const [devModalVisible, setDevModalVisible] = useState(false);
  const [devForm] = Form.useForm();

  const [bugModalVisible, setBugModalVisible] = useState(false);
  const [bugForm] = Form.useForm();

  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [paymentForm] = Form.useForm();

  const [maintenanceModalVisible, setMaintenanceModalVisible] = useState(false);
  const [maintenanceForm] = Form.useForm();

  const loadProjectDetails = () => {
    const prj = projectWorkflowService.getProjectById(projectId || 'PRJ-2026-001');
    if (prj) {
      setProject(prj);
      if (!activeStageCode) {
        setActiveStageCode(prj.currentStageId || 'GD01');
      }
      if (prj.contractData) {
        financialForm.setFieldsValue({
          sellingPrice: prj.contractData.sellingPrice || 0,
          estimatedCost: prj.contractData.estimatedCost || 0,
          laborCost: prj.contractData.laborCost || 0,
          totalManDays: prj.contractData.totalManDays || 0,
          otherCost: prj.contractData.otherCost || 0,
          contractNumber: prj.contractData.contractNumber || '',
          contractDate: prj.contractData.contractDate || '',
        });
      }
    }
  };

  useEffect(() => {
    loadProjectDetails();
  }, [projectId]);

  if (!project) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Text type="secondary">Không tìm thấy thông tin dự án</Text>
      </div>
    );
  }

  const stages = project.stages || [];
  const currentStageIndex = stages.findIndex((s) => s.stageCode === activeStageCode);
  const activeStage = stages.find((s) => s.stageCode === activeStageCode) || stages[0];

  // Helper to recalculate financials
  const handleCalculateFinancials = (changedValues, allValues) => {
    const sellingPrice = Number(allValues.sellingPrice || 0);
    const estimatedCost = Number(allValues.estimatedCost || 0);
    const laborCost = Number(allValues.laborCost || 0);
    const otherCost = Number(allValues.otherCost || 0);

    const totalCost = estimatedCost + laborCost + otherCost;
    const profit = sellingPrice - totalCost;
    const profitMargin = sellingPrice > 0 ? ((profit / sellingPrice) * 100).toFixed(1) : 0;

    return { profit, profitMargin };
  };

  const handleSaveFinancials = async () => {
    try {
      const values = await financialForm.validateFields();
      const sellingPrice = Number(values.sellingPrice || 0);
      const totalCost = Number(values.estimatedCost || 0) + Number(values.laborCost || 0) + Number(values.otherCost || 0);
      const profit = sellingPrice - totalCost;
      const profitMargin = sellingPrice > 0 ? parseFloat(((profit / sellingPrice) * 100).toFixed(1)) : 0;

      const updatedContract = {
        ...project.contractData,
        ...values,
        profit,
        profitMargin,
      };

      const updatedPrj = {
        ...project,
        contractData: updatedContract,
      };

      projectWorkflowService.updateProject(updatedPrj);
      projectWorkflowService.addActivityLog(project.id, 'Cập nhật thông tin tài chính hợp đồng');
      message.success('Cập nhật thông tin hợp đồng & lợi nhuận thành công!');
      loadProjectDetails();
    } catch (e) {
      console.error(e);
    }
  };

  // Confirm Contract Stage by Department
  const handleDepartmentConfirm = (department) => {
    const updated = projectWorkflowService.confirmContractStage(project.id, department, `Đại diện ${department}`);
    if (updated) {
      message.success(`${department} đã xác nhận chốt hợp đồng & tài chính!`);
      loadProjectDetails();
    }
  };

  // Request Unlock
  const handleSendUnlockRequest = () => {
    if (!unlockReason.trim()) {
      message.warning('Vui lòng nhập lý do mở khóa!');
      return;
    }
    projectWorkflowService.requestUnlockContract(project.id, 'Người dùng phòng ban', unlockReason);
    message.success('Đã gửi yêu cầu mở khóa đến Giám đốc/Quản lý dự án!');
    setUnlockModalVisible(false);
    setUnlockReason('');
    loadProjectDetails();
  };

  // Approve Unlock by Manager
  const handleApproveUnlock = (requestId, isApproved) => {
    projectWorkflowService.approveUnlockRequest(requestId, isApproved, 'Giám đốc Ban Dự án', 'Duyệt mở khóa trực tiếp từ màn hình chi tiết');
    message.success(isApproved ? 'Đã duyệt mở khóa hợp đồng!' : 'Đã từ chối yêu cầu mở khóa!');
    loadProjectDetails();
  };

  // Developer Allocation save
  const handleSaveDevAllocation = async () => {
    try {
      const values = await devForm.validateFields();
      const currentDevs = project.programmingData?.devAllocations || [];
      const newDev = {
        id: `DEV-${Date.now()}`,
        name: values.name,
        allocatedDays: Number(values.allocatedDays || 0),
        usedDays: 0,
        status: 'IN_PROGRESS',
      };
      const updatedDevs = [...currentDevs, newDev];
      const updatedPrj = {
        ...project,
        programmingData: {
          ...project.programmingData,
          devAllocations: updatedDevs,
        },
      };
      projectWorkflowService.updateProject(updatedPrj);
      message.success('Đã phân công Lập trình viên mới');
      setDevModalVisible(false);
      loadProjectDetails();
    } catch (e) {
      console.error(e);
    }
  };

  // Bug save
  const handleSaveBug = async () => {
    try {
      const values = await bugForm.validateFields();
      const bugs = project.testerData?.bugs || [];
      const newBug = {
        id: `BUG-${Date.now()}`,
        code: `BUG-${bugs.length + 101}`,
        title: values.title,
        severity: values.severity,
        priority: values.priority,
        status: 'OPEN',
        assignedTo: values.assignedTo,
        createdDate: new Date().toISOString().slice(0, 10),
        feature: values.feature || 'Hệ thống',
      };
      const updatedBugs = [newBug, ...bugs];
      const updatedPrj = {
        ...project,
        testerData: {
          ...project.testerData,
          bugs: updatedBugs,
        },
      };
      projectWorkflowService.updateProject(updatedPrj);
      message.success('Đã log Bug mới!');
      setBugModalVisible(false);
      loadProjectDetails();
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateBugStatus = (bugId, nextStatus) => {
    const bugs = project.testerData?.bugs || [];
    const target = bugs.find((b) => b.id === bugId);
    if (target) {
      target.status = nextStatus;
      projectWorkflowService.updateProject(project);
      message.success(`Đã chuyển trạng thái Bug ${target.code} sang ${nextStatus}`);
      loadProjectDetails();
    }
  };

  // Handover checklist toggle
  const handleToggleHandoverCheck = (itemId) => {
    const checklist = project.handoverData?.checklist || [];
    const item = checklist.find((c) => c.id === itemId);
    if (item) {
      item.isDone = !item.isDone;
      projectWorkflowService.updateProject(project);
      loadProjectDetails();
    }
  };

  // Payment installment save
  const handleSavePayment = async () => {
    try {
      const values = await paymentForm.validateFields();
      const installments = project.accountingData?.installments || [];
      const newIns = {
        id: `INS-${installments.length + 1}`,
        name: values.name,
        amount: Number(values.amount || 0),
        dueDate: values.dueDate,
        status: 'PENDING',
        paidDate: null,
        receiptNo: '',
      };
      const updatedIns = [...installments, newIns];
      const updatedPrj = {
        ...project,
        accountingData: {
          ...project.accountingData,
          installments: updatedIns,
        },
      };
      projectWorkflowService.updateProject(updatedPrj);
      message.success('Đã thêm đợt thanh toán mới');
      setPaymentModalVisible(false);
      loadProjectDetails();
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkPaymentPaid = (installmentId) => {
    const installments = project.accountingData?.installments || [];
    const target = installments.find((i) => i.id === installmentId);
    if (target) {
      target.status = 'PAID';
      target.paidDate = new Date().toISOString().slice(0, 10);
      target.receiptNo = `PT-2026-${Math.floor(Math.random() * 9000 + 1000)}`;

      // Recalculate collected
      const totalCollected = installments
        .filter((i) => i.status === 'PAID')
        .reduce((sum, i) => sum + i.amount, 0);

      project.accountingData.totalCollected = totalCollected;
      project.accountingData.remainingAmount = (project.contractData?.sellingPrice || 0) - totalCollected;

      projectWorkflowService.updateProject(project);
      message.success(`Đã xác nhận thu tiền đợt "${target.name}"!`);
      loadProjectDetails();
    }
  };

  // Advance Stage
  const handleAdvanceNextStage = () => {
    if (currentStageIndex < stages.length - 1) {
      const currentStgObj = stages[currentStageIndex];
      currentStgObj.status = 'DONE';

      const nextStgObj = stages[currentStageIndex + 1];
      nextStgObj.status = 'IN_PROGRESS';

      project.currentStageId = nextStgObj.stageCode;
      projectWorkflowService.updateProject(project);

      projectWorkflowService.addActivityLog(
        project.id,
        `Hoàn thành giai đoạn ${currentStgObj.name} và chuyển sang ${nextStgObj.name}`
      );

      message.success(`Đã chuyển dự án sang giai đoạn ${nextStgObj.name}!`);
      setActiveStageCode(nextStgObj.stageCode);
      loadProjectDetails();
    }
  };

  const isContractLocked = project.contractData?.isLocked;
  const unlockRequests = projectWorkflowService.getUnlockRequests(project.id);
  const activityLogs = projectWorkflowService.getActivityLogs(project.id);

  return (
    <div className={styles.container}>
      {/* Header Info Banner */}
      <Card
        style={{
          borderRadius: 12,
          marginBottom: 16,
          background: 'linear-gradient(135deg, #1890ff 0%, #003a8c 100%)',
          color: '#fff',
        }}
      >
        <Row align="middle" justify="space-between">
          <Col span={16}>
            <Space size="middle" align="start">
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 12,
                  background: 'rgba(255,255,255,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: 24,
                  fontWeight: 'bold',
                }}
              >
                {project.code?.slice(-3) || 'PRJ'}
              </div>
              <div>
                <Title level={3} style={{ color: '#fff', margin: 0 }}>
                  {project.name}
                </Title>
                <Space style={{ marginTop: 4 }}>
                  <Tag color="cyan">Khách hàng: {project.customerName}</Tag>
                  <Tag color="gold">PM: {project.managerName}</Tag>
                  <Tag color="purple">Workflow: {project.workflowCode}</Tag>
                </Space>
              </div>
            </Space>
          </Col>
          <Col span={8} style={{ textAlign: 'right' }}>
            <Button type="default" size="large" onClick={() => navigate('/quan-ly-du-an/danh-sach')}>
              Quay lại Danh Sách Dự Án
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Dynamic Workflow Stepper */}
      <Card title="Chuỗi Giai Đoạn Quy Trình Dự Án (Click vào Giai đoạn để làm việc)" style={{ borderRadius: 12, marginBottom: 16 }}>
        <Steps
          current={currentStageIndex >= 0 ? currentStageIndex : 0}
          onChange={(current) => setActiveStageCode(stages[current]?.stageCode)}
          items={stages.map((stg) => {
            let status = 'wait';
            if (stg.status === 'DONE') status = 'finish';
            else if (stg.status === 'IN_PROGRESS') status = 'process';
            return {
              title: stg.stageCode,
              description: (
                <div style={{ fontSize: 12 }}>
                  <Text strong>{stg.name.split('–')[1] || stg.name}</Text>
                  {stg.isLockable && isContractLocked && (
                    <div>
                      <Tag color="red" style={{ fontSize: 10 }}>LOCKED</Tag>
                    </div>
                  )}
                </div>
              ),
              status,
            };
          })}
        />
      </Card>

      {/* Main Workspace for Active Stage */}
      <Card
        title={
          <Row align="middle" justify="space-between">
            <Col>
              <Space>
                <Tag color="blue" style={{ fontSize: 16, padding: '4px 12px' }}>
                  {activeStage?.name}
                </Tag>
                <Text type="secondary">Phòng ban tham gia: </Text>
                {(activeStage?.departments || []).map((d) => (
                  <Tag color="purple" key={d}>
                    {d}
                  </Tag>
                ))}
              </Space>
            </Col>
            <Col>
              {currentStageIndex < stages.length - 1 && (
                <Popconfirm
                  title="Chuyển sang giai đoạn tiếp theo?"
                  description={`Xác nhận hoàn thành giai đoạn hiện tại để mở ${stages[currentStageIndex + 1]?.name}`}
                  onConfirm={handleAdvanceNextStage}
                >
                  <Button type="primary" icon={<ArrowRightOutlined size={16} />}>
                    Hoàn Thành & Chuyển Giai Đoạn Tiếp Theo
                  </Button>
                </Popconfirm>
              )}
            </Col>
          </Row>
        }
        style={{ borderRadius: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}
      >
        {/* Stage Tasks List */}
        <div style={{ marginBottom: 24 }}>
          <Title level={5}>Danh sách Công việc thuộc Giai đoạn {activeStage?.stageCode}:</Title>
          <Table
            size="small"
            pagination={false}
            rowKey="id"
            dataSource={activeStage?.tasks || []}
            columns={[
              {
                title: 'Mã CV',
                dataIndex: 'code',
                render: (c) => <Tag color="geekblue">{c}</Tag>,
              },
              {
                title: 'Tên Công Việc',
                dataIndex: 'name',
                render: (n) => <Text strong>{n}</Text>,
              },
              {
                title: 'Phòng Ban',
                dataIndex: 'department',
                render: (d) => <Tag color="blue">{d}</Tag>,
              },
              {
                title: 'Người Phụ Trách',
                dataIndex: 'assignee',
                render: (a) => a || 'Chưa gán',
              },
              {
                title: 'Xác Nhận Đa Phòng Ban',
                key: 'confirmations',
                render: (_, record) => (
                  <Space>
                    {(record.confirmations || []).map((cnf) => (
                      <Tag color={cnf.isConfirmed ? 'success' : 'warning'} key={cnf.department}>
                        {cnf.department}: {cnf.isConfirmed ? 'ĐÃ XÁC NHẬN' : 'Chờ xác nhận'}
                      </Tag>
                    ))}
                  </Space>
                ),
              },
              {
                title: 'Trạng Thái',
                dataIndex: 'status',
                render: (s) => (
                  <Tag color={s === 'DONE' ? 'green' : s === 'IN_PROGRESS' ? 'blue' : 'default'}>
                    {s}
                  </Tag>
                ),
              },
            ]}
          />
        </div>

        <Divider />

        {/* SPECIALIZED PANELS ACCORDING TO STAGE TYPE */}

        {/* STAGE 3: CONTRACT & PROFIT (HỢP ĐỒNG & LỢI NHUẬN) WITH DATA LOCK */}
        {activeStageCode === 'GD03' && (
          <div>
            <Title level={4}>
              <DollarOutlined /> Quản Lý Hợp Đồng, Lợi Nhuận & Cơ Chế LOCK Dữ Liệu
            </Title>
            <Paragraph type="secondary">
              Sau khi Kinh doanh và Kỹ thuật cùng xác nhận chốt số liệu, dữ liệu Hợp đồng & Lợi nhuận sẽ bị <strong>LOCK</strong>. Không ai được tự ý chỉnh sửa giá bán hay chi phí trừ khi xin mở khóa được quản lý phê duyệt.
            </Paragraph>

            {isContractLocked ? (
              <Alert
                message="DỮ LIỆU ĐÃ BỊ LOCK CHÍNH THỨC"
                description={`Đã được khóa vào lúc ${project.contractData.lockedAt} bởi ${project.contractData.lockedBy}. Muốn chỉnh sửa giá bán hoặc chi phí, vui lòng gửi Yêu cầu Mở khóa.`}
                type="warning"
                showIcon
                icon={<LockOutlined style={{ fontSize: 24 }} />}
                action={
                  <Button type="primary" danger icon={<UnlockOutlined />} onClick={() => setUnlockModalVisible(true)}>
                    Xin Mở Khóa Chỉnh Sửa
                  </Button>
                }
                style={{ marginBottom: 20 }}
              />
            ) : (
              <Alert
                message="Dữ Liệu Đang Ở Trạng Thái MỞ KHÓA"
                description="Có thể nhập và điều chỉnh số liệu giá bán, chi phí. Bấm nút 'Lưu thông tin' và thực hiện Xác nhận từ 2 phòng ban để LOCK dữ liệu."
                type="info"
                showIcon
                icon={<UnlockOutlined style={{ fontSize: 24 }} />}
                style={{ marginBottom: 20 }}
              />
            )}

            <Form
              form={financialForm}
              layout="vertical"
              onValuesChange={handleCalculateFinancials}
              disabled={isContractLocked}
            >
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item name="contractNumber" label="Số Hợp Đồng Thương Mại">
                    <Input placeholder="VD: HD-2026/ABC-SOF" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="contractDate" label="Ngày Ký Hợp Đồng">
                    <Input placeholder="VD: 2026-02-15" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="sellingPrice" label="Giá Bán Hợp Đồng (VNĐ)" rules={[{ required: true }]}>
                    <InputNumber
                      style={{ width: '100%' }}
                      formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      parser={(val) => val.replace(/\$\s?|(,*)/g, '')}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={6}>
                  <Form.Item name="estimatedCost" label="Chi Phí Dự Kiến (VNĐ)">
                    <InputNumber
                      style={{ width: '100%' }}
                      formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      parser={(val) => val.replace(/\$\s?|(,*)/g, '')}
                    />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="laborCost" label="Chi Phí Nhân Sự (VNĐ)">
                    <InputNumber
                      style={{ width: '100%' }}
                      formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      parser={(val) => val.replace(/\$\s?|(,*)/g, '')}
                    />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="totalManDays" label="Số Ngày Công Quy Đổi">
                    <InputNumber style={{ width: '100%' }} suffix="ngày công" />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="otherCost" label="Chi Phí Khác (Server/Cloud...)">
                    <InputNumber
                      style={{ width: '100%' }}
                      formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      parser={(val) => val.replace(/\$\s?|(,*)/g, '')}
                    />
                  </Form.Item>
                </Col>
              </Row>

              {!isContractLocked && (
                <Form.Item>
                  <Button type="primary" size="large" onClick={handleSaveFinancials}>
                    Lưu Số Liệu Hợp Đồng & Lợi Nhuận
                  </Button>
                </Form.Item>
              )}
            </Form>

            {/* Calculated Statistics summary */}
            <Card style={{ background: '#fafafa', borderRadius: 8, marginBottom: 20 }}>
              <Row gutter={16} textAlign="center">
                <Col span={8}>
                  <Statistic
                    title="Tổng Giá Bán Hợp Đồng"
                    value={project.contractData?.sellingPrice || 0}
                    suffix="VNĐ"
                    valueStyle={{ color: '#1677ff', fontWeight: 'bold' }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="Lợi Nhuận Ước Tính"
                    value={project.contractData?.profit || 0}
                    suffix="VNĐ"
                    valueStyle={{ color: '#52c41a', fontWeight: 'bold' }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="Tỷ Suất Lợi Nhuận"
                    value={project.contractData?.profitMargin || 0}
                    suffix="%"
                    valueStyle={{ color: '#722ed1', fontWeight: 'bold' }}
                  />
                </Col>
              </Row>
            </Card>

            {/* Multi-Department Confirmation Box */}
            <Card title="Xác Nhận Chốt Số Liệu Từ Các Phòng Ban" style={{ borderRadius: 8, marginBottom: 20 }}>
              <Row gutter={16}>
                <Col span={12}>
                  <Card size="small" title="1. Phòng Kinh Doanh Xác Nhận">
                    {project.contractData?.confirmations?.kinhDoanh?.confirmed ? (
                      <Alert
                        message={`Đã xác nhận bởi: ${project.contractData.confirmations.kinhDoanh.confirmedBy}`}
                        description={`Vào lúc: ${project.contractData.confirmations.kinhDoanh.confirmedAt}`}
                        type="success"
                        showIcon
                      />
                    ) : (
                      <div>
                        <Paragraph type="secondary">Chưa xác nhận chốt hợp đồng.</Paragraph>
                        <Button type="primary" onClick={() => handleDepartmentConfirm('Kinh doanh')}>
                          Kinh Doanh Xác Nhận Chốt
                        </Button>
                      </div>
                    )}
                  </Card>
                </Col>
                <Col span={12}>
                  <Card size="small" title="2. Phòng Kỹ Thuật Xác Nhận">
                    {project.contractData?.confirmations?.kyThuat?.confirmed ? (
                      <Alert
                        message={`Đã xác nhận bởi: ${project.contractData.confirmations.kyThuat.confirmedBy}`}
                        description={`Vào lúc: ${project.contractData.confirmations.kyThuat.confirmedAt}`}
                        type="success"
                        showIcon
                      />
                    ) : (
                      <div>
                        <Paragraph type="secondary">Chưa xác nhận phạm vi kỹ thuật & ngày công.</Paragraph>
                        <Button type="primary" onClick={() => handleDepartmentConfirm('Kỹ thuật')}>
                          Kỹ Thuật Xác Nhận Chốt
                        </Button>
                      </div>
                    )}
                  </Card>
                </Col>
              </Row>
            </Card>

            {/* Unlock Requests & Audit Logs Table */}
            <Row gutter={16}>
              <Col span={12}>
                <Card title="Yêu Cầu Mở Khóa Hợp Đồng & Phê Duyệt" size="small">
                  <Table
                    size="small"
                    pagination={false}
                    dataSource={unlockRequests}
                    rowKey="id"
                    columns={[
                      { title: 'Người Yêu Cầu', dataIndex: 'requestedBy' },
                      { title: 'Lý Do Xin Mở Khóa', dataIndex: 'reason' },
                      {
                        title: 'Trạng Thái',
                        dataIndex: 'status',
                        render: (s, req) => (
                          <div>
                            {s === 'APPROVED' ? (
                              <Tag color="green">ĐÃ DUYỆT</Tag>
                            ) : s === 'REJECTED' ? (
                              <Tag color="red">TỪ CHỐI</Tag>
                            ) : (
                              <Tag color="gold">CHỜ DUYỆT</Tag>
                            )}
                            {s === 'PENDING' && (
                              <Space style={{ marginTop: 4 }}>
                                <Button size="small" type="primary" onClick={() => handleApproveUnlock(req.id, true)}>
                                  Duyệt
                                </Button>
                                <Button size="small" danger onClick={() => handleApproveUnlock(req.id, false)}>
                                  Từ chối
                                </Button>
                              </Space>
                            )}
                          </div>
                        ),
                      },
                    ]}
                  />
                </Card>
              </Col>
              <Col span={12}>
                <Card title="Nhật Ký Hoạt Động & Lịch Sử LOCK/UNLOCK" size="small">
                  <Timeline
                    mode="left"
                    items={activityLogs.map((l) => ({
                      children: (
                        <div>
                          <Text strong>{l.timestamp}</Text> - <Text type="secondary">{l.user}</Text>
                          <div>{l.detail}</div>
                        </div>
                      ),
                    }))}
                  />
                </Card>
              </Col>
            </Row>
          </div>
        )}

        {/* STAGE 4: PROGRAMMING EXECUTION (THỰC THI LẬP TRÌNH) */}
        {activeStageCode === 'GD04' && (
          <div>
            <Title level={4}>
              <CodeOutlined /> Thực Thi Lập Trình & Quản Lý Ngày Công Dev
            </Title>

            <Row gutter={16} style={{ marginBottom: 20 }}>
              <Col span={8}>
                <Card size="small">
                  <Statistic
                    title="Kế Hoạch Tổng Ngày Công"
                    value={project.programmingData?.totalPlannedDays || 100}
                    suffix="ngày công"
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small">
                  <Statistic
                    title="Đã Sử Dụng"
                    value={project.programmingData?.usedDays || 60}
                    suffix="ngày"
                    valueStyle={{ color: '#1677ff' }}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small">
                  <Statistic
                    title="Còn Lại"
                    value={project.programmingData?.remainingDays || 40}
                    suffix="ngày"
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Card>
              </Col>
            </Row>

            <div style={{ marginBottom: 20 }}>
              <Text strong>Tiến độ tiêu thụ ngày công dự án: </Text>
              <Progress
                percent={Math.round(
                  ((project.programmingData?.usedDays || 60) / (project.programmingData?.totalPlannedDays || 100)) *
                  100
                )}
                status="active"
              />
            </div>

            <Card
              title="Bảng Phân Công Lập Trình Viên & Theo Dõi Tiến Độ Chi Tiết"
              extra={
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setDevModalVisible(true)}>
                  Phân Công Dev Mới
                </Button>
              }
              style={{ marginBottom: 20 }}
            >
              <Table
                pagination={false}
                rowKey="id"
                dataSource={project.programmingData?.devAllocations || []}
                columns={[
                  {
                    title: 'Lập Trình Viên',
                    dataIndex: 'name',
                    render: (n) => <Text strong>{n}</Text>,
                  },
                  {
                    title: 'Số Ngày Công Phân Phối',
                    dataIndex: 'allocatedDays',
                    render: (d) => `${d} ngày`,
                  },
                  {
                    title: 'Đã Thực Hiện',
                    dataIndex: 'usedDays',
                    render: (d) => `${d} ngày`,
                  },
                  {
                    title: 'Còn Lại',
                    key: 'rem',
                    render: (_, r) => `${r.allocatedDays - r.usedDays} ngày`,
                  },
                  {
                    title: 'Tiến độ',
                    key: 'prog',
                    render: (_, r) => (
                      <Progress
                        percent={Math.round((r.usedDays / r.allocatedDays) * 100)}
                        size="small"
                      />
                    ),
                  },
                  {
                    title: 'Trạng thái',
                    dataIndex: 'status',
                    render: (s) => <Tag color="blue">{s}</Tag>,
                  },
                ]}
              />
            </Card>

            <Card title="Quản Lý Công Việc Phát Sinh">
              <Table
                pagination={false}
                rowKey="id"
                dataSource={project.programmingData?.extraTasks || []}
                columns={[
                  { title: 'Tên CV Phát Sinh', dataIndex: 'name' },
                  { title: 'Số Ngày Công', dataIndex: 'manDays', render: (d) => `${d} ngày` },
                  { title: 'Bên Yêu Cầu', dataIndex: 'requestedBy' },
                  { title: 'Trạng Thái', dataIndex: 'status', render: (s) => <Tag color="green">{s}</Tag> },
                ]}
              />
            </Card>
          </div>
        )}

        {/* STAGE 5: TESTER & BUG MANAGEMENT */}
        {activeStageCode === 'GD05' && (
          <div>
            <Title level={4}>
              <BugOutlined /> Phân Hệ Tester & Quản Lý Bug Kiểm Thử
            </Title>

            <Row gutter={16} style={{ marginBottom: 20 }}>
              <Col span={8}>
                <Card size="small">
                  <Statistic title="Tổng Số Test Cases" value={project.testerData?.testCasesCount || 45} />
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small">
                  <Statistic
                    title="Test Cases PASSED"
                    value={project.testerData?.passedCases || 38}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small">
                  <Statistic
                    title="Bug Cần Sửa (Failed)"
                    value={project.testerData?.failedCases || 4}
                    valueStyle={{ color: '#f5222d' }}
                  />
                </Card>
              </Col>
            </Row>

            <Card
              title="Danh Sách Bug & Tiến Độ Retest (Tester ↔ Kỹ thuật)"
              extra={
                <Button type="primary" icon={<PlusOutlined />} danger onClick={() => setBugModalVisible(true)}>
                  Log Bug Mới
                </Button>
              }
            >
              <Table
                pagination={false}
                rowKey="id"
                dataSource={project.testerData?.bugs || []}
                columns={[
                  { title: 'Mã Bug', dataIndex: 'code', render: (c) => <Tag color="red">{c}</Tag> },
                  { title: 'Mô Tả Lỗi', dataIndex: 'title', render: (t) => <Text strong>{t}</Text> },
                  { title: 'Chức Năng', dataIndex: 'feature' },
                  {
                    title: 'Mức Độ Ưu Tiên',
                    dataIndex: 'severity',
                    render: (s) => (
                      <Tag color={s === 'HIGH' || s === 'CRITICAL' ? 'red' : 'orange'}>{s}</Tag>
                    ),
                  },
                  { title: 'Dev Phụ Trách', dataIndex: 'assignedTo' },
                  {
                    title: 'Trạng Thái Bug',
                    dataIndex: 'status',
                    render: (s) => {
                      if (s === 'PASSED') return <Tag color="green">PASSED</Tag>;
                      if (s === 'RETEST') return <Tag color="cyan">CHỜ RETEST</Tag>;
                      if (s === 'IN_FIX') return <Tag color="blue">ĐANG SỬA</Tag>;
                      return <Tag color="red">OPEN</Tag>;
                    },
                  },
                  {
                    title: 'Thao Tác Retest',
                    key: 'act',
                    render: (_, bug) => (
                      <Space>
                        {bug.status === 'OPEN' && (
                          <Button size="small" onClick={() => handleUpdateBugStatus(bug.id, 'IN_FIX')}>
                            Gán Sửa
                          </Button>
                        )}
                        {bug.status === 'IN_FIX' && (
                          <Button size="small" type="primary" onClick={() => handleUpdateBugStatus(bug.id, 'RETEST')}>
                            Dev Sửa Xong -&gt; Chờ Retest
                          </Button>
                        )}
                        {bug.status === 'RETEST' && (
                          <Button
                            size="small"
                            type="primary"
                            style={{ background: '#52c41a', borderColor: '#52c41a' }}
                            onClick={() => handleUpdateBugStatus(bug.id, 'PASSED')}
                          >
                            Tester Pass
                          </Button>
                        )}
                      </Space>
                    ),
                  },
                ]}
              />
            </Card>
          </div>
        )}

        {/* STAGE 6: HANDOVER (BÀN GIAO) */}
        {activeStageCode === 'GD06' && (
          <div>
            <Title level={4}>
              <FileDoneOutlined /> Checklist Bàn Giao Dự Án & Ký Nghiệm Thu
            </Title>
            <Paragraph type="secondary">
              Rà soát đầy đủ các mục trong checklist bàn giao trước khi bàn giao cho khách hàng nghiệm thu.
            </Paragraph>

            <Card title="Danh Mục Hạng Mục Bàn Giao (Checklist)" style={{ marginBottom: 20 }}>
              {(project.handoverData?.checklist || []).map((item) => (
                <div key={item.id} style={{ marginBottom: 12, padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                  <Checkbox checked={item.isDone} onChange={() => handleToggleHandoverCheck(item.id)}>
                    <Text strong style={{ fontSize: 15, textDecoration: item.isDone ? 'line-through' : 'none' }}>
                      {item.title}
                    </Text>
                  </Checkbox>
                  <Tag color={item.isDone ? 'green' : 'default'} style={{ marginLeft: 12 }}>
                    {item.isDone ? 'ĐÃ HOÀN THÀNH' : 'Chưa hoàn thành'}
                  </Tag>
                </div>
              ))}
            </Card>
          </div>
        )}

        {/* STAGE 7: ACCOUNTING INVOICING (KẾ TOÁN THU TIỀN) */}
        {activeStageCode === 'GD07' && (
          <div>
            <Title level={4}>
              <DollarOutlined /> Kế Toán Theo Dõi & Thu Hồi Công Nợ Hợp Đồng
            </Title>

            <Row gutter={16} style={{ marginBottom: 20 }}>
              <Col span={8}>
                <Card size="small">
                  <Statistic
                    title="Giá Trị Hợp Đồng"
                    value={project.contractData?.sellingPrice || 500000000}
                    suffix="VNĐ"
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small">
                  <Statistic
                    title="Đã Thu"
                    value={project.accountingData?.totalCollected || 300000000}
                    suffix="VNĐ"
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small">
                  <Statistic
                    title="Còn Phải Thu"
                    value={
                      (project.contractData?.sellingPrice || 500000000) -
                      (project.accountingData?.totalCollected || 300000000)
                    }
                    suffix="VNĐ"
                    valueStyle={{ color: '#f5222d' }}
                  />
                </Card>
              </Col>
            </Row>

            <Card
              title="Lịch Thanh Toán Theo Các Đợt Hợp Đồng"
              extra={
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setPaymentModalVisible(true)}>
                  Thêm Đợt Thanh Toán
                </Button>
              }
            >
              <Table
                pagination={false}
                rowKey="id"
                dataSource={project.accountingData?.installments || []}
                columns={[
                  { title: 'Đợt Thanh Toán', dataIndex: 'name', render: (n) => <Text strong>{n}</Text> },
                  {
                    title: 'Số Tiền',
                    dataIndex: 'amount',
                    render: (a) => `${a}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + ' VNĐ',
                  },
                  { title: 'Hạn Thanh Toán', dataIndex: 'dueDate' },
                  {
                    title: 'Trạng Thái',
                    dataIndex: 'status',
                    render: (s) => (s === 'PAID' ? <Tag color="green">ĐÃ THU TIỀN</Tag> : <Tag color="gold">CHƯA THU</Tag>),
                  },
                  { title: 'Số Chứng Từ/Phiếu Thu', dataIndex: 'receiptNo' },
                  {
                    title: 'Thao Tác',
                    key: 'act',
                    render: (_, ins) => (
                      ins.status !== 'PAID' && (
                        <Button type="primary" size="small" onClick={() => handleMarkPaymentPaid(ins.id)}>
                          Xác Nhận Đã Thu Tiền
                        </Button>
                      )
                    ),
                  },
                ]}
              />
            </Card>
          </div>
        )}

        {/* STAGE 8: MAINTENANCE (BẢO TRÌ) */}
        {activeStageCode === 'GD08' && (
          <div>
            <Title level={4}>
              <ToolOutlined /> Tiếp Nhận & Xử Lý Yêu Cầu Bảo Trì Dự Án
            </Title>

            <Card title="Danh Sách Ticket Bảo Trì Từ Khách Hàng">
              <Table
                pagination={false}
                rowKey="id"
                dataSource={project.maintenanceData?.tickets || []}
                columns={[
                  { title: 'Mã Ticket', dataIndex: 'id', render: (t) => <Tag color="purple">{t}</Tag> },
                  { title: 'Tiêu Đề Yêu Cầu', dataIndex: 'title', render: (t) => <Text strong>{t}</Text> },
                  { title: 'Bên Yêu Cầu', dataIndex: 'requestedBy' },
                  { title: 'Dev Xử Lý', dataIndex: 'assignedDev' },
                  { title: 'Ưu Tiên', dataIndex: 'priority', render: (p) => <Tag color="orange">{p}</Tag> },
                  { title: 'Trạng Thái', dataIndex: 'status', render: (s) => <Tag color="green">{s}</Tag> },
                ]}
              />
            </Card>
          </div>
        )}
      </Card>

      {/* Modal Xin Mở Khóa Hợp Đồng */}
      <Modal
        title="Gửi Yêu Cầu Mở Khóa Chỉnh Sửa Hợp Đồng"
        open={unlockModalVisible}
        onOk={handleSendUnlockRequest}
        onCancel={() => setUnlockModalVisible(false)}
        okText="Gửi Yêu Cầu Mở Khóa"
        cancelText="Hủy"
      >
        <Paragraph type="secondary">
          Nhập rõ lý do vì sao cần mở khóa dữ liệu giá bán/chi phí hợp đồng để gửi đến Giám đốc/Quản lý phê duyệt.
        </Paragraph>
        <Input.TextArea
          rows={4}
          value={unlockReason}
          onChange={(e) => setUnlockReason(e.target.value)}
          placeholder="VD: Cập nhật thêm phụ lục hợp đồng dịch vụ bổ sung máy chủ cloud..."
        />
      </Modal>

      {/* Modal Phân Công Dev */}
      <Modal
        title="Phân Công Lập Trình Viên"
        open={devModalVisible}
        onOk={handleSaveDevAllocation}
        onCancel={() => setDevModalVisible(false)}
      >
        <Form form={devForm} layout="vertical">
          <Form.Item name="name" label="Tên Dev & Vị trí" rules={[{ required: true }]}>
            <Input placeholder="VD: Dev D (Mobile Developer)" />
          </Form.Item>
          <Form.Item name="allocatedDays" label="Số Ngày Công Phân Phối" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} suffix="ngày" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Log Bug Mới */}
      <Modal
        title="Log Bug Mới (Tester)"
        open={bugModalVisible}
        onOk={handleSaveBug}
        onCancel={() => setBugModalVisible(false)}
      >
        <Form form={bugForm} layout="vertical">
          <Form.Item name="title" label="Tiêu đề / Mô tả Bug" rules={[{ required: true }]}>
            <Input placeholder="VD: Lỗi hiển thị sai tổng tiền trên phiếu xuất kho" />
          </Form.Item>
          <Form.Item name="feature" label="Tính năng / Module bị lỗi">
            <Input placeholder="VD: Quản lý Xuất Kho" />
          </Form.Item>
          <Form.Item name="severity" label="Mức độ ưu tiên" rules={[{ required: true }]}>
            <Select placeholder="Chọn mức độ">
              <Option value="LOW">Thấp (Low)</Option>
              <Option value="MEDIUM">Trung bình (Medium)</Option>
              <Option value="HIGH">Cao (High)</Option>
              <Option value="CRITICAL">Nghiêm trọng (Critical)</Option>
            </Select>
          </Form.Item>
          <Form.Item name="assignedTo" label="Gán Dev Sửa Bug" rules={[{ required: true }]}>
            <Input placeholder="VD: Dev B (Backend)" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Thêm Đợt Thanh Toán */}
      <Modal
        title="Thêm Đợt Thanh Toán Hợp Đồng"
        open={paymentModalVisible}
        onOk={handleSavePayment}
        onCancel={() => setPaymentModalVisible(false)}
      >
        <Form form={paymentForm} layout="vertical">
          <Form.Item name="name" label="Tên Đợt Thanh Toán" rules={[{ required: true }]}>
            <Input placeholder="VD: Đợt 4: Bảo hành hợp đồng 5%" />
          </Form.Item>
          <Form.Item name="amount" label="Số Tiền (VNĐ)" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
          </Form.Item>
          <Form.Item name="dueDate" label="Hạn Thanh Toán" rules={[{ required: true }]}>
            <Input placeholder="YYYY-MM-DD" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
