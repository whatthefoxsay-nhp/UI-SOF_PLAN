import React, { useState, useEffect, useCallback } from 'react';
import { Table, Tabs, Button, message, Space, DatePicker, Input, Breadcrumb, Row, Col } from 'antd';
import { Check, X, Search, RefreshCw, Home, UserCheck } from 'lucide-react';
import dayjs from 'dayjs';
import { lv_LoadDataAPI } from '../../../services/apiServices';
import styles from './BgdDuyetDon.module.css';

const { RangePicker } = DatePicker;

const BgdDuyetDon = () => {
    const [activeTab, setActiveTab] = useState('1'); // 1: Pending, 2: Approved, 3: Rejected
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);
    const [selectedRowKeys, setSelectedRowKeys] = useState([]);
    const [searchText, setSearchText] = useState('');
    const [dateRange, setDateRange] = useState([null, null]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            let vtable = '';
            if (activeTab === '1') vtable = 'jo_lv0012';
            else if (activeTab === '2') vtable = 'jo_lv0013';
            else if (activeTab === '3') vtable = 'jo_lv0014';

            const payload = {
                searchKey: searchText,
                datefrom: dateRange[0] ? dateRange[0].format('YYYY-MM-DD') : '',
                dateto: dateRange[1] ? dateRange[1].format('YYYY-MM-DD') : '',
            };

            const response = await lv_LoadDataAPI(vtable, 'loadDataView', payload);
            setData(Array.isArray(response) ? response : []);
            setSelectedRowKeys([]); // Reset selection on refresh
        } catch (error) {
            console.error("Error fetching data:", error);
            message.error('Không thể tải dữ liệu');
        } finally {
            setLoading(false);
        }
    }, [activeTab, searchText, dateRange]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleAction = async (action) => {
        if (selectedRowKeys.length === 0) {
            message.warning('Vui lòng chọn ít nhất một đơn');
            return;
        }

        setLoading(true);
        try {
            // jo_lv0012 handles both approve and unapprove
            await lv_LoadDataAPI('jo_lv0012', action, { employeeIds: selectedRowKeys });
            message.success(action === 'approve' ? 'Đã duyệt thành công' : 'Đã từ chối đơn');
            fetchData();
        } catch (error) {
            console.error("Action error:", error);
            message.error('Có lỗi xảy ra');
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        {
            title: 'Mã',
            dataIndex: 'lv001',
            key: 'lv001',
            width: 90,
            fixed: 'left',
            align: 'center',
        },
        {
            title: 'Người xin phép',
            dataIndex: 'tenNguoiXinPhep', // Joined Name
            key: 'lv015',
            width: 180,
            fixed: 'left',
        },
        {
            title: 'Phòng ban',
            dataIndex: 'tenPhongBan', // Joined Dept
            key: 'lv829',
            width: 180,
        },
        {
            title: 'Hình thức',
            dataIndex: 'lv022',
            key: 'lv022',
            width: 120,
        },
        {
            title: 'Mã loại đơn',
            dataIndex: 'lv003',
            key: 'lv003',
            width: 120,
        },
        {
            title: 'Ngày giờ tạo',
            dataIndex: 'lv025',
            key: 'lv025',
            width: 150,
            align: 'center',
            render: (text) => text ? dayjs(text).format('DD/MM/YYYY HH:mm') : ''
        },
        {
            title: 'Từ ngày',
            dataIndex: 'lv016',
            key: 'lv016',
            width: 150,
            align: 'center',
            render: (text) => text ? dayjs(text).format('DD/MM/YYYY HH:mm') : ''
        },
        {
            title: 'Đến ngày',
            dataIndex: 'lv017',
            key: 'lv017',
            width: 150,
            align: 'center',
            render: (text) => text ? dayjs(text).format('DD/MM/YYYY HH:mm') : ''
        },
        {
            title: 'Số ngày',
            dataIndex: 'soNgay', // lv098
            key: 'lv098',
            width: 90,
            align: 'center',
        },
        {
            title: 'Lý do',
            dataIndex: 'lv008',
            key: 'lv008',
            width: 220,
            ellipsis: true,
        },
        {
            title: 'Phản hồi (QL)',
            dataIndex: 'lv009',
            key: 'lv009',
            width: 180,
            ellipsis: true,
        },
        {
            title: 'Phản hồi (BGĐ)',
            dataIndex: 'lv010',
            key: 'lv010',
            width: 180,
            ellipsis: true,
        },
        {
            title: 'QL Trực tiếp',
            dataIndex: 'lv013',
            key: 'lv013',
            width: 160,
        },
        {
            title: 'Ngày duyệt (QL)',
            dataIndex: 'lv018',
            key: 'lv018',
            width: 150,
            align: 'center',
            render: (text) => (text && text !== '1900-01-01 00:00:00') ? dayjs(text).format('DD/MM/YYYY HH:mm') : ''
        },
        {
            title: 'Trạng thái',
            dataIndex: 'lv021',
            key: 'lv021',
            width: 130,
            fixed: 'right',
            align: 'center',
            render: (status) => {
                const s = parseInt(status);
                if (s === 0) return <span className={styles.statusPending}>Chờ duyệt</span>;
                if (s === 1) return <span className={styles.statusApprovedBgd}>Đã duyệt</span>;
                if (s === 2) return <span className={styles.statusCanceled}>Không duyệt</span>;
                return <span className={styles.statusUnknown}>Không xác định</span>;
            }
        }
    ];

    const rowSelection = {
        selectedRowKeys,
        onChange: (keys) => setSelectedRowKeys(keys),
    };

    const renderTable = () => (
        <Table
            dataSource={data}
            columns={columns}
            rowKey="lv001"
            loading={loading}
            rowSelection={activeTab === '1' ? rowSelection : undefined}
            pagination={{
                pageSize: 15,
                showSizeChanger: true,
                pageSizeOptions: ['15', '30', '50', '100'],
                showTotal: (total) => `Tổng số: ${total} mục`
            }}
            scroll={{ x: 'max-content', y: 'calc(100vh - 380px)' }}
            bordered
            size="middle"
            className={styles.mainTable}
        />
    );

    const items = [
        {
            key: '1',
            label: 'Đơn đang đợi duyệt',
            children: (
                <div>
                    <div className={`${styles.batchActionBar} ${selectedRowKeys.length === 0 ? styles.batchActionBarDisabled : ''}`}>
                        <span style={{ fontWeight: 600, color: '#197dd3', marginRight: 8 }}>Thao tác hàng loạt:</span>
                        <Button
                            type="primary"
                            style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                            icon={<Check size={15} />}
                            onClick={() => handleAction('approve')}
                            disabled={selectedRowKeys.length === 0}
                        >
                            Duyệt đơn đã chọn
                        </Button>
                        <Button
                            danger
                            type="primary"
                            icon={<X size={15} />}
                            onClick={() => handleAction('unapprove')}
                            disabled={selectedRowKeys.length === 0}
                        >
                            Không duyệt đã chọn
                        </Button>
                        <span style={{ marginLeft: 'auto', color: '#8c8c8c' }}>
                            Đã chọn <b>{selectedRowKeys.length}</b> dòng
                        </span>
                    </div>
                    {renderTable()}
                </div>
            ),
        },
        {
            key: '2',
            label: 'Đã duyệt',
            children: renderTable(),
        },
        {
            key: '3',
            label: 'Không duyệt',
            children: renderTable(),
        },
    ];

    return (
        <div className={styles.container}>
            {/* Premium Breadcrumb */}
            <Breadcrumb
                style={{ 
                    marginBottom: '16px', 
                    fontSize: '14px', 
                    padding: '12px 16px', 
                    borderRadius: '4px', 
                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)', 
                    userSelect: 'none',
                    background: '#ffffff'
                }}
            >
                <Breadcrumb.Item>
                    <Home size={14} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                    Trang chủ
                </Breadcrumb.Item>
                <Breadcrumb.Item>Quản lý công việc</Breadcrumb.Item>
                <Breadcrumb.Item>Quản lý nghỉ phép</Breadcrumb.Item>
                <Breadcrumb.Item>BGĐ duyệt phép</Breadcrumb.Item>
            </Breadcrumb>

            <div className={styles.pageTitle}>
                <UserCheck size={20} />
                Ban Giám Đốc Duyệt Đơn
            </div>

            <div className={styles.pageWrapper}>
                {/* Search & Filters Toolbar */}
                <Row justify="space-between" align="middle" className={styles.toolbarRow} style={{ flexWrap: 'wrap', gap: 8 }}>
                    <Col>
                        <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 500 }}>
                            Danh sách đơn xin nghỉ phép ({data.length} đơn)
                        </span>
                    </Col>
                    <Col>
                        <Space size="small" wrap>
                            <RangePicker
                                placeholder={['Từ ngày', 'Đến ngày']}
                                format="DD/MM/YYYY"
                                value={dateRange}
                                onChange={setDateRange}
                                style={{ width: 240 }}
                            />
                            <Input
                                placeholder="Tìm kiếm theo tên, phòng ban..."
                                value={searchText}
                                onChange={e => setSearchText(e.target.value)}
                                onPressEnter={fetchData}
                                prefix={<Search size={16} style={{ color: '#cbd5e1' }} />}
                                style={{ width: 250 }}
                                allowClear
                            />
                            <Button type="primary" icon={<Search size={16} />} onClick={fetchData} loading={loading}>
                                Tìm kiếm
                            </Button>
                            <Button icon={<RefreshCw size={16} />} onClick={fetchData} loading={loading}>
                                Nạp lại
                            </Button>
                        </Space>
                    </Col>
                </Row>

                <Tabs activeKey={activeTab} items={items} onChange={setActiveTab} className={styles.customTabs} />
            </div>
        </div>
    );
};

export default BgdDuyetDon;
