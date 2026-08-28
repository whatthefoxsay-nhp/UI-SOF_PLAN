import React, { useState, useMemo, useCallback } from 'react';
import { Table, Button, Space, Popconfirm, message, Drawer, Form, Card, Input, InputNumber, Select, Tooltip } from 'antd';
import { Plus, Edit, Trash2, RotateCw, Check, Sliders } from 'lucide-react';
import { lv_LoadDataAPI } from '../../../services/apiServices';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { useMasterData } from '../../../hooks/useApiQueries';
import ChiTietKPIForm from './ChiTietKPIForm';
import styles from '../../ChamCong&TienLuong/ThongTinCC/style.module.css';

const ChiTietKPI = ({ parentRecord }) => {
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [selectedRowKeys, setSelectedRowKeys] = useState([]);
    const [form] = Form.useForm();
    const queryClient = useQueryClient();

    // Fetch Criteria List for Quick Select
    const { data: criteriaList } = useMasterData('ki_lv0002_select', 'TieuChiKPI');

    // Quick Insert state
    const [quickRowData, setQuickRowData] = useState({
        lv003: undefined,
        lv004: 1,
        lv005: 0,
        lv006: '',
    });

    const table = 'ki_lv0004';
    const func = 'DataView';

    const { data: listData = [], isLoading: loading, refetch: loadData } = useQuery({
        queryKey: ['ki_lv0004', parentRecord?.lv001],
        queryFn: async () => {
            const filter = parentRecord?.lv001 ? { lv002: parentRecord.lv001 } : {};
            const data = await lv_LoadDataAPI(table, 'load' + func, filter);

            if (data && Array.isArray(data)) {
                return data.map(item => ({
                    ...item,
                    key: item.lv001
                }));
            }
            return [];
        }
    });

    const handleAdd = () => {
        setEditingItem(null);
        form.resetFields();
        if (parentRecord?.lv001) {
            form.setFieldsValue({ lv002: parentRecord.lv001 });
        }
        setIsModalVisible(true);
    };

    const handleEdit = (record) => {
        setEditingItem(record);
        form.setFieldsValue(record);
        setIsModalVisible(true);
    };

    const deleteMutation = useMutation({
        mutationFn: async (record) => {
            await lv_LoadDataAPI(table, 'delete', { lv001: record.lv001 });
        },
        onSuccess: () => {
            message.success('Xóa thành công');
            queryClient.invalidateQueries({ queryKey: ['ki_lv0004', parentRecord?.lv001] });
        },
        onError: (error) => {
            console.error('Error deleting:', error);
            message.error('Không thể xóa chi tiết này');
        }
    });

    const handleDelete = async (record) => {
        deleteMutation.mutate(record);
    };

    const handleBatchDelete = useCallback(async () => {
        if (selectedRowKeys.length === 0) return;
        try {
            for (const key of selectedRowKeys) {
                await lv_LoadDataAPI(table, 'delete', { lv001: key });
            }
            message.success(`Đã xóa thành công ${selectedRowKeys.length} chi tiết`);
            setSelectedRowKeys([]);
            queryClient.invalidateQueries({ queryKey: ['ki_lv0004', parentRecord?.lv001] });
        } catch (error) {
            console.error('Batch Delete Error:', error);
            message.error('Lỗi khi xóa hàng loạt');
        }
    }, [selectedRowKeys, queryClient, parentRecord]);

    const handleBatchEdit = () => {
        if (selectedRowKeys.length !== 1) {
            message.info('Vui lòng chọn duy nhất 1 chi tiết để sửa');
            return;
        }
        const record = listData.find(item => item.lv001 === selectedRowKeys[0]);
        if (record) handleEdit(record);
    };

    const saveMutation = useMutation({
        mutationFn: async ({ isEdit, payload }) => {
            if (isEdit) {
                await lv_LoadDataAPI(table, 'update', payload);
                return { isEdit: true };
            } else {
                const res = await lv_LoadDataAPI(table, 'add', payload);
                if (res === -2) throw new Error('Dữ liệu đã tồn tại');
                if (!res) throw new Error('Thêm thất bại');
                return { isEdit: false };
            }
        },
        onSuccess: (data) => {
            message.success(data.isEdit ? 'Cập nhật thành công' : 'Thêm thành công');
            setIsModalVisible(false);
            setQuickRowData({
                lv003: undefined,
                lv004: 1,
                lv005: 0,
                lv006: '',
            });
            queryClient.invalidateQueries({ queryKey: ['ki_lv0004', parentRecord?.lv001] });
        },
        onError: (error) => {
            console.error('Error saving:', error);
            message.error(error.message || 'Có lỗi xảy ra');
        }
    });

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            const payload = { ...values };
            if (parentRecord?.lv001) {
                payload.lv002 = parentRecord.lv001;
            }

            if (editingItem) {
                payload.lv001 = editingItem.lv001;
            }

            saveMutation.mutate({ isEdit: !!editingItem, payload });
        } catch (error) {
            console.error('Validate Failed:', error);
        }
    };

    const handleQuickSubmit = async () => {
        if (!quickRowData.lv003) {
            message.warning('Vui lòng chọn tiêu chí để thêm nhanh!');
            return;
        }
        const payload = {
            lv002: parentRecord.lv001,
            lv003: quickRowData.lv003,
            lv004: quickRowData.lv004 ?? 1,
            lv005: quickRowData.lv005 ?? 0,
            lv006: quickRowData.lv006 ?? '',
        };
        saveMutation.mutate({ isEdit: false, payload });
    };

    const totalDefault = useMemo(() => {
        return listData.reduce((sum, item) => sum + (parseFloat(item.lv005) || 0), 0);
    }, [listData]);

    const columns = [
        {
            title: 'STT',
            key: 'stt',
            width: 80,
            align: 'center',
            render: (_, record, index) => {
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
                return index;
            }
        },
        {
            title: 'Mã tự động',
            dataIndex: 'lv001',
            key: 'lv001',
            width: 100,
            render: (text, record) => {
                if (record.isQuickRow) return <span style={{ color: '#8c8c8c', fontStyle: 'italic' }}>Tự động</span>;
                return text;
            }
        },
        {
            title: 'KPI',
            key: 'parentName',
            width: 150,
            render: (text, record) => {
                if (record.isQuickRow) return parentRecord?.lv002 || parentRecord?.lv001 || '';
                return record.kpi_name || parentRecord?.lv002 || record.lv002;
            }
        },
        {
            title: 'Tiêu chí KPI',
            key: 'criteriaName',
            width: 220,
            render: (text, record) => {
                if (record.isQuickRow) {
                    return (
                        <Select
                            size="small"
                            showSearch
                            optionFilterProp="children"
                            placeholder="Chọn tiêu chí"
                            value={quickRowData.lv003}
                            onChange={(val) => setQuickRowData({ ...quickRowData, lv003: val })}
                            filterOption={(input, option) =>
                                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                            }
                            options={criteriaList?.map(item => ({
                                value: item.lv001,
                                label: `${item.lv002} (${item.lv001})`
                            }))}
                            style={{ width: '100%', borderRadius: '4px' }}
                            dropdownMatchSelectWidth={false}
                        />
                    );
                }
                return record.criteria_name || record.lv003;
            }
        },
        {
            title: 'Hệ số tính',
            dataIndex: 'lv004',
            key: 'lv004',
            width: 100,
            render: (text, record) => {
                if (record.isQuickRow) {
                    return (
                        <InputNumber
                            size="small"
                            min={0}
                            value={quickRowData.lv004}
                            onChange={(val) => setQuickRowData({ ...quickRowData, lv004: val })}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleQuickSubmit();
                            }}
                            style={{ width: '100%', borderRadius: '4px' }}
                        />
                    );
                }
                return text;
            }
        },
        {
            title: 'Giá trị mặc định',
            dataIndex: 'lv005',
            key: 'lv005',
            width: 130,
            render: (text, record) => {
                if (record.isQuickRow) {
                    return (
                        <InputNumber
                            size="small"
                            value={quickRowData.lv005}
                            onChange={(val) => setQuickRowData({ ...quickRowData, lv005: val })}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleQuickSubmit();
                            }}
                            style={{ width: '100%', borderRadius: '4px' }}
                        />
                    );
                }
                return text;
            }
        },
        {
            title: 'Ghi chú',
            dataIndex: 'lv006',
            key: 'lv006',
            width: 200,
            render: (text, record) => {
                if (record.isQuickRow) {
                    return (
                        <Input
                            size="small"
                            placeholder="Ghi chú..."
                            value={quickRowData.lv006}
                            onChange={(e) => setQuickRowData({ ...quickRowData, lv006: e.target.value })}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleQuickSubmit();
                            }}
                            style={{ borderRadius: '4px' }}
                        />
                    );
                }
                return text;
            }
        }
    ];

    const rowSelection = {
        selectedRowKeys,
        onChange: (newSelectedRowKeys) => {
            setSelectedRowKeys(newSelectedRowKeys);
        },
        getCheckboxProps: (record) => ({
            disabled: record.isQuickRow,
        }),
    };

    return (
        <Card className={styles.mainCard} bordered={false}>
            <div className={styles.khoHeader} style={{ marginBottom: 16 }}>
                <div className={styles.khoTitle}>
                    <Sliders size={28} strokeWidth={1.5} />
                    <div>
                        <h2 className={styles.khoTitleText}>Chi Tiết KPI</h2>
                    </div>
                </div>
                <div className={styles.khoActions}>
                    <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#197dd3', marginRight: 16 }}>
                        Tổng giá trị mặc định: {totalDefault}
                    </span>
                    <Button icon={<RotateCw size={16} />} onClick={loadData}>Nạp lại</Button>
                    <Button type="primary" icon={<Plus size={16} />} onClick={handleAdd}>
                        Thêm mới
                    </Button>
                </div>
            </div>

            <div className={styles.batchActionBar}>
                <span style={{ fontWeight: 600, color: '#197dd3', marginRight: 8 }}>Thao tác hàng loạt:</span>
                <Button
                    icon={<Edit size={16} />}
                    disabled={selectedRowKeys.length !== 1}
                    onClick={handleBatchEdit}
                    type="primary"
                    ghost
                >
                    Chỉnh sửa
                </Button>
                <Popconfirm
                    title="Xóa chi tiết"
                    description={`Bạn có chắc muốn xóa ${selectedRowKeys.length} chi tiết đã chọn?`}
                    onConfirm={handleBatchDelete}
                    disabled={selectedRowKeys.length === 0}
                >
                    <Button
                        danger
                        icon={<Trash2 size={16} />}
                        disabled={selectedRowKeys.length === 0}
                    >
                        Xóa đã chọn
                    </Button>
                </Popconfirm>
                <span style={{ marginLeft: 'auto', color: '#8c8c8c' }}>
                    Đã chọn <b>{selectedRowKeys.length}</b> dòng
                </span>
            </div>

            <Table
                columns={columns}
                dataSource={[{ isQuickRow: true, lv001: 'QUICK_INSERT', key: 'QUICK_INSERT' }, ...listData]}
                loading={loading}
                pagination={false}
                size="small"
                className={styles.customTable}
                rowSelection={rowSelection}
                onRow={(record) => ({
                    onClick: (e) => {
                        if (record.isQuickRow) return;
                        if (e.target.closest('.ant-checkbox-wrapper') ||
                            e.target.closest('button') ||
                            e.target.closest('.ant-btn') ||
                            e.target.closest('.ant-input') ||
                            e.target.closest('.ant-select') ||
                            e.target.closest('.ant-input-number')) return;
                        handleEdit(record);
                    },
                    style: { cursor: record.isQuickRow ? 'default' : 'pointer' }
                })}
                summary={(pageData) => {
                    let total = 0;
                    // Exclude quick insert row in sum
                    pageData.filter(item => !item.isQuickRow).forEach(({ lv005 }) => {
                        total += parseFloat(lv005) || 0;
                    });
                    return (
                        <Table.Summary.Row>
                            <Table.Summary.Cell index={0} />
                            <Table.Summary.Cell index={1} colSpan={5} align="right"><span style={{ fontWeight: 'bold' }}>Tổng cộng:</span></Table.Summary.Cell>
                            <Table.Summary.Cell index={2}>
                                <span style={{ fontWeight: 'bold' }}>{total}</span>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={3} />
                        </Table.Summary.Row>
                    );
                }}
            />

            <Drawer
                title={
                    <Space>
                        {editingItem ? <Edit size={18} /> : <Plus size={18} />}
                        {editingItem ? "Sửa chi tiết" : "Thêm chi tiết"}
                    </Space>
                }
                placement="right"
                width={600}
                open={isModalVisible}
                onClose={() => setIsModalVisible(false)}
                className={styles.khoDrawer}
                destroyOnClose
                footer={
                    <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Button onClick={() => setIsModalVisible(false)}>Huỷ</Button>
                        <Button type="primary" onClick={handleSubmit} loading={saveMutation.isPending}>
                            {editingItem ? 'Cập nhật' : 'Thêm mới'}
                        </Button>
                    </Space>
                }
            >
                <ChiTietKPIForm
                    form={form}
                    onFinish={handleSubmit}
                    parentValues={parentRecord}
                />
            </Drawer>
        </Card>
    );
};

export default ChiTietKPI;
