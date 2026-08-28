import React, { useState, useEffect } from 'react';
import { Modal, Table, Button, Space, Tag, message, Popconfirm, Tooltip } from 'antd';
import { EditOutlined, DeleteOutlined, CheckCircleOutlined, CloseCircleOutlined, EyeOutlined } from '@ant-design/icons';
import { getDeNghiByPlanId, approveDeNghi, unapproveDeNghi, execCRUD } from '../../services/apiServices';
import moment from 'moment';
import DeNghiChiTienDetailDrawer from './DeNghiChiTienDetailDrawer';

const DanhSachDeNghiModal = ({ visible, onCancel, planRecord, onEditRequest }) => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);
    const [detailRecord, setDetailRecord] = useState(null);
    const [detailOpen, setDetailOpen] = useState(false);

    const fetchData = async () => {
        if (!planRecord?.lv001) return;
        setLoading(true);
        try {
            const res = await getDeNghiByPlanId(planRecord.lv001);
            if (Array.isArray(res)) {
                setData(res);
            } else {
                setData([]);
            }
        } catch (error) {
            console.error('Error fetching payment requests:', error);
            message.error('Không thể tải danh sách đề nghị chi tiền');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (visible) {
            fetchData();
        }
    }, [visible, planRecord]);

    const handleApprove = async (id) => {
        try {
            const res = await approveDeNghi(id);
            if (res === true || res?.success) {
                message.success('Đã duyệt và đề xuất lên quản lý thành công');
                onCancel(); // Đóng modal sau khi duyệt thành công
            } else {
                message.error(res?.message || res?.error || 'Duyệt thất bại');
            }
        } catch (error) {
            message.error('Lỗi khi duyệt đề nghị');
        }
    };

    const handleReject = async (id) => {
        try {
            const res = await unapproveDeNghi(id);
            if (res === true || res?.success) {
                message.success('Đã từ chối đề nghị chi tiền');
                fetchData();
            } else {
                message.error(res?.error || 'Từ chối thất bại');
            }
        } catch (error) {
            message.error('Lỗi khi từ chối đề nghị');
        }
    };

    const handleDelete = async (id) => {
        try {
            const res = await execCRUD('cr_lv0202', 'delete', { lv001: id });
            if (res === true || res?.success) {
                message.success('Đã xóa đề nghị');
                fetchData();
            } else {
                message.error(res?.error || 'Xóa thất bại');
            }
        } catch (error) {
            message.error('Lỗi khi xóa đề nghị');
        }
    };

    const handleViewDetail = (record) => {
        setDetailRecord(record);
        setDetailOpen(true);
    };

    const columns = [
        {
            title: 'Mã số',
            dataIndex: 'lv001',
            key: 'lv001',
            width: 120,
        },
        {
            title: 'Ngày đề nghị',
            dataIndex: 'lv009',
            key: 'lv009',
            render: (text) => text ? moment(text).format('DD/MM/YYYY') : '',
            width: 110,
        },
        {
            title: 'Loại',
            dataIndex: 'lv002',
            key: 'lv002',
            render: (val) => val === '1' ? <Tag color="blue">Tạm ứng</Tag> : <Tag color="green">Thanh toán</Tag>,
            width: 100,
        },
        {
            title: 'Người đề nghị',
            dataIndex: 'ten_nguoi_de_nghi',
            key: 'ten_nguoi_de_nghi',
        },
        {
            title: 'Số tiền',
            dataIndex: 'total_amount',
            key: 'total_amount',
            align: 'right',
            render: (val) => val ? val.toLocaleString() : '0',
        },
        {
            title: 'Trạng thái',
            dataIndex: 'lv016',
            key: 'lv016',
            render: (val) => {
                if (val === '1') return <Tag color="success">Đã duyệt</Tag>;
                if (val === '-1') return <Tag color="error">Đã từ chối</Tag>;
                return <Tag color="warning">Chờ duyệt</Tag>;
            }
        },
        {
            title: 'Hành động',
            key: 'action',
            fixed: 'right',
            width: 180,
            render: (_, record) => (
                <Space size="middle">
                    <Tooltip title="Xem chi tiết">
                        <Button icon={<EyeOutlined />} size="small" onClick={() => handleViewDetail(record)} />
                    </Tooltip>
                    {record.lv016 === '0' && (
                        <>
                            <Tooltip title="Chỉnh sửa">
                                <Button 
                                    icon={<EditOutlined />} 
                                    size="small" 
                                    onClick={() => onEditRequest(record)}
                                />
                            </Tooltip>
                            <Popconfirm title="Xóa đề nghị này?" onConfirm={() => handleDelete(record.lv001)}>
                                <Button icon={<DeleteOutlined />} size="small" danger />
                            </Popconfirm>
                            <Tooltip title="Duyệt">
                                <Button 
                                    icon={<CheckCircleOutlined />} 
                                    size="small" 
                                    type="primary"
                                    onClick={() => handleApprove(record.lv001)}
                                />
                            </Tooltip>
                            <Tooltip title="Từ chối">
                                <Button 
                                    icon={<CloseCircleOutlined />} 
                                    size="small" 
                                    danger
                                    onClick={() => handleReject(record.lv001)}
                                />
                            </Tooltip>
                        </>
                    )}
                    {record.lv016 === '1' && (
                        <Tooltip title="Bỏ duyệt">
                             <Button 
                                icon={<CloseCircleOutlined />} 
                                size="small" 
                                warning
                                onClick={() => handleReject(record.lv001)}
                            />
                        </Tooltip>
                    )}
                </Space>
            ),
        },
    ];

    return (
        <>
        <Modal
            title={`Danh sách đề nghị chi tiền - Kế hoạch: ${planRecord?.lv009 || ''}`}
            visible={visible}
            onCancel={onCancel}
            width={1000}
            footer={[
                <Button key="close" onClick={onCancel}>Đóng</Button>
            ]}
        >
            <Table 
                columns={columns} 
                dataSource={data} 
                rowKey="lv001" 
                loading={loading}
                pagination={{ pageSize: 10 }}
                scroll={{ x: 900 }}
            />
        </Modal>
        <DeNghiChiTienDetailDrawer
            open={detailOpen}
            onClose={() => setDetailOpen(false)}
            request={detailRecord}
        />
        </>
    );
};

export default DanhSachDeNghiModal;
