import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    Card, Row, Col, Form, Input, DatePicker, Button, Table, message, 
    Typography, Breadcrumb, Space, Empty, Tag 
} from 'antd';
import { 
    Save, RefreshCw, Home, Users, CalendarCheck, Search, Filter 
} from 'lucide-react';
import { lv_LoadDataAPI } from '../../../services/apiServices';
import SelectHinhThuc from '../../../components/DropDown/SelectHinhThuc';
import SelectLoaiDon from '../../../components/DropDown/SelectLoaiDon';
import SelectCa from '../../../components/DropDown/SelectCa';
import styles from './DonXinPhepTheoPhongBan.module.css';

const { Title, Text } = Typography;

const DonXinPhepTheoPhongBan = () => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [employees, setEmployees] = useState([]);
    const [selectedRowKeys, setSelectedRowKeys] = useState([]);

    // Filters for Employee List
    const [empFilters, setEmpFilters] = useState({
        maPhongBan: '',
        tenNhanVien: '',
        maNhanVien: ''
    });

    // Load Employee Data
    const loadEmployees = useCallback(async () => {
        setLoading(true);
        try {
            // Using jo_lv0004_1 for employee list as requested
            const data = await lv_LoadDataAPI('jo_lv0004_1', 'LoadDataView', empFilters);
            setEmployees(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error loading employees:', error);
            message.error('Không thể tải danh sách nhân viên');
        } finally {
            setLoading(false);
        }
    }, [empFilters]);

    useEffect(() => {
        loadEmployees();
    }, [loadEmployees]);

    // Handle Submit
    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            if (selectedRowKeys.length === 0) {
                message.warning('Vui lòng chọn ít nhất một nhân viên');
                return;
            }

            setLoading(true);
            const payload = {
                ...values,
                lv016: values.lv016 ? values.lv016.format('DD/MM/YYYY HH:mm:ss') : '',
                lv017: values.lv017 ? values.lv017.format('DD/MM/YYYY HH:mm:ss') : '',
                employeeIds: selectedRowKeys
            };

            await lv_LoadDataAPI('jo_lv0004', 'batch_add', payload);
            message.success('Tạo đơn xin phép hàng loạt thành công');
            setSelectedRowKeys([]);
        } catch (error) {
            console.error(error);
            message.error('Có lỗi xảy ra khi tạo đơn nghỉ phép hàng loạt');
        } finally {
            setLoading(false);
        }
    };

    const columns = useMemo(() => [
        {
            title: 'Mã nhân viên',
            dataIndex: 'lv001',
            key: 'lv001',
            width: 140,
            align: 'center',
        },
        {
            title: 'Tên nhân viên',
            dataIndex: 'lv002',
            key: 'lv002',
            width: 220,
        },
        {
            title: 'Chức vụ',
            dataIndex: 'lv005',
            key: 'lv005',
            width: 180,
        },
        {
            title: 'Mã phòng ban',
            dataIndex: 'TenPhongBan',
            key: 'TenPhongBan',
            width: 180,
            render: (text) => text ? <Tag color="blue">{text}</Tag> : '-'
        },
        {
            title: 'Code Machine',
            dataIndex: 'lv099',
            key: 'lv099',
            width: 140,
            align: 'center',
        },
        {
            title: 'Số thẻ',
            dataIndex: 'lv101',
            key: 'lv101',
            width: 140,
            align: 'center',
        },
        {
            title: 'Màu da',
            dataIndex: 'lv025',
            key: 'lv025',
            width: 130,
            align: 'center',
            render: (text) => text ? <Tag color="geekblue">{text}</Tag> : '-'
        },
    ], []);

    return (
        <div className={styles.container}>
            {/* Premium Breadcrumb */}
            <Breadcrumb
                style={{ 
                    marginBottom: '16px', 
                    fontSize: '14px', 
                    padding: '12px 16px', 
                    borderRadius: '4px', 
                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)', 
                    userSelect: 'none',
                    background: '#ffffff'
                }}
            >
                <Breadcrumb.Item>
                    <Home size={14} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                    Trang chủ
                </Breadcrumb.Item>
                <Breadcrumb.Item>Quản lý công việc</Breadcrumb.Item>
                <Breadcrumb.Item>Quản lý nghỉ phép</Breadcrumb.Item>
                <Breadcrumb.Item>Tạo đơn theo phòng ban</Breadcrumb.Item>
            </Breadcrumb>

            <div className={styles.pageTitle}>
                <CalendarCheck size={20} />
                Tạo Đơn Xin Phép Theo Phòng Ban
            </div>

            {/* batch leaves form details card */}
            <Card 
                className={styles.formCard}
                title={
                    <Space>
                        <CalendarCheck size={18} />
                        <span>Thông tin thiết lập nghỉ phép hàng loạt</span>
                    </Space>
                }
            >
                <Form
                    form={form}
                    layout="vertical"
                    className={styles.customForm}
                >
                    <Row gutter={16}>
                        <Col xs={24} sm={12} md={6}>
                            <Form.Item name="lv022" label="Loại nghỉ">
                                <SelectHinhThuc placeholder="Chọn loại nghỉ..." />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12} md={6}>
                            <Form.Item name="lv003" label="Hình thức">
                                <SelectLoaiDon placeholder="Chọn hình thức..." />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12} md={4}>
                            <Form.Item name="lv002" label="Ca">
                                <SelectCa placeholder="Chọn ca..." />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12} md={4}>
                            <Form.Item name="lv016" label="Từ ngày" rules={[{ required: true, message: 'Nhập ngày bắt đầu!' }]}>
                                <DatePicker showTime format="DD/MM/YYYY HH:mm" style={{ width: '100%' }} placeholder="Bắt đầu..." />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12} md={4}>
                            <Form.Item name="lv017" label="Đến ngày" rules={[{ required: true, message: 'Nhập ngày kết thúc!' }]}>
                                <DatePicker showTime format="DD/MM/YYYY HH:mm" style={{ width: '100%' }} placeholder="Kết thúc..." />
                            </Form.Item>
                        </Col>
                    </Row>
                    
                    <Row gutter={16} align="bottom">
                        <Col xs={24} md={18}>
                            <Form.Item name="lv008" label="Lý do xin phép">
                                <Input.TextArea rows={2} placeholder="Nhập lý do nghỉ phép chi tiết..." />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={6} style={{ textAlign: 'right', marginBottom: 24 }}>
                            <Button
                                type="primary" 
                                icon={<Save size={16} />} 
                                onClick={handleSubmit} 
                                loading={loading}
                                style={{ height: 40, width: '100%', borderRadius: 8, fontWeight: 600 }}
                            >
                                Xin phép hàng loạt
                            </Button>
                        </Col>
                    </Row>
                </Form>
            </Card>

            {/* Employee grid wrapper */}
            <div className={styles.pageWrapper}>
                <div style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                        <Users size={18} style={{ color: '#197dd3' }} />
                        <span style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b' }}>
                            Chọn nhân viên áp dụng ({selectedRowKeys.length} đã chọn)
                        </span>
                    </div>

                    {/* Filter and query toolbar */}
                    <Row justify="space-between" align="middle" className={styles.toolbarRow} style={{ flexWrap: 'wrap', gap: 8 }}>
                        <Col>
                            <Space size="small" wrap>
                                <Input
                                    placeholder="Tìm theo mã nhân viên..."
                                    prefix={<Search size={14} />}
                                    value={empFilters.maNhanVien}
                                    onChange={e => setEmpFilters({ ...empFilters, maNhanVien: e.target.value })}
                                    onPressEnter={loadEmployees}
                                    style={{ width: 220, borderRadius: 8 }}
                                />
                                <Input
                                    placeholder="Tìm theo tên nhân viên..."
                                    prefix={<Search size={14} />}
                                    value={empFilters.tenNhanVien}
                                    onChange={e => setEmpFilters({ ...empFilters, tenNhanVien: e.target.value })}
                                    onPressEnter={loadEmployees}
                                    style={{ width: 250, borderRadius: 8 }}
                                />
                                <Button 
                                    icon={<Filter size={16} />} 
                                    onClick={loadEmployees}
                                    loading={loading}
                                    type="primary"
                                >
                                    Lọc danh sách
                                </Button>
                                <Button 
                                    icon={<RefreshCw size={16} />} 
                                    onClick={() => {
                                        setEmpFilters({ maPhongBan: '', tenNhanVien: '', maNhanVien: '' });
                                        setSelectedRowKeys([]);
                                    }}
                                >
                                    Làm mới lọc
                                </Button>
                            </Space>
                        </Col>
                    </Row>

                    {/* Employee select table */}
                    <Table
                        className={styles.mainTable}
                        rowSelection={{
                            selectedRowKeys,
                            onChange: setSelectedRowKeys,
                            type: 'checkbox',
                        }}
                        columns={columns}
                        dataSource={employees.map(emp => ({ ...emp, key: emp.lv001 }))}
                        rowKey="lv001"
                        loading={loading}
                        pagination={{ 
                            pageSize: 15,
                            showTotal: (total) => `Tổng cộng: ${total} nhân viên`
                        }}
                        scroll={{ y: 400 }}
                        bordered
                        size="middle"
                        locale={{ emptyText: <Empty description="Không có nhân viên phù hợp" /> }}
                    />
                </div>
            </div>
        </div>
    );
};

export default DonXinPhepTheoPhongBan;
