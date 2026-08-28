import React, { useState, useEffect, useMemo } from 'react';
import {
    Button, Drawer, Empty, Form, Input, InputNumber,
    Modal, Space, Table, Tag, Tooltip, Typography, message,
} from 'antd';
import dayjs from 'dayjs';
import { Edit, Lock, Plus, RefreshCw, Save, Search, Trash2, Unlock, X } from 'lucide-react';
import { execCRUD } from '../../../services/apiServices';
import styles from '../QuanLyKeHoach.module.css';

const { Text } = Typography;

// ── CONSTANTS ──────────────────────────────────────────────────────────────
const CHILD_KEY  = 'inStock';
const TAB_LABEL  = 'Nhập kho';
const TAB_MODULE = 'cr_lv0037/cr_lv0037.php';

const TRANG_THAI_MAP = {
    '0': { label: 'Chờ duyệt', color: 'warning' },
    '1': { label: 'Đã nhập', color: 'success' },
    '2': { label: 'Hủy', color: 'error' },
};

const formatDate  = (val) => (!val || val === '1900-01-01' ? '—' : (dayjs(val).isValid() ? dayjs(val).format('DD/MM/YYYY') : val));
const formatMoney = (val) => { const n = Number(String(val ?? '').replace(/,/g, '')); return Number.isFinite(n) ? n.toLocaleString('vi-VN') : (val ?? '—'); };

// ── MAIN COMPONENT ──────────────────────────────────────────────────────────
const NhapKhoTab = ({ detailData, onRefresh }) => {
    const planId = detailData?.plan?.lv001;

    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [selectedRowKeys, setSelectedRowKeys] = useState([]);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);
    const [form] = Form.useForm();

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
            console.debug(`[NhapKhoTab] ${func}`, payload);
            const res = await execCRUD('cr_lv0094_detail', func, payload);
            if (res?.success === false) { message.error(res.message || 'Thao tác thất bại'); return false; }
            message.success(res?.message || 'Thao tác thành công');
            setSelectedRowKeys([]);
            if (onRefresh) await onRefresh();
            return true;
        } catch (e) {
            console.error(`[NhapKhoTab] ${func}`, e);
            message.error('Lỗi kết nối: ' + e.message);
            return false;
        } finally { setLoading(false); }
    };

    const openCreate = () => { setEditingRecord(null); form.resetFields(); form.setFieldsValue({ lv002: planId }); setDrawerOpen(true); };
    const openEdit = (record) => {
        setEditingRecord(record);
        form.resetFields();
        form.setFieldsValue({ lv003: record.lv003, lv004: record.lv004, lv005: record.lv005, lv006: record.lv006, lv012: record.lv012, lv016: record.lv016 });
        setDrawerOpen(true);
    };
    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            const data = { ...values, lv002: planId };
            if (editingRecord?.lv001) data.lv001 = editingRecord.lv001;
            const ok = await callAction(editingRecord ? 'childUpdate' : 'childInsert', editingRecord?.lv001 ?? '', data);
            if (ok) setDrawerOpen(false);
        } catch { /* validation */ }
    };
    const handleBatchAction = async (func, label) => {
        if (!selectedRowKeys.length) { message.warning('Chọn ít nhất một dòng'); return; }
        Modal.confirm({
            title: label, content: `Thực hiện "${label}" cho ${selectedRowKeys.length} dòng?`,
            okText: 'Xác nhận', cancelText: 'Hủy',
            onOk: async () => { let ok = 0; for (const id of selectedRowKeys) { if (await callAction(func, id)) ok++; } if (ok) message.success(`Đã xử lý ${ok} dòng`); },
        });
    };

    // ── COLUMNS ────────────────────────────────────────────────────────────
    const columns = [
        { title: 'STT', key: 'stt', width: 60, align: 'center', fixed: 'left', render: (_, __, idx) => idx + 1 },
        { title: 'Mã phiếu NK', dataIndex: 'lv001', key: 'lv001', width: 130, fixed: 'left',
            render: (val) => <Text strong style={{ color: '#1677ff' }}>{val}</Text> },
        { title: 'Mã hàng hóa', dataIndex: 'lv003', key: 'lv003', width: 130 },
        { title: 'Tên hàng / Mô tả', dataIndex: 'lv004', key: 'lv004', ellipsis: true, width: 260,
            render: (val) => <Tooltip title={val}><span style={{ fontWeight: 500 }}>{val || '—'}</span></Tooltip> },
        { title: 'Ngày nhập', dataIndex: 'lv005', key: 'lv005', width: 110, render: (val) => formatDate(val) },
        { title: 'Số lượng', dataIndex: 'lv006', key: 'lv006', width: 100, align: 'right',
            render: (val) => Number(val ?? 0).toLocaleString('vi-VN') },
        { title: 'Tổng tiền', dataIndex: 'lv012', key: 'lv012', width: 150, align: 'right',
            render: (val) => <Text strong>{formatMoney(val)} đ</Text> },
        { title: 'Trạng thái', dataIndex: 'lv016', key: 'lv016', width: 120, align: 'center',
            render: (val) => { const info = TRANG_THAI_MAP[String(val ?? '')]; return info ? <Tag color={info.color}>{info.label}</Tag> : <Tag>{val ?? '—'}</Tag>; } },
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
                    <Button icon={<Lock size={16} />} disabled={!hasSelection} onClick={() => handleBatchAction('childApprove', 'Duyệt')}>Duyệt</Button>
                    <Button icon={<Unlock size={16} />} disabled={!hasSelection} onClick={() => handleBatchAction('childUnapprove', 'Hủy duyệt')}>Hủy duyệt</Button>
                    <Button danger icon={<Trash2 size={16} />} disabled={!hasSelection} onClick={() => handleBatchAction('childDelete', 'Xóa')}>Xóa</Button>
                </div>
            )}
            <Table
                className={styles.mainTable}
                rowKey={(r, i) => r.lv001 ?? i}
                columns={columns} dataSource={filteredRows} loading={loading}
                size="small" bordered
                rowSelection={planId ? { selectedRowKeys, onChange: setSelectedRowKeys } : undefined}
                pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t) => `Tổng: ${t} dòng` }}
                scroll={{ x: 1250 }}
                locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={`Không có dữ liệu ${TAB_LABEL}`} /> }}
                onRow={(record) => ({ onDoubleClick: () => { if (planId) openEdit(record); } })}
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
                    <Form.Item name="lv003" label="Mã hàng hóa" rules={[{ required: true, message: 'Nhập mã hàng hóa' }]}>
                        <Input placeholder="Mã hàng hóa..." />
                    </Form.Item>
                    <Form.Item name="lv004" label="Tên hàng / Mô tả">
                        <Input.TextArea rows={2} placeholder="Tên hoặc mô tả hàng hóa..." />
                    </Form.Item>
                    <Form.Item name="lv005" label="Ngày nhập">
                        <Input placeholder="YYYY-MM-DD" />
                    </Form.Item>
                    <Form.Item name="lv006" label="Số lượng">
                        <InputNumber style={{ width: '100%' }} min={0} placeholder="0" />
                    </Form.Item>
                    <Form.Item name="lv012" label="Tổng tiền (VND)">
                        <InputNumber style={{ width: '100%' }} min={0} controls={false}
                            formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                            parser={(v) => v.replace(/,/g, '')} placeholder="0" />
                    </Form.Item>
                </Form>
            </Drawer>
        </Space>
    );
};

export default NhapKhoTab;
