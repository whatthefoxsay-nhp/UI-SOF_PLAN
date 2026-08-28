import React, { useState, useEffect, useMemo } from 'react';
import {
    Button,
    Col,
    Divider,
    Drawer,
    Empty,
    Form,
    Input,
    Modal,
    Row,
    Select,
    Space,
    Table,
    Tag,
    Tooltip,
    Typography,
    message,
} from 'antd';
import {
    Edit,
    Lock,
    Plus,
    RefreshCw,
    Save,
    Search,
    Trash2,
    Unlock,
    X,
} from 'lucide-react';
import { execCRUD } from '../../../services/apiServices';
import styles from '../QuanLyKeHoach.module.css';
import SelectKhachHang from '../../../components/DropDown/SelectKhachHang';
import SelectDoiTuongKhachHang from '../../../components/DropDown/SelectDoiTuongKhachHang';
import { useMasterData } from '../../../hooks/useApiQueries';

const { Text } = Typography;
const { Option } = Select;

// ── CONSTANTS ──────────────────────────────────────────────────────────────
const CHILD_KEY = 'contacts';
const TAB_LABEL = 'Thông tin liên hệ';
const TAB_MODULE = 'cr_lv0129/cr_lv0129.php';

const TRANG_THAI_MAP = {
    '0': { label: 'Chưa xử lý', color: 'default' },
    '1': { label: 'Đã xử lý', color: 'success' },
    '2': { label: 'Đang theo dõi', color: 'processing' },
};

// ── MAIN COMPONENT ──────────────────────────────────────────────────────────
const ThongTinLienHeTab = ({ detailData, onRefresh }) => {
    const planId = detailData?.plan?.lv001;

    // ── STATE ──────────────────────────────────────────────────────────────
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [selectedRowKeys, setSelectedRowKeys] = useState([]);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);
    const [form] = Form.useForm();

    // Fetch master data for lookups and display names
    const { data: customerList, refetch: refetchCustomerList } = useMasterData('sl_lv0001', 'DataView');
    const { data: doiTuongList, refetch: refetchDoiTuongList } = useMasterData('sl_lv0034', 'DoiTuongKhachHang');
    const { data: staffList, refetch: refetchStaffList } = useMasterData('hr_lv0020_select_kttm', 'NhanVien');

    // ── REFRESH ALL STATE & APIS ──────────────────────────────────────────
    const handleRefresh = async () => {
        setSearchText('');
        setSelectedRowKeys([]);
        setQuickRowData({
            lv009: '',
            lv003: '',
            lv004: '',
            lv005: '',
            lv006: '',
            lv007: '',
            lv008: '0',
            lv010: '',
            lv013: '0',
        });
        refetchCustomerList?.();
        refetchDoiTuongList?.();
        refetchStaffList?.();
        if (onRefresh) await onRefresh();
    };

    const [quickRowData, setQuickRowData] = useState({
        lv009: '', // Mã khách hàng
        lv003: '', // Tên liên hệ
        lv004: '', // Chức vụ
        lv005: '', // Điện thoại
        lv006: '', // Đối tượng khách hàng
        lv007: '', // Email
        lv008: '0', // Trạng thái
        lv010: '', // Ghi chú
        lv013: '0', // Liên kết
    });

    // ── SYNC DATA FROM detailData ───────────────────────────────────────────
    useEffect(() => {
        const raw = detailData?.tabs?.[CHILD_KEY] ?? detailData?.[CHILD_KEY] ?? [];
        setRows(Array.isArray(raw) ? raw.map((r, i) => ({ ...r, key: r.lv001 ?? i })) : []);
    }, [detailData]);

    // ── FILTER ─────────────────────────────────────────────────────────────
    const filteredRows = useMemo(() => {
        const kw = searchText.trim().toLowerCase();
        if (!kw) return rows;
        return rows.filter((r) =>
            Object.values(r || {}).some((v) => String(v ?? '').toLowerCase().includes(kw))
        );
    }, [rows, searchText]);

    // ── CRUD CORE ──────────────────────────────────────────────────────────
    const callAction = async (func, childId, data = {}) => {
        if (!planId) { message.warning('Thiếu mã kế hoạch'); return false; }
        setLoading(true);
        try {
            const payload = {
                lv001: planId,
                planId,
                childKey: CHILD_KEY,   // 'contacts' — explicit, dễ debug
                childId: childId ?? '',
                data,
            };
            console.debug(`[ThongTinLienHeTab] ${func}`, payload);
            const res = await execCRUD('cr_lv0094_detail', func, payload);
            if (res?.success === false) { message.error(res.message || 'Thao tác thất bại'); return false; }
            message.success(res?.message || 'Thao tác thành công');
            setSelectedRowKeys([]);
            if (onRefresh) await onRefresh();
            return true;
        } catch (e) {
            console.error(`[ThongTinLienHeTab] ${func}`, e);
            message.error('Lỗi kết nối: ' + e.message);
            return false;
        } finally {
            setLoading(false);
        }
    };

    // ── HANDLERS ───────────────────────────────────────────────────────────
    const openCreate = () => {
        setEditingRecord(null);
        form.resetFields();
        form.setFieldsValue({
            lv002: planId,
            lv008: '0',
            lv013: '0',
        });
        setDrawerOpen(true);
    };

    const openEdit = (record) => {
        setEditingRecord(record);
        form.resetFields();
        form.setFieldsValue({
            lv001: record.lv001,
            lv002: record.lv002 || planId,
            lv009: record.lv009,
            lv003: record.lv003,
            lv004: record.lv004,
            lv005: record.lv005,
            lv006: record.lv006,
            lv007: record.lv007,
            lv008: record.lv008,
            lv010: record.lv010,
            lv013: record.lv013,
            lv011: record.lv011,
            lv012: record.lv012,
            lv809: record.lv809,
        });
        setDrawerOpen(true);
    };

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            const data = { ...values, lv002: planId };
            if (editingRecord?.lv001) data.lv001 = editingRecord.lv001;

            if (editingRecord) {
                data.lv012 = editingRecord.lv012;
                data.lv011 = editingRecord.lv011;
            }

            const ok = await callAction(
                editingRecord ? 'childUpdate' : 'childInsert',
                editingRecord?.lv001 ?? '',
                data
            );
            if (ok) setDrawerOpen(false);
        } catch { /* validation errors */ }
    };

    const handleQuickSubmit = async () => {
        if (!planId) { message.warning('Thiếu mã kế hoạch'); return; }
        if (!quickRowData.lv003) {
            message.warning('Vui lòng nhập tên liên hệ để thêm nhanh!');
            return;
        }
        const data = {
            lv002: planId,
            lv009: quickRowData.lv009,
            lv003: quickRowData.lv003,
            lv004: quickRowData.lv004,
            lv005: quickRowData.lv005,
            lv006: quickRowData.lv006,
            lv007: quickRowData.lv007,
            lv008: quickRowData.lv008,
            lv010: quickRowData.lv010,
            lv013: quickRowData.lv013,
        };
        const ok = await callAction('childInsert', '', data);
        if (ok) {
            setQuickRowData({
                lv009: '',
                lv003: '',
                lv004: '',
                lv005: '',
                lv006: '',
                lv007: '',
                lv008: '0',
                lv010: '',
                lv013: '0',
            });
        }
    };

    const handleBatchAction = async (func, label) => {
        if (!selectedRowKeys.length) { message.warning('Chọn ít nhất một dòng'); return; }
        Modal.confirm({
            title: label,
            content: `Thực hiện "${label}" cho ${selectedRowKeys.length} dòng?`,
            okText: 'Xác nhận',
            cancelText: 'Hủy',
            onOk: async () => {
                let ok = 0;
                for (const id of selectedRowKeys) {
                    if (await callAction(func, id)) ok++;
                }
                if (ok) message.success(`Đã xử lý ${ok} dòng`);
            },
        });
    };

    // ── COLUMNS ────────────────────────────────────────────────────────────
    const columns = [
        {
            title: 'STT',
            key: 'stt',
            width: 70,
            align: 'center',
            fixed: 'left',
            render: (_, record, idx) => {
                if (record.isQuickRow) {
                    return (
                        <Button
                            type="primary"
                            size="small"
                            shape="circle"
                            icon={<Plus size={14} />}
                            onClick={handleQuickSubmit}
                            title="Thêm nhanh (Enter)"
                        />
                    );
                }
                return planId ? idx : idx + 1;
            },
        },
        
        {
            title: 'Tên liên hệ',
            dataIndex: 'lv003',
            key: 'lv003',
            width: 180,
            ellipsis: true,
            render: (val, record) => {
                if (record.isQuickRow) {
                    return (
                        <Input
                            size="small"
                            placeholder="Họ tên..."
                            value={quickRowData.lv003}
                            onChange={(e) => setQuickRowData({ ...quickRowData, lv003: e.target.value })}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleQuickSubmit(); }}
                            style={{ width: '100%' }}
                        />
                    );
                }
                return (
                    <Tooltip title={val}>
                        <span style={{ fontWeight: 500 }}>{val || '—'}</span>
                    </Tooltip>
                );
            },
        },
        {
            title: 'Chức vụ',
            dataIndex: 'lv004',
            key: 'lv004',
            width: 140,
            ellipsis: true,
            render: (val, record) => {
                if (record.isQuickRow) {
                    return (
                        <Input
                            size="small"
                            placeholder="Chức vụ..."
                            value={quickRowData.lv004}
                            onChange={(e) => setQuickRowData({ ...quickRowData, lv004: e.target.value })}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleQuickSubmit(); }}
                            style={{ width: '100%' }}
                        />
                    );
                }
                return val || '—';
            },
        },
        {
            title: 'Điện thoại',
            dataIndex: 'lv005',
            key: 'lv005',
            width: 130,
            render: (val, record) => {
                if (record.isQuickRow) {
                    return (
                        <Input
                            size="small"
                            placeholder="SĐT..."
                            value={quickRowData.lv005}
                            onChange={(e) => setQuickRowData({ ...quickRowData, lv005: e.target.value })}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleQuickSubmit(); }}
                            style={{ width: '100%' }}
                        />
                    );
                }
                return val || '—';
            },
        },
        {
            title: 'Đối tượng khách hàng',
            dataIndex: 'lv006',
            key: 'lv006',
            width: 180,
            render: (val, record) => {
                if (record.isQuickRow) {
                    return (
                        <SelectDoiTuongKhachHang
                            size="small"
                            value={quickRowData.lv006}
                            onChange={(v) => setQuickRowData({ ...quickRowData, lv006: v })}
                            style={{ width: '100%' }}
                            allowClear
                            dropdownMatchSelectWidth={false}
                        />
                    );
                }
                const dt = doiTuongList?.find((d) => d.lv001 === val);
                return dt ? `${dt.lv001} - ${dt.lv002}` : val || '—';
            },
        },
        {
            title: 'Email',
            dataIndex: 'lv007',
            key: 'lv007',
            width: 180,
            ellipsis: true,
            render: (val, record) => {
                if (record.isQuickRow) {
                    return (
                        <Input
                            size="small"
                            placeholder="email@..."
                            value={quickRowData.lv007}
                            onChange={(e) => setQuickRowData({ ...quickRowData, lv007: e.target.value })}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleQuickSubmit(); }}
                            style={{ width: '100%' }}
                        />
                    );
                }
                return val ? <a href={`mailto:${val}`}>{val}</a> : '—';
            },
        },
        {
            title: 'Trạng thái',
            dataIndex: 'lv008',
            key: 'lv008',
            width: 130,
            align: 'center',
            render: (val, record) => {
                if (record.isQuickRow) {
                    return (
                        <Select
                            size="small"
                            value={quickRowData.lv008}
                            onChange={(v) => setQuickRowData({ ...quickRowData, lv008: v })}
                            style={{ width: '100%' }}
                            dropdownMatchSelectWidth={false}
                        >
                            {Object.entries(TRANG_THAI_MAP).map(([v, o]) => (
                                <Option key={v} value={v}>{o.label}</Option>
                            ))}
                        </Select>
                    );
                }
                const key = String(val ?? '');
                const info = TRANG_THAI_MAP[key];
                return info ? <Tag color={info.color}>{info.label}</Tag> : <Tag>{key || '—'}</Tag>;
            },
        },
        {
            title: 'Ghi chú',
            dataIndex: 'lv010',
            key: 'lv010',
            width: 180,
            ellipsis: true,
            render: (val, record) => {
                if (record.isQuickRow) {
                    return (
                        <Input
                            size="small"
                            placeholder="Ghi chú..."
                            value={quickRowData.lv010}
                            onChange={(e) => setQuickRowData({ ...quickRowData, lv010: e.target.value })}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleQuickSubmit(); }}
                            style={{ width: '100%' }}
                        />
                    );
                }
                return val || '—';
            },
        },
        {
            title: 'Người tạo',
            dataIndex: 'lv011',
            key: 'lv011',
            width: 140,
            render: (val, record) => {
                if (record.isQuickRow) return <span style={{ color: '#8c8c8c' }}>Tự động</span>;
                const staff = staffList?.find((s) => s.lv001 === val);
                return staff ? staff.lv002 : (record.tennv || record.ten_nhan_vien || val || '—');
            },
        },
        {
            title: 'Ngày tạo',
            dataIndex: 'lv012',
            key: 'lv012',
            width: 160,
            render: (val, record) => {
                if (record.isQuickRow) return <span style={{ color: '#8c8c8c' }}>Tự động</span>;
                return val || '—';
            },
        },
    ];

    const hasSelection = selectedRowKeys.length > 0;

    // ── RETURN ─────────────────────────────────────────────────────────────
    return (
        <Space direction="vertical" size={12} style={{ width: '100%' }}>

            {/* TOOLBAR */}
            <div className={styles.toolbarRow}>
                <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}>
                    <Space wrap>
                        <Text strong>{TAB_LABEL}</Text>
                        <Tag>{TAB_MODULE}</Tag>
                        <Text type="secondary">{filteredRows.length} dòng</Text>
                    </Space>
                    <Space wrap>
                        <Input
                            allowClear
                            prefix={<Search size={15} />}
                            placeholder="Lọc dữ liệu..."
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            style={{ width: 260 }}
                        />
                        <Button icon={<RefreshCw size={16} />} onClick={handleRefresh} loading={loading}>
                            Tải lại
                        </Button>
                        {!!planId && (
                            <Button type="primary" icon={<Plus size={16} />} onClick={openCreate}>
                                Thêm mới
                            </Button>
                        )}
                    </Space>
                </Space>
            </div>

            {/* BATCH ACTION BAR */}
            {!!planId && (
                <div className={`${styles.batchActionBar} ${!hasSelection ? styles.batchActionBarDisabled : ''}`}>
                    <span style={{ fontWeight: 600, color: hasSelection ? '#197dd3' : '#8c8c8c', marginRight: 8 }}>
                        Thao tác hàng loạt:
                    </span>
                    <Text><b>{selectedRowKeys.length}</b> dòng đã chọn</Text>
                    <Button
                        icon={<Edit size={16} />}
                        disabled={selectedRowKeys.length !== 1}
                        type="primary" ghost
                        onClick={() => {
                            const rec = rows.find((r) => r.lv001 === selectedRowKeys[0]);
                            if (rec) openEdit(rec);
                        }}
                    >
                        Chỉnh sửa
                    </Button>
                    <Button icon={<Lock size={16} />} disabled={!hasSelection}
                        onClick={() => handleBatchAction('childApprove', 'Duyệt / Đã xử lý')}>Duyệt</Button>
                    <Button icon={<Unlock size={16} />} disabled={!hasSelection}
                        onClick={() => handleBatchAction('childUnapprove', 'Hủy duyệt')}>Hủy duyệt</Button>
                    <Button danger icon={<Trash2 size={16} />} disabled={!hasSelection}
                        onClick={() => handleBatchAction('childDelete', 'Xóa')}>Xóa</Button>
                </div>
            )}

            {/* TABLE */}
            <Table
                className={styles.mainTable}
                rowKey={(r, i) => r.lv001 ?? i}
                columns={columns}
                dataSource={planId ? [{ isQuickRow: true, lv001: 'QUICK', key: 'QUICK' }, ...filteredRows] : filteredRows}
                loading={loading}
                size="small"
                bordered
                rowSelection={planId ? {
                    selectedRowKeys,
                    onChange: setSelectedRowKeys,
                    getCheckboxProps: (record) => ({
                        disabled: record.isQuickRow,
                    }),
                } : undefined}
                pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t) => `Tổng: ${planId ? t - 1 : t} dòng` }}
                scroll={{ x: 1600 }}
                locale={{
                    emptyText: (
                        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={`Không có dữ liệu ${TAB_LABEL}`} />
                    ),
                }}
                onRow={(record) => ({
                    onDoubleClick: () => {
                        if (record.isQuickRow) return;
                        if (planId) openEdit(record);
                    },
                })}
            />

            {/* DRAWER CREATE / EDIT */}
            <Drawer
                className={styles.khoDrawer}
                title={editingRecord ? `Sửa ${TAB_LABEL}` : `Thêm ${TAB_LABEL}`}
                open={drawerOpen}
                width={720}
                onClose={() => setDrawerOpen(false)}
                footer={
                    <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                        <Button icon={<X size={16} />} onClick={() => setDrawerOpen(false)}>Hủy</Button>
                        <Button type="primary" icon={<Save size={16} />} onClick={handleSave} loading={loading}>
                            {editingRecord ? 'Cập nhật' : 'Thêm mới'}
                        </Button>
                    </Space>
                }
            >
                <Form form={form} layout="vertical" className={styles.customForm}>
                    <Divider orientation="left" style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: 600 }}>Thông tin dự án</Divider>
                    <Row gutter={16}>
                        {editingRecord ? (
                            <>
                                <Col span={8}>
                                    <Form.Item name="lv001" label="Mã tự động">
                                        <Input disabled />
                                    </Form.Item>
                                </Col>
                                <Col span={8}>
                                    <Form.Item name="lv002" label="Mã dự án/KH">
                                        <Input disabled />
                                    </Form.Item>
                                </Col>
                                <Col span={8}>
                                    <Form.Item name="lv809" label="Tên dự án">
                                        <Input disabled />
                                    </Form.Item>
                                </Col>
                            </>
                        ) : (
                            <Col span={24}>
                                <Form.Item name="lv002" label="Mã dự án/kế hoạch">
                                    <Input disabled />
                                </Form.Item>
                            </Col>
                        )}
                    </Row>

                    <Divider orientation="left" style={{ margin: '16px 0 16px 0', fontSize: '14px', fontWeight: 600 }}>Thông tin liên hệ</Divider>
                    <Row gutter={16}>
                        
                        <Col span={12}>
                            <Form.Item name="lv006" label="Đối tượng khách hàng">
                                <SelectDoiTuongKhachHang placeholder="Chọn đối tượng" allowClear dropdownMatchSelectWidth={false} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="lv003" label="Tên liên hệ" rules={[{ required: true, message: 'Nhập tên liên hệ' }]}>
                                <Input placeholder="Họ tên đầy đủ..." />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="lv004" label="Chức vụ">
                                <Input placeholder="Chức vụ..." />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="lv005" label="Điện thoại">
                                <Input placeholder="Số điện thoại..." />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="lv007" label="Email">
                                <Input placeholder="email@domain.com" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="lv008" label="Trạng thái">
                                <Select dropdownMatchSelectWidth={false} placeholder="Chọn trạng thái" allowClear>
                                    {Object.entries(TRANG_THAI_MAP).map(([v, o]) => (
                                        <Option key={v} value={v}>{o.label}</Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="lv013" label="Liên kết">
                                <Input placeholder="Liên kết..." />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={24}>
                            <Form.Item name="lv010" label="Ghi chú">
                                <Input.TextArea rows={2} placeholder="Ghi chú..." />
                            </Form.Item>
                        </Col>
                    </Row>

                    {editingRecord && (
                        <>
                            <Divider orientation="left" style={{ margin: '16px 0 16px 0', fontSize: '14px', fontWeight: 600 }}>Thông tin khởi tạo</Divider>
                            <Row gutter={16}>
                                <Col span={12}>
                                    <Form.Item name="lv011" label="Người tạo">
                                        <Input disabled />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item name="lv012" label="Ngày tạo">
                                        <Input disabled />
                                    </Form.Item>
                                </Col>
                            </Row>
                        </>
                    )}
                </Form>
            </Drawer>
        </Space>
    );
};

export default ThongTinLienHeTab;

