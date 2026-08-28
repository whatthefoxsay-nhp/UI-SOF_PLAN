import React, { useState, useCallback, useMemo, useDeferredValue } from 'react';
import { Table, Button, Input, Space, Popconfirm, message, Breadcrumb, Card, Drawer, Tooltip } from 'antd';
import { HomeOutlined } from '@ant-design/icons';
import { Plus, Edit, Trash2, Search, RotateCw, Sliders, Check } from 'lucide-react';
import dayjs from 'dayjs';
import ThietLapKPIForm from './ThietLapKPIForm';
import ChiTietKPI from './ChiTietKPI';
import { lv_LoadDataAPI } from '../../../services/apiServices';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import styles from '../../ChamCong&TienLuong/ThongTinCC/style.module.css';
import './ThietLapKPI.css';

const ThietLapKPI = () => {
    const [searchText, setSearchText] = useState('');
    const deferredSearchText = useDeferredValue(searchText);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [detailVisible, setDetailVisible] = useState(false);
    const [detailRecord, setDetailRecord] = useState(null);
    const [selectedRowKeys, setSelectedRowKeys] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const queryClient = useQueryClient();

    // Quick Insert state
    const [quickRowData, setQuickRowData] = useState({
        lv001: '',
        lv002: '',
        lv003: '',
    });

    // API settings
    const table = 'ki_lv0003';
    const func = 'DataView'; // maps to loadDataView in index.php

    const { data: listData = [], isLoading: loading, refetch: loadData } = useQuery({
        queryKey: ['ki_lv0003', 'loadDataView'],
        queryFn: async () => {
            const data = await lv_LoadDataAPI(table, 'load' + func);
            if (data && Array.isArray(data)) {
                return data.map(item => ({
                    ...item,
                    key: item.lv001
                })).sort((a, b) => a.lv001.localeCompare(b.lv001));
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
        setIsModalVisible(true);
    }, []);

    const handleEdit = useCallback((record) => {
        setEditingItem(record);
        setIsModalVisible(true);
    }, []);

    const handleDetail = useCallback((record) => {
        setDetailRecord(record);
        setDetailVisible(true);
    }, []);

    const deleteMutation = useMutation({
        mutationFn: async (record) => {
            await lv_LoadDataAPI(table, 'delete', { lv001: record.lv001 });
        },
        onSuccess: () => {
            message.success('Xóa thành công');
            queryClient.invalidateQueries({ queryKey: ['ki_lv0003'] });
        },
        onError: (error) => {
            console.error('Error deleting:', error);
            message.error('Không thể xóa KPI này');
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
            message.success(`Đã xóa thành công ${selectedRowKeys.length} KPI`);
            setSelectedRowKeys([]);
            queryClient.invalidateQueries({ queryKey: ['ki_lv0003'] });
        } catch (error) {
            console.error('Batch Delete Error:', error);
            message.error('Lỗi khi xóa hàng loạt');
        }
    }, [selectedRowKeys, queryClient]);

    const handleBatchEdit = () => {
        if (selectedRowKeys.length !== 1) {
            message.info('Vui lòng chọn duy nhất 1 KPI để sửa');
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
                if (result === -2) throw new Error('Mã KPI đã tồn tại');
                if (!result) throw new Error('Thêm thất bại');
                return { isEdit: false };
            }
        },
        onSuccess: (data) => {
            message.success(data.isEdit ? 'Cập nhật thành công' : 'Thêm thành công');
            setIsModalVisible(false);
            setEditingItem(null);
            setQuickRowData({
                lv001: '',
                lv002: '',
                lv003: '',
            });
            queryClient.invalidateQueries({ queryKey: ['ki_lv0003'] });
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
            message.warning('Vui lòng nhập mã và tên KPI để thêm nhanh!');
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

    // Columns structure with Quick Insert support
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
            title: 'KPI',
            dataIndex: 'lv001',
            key: 'lv001',
            width: 150,
            render: (text, record) => {
                if (record.isQuickRow) {
                    return (
                        <Input
                            size="small"
                            placeholder="Mã KPI"
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
            title: 'Tên KPI',
            dataIndex: 'lv002',
            key: 'lv002',
            width: 250,
            render: (text, record) => {
                if (record.isQuickRow) {
                    return (
                        <Input
                            size="small"
                            placeholder="Nhập tên KPI..."
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
            title: 'Ghi chú',
            dataIndex: 'lv003',
            key: 'lv003',
            width: 300,
            render: (text, record) => {
                if (record.isQuickRow) {
                    return (
                        <Input
                            size="small"
                            placeholder="Ghi chú..."
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
            title: 'NV Tạo',
            width: 150,
            render: (text, record) => {
                if (record.isQuickRow) return null;
                return record.staffName_created || '';
            }
        },
        {
            title: 'Ngày tạo',
            dataIndex: 'lv005',
            key: 'lv005',
            width: 150,
            render: (text, record) => {
                if (record.isQuickRow) return null;
                return text ? dayjs(text).format('DD/MM/YYYY') : '';
            }
        },
        {
            title: 'Người duyệt',
            dataIndex: 'staffName',
            key: 'staffName',
            width: 150,
            render: (text, record) => {
                if (record.isQuickRow) return null;
                return text;
            }
        },
        {
            title: 'Chấp nhận',
            dataIndex: 'lv007',
            key: 'lv007',
            width: 150,
            render: (status, record) => {
                if (record.isQuickRow) return null;
                if (status === 1 || status === '1') return <span style={{ color: 'green', fontWeight: '500' }}>Đã duyệt</span>;
                if (status === 2 || status === '2') return <span style={{ color: 'red', fontWeight: '500' }}>Trả lại</span>;
                return <span style={{ color: 'orange', fontWeight: '500' }}>Chưa duyệt</span>;
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
                <Breadcrumb.Item>Thiết lập KPI theo công việc</Breadcrumb.Item>
            </Breadcrumb>

            <div className={styles.khoHeader}>
                <div className={styles.khoTitle}>
                    <Sliders size={28} strokeWidth={1.5} />
                    <div>
                        <h2 className={styles.khoTitleText}>Thiết lập KPI theo công việc</h2>
                    </div>
                </div>
                <div className={styles.khoActions}>
                    <Input
                        placeholder="Tìm theo Mã hoặc Tên"
                        allowClear
                        prefix={<Search size={14} style={{ color: '#bfbfbf' }} />}
                        onChange={e => setSearchText(e.target.value)}
                        className={styles.khoSearch}
                        style={{ width: 250 }}
                    />
                    <Button type="primary" icon={<Plus size={16} />} onClick={handleAdd}>
                        Thêm mới
                    </Button>
                    <Button icon={<RotateCw size={16} />} onClick={loadData} loading={loading}>
                        Nạp lại
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
                    title="Xóa KPI"
                    description={`Bạn có chắc muốn xóa ${selectedRowKeys.length} KPI đã chọn?`}
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
                            // Avoid triggering when clicking checkbox, inputs, or buttons
                            if (e.target.closest('.ant-checkbox-wrapper') ||
                                e.target.closest('button') ||
                                e.target.closest('.ant-btn') ||
                                e.target.closest('.ant-input') ||
                                e.target.closest('.ant-select') ||
                                e.target.closest('.ant-input-number')) return;
                            handleDetail(record);
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

            <ThietLapKPIForm
                visible={isModalVisible}
                onCancel={() => {
                    setIsModalVisible(false);
                    setEditingItem(null);
                }}
                onFinish={handleSubmit}
                initialValues={editingItem}
                loading={loading}
            />

            <Drawer
                title={`Chi tiết KPI: ${detailRecord?.lv002 || ''} (${detailRecord?.lv001 || ''})`}
                width={800}
                onClose={() => setDetailVisible(false)}
                open={detailVisible}
                destroyOnClose
                className={styles.khoDrawer}
            >
                {detailRecord && <ChiTietKPI parentRecord={detailRecord} />}
            </Drawer>
        </div>
    );
};

export default ThietLapKPI;
