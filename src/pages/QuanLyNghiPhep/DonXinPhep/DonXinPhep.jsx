import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Table, Button, Space, Input, Form,
    message, DatePicker,
    Breadcrumb, Drawer, Row, Col, Empty, Modal, Divider
} from 'antd';
import { 
    Plus, Edit, Trash2, Calendar, 
    RefreshCw, Home, Save, X
} from 'lucide-react';
import { lv_LoadDataAPI } from '../../../services/apiServices';
import styles from './DonXinPhep.module.css';
import SelectNhanVien from '../../../components/DropDown/SelectNhanVien';
import SelectLoaiDon from '../../../components/DropDown/SelectLoaiDon';
import SelectHinhThuc from '../../../components/DropDown/SelectHinhThuc';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const table = 'jo_lv0004';

const DonXinPhep = () => {
    const [donXinPhepList, setDonXinPhepList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    
    // Selection state
    const [selectedRowKeys, setSelectedRowKeys] = useState([]);
    
    // Drawer sidebar states
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);
    const [form] = Form.useForm();

    // Client-side filter states
    const [filters, setFilters] = useState({
        dateRange: null,
        employeeId: null,
        loaiDon: null,
        hinhThuc: null,
        searchText: '',
    });

    // Quick Insert state
    const [quickItem, setQuickItem] = useState({
        lv015: '', // Người xin phép
        lv003: '', // Loại đơn
        lv022: '', // Hình thức
        lv016: null, // Từ ngày
        lv017: null, // Đến ngày
        lv008: '', // Lý do
    });

    // Load all data
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const data = await lv_LoadDataAPI(table, 'loadDataView', {});
            if (data && Array.isArray(data)) {
                const mapped = data.map(item => ({
                    ...item,
                    key: item.lv001
                }));
                setDonXinPhepList(mapped);
            }
        } catch (error) {
            console.error('Error loading đơn xin phép:', error);
            message.error('Không thể tải danh sách đơn xin phép');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Client-side filtering
    const filteredList = useMemo(() => {
        return donXinPhepList.filter(item => {
            // Filter by date range
            if (filters.dateRange && filters.dateRange.length === 2) {
                const fromDate = filters.dateRange[0].startOf('day');
                const toDate = filters.dateRange[1].endOf('day');
                const itemFromDate = item.lv016 ? dayjs(item.lv016) : null;
                const itemToDate = item.lv017 ? dayjs(item.lv017) : null;

                if (itemFromDate && (itemFromDate.isBefore(fromDate) || itemFromDate.isAfter(toDate))) {
                    if (itemToDate && (itemToDate.isBefore(fromDate) || itemToDate.isAfter(toDate))) {
                        return false;
                    }
                }
            }

            // Filter by employee
            if (filters.employeeId && item.lv015 !== filters.employeeId) {
                return false;
            }

            // Filter by loai don
            if (filters.loaiDon && item.lv003 !== filters.loaiDon) {
                return false;
            }

            // Filter by hinh thuc
            if (filters.hinhThuc && item.lv022 !== filters.hinhThuc) {
                return false;
            }

            // Filter by search text
            if (filters.searchText) {
                const searchLower = filters.searchText.toLowerCase();
                const searchableFields = [
                    item.lv001,
                    item.tenNguoiXinPhep,
                    item.tenPhongBan,
                    item.tenLoaiDon,
                    item.tenHinhThuc,
                    item.lv008,
                ].filter(Boolean).join(' ').toLowerCase();

                if (!searchableFields.includes(searchLower)) {
                    return false;
                }
            }

            return true;
        });
    }, [donXinPhepList, filters]);

    const handleAdd = useCallback(() => {
        setEditingRecord(null);
        form.resetFields();
        setDrawerVisible(true);
    }, [form]);

    const handleEdit = useCallback((record) => {
        setEditingRecord(record);
        form.resetFields();
        form.setFieldsValue({
            ...record,
            lv016: record.lv016 ? dayjs(record.lv016) : null,
            lv017: record.lv017 ? dayjs(record.lv017) : null,
        });
        setDrawerVisible(true);
    }, [form]);

    const handleEditSelected = () => {
        if (selectedRowKeys.length !== 1) {
            message.warning('Vui lòng chọn đúng 1 bản ghi để sửa');
            return;
        }
        const record = donXinPhepList.find((r) => r.lv001 === selectedRowKeys[0]);
        if (record) {
            if (parseInt(record.lv021) > 0) {
                message.warning('Bản ghi đã được duyệt. Không thể sửa.');
                return;
            }
            handleEdit(record);
        }
    };

    const handleBatchCancel = () => {
        if (selectedRowKeys.length === 0) {
            message.warning('Vui lòng chọn ít nhất một bản ghi.');
            return;
        }
        const records = donXinPhepList.filter(item => selectedRowKeys.includes(item.lv001));
        const invalid = records.find(item => parseInt(item.lv021) !== 0);
        if (invalid) {
            message.error(`Đơn ${invalid.lv001} không ở trạng thái "Đợi duyệt". Không thể hủy.`);
            return;
        }
        Modal.confirm({
            title: 'Xác nhận hủy đơn',
            content: `Bạn có chắc chắn muốn hủy ${selectedRowKeys.length} đơn xin phép đã chọn?`,
            okText: 'Xác nhận',
            cancelText: 'Hủy',
            onOk: async () => {
                setActionLoading(true);
                try {
                    for (const key of selectedRowKeys) {
                        await lv_LoadDataAPI(table, 'cancel', { lv001: key });
                    }
                    message.success(`Đã hủy thành công ${selectedRowKeys.length} đơn xin phép.`);
                    setSelectedRowKeys([]);
                    await loadData();
                } catch (error) {
                    console.error('Error canceling:', error);
                    message.error('Lỗi khi hủy đơn xin phép');
                } finally {
                    setActionLoading(false);
                }
            }
        });
    };

    const handleBatchDelete = () => {
        if (selectedRowKeys.length === 0) {
            message.warning('Vui lòng chọn ít nhất một bản ghi.');
            return;
        }
        const records = donXinPhepList.filter(item => selectedRowKeys.includes(item.lv001));
        const invalid = records.find(item => parseInt(item.lv021) > 0);
        if (invalid) {
            message.error(`Đơn ${invalid.lv001} đã được duyệt. Không thể xóa.`);
            return;
        }
        Modal.confirm({
            title: 'Xác nhận xóa đơn',
            content: `Bạn có chắc chắn muốn xóa ${selectedRowKeys.length} đơn xin phép đã chọn?`,
            okText: 'Xác nhận',
            cancelText: 'Hủy',
            okType: 'danger',
            onOk: async () => {
                setActionLoading(true);
                try {
                    for (const key of selectedRowKeys) {
                        await lv_LoadDataAPI(table, 'delete', { lv001: key });
                    }
                    message.success(`Đã xóa thành công ${selectedRowKeys.length} đơn xin phép.`);
                    setSelectedRowKeys([]);
                    await loadData();
                } catch (error) {
                    console.error('Error deleting:', error);
                    message.error('Lỗi khi xóa đơn xin phép');
                } finally {
                    setActionLoading(false);
                }
            }
        });
    };

    const handleQuickSubmit = async () => {
        if (!quickItem.lv015 || !quickItem.lv003 || !quickItem.lv022 || !quickItem.lv016 || !quickItem.lv017) {
            message.warning('Vui lòng điền đầy đủ các trường bắt buộc cho dòng thêm nhanh');
            return;
        }
        setLoading(true);
        try {
            const payload = {
                ...quickItem,
                lv016: quickItem.lv016 ? quickItem.lv016.format('DD/MM/YYYY HH:mm:ss') : '',
                lv017: quickItem.lv017 ? quickItem.lv017.format('DD/MM/YYYY HH:mm:ss') : '',
            };
            const result = await lv_LoadDataAPI(table, 'add', payload);
            message.success('Thêm đơn xin phép nhanh thành công');
            setQuickItem({
                lv015: '',
                lv003: '',
                lv022: '',
                lv016: null,
                lv017: null,
                lv008: '',
            });
            await loadData();
        } catch (error) {
            console.error('Error quick insert:', error);
            message.error('Không thể thêm đơn xin phép nhanh');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (values) => {
        try {
            const payload = {
                ...values,
                lv016: values.lv016 ? values.lv016.format('DD/MM/YYYY HH:mm:ss') : '',
                lv017: values.lv017 ? values.lv017.format('DD/MM/YYYY HH:mm:ss') : '',
            };

            if (editingRecord) {
                payload.lv001 = editingRecord.lv001;
                await lv_LoadDataAPI(table, 'update', payload);
                message.success('Cập nhật đơn xin phép thành công');
            } else {
                await lv_LoadDataAPI(table, 'add', payload);
                message.success('Thêm đơn xin phép thành công');
            }

            setDrawerVisible(false);
            form.resetFields();
            setEditingRecord(null);
            setSelectedRowKeys([]);
            await loadData();
        } catch (error) {
            console.error('Error saving:', error);
            message.error(editingRecord ? 'Không thể cập nhật' : 'Không thể thêm đơn xin phép');
        }
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const handleClearFilters = () => {
        setFilters({
            dateRange: null,
            employeeId: null,
            loaiDon: null,
            hinhThuc: null,
            searchText: '',
        });
    };

    const getTrangThaiText = (lv021) => {
        switch (parseInt(lv021)) {
            case -1: return <span className={styles.statusCanceled}>Đã hủy</span>;
            case 0: return <span className={styles.statusPending}>Đợi duyệt</span>;
            case 1: return <span className={styles.statusApprovedQl}>QL đã duyệt</span>;
            case 2: return <span className={styles.statusApprovedBgd}>BGĐ đã duyệt</span>;
            default: return <span className={styles.statusUnknown}>Không xác định</span>;
        }
    };

    const formatDate = (text) => {
        if (!text || text.startsWith('0000') || text.startsWith('1900')) return '';
        return dayjs(text).format('DD/MM/YYYY HH:mm');
    };

    const columns = useMemo(() => [
        {
            title: 'Mã đơn xin',
            dataIndex: 'lv001',
            key: 'lv001',
            width: 120,
            fixed: 'left',
            align: 'center',
            render: (text, record) => {
                if (record.isQuickRow) {
                    return (
                        <Button
                            type="primary"
                            size="small"
                            shape="circle"
                            icon={<Plus size={14} />}
                            onClick={handleQuickSubmit}
                            title="Thêm nhanh (Click hoặc Enter)"
                            style={{ background: '#52c41a', borderColor: '#52c41a' }}
                        />
                    );
                }
                return text;
            }
        },
        {
            title: 'Tên',
            dataIndex: 'lv002',
            key: 'lv002',
            width: 150,
            render: (text, record) => {
                if (record.isQuickRow) {
                    return <span style={{ color: '#8c8c8c', fontStyle: 'italic' }}>Tự động</span>;
                }
                return text;
            }
        },
        {
            title: 'Người xin phép',
            dataIndex: 'tenNguoiXinPhep',
            key: 'tenNguoiXinPhep',
            width: 200,
            render: (val, record) => {
                if (record.isQuickRow) {
                    return (
                        <SelectNhanVien 
                            placeholder="Chọn..." 
                            size="small" 
                            value={quickItem.lv015} 
                            onChange={value => setQuickItem(prev => ({ ...prev, lv015: value }))} 
                            style={{ width: '100%' }}
                        />
                    );
                }
                return val;
            }
        },
        {
            title: 'Phòng ban',
            dataIndex: 'tenPhongBan',
            key: 'tenPhongBan',
            width: 150,
            render: (text, record) => {
                if (record.isQuickRow) {
                    return <span style={{ color: '#8c8c8c', fontStyle: 'italic' }}>Tự động</span>;
                }
                return text;
            }
        },
        {
            title: 'Mã loại đơn',
            dataIndex: 'tenLoaiDon',
            key: 'tenLoaiDon',
            width: 160,
            render: (val, record) => {
                if (record.isQuickRow) {
                    return (
                        <SelectLoaiDon 
                            placeholder="Chọn..." 
                            size="small" 
                            value={quickItem.lv003} 
                            onChange={value => setQuickItem(prev => ({ ...prev, lv003: value }))} 
                            style={{ width: '100%' }}
                        />
                    );
                }
                return val;
            }
        },
        {
            title: 'Hình thức',
            dataIndex: 'tenHinhThuc',
            key: 'tenHinhThuc',
            width: 160,
            render: (val, record) => {
                if (record.isQuickRow) {
                    return (
                        <SelectHinhThuc 
                            placeholder="Chọn..." 
                            size="small" 
                            value={quickItem.lv022} 
                            onChange={value => setQuickItem(prev => ({ ...prev, lv022: value }))} 
                            style={{ width: '100%' }}
                        />
                    );
                }
                return val;
            }
        },
        {
            title: 'Ngày tạo đơn',
            dataIndex: 'lv025',
            key: 'lv025',
            width: 150,
            render: (text, record) => {
                if (record.isQuickRow) {
                    return <span style={{ color: '#8c8c8c', fontStyle: 'italic' }}>Tự động</span>;
                }
                return formatDate(text);
            }
        },
        {
            title: 'Từ ngày',
            dataIndex: 'lv016',
            key: 'lv016',
            width: 180,
            render: (date, record) => {
                if (record.isQuickRow) {
                    return (
                        <DatePicker
                            showTime
                            format="DD/MM/YYYY HH:mm"
                            placeholder="Từ ngày"
                            size="small"
                            value={quickItem.lv016}
                            onChange={val => setQuickItem(prev => ({ ...prev, lv016: val }))}
                            onKeyDown={e => { if (e.key === 'Enter') handleQuickSubmit(); }}
                            style={{ width: '100%' }}
                        />
                    );
                }
                return formatDate(date);
            }
        },
        {
            title: 'Đến ngày',
            dataIndex: 'lv017',
            key: 'lv017',
            width: 180,
            render: (date, record) => {
                if (record.isQuickRow) {
                    return (
                        <DatePicker
                            showTime
                            format="DD/MM/YYYY HH:mm"
                            placeholder="Đến ngày"
                            size="small"
                            value={quickItem.lv017}
                            onChange={val => setQuickItem(prev => ({ ...prev, lv017: val }))}
                            onKeyDown={e => { if (e.key === 'Enter') handleQuickSubmit(); }}
                            style={{ width: '100%' }}
                        />
                    );
                }
                return formatDate(date);
            }
        },
        {
            title: 'Số ngày',
            dataIndex: 'soNgay',
            key: 'soNgay',
            width: 100,
            align: 'center',
            render: (text, record) => {
                if (record.isQuickRow) {
                    return <span style={{ color: '#8c8c8c', fontStyle: 'italic' }}>Tự động</span>;
                }
                return text;
            }
        },
        {
            title: 'Lý do',
            dataIndex: 'lv008',
            key: 'lv008',
            width: 250,
            ellipsis: true,
            render: (text, record) => {
                if (record.isQuickRow) {
                    return (
                        <Input 
                            placeholder="Lý do nghỉ..." 
                            size="small" 
                            value={quickItem.lv008} 
                            onChange={e => setQuickItem(prev => ({ ...prev, lv008: e.target.value }))}
                            onKeyDown={e => { if (e.key === 'Enter') handleQuickSubmit(); }}
                        />
                    );
                }
                return text;
            }
        },
        {
            title: 'Người QL trực tiếp',
            dataIndex: 'tenNguoiQL',
            key: 'tenNguoiQL',
            width: 160,
            render: (text, record) => record.isQuickRow ? '' : text
        },
        {
            title: 'Ngày duyệt (QL)',
            dataIndex: 'lv026',
            key: 'lv026',
            width: 150,
            render: (text, record) => record.isQuickRow ? '' : formatDate(text)
        },
        {
            title: 'Ngày duyệt (BGĐ)',
            dataIndex: 'lv027',
            key: 'lv027',
            width: 150,
            render: (text, record) => record.isQuickRow ? '' : formatDate(text)
        },
        {
            title: 'Trạng thái',
            dataIndex: 'lv021',
            key: 'lv021',
            width: 130,
            render: (val, record) => record.isQuickRow ? null : getTrangThaiText(val)
        },
        {
            title: 'Phản hồi (QL)',
            dataIndex: 'lv028',
            key: 'lv028',
            width: 180,
            ellipsis: true,
            render: (text, record) => record.isQuickRow ? '' : text
        },
        {
            title: 'Phản hồi (BGĐ)',
            dataIndex: 'lv029',
            key: 'lv029',
            width: 180,
            ellipsis: true,
            render: (text, record) => record.isQuickRow ? '' : text
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
                <Breadcrumb.Item>Quản lý nghỉ phép</Breadcrumb.Item>
                <Breadcrumb.Item>Tạo đơn xin phép</Breadcrumb.Item>
            </Breadcrumb>

            <div className={styles.pageTitle}>
                <Calendar size={20} />
                Tạo Đơn Xin Nghỉ Phép
            </div>

            <div className={styles.pageWrapper}>
                {/* Search & Filters Toolbar */}
                <Row justify="space-between" align="middle" className={styles.toolbarRow} style={{ flexWrap: 'wrap', gap: 8 }}>
                    <Col>
                        <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 500 }}>
                            Danh sách đơn xin nghỉ phép ({filteredList.length} đơn)
                        </span>
                    </Col>
                    <Col>
                        <Space size="small" wrap>
                            <RangePicker
                                placeholder={['Từ ngày', 'Đến ngày']}
                                value={filters.dateRange}
                                onChange={(dates) => handleFilterChange('dateRange', dates)}
                                style={{ width: 240 }}
                            />
                            <SelectNhanVien
                                placeholder="Người xin phép..."
                                value={filters.employeeId}
                                onChange={(value) => handleFilterChange('employeeId', value)}
                                style={{ width: 170 }}
                                allowClear
                            />
                            <SelectLoaiDon
                                placeholder="Mã loại đơn..."
                                value={filters.loaiDon}
                                onChange={(value) => handleFilterChange('loaiDon', value)}
                                style={{ width: 140 }}
                                allowClear
                            />
                            <SelectHinhThuc
                                placeholder="Hình thức..."
                                value={filters.hinhThuc}
                                onChange={(value) => handleFilterChange('hinhThuc', value)}
                                style={{ width: 140 }}
                                allowClear
                            />
                            <Input.Search
                                allowClear
                                value={filters.searchText}
                                placeholder="Tìm kiếm đơn..."
                                onChange={(e) => handleFilterChange('searchText', e.target.value)}
                                style={{ width: 200 }}
                            />
                            <Button icon={<RefreshCw size={16} />} onClick={loadData} loading={loading}>
                                Làm mới
                            </Button>
                            <Button type="primary" icon={<Plus size={16} />} onClick={handleAdd}>
                                Thêm mới
                            </Button>
                            { (filters.dateRange || filters.employeeId || filters.loaiDon || filters.hinhThuc || filters.searchText) && (
                                <Button onClick={handleClearFilters} danger>
                                    Xóa lọc
                                </Button>
                            )}
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
                        Sửa đơn
                    </Button>
                    
                    {/* <Button 
                        icon={<Ban size={15} />} 
                        disabled={selectedRowKeys.length === 0} 
                        loading={actionLoading}
                        style={{ color: '#faad14' }}
                        onClick={handleBatchCancel}
                    >
                        Hủy đơn đã chọn
                    </Button> */}

                    <Button 
                        danger
                        icon={<Trash2 size={15} />} 
                        disabled={selectedRowKeys.length === 0} 
                        loading={actionLoading}
                        onClick={handleBatchDelete}
                    >
                        Xóa đã chọn
                    </Button>

                    <span style={{ marginLeft: 'auto', color: '#8c8c8c' }}>
                        Đã chọn <b>{selectedRowKeys.length}</b> dòng
                        {selectedRowKeys.length > 1 && <span style={{ color: '#faad14', marginLeft: 8 }}>(✔ Chọn đúng 1 dòng để sửa)</span>}
                    </span>
                </div>

                {/* Table with Quick Insert first row */}
                <Table
                    className={styles.mainTable}
                    columns={columns}
                    scroll={{ x: 'max-content', y: 'calc(100vh - 280px)' }}
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
                        showTotal: (total) => `Tổng số: ${total - 1} mục`
                    }}
                    rowClassName={(record) => record.isQuickRow ? styles.quickRow : ''}
                    locale={{ emptyText: <Empty description="Không tìm thấy đơn xin phép nào" /> }}
                    bordered
                    size="middle"
                />

                {/* Inline Quick Add triggers */}
                {quickItem.lv015 && quickItem.lv003 && quickItem.lv022 && quickItem.lv016 && quickItem.lv017 && (
                    <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button type="primary" icon={<Plus size={14} />} onClick={handleQuickSubmit} loading={loading} style={{ background: '#52c41a', borderColor: '#52c41a' }}>
                            Lưu đơn xin phép nhanh
                        </Button>
                    </div>
                )}
            </div>

            {/* Slide-out Sidebar Drawer form for full Add/Edit */}
            <Drawer
                title={
                    <Space>
                        {editingRecord ? <Edit size={18} /> : <Plus size={18} />}
                        {editingRecord ? 'Chỉnh sửa đơn xin phép' : 'Tạo đơn xin phép mới'}
                    </Space>
                }
                placement="right"
                width={760}
                open={drawerVisible}
                onClose={() => { setDrawerVisible(false); form.resetFields(); }}
                className={styles.khoDrawer}
                destroyOnClose
                footer={
                    <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Button onClick={() => { setDrawerVisible(false); form.resetFields(); }} icon={<X size={16} />}>Huỷ</Button>
                        <Button type="primary" onClick={() => form.submit()} loading={loading} icon={<Save size={16} />}>
                            {editingRecord ? 'Cập nhật' : 'Tạo mới'}
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
                    <Divider className={styles.dividerSolid} orientation="left">THÔNG TIN NGƯỜI XIN PHÉP</Divider>
                    <Row gutter={16}>
                        <Col span={24}>
                            <Form.Item
                                label="Người xin phép:"
                                name="lv015"
                                rules={[{ required: true, message: 'Vui lòng chọn người xin phép' }]}
                            >
                                <SelectNhanVien placeholder="Chọn người xin phép..." />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Divider className={styles.dividerSolid} orientation="left">PHÂN LOẠI ĐƠN</Divider>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                label="Mã loại đơn:"
                                name="lv003"
                                rules={[{ required: true, message: 'Vui lòng chọn loại đơn' }]}
                            >
                                <SelectLoaiDon placeholder="Chọn loại đơn..." />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                label="Hình thức nghỉ:"
                                name="lv022"
                                rules={[{ required: true, message: 'Vui lòng chọn hình thức' }]}
                            >
                                <SelectHinhThuc placeholder="Chọn hình thức..." />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Divider className={styles.dividerSolid} orientation="left">THỜI GIAN NGHỈ</Divider>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                label="Từ ngày:"
                                name="lv016"
                                rules={[{ required: true, message: 'Vui lòng chọn ngày bắt đầu' }]}
                            >
                                <DatePicker
                                    showTime
                                    format="DD/MM/YYYY HH:mm"
                                    placeholder="Chọn ngày bắt đầu..."
                                    style={{ width: '100%' }}
                                />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                label="Đến ngày:"
                                name="lv017"
                                rules={[{ required: true, message: 'Vui lòng chọn ngày kết thúc' }]}
                            >
                                <DatePicker
                                    showTime
                                    format="DD/MM/YYYY HH:mm"
                                    placeholder="Chọn ngày kết thúc..."
                                    style={{ width: '100%' }}
                                />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Divider className={styles.dividerSolid} orientation="left">LÝ DO</Divider>
                    <Row gutter={16}>
                        <Col span={24}>
                            <Form.Item
                                label="Lý do xin phép nghỉ:"
                                name="lv008"
                            >
                                <Input.TextArea
                                    rows={4}
                                    placeholder="Nhập lý do xin phép nghỉ chi tiết..."
                                    maxLength={500}
                                    showCount
                                />
                            </Form.Item>
                        </Col>
                    </Row>
                </Form>
            </Drawer>
        </div>
    );
};

export default DonXinPhep;
