import React, { useState, useEffect } from 'react';
import { Modal, Table, Button, Space, Tag, message, Popconfirm, Tooltip } from 'antd';
import { EditOutlined, DeleteOutlined, CheckCircleOutlined, CloseCircleOutlined, EyeOutlined } from '@ant-design/icons';
import { getDeNghiByPlanId, approveDeNghi, unapproveDeNghi, execCRUD } from '../../../../services/apiServices';
import moment from 'moment';
import DeNghiChiTienDetailDrawer from './DeNghiChiTienDetailDrawer';
import styles from './QuanLyKeHoach.module.css';

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
            setData(Array.isArray(res) ? res : []);
        } catch (error) {
            console.error('Lỗi tải danh sách đề nghị chi tiền:', error);
            message.error('Không thể tải danh sách đề nghị chi tiền');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (visible) fetchData();
    }, [visible, planRecord]);

    const handleApprove = async (id) => {
        try {
            const res = await approveDeNghi(id);
            if (res === true || res?.success) {
                message.success('Đã duyệt và đề xuất lên quản lý thành công');
                fetchData();
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
        { title: 'Mã số', dataIndex: 'lv001', key: 'lv001', width: 120 },
        { title: 'Ngày đề nghị', dataIndex: 'lv009', key: 'lv009', render: (text) => text ? moment(text).format('DD/MM/YYYY') : '', width: 120 },
        {
            title: 'Loại',
            dataIndex: 'lv002',
            key: 'lv002',
            render: (val) => val === '1' ? <Tag color="blue">Tạm ứng</Tag> : val === '3' ? <Tag color="purple">Ứng lương</Tag> : <Tag color="green">Thanh toán</Tag>,
            width: 120,
        },
        { title: 'Người đề nghị', dataIndex: 'ten_nguoi_de_nghi', key: 'ten_nguoi_de_nghi' },
        { title: 'Số tiền', dataIndex: 'total_amount', key: 'total_amount', align: 'right', render: (val) => Number(val || 0).toLocaleString('vi-VN') },
        {
            title: 'Trạng thái',
            dataIndex: 'lv016',
            key: 'lv016',
            render: (val) => {
                if (String(val) === '1') return <Tag color="success">Đã duyệt</Tag>;
                if (String(val) === '-1') return <Tag color="error">Đã từ chối</Tag>;
                return <Tag color="warning">Chờ duyệt</Tag>;
            },
            width: 130,
        },
        {
            title: 'Hành động',
            key: 'action',
            fixed: 'right',
            width: 190,
            render: (_, record) => (
                <Space size="small">
                    <Tooltip title="Xem chi tiết"><Button icon={<EyeOutlined />} size="small" onClick={() => handleViewDetail(record)} /></Tooltip>
                    {String(record.lv016) === '0' && (
                        <>
                            <Tooltip title="Chỉnh sửa"><Button icon={<EditOutlined />} size="small" onClick={() => onEditRequest(record)} /></Tooltip>
                            <Popconfirm title="Xóa đề nghị này?" okText="Xóa" cancelText="Hủy" onConfirm={() => handleDelete(record.lv001)}>
                                <Button icon={<DeleteOutlined />} size="small" danger />
                            </Popconfirm>
                            <Tooltip title="Duyệt"><Button icon={<CheckCircleOutlined />} size="small" type="primary" onClick={() => handleApprove(record.lv001)} /></Tooltip>
                            <Tooltip title="Từ chối"><Button icon={<CloseCircleOutlined />} size="small" danger onClick={() => handleReject(record.lv001)} /></Tooltip>
                        </>
                    )}
                    {String(record.lv016) === '1' && (
                        <Tooltip title="Bỏ duyệt"><Button icon={<CloseCircleOutlined />} size="small" onClick={() => handleReject(record.lv001)} /></Tooltip>
                    )}
                </Space>
            ),
        },
    ];

    return (
        <>
            <Modal
                title={`Danh sách đề nghị chi tiền - Kế hoạch: ${planRecord?.lv002 || planRecord?.lv001 || ''}`}
                open={visible}
                onCancel={onCancel}
                width={1000}
                className={styles.financeModal}
                footer={[<Button key="close" onClick={onCancel}>Đóng</Button>]}
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
            <DeNghiChiTienDetailDrawer open={detailOpen} onClose={() => setDetailOpen(false)} request={detailRecord} />
        </>
    );
};

export default DanhSachDeNghiModal;