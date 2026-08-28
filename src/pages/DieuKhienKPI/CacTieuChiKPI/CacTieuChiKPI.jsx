import React, { useState, useCallback, useMemo, useDeferredValue } from 'react';
import {
    Card, Breadcrumb, Table, Button, Space, Input, InputNumber,
    Popconfirm, message, Tooltip, Form, Drawer
} from 'antd';
import { HomeOutlined } from '@ant-design/icons';
import { Plus, Edit, Trash2, Sliders, Search, Check } from 'lucide-react';
import { lv_LoadDataAPI } from '../../../services/apiServices';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import CacTieuChiKPIForm from './CacTieuChiKPIForm';
import SelectKieuDanhGia from '../../../components/DropDown/SelectKieuDanhGia';
import SelectTieuChiKPI from '../../../components/DropDown/SelectTieuChiKPI';
import styles from '../../ChamCong&TienLuong/ThongTinCC/style.module.css';
import './CacTieuChiKPI.css';

const { Search: SearchInput } = Input;

const table = 'ki_lv0002';
const func = 'DataView';

const CacTieuChiKPI = () => {
    const [searchText, setSearchText] = useState('');
    const deferredSearchText = useDeferredValue(searchText);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [selectedRowKeys, setSelectedRowKeys] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [form] = Form.useForm();
    const queryClient = useQueryClient();

    // State cho Quick Insert
    const [quickRowData, setQuickRowData] = useState({
        lv001: '',
        lv002: '',
        lv003: '',
        lv004: undefined,
        lv009: undefined,
        lv010: undefined,
    });

    const { data: listData = [], isLoading: loading } = useQuery({
        queryKey: ['ki_lv0002', 'loadDataView'],
        queryFn: async () => {
            const data = await lv_LoadDataAPI(table, 'load' + func);
            if (data && Array.isArray(data)) {
                return data.map(item => ({
                    ...item,
                    key: item.lv001
                })).sort((a, b) => (a.lv010 - b.lv010) || a.lv001.localeCompare(b.lv001));
            }
            return [];
        }
    });

    const filteredList = useMemo(() => {
        if (!deferredSearchText) return listData;
        const lowerText = deferredSearchText.toLowerCase();
        return listData.filter((item) => {
            return (item.lv001?.toLowerCase().includes(lowerText) ||
                item.lv002?.toLowerCase().includes(lowerText));
        });
    }, [listData, deferredSearchText]);

    const dataSourceWithQuickRow = useMemo(() => {
        return [{ isQuickRow: true, lv001: 'QUICK_INSERT', key: 'QUICK_INSERT' }, ...filteredList];
    }, [filteredList]);

    const handleAdd = useCallback(() => {
        setEditingItem(null);
        form.resetFields();
        setIsModalVisible(true);
    }, [form]);

    const handleEdit = useCallback((record) => {
        setEditingItem(record);
        form.setFieldsValue({
            ...record,
        });
        setIsModalVisible(true);
    }, [form]);

    const deleteMutation = useMutation({
        mutationFn: async (record) => {
            await lv_LoadDataAPI(table, 'delete', { lv001: record.lv001 });
        },
        onSuccess: () => {
            message.success('Xóa thành công');
            queryClient.invalidateQueries({ queryKey: ['ki_lv0002'] });
            queryClient.invalidateQueries({ queryKey: ['masterData', 'TieuChiKPI'] });
        },
        onError: (error) => {
            console.error('Error deleting:', error);
            message.error('Không thể xóa tiêu chí này');
        }
    });

    const handleDelete = useCallback((record) => {
        deleteMutation.mutate(record);
    }, [deleteMutation]);

    const handleBatchDelete = useCallback(async () => {
        if (selectedRowKeys.length === 0) return;
        try {
            for (const key of selectedRowKeys) {
                await lv_LoadDataAPI(table, 'delete', { lv001: key });
            }
            message.success(`Đã xóa thành công ${selectedRowKeys.length} tiêu chí`);
            setSelectedRowKeys([]);
            queryClient.invalidateQueries({ queryKey: ['ki_lv0002'] });
            queryClient.invalidateQueries({ queryKey: ['masterData', 'TieuChiKPI'] });
        } catch (error) {
            console.error('Batch Delete Error:', error);
            message.error('Lỗi khi xóa hàng loạt');
        }
    }, [selectedRowKeys, queryClient]);

    const handleBatchEdit = () => {
        if (selectedRowKeys.length !== 1) {
            message.info('Vui lòng chọn duy nhất 1 tiêu chí để sửa');
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
                const result = await lv_LoadDataAPI(table, 'add', payload);
                if (result === -2) throw new Error('Mã tiêu chí đã tồn tại');
                if (!result) throw new Error('Thêm thất bại');
                return { isEdit: false };
            }
        },
        onSuccess: (data) => {
            message.success(data.isEdit ? 'Cập nhật thành công' : 'Thêm thành công');
            setIsModalVisible(false);
            form.resetFields();
            setEditingItem(null);
            setQuickRowData({
                lv001: '',
                lv002: '',
                lv003: '',
                lv004: undefined,
                lv009: undefined,
                lv010: undefined,
            });
            queryClient.invalidateQueries({ queryKey: ['ki_lv0002'] });
            queryClient.invalidateQueries({ queryKey: ['masterData', 'TieuChiKPI'] });
        },
        onError: (error) => {
            console.error('Error saving:', error);
            message.error(error.message || 'Có lỗi xảy ra');
        }
    });

    const handleSubmit = async (values) => {
        saveMutation.mutate({ isEdit: !!editingItem, payload: { ...values } });
    };

    const handleQuickSubmit = async () => {
        if (!quickRowData.lv001 || !quickRowData.lv002) {
            message.warning('Vui lòng nhập mã và tên tiêu chí để thêm nhanh!');
            return;
        }
        saveMutation.mutate({
            isEdit: false,
            payload: {
                ...quickRowData,
                lv001: quickRowData.lv001.trim(),
                lv002: quickRowData.lv002.trim(),
            }
        });
    };

    // Columns structure with Inline Quick Insert
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
                return (currentPage - 1) * pageSize + index;
            }
        },
        {
            title: 'Mã',
            dataIndex: 'lv001',
            key: 'lv001',
            width: 150,
            render: (text, record) => {
                if (record.isQuickRow) {
                    return (
                        <Input
                            size="small"
                            placeholder="Mã"
                            value={quickRowData.lv001}
                            onChange={(e) => setQuickRowData({ ...quickRowData, lv001: e.target.value })}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleQuickSubmit();
                            }}
                            style={{ borderRadius: '4px' }}
                        />
                    );
                }
                return <span style={{ fontWeight: 600, color: '#197dd3' }}>{text}</span>;
            }
        },
        {
            title: 'Tên tiêu chí',
            dataIndex: 'lv002',
            key: 'lv002',
            width: 200,
            render: (text, record) => {
                if (record.isQuickRow) {
                    return (
                        <Input
                            size="small"
                            placeholder="Nhập tên tiêu chí..."
                            value={quickRowData.lv002}
                            onChange={(e) => setQuickRowData({ ...quickRowData, lv002: e.target.value })}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleQuickSubmit();
                            }}
                            style={{ borderRadius: '4px' }}
                        />
                    );
                }
                return text;
            }
        },
        {
            title: 'Mô tả',
            dataIndex: 'lv003',
            key: 'lv003',
            width: 250,
            render: (text, record) => {
                if (record.isQuickRow) {
                    return (
                        <Input
                            size="small"
                            placeholder="Nhập mô tả..."
                            value={quickRowData.lv003}
                            onChange={(e) => setQuickRowData({ ...quickRowData, lv003: e.target.value })}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleQuickSubmit();
                            }}
                            style={{ borderRadius: '4px' }}
                        />
                    );
                }
                return text;
            }
        },
        {
            title: 'Kiểu đánh giá',
            dataIndex: 'evaluationTypeName',
            key: 'evaluationTypeName',
            width: 180,
            render: (text, record) => {
                if (record.isQuickRow) {
                    return (
                        <SelectKieuDanhGia
                            size="small"
                            value={quickRowData.lv004}
                            onChange={(val) => setQuickRowData({ ...quickRowData, lv004: val })}
                            dropdownMatchSelectWidth={false}
                        />
                    );
                }
                return text || record.lv004;
            }
        },
        {
            title: 'Khóa',
            dataIndex: 'lv005',
            key: 'lv005',
            width: 90,
            render: (text, record) => {
                if (record.isQuickRow) return null;
                return text;
            }
        },
        {
            title: 'Mã cha',
            dataIndex: 'lv009',
            key: 'lv009',
            width: 180,
            render: (text, record) => {
                if (record.isQuickRow) {
                    return (
                        <SelectTieuChiKPI
                            size="small"
                            value={quickRowData.lv009}
                            onChange={(val) => setQuickRowData({ ...quickRowData, lv009: val })}
                            dropdownMatchSelectWidth={false}
                        />
                    );
                }
                return text;
            }
        },
        {
            title: 'STT',
            dataIndex: 'lv010',
            key: 'lv010',
            width: 90,
            align: 'center',
            render: (text, record) => {
                if (record.isQuickRow) {
                    return (
                        <InputNumber
                            size="small"
                            placeholder="STT"
                            value={quickRowData.lv010}
                            onChange={(val) => setQuickRowData({ ...quickRowData, lv010: val })}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleQuickSubmit();
                            }}
                            style={{ width: '100%', borderRadius: '4px' }}
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
            disabled: record.isQuickRow, // Không chọn dòng insert nhanh
        }),
    };

    return (
        <div className={styles.khoContainer}>
            <Breadcrumb className={styles.pageBreadcrumb}>
                <Breadcrumb.Item>
                    <HomeOutlined style={{ marginRight: 8 }} />
                    Trang chủ
                </Breadcrumb.Item>
                <Breadcrumb.Item>Quản lý công việc</Breadcrumb.Item>
                <Breadcrumb.Item>Điều khiển KPI</Breadcrumb.Item>
                <Breadcrumb.Item>Các tiêu chí KPI</Breadcrumb.Item>
            </Breadcrumb>

            <div className={styles.khoHeader}>
                <div className={styles.khoTitle}>
                    <Sliders size={28} strokeWidth={1.5} />
                    <div>
                        <h2 className={styles.khoTitleText}>Các Tiêu Chí KPI</h2>
                    </div>
                </div>
                <div className={styles.khoActions}>
                    <SearchInput
                        placeholder="Tìm theo Mã hoặc Tên"
                        allowClear
                        prefix={<Search size={16} />}
                        onSearch={(val) => setSearchText(val)}
                        onChange={(e) => setSearchText(e.target.value)}
                        className={styles.khoSearch}
                        style={{ width: 280 }}
                    />
                    <Button
                        type="primary"
                        icon={<Plus size={16} />}
                        onClick={handleAdd}
                    >
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
                    title="Xóa tiêu chí"
                    description={`Bạn có chắc muốn xóa ${selectedRowKeys.length} tiêu chí đã chọn?`}
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

            <Card className={styles.mainCard} bordered={false}>
                <Table
                    columns={columns}
                    scroll={{ x: 'max-content' }}
                    dataSource={dataSourceWithQuickRow}
                    loading={loading}
                    className={styles.customTable}
                    rowSelection={rowSelection}
                    onRow={(record) => ({
                        onClick: (e) => {
                            if (record.isQuickRow) return;
                            // Avoid triggering when clicking checkbox, inputs or buttons
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
                    pagination={{
                        current: currentPage,
                        pageSize: pageSize,
                        total: dataSourceWithQuickRow.length,
                        showSizeChanger: true,
                        showTotal: (total) => `Tổng số: ${total - 1}`,
                        onChange: (page, size) => {
                            setCurrentPage(page);
                            setPageSize(size);
                        },
                        pageSizeOptions: ['10', '20', '50'],
                    }}
                />
            </Card>

            <Drawer
                title={
                    <Space>
                        {editingItem ? <Edit size={18} /> : <Plus size={18} />}
                        {editingItem ? 'Chỉnh sửa tiêu chí KPI' : 'Thêm tiêu chí KPI mới'}
                    </Space>
                }
                placement="right"
                width={600}
                open={isModalVisible}
                onClose={() => {
                    setIsModalVisible(false);
                    setEditingItem(null);
                    form.resetFields();
                }}
                className={styles.khoDrawer}
                destroyOnClose
                footer={
                    <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Button onClick={() => {
                            setIsModalVisible(false);
                            setEditingItem(null);
                            form.resetFields();
                        }}>Huỷ</Button>
                        <Button type="primary" onClick={() => form.submit()} loading={loading}>
                            {editingItem ? 'Cập nhật' : 'Thêm mới'}
                        </Button>
                    </Space>
                }
            >
                <CacTieuChiKPIForm form={form} onFinish={handleSubmit} />
            </Drawer>
        </div>
    );
};

export default CacTieuChiKPI;
