import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    Table, Input, Button, Modal, Space, message, 
    Breadcrumb, Drawer, Form, Row, Col, Empty, Divider
} from 'antd';
import { 
    Home, Plus, RefreshCw, Edit, Trash2, Search, Users, Save, X
} from 'lucide-react';
import { lv_LoadDataAPI } from '../../../services/apiServices';
import styles from './TrangThaiDonXinPhep.module.css';

// Regex cho Mã (chỉ số)
const CODE_REGEX = /^[0-9]+$/;
// Regex cho Tên (chữ cái, số, khoảng trắng, tiếng Việt)
const NAME_REGEX = /^[a-zA-Z0-9\s\u00C0-\u1EF9]+$/;

const TrangThaiDonXinPhep = () => {
    const [dataList, setDataList] = useState([]);
    const [filteredList, setFilteredList] = useState([]);
    const [searchText, setSearchText] = useState('');
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    
    // Selection state
    const [selectedRowKeys, setSelectedRowKeys] = useState([]);

    // Drawer sidebar states
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [form] = Form.useForm();

    // Quick Insert state
    const [quickItem, setQuickItem] = useState({
        lv001: '', // Mã
        lv002: '', // Mô tả
    });

    const vclass = 'jo_lv0003';
    const vname = 'TrangThaiDonXinPhep';

    const handleSearch = useCallback(
        (s1) => {
            const filtered = dataList.filter((item) => {
                return (item.lv002?.toLowerCase() || '').includes(s1.toLowerCase());
            });
            setFilteredList(filtered);
        },
        [dataList],
    );

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await lv_LoadDataAPI(vclass, `load${vname}`);
            if (data && Array.isArray(data)) {
                const mapped = data.map((item) => ({
                    ...item,
                    key: item.lv001,
                }));
                setDataList(mapped);
                setFilteredList(mapped);
            }
        } catch (error) {
            console.error(`Error loading ${vname}:`, error);
            message.error(`Không thể tải danh sách trạng thái`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => handleSearch(searchText), 250);
        return () => clearTimeout(timer);
    }, [searchText, handleSearch]);

    const handleAdd = () => {
        setEditingItem(null);
        form.resetFields();
        setDrawerVisible(true);
    };

    const handleEdit = (record) => {
        setEditingItem(record);
        form.resetFields();
        form.setFieldsValue({
            ...record,
        });
        setDrawerVisible(true);
    };

    const handleEditSelected = () => {
        if (selectedRowKeys.length !== 1) {
            message.warning('Vui lòng chọn đúng 1 bản ghi để sửa');
            return;
        }
        const record = dataList.find((r) => r.lv001 === selectedRowKeys[0]);
        if (record) handleEdit(record);
    };

    const handleBatchDelete = () => {
        if (selectedRowKeys.length === 0) {
            message.warning('Vui lòng chọn ít nhất một bản ghi để xóa.');
            return;
        }
        Modal.confirm({
            title: 'Xác nhận xóa trạng thái',
            content: `Bạn có chắc chắn muốn xóa ${selectedRowKeys.length} trạng thái đơn đã chọn?`,
            okText: 'Xác nhận',
            cancelText: 'Hủy',
            okType: 'danger',
            onOk: async () => {
                setActionLoading(true);
                try {
                    for (const key of selectedRowKeys) {
                        await lv_LoadDataAPI(vclass, `xoa${vname}`, { lv001: key });
                    }
                    message.success(`Đã xóa thành công ${selectedRowKeys.length} trạng thái.`);
                    setSelectedRowKeys([]);
                    await loadData();
                } catch (error) {
                    console.error('Error deleting:', error);
                    message.error('Lỗi khi xóa trạng thái');
                } finally {
                    setActionLoading(false);
                }
            }
        });
    };

    const handleQuickSubmit = async () => {
        if (!quickItem.lv001 || !quickItem.lv002) {
            message.warning('Vui lòng nhập Mã và Mô tả cho trạng thái thêm nhanh');
            return;
        }
        const ma = quickItem.lv001.trim();
        const ten = quickItem.lv002.trim();

        if (!CODE_REGEX.test(ma)) {
            message.error('Mã phải là số');
            return;
        }
        if (!NAME_REGEX.test(ten)) {
            message.error('Mô tả không được chứa kí tự đặc biệt');
            return;
        }

        setLoading(true);
        try {
            const result = await lv_LoadDataAPI(vclass, `them${vname}`, { lv001: ma, lv002: ten });
            if (result === -2) {
                message.error('Mã đã tồn tại');
                return;
            }
            if (!result) {
                message.error('Thêm thất bại');
                return;
            }

            message.success('Thêm trạng thái nhanh thành công');
            setQuickItem({ lv001: '', lv002: '' });
            await loadData();
        } catch (error) {
            console.error('Error quick insert:', error);
            message.error('Không thể thêm trạng thái nhanh');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (values) => {
        try {
            const ten = values.lv002 ? values.lv002.toString().trim() : '';
            const ma = values.lv001 ? values.lv001.toString().trim() : '';

            // Validate Code (ma) only when adding new
            if (!editingItem) {
                if (!CODE_REGEX.test(ma)) {
                    message.error('Mã phải là số');
                    return;
                }
            }

            // Validate Name (ten)
            if (!NAME_REGEX.test(ten)) {
                message.error('Mô tả không được chứa kí tự đặc biệt');
                return;
            }

            if (editingItem) {
                await lv_LoadDataAPI(vclass, `sua${vname}`, values);
                message.success('Cập nhật trạng thái thành công');
            } else {
                const result = await lv_LoadDataAPI(vclass, `them${vname}`, values);
                if (result === -2) {
                    message.error('Mã đã tồn tại');
                    return;
                }
                if (!result) {
                    message.error('Thêm thất bại');
                    return;
                }
                message.success('Thêm trạng thái thành công');
            }
            setDrawerVisible(false);
            form.resetFields();
            setEditingItem(null);
            setSelectedRowKeys([]);
            await loadData();
        } catch (error) {
            console.error('Error saving:', error);
            message.error(editingItem ? 'Không thể cập nhật' : 'Không thể thêm mới');
        }
    };

    const columns = useMemo(() => [
        {
            title: 'Mã',
            dataIndex: 'lv001',
            key: 'lv001',
            width: '40%',
            align: 'center',
            sorter: (a, b) => (a.lv001 || '').localeCompare(b.lv001 || ''),
            render: (text, record) => {
                if (record.isQuickRow) {
                    return (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                            <Button
                                type="primary"
                                size="small"
                                shape="circle"
                                icon={<Plus size={14} />}
                                onClick={handleQuickSubmit}
                                title="Thêm nhanh (Click hoặc Enter)"
                                style={{ background: '#52c41a', borderColor: '#52c41a' }}
                            />
                            <Input
                                placeholder="Mã (Số)..."
                                size="small"
                                value={quickItem.lv001}
                                onChange={e => setQuickItem(prev => ({ ...prev, lv001: e.target.value }))}
                                style={{ width: 120 }}
                                onKeyDown={e => { if (e.key === 'Enter') handleQuickSubmit(); }}
                            />
                        </div>
                    );
                }
                return text;
            }
        },
        {
            title: 'Mô tả',
            dataIndex: 'lv002',
            key: 'lv002',
            width: '60%',
            align: 'center',
            ellipsis: true,
            sorter: (a, b) => (a.lv002 || '').localeCompare(b.lv002 || ''),
            render: (text, record) => {
                if (record.isQuickRow) {
                    return (
                        <Input
                            placeholder="Nhập mô tả trạng thái..."
                            size="small"
                            value={quickItem.lv002}
                            onChange={e => setQuickItem(prev => ({ ...prev, lv002: e.target.value }))}
                            onKeyDown={e => { if (e.key === 'Enter') handleQuickSubmit(); }}
                        />
                    );
                }
                return text;
            }
        }
    ], [quickItem]);

    const dataSource = useMemo(() => {
        return [
            { isQuickRow: true, lv001: 'quick', key: 'quick-row' },
            ...filteredList.map(item => ({ ...item, key: item.lv001 }))
        ];
    }, [filteredList]);

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
                <Breadcrumb.Item>Trạng thái Đơn xin phép</Breadcrumb.Item>
            </Breadcrumb>

            <div className={styles.pageTitle}>
                <Users size={20} />
                Trạng Thái Đơn Xin Phép
            </div>

            <div className={styles.pageWrapper}>
                {/* Search Toolbar */}
                <Row justify="space-between" align="middle" className={styles.toolbarRow} style={{ flexWrap: 'wrap', gap: 8 }}>
                    <Col>
                        <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 500 }}>
                            Danh sách trạng thái đơn
                        </span>
                    </Col>
                    <Col>
                        <Space size="small" wrap>
                            <Input.Search
                                placeholder="Tìm kiếm theo mô tả..."
                                allowClear
                                prefix={<Search size={16} />}
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value || '')}
                                onSearch={() => handleSearch(searchText)}
                                style={{ width: 300 }}
                            />
                            <Button icon={<RefreshCw size={16} />} onClick={loadData} loading={loading}>
                                Làm mới
                            </Button>
                            <Button type="primary" icon={<Plus size={16} />} onClick={handleAdd}>
                                Thêm mới
                            </Button>
                        </Space>
                    </Col>
                </Row>

                {/* Floating Batch Action Bar */}
                <div className={`${styles.batchActionBar} ${selectedRowKeys.length === 0 ? styles.batchActionBarDisabled : ''}`}>
                    <span style={{ fontWeight: 600, color: '#197dd3', marginRight: 8 }}>Thao tác hàng loạt:</span>
                    <Button 
                        icon={<Edit size={15} />} 
                        disabled={selectedRowKeys.length !== 1} 
                        onClick={handleEditSelected}
                    >
                        Sửa trạng thái
                    </Button>
                    
                    <Button 
                        danger
                        icon={<Trash2 size={15} />} 
                        disabled={selectedRowKeys.length === 0} 
                        loading={actionLoading}
                        onClick={handleBatchDelete}
                    >
                        Xóa trạng thái đã chọn
                    </Button>

                    <span style={{ marginLeft: 'auto', color: '#8c8c8c' }}>
                        Đã chọn <b>{selectedRowKeys.length}</b> dòng
                        {selectedRowKeys.length > 1 && <span style={{ color: '#faad14', marginLeft: 8 }}>(✔ Chọn đúng 1 dòng để sửa)</span>}
                    </span>
                </div>

                {/* Table */}
                <Table
                    className={styles.mainTable}
                    columns={columns}
                    scroll={{ x: '100%', y: 'calc(100vh - 280px)' }}
                    dataSource={dataSource}
                    loading={loading}
                    rowKey={(record) => record.isQuickRow ? 'quick-row' : record.lv001}
                    rowSelection={{
                        selectedRowKeys,
                        onChange: setSelectedRowKeys,
                        getCheckboxProps: (record) => ({
                            disabled: record.isQuickRow,
                        }),
                    }}
                    pagination={{
                        pageSize: 15,
                        showSizeChanger: true,
                        pageSizeOptions: ['15', '30', '50', '100'],
                        showTotal: (total) => `Tổng số: ${total - 1} trạng thái`
                    }}
                    rowClassName={(record) => record.isQuickRow ? styles.quickRow : ''}
                    bordered
                    size="middle"
                    locale={{ emptyText: <Empty description="Không có dữ liệu trạng thái" /> }}
                />

                {/* Inline Quick Add triggers */}
                {quickItem.lv001 && quickItem.lv002 && (
                    <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button type="primary" icon={<Plus size={14} />} onClick={handleQuickSubmit} loading={loading} style={{ background: '#52c41a', borderColor: '#52c41a' }}>
                            Lưu trạng thái nhanh
                        </Button>
                    </div>
                )}
            </div>

            {/* Slide-out Sidebar Drawer form for Add/Edit */}
            <Drawer
                title={
                    <Space>
                        {editingItem ? <Edit size={18} /> : <Plus size={18} />}
                        {editingItem ? 'Chỉnh sửa Trạng thái' : 'Thêm Trạng thái mới'}
                    </Space>
                }
                placement="right"
                width={520}
                open={drawerVisible}
                onClose={() => { setDrawerVisible(false); form.resetFields(); }}
                className={styles.khoDrawer}
                destroyOnClose
                footer={
                    <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Button onClick={() => { setDrawerVisible(false); form.resetFields(); }} icon={<X size={16} />}>Huỷ</Button>
                        <Button type="primary" onClick={() => form.submit()} loading={loading} icon={<Save size={16} />}>
                            {editingItem ? 'Cập nhật' : 'Tạo mới'}
                        </Button>
                    </Space>
                }
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSubmit}
                    className={styles.customForm}
                >
                    <Divider className={styles.dividerSolid} orientation="left">THÔNG TIN TRẠNG THÁI</Divider>
                    <Form.Item
                        name="lv001"
                        label={<strong>Mã trạng thái:</strong>}
                        rules={[
                            { required: true, message: 'Vui lòng nhập mã!' },
                            { max: 10, message: 'Tối đa 10 ký tự' },
                        ]}
                    >
                        <Input disabled={!!editingItem} placeholder="VD: 1, 2, 3..." />
                    </Form.Item>

                    <Form.Item
                        name="lv002"
                        label={<strong>Mô tả trạng thái:</strong>}
                        rules={[
                            { required: true, message: 'Vui lòng nhập mô tả!' },
                            { max: 100, message: 'Tối đa 100 ký tự' },
                        ]}
                    >
                        <Input placeholder="VD: Chờ duyệt, Đồng ý, Từ chối..." />
                    </Form.Item>
                </Form>
            </Drawer>
        </div>
    );
};

export default TrangThaiDonXinPhep;
