import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Descriptions, Drawer, Empty, Form, Input, message, Modal, Popconfirm, Row, Col, Skeleton, Space, Table, Tabs, Tag, Tooltip, Typography } from 'antd';
import { Bell, Briefcase, Check, CheckCircle, Coins, Edit3, FileText, FolderKanban, ListTodo, Lock, PackageOpen, Plus, RefreshCw, ShieldCheck, ShoppingCart, Trash2, Unlock, Warehouse, X } from 'lucide-react';
import dayjs from 'dayjs';
import { execCRUD } from '../../../../services/apiServices';
import styles from './QuanLyKeHoach.module.css';

const { Text, Title } = Typography;

const CHILD_TABS = [
    { key: 'summaryItems', label: 'Bảng tổng hợp', icon: FolderKanban, countKey: 'summaryItems', oldModule: 'cr_lv0145/cr_lv0145.php' },
    { key: 'tasks', label: 'Nhập công việc', icon: ListTodo, countKey: 'tasks', oldModule: 'cr_lv0005/cr_lv0005-1.php', canApprove: true, canLock: true },
    { key: 'kanban', label: 'Kanban', icon: FolderKanban, countKey: 'tasks', sourceKeys: ['tasks'], oldModule: 'cr_lv0094/kanban_loader.php', readOnly: true, view: 'kanban' },
    { key: 'workload', label: 'Công việc', icon: CheckCircle, countKey: 'workload', oldModule: 'cr_lv0025/cr_lv0025-1.php', canApprove: true },
    { key: 'workloadMore', label: 'Xem tổng CV', icon: CheckCircle, countKey: 'workloadMore', oldModule: 'cr_lv0025/cr_lv0025-21.php', readOnly: true },
    { key: 'contacts', label: 'Thông tin liên hệ', icon: Bell, countKey: 'contacts', oldModule: 'cr_lv0129/cr_lv0129.php', canApprove: true },
    { key: 'progress', label: 'Tiến độ & DS dự kiến', icon: FileText, countKey: 'progress', oldModule: 'cr_lv0409/cr_lv0409.php', canApprove: true },
    { key: 'saleShares', label: 'Sale tham gia', icon: Briefcase, countKey: 'saleShares', oldModule: 'cr_lv0414/cr_lv0414.php', canApprove: true },
    { key: 'participantStaff', label: 'Nhân viên tham gia', icon: Briefcase, countKey: 'participantStaff', oldModule: 'da_lh0014/da_lh0014.php', canApprove: true },
    { key: 'materialRequests', label: 'Đề nghị VT', icon: ShoppingCart, countKey: 'materialRequests', oldModule: 'cr_lv0150/cr_lv0150-17.php', canApprove: true },
    { key: 'quotes', label: 'Báo giá', icon: FileText, countKey: 'quotes', oldModule: 'sl_lv0010/sl_lv0010-1.php', canApprove: true, canAdd: false },
    { key: 'contracts', label: 'Hợp đồng', icon: Briefcase, countKey: 'contracts', oldModule: 'sl_lv0013/sl_lv0013-1.php', canApprove: true, canAdd: false },
    { key: 'purchase', label: 'Mua hàng', icon: ShoppingCart, countKey: 'purchaseOrders', oldModule: 'wh_lv0021/wh_lv0021-1.php', canApprove: true, canAdd: false },
    { key: 'receipts', label: 'Thu tiền', icon: Coins, countKey: 'receipts', oldModule: 'cr_lv0032/cr_lv0032.php' },
    { key: 'paymentRequests', label: 'Đề nghị chi tiền', icon: Coins, countKey: 'paymentRequests', oldModule: 'cr_lv0202/cr_lv0202-16.php', canApprove: true },
    { key: 'payments', label: 'Chi tiền', icon: Coins, countKey: 'payments', oldModule: 'cr_lv0033/cr_lv0033.php', canApprove: true },
    { key: 'inStock', label: 'Nhập kho', icon: Warehouse, countKey: 'inStock', oldModule: 'cr_lv0037/cr_lv0037.php', canApprove: true, canAdd: false },
    { key: 'outStock', label: 'Xuất kho', icon: Warehouse, countKey: 'outStock', oldModule: 'cr_lv0038/cr_lv0038.php', canApprove: true, canAdd: false },
    { key: 'warrantySale', label: 'Bảo hành PBH', icon: ShieldCheck, countKey: 'warrantySale', oldModule: 'cr_lv0330/cr_lv0330-11.php', canApprove: true },
    { key: 'warrantyPurchase', label: 'Bảo hành PMH', icon: ShieldCheck, countKey: 'warrantyPurchase', oldModule: 'cr_lv0071/cr_lv0071-1.php', canApprove: true, canAdd: false },
    { key: 'alerts', label: 'Cảnh báo', icon: Bell, countKey: 'alerts', oldModule: 'cr_lv0047/cr_lv0047.php', canAdd: false },
];

const HIDDEN_FORM_FIELDS = new Set(['lv199', '__childKey', 'ten_du_an', 'ten_nguoi_tao', 'ten_sale', 'NDPLAN', 'NTPLAN', 'NSPLAN']);
const READONLY_FIELDS = new Set(['lv001', 'lv008', 'lv009', 'lv010', 'lv015', 'lv088', 'lv089']);
const LONG_TEXT_FIELDS = new Set(['lv004', 'lv007', 'lv009', 'lv011', 'lv017', 'lv090']);
const dateFields = new Set(['lv003', 'lv005', 'lv007', 'lv009', 'lv010', 'lv014', 'lv015', 'lv019', 'lv077', 'lv078', 'lv089', 'lv097', 'lv101', 'lv120', 'lv121']);
const moneyFields = new Set(['lv004', 'lv006', 'lv012', 'lv014', 'lv017', 'lv075', 'lv076', 'lv089', 'lv102', 'total_amount']);

const fallbackLabels = {
    lv001: 'Mã', lv002: 'Mã cha', lv003: 'Loại', lv004: 'Nội dung', lv005: 'Ngày', lv006: 'Người xử lý', lv007: 'Ghi chú', lv008: 'Người tạo',
    lv009: 'Trạng thái', lv010: 'Người cập nhật', lv011: 'Diễn giải', lv012: 'Số lượng', lv013: 'Đơn vị', lv014: 'Mã hàng', lv015: 'Ngày tạo',
    lv016: 'Duyệt', lv017: 'Ghi chú duyệt', lv027: 'Trạng thái duyệt', lv049: 'Nhóm công việc', lv069: 'Mã cha', lv075: 'Tổng giá dự toán',
    lv076: 'AD.TT', lv077: 'Ngày đóng hồ sơ thầu', lv078: 'Ngày đóng thầu', lv079: 'Sale', lv080: 'P.TTT', lv081: 'AD', lv082: 'Thương hiệu',
    lv083: 'Địa chỉ dự án', lv084: 'Loại hình dự án', lv085: 'Khu vực', lv087: 'Nhóm', lv088: 'Trạng thái', lv089: 'Phiếu bán hàng',
    lv090: 'Thông tin', lv097: 'Người tiếp nhận', lv098: 'Trạng thái kế hoạch', lv100: 'Trạng thái dự án', lv101: 'Thời gian hoàn thành dự án',
    lv102: 'Tổng giá bán dự kiến', lv114: 'Công việc', lv115: 'Số chứng từ', __sourceLabel: 'Nguồn', lv117: 'Tên hàng', lv119: 'Đề nghị', lv199: 'Chức năng', lv501: 'Dự án',
};

const toArray = (value) => Array.isArray(value) ? value : (Array.isArray(value?.data) ? value.data : (Array.isArray(value?.items) ? value.items : []));
const toNumber = (value, fallback = 0) => { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : fallback; };
const formatMoney = (value) => toNumber(value).toLocaleString('vi-VN', { maximumFractionDigits: 0 });
const getRecordId = (record) => record?.lv001 || record?.lv115 || record?.id;
const getRowKey = (record, type, index) => {
    const id = getRecordId(record);
    return id ? `${record?.__childKey || type}::${id}` : `${record?.__childKey || type}::${index}`;
};
const formatDate = (value) => {
    if (!value || value === '0000-00-00' || value === '0000-00-00 00:00:00' || value === '1900-01-01' || value === '1900-01-01 00:00:00') return '';
    const parsed = dayjs(value);
    return parsed.isValid() ? parsed.format('DD/MM/YYYY') : String(value);
};

const statusTag = (value) => {
    const closed = String(value ?? '0') === '1';
    return <Tag color={closed ? 'green' : 'blue'}>{closed ? 'Đã đóng' : 'Đang mở'}</Tag>;
};

const valueRender = (value, key) => {
    if (value === null || value === undefined || value === '') return <Text type="secondary">-</Text>;
    const lower = String(key).toLowerCase();
    if (lower.includes('date') || dateFields.has(key)) return formatDate(value) || String(value);
    if (moneyFields.has(key) && !Number.isNaN(Number(value))) return formatMoney(value);
    if (String(value).length > 90) return <Tooltip title={String(value)}><span>{String(value).slice(0, 90)}...</span></Tooltip>;
    return String(value);
};

const collectKeys = (rows, metaFields = []) => {
    const keys = [];
    const pushKey = (key) => {
        if (!key || !Number.isNaN(Number(key)) || keys.includes(key)) return;
        keys.push(key);
    };
    metaFields.forEach(pushKey);
    rows.forEach((row) => Object.keys(row || {}).forEach((key) => {
        if (row[key] !== null && typeof row[key] === 'object') return;
        pushKey(key);
    }));
    return keys;
};

const buildColumns = (rows, type, columnMeta = {}, onEdit, onAction, tabConfig) => {
    const metaFields = toArray(columnMeta.fields);
    const labels = { ...fallbackLabels, ...(columnMeta.labels || {}) };
    const keys = collectKeys(rows, metaFields).filter((key) => key !== 'lv199' && key !== '__childKey');
    const dataColumns = keys.map((key) => ({
        title: labels[key] || key,
        dataIndex: key,
        key: `${type}-${key}`,
        width: ['lv003', 'lv004', 'lv007', 'lv011', 'lv029', 'NDPLAN'].includes(key) ? 260 : 150,
        ellipsis: true,
        render: (value) => valueRender(value, key),
    }));

    const actionColumn = {
            title: 'Chức năng',
            key: `${type}-actions`,
            fixed: 'left',
            width: tabConfig.canLock ? 210 : 170,
            render: (_, record) => (
                <Space size={4}>
                    <Tooltip title="Sửa"><Button size="small" icon={<Edit3 size={14} />} onClick={() => onEdit(record)} /></Tooltip>
                    <Popconfirm title="Xóa dòng này?" okText="Xóa" cancelText="Hủy" onConfirm={() => onAction('childDelete', record)}>
                        <Tooltip title="Xóa"><Button size="small" danger icon={<Trash2 size={14} />} /></Tooltip>
                    </Popconfirm>
                    {tabConfig.canApprove && <Tooltip title="Duyệt/đóng"><Button size="small" icon={<Check size={14} />} onClick={() => onAction('childApprove', record)} /></Tooltip>}
                    {tabConfig.canApprove && <Tooltip title="Trả duyệt/mở"><Button size="small" icon={<X size={14} />} onClick={() => onAction('childUnapprove', record)} /></Tooltip>}
                    {tabConfig.canLock && <Tooltip title="Khóa"><Button size="small" icon={<Lock size={14} />} onClick={() => onAction('childLock', record)} /></Tooltip>}
                    {tabConfig.canLock && <Tooltip title="Mở khóa"><Button size="small" icon={<Unlock size={14} />} onClick={() => onAction('childUnlock', record)} /></Tooltip>}
                </Space>
            ),
        };

    return tabConfig.readOnly ? dataColumns : [actionColumn, ...dataColumns];
};

const DetailTable = ({ rows, type, tabConfig, columnMeta, selectedRowKeys, onSelectRows, onAdd, onEdit, onAction, onBulkAction }) => {
    const safeRows = toArray(rows);
    const [searchText, setSearchText] = useState('');
    const filteredRows = useMemo(() => {
        const keyword = searchText.trim().toLowerCase();
        if (!keyword) return safeRows;
        return safeRows.filter((row) => Object.values(row || {}).some((value) => String(value ?? '').toLowerCase().includes(keyword)));
    }, [safeRows, searchText]);
    const columns = useMemo(() => buildColumns(filteredRows, type, columnMeta, onEdit, onAction, tabConfig), [filteredRows, type, columnMeta, onEdit, onAction, tabConfig]);
    const hasSelection = selectedRowKeys.length > 0;
    const canCreate = !tabConfig.readOnly && tabConfig.canAdd !== false;
    const canBulkAction = !tabConfig.readOnly && hasSelection;

    return (
        <Space direction="vertical" size={10} style={{ width: '100%' }}>
            <div className={styles.detailToolbar}>
                <Space wrap>
                    <Button type="primary" icon={<Plus size={15} />} onClick={onAdd} disabled={!canCreate}>Thêm</Button>
                    <Popconfirm title={`Xóa ${selectedRowKeys.length} dòng đã chọn?`} okText="Xóa" cancelText="Hủy" disabled={!canBulkAction} onConfirm={() => onBulkAction('childDelete')}>
                        <Button danger icon={<Trash2 size={15} />} disabled={!canBulkAction}>Xóa</Button>
                    </Popconfirm>
                    {tabConfig.canApprove && <Button icon={<Check size={15} />} disabled={!canBulkAction} onClick={() => onBulkAction('childApprove')}>Duyệt</Button>}
                    {tabConfig.canApprove && <Button icon={<X size={15} />} disabled={!canBulkAction} onClick={() => onBulkAction('childUnapprove')}>Trả duyệt</Button>}
                    {tabConfig.canLock && <Button icon={<Lock size={15} />} disabled={!canBulkAction} onClick={() => onBulkAction('childLock')}>Khóa</Button>}
                    {tabConfig.canLock && <Button icon={<Unlock size={15} />} disabled={!canBulkAction} onClick={() => onBulkAction('childUnlock')}>Mở khóa</Button>}
                </Space>
                <Space wrap>
                    <Input.Search allowClear placeholder="Lọc dữ liệu..." size="small" value={searchText} onChange={(event) => setSearchText(event.target.value)} style={{ width: 220 }} />
                    <Text type="secondary">{tabConfig.oldModule}</Text>
                </Space>
            </div>
            <Table
                rowKey={(record, index) => getRowKey(record, type, index)}
                rowSelection={tabConfig.readOnly ? undefined : { selectedRowKeys, onChange: onSelectRows }}
                columns={columns}
                dataSource={filteredRows}
                size="small"
                bordered
                pagination={{ pageSize: 8, showSizeChanger: true }}
                scroll={{ x: Math.max(1120, columns.length * 150) }}
                locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có dữ liệu" /> }}
                className={styles.detailTable}
            />
        </Space>
    );
};

const KanbanView = ({ rows }) => {
    const safeRows = toArray(rows);
    const groups = useMemo(() => {
        const groupNames = {
            '0': 'Mới',
            '1': 'Đang xử lý',
            '2': 'Đã duyệt',
            '3': 'Hoàn thành',
        };
        return safeRows.reduce((acc, row) => {
            const key = String(row.lv027 ?? row.lv011 ?? row.lv016 ?? '0');
            const label = groupNames[key] || `Trạng thái ${key}`;
            if (!acc[label]) acc[label] = [];
            acc[label].push(row);
            return acc;
        }, {});
    }, [safeRows]);

    if (!safeRows.length) {
        return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có công việc để hiển thị Kanban" />;
    }

    return (
        <div className={styles.kanbanBoard}>
            {Object.entries(groups).map(([label, items]) => (
                <div className={styles.kanbanColumn} key={label}>
                    <div className={styles.kanbanColumnHeader}>
                        <Text strong>{label}</Text>
                        <Tag>{items.length}</Tag>
                    </div>
                    <Space direction="vertical" size={8} style={{ width: '100%' }}>
                        {items.map((item, index) => (
                            <Card size="small" className={styles.kanbanCard} key={getRowKey(item, 'kanban', index)}>
                                <Text strong>{item.lv004 || item.lv001 || 'Công việc'}</Text>
                                <div><Text type="secondary">{formatDate(item.lv005) || item.lv003 || '-'}</Text></div>
                                {item.lv006 && <Tag color="blue">{item.lv006}</Tag>}
                            </Card>
                        ))}
                    </Space>
                </div>
            ))}
        </div>
    );
};

const KeHoachDetailDrawer = ({ visible, record, onClose, onRefresh, onCreateDNCT, onListDNCT }) => {
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [detail, setDetail] = useState(null);
    const [activeKey, setActiveKey] = useState(CHILD_TABS[0].key);
    const [selectedByTab, setSelectedByTab] = useState({});
    const [modalState, setModalState] = useState({ open: false, mode: 'add', childKey: CHILD_TABS[0].key, record: null });
    const [form] = Form.useForm();

    const planId = record?.lv001;
    const plan = detail?.plan || record || {};
    const summary = detail?.summary || {};
    const tabs = detail?.tabs || {};
    const columnMeta = detail?.columns || {};
    const detailErrors = Array.isArray(detail?.errors) ? {} : (detail?.errors || {});

    const fetchDetail = useCallback(async () => {
        if (!visible || !planId) return;
        setLoading(true);
        try {
            const result = await execCRUD('cr_lv0094_detail', 'loadPlanDetail', { lv001: planId });
            if (result?.success === false) {
                message.error(result.message || 'Không thể tải chi tiết kế hoạch');
                setDetail(null);
            } else {
                setDetail(result || null);
            }
        } catch (error) {
            console.error(error);
            message.error('Lỗi kết nối máy chủ khi tải chi tiết kế hoạch');
        } finally {
            setLoading(false);
        }
    }, [visible, planId]);

    useEffect(() => { fetchDetail(); }, [fetchDetail]);

    const togglePlan = async () => {
        if (!planId) return;
        const closed = String(plan.lv098 || '0') === '1';
        setActionLoading(true);
        try {
            const result = await execCRUD('cr_lv0094_detail', closed ? 'openPlan' : 'closePlan', { lv001: planId });
            if (result?.success === false) message.error(result.message || 'Thao tác thất bại');
            else {
                message.success(result?.message || 'Thao tác thành công');
                await fetchDetail();
                onRefresh?.();
            }
        } catch (error) {
            console.error(error);
            message.error('Lỗi kết nối máy chủ');
        } finally {
            setActionLoading(false);
        }
    };

    const runChildAction = async (action, childKey, recordItem = {}) => {
        const actualChildKey = recordItem?.__childKey || childKey;
        const childId = recordItem?.lv001 || recordItem?.lv115;
        if (!childId && action !== 'childInsert') return false;
        setActionLoading(true);
        try {
            const result = await execCRUD('cr_lv0094_detail', action, { planId, childKey: actualChildKey, childId, data: recordItem });
            if (result?.success === false) {
                message.error(result.message || 'Thao tác thất bại');
                return false;
            }
            message.success(result?.message || 'Thao tác thành công');
            await fetchDetail();
            return true;
        } catch (error) {
            console.error(error);
            message.error('Lỗi kết nối máy chủ');
            return false;
        } finally {
            setActionLoading(false);
        }
    };

    const runBulkAction = async (action, childKey) => {
        const selected = selectedByTab[childKey] || [];
        if (!selected.length) return;
        setActionLoading(true);
        try {
            for (const selectedKey of selected) {
                const [selectedChildKey, childId] = String(selectedKey).includes('::') ? String(selectedKey).split('::') : [childKey, selectedKey];
                const result = await execCRUD('cr_lv0094_detail', action, { planId, childKey: selectedChildKey, childId });
                if (result?.success === false) throw new Error(result.message || 'Thao tác thất bại');
            }
            message.success('Thao tác thành công');
            setSelectedByTab((prev) => ({ ...prev, [childKey]: [] }));
            await fetchDetail();
        } catch (error) {
            console.error(error);
            message.error(error.message || 'Thao tác thất bại');
        } finally {
            setActionLoading(false);
        }
    };

    const openAdd = (childKey) => {
        const firstTaskId = toArray(tabs.tasks)[0]?.lv001 || '';
        const defaults = childKey === 'receipts' ? { lv002: '0', lv003: 'PLAN', lv004: planId }
            : childKey === 'payments' ? { lv002: '1', lv003: 'PLAN', lv004: planId }
                : childKey === 'paymentRequests' ? { lv002: '1', lv003: 'PLAN', lv004: planId }
                    : ['summaryItems', 'tasks', 'contacts', 'progress', 'saleShares', 'participantStaff'].includes(childKey) ? { lv002: planId }
                        : childKey === 'materialRequests' ? { lv119: planId, lv114: firstTaskId }
                            : childKey === 'warrantySale' ? { lv114: firstTaskId }
                            : childKey === 'workload' ? { lv002: firstTaskId }
                                : {};
        form.setFieldsValue(defaults);
        setModalState({ open: true, mode: 'add', childKey, record: null });
    };

    const openEdit = (childKey, row) => {
        form.setFieldsValue(row || {});
        setModalState({ open: true, mode: 'edit', childKey, record: row });
    };

    const submitModal = async () => {
        const values = await form.validateFields();
        const data = { ...(modalState.record || {}), ...values };
        const ok = await runChildAction(modalState.mode === 'add' ? 'childInsert' : 'childUpdate', modalState.childKey, data);
        if (ok) {
            setModalState((prev) => ({ ...prev, open: false }));
            form.resetFields();
        }
    };

    const modalTab = CHILD_TABS.find((tab) => tab.key === modalState.childKey || tab.sourceKeys?.includes(modalState.childKey)) || CHILD_TABS[0];
    const modalMeta = columnMeta[modalState.childKey] || {};
    const modalLabels = { ...fallbackLabels, ...(modalMeta.labels || {}) };
    const modalFields = collectKeys(toArray(tabs[modalState.childKey]), toArray(modalMeta.fields))
        .filter((field) => !HIDDEN_FORM_FIELDS.has(field))
        .filter((field) => modalState.mode === 'edit' || !READONLY_FIELDS.has(field))
        .slice(0, 32);

    const tabItems = CHILD_TABS.map((tabConfig) => {
        const Icon = tabConfig.icon;
        const sourceKeys = tabConfig.sourceKeys || [tabConfig.key];
        const rows = sourceKeys.flatMap((sourceKey) => toArray(tabs[sourceKey]).map((row) => ({
            ...row,
            __childKey: sourceKey,
            __sourceLabel: sourceKey === 'paymentRequests' ? 'Đề nghị chi' : (sourceKey === 'payments' ? 'Phiếu chi' : tabConfig.label),
        })));
        const mergedMeta = sourceKeys.reduce((acc, sourceKey) => {
            const meta = columnMeta[sourceKey] || {};
            return {
                fields: [...toArray(acc.fields), ...toArray(meta.fields)].filter((field, index, arr) => arr.indexOf(field) === index),
                labels: { ...(acc.labels || {}), ...(meta.labels || {}) },
            };
        }, columnMeta[tabConfig.key] || {});
        const count = tabConfig.countKeys ? tabConfig.countKeys.reduce((sum, key) => sum + toNumber(summary[key] || toArray(tabs[key]).length), 0) : (summary[tabConfig.countKey] || rows.length || 0);
        return {
            key: tabConfig.key,
            label: <Space><Icon size={15} />{tabConfig.label}<Tag>{count}</Tag></Space>,
            children: tabConfig.view === 'kanban' ? (
                <KanbanView rows={rows} />
            ) : (
                <DetailTable
                    rows={rows}
                    type={tabConfig.key}
                    tabConfig={tabConfig}
                    columnMeta={mergedMeta}
                    selectedRowKeys={selectedByTab[tabConfig.key] || []}
                    onSelectRows={(keys) => setSelectedByTab((prev) => ({ ...prev, [tabConfig.key]: keys }))}
                    onAdd={() => openAdd(tabConfig.key)}
                    onEdit={(row) => openEdit(row.__childKey || tabConfig.key, row)}
                    onAction={(action, row) => runChildAction(action, row.__childKey || tabConfig.key, row)}
                    onBulkAction={(action) => runBulkAction(action, tabConfig.key)}
                />
            ),
        };
    });

    return (
        <Drawer
            title={<div className={styles.detailHeaderTitle}><FolderKanban size={18} /><div><Title level={5}>{plan.lv002 || 'Chi tiết kế hoạch'}</Title><Space size={6}>{plan.lv001 && <Text code>{plan.lv001}</Text>}{statusTag(plan.lv098)}</Space></div></div>}
            placement="right"
            width="92vw"
            open={visible}
            onClose={onClose}
            className={`${styles.khoDrawer} ${styles.planDetailDrawer}`}
            destroyOnClose
            extra={<Space wrap><Button icon={<RefreshCw size={15} />} onClick={fetchDetail} loading={loading}>Làm mới</Button><Button icon={<Coins size={15} />} onClick={() => onCreateDNCT?.(plan)}>Tạo ĐNCT</Button><Button icon={<PackageOpen size={15} />} onClick={() => onListDNCT?.(plan)}>Danh sách ĐNCT</Button><Button type={String(plan.lv098 || '0') === '1' ? 'default' : 'primary'} icon={String(plan.lv098 || '0') === '1' ? <Unlock size={15} /> : <Lock size={15} />} onClick={togglePlan} loading={actionLoading}>{String(plan.lv098 || '0') === '1' ? 'Mở lại' : 'Đóng kế hoạch'}</Button></Space>}
        >
            {loading && !detail ? <Skeleton active paragraph={{ rows: 10 }} /> : (
                <>
                    <Card className={styles.detailInfoCard} size="small" style={{ marginBottom: 12 }}>
                        <Row gutter={[12, 8]}>
                            <Col xs={24} lg={16}>
                                <Descriptions size="small" column={2} bordered>
                                    <Descriptions.Item label="Mã kế hoạch">{plan.lv001 || '-'}</Descriptions.Item>
                                    <Descriptions.Item label="Trạng thái">{statusTag(plan.lv098)}</Descriptions.Item>
                                    <Descriptions.Item label="Dự án">{plan.ten_du_an || plan.lv009 || plan.lv501 || '-'}</Descriptions.Item>
                                    <Descriptions.Item label="Quyền"><Tag color={plan.lv007 === 'PUBLIC' ? 'cyan' : 'blue'}>{plan.lv007 || 'PRIVATE'}</Tag></Descriptions.Item>
                                    <Descriptions.Item label="Người tạo">{plan.ten_nguoi_tao || plan.lv004 || '-'}</Descriptions.Item>
                                    <Descriptions.Item label="Sale">{plan.ten_sale || plan.lv079 || '-'}</Descriptions.Item>
                                </Descriptions>
                            </Col>
                            <Col xs={24} lg={8}>
                                <Descriptions size="small" column={1} bordered>
                                    <Descriptions.Item label="Dự toán">{formatMoney(summary.estimateAmount || plan.lv075 || plan.lv076 || 0)} VND</Descriptions.Item>
                                    <Descriptions.Item label="Phiếu thu/chi">{summary.receipts || 0}/{summary.payments || 0}</Descriptions.Item>
                                    <Descriptions.Item label="Mua hàng">{summary.purchaseOrders || 0}</Descriptions.Item>
                                </Descriptions>
                            </Col>
                        </Row>
                    </Card>
                    {Object.keys(detailErrors).length > 0 && <Alert type="warning" showIcon style={{ marginBottom: 12 }} message="Một số tab phụ chưa khớp schema dữ liệu" description={Object.entries(detailErrors).map(([key, value]) => `${key}: ${value}`).join(' | ')} />}
                    <Tabs className={styles.detailTabs} activeKey={activeKey} onChange={setActiveKey} items={tabItems} />
                    <Modal
                        open={modalState.open}
                        title={`${modalState.mode === 'add' ? 'Thêm' : 'Sửa'} ${modalTab.label}`}
                        onOk={submitModal}
                        onCancel={() => { setModalState((prev) => ({ ...prev, open: false })); form.resetFields(); }}
                        confirmLoading={actionLoading}
                        width={760}
                        destroyOnClose
                    >
                        <Form form={form} layout="vertical" preserve={false}>
                            <Row gutter={12}>
                                {modalFields.map((field) => (
                                    <Col xs={24} md={LONG_TEXT_FIELDS.has(field) ? 24 : 12} key={field}>
                                        <Form.Item name={field} label={modalLabels[field] || field}>
                                            {LONG_TEXT_FIELDS.has(field) ? <Input.TextArea rows={3} /> : <Input />}
                                        </Form.Item>
                                    </Col>
                                ))}
                            </Row>
                        </Form>
                    </Modal>
                </>
            )}
        </Drawer>
    );
};

export default KeHoachDetailDrawer;
