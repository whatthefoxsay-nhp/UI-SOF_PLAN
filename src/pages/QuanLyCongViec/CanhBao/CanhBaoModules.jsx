import { ReloadOutlined, SettingOutlined } from '@ant-design/icons';
import {
    Breadcrumb,
    Button,
    Card,
    DatePicker,
    Divider,
    Drawer,
    Dropdown,
    Form,
    Input,
    InputNumber,
    message,
    Modal,
    Popconfirm,
    Row,
    Col,
    Select,
    Space,
    Switch,
    Table,
    Tabs,
    Tag,
    Tooltip,
} from 'antd';
import dayjs from 'dayjs';
import { Bell, CalendarDays, Edit, Eye, FileText, Mail, Plus, Search, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { lv_LoadDataAPI } from '../../../services/apiServices';
import styles from '../../NhanVien/styles.module.css';
import ColumnSelector from '../../../components/common/ColumnSelector/ColumnSelector';
import useSavedTablePreferences, { sortRowsByPreference } from '../../../hooks/useSavedTablePreferences';
import { useTabs } from '../../../contexts/TabContext';

const { Search: SearchInput, TextArea } = Input;

const cycleTabs = [
    { key: '0', label: 'Theo ngày', summaryKey: 'daily' },
    { key: '1', label: 'Theo tuần', summaryKey: 'weekly' },
    { key: '2', label: 'Theo tháng', summaryKey: 'monthly' },
    { key: '3', label: 'Theo năm', summaryKey: 'yearly' },
    { key: '', label: 'Tổng hợp', summaryKey: 'all' },
];

const cycleOptions = [
    { value: '0', label: 'Theo ngày' },
    { value: '1', label: 'Theo tuần' },
    { value: '2', label: 'Theo tháng' },
    { value: '3', label: 'Theo năm' },
];

const formatDateForApi = (value) => (value ? dayjs(value).format('DD/MM/YYYY') : '');
const asArray = (res, key = 'data') => (Array.isArray(res) ? res : Array.isArray(res?.[key]) ? res[key] : []);
const lookupArray = (lookups, key) => (Array.isArray(lookups?.[key]) ? lookups[key] : []);

const PageShell = ({ title, icon, children, actions, searchValue, onSearchChange, breadcrumb = 'Cảnh báo' }) => (
    <div className={styles.khoContainer}>
        <Breadcrumb className={styles.pageBreadcrumb}>
            <Breadcrumb.Item>Quản lý công việc</Breadcrumb.Item>
            <Breadcrumb.Item>{breadcrumb}</Breadcrumb.Item>
            <Breadcrumb.Item>{title}</Breadcrumb.Item>
        </Breadcrumb>
        <div className={styles.khoHeader}>
            <div className={styles.khoTitle}>
                {icon}
                <h2 className={styles.khoTitleText}>{title}</h2>
            </div>
            <div className={styles.khoActions}>
                {onSearchChange && (
                    <SearchInput
                        placeholder="Tìm nội dung, mã tham chiếu"
                        className={styles.khoSearch}
                        allowClear
                        prefix={<Search size={18} />}
                        value={searchValue}
                        onChange={(event) => onSearchChange(event.target.value || '')}
                    />
                )}
                {actions}
            </div>
        </div>
        {children}
    </div>
);

const renderDate = (value, record, field) => record?.[`${field}_text`] || (value ? dayjs(value).format('DD/MM/YYYY') : '');

const baseColumns = [
    { title: 'Mã cảnh báo', dataIndex: 'lv001', width: 130 },
    { title: 'Loại / chu kỳ cảnh báo', dataIndex: 'lv017', width: 170, render: (value, record) => record.lv017_label || cycleOptions.find((item) => item.value === String(value))?.label || value },
    { title: 'Người tiếp nhận', dataIndex: 'lv016', width: 180, render: (value, record) => record.lv016_label || record.ten_nguoi_tiep_nhan || value },
    { title: 'Kế hoạch / dự án', dataIndex: 'lv002', width: 220, render: (value, record) => record.lv002_label || value },
    { title: 'Công việc', dataIndex: 'lv003', width: 240, render: (value, record) => record.lv003_label || value },
    { title: 'Loại cảnh báo', dataIndex: 'lv004', width: 180, render: (value, record) => record.lv004_label || record.ten_loai_canh_bao || value },
    { title: 'Mã tham chiếu', dataIndex: 'lv005', width: 150 },
    { title: 'Ngày cảnh báo', dataIndex: 'lv006', width: 140, render: (value, record) => renderDate(value, record, 'lv006') },
    { title: 'Ngày hết hạn', dataIndex: 'lv007', width: 140, render: (value, record) => renderDate(value, record, 'lv007') },
    { title: 'Số ngày cảnh báo trước', dataIndex: 'lv008', width: 160 },
    { title: 'Ngày (cảnh báo)', dataIndex: 'lv018', width: 120 },
    { title: 'Thứ (cảnh báo)', dataIndex: 'lv019', width: 120 },
    { title: 'Nội dung cảnh báo', dataIndex: 'lv009', width: 260 },
    { title: 'Dừng cảnh báo', dataIndex: 'lv010', width: 130, render: (value) => String(value) === '1' ? 'Đã dừng' : 'Đang hoạt động' },
    { title: 'Người dừng cảnh báo', dataIndex: 'lv011', width: 170, render: (value, record) => record.lv011_label || value },
    { title: 'Ngày dừng cảnh báo', dataIndex: 'lv012', width: 170 },
    { title: 'Người tạo', dataIndex: 'lv013', width: 160, render: (value, record) => record.lv013_label || record.nguoi_tao || value },
    { title: 'Ngày giờ tạo', dataIndex: 'lv014', width: 160 },
    { title: 'Tự động', dataIndex: 'lv015', width: 100, render: (value) => String(value) === '1' ? 'Có' : 'Không' },
];

export const CanhBao = () => {
    const { addTab } = useTabs();
    const [rows, setRows] = useState([]);
    const [summary, setSummary] = useState({});
    const [loading, setLoading] = useState(false);
    const [activeCycle, setActiveCycle] = useState('0');
    const [searchText, setSearchText] = useState('');
    const [selectedRowKeys, setSelectedRowKeys] = useState([]);
    const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);
    const [lookups, setLookups] = useState({ cycles: cycleOptions, projects: [], tasks: [], modules: [], references: [], employees: [] });
    const [quickRowData, setQuickRowData] = useState({
        lv002: '',
        lv003: '',
        lv004: '',
        lv005: '',
        lv017: '0',
        lv008: 0,
        lv006: dayjs(),
        lv007: dayjs(),
        lv016: '',
        lv009: '',
    });
    const [form] = Form.useForm();

    const loadLookupOptions = useCallback(async (field, extra = {}) => {
        const res = await lv_LoadDataAPI('cr_lv0046', 'loadLookupOptions', { field, limit: 100, ...extra });
        return asArray(res);
    }, []);

    const loadLookups = useCallback(async () => {
        try {
            const res = await lv_LoadDataAPI('cr_lv0046', 'loadLookups');
            if (res?.success) {
                setLookups({
                    cycles: Array.isArray(res.cycles) ? res.cycles : cycleOptions,
                    projects: Array.isArray(res.projects) ? res.projects : [],
                    tasks: Array.isArray(res.tasks) ? res.tasks : [],
                    modules: Array.isArray(res.modules) ? res.modules : [],
                    references: Array.isArray(res.references) ? res.references : [],
                    employees: Array.isArray(res.employees) ? res.employees : [],
                });
            }
        } catch (error) {
            console.error('Load cảnh báo lookups failed:', error);
        }
    }, []);

    const loadData = useCallback(async (page = pagination.current, pageSize = pagination.pageSize, cycle = activeCycle) => {
        setLoading(true);
        try {
            const res = await lv_LoadDataAPI('cr_lv0046', 'loadCanhBao', {
                lv017: cycle,
                lv009: searchText,
                page,
                pageSize,
            });
            const data = asArray(res).map((item) => ({ ...item, key: item.lv001 }));
            setRows(data);
            setSummary(res?.summary || {});
            setPagination({
                current: res?.pagination?.page || page,
                pageSize: res?.pagination?.pageSize || pageSize,
                total: res?.pagination?.total || data.length,
            });
        } catch (error) {
            console.error('Load cảnh báo failed:', error);
            message.error('Không thể tải danh sách cảnh báo');
        } finally {
            setLoading(false);
        }
    }, [activeCycle, pagination.current, pagination.pageSize, searchText]);

    useEffect(() => {
        loadData(1, pagination.pageSize, activeCycle);
    }, [activeCycle, searchText]);

    useEffect(() => {
        loadLookups();
    }, [loadLookups]);

    useEffect(() => {
        updateQuickRow('lv017', activeCycle || '0');
    }, [activeCycle]);

    const openAdd = () => {
        setEditingRecord(null);
        form.resetFields();
        form.setFieldsValue({ lv017: activeCycle || '0', lv006: dayjs(), lv007: dayjs(), lv008: 0, lv016: [] });
        setDrawerOpen(true);
    };

    const openEdit = (record) => {
        setEditingRecord(record);
        form.setFieldsValue({
            ...record,
            lv006: record.lv006 ? dayjs(record.lv006) : null,
            lv007: record.lv007 ? dayjs(record.lv007) : null,
            lv016: record.lv016 ? String(record.lv016).split(',').filter(Boolean) : [],
        });
        if (record.lv002) handleLookupSearch('lv003', '', record);
        if (record.lv004) handleLookupSearch('lv005', '', record);
        setDrawerOpen(true);
    };

    const saveRecord = async (values) => {
        const payload = {
            ...values,
            lv001: editingRecord?.lv001,
            lv006: formatDateForApi(values.lv006),
            lv007: formatDateForApi(values.lv007),
            lv016: Array.isArray(values.lv016) ? values.lv016.join(',') : values.lv016,
        };
        const res = await lv_LoadDataAPI('cr_lv0046', editingRecord ? 'suaCanhBao' : 'themCanhBao', payload);
        if (res?.success) {
            message.success(res.message || 'Đã lưu cảnh báo');
            setDrawerOpen(false);
            loadData();
        } else {
            message.error(res?.message || 'Không thể lưu cảnh báo');
        }
    };

    const deleteRows = async () => {
        const res = await lv_LoadDataAPI('cr_lv0046', 'xoaCanhBao', { ids: selectedRowKeys });
        if (res?.success) {
            message.success(res.message || 'Đã xóa cảnh báo');
            setSelectedRowKeys([]);
            loadData();
        } else {
            message.error(res?.message || 'Không thể xóa cảnh báo');
        }
    };

    const updateStop = async (record, checked) => {
        const res = await lv_LoadDataAPI('cr_lv0046', 'dungCanhBao', {
            lv001: record.lv001,
            value: checked ? '1' : '0',
        });
        if (res?.success) {
            message.success(res.message || 'Đã cập nhật trạng thái dừng cảnh báo');
            loadData();
        } else {
            message.error(res?.message || 'Không thể cập nhật trạng thái dừng cảnh báo');
        }
    };

    const resetQuickRow = () => {
        setQuickRowData({
            lv002: '',
            lv003: '',
            lv004: '',
            lv005: '',
            lv017: activeCycle || '0',
            lv008: 0,
            lv006: dayjs(),
            lv007: dayjs(),
            lv016: '',
            lv009: '',
        });
    };

    const handleQuickSubmit = async () => {
        if (!quickRowData.lv002 || !quickRowData.lv003 || !quickRowData.lv004 || !quickRowData.lv005 || !quickRowData.lv009) {
            message.warning('Vui lòng chọn kế hoạch, công việc, mã module, mã tham chiếu và nhập nội dung cảnh báo để thêm nhanh.');
            return;
        }

        try {
            setLoading(true);
            const payload = {
                ...quickRowData,
                lv017: quickRowData.lv017 || activeCycle || '0',
                lv006: formatDateForApi(quickRowData.lv006),
                lv007: formatDateForApi(quickRowData.lv007),
            };
            const res = await lv_LoadDataAPI('cr_lv0046', 'themCanhBao', payload);
            if (res?.success) {
                message.success(res.message || 'Thêm nhanh cảnh báo thành công');
                resetQuickRow();
                loadData(1);
            } else {
                message.error(res?.message || 'Không thể thêm nhanh cảnh báo');
            }
        } catch (error) {
            console.error('Quick insert cảnh báo failed:', error);
            message.error('Lỗi khi thêm nhanh cảnh báo');
        } finally {
            setLoading(false);
        }
    };

    const updateQuickRow = (field, value) => {
        setQuickRowData((prev) => ({ ...prev, [field]: value }));
    };

    const lookupKeyByField = {
        lv002: 'projects',
        lv003: 'tasks',
        lv004: 'modules',
        lv005: 'references',
        lv016: 'employees',
        lv017: 'cycles',
    };

    const getLookupOptions = (field) => {
        const key = lookupKeyByField[field];
        if (field === 'lv017') return lookupArray(lookups, 'cycles').length ? lookupArray(lookups, 'cycles') : cycleOptions;
        return lookupArray(lookups, key);
    };

    const handleLookupSearch = async (field, search = '', sourceValues = quickRowData) => {
        const key = lookupKeyByField[field];
        if (!key || field === 'lv017') return;
        const data = await loadLookupOptions(field, {
            search,
            lv002: sourceValues?.lv002 || '',
            lv004: sourceValues?.lv004 || '',
        });
        setLookups((prev) => ({ ...prev, [key]: data }));
    };

    const handleLookupChange = (field, value, target = 'quick') => {
        if (target === 'form') {
            const nextValues = { [field]: value };
            if (field === 'lv002') nextValues.lv003 = '';
            if (field === 'lv004') nextValues.lv005 = '';
            form.setFieldsValue(nextValues);
            if (field === 'lv002') handleLookupSearch('lv003', '', { ...form.getFieldsValue(), lv002: value });
            if (field === 'lv004') handleLookupSearch('lv005', '', { ...form.getFieldsValue(), lv004: value });
            return;
        }

        setQuickRowData((prev) => {
            const next = { ...prev, [field]: value };
            if (field === 'lv002') next.lv003 = '';
            if (field === 'lv004') next.lv005 = '';
            return next;
        });
        if (field === 'lv002') handleLookupSearch('lv003', '', { ...quickRowData, lv002: value });
        if (field === 'lv004') handleLookupSearch('lv005', '', { ...quickRowData, lv004: value });
    };

    const handleQuickEnter = (event) => {
        if (event.key === 'Enter') handleQuickSubmit();
    };

    const renderQuickInput = (field, placeholder) => (
        <Input
            size="small"
            placeholder={placeholder}
            value={quickRowData[field]}
            onChange={(event) => updateQuickRow(field, event.target.value)}
            onKeyDown={handleQuickEnter}
        />
    );

    const renderQuickDate = (field) => (
        <DatePicker
            size="small"
            format="DD/MM/YYYY"
            value={quickRowData[field]}
            onChange={(value) => updateQuickRow(field, value)}
            style={{ width: '100%' }}
        />
    );

    const renderQuickNumber = (field, placeholder) => (
        <InputNumber
            size="small"
            placeholder={placeholder}
            value={quickRowData[field]}
            onChange={(value) => updateQuickRow(field, value)}
            onKeyDown={handleQuickEnter}
            style={{ width: '100%' }}
        />
    );

    const renderLookupSelect = (field, value, onChange, placeholder, sourceValues = quickRowData, mode) => (
        <Select
            size="small"
            placeholder={placeholder}
            value={value}
            options={getLookupOptions(field)}
            onChange={onChange}
            onSearch={(search) => handleLookupSearch(field, search, sourceValues)}
            style={{ width: '100%' }}
            showSearch
            allowClear
            mode={mode}
            filterOption={false}
        />
    );

    const renderFormLookupSelect = (field, placeholder, mode) => (
        <Select
            placeholder={placeholder}
            options={getLookupOptions(field)}
            onChange={(value) => handleLookupChange(field, value, 'form')}
            onSearch={(search) => handleLookupSearch(field, search, form.getFieldsValue())}
            showSearch
            allowClear
            mode={mode}
            filterOption={false}
            style={{ width: '100%' }}
        />
    );

    const columns = [
        ...baseColumns.map((column) => ({
            ...column,
            render: (value, record) => {
                if (!record.isQuickRow) {
                    if (column.dataIndex === 'lv010') {
                        return <Switch checked={String(value) === '1'} checkedChildren="Dừng" unCheckedChildren="Chạy" onChange={(checked) => updateStop(record, checked)} />;
                    }
                    return column.render ? column.render(value, record, column.dataIndex) : value;
                }

                switch (column.dataIndex) {
                    case 'lv001':
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
                    case 'lv017':
                        return renderLookupSelect('lv017', quickRowData.lv017, (value) => handleLookupChange('lv017', value), 'Chu kỳ');
                    case 'lv008':
                        return renderQuickNumber('lv008', 'Số ngày');
                    case 'lv006':
                        return renderQuickDate('lv006');
                    case 'lv007':
                        return renderQuickDate('lv007');
                    case 'lv002':
                        return renderLookupSelect('lv002', quickRowData.lv002, (value) => handleLookupChange('lv002', value), column.title);
                    case 'lv003':
                        return renderLookupSelect('lv003', quickRowData.lv003, (value) => handleLookupChange('lv003', value), column.title);
                    case 'lv004':
                        return renderLookupSelect('lv004', quickRowData.lv004, (value) => handleLookupChange('lv004', value), column.title);
                    case 'lv005':
                        return renderLookupSelect('lv005', quickRowData.lv005, (value) => handleLookupChange('lv005', value), column.title);
                    case 'lv016':
                        return renderLookupSelect(
                            'lv016',
                            quickRowData.lv016 ? String(quickRowData.lv016).split(',').filter(Boolean) : [],
                            (value) => handleLookupChange('lv016', Array.isArray(value) ? value.join(',') : value),
                            column.title,
                            quickRowData,
                            'multiple'
                        );
                    case 'lv009':
                        return renderQuickInput(column.dataIndex, column.title);
                    default:
                        return <span style={{ color: '#8c8c8c', fontSize: 12 }}>Tự động</span>;
                }
            },
        })),
        {
            title: 'Thao tác',
            key: 'actions',
            width: 90,
            fixed: 'right',
            render: (_, record) => (
                record.isQuickRow ? (
                    <Tooltip title="Thêm nhanh">
                        <Button type="primary" size="small" icon={<Plus size={14} />} onClick={handleQuickSubmit} />
                    </Tooltip>
                ) : (
                    <Tooltip title="Chỉnh sửa">
                        <Button type="text" icon={<Edit size={16} />} onClick={() => openEdit(record)} />
                    </Tooltip>
                )
            ),
        },
    ];

    const {
        displayColumns,
        hiddenKeys,
        toggleableColumns,
        columnOrder,
        columnOrderValues,
        sortOrder,
        sortFieldOrder,
        sortFieldOptions,
        applyColumnSettings,
    } = useSavedTablePreferences({
        tableName: 'cr_lv0046',
        allColumns: columns,
        requiredKeys: ['lv001', 'lv017', 'lv016', 'lv002', 'lv003', 'lv004', 'lv005', 'lv008', 'lv006', 'lv007', 'lv009', 'lv010', 'lv011', 'lv012', 'lv013', 'lv014', 'actions'],
        defaultFieldList: 'lv001,lv017,lv016,lv002,lv003,lv004,lv005,lv006,lv007,lv008,lv018,lv019,lv009,lv010,lv011,lv012,lv013,lv014,lv015,actions',
        currentPage: pagination.current,
        pageSize: pagination.pageSize,
    });

    const displayRows = useMemo(() => sortRowsByPreference(rows, sortOrder, sortFieldOrder), [rows, sortOrder, sortFieldOrder]);

    return (
        <PageShell
            title="Cảnh báo"
            icon={<Bell size={28} />}
            searchValue={searchText}
            onSearchChange={setSearchText}
            actions={
                <>
                    <Dropdown menu={{ items: [
                        { key: 'xu-ly', label: 'Xử lý cảnh báo', icon: <Eye size={14} />, onClick: () => addTab('/xu-ly-canh-bao') },
                        { key: 'bao-cao', label: 'Báo cáo cảnh báo hàng ngày', icon: <FileText size={14} />, onClick: () => addTab('/bao-cao-canh-bao-hang-ngay') },
                        { key: 'lich', label: 'Lịch cảnh báo theo tháng', icon: <CalendarDays size={14} />, onClick: () => addTab('/lich-canh-bao-theo-thang') },
                    ] }} trigger={['click']} placement="bottomRight">
                        <Button icon={<SettingOutlined />} title="Danh mục cảnh báo" />
                    </Dropdown>
                    <ColumnSelector
                        allColumns={columns}
                        toggleableColumns={toggleableColumns}
                        hiddenKeys={hiddenKeys}
                        showSort
                        sortOrder={sortOrder}
                        sortFieldOrder={sortFieldOrder}
                        sortFieldOptions={sortFieldOptions}
                        columnOrder={columnOrder}
                        columnOrderValues={columnOrderValues}
                        showColumnOrder
                        applySettings={async (...args) => {
                            try {
                                await applyColumnSettings(...args);
                                message.success('Da cap nhat cau hinh hien thi');
                            } catch (error) {
                                console.error('Error saving column preferences:', error);
                                message.error(error.message || 'Khong the luu cau hinh hien thi');
                            }
                        }}
                    />
                    <Button icon={<ReloadOutlined />} onClick={() => loadData(1)} loading={loading}>Làm mới</Button>
                    <Button type="primary" icon={<Plus size={18} />} onClick={openAdd}>Thêm mới</Button>
                </>
            }
        >
            <Tabs activeKey={activeCycle} onChange={setActiveCycle} items={cycleTabs.map((tab) => ({ ...tab, label: `${tab.label}${summary?.[tab.summaryKey] ? ` (${summary[tab.summaryKey]})` : ''}` }))} />
            <div className={styles.batchActionBar}>
                <span style={{ fontWeight: 600, color: '#197dd3', marginRight: 8 }}>Thao tác hàng loạt:</span>
                <Button icon={<Edit size={16} />} disabled={selectedRowKeys.length !== 1} onClick={() => openEdit(rows.find((item) => item.key === selectedRowKeys[0]))} type="primary" ghost>Chỉnh sửa</Button>
                <Popconfirm title="Xóa cảnh báo" description={`Xóa ${selectedRowKeys.length} dòng đã chọn?`} onConfirm={deleteRows} disabled={selectedRowKeys.length === 0}>
                    <Button danger icon={<Trash2 size={16} />} disabled={selectedRowKeys.length === 0}>Xóa đã chọn</Button>
                </Popconfirm>
                <span style={{ marginLeft: 'auto', color: '#8c8c8c' }}>Đã chọn <b>{selectedRowKeys.length}</b> dòng</span>
            </div>
            <Card className={styles.mainCard}>
                <Table
                    rowSelection={{
                        selectedRowKeys,
                        onChange: setSelectedRowKeys,
                        getCheckboxProps: (record) => ({ disabled: record.isQuickRow }),
                    }}
                    columns={displayColumns}
                    dataSource={[{ key: 'quick-insert-row', isQuickRow: true }, ...displayRows]}
                    loading={loading}
                    scroll={{ x: 1900 }}
                    pagination={{
                        ...pagination,
                        showTotal: (total) => `Tổng số: ${total} bản ghi`,
                        onChange: (page, pageSize) => loadData(page, pageSize),
                    }}
                />
            </Card>
            <Drawer
                title={<Space><Bell size={20} color="#197dd3" /><span>{editingRecord ? 'Cập nhật cảnh báo' : 'Thêm mới cảnh báo'}</span></Space>}
                placement="right"
                width={920}
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                className={styles.khoDrawer}
                footer={<Space style={{ display: 'flex', justifyContent: 'flex-end' }}><Button onClick={() => setDrawerOpen(false)}>Hủy</Button><Button type="primary" onClick={() => form.submit()}>Lưu</Button></Space>}
            >
                <Form form={form} layout="vertical" onFinish={saveRecord} className={styles.customForm}>
                    <Divider className={styles.dividerSolid} orientation="left">Thông tin cảnh báo</Divider>
                    <Row gutter={16}>
                        <Col span={8}><Form.Item name="lv002" label="Tên dự án/kế hoạch">{renderFormLookupSelect('lv002', 'Chọn kế hoạch')}</Form.Item></Col>
                        <Col span={8}><Form.Item name="lv003" label="Tên/mã công việc">{renderFormLookupSelect('lv003', 'Chọn công việc')}</Form.Item></Col>
                        <Col span={8}><Form.Item name="lv004" label="Mã module">{renderFormLookupSelect('lv004', 'Chọn mã module')}</Form.Item></Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={8}><Form.Item name="lv005" label="Mã tham chiếu">{renderFormLookupSelect('lv005', 'Chọn mã tham chiếu')}</Form.Item></Col>
                        <Col span={8}><Form.Item name="lv017" label="Chu kỳ">{renderFormLookupSelect('lv017', 'Chọn chu kỳ')}</Form.Item></Col>
                        <Col span={8}><Form.Item name="lv008" label="Số ngày cảnh báo"><InputNumber style={{ width: '100%' }} /></Form.Item></Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={8}><Form.Item name="lv006" label="Ngày cảnh báo"><DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" /></Form.Item></Col>
                        <Col span={8}><Form.Item name="lv007" label="Ngày hết hạn"><DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" /></Form.Item></Col>
                        <Col span={8}><Form.Item name="lv016" label="Người tiếp nhận">{renderFormLookupSelect('lv016', 'Chọn người tiếp nhận', 'multiple')}</Form.Item></Col>
                    </Row>
                    <Form.Item name="lv009" label="Nội dung cảnh báo"><TextArea rows={5} /></Form.Item>
                </Form>
            </Drawer>
        </PageShell>
    );
};

export const XuLyCanhBao = () => {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [activeCycle, setActiveCycle] = useState('0');
    const [searchText, setSearchText] = useState('');
    const [selectedRowKeys, setSelectedRowKeys] = useState([]);
    const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
    const [hideHandled, setHideHandled] = useState('0');
    const [preview, setPreview] = useState(null);

    const loadData = useCallback(async (page = pagination.current, pageSize = pagination.pageSize) => {
        setLoading(true);
        try {
            const res = await lv_LoadDataAPI('cr_lv0048', 'loadXuLyCanhBao', {
                lv017: activeCycle,
                lv009: searchText,
                lv089: hideHandled,
                page,
                pageSize,
            });
            const data = asArray(res).map((item) => ({ ...item, key: item.lv001 }));
            setRows(data);
            setPagination({ current: res?.pagination?.page || page, pageSize: res?.pagination?.pageSize || pageSize, total: res?.pagination?.total || data.length });
        } catch (error) {
            console.error('Load xử lý cảnh báo failed:', error);
            message.error('Không thể tải danh sách xử lý cảnh báo');
        } finally {
            setLoading(false);
        }
    }, [activeCycle, hideHandled, pagination.current, pagination.pageSize, searchText]);

    useEffect(() => { loadData(1); }, [activeCycle, hideHandled, searchText]);

    const previewEmail = async () => {
        const res = await lv_LoadDataAPI('cr_lv0048', 'previewEmail', { ids: selectedRowKeys });
        setPreview(res);
    };

    const sendEmail = async () => {
        const res = await lv_LoadDataAPI('cr_lv0048', 'sendEmail', { ids: selectedRowKeys });
        if (res?.success) {
            message.success(res.message || 'Đã xử lý email cảnh báo');
            setPreview(null);
            loadData();
        } else {
            message.error(res?.message || 'Không thể xử lý email');
        }
    };

    const columns = [
        { title: 'Ẩn', dataIndex: 'lv089', width: 80, fixed: 'left', render: (value, record) => <Switch checked={String(value) === '1'} onChange={(checked) => lv_LoadDataAPI('cr_lv0048', 'updateInline', { lv001: record.lv001, field: 'lv089', value: checked ? '1' : '0' }).then((res) => { if (res?.success) loadData(); else message.error(res?.message || 'Không thể cập nhật'); })} /> },
        { title: 'Còn lại', dataIndex: 'lv990', width: 100, render: (value) => <Tag color={Number(value) <= 0 ? 'red' : Number(value) <= 3 ? 'orange' : 'blue'}>{value === '0' || value === 0 ? 'Hôm nay' : `${value} ngày`}</Tag> },
        ...baseColumns,
    ];

    const {
        displayColumns: processDisplayColumns,
        hiddenKeys: processHiddenKeys,
        toggleableColumns: processToggleableColumns,
        columnOrder: processColumnOrder,
        columnOrderValues: processColumnOrderValues,
        sortOrder: processSortOrder,
        sortFieldOrder: processSortFieldOrder,
        sortFieldOptions: processSortFieldOptions,
        applyColumnSettings: applyProcessColumnSettings,
    } = useSavedTablePreferences({
        tableName: 'cr_lv0048',
        allColumns: columns,
        requiredKeys: ['lv089', 'lv990', 'lv003', 'lv005', 'lv006', 'lv007', 'lv009', 'lv010'],
        defaultFieldList: 'lv089,lv990,lv001,lv017,lv016,lv002,lv003,lv004,lv005,lv006,lv007,lv008,lv018,lv019,lv009,lv010,lv011,lv012,lv013,lv014,lv015',
        currentPage: pagination.current,
        pageSize: pagination.pageSize,
    });

    const processDisplayRows = useMemo(() => sortRowsByPreference(rows, processSortOrder, processSortFieldOrder), [rows, processSortOrder, processSortFieldOrder]);

    return (
        <PageShell
            title="Xử lý cảnh báo"
            icon={<Eye size={28} />}
            searchValue={searchText}
            onSearchChange={setSearchText}
            actions={<><Select dropdownMatchSelectWidth={false} value={hideHandled} onChange={setHideHandled} style={{ width: 150 }} options={[{ value: '', label: 'Tất cả' }, { value: '0', label: 'Đang hiện' }, { value: '1', label: 'Đã ẩn' }]} /><Button icon={<ReloadOutlined />} onClick={() => loadData(1)} loading={loading}>Làm mới</Button><ColumnSelector allColumns={columns} toggleableColumns={processToggleableColumns} hiddenKeys={processHiddenKeys} showSort sortOrder={processSortOrder} sortFieldOrder={processSortFieldOrder} sortFieldOptions={processSortFieldOptions} columnOrder={processColumnOrder} columnOrderValues={processColumnOrderValues} showColumnOrder applySettings={async (...args) => { try { await applyProcessColumnSettings(...args); message.success('Da cap nhat cau hinh hien thi'); } catch (error) { console.error('Error saving column preferences:', error); message.error(error.message || 'Khong the luu cau hinh hien thi'); } }} /><Button icon={<Mail size={16} />} disabled={selectedRowKeys.length === 0} onClick={previewEmail}>Gửi mail</Button></>}
        >
            <Tabs activeKey={activeCycle} onChange={setActiveCycle} items={cycleTabs.map(({ key, label }) => ({ key, label }))} />
            <div className={styles.batchActionBar}>
                <span style={{ fontWeight: 600, color: '#197dd3', marginRight: 8 }}>Thao tác hàng loạt:</span>
                <Button icon={<Mail size={16} />} disabled={selectedRowKeys.length === 0} onClick={previewEmail}>Soạn email</Button>
                <span style={{ marginLeft: 'auto', color: '#8c8c8c' }}>Đã chọn <b>{selectedRowKeys.length}</b> dòng</span>
            </div>
            <Card className={styles.mainCard}>
                <Table rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }} columns={processDisplayColumns} dataSource={processDisplayRows} loading={loading} scroll={{ x: 2300 }} pagination={{ ...pagination, showTotal: (total) => `Tổng số: ${total} bản ghi`, onChange: loadData }} />
            </Card>
            <Modal title="Nội dung email cảnh báo" open={!!preview} onCancel={() => setPreview(null)} width={760} footer={<Space><Button onClick={() => setPreview(null)}>Đóng</Button><Button type="primary" onClick={sendEmail}>Xác nhận xử lý</Button></Space>}>
                <h4>{preview?.subject}</h4>
                <div style={{ border: '1px solid #f0f0f0', padding: 12, minHeight: 160 }} dangerouslySetInnerHTML={{ __html: preview?.html || '' }} />
            </Modal>
        </PageShell>
    );
};

export const BaoCaoCanhBaoHangNgay = () => {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [dates, setDates] = useState([dayjs(), dayjs()]);
    const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
    const [employeeId, setEmployeeId] = useState('');
    const [depId, setDepId] = useState('');
    const [employeeOptions, setEmployeeOptions] = useState([]);
    const [departmentOptions, setDepartmentOptions] = useState([]);

    useEffect(() => {
        Promise.all([
            lv_LoadDataAPI('cr_lv0046', 'loadLookupOptions', { field: 'employees', limit: 500 }),
            lv_LoadDataAPI('cr_lv0212', 'loadDepartments'),
        ]).then(([employees, departments]) => {
            setEmployeeOptions(asArray(employees));
            setDepartmentOptions(asArray(departments));
        }).catch((error) => console.error('Load bộ lọc báo cáo cảnh báo failed:', error));
    }, []);

    const loadData = useCallback(async (page = pagination.current, pageSize = pagination.pageSize) => {
        setLoading(true);
        try {
            const res = await lv_LoadDataAPI('cr_lv0212', 'loadBaoCaoCanhBaoNgay', {
                dateFrom: formatDateForApi(dates?.[0]),
                dateTo: formatDateForApi(dates?.[1]),
                lv009: searchText,
                employeeId,
                depId,
                page,
                pageSize,
            });
            const data = asArray(res).map((item) => ({ ...item, key: item.lv001 }));
            setRows(data);
            setPagination({ current: res?.pagination?.page || page, pageSize: res?.pagination?.pageSize || pageSize, total: res?.pagination?.total || data.length });
        } catch (error) {
            console.error('Load báo cáo cảnh báo failed:', error);
            message.error('Không thể tải báo cáo cảnh báo');
        } finally {
            setLoading(false);
        }
    }, [dates, depId, employeeId, pagination.current, pagination.pageSize, searchText]);

    useEffect(() => { loadData(1); }, [dates, depId, employeeId, searchText]);

    const {
        displayColumns: dailyDisplayColumns,
        hiddenKeys: dailyHiddenKeys,
        toggleableColumns: dailyToggleableColumns,
        columnOrder: dailyColumnOrder,
        columnOrderValues: dailyColumnOrderValues,
        sortOrder: dailySortOrder,
        sortFieldOrder: dailySortFieldOrder,
        sortFieldOptions: dailySortFieldOptions,
        applyColumnSettings: applyDailyColumnSettings,
    } = useSavedTablePreferences({
        tableName: 'cr_lv0212',
        allColumns: baseColumns,
        requiredKeys: ['lv001', 'lv003', 'lv005', 'lv006', 'lv007', 'lv009'],
        defaultFieldList: 'lv001,lv017,lv016,lv002,lv003,lv004,lv005,lv006,lv007,lv008,lv018,lv019,lv009,lv010,lv011,lv012,lv013,lv014,lv015',
        currentPage: pagination.current,
        pageSize: pagination.pageSize,
    });

    const dailyDisplayRows = useMemo(() => sortRowsByPreference(rows, dailySortOrder, dailySortFieldOrder), [rows, dailySortOrder, dailySortFieldOrder]);

    return (
        <PageShell title="Báo cáo cảnh báo hàng ngày" icon={<FileText size={28} />} searchValue={searchText} onSearchChange={setSearchText} actions={<><DatePicker.RangePicker value={dates} format="DD/MM/YYYY" onChange={(value) => setDates(value || [])} /><Select dropdownMatchSelectWidth={false} allowClear placeholder="Phòng ban" value={depId || undefined} onChange={(value) => setDepId(value || '')} options={departmentOptions} style={{ width: 190 }} /><Select dropdownMatchSelectWidth={false} allowClear showSearch optionFilterProp="label" placeholder="Người tạo" value={employeeId || undefined} onChange={(value) => setEmployeeId(value || '')} options={employeeOptions} style={{ width: 220 }} /><Button icon={<ReloadOutlined />} loading={loading} onClick={() => loadData(1)}>Làm mới</Button><ColumnSelector allColumns={baseColumns} toggleableColumns={dailyToggleableColumns} hiddenKeys={dailyHiddenKeys} showSort sortOrder={dailySortOrder} sortFieldOrder={dailySortFieldOrder} sortFieldOptions={dailySortFieldOptions} columnOrder={dailyColumnOrder} columnOrderValues={dailyColumnOrderValues} showColumnOrder applySettings={async (...args) => { try { await applyDailyColumnSettings(...args); message.success('Da cap nhat cau hinh hien thi'); } catch (error) { console.error('Error saving column preferences:', error); message.error(error.message || 'Khong the luu cau hinh hien thi'); } }} /></>}>
            <Card className={styles.mainCard}>
                <Table columns={dailyDisplayColumns} dataSource={dailyDisplayRows} loading={loading} scroll={{ x: 1900 }} pagination={{ ...pagination, showTotal: (total) => `Tổng số: ${total} bản ghi`, onChange: loadData }} />
            </Card>
        </PageShell>
    );
};

export const LichCanhBaoTheoThang = () => {
    const [loading, setLoading] = useState(false);
    const [dates, setDates] = useState([dayjs().subtract(5, 'day'), dayjs().add(5, 'day')]);
    const [employees, setEmployees] = useState([]);
    const [days, setDays] = useState([]);
    const [items, setItems] = useState([]);
    const [detail, setDetail] = useState(null);
    const [employeeId, setEmployeeId] = useState('');
    const [depId, setDepId] = useState('');
    const [employeeOptions, setEmployeeOptions] = useState([]);
    const [departmentOptions, setDepartmentOptions] = useState([]);

    useEffect(() => {
        Promise.all([
            lv_LoadDataAPI('cr_lv0046', 'loadLookupOptions', { field: 'employees', limit: 500 }),
            lv_LoadDataAPI('cr_lv0416', 'loadDepartments'),
        ]).then(([employeeResult, departmentResult]) => {
            setEmployeeOptions(asArray(employeeResult));
            setDepartmentOptions(asArray(departmentResult));
        }).catch((error) => console.error('Load bộ lọc lịch cảnh báo failed:', error));
    }, []);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await lv_LoadDataAPI('cr_lv0416', 'loadLichCanhBaoThang', {
                dateFrom: formatDateForApi(dates?.[0]),
                dateTo: formatDateForApi(dates?.[1]),
                employeeId,
                depId,
            });
            setEmployees(Array.isArray(res?.employees) ? res.employees : []);
            setDays(Array.isArray(res?.days) ? res.days : []);
            setItems(Array.isArray(res?.items) ? res.items : []);
        } catch (error) {
            console.error('Load lịch cảnh báo failed:', error);
            message.error('Không thể tải lịch cảnh báo');
        } finally {
            setLoading(false);
        }
    }, [dates, depId, employeeId]);

    useEffect(() => { loadData(); }, [dates, depId, employeeId]);

    const grouped = useMemo(() => {
        const map = {};
        items.forEach((item) => {
            const emp = item.CodeID || item.lv013;
            const date = item.date || item.lv006?.slice(0, 10);
            const key = `${emp}__${date}`;
            if (!map[key]) map[key] = [];
            map[key].push(item);
        });
        return map;
    }, [items]);

    const columns = [
        { title: 'Mã NV', dataIndex: 'lv001', width: 110, fixed: 'left' },
        { title: 'Nhân viên', dataIndex: 'lv002', width: 180, fixed: 'left' },
        ...days.map((day) => ({
            title: <span style={{ color: day.isToday ? '#197dd3' : day.dow === 1 ? '#d4380d' : undefined }}>{day.day}/{day.month}</span>,
            dataIndex: day.date,
            width: 130,
            render: (_, record) => {
                const cellItems = grouped[`${record.lv001}__${day.date}`] || [];
                return (
                    <div style={{ minHeight: 44 }}>
                        {cellItems.map((item) => (
                            <Tag key={item.lv001} color="orange" style={{ marginBottom: 4, cursor: 'pointer', whiteSpace: 'normal' }} onClick={() => setDetail(item)}>
                                {item.lv005 || item.lv004}
                            </Tag>
                        ))}
                    </div>
                );
            },
        })),
    ];

    return (
        <PageShell title="Lịch cảnh báo theo tháng" icon={<CalendarDays size={28} />} actions={<><DatePicker.RangePicker value={dates} format="DD/MM/YYYY" onChange={(value) => setDates(value || [])} /><Select dropdownMatchSelectWidth={false} allowClear placeholder="Phòng ban" value={depId || undefined} onChange={(value) => setDepId(value || '')} options={departmentOptions} style={{ width: 190 }} /><Select dropdownMatchSelectWidth={false} allowClear showSearch optionFilterProp="label" placeholder="Người tạo" value={employeeId || undefined} onChange={(value) => setEmployeeId(value || '')} options={employeeOptions} style={{ width: 220 }} /><Button icon={<ReloadOutlined />} loading={loading} onClick={loadData}>Làm mới</Button></>}>
            <Card className={styles.mainCard}>
                <Table columns={columns} dataSource={employees.map((item) => ({ ...item, key: item.lv001 }))} loading={loading} scroll={{ x: Math.max(900, 290 + days.length * 130) }} pagination={false} bordered />
            </Card>
            <Drawer title="Chi tiết cảnh báo" open={!!detail} width={620} onClose={() => setDetail(null)}>
                {detail && (
                    <Space direction="vertical" size={12} style={{ width: '100%' }}>
                        <Tag color="blue">{detail.lv004}</Tag>
                        <p><b>Mã cảnh báo:</b> {detail.lv001}</p>
                        <p><b>Mã tham chiếu:</b> {detail.lv005}</p>
                        <p><b>Dự án:</b> {detail.TenDuAn || detail.lv002}</p>
                        <p><b>Ngày cảnh báo:</b> {detail.lv006_text || detail.lv006}</p>
                        <p><b>Ngày hết hạn:</b> {detail.lv007_text || detail.lv007}</p>
                        <p><b>Nội dung:</b></p>
                        <div style={{ border: '1px solid #f0f0f0', padding: 12 }}>{detail.lv009}</div>
                    </Space>
                )}
            </Drawer>
        </PageShell>
    );
};

export default CanhBao;
