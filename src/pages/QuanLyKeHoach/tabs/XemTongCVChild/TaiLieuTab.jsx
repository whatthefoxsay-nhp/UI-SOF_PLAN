import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Checkbox, Form, Input, Modal, Popconfirm, Space, Table, Tooltip, Typography, message } from 'antd';
import { Edit, Plus, RefreshCw, Search, Trash2, Upload } from 'lucide-react';
import styles from '../../QuanLyKeHoach.module.css';
import { loadChildData, mutateChildData, rowKey, withQuickRow } from './childApi';
import SelectTaiLieu from '../../../../components/DropDown/SelectTaiLieu';
import { useMasterData } from '../../../../hooks/useApiQueries';

const { Text } = Typography;
const VTABLE = 'xem_tong_cv_tai_lieu';

const TaiLieuTab = ({ task, planId, stageId }) => {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [selectedRowKeys, setSelectedRowKeys] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);
    const [form] = Form.useForm();

    const [quickRow, setQuickRow] = useState({
        lv003: '',
        lv004: '',
        lv005: '',
        lv006: '',
        lv007: true,
    });

    const { data: taiLieuList } = useMasterData('hr_lv0040', 'TaiLieu');

    const loadData = useCallback(async () => {
        if (!task?.lv001) return;
        setLoading(true);
        try {
            const data = await loadChildData(VTABLE, { workId: task.lv001, planId, stageId });
            setRows(data.rows);
        } finally {
            setLoading(false);
        }
    }, [task?.lv001, planId, stageId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const runAction = async (vfunc, payload) => {
        setLoading(true);
        try {
            const res = await mutateChildData(VTABLE, vfunc, payload);
            if (res?.success) {
                await loadData();
            }
            return res;
        } finally {
            setLoading(false);
        }
    };

    // Filter rows based on search text
    const filteredRows = useMemo(() => {
        const kw = searchText.trim().toLowerCase();
        if (!kw) return rows;
        return rows.filter((r) => {
            const typeItem = taiLieuList?.find((t) => t.lv001 === r.lv003);
            const typeName = typeItem ? `${typeItem.lv001} ${typeItem.lv002}` : '';
            return (
                (r.lv001 && r.lv001.toLowerCase().includes(kw)) ||
                (r.lv003 && r.lv003.toLowerCase().includes(kw)) ||
                (typeName && typeName.toLowerCase().includes(kw)) ||
                (r.lv004 && r.lv004.toLowerCase().includes(kw)) ||
                (r.lv005 && r.lv005.toLowerCase().includes(kw)) ||
                (r.lv006 && r.lv006.toLowerCase().includes(kw)) ||
                (r.lv010 && r.lv010.toLowerCase().includes(kw)) ||
                (r.ten_nguoi_tao && r.ten_nguoi_tao.toLowerCase().includes(kw))
            );
        });
    }, [rows, searchText, taiLieuList]);

    // Handle Quick Row Insert
    const handleQuickInsert = async () => {
        if (!quickRow.lv004) {
            message.warning('Vui lòng nhập tên tài liệu để thêm nhanh!');
            return;
        }
        const payloadData = {
            ...quickRow,
            lv002: task.lv001,
            lv007: quickRow.lv007 ? '1' : '0',
        };
        const res = await runAction('insert', { workId: task.lv001, planId, stageId, data: payloadData });
        if (res?.success) {
            setQuickRow({ lv003: '', lv004: '', lv005: '', lv006: '', lv007: true });
        }
    };

    // Toggle Display (lv007) directly in table row
    const handleToggleDisplay = async (record, checked) => {
        const payloadData = {
            ...record,
            lv002: task.lv001,
            lv007: checked ? '1' : '0',
        };
        await runAction('update', { workId: task.lv001, planId, stageId, data: payloadData });
    };

    // Open Modal for Create
    const handleOpenAdd = () => {
        setEditingRecord(null);
        form.resetFields();
        form.setFieldsValue({
            lv003: '',
            lv004: '',
            lv005: '',
            lv006: '',
            lv007: true,
        });
        setModalOpen(true);
    };

    // Open Modal for Edit
    const handleOpenEdit = (recordToEdit) => {
        const record = recordToEdit && recordToEdit.lv001 ? recordToEdit : rows.find((r) => r.lv001 === selectedRowKeys[0]);
        if (!record || record.isQuickRow) return;
        setEditingRecord(record);
        form.resetFields();
        form.setFieldsValue({
            lv003: record.lv003 || '',
            lv004: record.lv004 || '',
            lv005: record.lv005 || '',
            lv006: record.lv006 || '',
            lv007: String(record.lv007 || '') === '1',
        });
        setModalOpen(true);
    };

    // Save Modal (Create / Update)
    const handleSaveModal = async () => {
        try {
            const values = await form.validateFields();
            const payloadData = {
                ...values,
                lv002: task.lv001,
                lv007: values.lv007 ? '1' : '0',
            };

            if (editingRecord) {
                payloadData.lv001 = editingRecord.lv001;
                const res = await runAction('update', { workId: task.lv001, planId, stageId, data: payloadData });
                if (res?.success) {
                    setModalOpen(false);
                    setSelectedRowKeys([]);
                }
            } else {
                const res = await runAction('insert', { workId: task.lv001, planId, stageId, data: payloadData });
                if (res?.success) {
                    setModalOpen(false);
                    setSelectedRowKeys([]);
                }
            }
        } catch (e) {
            console.error('Validation failed:', e);
        }
    };

    // Batch Delete selected rows
    const handleBatchDelete = async () => {
        if (!selectedRowKeys.length) return;
        setLoading(true);
        try {
            let successCount = 0;
            for (const id of selectedRowKeys) {
                const res = await mutateChildData(VTABLE, 'delete', { lv001: id });
                if (res?.success) successCount++;
            }
            setSelectedRowKeys([]);
            await loadData();
        } finally {
            setLoading(false);
        }
    };

    // Table Columns
    const columns = [
        {
            title: 'STT',
            width: 60,
            align: 'center',
            render: (_, record, index) => {
                if (record.isQuickRow) {
                    return (
                        <Tooltip title="Thêm nhanh tài liệu">
                            <Button
                                type="primary"
                                size="small"
                                shape="circle"
                                icon={<Plus size={14} />}
                                onClick={handleQuickInsert}
                                disabled={!quickRow.lv004}
                            />
                        </Tooltip>
                    );
                }
                return index;
            },
        },
        {
            title: 'Mã tài liệu',
            dataIndex: 'lv001',
            width: 130,
            render: (value, record) => {
                if (record.isQuickRow) return <Text type="secondary">Tự động</Text>;
                return <Text strong>{value}</Text>;
            },
        },
        {
            title: 'Loại tài liệu',
            dataIndex: 'lv003',
            width: 180,
            render: (value, record) => {
                if (record.isQuickRow) {
                    return (
                        <SelectTaiLieu
                            size="small"
                            placeholder="Loại tài liệu"
                            value={quickRow.lv003}
                            onChange={(val) => setQuickRow({ ...quickRow, lv003: val })}
                            style={{ width: '100%' }}
                            allowClear
                        />
                    );
                }
                const found = taiLieuList?.find((item) => item.lv001 === value);
                return found ? `${found.lv001}-${found.lv002}` : (value || <Text type="secondary">-</Text>);
            },
        },
        {
            title: 'Tên tài liệu',
            dataIndex: 'lv004',
            render: (value, record) => {
                if (record.isQuickRow) {
                    return (
                        <Input
                            size="small"
                            placeholder="Tên tài liệu..."
                            value={quickRow.lv004}
                            onChange={(e) => setQuickRow({ ...quickRow, lv004: e.target.value })}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleQuickInsert();
                            }}
                        />
                    );
                }
                return value || <Text type="secondary">-</Text>;
            },
        },
        {
            title: 'Ghi chú',
            dataIndex: 'lv005',
            render: (value, record) => {
                if (record.isQuickRow) {
                    return (
                        <Input
                            size="small"
                            placeholder="Ghi chú..."
                            value={quickRow.lv005}
                            onChange={(e) => setQuickRow({ ...quickRow, lv005: e.target.value })}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleQuickInsert();
                            }}
                        />
                    );
                }
                return value || <Text type="secondary">-</Text>;
            },
        },
        {
            title: 'Loại file',
            dataIndex: 'lv006',
            width: 110,
            render: (value, record) => {
                if (record.isQuickRow) {
                    return (
                        <Input
                            size="small"
                            placeholder="pdf, doc..."
                            value={quickRow.lv006}
                            onChange={(e) => setQuickRow({ ...quickRow, lv006: e.target.value })}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleQuickInsert();
                            }}
                        />
                    );
                }
                return value || <Text type="secondary">-</Text>;
            },
        },
        {
            title: 'Hiển thị',
            dataIndex: 'lv007',
            width: 90,
            align: 'center',
            render: (value, record) => {
                if (record.isQuickRow) {
                    return (
                        <Checkbox
                            checked={!!quickRow.lv007}
                            onChange={(e) => setQuickRow({ ...quickRow, lv007: e.target.checked })}
                        />
                    );
                }
                return (
                    <Checkbox
                        checked={String(value || '') === '1'}
                        onChange={(e) => handleToggleDisplay(record, e.target.checked)}
                    />
                );
            },
        },
        {
            title: 'Người tạo',
            dataIndex: 'ten_nguoi_tao',
            width: 150,
            render: (value, record) => {
                if (record.isQuickRow) return <Text type="secondary">Tự động</Text>;
                return value || record.lv009 || <Text type="secondary">-</Text>;
            },
        },
        {
            title: 'Ngày tạo',
            dataIndex: 'lv010',
            width: 160,
            render: (value, record) => {
                if (record.isQuickRow) return <Text type="secondary">Tự động</Text>;
                return value || <Text type="secondary">-</Text>;
            },
        },
    ];

    return (
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
            {/* ACTION REGION & SEARCH BAR */}
            <div className={styles.toolbarRow}>
                <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}>
                    {/* Search Input */}
                    <Input
                        allowClear
                        prefix={<Search size={16} style={{ color: '#8c8c8c' }} />}
                        placeholder="Tìm kiếm tài liệu..."
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        style={{ width: 240 }}
                    />

                    {/* Chức năng: Thêm / Sửa / Xóa / Upload / Refresh */}
                    <Space wrap>
                        <Button
                            type="primary"
                            icon={<Plus size={16} />}
                            onClick={handleOpenAdd}
                        >
                            Thêm
                        </Button>
                        <Button
                            icon={<Edit size={16} />}
                            disabled={selectedRowKeys.length !== 1}
                            onClick={() => handleOpenEdit()}
                        >
                            Sửa
                        </Button>
                        <Popconfirm
                            title="Xóa tài liệu"
                            description={`Bạn có chắc muốn xóa ${selectedRowKeys.length} tài liệu đã chọn?`}
                            onConfirm={handleBatchDelete}
                            disabled={selectedRowKeys.length === 0}
                            okText="Đồng ý"
                            cancelText="Hủy"
                        >
                            <Button
                                danger
                                icon={<Trash2 size={16} />}
                                disabled={selectedRowKeys.length === 0}
                            >
                                Xóa
                            </Button>
                        </Popconfirm>
                        <Tooltip title="Tải tài liệu lên server">
                            <Button
                                icon={<Upload size={16} />}
                                onClick={() => message.info('Server lưu trữ tài liệu chưa sẵn sàng!')}
                            >
                                Upload
                            </Button>
                        </Tooltip>
                        <Tooltip title="Tải lại dữ liệu">
                            <Button
                                icon={<RefreshCw size={16} />}
                                onClick={loadData}
                                loading={loading}
                            />
                        </Tooltip>
                    </Space>
                </Space>
            </div>

            {/* MAIN TABLE */}
            <div className={styles.mainTable}>
                <Table
                    rowKey={(record) => rowKey(record, 'TL')}
                    rowClassName={(record) => (record.isQuickRow ? styles.quickRow : '')}
                    columns={columns}
                    dataSource={withQuickRow(filteredRows)}
                    loading={loading}
                    size="small"
                    bordered
                    rowSelection={{
                        selectedRowKeys,
                        onChange: setSelectedRowKeys,
                        getCheckboxProps: (record) => ({
                            disabled: record.isQuickRow,
                        }),
                    }}
                    pagination={{ pageSize: 8, showSizeChanger: true }}
                    scroll={{ x: 1150 }}
                    onRow={(record) => ({
                        onDoubleClick: () => {
                            if (record.isQuickRow) return;
                            handleOpenEdit(record);
                        },
                    })}
                />
            </div>

            {/* CREATE / EDIT MODAL */}
            <Modal
                title={editingRecord ? `Sửa tài liệu: ${editingRecord.lv001}` : 'Thêm tài liệu mới'}
                open={modalOpen}
                onOk={handleSaveModal}
                onCancel={() => setModalOpen(false)}
                confirmLoading={loading}
                okText={editingRecord ? 'Cập nhật' : 'Thêm mới'}
                cancelText="Hủy"
                destroyOnClose
            >
                <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
                    <Form.Item
                        name="lv003"
                        label="Loại tài liệu"
                        rules={[{ required: true, message: 'Vui lòng chọn loại tài liệu!' }]}
                    >
                        <SelectTaiLieu placeholder="Chọn loại tài liệu" allowClear />
                    </Form.Item>
                    <Form.Item
                        name="lv004"
                        label="Tên tài liệu"
                        rules={[{ required: true, message: 'Vui lòng nhập tên tài liệu!' }]}
                    >
                        <Input placeholder="Tên tài liệu..." />
                    </Form.Item>
                    <Form.Item name="lv005" label="Ghi chú">
                        <Input.TextArea rows={3} placeholder="Ghi chú..." />
                    </Form.Item>
                    <Form.Item name="lv006" label="Loại file">
                        <Input placeholder="Ví dụ: pdf, doc, xlsx..." />
                    </Form.Item>
                    <Form.Item name="lv007" valuePropName="checked" label="Hiển thị">
                        <Checkbox>Hiển thị tài liệu này</Checkbox>
                    </Form.Item>
                </Form>
            </Modal>
        </Space>
    );
};

export default TaiLieuTab;
