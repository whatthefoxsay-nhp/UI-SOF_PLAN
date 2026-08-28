import React, { useEffect, useMemo, useState } from 'react';
import {
    AutoComplete,
    Button,
    DatePicker,
    Drawer,
    Empty,
    Form,
    Input,
    Modal,
    Select,
    Space,
    Table,
    Tag,
    Tooltip,
    Typography,
    message,
} from 'antd';
import dayjs from 'dayjs';
import { Edit, Lock, Plus, RefreshCw, Save, Search, Trash2, Unlock, X } from 'lucide-react';
import { execCRUD } from '../../../services/apiServices';
import styles from '../QuanLyKeHoach.module.css';

const { Text } = Typography;

const CHILD_KEY = 'contracts';
const TAB_LABEL = 'Hợp đồng';
const TAB_MODULE = 'sl_lv0013/sl_lv0013-1.php';

const APPROVAL_MAP = {
    0: { label: 'Chưa duyệt', color: 'default' },
    1: { label: 'Đã duyệt cấp 1', color: 'processing' },
    2: { label: 'Đã duyệt cấp 2', color: 'cyan' },
    3: { label: 'Đã duyệt cấp 3', color: 'blue' },
    4: { label: 'Hoàn tất duyệt', color: 'success' },
};

const EMPTY_DATE_VALUES = new Set(['', '0000-00-00', '1900-01-01', '1900-01-01 00:00:00']);

const formatDate = (value) => {
    if (value == null || EMPTY_DATE_VALUES.has(String(value))) return '—';
    const date = dayjs(value);
    return date.isValid() ? date.format('DD/MM/YYYY') : value;
};

const formatMoney = (value) => {
    const amount = Number(String(value ?? '').replace(/,/g, ''));
    return Number.isFinite(amount) ? amount.toLocaleString('vi-VN') : '—';
};

const toDateValue = (value) => {
    if (value == null || EMPTY_DATE_VALUES.has(String(value))) return null;
    const date = dayjs(value);
    return date.isValid() ? date : null;
};

const HopDongTab = ({ detailData, onRefresh }) => {
    const planId = detailData?.plan?.lv001;
    const [rows, setRows] = useState([]);
    const [planJobs, setPlanJobs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [selectedRowKeys, setSelectedRowKeys] = useState([]);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);
    const [form] = Form.useForm();

    const contractMeta = detailData?.tabs?.contractMeta ?? {};
    const customers = Array.isArray(contractMeta.customers) ? contractMeta.customers : [];

    useEffect(() => {
        const raw = detailData?.tabs?.[CHILD_KEY] ?? detailData?.[CHILD_KEY] ?? [];
        setRows(Array.isArray(raw) ? raw.map((row, index) => ({ ...row, key: row.lv001 ?? index })) : []);
        setSelectedRowKeys([]);
    }, [detailData]);

    useEffect(() => {
        const fetchJobs = async () => {
            if (!planId) return;
            try {
                const response = await execCRUD('cr_lv0025_xemtongcv', 'load', { planId });
                let parsedRes = response;
                if (typeof response === 'string') {
                    try {
                        parsedRes = JSON.parse(response.trim());
                    } catch (e) {
                        console.error('Lỗi phân tích JSON:', e);
                    }
                }
                if (parsedRes && parsedRes.success) {
                    let rows = [];
                    if (Array.isArray(parsedRes.rows)) {
                        rows = parsedRes.rows;
                    } else if (parsedRes.rows && typeof parsedRes.rows === 'object') {
                        rows = Object.values(parsedRes.rows);
                    }
                    setPlanJobs(rows);
                } else {
                    setPlanJobs([]);
                }
            } catch (error) {
                console.error('Lỗi khi tải danh sách công việc:', error);
                setPlanJobs([]);
            }
        };
        fetchJobs();
    }, [planId]);

    const filteredRows = useMemo(() => {
        const keyword = searchText.trim().toLowerCase();
        if (!keyword) return rows;
        return rows.filter((row) => Object.values(row || {}).some(
            (value) => String(value ?? '').toLowerCase().includes(keyword),
        ));
    }, [rows, searchText]);

    const selectedRecords = useMemo(
        () => rows.filter((row) => selectedRowKeys.includes(row.lv001)),
        [rows, selectedRowKeys],
    );
    const selectedRecord = selectedRecords.length === 1 ? selectedRecords[0] : null;
    const selectedRecordLocked = Number(selectedRecord?.lv011 || 0) > 0;

    const jobOptions = useMemo(() => planJobs.map((job) => {
        const jobId = job.lv001 ?? job[0];
        const jobType = job.ten_loai_cong_viec ?? job.job_type ?? job.lv003 ?? job[2] ?? '';
        const jobName = job.lv004 ?? job.job_name ?? job[4] ?? '';
        return {
            value: String(jobId),
            label: `${jobType} - ${jobName} (${jobId})`,
        };
    }), [planJobs]);

    const customerOptions = useMemo(() => customers.map((customer) => ({
        value: String(customer.lv001),
        label: customer.lv002 ? `${customer.lv002} (${customer.lv001})` : String(customer.lv001),
    })), [customers]);

    const callAction = async (func, childId, data = {}) => {
        if (!planId) {
            message.warning('Thiếu mã kế hoạch');
            return false;
        }
        setLoading(true);
        try {
            const response = await execCRUD('cr_lv0094_detail', func, {
                lv001: planId,
                planId,
                childKey: CHILD_KEY,
                childId: childId ?? '',
                data,
            });
            if (response?.success === false) {
                message.error(response.message || 'Thao tác thất bại');
                return false;
            }
            setSelectedRowKeys([]);
            await onRefresh?.();
            return true;
        } catch (error) {
            message.error(`Lỗi kết nối: ${error.message}`);
            return false;
        } finally {
            setLoading(false);
        }
    };

    const openCreate = () => {
        if (!planJobs.length) {
            message.warning('Kế hoạch chưa có công việc');
            return;
        }
        setEditingRecord(null);
        form.resetFields();
        form.setFieldsValue({
            lv114: jobOptions[0]?.value,
            lv004: dayjs(),
            lv005: null,
            lv024: '0',
        });
        setDrawerOpen(true);
    };

    const openEdit = (record) => {
        if (Number(record.lv011 || 0) > 0) {
            message.warning('Hợp đồng đã duyệt. Hủy duyệt trước khi chỉnh sửa');
            return;
        }
        setEditingRecord(record);
        form.resetFields();
        form.setFieldsValue({
            lv114: record.lv114 ? String(record.lv114) : undefined,
            lv002: record.lv002 || '',
            lv003: record.lv003 || '',
            lv004: toDateValue(record.lv004),
            lv005: toDateValue(record.lv005),
            lv006: record.lv006 || '',
            lv009: record.lv009 || '',
            lv010: record.lv010 || '',
            lv012: record.lv012 || '',
            lv013: record.lv013 || '',
            lv014: record.lv014 || '',
            lv016: record.lv016 || '',
            lv022: record.lv022 || '',
            lv024: String(record.lv024 ?? '0'),
        });
        setDrawerOpen(true);
    };

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            const data = {
                ...values,
                lv004: values.lv004?.format('YYYY-MM-DD') || '',
                lv005: values.lv005?.format('YYYY-MM-DD') || '',
            };
            const success = await callAction(
                editingRecord ? 'childUpdate' : 'childInsert',
                editingRecord?.lv001 ?? '',
                data,
            );
            if (success) {
                message.success(editingRecord ? 'Đã cập nhật hợp đồng' : 'Đã thêm hợp đồng');
                setDrawerOpen(false);
            }
        } catch (error) {
            if (error?.errorFields) return;
            message.error(error.message || 'Không thể lưu hợp đồng');
        }
    };

    const handleBatchAction = (func, label) => {
        if (!selectedRowKeys.length) {
            message.warning('Chọn ít nhất một hợp đồng');
            return;
        }
        if (func === 'childDelete' && selectedRecords.some((record) => Number(record.lv011 || 0) > 0)) {
            message.warning('Không thể xóa hợp đồng đã duyệt');
            return;
        }
        Modal.confirm({
            title: label,
            content: `Thực hiện "${label}" cho ${selectedRowKeys.length} hợp đồng?`,
            okText: 'Xác nhận',
            cancelText: 'Hủy',
            onOk: async () => {
                let succeeded = 0;
                for (const id of selectedRowKeys) {
                    if (await callAction(func, id)) succeeded += 1;
                }
                if (succeeded) message.success(`Đã xử lý ${succeeded} hợp đồng`);
            },
        });
    };

    const columns = [
        {
            title: 'STT',
            key: 'stt',
            width: 58,
            align: 'center',
            fixed: 'left',
            render: (_, __, index) => index + 1,
        },
        {
            title: 'Mã phiếu',
            dataIndex: 'lv001',
            key: 'lv001',
            width: 100,
            fixed: 'left',
            render: (value) => <Text strong style={{ color: '#1677ff' }}>{value}</Text>,
        },
        {
            title: 'Công việc',
            dataIndex: 'job_name',
            key: 'job_name',
            width: 200,
            ellipsis: true,
            render: (value, record) => (
                <Tooltip title={`${record.lv114 || ''} - ${value || ''}`}>
                    <Space size={4}>
                        <Tag color="blue">{record.job_type || 'HĐ'}</Tag>
                        <span>{value || record.lv114 || '—'}</span>
                    </Space>
                </Tooltip>
            ),
        },
        {
            title: 'PBH Số',
            dataIndex: 'lv115',
            key: 'lv115',
            width: 150,
            ellipsis: true,
            render: (value) => value || '—',
        },
        {
            title: 'HĐKT Số',
            dataIndex: 'lv014',
            key: 'lv014',
            width: 150,
            ellipsis: true,
            render: (value) => value || '—',
        },
        {
            title: 'PLHĐKT',
            dataIndex: 'lv225',
            key: 'lv225',
            width: 120,
            render: (value) => value || '—',
        },
        {
            title: 'PO Số',
            dataIndex: 'lv214',
            key: 'lv214',
            width: 120,
            render: (value) => value || '—',
        },
        {
            title: 'Số PBH Mẫu',
            dataIndex: 'lv212',
            key: 'lv212',
            width: 120,
            render: (value) => value || '—',
        },
        {
            title: 'Số BM/MR',
            dataIndex: 'lv224',
            key: 'lv224',
            width: 120,
            render: (value) => value || '—',
        },
        {
            title: 'Tên hợp đồng / nội dung',
            dataIndex: 'lv003',
            key: 'lv003',
            width: 250,
            ellipsis: true,
            render: (value) => <Tooltip title={value}><span>{value || '—'}</span></Tooltip>,
        },
        {
            title: 'Khách hàng',
            dataIndex: 'customer_name',
            key: 'customer_name',
            width: 210,
            ellipsis: true,
            render: (value, record) => value || record.lv002 || '—',
        },
        {
            title: 'Ngày bán hàng',
            dataIndex: 'lv004',
            key: 'lv004',
            width: 125,
            render: formatDate,
        },
        {
            title: 'Ngày yêu cầu',
            dataIndex: 'lv005',
            key: 'lv005',
            width: 120,
            render: formatDate,
        },
        {
            title: 'Ngày GH dự kiến',
            dataIndex: 'lv227',
            key: 'lv227',
            width: 130,
            render: formatDate,
        },
        {
            title: 'Tình trạng GH',
            dataIndex: 'lv228',
            key: 'lv228',
            width: 130,
            render: (value) => value || '—',
        },
        {
            title: 'Tình trạng đặt hàng',
            dataIndex: 'lv229',
            key: 'lv229',
            width: 150,
            render: formatDate,
        },
        {
            title: 'DK ngày hàng về từ',
            dataIndex: 'lv230',
            key: 'lv230',
            width: 150,
            render: formatDate,
        },
        {
            title: 'DK ngày hàng về đến',
            dataIndex: 'lv231',
            key: 'lv231',
            width: 150,
            render: (value) => value || '—',
        },
        {
            title: 'Giá trị',
            dataIndex: 'contract_amount',
            key: 'contract_amount',
            width: 145,
            align: 'right',
            render: (value) => <Text strong>{formatMoney(value)} đ</Text>,
        },
        {
            title: 'Số báo giá',
            dataIndex: 'lv010',
            key: 'lv010',
            width: 120,
            render: (value) => value || '—',
        },
        {
            title: 'Người xử lý',
            dataIndex: 'handler_name',
            key: 'handler_name',
            width: 160,
            render: (value, record) => value || record.lv006 || '—',
        },
        {
            title: 'Admin',
            dataIndex: 'lv016',
            key: 'lv016',
            width: 120,
            render: (value) => value || '—',
        },
        {
            title: 'Ref.',
            dataIndex: 'lv700',
            key: 'lv700',
            width: 150,
            ellipsis: true,
            render: (value) => value || '—',
        },
        {
            title: 'Người tạo',
            dataIndex: 'creator_name',
            key: 'creator_name',
            width: 150,
            render: (value, record) => value || record.lv023 || '—',
        },
        {
            title: 'Độ ưu tiên',
            dataIndex: 'lv024',
            key: 'lv024',
            width: 110,
            render: (value) => String(value) === '1' ? <Tag color="red">Ưu tiên</Tag> : 'Bình thường',
        },
        {
            title: 'Ghi chú',
            dataIndex: 'lv009',
            key: 'lv009',
            width: 200,
            ellipsis: true,
            render: (value) => value || '—',
        },
        {
            title: 'Trạng thái',
            dataIndex: 'lv011',
            key: 'lv011',
            width: 135,
            align: 'center',
            fixed: 'right',
            render: (value) => {
                const status = APPROVAL_MAP[Number(value)] || { label: `Mức ${value}`, color: 'default' };
                return <Tag color={status.color}>{status.label}</Tag>;
            },
        },
    ];

    return (
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <div className={styles.toolbarRow}>
                <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}>
                    <Space wrap>
                        <Text strong>{TAB_LABEL}</Text>
                        <Tag>{TAB_MODULE}</Tag>
                        <Text type="secondary">{filteredRows.length} dòng</Text>
                        <Text type="secondary">{planJobs.length} công việc</Text>
                    </Space>
                    <Space wrap>
                        <Input
                            allowClear
                            prefix={<Search size={15} />}
                            placeholder="Lọc mã, khách hàng, tên hợp đồng..."
                            value={searchText}
                            onChange={(event) => setSearchText(event.target.value)}
                            style={{ width: 290 }}
                        />
                        <Button icon={<RefreshCw size={16} />} onClick={() => onRefresh?.()} loading={loading}>
                            Tải lại
                        </Button>
                        <Tooltip title={!planJobs.length ? 'Kế hoạch chưa có công việc' : ''}>
                            <Button
                                type="primary"
                                icon={<Plus size={16} />}
                                onClick={openCreate}
                                disabled={!planId || !planJobs.length}
                            >
                                Thêm mới
                            </Button>
                        </Tooltip>
                    </Space>
                </Space>
            </div>

            {!!planId && (
                <div className={`${styles.batchActionBar} ${!selectedRowKeys.length ? styles.batchActionBarDisabled : ''}`}>
                    <Text><b>{selectedRowKeys.length}</b> dòng đã chọn</Text>
                    <Button
                        type="primary"
                        ghost
                        icon={<Edit size={16} />}
                        disabled={!selectedRecord || selectedRecordLocked}
                        onClick={() => openEdit(selectedRecord)}
                    >
                        Chỉnh sửa
                    </Button>
                    <Button
                        icon={<Lock size={16} />}
                        disabled={!selectedRowKeys.length}
                        onClick={() => handleBatchAction('childApprove', 'Duyệt')}
                    >
                        Duyệt
                    </Button>
                    <Button
                        icon={<Unlock size={16} />}
                        disabled={!selectedRowKeys.length}
                        onClick={() => handleBatchAction('childUnapprove', 'Hủy duyệt')}
                    >
                        Hủy duyệt
                    </Button>
                    <Button
                        danger
                        icon={<Trash2 size={16} />}
                        disabled={!selectedRowKeys.length}
                        onClick={() => handleBatchAction('childDelete', 'Xóa')}
                    >
                        Xóa
                    </Button>
                </div>
            )}

            <Table
                className={styles.mainTable}
                rowKey={(record) => record.lv001}
                columns={columns}
                dataSource={filteredRows}
                loading={loading}
                size="small"
                bordered
                rowSelection={planId ? { selectedRowKeys, onChange: setSelectedRowKeys } : undefined}
                pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (total) => `Tổng: ${total} dòng` }}
                scroll={{ x: 4000 }}
                locale={{
                    emptyText: (
                        <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description={
                                planJobs.length
                                    ? 'Chưa có hợp đồng gắn với công việc của kế hoạch'
                                    : 'Kế hoạch chưa có công việc'
                            }
                        />
                    ),
                }}
                onRow={(record) => ({ onDoubleClick: () => openEdit(record) })}
            />

            <Drawer
                className={styles.khoDrawer}
                title={editingRecord ? `Sửa hợp đồng #${editingRecord.lv001}` : 'Thêm hợp đồng'}
                open={drawerOpen}
                width={720}
                onClose={() => setDrawerOpen(false)}
                destroyOnClose
                footer={(
                    <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                        <Button icon={<X size={16} />} onClick={() => setDrawerOpen(false)}>Hủy</Button>
                        <Button type="primary" icon={<Save size={16} />} onClick={handleSave} loading={loading}>
                            {editingRecord ? 'Cập nhật' : 'Thêm mới'}
                        </Button>
                    </Space>
                )}
            >
                <Form form={form} layout="vertical" className={styles.customForm}>
                    <Form.Item
                        name="lv114"
                        label="Công việc hợp đồng"
                        rules={[{ required: true, message: 'Chọn công việc hợp đồng' }]}
                    >
                        <Select dropdownMatchSelectWidth={false} showSearch optionFilterProp="label" options={jobOptions} placeholder="Chọn công việc thuộc kế hoạch" />
                    </Form.Item>
                    <Space align="start" size={12} style={{ width: '100%' }}>
                        <Form.Item name="lv014" label="Số hợp đồng" style={{ width: 230 }}>
                            <Input placeholder="Số hợp đồng / phiếu bán hàng" />
                        </Form.Item>
                        <Form.Item name="lv002" label="Khách hàng" style={{ width: 430 }}>
                            <AutoComplete
                                options={customerOptions}
                                filterOption={(input, option) => String(option?.label || '').toLowerCase().includes(input.toLowerCase())}
                                placeholder="Mã khách hàng"
                            />
                        </Form.Item>
                    </Space>
                    <Form.Item
                        name="lv003"
                        label="Tên hợp đồng / tên phiếu"
                        rules={[{ required: true, message: 'Nhập tên hợp đồng' }]}
                    >
                        <Input.TextArea rows={2} placeholder="Tên hoặc nội dung chính của hợp đồng" />
                    </Form.Item>
                    <Space align="start" size={12} style={{ width: '100%' }}>
                        <Form.Item
                            name="lv004"
                            label="Ngày hợp đồng"
                            rules={[{ required: true, message: 'Chọn ngày hợp đồng' }]}
                            style={{ width: 220 }}
                        >
                            <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
                        </Form.Item>
                        <Form.Item name="lv005" label="Ngày yêu cầu / hết hạn" style={{ width: 220 }}>
                            <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
                        </Form.Item>
                        <Form.Item name="lv024" label="Độ ưu tiên" style={{ width: 220 }}>
                            <Select
                                options={[
                                    { value: '0', label: 'Bình thường' },
                                    { value: '1', label: 'Ưu tiên' },
                                ]}
                            />
                        </Form.Item>
                    </Space>
                    <Space align="start" size={12} style={{ width: '100%' }}>
                        <Form.Item name="lv006" label="Người xử lý" style={{ width: 330 }}>
                            <Input placeholder="Mã nhân viên xử lý" />
                        </Form.Item>
                        <Form.Item name="lv016" label="Người phụ trách/duyệt" style={{ width: 330 }}>
                            <Input placeholder="Mã nhân viên" />
                        </Form.Item>
                    </Space>
                    <Space align="start" size={12} style={{ width: '100%' }}>
                        <Form.Item name="lv010" label="Báo giá tham chiếu" style={{ width: 330 }}>
                            <Input placeholder="Mã báo giá" />
                        </Form.Item>
                        <Form.Item name="lv012" label="Ngày/thông tin dự kiến" style={{ width: 330 }}>
                            <Input placeholder="Thông tin dự kiến" />
                        </Form.Item>
                    </Space>
                    <Form.Item name="lv013" label="Đối tượng / địa chỉ">
                        <Input placeholder="Đối tượng hoặc địa chỉ liên quan" />
                    </Form.Item>
                    <Form.Item name="lv009" label="Ghi chú">
                        <Input.TextArea rows={2} placeholder="Ghi chú hợp đồng" />
                    </Form.Item>
                    <Form.Item name="lv022" label="Điều khoản / thông tin bổ sung">
                        <Input.TextArea rows={3} placeholder="Điều khoản hoặc thông tin bổ sung" />
                    </Form.Item>
                </Form>
            </Drawer>
        </Space>
    );
};

export default HopDongTab;
