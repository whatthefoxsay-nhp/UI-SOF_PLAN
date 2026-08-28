import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Button, Drawer, Empty, Form, Input,
    Modal, Select, Space, Table, Tag, Tooltip, Typography, message,
    DatePicker, InputNumber, Row, Col, Divider
} from 'antd';
import dayjs from 'dayjs';
import { Edit, Lock, Plus, RefreshCw, Save, Search, Trash2, Unlock, X } from 'lucide-react';
import { execCRUD } from '../../../services/apiServices';
import styles from '../QuanLyKeHoach.module.css';

const { Text } = Typography;

// ── CONSTANTS ──────────────────────────────────────────────────────────────
const CHILD_KEY  = 'alerts';
const TAB_LABEL  = 'Cảnh báo';
const TAB_MODULE = 'cr_lv0047/cr_lv0047.php';

const cycleOptions = [
    { value: '0', label: 'Theo ngày' },
    { value: '1', label: 'Theo tuần' },
    { value: '2', label: 'Theo tháng' },
    { value: '3', label: 'Theo năm' },
];

const lookupKeyByField = {
    lv002: 'projects',
    lv003: 'tasks',
    lv004: 'modules',
    lv005: 'references',
    lv013: 'employees',
    lv016: 'employees',
    lv017: 'cycles',
};

// ── MAIN COMPONENT ──────────────────────────────────────────────────────────
const CanhBaoTab = ({ detailData, onRefresh }) => {
    const planId = detailData?.plan?.lv001;

    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [selectedRowKeys, setSelectedRowKeys] = useState([]);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);
    const [form] = Form.useForm();

    const [lookups, setLookups] = useState({
        cycles: cycleOptions,
        projects: [],
        tasks: [],
        modules: [],
        references: [],
        employees: []
    });

    const [quickRowData, setQuickRowData] = useState({
        lv002: planId || '',
        lv003: '',
        lv004: 'ALARM',
        lv005: '',
        lv017: '0',
        lv008: 0,
        lv006: dayjs(),
        lv007: null,
        lv013: '',
        lv016: '',
        lv009: '',
    });

    // Reset quickRowData when planId changes
    useEffect(() => {
        setQuickRowData((prev) => ({
            ...prev,
            lv002: planId || '',
            lv003: '',
            lv004: 'ALARM',
            lv005: '',
            lv017: '0',
            lv008: 0,
            lv006: dayjs(),
            lv007: null,
            lv013: '',
            lv016: '',
            lv009: '',
        }));
    }, [planId]);

    // Load initial lookups
    const loadLookups = useCallback(async () => {
        try {
            const res = await execCRUD('cr_lv0046', 'loadLookups');
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

    const loadLookupOptions = useCallback(async (field, extra = {}) => {
        const res = await execCRUD('cr_lv0046', 'loadLookupOptions', { field, limit: 100, ...extra });
        return Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
    }, []);

    useEffect(() => {
        loadLookups();
    }, [loadLookups]);

    // Load tasks for the current planId
    useEffect(() => {
        if (planId) {
            loadLookupOptions('lv003', { lv002: planId }).then((data) => {
                setLookups((prev) => ({ ...prev, tasks: data }));
            });
        }
    }, [planId, loadLookupOptions]);

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

    const updateQuickRow = (field, value) => {
        setQuickRowData((prev) => ({ ...prev, [field]: value }));
    };

    const resetQuickRow = () => {
        setQuickRowData({
            lv002: planId || '',
            lv003: '',
            lv004: 'ALARM',
            lv005: '',
            lv017: '0',
            lv008: 0,
            lv006: dayjs(),
            lv007: null,
            lv013: '',
            lv016: '',
            lv009: '',
        });
    };

    const formatDateForApi = (value) => (value ? dayjs(value).format('DD/MM/YYYY') : '');

    useEffect(() => {
        const raw = detailData?.tabs?.[CHILD_KEY] ?? detailData?.[CHILD_KEY] ?? [];
        setRows(Array.isArray(raw) ? raw.map((r, i) => ({ ...r, key: r.lv001 ?? i })) : []);
    }, [detailData]);

    const filteredRows = useMemo(() => {
        const kw = searchText.trim().toLowerCase();
        if (!kw) return rows;
        return rows.filter((r) => Object.values(r || {}).some((v) => String(v ?? '').toLowerCase().includes(kw)));
    }, [rows, searchText]);

    const callAction = async (func, childId, data = {}) => {
        if (!planId) { message.warning('Thiếu mã kế hoạch'); return false; }
        setLoading(true);
        try {
            const payload = { lv001: planId, planId, childKey: CHILD_KEY, childId: childId ?? '', data };
            console.debug(`[CanhBaoTab] ${func}`, payload);
            const res = await execCRUD('cr_lv0094_detail', func, payload);
            if (res?.success === false) { message.error(res.message || 'Thao tác thất bại'); return false; }
            message.success(res?.message || 'Thao tác thành công');
            setSelectedRowKeys([]);
            if (onRefresh) await onRefresh();
            return true;
        } catch (e) {
            console.error(`[CanhBaoTab] ${func}`, e);
            message.error('Lỗi kết nối: ' + e.message);
            return false;
        } finally { setLoading(false); }
    };

    const handleQuickSubmit = async () => {
        if (!quickRowData.lv002 || !quickRowData.lv004 || !quickRowData.lv009) {
            message.warning('Vui lòng chọn kế hoạch, mã module và nhập nội dung cảnh báo để thêm nhanh.');
            return;
        }

        try {
            setLoading(true);
            const payload = {
                ...quickRowData,
                lv006: formatDateForApi(quickRowData.lv006),
                lv007: formatDateForApi(quickRowData.lv007),
                lv016: Array.isArray(quickRowData.lv016) ? quickRowData.lv016.join(',') : quickRowData.lv016,
            };
            const ok = await callAction('childInsert', '', payload);
            if (ok) {
                resetQuickRow();
            }
        } catch (error) {
            console.error('Quick insert cảnh báo failed:', error);
            message.error('Lỗi khi thêm nhanh cảnh báo');
        } finally {
            setLoading(false);
        }
    };

    const handleQuickEnter = (event) => {
        if (event.key === 'Enter') handleQuickSubmit();
    };

    const openCreate = () => {
        setEditingRecord(null);
        form.resetFields();
        form.setFieldsValue({
            lv002: planId || '',
            lv004: 'ALARM',
            lv006: dayjs(),
            lv007: null,
            lv008: 0,
            lv017: '0',
            lv013: '',
            lv016: [],
            lv009: '',
        });
        if (planId) {
            handleLookupSearch('lv003', '', { lv002: planId });
        }
        setDrawerOpen(true);
    };

    const openEdit = (record) => {
        setEditingRecord(record);
        form.resetFields();
        form.setFieldsValue({
            ...record,
            lv006: record.lv006 ? dayjs(record.lv006) : null,
            lv007: record.lv007 && record.lv007 !== '0000-00-00' ? dayjs(record.lv007) : null,
            lv016: record.lv016 ? String(record.lv016).split(',').filter(Boolean) : [],
        });
        if (record.lv002) handleLookupSearch('lv003', '', record);
        if (record.lv004) handleLookupSearch('lv005', '', record);
        setDrawerOpen(true);
    };

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            const payload = {
                ...values,
                lv002: values.lv002 || planId,
                lv006: formatDateForApi(values.lv006),
                lv007: formatDateForApi(values.lv007),
                lv016: Array.isArray(values.lv016) ? values.lv016.join(',') : values.lv016,
            };
            if (editingRecord?.lv001) payload.lv001 = editingRecord.lv001;
            const ok = await callAction(editingRecord ? 'childUpdate' : 'childInsert', editingRecord?.lv001 ?? '', payload);
            if (ok) setDrawerOpen(false);
        } catch { /* validation */ }
    };

    const handleBatchAction = async (func, label) => {
        if (!selectedRowKeys.length) { message.warning('Chọn ít nhất một dòng'); return; }
        Modal.confirm({
            title: label, content: `Thực hiện "${label}" cho ${selectedRowKeys.length} dòng?`,
            okText: 'Xác nhận', cancelText: 'Hủy',
            onOk: async () => {
                let ok = 0;
                for (const id of selectedRowKeys) {
                    if (await callAction(func, id)) ok++;
                }
                if (ok) message.success(`Đã xử lý ${ok} dòng`);
            },
        });
    };

    // Helper functions for rendering quick inputs
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

    const lookupArray = (lookups, key) => (Array.isArray(lookups?.[key]) ? lookups[key] : []);

    const getLookupOptions = (field) => {
        const key = lookupKeyByField[field];
        if (field === 'lv017') return lookupArray(lookups, 'cycles').length ? lookupArray(lookups, 'cycles') : cycleOptions;
        return lookupArray(lookups, key);
    };

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

    const renderDate = (value, record, field) => {
        if (!value || value === '0000-00-00' || value === '1900-01-01') return '—';
        return record?.[`${field}_text`] || (dayjs(value).isValid() ? dayjs(value).format('DD/MM/YYYY') : value);
    };

    // ── COLUMNS ────────────────────────────────────────────────────────────
    const columns = [
        {
            title: 'STT',
            key: 'stt',
            width: 60,
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
                return idx;
            }
        },
        {
            title: 'Mã module',
            dataIndex: 'lv004',
            key: 'lv004',
            width: 180,
            render: (value, record) => {
                if (record.isQuickRow) {
                    return renderLookupSelect('lv004', quickRowData.lv004, (val) => handleLookupChange('lv004', val), 'Mã module');
                }
                return record.lv004_label || record.ten_loai_canh_bao || value || '—';
            }
        },
        {
            title: 'Mã tham chiếu',
            dataIndex: 'lv005',
            key: 'lv005',
            width: 150,
            render: (value, record) => {
                if (record.isQuickRow) {
                    return renderLookupSelect('lv005', quickRowData.lv005, (val) => handleLookupChange('lv005', val), 'Mã tham chiếu');
                }
                return value || '—';
            }
        },
        {
            title: 'Kế hoạch/Dự án',
            dataIndex: 'lv002',
            key: 'lv002',
            width: 220,
            render: (value, record) => {
                if (record.isQuickRow) {
                    return renderLookupSelect('lv002', quickRowData.lv002, (val) => handleLookupChange('lv002', val), 'Kế hoạch');
                }
                return record.lv002_label || lookups.projects.find((p) => p.value === value)?.label || value || '—';
            }
        },
        {
            title: 'Công việc',
            dataIndex: 'lv003',
            key: 'lv003',
            width: 240,
            render: (value, record) => {
                if (record.isQuickRow) {
                    return renderLookupSelect('lv003', quickRowData.lv003, (val) => handleLookupChange('lv003', val), 'Công việc');
                }
                return record.lv003_label || lookups.tasks.find((t) => t.value === value)?.label || value || '—';
            }
        },
        {
            title: 'Ngày cảnh báo',
            dataIndex: 'lv006',
            key: 'lv006',
            width: 140,
            render: (value, record) => {
                if (record.isQuickRow) {
                    return renderQuickDate('lv006');
                }
                return renderDate(value, record, 'lv006');
            }
        },
        {
            title: 'Số ngày cảnh báo',
            dataIndex: 'lv008',
            key: 'lv008',
            width: 130,
            render: (value, record) => {
                if (record.isQuickRow) {
                    return renderQuickNumber('lv008', 'Số ngày');
                }
                return value;
            }
        },
        {
            title: 'Nội dung cảnh báo',
            dataIndex: 'lv009',
            key: 'lv009',
            width: 260,
            render: (value, record) => {
                if (record.isQuickRow) {
                    return renderQuickInput('lv009', 'Nội dung');
                }
                return value || '—';
            }
        },
        {
            title: 'Ngày hết hạn',
            dataIndex: 'lv007',
            key: 'lv007',
            width: 140,
            render: (value, record) => {
                if (record.isQuickRow) {
                    return renderQuickDate('lv007');
                }
                return renderDate(value, record, 'lv007');
            }
        },
        {
            title: 'Người tạo',
            dataIndex: 'lv013',
            key: 'lv013',
            width: 180,
            render: (value, record) => {
                if (record.isQuickRow) {
                    return <span style={{ color: '#8c8c8c', fontSize: 12 }}>Tự động</span>;
                }
                return record.lv013_label || record.ten_nguoi_tiep_nhan || lookups.employees.find((e) => e.value === value)?.label || value || '—';
            }
        },
        {
            title: 'Ngày giờ tạo',
            dataIndex: 'lv014',
            key: 'lv014',
            width: 160,
            render: (value, record) => {
                if (record.isQuickRow) {
                    return <span style={{ color: '#8c8c8c', fontSize: 12 }}>Tự động</span>;
                }
                return value || '—';
            }
        },
        {
            title: 'Thao tác',
            key: 'actions',
            width: 90,
            fixed: 'right',
            render: (_, record) => {
                if (record.isQuickRow) {
                    return (
                        <Tooltip title="Thêm nhanh">
                            <Button type="primary" size="small" icon={<Plus size={14} />} onClick={handleQuickSubmit} />
                        </Tooltip>
                    );
                }
                return (
                    <Tooltip title="Chỉnh sửa">
                        <Button type="text" icon={<Edit size={16} />} onClick={() => openEdit(record)} />
                    </Tooltip>
                );
            }
        }
    ];

    const hasSelection = selectedRowKeys.length > 0;

    const dataSource = useMemo(() => {
        if (!planId) return filteredRows;
        return [{ key: 'quick-insert-row', isQuickRow: true }, ...filteredRows];
    }, [filteredRows, planId]);

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
                        <Button icon={<RefreshCw size={16} />} onClick={() => onRefresh?.()} loading={loading}>Tải lại</Button>
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
                    <Button icon={<Lock size={16} />} disabled={!hasSelection} onClick={() => handleBatchAction('childApprove', 'Đánh dấu đã xử lý')}>Đã xử lý</Button>
                    <Button icon={<Unlock size={16} />} disabled={!hasSelection} onClick={() => handleBatchAction('childUnapprove', 'Hủy xử lý')}>Hủy xử lý</Button>
                    <Button danger icon={<Trash2 size={16} />} disabled={!hasSelection} onClick={() => handleBatchAction('childDelete', 'Xóa')}>Xóa</Button>
                </div>
            )}
            <Table
                className={styles.mainTable}
                rowKey={(r, i) => r.lv001 ?? i}
                columns={columns}
                dataSource={dataSource}
                loading={loading}
                size="small" bordered
                rowSelection={planId ? {
                    selectedRowKeys,
                    onChange: setSelectedRowKeys,
                    getCheckboxProps: (record) => ({ disabled: record.isQuickRow }),
                } : undefined}
                pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t) => `Tổng: ${t} dòng` }}
                scroll={{ x: 1900 }}
                locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={`Không có dữ liệu ${TAB_LABEL}`} /> }}
                onRow={(record) => ({ onDoubleClick: () => { if (planId && !record.isQuickRow) openEdit(record); } })}
            />
            <Drawer
                className={styles.khoDrawer}
                title={editingRecord ? `Sửa ${TAB_LABEL}` : `Thêm ${TAB_LABEL}`}
                open={drawerOpen} width={640} onClose={() => setDrawerOpen(false)}
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
                    <Divider orientation="left" style={{ margin: '0 0 16px 0' }}>Thông tin cảnh báo</Divider>
                    
                    <Row gutter={12}>
                        <Col span={12}>
                            <Form.Item name="lv002" label="Kế hoạch/Dự án" rules={[{ required: true, message: 'Chọn kế hoạch/dự án' }]}>
                                {renderFormLookupSelect('lv002', 'Chọn kế hoạch')}
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="lv003" label="Tên/mã công việc">
                                {renderFormLookupSelect('lv003', 'Chọn công việc')}
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={12}>
                        <Col span={12}>
                            <Form.Item name="lv004" label="Mã module" rules={[{ required: true, message: 'Chọn mã module' }]}>
                                {renderFormLookupSelect('lv004', 'Chọn mã module')}
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="lv005" label="Mã tham chiếu">
                                {renderFormLookupSelect('lv005', 'Chọn mã tham chiếu')}
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={12}>
                        <Col span={12}>
                            <Form.Item name="lv006" label="Ngày cảnh báo" rules={[{ required: true, message: 'Chọn ngày cảnh báo' }]}>
                                <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="lv008" label="Số ngày cảnh báo trước">
                                <InputNumber style={{ width: '100%' }} min={0} />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={12}>
                        <Col span={12}>
                            <Form.Item name="lv007" label="Ngày hết hạn">
                                <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="lv017" label="Chu kỳ">
                                {renderFormLookupSelect('lv017', 'Chọn chu kỳ')}
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={12}>
                        <Col span={12}>
                            <Form.Item name="lv013" label="Người tiếp nhận/tạo">
                                {renderFormLookupSelect('lv013', 'Chọn người tiếp nhận')}
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="lv016" label="Nhân viên liên quan">
                                {renderFormLookupSelect('lv016', 'Chọn nhân viên liên quan', 'multiple')}
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item name="lv009" label="Nội dung cảnh báo" rules={[{ required: true, message: 'Nhập nội dung' }]}>
                        <Input.TextArea rows={4} placeholder="Mô tả cảnh báo..." />
                    </Form.Item>
                </Form>
            </Drawer>
        </Space>
    );
};

export default CanhBaoTab;
