import {
    Breadcrumb,
    Button,
    Card,
    Checkbox,
    Col,
    DatePicker,
    Divider,
    Drawer,
    Form,
    Input,
    Popconfirm,
    Row,
    Select,
    Space,
    Table,
    Tag,
    message,
} from 'antd';
import dayjs from 'dayjs';
import { CheckCircle, Edit, FileText, Plus, RefreshCw, RotateCcw, Save, Search, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { lv_LoadDataAPI } from '../../../../services/apiServices';
import styles from '../../../NhanVien/styles.module.css';
import useCmsTableColumns from '../../../../hooks/useCmsTableColumns';

const SearchInput = Input.Search;
const vclass = 'cr_lv0086';
// Chỉ lấy các trường cần hiển thị mặc định trên lưới chờ duyệt.
const defaultFieldList = 'lv015,lv016,lv026,lv023,lv012,lv003,lv002,lv004,lv005,lv006,lv007,lv008,lv013,lv014,lv001,lv010,lv009,lv027,lv089';

const dateFields = new Set(['lv005', 'lv010', 'lv012', 'lv023', 'lv024', 'lv094']);
const textAreaFields = new Set(['lv004', 'lv014', 'lv026']);
const selectFields = new Set(['lv002', 'lv003', 'lv006', 'lv007', 'lv008', 'lv013', 'lv015', 'lv027']);
const inlineFields = new Set(['lv012', 'lv015', 'lv016', 'lv026']);

const fieldLabels = {
    lv001: 'Mã tự động',
    lv002: 'Tên dự án',
    lv003: 'Mã công việc',
    lv004: 'Tên công việc',
    lv005: 'Ngày đến hạn',
    lv006: 'Nhân viên chính',
    lv007: 'NV chính 2',
    lv008: 'Người duyệt',
    lv009: 'Người tạo',
    lv010: 'Ngày giờ tạo',
    lv011: 'Trạng thái',
    lv012: 'Ngày hoàn thành',
    lv013: 'Nguồn tham chiếu',
    lv014: 'Mã tham chiếu',
    lv015: 'Điểm KPI',
    lv016: 'Hoàn tất',
    lv026: 'Ghi nhận quản lý',
    lv027: 'Trạng thái duyệt',
    lv089: 'Mã công văn',
    lv199: 'Chức năng',
    lv023: 'Ngày đề xuất',
};

const emptyQuickRow = {
    lv002: '',
    lv003: '',
    lv004: '',
    lv005: dayjs().hour(17).minute(0).second(0),
    lv006: '',
    lv007: '',
    lv008: '',
    lv012: null,
    lv013: '',
    lv014: '',
    lv015: '',
    lv016: false,
    lv011: '1',
};

const normalizeRows = (rows = []) => rows.map((item) => ({ ...item, key: item.lv001 }));

const toDayjs = (value) => {
    if (!value) return null;
    const parsed = dayjs(value);
    return parsed.isValid() ? parsed : null;
};

const formatDateView = (value) => {
    if (!value) return '';
    const parsed = dayjs(value);
    return parsed.isValid() ? parsed.format('DD/MM/YYYY HH:mm:ss') : value;
};

const formatDateSubmit = (value) => {
    if (!value) return '';
    return dayjs.isDayjs(value) ? value.format('YYYY-MM-DD HH:mm:ss') : value;
};

const renderMultiline = (value, field) => {
    if (typeof value === 'string' && value.includes('<br/>')) {
        return value.split('<br/>').map((line, index) => <div key={`${field}-${index}`}>{line}</div>);
    }
    return value;
};

const lookupOptions = (lookups, field) => {
    const map = {
        lv002: 'plans',
        lv003: 'jobTypes',
        lv006: 'employees',
        lv007: 'employees',
        lv008: 'employees',
        lv013: 'refTypes',
        lv015: 'categories',
        lv027: 'states',
    };
    return (lookups[map[field]] || []).map((item) => ({
        value: item.lv001,
        label: item.lv009 ? `${item.lv009} (${item.lv001})` : item.lv002,
    }));
};

const CongViecDoiDuyet = () => {
    const [rows, setRows] = useState([]);
    const [permissions, setPermissions] = useState({});
    const [lookups, setLookups] = useState({});
    const [loading, setLoading] = useState(false);
    const [selectedRowKeys, setSelectedRowKeys] = useState([]);
    const [editingRecord, setEditingRecord] = useState(null);
    const [isDrawerVisible, setIsDrawerVisible] = useState(false);
    const [quickRow, setQuickRow] = useState(emptyQuickRow);
    const [searchText, setSearchText] = useState('');
    const [form] = Form.useForm();

    const loadLookups = useCallback(async () => {
        const data = await lv_LoadDataAPI(vclass, 'loadLookups');
        setLookups(data || {});
    }, []);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            // Gọi listJSON để prime column metadata cache cho useCmsTableColumns
            await lv_LoadDataAPI(vclass, 'listJSON', { prefTable: vclass });

            const res = await lv_LoadDataAPI(vclass, 'loadCongViecDoiDuyet', {
                fieldList: defaultFieldList,
                maxRows: 100,
            });
            setRows(normalizeRows(res?.data || []));
            setPermissions(res?.permissions || {});
        } catch (error) {
            console.error('Error loading Công việc đợi duyệt:', error);
            message.error('Không thể tải danh sách Công việc đợi duyệt.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadLookups();
    }, [loadLookups]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const filteredRows = useMemo(() => {
        const keyword = searchText.trim().toLowerCase();
        if (!keyword) return rows;
        const searchableFields = ['lv001', 'lv002', 'lv003', 'lv004', 'lv006', 'lv007', 'lv008', 'lv014', 'lv026', 'lv089'];
        return rows.filter((item) => searchableFields.some((field) => String(item[field] || '').toLowerCase().includes(keyword)));
    }, [rows, searchText]);

    const selectedRecord = useMemo(
        () => rows.find((item) => item.key === selectedRowKeys[0]),
        [rows, selectedRowKeys],
    );

    const closeDrawer = () => {
        setIsDrawerVisible(false);
        setEditingRecord(null);
        form.resetFields();
    };

    const openAddDrawer = () => {
        setEditingRecord(null);
        form.resetFields();
        form.setFieldsValue(emptyQuickRow);
        setIsDrawerVisible(true);
    };

    const openEditDrawer = (record) => {
        const raw = record?._raw || record;
        setEditingRecord(record);
        form.resetFields();
        form.setFieldsValue({
            ...raw,
            lv005: toDayjs(raw.lv005),
            lv012: toDayjs(raw.lv012),
            lv016: Number(raw.lv016) === 1,
        });
        setIsDrawerVisible(true);
    };

    const buildSavePayload = (values, recordId) => ({
        ...values,
        lv001: recordId || values.lv001,
        lv005: formatDateSubmit(values.lv005),
        lv012: formatDateSubmit(values.lv012),
        lv016: values.lv016 ? '1' : '0',
    });

    const submitForm = async (values) => {
        const payload = buildSavePayload(values, editingRecord?._raw?.lv001 || editingRecord?.lv001);
        try {
            setLoading(true);
            const res = await lv_LoadDataAPI(vclass, editingRecord ? 'suaCongViecDoiDuyet' : 'themCongViecDoiDuyet', payload);
            if (res?.success === false) {
                message.error(res.message || 'Thao tác không thành công.');
                return;
            }
            message.success(res?.message || 'Lưu công việc thành công.');
            closeDrawer();
            await loadData();
        } catch (error) {
            console.error('Error saving Công việc đợi duyệt:', error);
            message.error('Không thể lưu công việc.');
        } finally {
            setLoading(false);
        }
    };

    const submitQuickRow = async () => {
        if (!quickRow.lv003 || !quickRow.lv004 || !quickRow.lv006) {
            message.warning('Vui lòng nhập Loại công việc, Nội dung và Người yêu cầu.');
            return;
        }
        try {
            setLoading(true);
            const res = await lv_LoadDataAPI(vclass, 'themCongViecDoiDuyet', buildSavePayload(quickRow));
            if (res?.success === false) {
                message.error(res.message || 'Không thể thêm công việc.');
                return;
            }
            message.success(res?.message || 'Thêm công việc thành công.');
            setQuickRow({ ...emptyQuickRow, lv005: dayjs().hour(17).minute(0).second(0) });
            await loadData();
        } catch (error) {
            console.error('Error quick adding Công việc đợi duyệt:', error);
            message.error('Không thể thêm nhanh công việc.');
        } finally {
            setLoading(false);
        }
    };

    const runAction = async (func, ids, successText) => {
        const idList = Array.isArray(ids) ? ids : [ids];
        if (idList.length === 0) return;
        try {
            setLoading(true);
            const res = await lv_LoadDataAPI(vclass, func, { ids: idList });
            if (res?.success === false) {
                message.error(res.message || 'Thao tác không thành công.');
                return;
            }
            message.success(res?.message || successText);
            setSelectedRowKeys([]);
            await loadData();
        } catch (error) {
            console.error(`Error running ${func}:`, error);
            message.error('Không thể thực hiện thao tác.');
        } finally {
            setLoading(false);
        }
    };

    const updateInlineField = async (record, field, value) => {
        const payloadValue = field === 'lv012' ? formatDateSubmit(value) : field === 'lv016' ? (value ? '1' : '0') : value;
        try {
            const res = await lv_LoadDataAPI(vclass, 'updateInlineField', {
                lv001: record._raw?.lv001 || record.lv001,
                field,
                value: payloadValue,
            });
            if (res?.success === false) {
                message.error(res.message || 'Không thể cập nhật nhanh.');
                return;
            }
            message.success(res?.message || 'Cập nhật nhanh thành công.');
            await loadData();
        } catch (error) {
            console.error('Error updating inline field:', error);
            message.error('Không thể cập nhật nhanh.');
        }
    };

    const renderFormControl = (field) => {
        if (field === 'lv016') return <Checkbox>Hoàn tất</Checkbox>;
        if (dateFields.has(field)) return <DatePicker showTime format="DD/MM/YYYY HH:mm:ss" style={{ width: '100%' }} />;
        if (selectFields.has(field)) {
            return (
                <Select
                    showSearch
                    allowClear
                    optionFilterProp="label"
                    options={lookupOptions(lookups, field)}
                    placeholder={`Chọn ${fieldLabels[field] || field}`}
                />
            );
        }
        if (textAreaFields.has(field)) return <Input.TextArea rows={3} />;
        return <Input />;
    };

    const renderInlineControl = (value, record, field) => {
        if (!inlineFields.has(field) || !permissions.approve) return null;
        const rawValue = record?._raw?.[field] ?? value;
        if (field === 'lv016') {
            return <Checkbox checked={Number(rawValue) === 1} onChange={(event) => updateInlineField(record, field, event.target.checked)} />;
        }
        if (field === 'lv012') {
            return (
                <DatePicker
                    size="small"
                    value={toDayjs(rawValue)}
                    format="DD/MM/YYYY"
                    onChange={(nextValue) => updateInlineField(record, field, nextValue)}
                    style={{ width: 128 }}
                />
            );
        }
        if (field === 'lv015') {
            return (
                <Select
                    size="small"
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    value={rawValue || undefined}
                    options={lookupOptions(lookups, field)}
                    onChange={(nextValue) => updateInlineField(record, field, nextValue || '')}
                    style={{ minWidth: 130 }}
                />
            );
        }
        if (field === 'lv026') {
            return (
                <Input.TextArea
                    size="small"
                    defaultValue={rawValue}
                    rows={2}
                    onBlur={(event) => updateInlineField(record, field, event.target.value)}
                    style={{ minWidth: 180 }}
                />
            );
        }
        return null;
    };

    const renderCell = (value, record, field) => {
        if (field === 'lv199') {
            return (
                <Space size={4}>
                    {permissions.approve && (
                        <Button
                            size="small"
                            type="primary"
                            icon={<CheckCircle size={14} />}
                            onClick={() => runAction('duyetCongViec', record.lv001, 'Duyệt công việc thành công.')}
                        >
                            Duyệt
                        </Button>
                    )}
                    {permissions.unapprove && (
                        <Button
                            size="small"
                            icon={<RotateCcw size={14} />}
                            onClick={() => runAction('traCongViec', record.lv001, 'Trả lại công việc thành công.')}
                        >
                            Trả lại
                        </Button>
                    )}
                </Space>
            );
        }
        const inlineControl = renderInlineControl(value, record, field);
        if (inlineControl) return inlineControl;
        if (field === 'lv016') return <Checkbox checked={Number(value) === 1} disabled />;
        if (field === 'lv027') return <Tag color="processing">{value || 'Chờ duyệt'}</Tag>;
        // Dữ liệu hiển thị từ API có thể đã được rút gọn còn ngày; ưu tiên giá trị gốc để giữ cả giờ.
        if (dateFields.has(field)) return formatDateView(record?._raw?.[field] ?? value);
        return renderMultiline(value, field);
    };

    // Định nghĩa cột STATIC — thứ tự hiển thị do useCmsTableColumns quản lý từ meta
    const columns = useMemo(() => [
        {
            title: <div style={{ textAlign: 'center' }}>STT</div>,
            key: 'stt',
            width: 64,
            align: 'center',
            render: (_, __, index) => <div style={{ textAlign: 'center' }}>{index + 1}</div>,
            fixed: 'left',
        },
        {
            title: fieldLabels.lv015,
            dataIndex: 'lv015',
            key: 'lv015',
            width: 150,
            render: (value, record) => renderCell(value, record, 'lv015'),
        },
        {
            title: fieldLabels.lv016,
            dataIndex: 'lv016',
            key: 'lv016',
            width: 100,
            align: 'center',
            render: (value, record) => renderCell(value, record, 'lv016'),
        },
        {
            title: fieldLabels.lv026,
            dataIndex: 'lv026',
            key: 'lv026',
            width: 200,
            render: (value, record) => renderCell(value, record, 'lv026'),
        },
        {
            title: fieldLabels.lv023,
            dataIndex: 'lv023',
            key: 'lv023',
            width: 130,
            align: 'center',
            render: (value, record) => renderCell(value, record, 'lv023'),
        },
        {
            title: fieldLabels.lv012,
            dataIndex: 'lv012',
            key: 'lv012',
            width: 150,
            render: (value, record) => renderCell(value, record, 'lv012'),
        },
        {
            title: fieldLabels.lv003,
            dataIndex: 'lv003',
            key: 'lv003',
            width: 160,
            render: (value, record) => renderCell(value, record, 'lv003'),
        },
        {
            title: fieldLabels.lv002,
            dataIndex: 'lv002',
            key: 'lv002',
            width: 160,
            render: (value, record) => renderCell(value, record, 'lv002'),
        },
        {
            title: fieldLabels.lv004,
            dataIndex: 'lv004',
            key: 'lv004',
            width: 260,
            render: (value, record) => renderCell(value, record, 'lv004'),
        },
        {
            title: fieldLabels.lv005,
            dataIndex: 'lv005',
            key: 'lv005',
            width: 130,
            align: 'center',
            render: (value, record) => renderCell(value, record, 'lv005'),
        },
        {
            title: fieldLabels.lv006,
            dataIndex: 'lv006',
            key: 'lv006',
            width: 150,
            render: (value, record) => renderCell(value, record, 'lv006'),
        },
        {
            title: fieldLabels.lv007,
            dataIndex: 'lv007',
            key: 'lv007',
            width: 150,
            render: (value, record) => renderCell(value, record, 'lv007'),
        },
        {
            title: fieldLabels.lv008,
            dataIndex: 'lv008',
            key: 'lv008',
            width: 150,
            render: (value, record) => renderCell(value, record, 'lv008'),
        },
        {
            title: fieldLabels.lv013,
            dataIndex: 'lv013',
            key: 'lv013',
            width: 130,
            render: (value, record) => renderCell(value, record, 'lv013'),
        },
        {
            title: fieldLabels.lv014,
            dataIndex: 'lv014',
            key: 'lv014',
            width: 200,
            render: (value, record) => renderCell(value, record, 'lv014'),
        },
        {
            title: fieldLabels.lv001,
            dataIndex: 'lv001',
            key: 'lv001',
            width: 80,
            align: 'center',
            render: (value, record) => renderCell(value, record, 'lv001'),
        },
        {
            title: fieldLabels.lv010,
            dataIndex: 'lv010',
            key: 'lv010',
            width: 130,
            align: 'center',
            render: (value, record) => renderCell(value, record, 'lv010'),
        },
        {
            title: fieldLabels.lv009,
            dataIndex: 'lv009',
            key: 'lv009',
            width: 150,
            render: (value, record) => renderCell(value, record, 'lv009'),
        },
        {
            title: fieldLabels.lv027,
            dataIndex: 'lv027',
            key: 'lv027',
            width: 130,
            align: 'center',
            render: (value, record) => renderCell(value, record, 'lv027'),
        },
        {
            title: fieldLabels.lv089,
            dataIndex: 'lv089',
            key: 'lv089',
            width: 130,
            render: (value, record) => renderCell(value, record, 'lv089'),
        },
    // Không dùng tiêu đề cũ từ metadata vì tên cột của màn hình này đã được chuẩn hóa riêng.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    ].map((column) => (column.key === 'stt' ? column : { ...column, preserveTitle: true })), [lookups, permissions]);

    const cmsTableColumns = useCmsTableColumns({
        tableName: vclass,
        prefTable: vclass,
        columns,
        requiredKeys: ['lv003', 'lv004', 'lv006', 'lv012', 'lv015', 'lv016'],
        onReload: loadData,
        pageSize: 100,
        currentPage: 1,
        hasQuickRow: false,
        reloadUseListJson: false, // loadData dùng loadCongViecDoiDuyet, không phải listJSON
    });

    const quickFields = ['lv002', 'lv003', 'lv004', 'lv005', 'lv006', 'lv007', 'lv008', 'lv012', 'lv013', 'lv014', 'lv015', 'lv016'];
    const formFieldsMain = ['lv002', 'lv003', 'lv004', 'lv005', 'lv006', 'lv007', 'lv008'];
    const formFieldsApproval = ['lv012', 'lv013', 'lv014', 'lv015', 'lv016', 'lv026'];

    const renderQuickControl = (field) => {
        if (field === 'lv016') {
            return (
                <Checkbox
                    checked={quickRow.lv016}
                    onChange={(event) => setQuickRow((prev) => ({ ...prev, lv016: event.target.checked }))}
                >
                    Hoàn tất
                </Checkbox>
            );
        }
        if (dateFields.has(field)) {
            return (
                <DatePicker
                    showTime
                    format="DD/MM/YYYY HH:mm:ss"
                    value={quickRow[field]}
                    onChange={(value) => setQuickRow((prev) => ({ ...prev, [field]: value }))}
                    style={{ width: '100%' }}
                />
            );
        }
        if (selectFields.has(field)) {
            return (
                <Select
                    showSearch
                    allowClear
                    optionFilterProp="label"
                    value={quickRow[field] || undefined}
                    options={lookupOptions(lookups, field)}
                    onChange={(value) => setQuickRow((prev) => ({ ...prev, [field]: value || '' }))}
                />
            );
        }
        if (textAreaFields.has(field)) {
            return (
                <Input.TextArea
                    rows={2}
                    value={quickRow[field]}
                    onChange={(event) => setQuickRow((prev) => ({ ...prev, [field]: event.target.value }))}
                />
            );
        }
        return (
            <Input
                value={quickRow[field]}
                onChange={(event) => setQuickRow((prev) => ({ ...prev, [field]: event.target.value }))}
            />
        );
    };

    const renderDrawerItem = (field, colSpan = 8) => (
        <Col span={colSpan} key={field}>
            <Form.Item
                name={field}
                label={fieldLabels[field] || field}
                valuePropName={field === 'lv016' ? 'checked' : 'value'}
                rules={['lv003', 'lv004', 'lv006'].includes(field) ? [{ required: true, message: 'Bắt buộc nhập' }] : []}
            >
                {renderFormControl(field)}
            </Form.Item>
        </Col>
    );

    return (
        <div className={styles.khoContainer}>
            <Breadcrumb className={styles.pageBreadcrumb}>
                <Breadcrumb.Item href="">Quản lý công việc</Breadcrumb.Item>
                <Breadcrumb.Item>Công việc đợi duyệt</Breadcrumb.Item>
            </Breadcrumb>

            <div className={styles.khoHeader}>
                <div className={styles.khoTitle}>
                    <FileText size={28} />
                    <h2 className={styles.khoTitleText}>Công việc đợi duyệt</h2>
                </div>
                <div className={styles.khoActions}>
                    <SearchInput
                        placeholder="Tìm theo mã, nội dung, người xử lý"
                        className={styles.khoSearch}
                        allowClear
                        prefix={<Search size={18} />}
                        value={searchText}
                        onChange={(event) => setSearchText(event.target.value || '')}
                    />
                    <Button icon={<RefreshCw size={16} />} onClick={loadData} loading={loading}>
                        Làm mới
                    </Button>
                    {/* ColumnSelector được tích hợp sẵn trong cmsTableColumns.selector */}
                    {cmsTableColumns.selector}
                    {permissions.add && (
                        <Button type="primary" icon={<Plus size={18} />} onClick={openAddDrawer}>
                            Thêm mới
                        </Button>
                    )}
                </div>
            </div>

            <div className={styles.batchActionBar}>
                <span style={{ fontWeight: 600, color: '#197dd3', marginRight: 8 }}>
                    Thao tác hàng loạt:
                </span>
                <Button
                    icon={<Edit size={16} />}
                    disabled={!permissions.edit || selectedRowKeys.length !== 1}
                    onClick={() => selectedRecord && openEditDrawer(selectedRecord)}
                    type="primary"
                    ghost
                >
                    Chỉnh sửa
                </Button>
                <Button
                    icon={<CheckCircle size={16} />}
                    disabled={!permissions.approve || selectedRowKeys.length === 0}
                    onClick={() => runAction('duyetCongViec', selectedRowKeys, 'Duyệt công việc thành công.')}
                >
                    Duyệt
                </Button>
                <Button
                    icon={<RotateCcw size={16} />}
                    disabled={!permissions.unapprove || selectedRowKeys.length === 0}
                    onClick={() => runAction('traCongViec', selectedRowKeys, 'Trả lại công việc thành công.')}
                >
                    Trả lại
                </Button>
                <Popconfirm
                    title="Xóa công việc"
                    description={`Xóa ${selectedRowKeys.length} công việc đã chọn?`}
                    disabled={!permissions.delete || selectedRowKeys.length === 0}
                    onConfirm={() => runAction('xoaCongViecDoiDuyet', selectedRowKeys, 'Xóa công việc thành công.')}
                    okText="Xóa"
                    cancelText="Hủy"
                >
                    <Button danger icon={<Trash2 size={16} />} disabled={!permissions.delete || selectedRowKeys.length === 0}>
                        Xóa đã chọn
                    </Button>
                </Popconfirm>
                <span style={{ marginLeft: 'auto', color: '#8c8c8c' }}>
                    Đã chọn <b>{selectedRowKeys.length}</b> dòng
                </span>
            </div>

            {permissions.add && (
                <Card className={styles.mainCard} style={{ marginBottom: 16 }}>
                    <Form layout="vertical" className={styles.customForm}>
                        <Divider className={styles.dividerSolid} orientation="left">Nhập nhanh công việc</Divider>
                        <Row gutter={16}>
                            {quickFields.map((field) => (
                                <Col span={field === 'lv004' || field === 'lv014' ? 12 : 6} key={field}>
                                    <Form.Item label={fieldLabels[field] || field} style={{ marginBottom: 12 }}>
                                        {renderQuickControl(field)}
                                    </Form.Item>
                                </Col>
                            ))}
                        </Row>
                        <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <Button type="primary" icon={<Save size={16} />} onClick={submitQuickRow} loading={loading}>
                                Lưu nhanh
                            </Button>
                        </Space>
                    </Form>
                </Card>
            )}

            <Card className={styles.mainCard}>
                <Table
                    rowSelection={{
                        selectedRowKeys,
                        onChange: setSelectedRowKeys,
                    }}
                    columns={cmsTableColumns.displayColumns}
                    dataSource={filteredRows}
                    rowKey="lv001"
                    loading={loading}
                    size="small"
                    scroll={{ x: 'max-content' }}
                    rowClassName={(record) => record._className || ''}
                    pagination={{
                        pageSize: 50,
                        showSizeChanger: true,
                        showTotal: (total) => `Tổng số: ${total} bản ghi`,
                    }}
                    onRow={(record) => ({
                        onDoubleClick: () => {
                            if (permissions.edit) openEditDrawer(record);
                        },
                    })}
                />
            </Card>

            <Drawer
                title={
                    <Space>
                        <FileText size={20} color="#197dd3" />
                        <span>{editingRecord ? 'Cập nhật công việc đợi duyệt' : 'Thêm mới công việc đợi duyệt'}</span>
                    </Space>
                }
                placement="right"
                width={1000}
                open={isDrawerVisible}
                forceRender={true}
                onClose={closeDrawer}
                className={styles.khoDrawer}
                footer={
                    <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Button onClick={closeDrawer}>Hủy</Button>
                        <Button type="primary" onClick={() => form.submit()} loading={loading}>
                            {editingRecord ? 'Cập nhật' : 'Thêm mới'}
                        </Button>
                    </Space>
                }
            >
                <Form form={form} layout="vertical" onFinish={submitForm} className={styles.customForm}>
                    <Divider className={styles.dividerSolid} orientation="left">Thông tin công việc</Divider>
                    <div style={{ padding: '8px 0' }}>
                        <Row gutter={16}>
                            {editingRecord && renderDrawerItem('lv001', 6)}
                            {formFieldsMain.map((field) => renderDrawerItem(field, field === 'lv004' ? 12 : 6))}
                        </Row>
                    </div>

                    <Divider className={styles.dividerSolid} orientation="left">Thông tin duyệt & tham chiếu</Divider>
                    <div style={{ padding: '8px 0' }}>
                        <Row gutter={16}>
                            {formFieldsApproval.map((field) => renderDrawerItem(field, field === 'lv014' || field === 'lv026' ? 12 : 6))}
                        </Row>
                    </div>
                </Form>
            </Drawer>
        </div>
    );
};

export default CongViecDoiDuyet;
