import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Button, Drawer, Empty, Form, Input, InputNumber,
    Modal, Select, Space, Table, Tag, Tooltip, Typography, message,
    Divider, Radio, Checkbox, Row, Col, Popconfirm, DatePicker,
} from 'antd';
import dayjs from 'dayjs';
import { 
    Edit, Lock, Plus, RefreshCw, Save, Search, Trash2, Unlock, X,
    Eye
} from 'lucide-react';
import { 
    PlusOutlined, 
    DeleteOutlined, 
    SaveOutlined, 
    FileTextOutlined, 
    WalletOutlined,
    EditOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    EyeOutlined
} from '@ant-design/icons';
import { useAuth } from '../../../contexts/AuthContext';
import { 
    execCRUD, 
    getDeNghiByPlanId, 
    approveDeNghi, 
    unapproveDeNghi, 
    getCurrentUser 
} from '../../../services/apiServices';
import SelectTaiKhoan from '../../../components/DropDown/SelectTaiKhoan';
import DeNghiChiTienDetailDrawer from '../DeNghiChiTienDetailDrawer';
import styles from '../QuanLyKeHoach.module.css';

const { Text } = Typography;
const { Option } = Select;

// ── CONSTANTS ──────────────────────────────────────────────────────────────
const TAB_LABEL  = 'Đề nghị chi tiền';
const TAB_MODULE = 'cr_lv0202/cr_lv0202-16.php';

const formatDate  = (val) => (!val || val === '1900-01-01' ? '—' : (dayjs(val).isValid() ? dayjs(val).format('DD/MM/YYYY') : val));
const formatMoney = (val) => { const n = Number(String(val ?? '').replace(/,/g, '')); return Number.isFinite(n) ? n.toLocaleString('vi-VN') : (val ?? '—'); };

// ── MAIN COMPONENT ──────────────────────────────────────────────────────────
const DeNghiChiTienTab = ({ detailData, onRefresh }) => {
    const planId = detailData?.plan?.lv001;

    const { user } = useAuth();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [selectedRowKeys, setSelectedRowKeys] = useState([]);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);
    const [form] = Form.useForm();

    // Details table states for Drawer
    const [details, setDetails] = useState([
        { key: Date.now(), lv007: '', lv004: 0, lv005: '141', lv006: '1111' }
    ]);
    const [loaiDeNghi, setLoaiDeNghi] = useState('1'); // 1: Tạm ứng, 2: Thanh toán, 3: Ứng lương
    const [hinhThucTT, setHinhThucTT] = useState('TM'); // TM: Tiền mặt, CK: Chuyển khoản

    // Detail Drawer state for viewing a specific request
    const [detailRecord, setDetailRecord] = useState(null);
    const [detailOpen, setDetailOpen] = useState(false);

    // Load data from getDeNghiByPlanId API
    const loadData = useCallback(async () => {
        if (!planId) return;
        setLoading(true);
        try {
            const res = await getDeNghiByPlanId(planId);
            if (Array.isArray(res)) {
                setRows(res.map((r, i) => ({ ...r, key: r.lv001 || i })));
            } else {
                setRows([]);
            }
        } catch (error) {
            console.error('Error fetching payment requests:', error);
            message.error('Không thể tải danh sách đề nghị chi tiền');
        } finally {
            setLoading(false);
        }
    }, [planId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const filteredRows = useMemo(() => {
        const kw = searchText.trim().toLowerCase();
        if (!kw) return rows;
        return rows.filter((r) => Object.values(r || {}).some((v) => String(v ?? '').toLowerCase().includes(kw)));
    }, [rows, searchText]);

    const handleRefresh = async () => {
        await loadData();
        if (onRefresh) {
            await onRefresh();
        }
    };

    // User details fetch for profile values
    const fetchUserInfo = useCallback(async () => {
        try {
            const result = await getCurrentUser();
            if (result && result.success) {
                form.setFieldsValue({
                    lv005: result.lv001 || '', // Mã nhân viên thật (SOF001...)
                    lv006: result.phongBanTen || '', // Tên phòng ban
                    lv105: result.chuTaiKhoan || '', // Chủ TK
                    lv020: result.soTaiKhoan || '', // Số TK
                    lv021: result.nganHang || '', // Ngân hàng
                });
            }
        } catch (error) {
            console.error('Lỗi tải thông tin người dùng:', error);
        }
    }, [form]);

    const openCreate = () => {
        setEditingRecord(null);
        form.resetFields();
        fetchUserInfo();
        
        form.setFieldsValue({
            lv009: dayjs(),
            lv014: dayjs().add(7, 'day'),
            lv114: detailData?.plan?.lv501 || '',
            lv115: detailData?.plan?.ten_du_an || '',
            lv093: detailData?.plan?.lv001 || planId || '',
            lv011: 'VND',
            lv012: 1,
            lv002: '1', // Default Tạm ứng
            lv093_days: 7, // Default 7 days for Tạm ứng
            lv095: 'TM',
            lv010: '1111',
        });

        setLoaiDeNghi('1');
        setHinhThucTT('TM');
        setDetails([{ 
            key: Date.now(), 
            lv007: '', 
            lv004: 0, 
            lv005: '141', // Default Nợ for Tạm ứng
            lv006: '1111' // Default Có for Tiền mặt
        }]);
        setDrawerOpen(true);
    };

    const openEdit = async (record) => {
        setEditingRecord(record);
        form.resetFields();
        setLoading(true);
        try {
            form.setFieldsValue({
                lv002: record.lv002,
                lv009: record.lv009 ? dayjs(record.lv009) : null,
                lv014: record.lv014 ? dayjs(record.lv014) : null,
                lv011: record.lv011 || 'VND',
                lv005: record.lv005,
                lv006: record.lv006,
                lv095: record.lv095 || 'TM',
                lv093_days: record.lv002 === '1' ? Number(record.lv093 || 7) : 7,
                lv030: record.lv030 === 1 || record.lv030 === '1',
                lv120: record.lv120 ? dayjs(record.lv120) : null,
                lv122: record.lv122 ? dayjs(record.lv122) : null,
                lv105: record.lv105 || '',
                lv020: record.lv020 || '',
                lv021: record.lv021 || '',
                lv007: record.lv007 || '',
                lv114: record.lv114 || detailData?.plan?.lv501 || '',
                lv115: record.lv115 || detailData?.plan?.ten_du_an || '',
                lv093: record.lv093 || detailData?.plan?.lv001 || planId || '',
            });

            setLoaiDeNghi(record.lv002);
            setHinhThucTT(record.lv095 || 'TM');

            // Load details (cr_lv0203)
            const res = await execCRUD('cr_lv0203', 'loadId', { lv002: record.lv001 });
            const rawDetails = Array.isArray(res) ? res : res?.data || [];
            if (rawDetails.length > 0) {
                setDetails(rawDetails.map((d, i) => ({
                    key: d.lv001 || `loaded-${i}`,
                    lv001: d.lv001,
                    lv007: d.lv007 || '',
                    lv004: Number(d.lv003 || d.lv004 || 0),
                    lv005: d.lv005 || '',
                    lv006: d.lv006 || ''
                })));
            } else {
                setDetails([{ 
                    key: Date.now(), 
                    lv007: '', 
                    lv004: 0, 
                    lv005: record.lv002 === '1' ? '141' : '', 
                    lv006: record.lv095 === 'TM' ? '1111' : '1121' 
                }]);
            }
            setDrawerOpen(true);
        } catch (error) {
            console.error('Error loading request details:', error);
            message.error('Không thể tải chi tiết đề nghị');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            
            // Validate details
            const invalidDetail = details.find(d => !d.lv005 || d.lv004 <= 0);
            if (invalidDetail) {
                message.error('Vui lòng nhập đầy đủ tài khoản và số tiền cho các dòng chi tiết');
                return;
            }

            setLoading(true);
            
            const headerPayload = {
                ...values,
                lv009: values.lv009.format('YYYY-MM-DD'),
                lv014: values.lv014 ? values.lv014.format('YYYY-MM-DD') : '',
                lv120: values.lv120 ? values.lv120.format('YYYY-MM-DD') : '',
                lv122: values.lv122 ? values.lv122.format('YYYY-MM-DD') : '',
                lv004: detailData?.plan?.lv001 || planId || '', // Mã kế hoạch (lv004)
                lv093: loaiDeNghi === '1' ? (values.lv093_days || 7) : (detailData?.plan?.lv001 || planId || ''), // lv093 là số ngày cho Tạm ứng
                lv115: detailData?.plan?.ten_du_an || '', // Tên dự án
                lv013: totalAmount, // Tổng số tiền
                lv003: 'CUS', // Default Đối tượng
                lv095: values.lv095, // Hình thức thanh toán
                lv030: values.lv030 ? 1 : 0, // VAT toggle
                lv016: editingRecord ? editingRecord.lv016 : 0, // Trạng thái
            };

            let headerResult;
            if (editingRecord) {
                headerResult = await execCRUD('cr_lv0202', 'edit', {
                    ...headerPayload,
                    lv001: editingRecord.lv001
                });
            } else {
                headerResult = await execCRUD('cr_lv0202', 'insert', headerPayload);
            }
            
            if (headerResult && (headerResult.success || headerResult.lv001 || editingRecord)) {
                const newId = editingRecord ? editingRecord.lv001 : headerResult.lv001;
                
                if (!newId) {
                    message.error('Không lấy được mã đề nghị');
                    setLoading(false);
                    return;
                }

                // Delete details if editing
                if (editingRecord) {
                    const existingRes = await execCRUD('cr_lv0203', 'loadId', { lv002: newId });
                    const existingDetails = Array.isArray(existingRes) ? existingRes : existingRes?.data || [];
                    const idsToDelete = existingDetails.map(d => d.lv001).filter(Boolean).join(',');
                    if (idsToDelete) {
                        await execCRUD('cr_lv0203', 'delete', { lv001: idsToDelete });
                    }
                }

                // Insert Details (cr_lv0203)
                const detailPromises = details.map(d => execCRUD('cr_lv0203', 'insert', {
                    lv002: newId,
                    lv007: d.lv007 || values.lv007,
                    lv003: d.lv004,
                    lv004: d.lv004 * (Number(values.lv012) || 1),
                    lv005: d.lv005,
                    lv006: d.lv006 || (values.lv095 === 'TM' ? '1111' : '1121'),
                }));

                await Promise.all(detailPromises);
                
                message.success(editingRecord ? 'Cập nhật đề nghị chi tiền thành công' : 'Tạo đề nghị chi tiền thành công');
                setDrawerOpen(false);
                handleRefresh();
            } else {
                message.error(headerResult?.message || 'Lỗi khi lưu thông tin chung');
            }
        } catch (error) {
            console.error(error);
            message.error('Vui lòng kiểm tra lại thông tin');
        } finally {
            setLoading(false);
        }
    };

    const handleLoaiDeNghiChange = (val) => {
        setLoaiDeNghi(val);
        setDetails(prev => prev.map(item => ({
            ...item,
            lv005: val === '2' ? '' : '141',
        })));
    };

    const handleHinhThucTTChange = (val) => {
        setHinhThucTT(val);
        setDetails(prev => prev.map(item => ({
            ...item,
            lv006: val === 'TM' ? '1111' : '1121'
        })));
    };

    const handleAddDetail = () => {
        setDetails([...details, { 
            key: Date.now(), 
            lv007: '', 
            lv004: 0, 
            lv005: loaiDeNghi === '2' ? '' : '141', 
            lv006: hinhThucTT === 'TM' ? '1111' : '1121' 
        }]);
    };

    const handleRemoveDetail = (key) => {
        if (details.length > 1) {
            setDetails(details.filter(item => item.key !== key));
        } else {
            message.warning('Phải có ít nhất một dòng chi tiết');
        }
    };

    const handleDetailChange = (key, field, value) => {
        setDetails(details.map(item => item.key === key ? { ...item, [field]: value } : item));
    };

    // Single item list actions
    const handleApproveOne = async (id) => {
        try {
            const res = await approveDeNghi(id);
            if (res === true || res?.success) {
                message.success('Đã duyệt và đề xuất lên quản lý thành công');
                handleRefresh();
            } else {
                message.error(res?.message || res?.error || 'Duyệt thất bại');
            }
        } catch (error) {
            message.error('Lỗi khi duyệt đề nghị');
        }
    };

    const handleRejectOne = async (id) => {
        try {
            const res = await unapproveDeNghi(id);
            if (res === true || res?.success) {
                message.success('Đã từ chối đề nghị chi tiền');
                handleRefresh();
            } else {
                message.error(res?.error || 'Từ chối thất bại');
            }
        } catch (error) {
            message.error('Lỗi khi từ chối đề nghị');
        }
    };

    const handleDeleteOne = async (id) => {
        try {
            const res = await execCRUD('cr_lv0202', 'delete', { lv001: id });
            if (res === true || res?.success) {
                message.success('Đã xóa đề nghị');
                handleRefresh();
            } else {
                message.error(res?.error || 'Xóa thất bại');
            }
        } catch (error) {
            message.error('Lỗi khi xóa đề nghị');
        }
    };

    const handleViewDetail = (record) => {
        setDetailRecord(record);
        setDetailOpen(true);
    };

    // Batch actions
    const handleBatchAction = async (func, label) => {
        if (!selectedRowKeys.length) { message.warning('Chọn ít nhất một dòng'); return; }
        Modal.confirm({
            title: label, content: `Thực hiện "${label}" cho ${selectedRowKeys.length} dòng?`,
            okText: 'Xác nhận', cancelText: 'Hủy',
            onOk: async () => {
                let ok = 0;
                for (const id of selectedRowKeys) {
                    let res;
                    if (func === 'childApprove') {
                        res = await approveDeNghi(id);
                    } else if (func === 'childUnapprove') {
                        res = await unapproveDeNghi(id);
                    } else if (func === 'childDelete') {
                        res = await execCRUD('cr_lv0202', 'delete', { lv001: id });
                    }
                    
                    if (res === true || res?.success) {
                        ok++;
                    }
                }
                if (ok) {
                    message.success(`Đã xử lý ${ok}/${selectedRowKeys.length} dòng thành công`);
                    setSelectedRowKeys([]);
                    handleRefresh();
                } else {
                    message.error('Thao tác hàng loạt thất bại');
                }
            },
        });
    };

    const totalAmount = details.reduce((sum, d) => sum + (d.lv004 || 0), 0);

    // ── COLUMNS ────────────────────────────────────────────────────────────
    const columns = [
        { title: 'STT', key: 'stt', width: 60, align: 'center', fixed: 'left', render: (_, __, idx) => idx + 1 },
        { title: 'Mã số', dataIndex: 'lv001', key: 'lv001', width: 120, fixed: 'left',
            render: (val) => <Text strong style={{ color: '#1677ff' }}>{val}</Text> },
        { title: 'Ngày đề nghị', dataIndex: 'lv009', key: 'lv009', width: 120, render: (val) => formatDate(val) },
        { 
            title: 'Loại', 
            dataIndex: 'lv002', 
            key: 'lv002', 
            width: 120,
            render: (val) => {
                if (val === '1') return <Tag color="blue">Tạm ứng</Tag>;
                if (val === '2') return <Tag color="green">Thanh toán</Tag>;
                if (val === '3') return <Tag color="purple">Ứng lương</Tag>;
                return <Tag>{val}</Tag>;
            }
        },
        { title: 'Người đề nghị', dataIndex: 'ten_nguoi_de_nghi', key: 'ten_nguoi_de_nghi',
            render: (val, record) => val || record.lv005 || '—' },
        { title: 'Số tiền', dataIndex: 'total_amount', key: 'total_amount', width: 155, align: 'right',
            render: (val, record) => <Text strong style={{ color: '#ff4d4f' }}>{formatMoney(val || record.lv013)} đ</Text> },
        { title: 'Trạng thái', dataIndex: 'lv016', key: 'lv016', width: 120, align: 'center',
            render: (val) => {
                if (val === '1') return <Tag color="success">Đã duyệt</Tag>;
                if (val === '-1') return <Tag color="error">Đã từ chối</Tag>;
                return <Tag color="warning">Chờ duyệt</Tag>;
            } 
        },
        {
            title: 'Hành động',
            key: 'action',
            fixed: 'right',
            width: 180,
            render: (_, record) => (
                <Space size="middle">
                    <Tooltip title="Xem chi tiết">
                        <Button icon={<EyeOutlined />} size="small" onClick={() => handleViewDetail(record)} />
                    </Tooltip>
                    {record.lv016 === '0' && (
                        <>
                            <Tooltip title="Chỉnh sửa">
                                <Button 
                                    icon={<EditOutlined />} 
                                    size="small" 
                                    onClick={() => openEdit(record)}
                                />
                            </Tooltip>
                            <Popconfirm title="Xóa đề nghị này?" onConfirm={() => handleDeleteOne(record.lv001)}>
                                <Button icon={<DeleteOutlined />} size="small" danger />
                            </Popconfirm>
                            <Tooltip title="Duyệt">
                                <Button 
                                    icon={<CheckCircleOutlined />} 
                                    size="small" 
                                    type="primary"
                                    onClick={() => handleApproveOne(record.lv001)}
                                />
                            </Tooltip>
                            <Tooltip title="Từ chối">
                                <Button 
                                    icon={<CloseCircleOutlined />} 
                                    size="small" 
                                    danger
                                    onClick={() => handleRejectOne(record.lv001)}
                                />
                            </Tooltip>
                        </>
                    )}
                    {record.lv016 === '1' && (
                        <Tooltip title="Bỏ duyệt">
                             <Button 
                                icon={<CloseCircleOutlined />} 
                                size="small" 
                                style={{ color: '#faad14', borderColor: '#faad14' }}
                                onClick={() => handleRejectOne(record.lv001)}
                            />
                        </Tooltip>
                    )}
                </Space>
            ),
        }
    ];

    const detailColumns = [
        {
            title: 'Nội dung chi tiết',
            dataIndex: 'lv007',
            key: 'lv007',
            render: (text, record) => (
                <Input 
                    value={text} 
                    onChange={e => handleDetailChange(record.key, 'lv007', e.target.value)} 
                    placeholder="Nội dung dòng này..."
                />
            )
        },
        {
            title: 'Số tiền',
            dataIndex: 'lv004',
            key: 'lv004',
            width: 150,
            render: (val, record) => (
                <InputNumber 
                    style={{ width: '100%' }}
                    value={val} 
                    onChange={v => handleDetailChange(record.key, 'lv004', v)}
                    formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={value => value.replace(/\$\s?|(,*)/g, '')}
                />
            )
        },
        {
            title: 'Tài khoản Nợ',
            dataIndex: 'lv005',
            key: 'lv005',
            width: 180,
            render: (val, record) => (
                <SelectTaiKhoan 
                    style={{ width: '100%' }}
                    value={val} 
                    onChange={v => handleDetailChange(record.key, 'lv005', v)}
                />
            )
        },
        {
            title: 'Tài khoản Có',
            dataIndex: 'lv006',
            key: 'lv006',
            width: 180,
            render: (val, record) => (
                <SelectTaiKhoan 
                    style={{ width: '100%' }}
                    value={val} 
                    onChange={v => handleDetailChange(record.key, 'lv006', v)}
                    placeholder={hinhThucTT === 'TM' ? "1111" : "1121"}
                />
            )
        },
        {
            title: '',
            key: 'action',
            width: 50,
            render: (_, record) => (
                <Button 
                    type="text" 
                    danger 
                    icon={<DeleteOutlined />} 
                    onClick={() => handleRemoveDetail(record.key)} 
                />
            )
        }
    ];

    const hasSelection = selectedRowKeys.length > 0;

    return (
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <div className={styles.toolbarRow}>
                <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}>
                    <Space wrap>
                        <Text strong>{TAB_LABEL}</Text><Tag>{TAB_MODULE}</Tag>
                        <Text type="secondary">{filteredRows.length} dòng</Text>
                    </Space>
                    <Space wrap>
                        <Input allowClear prefix={<Search size={15} />} placeholder="Lọc dữ liệu..."
                            value={searchText} onChange={(e) => setSearchText(e.target.value)} style={{ width: 260 }} />
                        <Button icon={<RefreshCw size={16} />} onClick={handleRefresh} loading={loading}>Tải lại</Button>
                        {!!planId && <Button type="primary" icon={<Plus size={16} />} onClick={openCreate}>Thêm mới</Button>}
                    </Space>
                </Space>
            </div>
            {!!planId && (
                <div className={`${styles.batchActionBar} ${!hasSelection ? styles.batchActionBarDisabled : ''}`}>
                    <span style={{ fontWeight: 600, color: hasSelection ? '#197dd3' : '#8c8c8c', marginRight: 8 }}>Thao tác hàng loạt:</span>
                    <Text><b>{selectedRowKeys.length}</b> dòng đã chọn</Text>
                    <Button icon={<Edit size={16} />} disabled={selectedRowKeys.length !== 1} type="primary" ghost
                        onClick={() => { const r = rows.find((x) => x.lv001 === selectedRowKeys[0]); if (r) openEdit(r); }}>Chỉnh sửa</Button>
                    <Button icon={<Lock size={16} />} disabled={!hasSelection} onClick={() => handleBatchAction('childApprove', 'Duyệt')}>Duyệt</Button>
                    <Button icon={<Unlock size={16} />} disabled={!hasSelection} onClick={() => handleBatchAction('childUnapprove', 'Hủy duyệt')}>Hủy duyệt</Button>
                    <Button danger icon={<Trash2 size={16} />} disabled={!hasSelection} onClick={() => handleBatchAction('childDelete', 'Xóa')}>Xóa</Button>
                </div>
            )}
            <Table
                className={styles.mainTable}
                rowKey="lv001"
                columns={columns} dataSource={filteredRows} loading={loading}
                size="small" bordered
                rowSelection={planId ? { selectedRowKeys, onChange: setSelectedRowKeys } : undefined}
                pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t) => `Tổng: ${t} dòng` }}
                scroll={{ x: 1100 }}
                locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={`Không có dữ liệu ${TAB_LABEL}`} /> }}
                onRow={(record) => ({ onDoubleClick: () => { if (planId) openEdit(record); } })}
            />
            
            {/* Sidebar (Drawer) sliding from the right for Create/Edit */}
            <Drawer
                className={styles.khoDrawer}
                title={
                    <Space>
                        <FileTextOutlined />
                        <Typography.Title level={4} style={{ margin: 0 }}>
                            {editingRecord ? `Sửa đề nghị chi tiền - ${editingRecord.lv001}` : 'Tạo đề nghị chi tiền'}
                        </Typography.Title>
                    </Space>
                }
                open={drawerOpen} 
                width={1000} 
                onClose={() => setDrawerOpen(false)}
                destroyOnClose
                footer={
                    <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                        <Button icon={<X size={16} />} onClick={() => setDrawerOpen(false)}>Hủy</Button>
                        <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={loading}>
                            {editingRecord ? 'Cập nhật' : 'Thêm mới'}
                        </Button>
                    </Space>
                }
            >
                <Form form={form} layout="vertical" className={styles.customForm}>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="lv002" label="Loại đề nghị" rules={[{ required: true }]}>
                                <Radio.Group onChange={e => handleLoaiDeNghiChange(e.target.value)}>
                                    <Radio value="1">Tạm ứng</Radio>
                                    <Radio value="2">Thanh toán</Radio>
                                    <Radio value="3">Ứng lương</Radio>
                                </Radio.Group>
                            </Form.Item>
                        </Col>
                        <Col span={4}>
                            <Form.Item name="lv009" label="Ngày lập" rules={[{ required: true }]}>
                                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                            </Form.Item>
                        </Col>
                        <Col span={4}>
                            <Form.Item name="lv014" label="Hạn thanh toán">
                                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                            </Form.Item>
                        </Col>
                        <Col span={4}>
                            <Form.Item name="lv011" label="Tiền tệ">
                                <Select>
                                    <Option value="VND">VND</Option>
                                    <Option value="USD">USD</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={6}>
                            <Form.Item name="lv005" label="Mã nhân viên (Người ĐN)" rules={[{ required: true }]}>
                                <Input disabled />
                            </Form.Item>
                        </Col>
                        <Col span={6}>
                            <Form.Item name="lv006" label="Phòng ban">
                                <Input placeholder="Tên phòng ban..." />
                            </Form.Item>
                        </Col>
                        <Col span={6}>
                            <Form.Item name="lv095" label="Hình thức thanh toán">
                                <Radio.Group onChange={e => handleHinhThucTTChange(e.target.value)} value={hinhThucTT}>
                                    <Radio value="TM">Tiền mặt</Radio>
                                    <Radio value="CK">Chuyển khoản</Radio>
                                </Radio.Group>
                            </Form.Item>
                        </Col>
                        <Col span={6}>
                            {loaiDeNghi === '1' && (
                                <Form.Item name="lv093_days" label="Số ngày hoàn ứng">
                                    <InputNumber style={{ width: '100%' }} min={0} />
                                </Form.Item>
                            )}
                            {loaiDeNghi === '2' && (
                                <Form.Item name="lv030" valuePropName="checked" label=" ">
                                    <Checkbox>Có hóa đơn VAT</Checkbox>
                                </Form.Item>
                            )}
                        </Col>
                    </Row>

                    {loaiDeNghi === '3' && (
                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item name="lv120" label="Trừ lương từ ngày">
                                    <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item name="lv122" label="Đến ngày">
                                    <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                                </Form.Item>
                            </Col>
                        </Row>
                    )}

                    {hinhThucTT === 'CK' && (
                        <Row gutter={16}>
                            <Col span={8}>
                                <Form.Item name="lv105" label="Chủ tài khoản">
                                    <Input placeholder="Họ tên chủ tài khoản..." />
                                </Form.Item>
                            </Col>
                            <Col span={8}>
                                <Form.Item name="lv020" label="Số tài khoản">
                                    <Input placeholder="Số tài khoản ngân hàng..." />
                                </Form.Item>
                            </Col>
                            <Col span={8}>
                                <Form.Item name="lv021" label="Ngân hàng (Chi nhánh)">
                                    <Input placeholder="Tên ngân hàng..." />
                                </Form.Item>
                            </Col>
                        </Row>
                    )}

                    <Form.Item name="lv007" label="Nội dung đề nghị" rules={[{ required: true }]}>
                        <Input.TextArea rows={2} placeholder="Nhập lý do chi tiền..." />
                    </Form.Item>

                    <Row gutter={16}>
                        <Col span={8}>
                            <Form.Item name="lv114" label="Mã dự án">
                                <Input disabled />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="lv115" label="Tên dự án">
                                <Input disabled />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="lv093" label="Mã kế hoạch">
                                <Input disabled />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Divider orientation="left">
                        <Space>
                            <WalletOutlined />
                            <Text strong>Chi tiết thanh toán</Text>
                            <Button size="small" type="dashed" icon={<PlusOutlined />} onClick={handleAddDetail}>Thêm dòng</Button>
                        </Space>
                    </Divider>

                    <Table 
                        dataSource={details} 
                        columns={detailColumns} 
                        pagination={false} 
                        size="small" 
                        bordered
                        footer={() => (
                            <div style={{ textAlign: 'right', paddingRight: '50px' }}>
                                <Text strong>Tổng cộng: </Text>
                                <Text type="danger" strong style={{ fontSize: '16px' }}>
                                    {totalAmount.toLocaleString()}
                                </Text>
                                <Text strong> {form.getFieldValue('lv011') || 'VND'}</Text>
                            </div>
                        )}
                    />
                </Form>
            </Drawer>

            {/* DeNghiChiTienDetailDrawer for viewing detailed requests */}
            <DeNghiChiTienDetailDrawer
                open={detailOpen}
                onClose={() => setDetailOpen(false)}
                request={detailRecord}
            />
        </Space>
    );
};

export default DeNghiChiTienTab;

