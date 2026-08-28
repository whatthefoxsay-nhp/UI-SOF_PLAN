import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
    Button,
    Card,
    Col,
    DatePicker,
    Drawer,
    Empty,
    Form,
    Input,
    InputNumber,
    Modal,
    Row,
    Select,
    Space,
    Table,
    Tabs,
    Tag,
    Tooltip,
    Typography,
    Upload,
    message,
} from 'antd';
import dayjs from 'dayjs';
import {
    Edit,
    Eye,
    FileDown,
    FileText,
    Lock,
    Plus,
    RefreshCw,
    Save,
    Search,
    Trash2,
    Unlock,
    Upload as UploadIcon,
    X,
} from 'lucide-react';
import { execCRUD } from '../../../services/apiServices';
import SelectKhachHang from '../../../components/DropDown/SelectKhachHang';
import SelectNhanVien from '../../../components/DropDown/SelectNhanVien';
import SelectSanPham from '../../../components/DropDown/SelectSanPham';
import SelectDonVi from '../../../components/DropDown/SelectDonVi';
import SelectTienTe from '../../../components/DropDown/SelectTienTe';
import styles from '../QuanLyKeHoach.module.css';

const { Text } = Typography;

const CHILD_KEY = 'quotes';
const TAB_LABEL = 'Báo giá';
const TAB_MODULE = 'sl_lv0010/sl_lv0010-1.php';

const STATUS_MAP = {
    '-2': { label: 'Đã xóa', color: 'default' },
    '-1': { label: 'Trả lại', color: 'error' },
    0: { label: 'Nháp', color: 'warning' },
    1: { label: 'Đã duyệt bước 1', color: 'processing' },
    2: { label: 'Đã duyệt bước 2', color: 'processing' },
    3: { label: 'Đã duyệt', color: 'success' },
    4: { label: 'Hoàn tất', color: 'success' },
    5: { label: 'Đóng', color: 'success' },
};

const parseDate = (value) => {
    if (!value || value === '1900-01-01' || value === '0000-00-00' || value === '1900-01-01 00:00:00') return null;
    const parsed = dayjs(value);
    return parsed.isValid() ? parsed : null;
};

const formatDate = (value) => {
    const parsed = parseDate(value);
    return parsed ? parsed.format('DD/MM/YYYY') : '';
};

const formatMoney = (value) => {
    const n = Number(String(value ?? 0).replace(/,/g, ''));
    return Number.isFinite(n) ? n.toLocaleString('vi-VN') : '';
};

const quoteStatus = (value) => {
    const info = STATUS_MAP[String(value ?? 0)] || STATUS_MAP[0];
    return <Tag color={info.color}>{info.label}</Tag>;
};

const isLocked = (record) => Number(record?.lv027 ?? record?.lv011 ?? 0) > 0;

const normalizeQuote = (row, index) => ({
    ...row,
    key: row?.lv001 ?? index,
    quote_amount: Number(row?.quote_amount ?? row?.lv006 ?? 0),
    detail_count: Number(row?.detail_count ?? 0),
});

const normalizeDetail = (row = {}) => ({
    lv001: row.lv001,
    lv003: row.lv003 || '',
    lv004: row.lv004 || '',
    lv005: row.lv005 || '',
    lv006: Number(row.lv006 || 0),
    lv007: Number(row.lv007 || 0),
    lv008: Number(row.lv008 || 0),
    lv009: row.lv009 || 'VND',
    lv010: row.lv010 || '',
    lv011: Number(row.lv011 || 0),
    lv049: row.lv049 || '',
    lv050: row.lv050 || '',
    lv051: row.lv051 || '',
    lv052: row.lv052 || '',
});

const BaoGiaTab = ({ detailData, onRefresh }) => {
    const planId = detailData?.plan?.lv001;
    const [rows, setRows] = useState([]);
    const [searchText, setSearchText] = useState('');
    const [selectedRowKeys, setSelectedRowKeys] = useState([]);
    const [loading, setLoading] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [drawerMode, setDrawerMode] = useState('create');
    const [editingRecord, setEditingRecord] = useState(null);
    const [lookups, setLookups] = useState({ jobs: [], hasBBGJob: true, defaultTask: null });
    const [form] = Form.useForm();

    const watchedDetails = Form.useWatch('details', form);
    const detailsWatch = useMemo(() => watchedDetails || [], [watchedDetails]);

    useEffect(() => {
        const raw = detailData?.tabs?.[CHILD_KEY] ?? detailData?.[CHILD_KEY] ?? [];
        setRows(Array.isArray(raw) ? raw.map(normalizeQuote) : []);
        const meta = detailData?.tabs?.quoteMeta ?? detailData?.quoteMeta ?? {};
        if (meta && Object.keys(meta).length) {
            setLookups((prev) => ({
                ...prev,
                jobs: Array.isArray(meta.jobs) ? meta.jobs : prev.jobs,
                hasBBGJob: meta.hasBBGJob !== undefined ? !!meta.hasBBGJob : prev.hasBBGJob,
                defaultTask: meta.defaultTask || prev.defaultTask,
            }));
        }
    }, [detailData]);

    const fetchLookups = useCallback(async () => {
        if (!planId) return null;
        const res = await execCRUD('cr_lv0094_detail', 'quoteLookups', { lv001: planId, planId, childKey: CHILD_KEY });
        if (res?.success) {
            setLookups({
                jobs: Array.isArray(res.jobs) ? res.jobs : [],
                hasBBGJob: !!res.hasBBGJob,
                defaultTask: res.defaultTask || null,
            });
        }
        return res;
    }, [planId]);

    useEffect(() => {
        fetchLookups().catch(() => { });
    }, [fetchLookups]);

    const filteredRows = useMemo(() => {
        const keyword = searchText.trim().toLowerCase();
        if (!keyword) return rows;
        return rows.filter((row) => Object.values(row).some((value) => String(value ?? '').toLowerCase().includes(keyword)));
    }, [rows, searchText]);

    const jobOptions = useMemo(() => lookups.jobs.map((job) => ({
        label: `${job.lv001} - ${job.lv004 || job.lv003}`,
        value: job.lv001,
    })), [lookups.jobs]);

    const detailTotal = useMemo(() => detailsWatch.reduce((sum, item) => sum + Number(item?.lv006 || 0), 0), [detailsWatch]);

    const callQuoteAction = async (func, childId = '', data = {}) => {
        if (!planId) {
            message.warning('Thiếu mã kế hoạch');
            return false;
        }
        setLoading(true);
        try {
            const res = await execCRUD('cr_lv0094_detail', func, {
                lv001: planId,
                planId,
                childKey: CHILD_KEY,
                childId,
                data,
            });
            if (res?.requiresBBGTask) {
                Modal.warning({
                    title: 'Chưa có công việc Báo giá',
                    content: 'Kế hoạch này chưa có công việc loại BBG. Hệ thống sẽ chuyển sang tab Nhập công việc và điền sẵn thông tin tạo công việc Báo giá.',
                    okText: 'Tạo công việc BBG',
                    onOk: () => {
                        window.dispatchEvent(new CustomEvent('quanLyKeHoach:createTask', {
                            detail: res.defaultTask || lookups.defaultTask || { lv002: planId, lv003: 'BBG', lv004: 'Báo giá' },
                        }));
                    },
                });
                return false;
            }
            if (res?.success === false) {
                message.error(res.message || 'Thao tác thất bại');
                return false;
            }
            message.success(res?.message || 'Thao tác thành công');
            setSelectedRowKeys([]);
            await onRefresh?.();
            await fetchLookups();
            return res || true;
        } catch (error) {
            console.error(error);
            message.error(`Lỗi kết nối: ${error.message}`);
            return false;
        } finally {
            setLoading(false);
        }
    };

    const loadQuote = async (record) => {
        const res = await execCRUD('cr_lv0094_detail', 'quoteLoad', {
            lv001: planId,
            planId,
            childKey: CHILD_KEY,
            childId: record.lv001,
        });
        if (res?.success) return res;
        message.error(res?.message || 'Không tải được báo giá');
        return { header: record, details: [] };
    };

    const openCreate = async () => {
        const lookup = await fetchLookups();
        if (lookup && lookup.hasBBGJob === false) {
            Modal.warning({
                title: 'Chưa có công việc Báo giá',
                content: 'Kế hoạch này chưa có công việc loại BBG. Hệ thống sẽ chuyển sang tab Nhập công việc và điền sẵn loại công việc BBG.',
                okText: 'Tạo công việc BBG',
                onOk: () => window.dispatchEvent(new CustomEvent('quanLyKeHoach:createTask', { detail: lookup.defaultTask })),
            });
            return;
        }
        setDrawerMode('create');
        setEditingRecord(null);
        form.resetFields();
        form.setFieldsValue({
            lv114: lookup?.jobs?.[0]?.lv001 || lookups.jobs[0]?.lv001,
            lv004: dayjs(),
            lv005: dayjs(),
            lv020: 'MP008',
            lv396: 'VN',
            lv397: 'BBG_VN',
            lv009: '',
            details: [],
        });
        setDrawerOpen(true);
    };

    const openEdit = async (record, mode = 'edit') => {
        setLoading(true);
        try {
            const loaded = await loadQuote(record);
            const header = loaded.header || record;
            setDrawerMode(mode);
            setEditingRecord(header);
            form.resetFields();
            form.setFieldsValue({
                ...header,
                lv004: parseDate(header.lv004),
                lv005: parseDate(header.lv005),
                lv019: parseDate(header.lv019),
                details: (loaded.details || []).map(normalizeDetail),
            });
            setDrawerOpen(true);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        const values = await form.validateFields();
        const data = {
            ...values,
            lv004: values.lv004 ? values.lv004.format('YYYY-MM-DD') : '',
            lv005: values.lv005 ? values.lv005.format('YYYY-MM-DD') : '',
            lv019: values.lv019 ? values.lv019.format('YYYY-MM-DD') : '',
            lv006: detailTotal,
            details: (values.details || []).map((item) => ({ ...item, lv006: Number(item.lv006 || 0) })),
        };
        const ok = await callQuoteAction(editingRecord ? 'childUpdate' : 'childInsert', editingRecord?.lv001 || '', data);
        if (ok) setDrawerOpen(false);
    };

    const handleBatch = (func, label) => {
        if (!selectedRowKeys.length) {
            message.warning('Chọn ít nhất một dòng');
            return;
        }
        Modal.confirm({
            title: label,
            content: `Thực hiện "${label}" cho ${selectedRowKeys.length} báo giá?`,
            okText: 'Xác nhận',
            cancelText: 'Hủy',
            onOk: async () => {
                let ok = 0;
                for (const id of selectedRowKeys) {
                    if (await callQuoteAction(func, id)) ok += 1;
                }
                if (ok) message.success(`Đã xử lý ${ok} báo giá`);
            },
        });
    };

    const handleReport = (record, type = 'rpt') => {
        const encoded = encodeURIComponent(record.lv001);
        window.open(`/soft/sl_lv0010?func=child&childfunc=${type}&ID=${encoded}&lang=vn`, '_blank');
    };

    const columns = [
        { title: 'STT', width: 56, align: 'center', fixed: 'left', render: (_, __, index) => index + 1 },
        {
            title: 'Số báo giá',
            dataIndex: 'lv014',
            width: 150,
            fixed: 'left',
            render: (value, record) => <Button type="link" size="small" onClick={() => openEdit(record, 'view')}>{value || record.lv001}</Button>,
        },
        { title: 'Khách hàng', dataIndex: 'customer_name', width: 220, render: (v, r) => v || r.lv002 || '-' },
        { title: 'Nội dung', dataIndex: 'lv003', width: 260, ellipsis: true, render: (v) => <Tooltip title={v}>{v || '-'}</Tooltip> },
        { title: 'Công việc BBG', dataIndex: 'job_name', width: 180, render: (v, r) => v || r.lv114 || '-' },
        { title: 'Ngày BG', dataIndex: 'lv004', width: 110, render: formatDate },
        { title: 'Ngày cần', dataIndex: 'lv005', width: 110, render: formatDate },
        { title: 'Giá trị', dataIndex: 'quote_amount', width: 140, align: 'right', render: (v) => <Text strong>{formatMoney(v)}</Text> },
        { title: 'Chi tiết', dataIndex: 'detail_count', width: 90, align: 'center', render: (v) => <Tag>{v || 0}</Tag> },
        { title: 'Trạng thái', dataIndex: 'lv011', width: 140, render: (_, r) => quoteStatus(r.lv011 ?? r.lv027) },
        {
            title: 'Thao tác',
            key: 'actions',
            width: 150,
            fixed: 'right',
            render: (_, record) => (
                <Space size={4}>
                    <Tooltip title="Xem"><Button size="small" icon={<Eye size={14} />} onClick={() => openEdit(record, 'view')} /></Tooltip>
                    <Tooltip title="Sửa"><Button size="small" disabled={isLocked(record)} icon={<Edit size={14} />} onClick={() => openEdit(record, 'edit')} /></Tooltip>
                    <Tooltip title="In"><Button size="small" icon={<FileDown size={14} />} onClick={() => handleReport(record)} /></Tooltip>
                </Space>
            ),
        },
    ];

    const readOnly = drawerMode === 'view' || isLocked(editingRecord);

    return (
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <div className={styles.toolbarRow}>
                <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}>
                    <Space wrap>
                        <Text strong>{TAB_LABEL}</Text>
                        <Tag>{TAB_MODULE}</Tag>
                        <Text type="secondary">{filteredRows.length} dòng</Text>
                        {!lookups.hasBBGJob && <Tag color="warning">Chưa có công việc BBG</Tag>}
                    </Space>
                    <Space wrap>
                        <Input allowClear prefix={<Search size={15} />} placeholder="Lọc báo giá..." value={searchText} onChange={(e) => setSearchText(e.target.value)} style={{ width: 260 }} />
                        <Button icon={<RefreshCw size={16} />} onClick={() => onRefresh?.()} loading={loading}>Tải lại</Button>
                        <Button type="primary" icon={<Plus size={16} />} onClick={openCreate}>Thêm mới</Button>
                    </Space>
                </Space>
            </div>

            <div className={`${styles.batchActionBar} ${!selectedRowKeys.length ? styles.batchActionBarDisabled : ''}`}>
                <Text><b>{selectedRowKeys.length}</b> dòng đã chọn</Text>
                <Button icon={<Edit size={16} />} disabled={selectedRowKeys.length !== 1} type="primary" ghost onClick={() => {
                    const record = rows.find((item) => item.lv001 === selectedRowKeys[0]);
                    if (record) openEdit(record, 'edit');
                }}>Chỉnh sửa</Button>
                <Button icon={<Lock size={16} />} disabled={!selectedRowKeys.length} onClick={() => handleBatch('childApprove', 'Duyệt')}>Duyệt</Button>
                <Button icon={<Unlock size={16} />} disabled={!selectedRowKeys.length} onClick={() => handleBatch('childUnapprove', 'Hủy duyệt')}>Hủy duyệt</Button>
                <Button danger icon={<Trash2 size={16} />} disabled={!selectedRowKeys.length} onClick={() => handleBatch('childDelete', 'Xóa')}>Xóa</Button>
            </div>

            <Table
                className={styles.mainTable}
                rowKey="lv001"
                columns={columns}
                dataSource={filteredRows}
                loading={loading}
                size="small"
                bordered
                rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
                pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (total) => `Tổng: ${total} dòng` }}
                scroll={{ x: 1650 }}
                locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có báo giá" /> }}
                onRow={(record) => ({ onDoubleClick: () => openEdit(record, 'view') })}
            />

            <Drawer
                className={styles.khoDrawer}
                title={editingRecord ? `${drawerMode === 'view' ? 'Xem' : 'Sửa'} báo giá ${editingRecord.lv014 || editingRecord.lv001}` : 'Thêm báo giá'}
                open={drawerOpen}
                width="min(1180px, 96vw)"
                onClose={() => setDrawerOpen(false)}
                extra={editingRecord ? quoteStatus(editingRecord.lv011 ?? editingRecord.lv027) : null}
                footer={
                    <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                        <Space>
                            {editingRecord && <Button icon={<FileDown size={16} />} onClick={() => handleReport(editingRecord)}>In báo giá</Button>}
                            {editingRecord && <Button icon={<FileText size={16} />} onClick={() => handleReport(editingRecord, 'rpten')}>Mẫu EN</Button>}
                        </Space>
                        <Space>
                            <Button icon={<X size={16} />} onClick={() => setDrawerOpen(false)}>Đóng</Button>
                            {!readOnly && <Button type="primary" icon={<Save size={16} />} onClick={handleSave} loading={loading}>{editingRecord ? 'Cập nhật' : 'Thêm mới'}</Button>}
                        </Space>
                    </Space>
                }
            >
                <Form form={form} layout="vertical" className={styles.customForm} disabled={readOnly}>
                    <Tabs
                        defaultActiveKey="general"
                        items={[
                            {
                                key: 'general',
                                label: 'Thông tin chung',
                                children: (
                                    <Row gutter={12}>
                                        <Col xs={24} md={8}>
                                            <Form.Item name="lv114" label="Công việc BBG" rules={[{ required: true, message: 'Chọn công việc BBG' }]}>
                                                <Select dropdownMatchSelectWidth={false} showSearch options={jobOptions} placeholder="Chọn công việc BBG" optionFilterProp="label" />
                                            </Form.Item>
                                        </Col>
                                        <Col xs={24} md={8}>
                                            <Form.Item name="lv014" label="Số báo giá">
                                                <Input placeholder="Tự sinh khi thêm mới" />
                                            </Form.Item>
                                        </Col>
                                        <Col xs={24} md={8}>
                                            <Form.Item name="lv003" label="Tiêu đề báo giá" rules={[{ required: true, message: 'Nhập tiêu đề' }]}>
                                                <Input />
                                            </Form.Item>
                                        </Col>
                                        <Col xs={24} md={8}>
                                            <Form.Item name="lv002" label="Khách hàng" rules={[{ required: true, message: 'Chọn khách hàng' }]}>
                                                <SelectKhachHang placeholder="Chọn khách hàng" allowClear />
                                            </Form.Item>
                                        </Col>
                                        <Col xs={24} md={8}>
                                            <Form.Item name="lv030" label="Người liên hệ">
                                                <Input placeholder="Mã người liên hệ/attention" />
                                            </Form.Item>
                                        </Col>
                                        <Col xs={24} md={8}>
                                            <Form.Item name="lv009" label="Chức vụ/địa điểm giao">
                                                <Input />
                                            </Form.Item>
                                        </Col>
                                        <Col xs={24} md={6}>
                                            <Form.Item name="lv004" label="Ngày báo giá" rules={[{ required: true, message: 'Chọn ngày' }]}>
                                                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                                            </Form.Item>
                                        </Col>
                                        <Col xs={24} md={6}>
                                            <Form.Item name="lv005" label="Ngày yêu cầu">
                                                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                                            </Form.Item>
                                        </Col>
                                        <Col xs={24} md={6}>
                                            <Form.Item name="lv101" label="Người đề xuất">
                                                <SelectNhanVien allowClear />
                                            </Form.Item>
                                        </Col>
                                        <Col xs={24} md={6}>
                                            <Form.Item name="lv016" label="Người xử lý">
                                                <SelectNhanVien allowClear />
                                            </Form.Item>
                                        </Col>
                                        <Col xs={24} md={6}>
                                            <Form.Item name="lv020" label="Người duyệt">
                                                <SelectNhanVien allowClear />
                                            </Form.Item>
                                        </Col>
                                        <Col xs={24} md={6}>
                                            <Form.Item name="lv007" label="Khu vực">
                                                <Input />
                                            </Form.Item>
                                        </Col>
                                        <Col xs={24} md={6}>
                                            <Form.Item name="lv008" label="Loại hình dự án">
                                                <Input />
                                            </Form.Item>
                                        </Col>
                                        <Col xs={24} md={6}>
                                            <Form.Item name="lv024" label="Ưu tiên">
                                                <Input />
                                            </Form.Item>
                                        </Col>
                                        <Col xs={24} md={8}>
                                            <Form.Item name="lv022" label="Bảo hành">
                                                <Input />
                                            </Form.Item>
                                        </Col>
                                        <Col xs={24} md={8}>
                                            <Form.Item name="lv025" label="Thời gian giao hàng">
                                                <Input />
                                            </Form.Item>
                                        </Col>
                                        <Col xs={24} md={8}>
                                            <Form.Item name="lv106" label="Thanh toán">
                                                <Input />
                                            </Form.Item>
                                        </Col>
                                        <Col xs={24}>
                                            <Form.Item name="lv029" label="Ghi chú">
                                                <Input.TextArea rows={3} />
                                            </Form.Item>
                                        </Col>
                                    </Row>
                                ),
                            },
                            {
                                key: 'details',
                                label: `Chi tiết (${detailsWatch.length})`,
                                children: (
                                    <Space direction="vertical" size={12} style={{ width: '100%' }}>
                                        <Card size="small">
                                            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                                                <Text strong>Tổng giá trị: {formatMoney(detailTotal)} VND</Text>
                                            </Space>
                                        </Card>
                                        <Form.List name="details">
                                            {(fields, { add, remove }) => (
                                                <Space direction="vertical" style={{ width: '100%' }} size={10}>
                                                    <Button icon={<Plus size={16} />} onClick={() => add({ lv004: '', lv005: '', lv006: 0, lv007: 0, lv008: 0, lv009: 'VND' })}>Thêm dòng</Button>
                                                    {fields.map((field) => (
                                                        <Card key={field.key} size="small">
                                                            <Row gutter={8} align="bottom">
                                                                <Col xs={24} md={5}>
                                                                    <Form.Item {...field} name={[field.name, 'lv004']} label="Sản phẩm">
                                                                        <SelectSanPham allowClear />
                                                                    </Form.Item>
                                                                </Col>
                                                                <Col xs={24} md={5}>
                                                                    <Form.Item {...field} name={[field.name, 'lv010']} label="Mô tả">
                                                                        <Input />
                                                                    </Form.Item>
                                                                </Col>
                                                                <Col xs={12} md={3}>
                                                                    <Form.Item {...field} name={[field.name, 'lv005']} label="ĐVT">
                                                                        <SelectDonVi allowClear />
                                                                    </Form.Item>
                                                                </Col>
                                                                <Col xs={12} md={3}>
                                                                    <Form.Item {...field} name={[field.name, 'lv004_qty']} label="Số lượng">
                                                                        <InputNumber min={0} style={{ width: '100%' }} />
                                                                    </Form.Item>
                                                                </Col>
                                                                <Col xs={12} md={3}>
                                                                    <Form.Item {...field} name={[field.name, 'lv007']} label="Đơn giá">
                                                                        <InputNumber min={0} style={{ width: '100%' }} />
                                                                    </Form.Item>
                                                                </Col>
                                                                <Col xs={12} md={2}>
                                                                    <Form.Item {...field} name={[field.name, 'lv009']} label="Tiền tệ">
                                                                        <SelectTienTe allowClear />
                                                                    </Form.Item>
                                                                </Col>
                                                                <Col xs={12} md={2}>
                                                                    <Form.Item {...field} name={[field.name, 'lv006']} label="Thành tiền">
                                                                        <InputNumber min={0} style={{ width: '100%' }} />
                                                                    </Form.Item>
                                                                </Col>
                                                                <Col xs={12} md={1}>
                                                                    <Button danger icon={<Trash2 size={15} />} onClick={() => remove(field.name)} />
                                                                </Col>
                                                            </Row>
                                                        </Card>
                                                    ))}
                                                </Space>
                                            )}
                                        </Form.List>
                                    </Space>
                                ),
                            },
                            {
                                key: 'print',
                                label: 'Mẫu in',
                                children: (
                                    <Row gutter={12}>
                                        <Col xs={24} md={8}>
                                            <Form.Item name="lv396" label="Ngôn ngữ">
                                                <Select dropdownMatchSelectWidth={false} options={[{ value: 'VN', label: 'Tiếng Việt' }, { value: 'EN', label: 'English' }]} />
                                            </Form.Item>
                                        </Col>
                                        <Col xs={24} md={8}>
                                            <Form.Item name="lv397" label="Mẫu báo giá">
                                                <Select dropdownMatchSelectWidth={false} options={[{ value: 'BBG_VN', label: 'BBG_VN' }, { value: 'BBG_EN', label: 'BBG_EN' }]} />
                                            </Form.Item>
                                        </Col>
                                        <Col xs={24} md={8}>
                                            <Form.Item name="lv398" label="Field list">
                                                <Input />
                                            </Form.Item>
                                        </Col>
                                        <Col xs={24}>
                                            <Space wrap>
                                                <Button icon={<FileDown size={16} />} disabled={!editingRecord} onClick={() => handleReport(editingRecord, 'rpt')}>Mẫu Việt</Button>
                                                <Button icon={<FileText size={16} />} disabled={!editingRecord} onClick={() => handleReport(editingRecord, 'rpten')}>Mẫu Anh</Button>
                                                <Button icon={<FileText size={16} />} disabled={!editingRecord} onClick={() => handleReport(editingRecord, 'rptempty')}>Mẫu rỗng</Button>
                                                <Button icon={<FileText size={16} />} disabled={!editingRecord} onClick={() => handleReport(editingRecord, 'rptall')}>Tổng hợp</Button>
                                            </Space>
                                        </Col>
                                    </Row>
                                ),
                            },
                            {
                                key: 'attachments',
                                label: 'Đính kèm',
                                children: (
                                    <Upload.Dragger multiple beforeUpload={() => false} disabled={readOnly}>
                                        <p><UploadIcon size={24} /></p>
                                        <p>Chọn hoặc kéo file báo giá đính kèm vào đây</p>
                                        <p style={{ color: '#8c8c8c' }}>Phần lưu file dùng lại cơ chế upload legacy khi backend trả adapter tương ứng.</p>
                                    </Upload.Dragger>
                                ),
                            },
                        ]}
                    />
                    <Form.Item name="lv001" hidden><Input /></Form.Item>
                </Form>
            </Drawer>
        </Space>
    );
};

export default BaoGiaTab;
