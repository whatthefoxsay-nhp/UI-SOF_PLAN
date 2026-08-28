import React, { useState, useEffect, useMemo } from 'react';
import {
    Button, Drawer, Empty, Form, Input,
    Modal, Space, Table, Tag, Tooltip, Typography, message,
} from 'antd';
import dayjs from 'dayjs';
import { Edit, Lock, Plus, RefreshCw, Save, Search, Trash2, Unlock, X } from 'lucide-react';
import { execCRUD } from '../../../services/apiServices';
import styles from '../QuanLyKeHoach.module.css';
import SelectNhanVien from '../../../components/DropDown/SelectNhanVien';
import SelectPhongBan from '../../../components/DropDown/SelectPhongBan';
import { useMasterData } from '../../../hooks/useApiQueries';

const { Text } = Typography;

// ── CONSTANTS ──────────────────────────────────────────────────────────────
const CHILD_KEY  = 'participantStaff';
const TAB_LABEL  = 'DS nhân viên tham gia';
const TAB_MODULE = 'da_lh0014/da_lh0014.php';

const TRANG_THAI_MAP = {
    '0': { label: 'Chưa bắt đầu', color: 'default' },
    '1': { label: 'Đang thực hiện', color: 'processing' },
    '2': { label: 'Hoàn thành', color: 'success' },
};

// ── MAIN COMPONENT ──────────────────────────────────────────────────────────
const DSNhanVienThamGiaTab = ({ detailData, onRefresh }) => {
    const planId = detailData?.plan?.lv001;

    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [selectedRowKeys, setSelectedRowKeys] = useState([]);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);
    const [form] = Form.useForm();

    // Fetch master data for lookup and dropdowns
    const { data: staffList } = useMasterData('hr_lv0020_select_kttm', 'NhanVien');
    const { data: deptList } = useMasterData('hr_lv0002_select', 'PhongBan');

    const [quickRowData, setQuickRowData] = useState({
        lv003: '',
        lv004: '',
        lv010: '',
    });

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
            console.debug(`[DSNhanVienThamGiaTab] ${func}`, payload);
            const res = await execCRUD('cr_lv0094_detail', func, payload);
            if (res?.success === false) { message.error(res.message || 'Thao tác thất bại'); return false; }
            message.success(res?.message || 'Thao tác thành công');
            setSelectedRowKeys([]);
            if (onRefresh) await onRefresh();
            return true;
        } catch (e) {
            console.error(`[DSNhanVienThamGiaTab] ${func}`, e);
            message.error('Lỗi kết nối: ' + e.message);
            return false;
        } finally { setLoading(false); }
    };

    const openCreate = () => {
        setEditingRecord(null);
        form.resetFields();
        form.setFieldsValue({
            lv002: planId,
            lv809: planId,
            lv012: dayjs().format('YYYY-MM-DD HH:mm:ss'),
            lv011: '',
        });
        setDrawerOpen(true);
    };

    const openEdit = (record) => {
        setEditingRecord(record);
        form.resetFields();
        form.setFieldsValue({
            lv001: record.lv001,
            lv002: record.lv002 || planId,
            lv003: record.lv003,
            lv004: record.lv004,
            lv010: record.lv010,
            lv011: record.lv011,
            lv012: record.lv012,
            lv809: record.lv809 || planId,
        });
        setDrawerOpen(true);
    };

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            const data = {
                ...values,
                lv002: planId,
            };
            if (editingRecord?.lv001) data.lv001 = editingRecord.lv001;

            if (!editingRecord) {
                data.lv012 = dayjs().format('YYYY-MM-DD HH:mm:ss');
            } else {
                data.lv012 = editingRecord.lv012;
            }

            const ok = await callAction(editingRecord ? 'childUpdate' : 'childInsert', editingRecord?.lv001 ?? '', data);
            if (ok) setDrawerOpen(false);
        } catch { /* validation */ }
    };

    const handleQuickStaffChange = (val) => {
        const staff = staffList?.find((item) => item.lv001 === val);
        setQuickRowData({
            ...quickRowData,
            lv003: val,
            lv004: staff ? staff.lv029 : '',
        });
    };

    const handleQuickSubmit = async () => {
        if (!planId) { message.warning('Thiếu mã kế hoạch'); return; }
        if (!quickRowData.lv003) {
            message.warning('Vui lòng chọn nhân viên để thêm nhanh!');
            return;
        }

        const data = {
            lv002: planId,
            lv003: quickRowData.lv003,
            lv004: quickRowData.lv004,
            lv010: quickRowData.lv010,
            lv012: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        };

        const ok = await callAction('childInsert', '', data);
        if (ok) {
            setQuickRowData({
                lv003: '',
                lv004: '',
                lv010: '',
            });
        }
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

    // ── COLUMNS ────────────────────────────────────────────────────────────
    const columns = [
        {
            title: 'STT',
            key: 'stt',
            width: 80,
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
            }
        },
        {
            title: 'Người tham gia',
            dataIndex: 'lv003',
            key: 'lv003',
            width: 180,
            render: (val, record) => {
                if (record.isQuickRow) {
                    return (
                        <SelectNhanVien
                            size="small"
                            value={quickRowData.lv003}
                            onChange={handleQuickStaffChange}
                            style={{ width: '100%' }}
                        />
                    );
                }
                const staff = staffList?.find((item) => item.lv001 === val);
                return staff ? `${staff.lv001} - ${staff.lv002}` : val || '—';
            }
        },
        {
            title: 'Phòng ban',
            dataIndex: 'lv004',
            key: 'lv004',
            width: 220,
            render: (val, record) => {
                if (record.isQuickRow) {
                    return (
                        <SelectPhongBan
                            size="small"
                            value={quickRowData.lv004}
                            onChange={(v) => setQuickRowData({ ...quickRowData, lv004: v })}
                            style={{ width: '100%' }}
                        />
                    );
                }
                const dept = deptList?.find((item) => item.lv001 === val);
                return <span style={{ fontWeight: 500 }}>{dept ? `${dept.lv001} - ${dept.lv002}` : val || '—'}</span>;
            }
        },
        {
            title: 'Ghi chú',
            dataIndex: 'lv010',
            key: 'lv010',
            ellipsis: true,
            width: 260,
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
                return <Tooltip title={val}><span>{val || '—'}</span></Tooltip>;
            }
        },
        {
            title: 'Người tạo',
            dataIndex: 'ten_nhan_vien',
            key: 'ten_nhan_vien',
            width: 140,
            align: 'center',
            render: (val, record) => {
                if (record.isQuickRow) return <span style={{ color: '#8c8c8c' }}>Tự động</span>;
                return val || record.lv011 || '—';
            }
        },
        {
            title: 'Ngày tạo',
            dataIndex: 'lv012',
            key: 'lv012',
            width: 150,
            align: 'center',
            render: (val, record) => {
                if (record.isQuickRow) return <span style={{ color: '#8c8c8c' }}>Tự động</span>;
                return val || '—';
            }
        },
        {
            title: 'Tên dự án',
            dataIndex: 'lv809',
            key: 'lv809',
            width: 140,
            align: 'center',
            render: (val, record) => {
                if (record.isQuickRow) return <span style={{ color: '#8c8c8c' }}>{planId}</span>;
                const info = TRANG_THAI_MAP[String(val ?? '')];
                return info ? <Tag color={info.color}>{info.label}</Tag> : <Tag>{val ?? '—'}</Tag>;
            }
        },
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
                columns={columns} dataSource={planId ? [{ isQuickRow: true, lv001: 'QUICK', key: 'QUICK' }, ...filteredRows] : filteredRows} loading={loading}
                size="small" bordered
                rowSelection={planId ? {
                    selectedRowKeys,
                    onChange: setSelectedRowKeys,
                    getCheckboxProps: (record) => ({
                        disabled: record.isQuickRow,
                    }),
                } : undefined}
                pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t) => `Tổng: ${planId ? t - 1 : t} dòng` }}
                scroll={{ x: 1300 }}
                locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={`Không có dữ liệu ${TAB_LABEL}`} /> }}
                onRow={(record) => ({
                    onDoubleClick: () => {
                        if (record.isQuickRow) return;
                        if (planId) openEdit(record);
                    }
                })}
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
                    <Form.Item name="lv002" label="Mã kế hoạch">
                        <Input disabled />
                    </Form.Item>
                    <Form.Item name="lv809" label="Tên dự án">
                        <Input disabled />
                    </Form.Item>
                    <Form.Item name="lv003" label="Người tham gia" rules={[{ required: true, message: 'Chọn người tham gia' }]}>
                        <SelectNhanVien
                            onChange={(val) => {
                                const staff = staffList?.find((item) => item.lv001 === val);
                                if (staff) {
                                    form.setFieldsValue({ lv004: staff.lv029 });
                                }
                            }}
                        />
                    </Form.Item>
                    <Form.Item name="lv004" label="Phòng ban">
                        <SelectPhongBan />
                    </Form.Item>
                    <Form.Item name="lv010" label="Ghi chú">
                        <Input.TextArea rows={3} placeholder="Ghi chú..." />
                    </Form.Item>
                    <Form.Item name="lv011" label="Người tạo">
                        <Input disabled />
                    </Form.Item>
                    <Form.Item name="lv012" label="Ngày tạo">
                        <Input disabled />
                    </Form.Item>
                </Form>
            </Drawer>
        </Space>
    );
};

export default DSNhanVienThamGiaTab;
