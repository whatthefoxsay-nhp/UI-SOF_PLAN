import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Form, Input, Row, Col, DatePicker, Select, InputNumber, Button, Table, message, Divider, Space, Typography, Radio, Checkbox } from 'antd';
import { PlusOutlined, DeleteOutlined, FileTextOutlined, WalletOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import SelectTaiKhoan from '../../../../components/DropDown/SelectTaiKhoan';
import { useAuth } from '../../../../contexts/AuthContext';
import { getCurrentUser, execCRUD } from '../../../../services/apiServices';
import styles from './QuanLyKeHoach.module.css';

const { Option } = Select;
const { Title, Text } = Typography;

const TaoDeNGhiChiTienModal = ({ visible, onCancel, record, onSuccess }) => {
    const { user } = useAuth();
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [details, setDetails] = useState([{ key: Date.now(), lv007: '', lv004: 0, lv005: '', lv006: '' }]);
    const [loaiDeNghi, setLoaiDeNghi] = useState('1');
    const [hinhThucTT, setHinhThucTT] = useState('TM');

    const fetchUserInfo = useCallback(async () => {
        try {
            const result = await getCurrentUser();
            if (result && result.success) {
                form.setFieldsValue({
                    lv005: result.lv001 || user?.username || '',
                    lv006: result.phongBanTen || '',
                    lv105: result.chuTaiKhoan || '',
                    lv020: result.soTaiKhoan || '',
                    lv021: result.nganHang || '',
                });
            }
        } catch (error) {
            console.error('Lỗi tải thông tin người dùng:', error);
        }
    }, [form, user]);

    useEffect(() => {
        if (!visible) return;
        fetchUserInfo();
        form.setFieldsValue({
            lv009: dayjs(),
            lv014: dayjs().add(7, 'day'),
            lv114: record?.lv501 || '',
            lv115: record?.ten_du_an || record?.lv501 || '',
            lv093: record?.lv001 || '',
            lv011: 'VND',
            lv012: 1,
            lv002: '1',
            lv093_days: 7,
            lv095: 'TM',
            lv010: '1111',
        });
        setLoaiDeNghi('1');
        setHinhThucTT('TM');
        setDetails([{ key: Date.now(), lv007: '', lv004: 0, lv005: '141', lv006: '1111' }]);
    }, [visible, record, form, fetchUserInfo]);

    const handleAddDetail = () => {
        setDetails([...details, {
            key: Date.now(),
            lv007: '',
            lv004: 0,
            lv005: loaiDeNghi === '2' ? '' : '141',
            lv006: hinhThucTT === 'TM' ? '1111' : '1121',
        }]);
    };

    const handleRemoveDetail = (key) => {
        if (details.length <= 1) {
            message.warning('Phải có ít nhất một dòng chi tiết');
            return;
        }
        setDetails(details.filter((item) => item.key !== key));
    };

    const handleDetailChange = (key, field, value) => {
        setDetails(details.map((item) => item.key === key ? { ...item, [field]: value } : item));
    };

    const totalAmount = details.reduce((sum, item) => sum + Number(item.lv004 || 0), 0);

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            const invalidDetail = details.find((item) => !item.lv005 || Number(item.lv004 || 0) <= 0);
            if (invalidDetail) {
                message.error('Vui lòng nhập đầy đủ tài khoản và số tiền cho các dòng chi tiết');
                return;
            }

            setLoading(true);
            const headerPayload = {
                ...values,
                lv009: values.lv009 ? values.lv009.format('YYYY-MM-DD') : '',
                lv014: values.lv014 ? values.lv014.format('YYYY-MM-DD') : '',
                lv120: values.lv120 ? values.lv120.format('YYYY-MM-DD') : '',
                lv122: values.lv122 ? values.lv122.format('YYYY-MM-DD') : '',
                lv004: record?.lv001 || '',
                lv093: loaiDeNghi === '1' ? (values.lv093_days || 7) : (record?.lv001 || ''),
                lv115: record?.ten_du_an || record?.lv501 || '',
                lv013: totalAmount,
                lv003: 'CUS',
                lv095: values.lv095,
                lv030: values.lv030 ? 1 : 0,
                lv016: 0,
            };

            const headerResult = await execCRUD('cr_lv0202', 'insert', headerPayload);
            if (!headerResult || (!headerResult.success && !headerResult.lv001)) {
                message.error(headerResult?.message || 'Lỗi khi lưu thông tin chung');
                return;
            }

            const newId = headerResult.lv001;
            if (!newId) {
                message.error('Không lấy được mã đề nghị mới');
                return;
            }

            await Promise.all(details.map((item) => execCRUD('cr_lv0203', 'insert', {
                lv002: newId,
                lv007: item.lv007 || values.lv007,
                lv003: item.lv004,
                lv004: Number(item.lv004 || 0) * (Number(values.lv012) || 1),
                lv005: item.lv005,
                lv006: item.lv006 || (values.lv095 === 'TM' ? '1111' : '1121'),
            })));

            message.success('Tạo đề nghị chi tiền thành công');
            onSuccess?.();
            onCancel?.();
        } catch (error) {
            console.error(error);
            message.error('Vui lòng kiểm tra lại thông tin');
        } finally {
            setLoading(false);
        }
    };

    const detailColumns = [
        {
            title: 'Nội dung chi tiết',
            dataIndex: 'lv007',
            key: 'lv007',
            render: (text, row) => <Input value={text} onChange={(event) => handleDetailChange(row.key, 'lv007', event.target.value)} placeholder="Nội dung dòng này..." />,
        },
        {
            title: 'Số tiền',
            dataIndex: 'lv004',
            key: 'lv004',
            width: 150,
            render: (value, row) => (
                <InputNumber
                    style={{ width: '100%' }}
                    value={value}
                    onChange={(nextValue) => handleDetailChange(row.key, 'lv004', nextValue)}
                    formatter={(nextValue) => `${nextValue}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={(nextValue) => nextValue.replace(/\$\s?|(,*)/g, '')}
                />
            ),
        },
        {
            title: 'Tài khoản Nợ',
            dataIndex: 'lv005',
            key: 'lv005',
            width: 180,
            render: (value, row) => <SelectTaiKhoan style={{ width: '100%' }} value={value} onChange={(nextValue) => handleDetailChange(row.key, 'lv005', nextValue)} />,
        },
        {
            title: 'Tài khoản Có',
            dataIndex: 'lv006',
            key: 'lv006',
            width: 180,
            render: (value, row) => <SelectTaiKhoan style={{ width: '100%' }} value={value} onChange={(nextValue) => handleDetailChange(row.key, 'lv006', nextValue)} placeholder={hinhThucTT === 'TM' ? '1111' : '1121'} />,
        },
        {
            title: '',
            key: 'action',
            width: 54,
            render: (_, row) => <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleRemoveDetail(row.key)} />,
        },
    ];

    return (
        <Modal
            title={<Space><FileTextOutlined /><Title level={4} style={{ margin: 0 }}>Tạo đề nghị chi tiền</Title></Space>}
            open={visible}
            onCancel={onCancel}
            onOk={handleSave}
            width={1000}
            confirmLoading={loading}
            className={styles.financeModal}
            okText="Lưu đề nghị"
            cancelText="Hủy bỏ"
            centered
            bodyStyle={{ padding: '20px' }}
        >
            <Form form={form} layout="vertical">
                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item name="lv002" label="Loại đề nghị" rules={[{ required: true }]}>
                            <Radio.Group onChange={(event) => setLoaiDeNghi(event.target.value)}>
                                <Radio value="1">Tạm ứng</Radio>
                                <Radio value="2">Thanh toán</Radio>
                                <Radio value="3">Ứng lương</Radio>
                            </Radio.Group>
                        </Form.Item>
                    </Col>
                    <Col span={4}><Form.Item name="lv009" label="Ngày lập" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" /></Form.Item></Col>
                    <Col span={4}><Form.Item name="lv014" label="Hạn thanh toán"><DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" /></Form.Item></Col>
                    <Col span={4}><Form.Item name="lv011" label="Tiền tệ"><Select><Option value="VND">VND</Option><Option value="USD">USD</Option></Select></Form.Item></Col>
                </Row>

                <Row gutter={16}>
                    <Col span={6}><Form.Item name="lv005" label="Mã nhân viên (Người ĐN)" rules={[{ required: true }]}><Input disabled /></Form.Item></Col>
                    <Col span={6}><Form.Item name="lv006" label="Phòng ban"><Input placeholder="Tên phòng ban..." /></Form.Item></Col>
                    <Col span={6}>
                        <Form.Item name="lv095" label="Hình thức thanh toán">
                            <Radio.Group onChange={(event) => setHinhThucTT(event.target.value)} value={hinhThucTT}>
                                <Radio value="TM">Tiền mặt</Radio>
                                <Radio value="CK">Chuyển khoản</Radio>
                            </Radio.Group>
                        </Form.Item>
                    </Col>
                    <Col span={6}>
                        {loaiDeNghi === '1' && <Form.Item name="lv093_days" label="Số ngày hoàn ứng"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item>}
                        {loaiDeNghi === '2' && <Form.Item name="lv030" valuePropName="checked" label=" "><Checkbox>Có hóa đơn VAT</Checkbox></Form.Item>}
                    </Col>
                </Row>

                {loaiDeNghi === '3' && (
                    <Row gutter={16}>
                        <Col span={12}><Form.Item name="lv120" label="Trả lương từ ngày"><DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" /></Form.Item></Col>
                        <Col span={12}><Form.Item name="lv122" label="Đến ngày"><DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" /></Form.Item></Col>
                    </Row>
                )}

                {hinhThucTT === 'CK' && (
                    <Row gutter={16}>
                        <Col span={8}><Form.Item name="lv105" label="Chủ tài khoản"><Input placeholder="Họ tên chủ tài khoản..." /></Form.Item></Col>
                        <Col span={8}><Form.Item name="lv020" label="Số tài khoản"><Input placeholder="Số tài khoản ngân hàng..." /></Form.Item></Col>
                        <Col span={8}><Form.Item name="lv021" label="Ngân hàng (Chi nhánh)"><Input placeholder="Tên ngân hàng..." /></Form.Item></Col>
                    </Row>
                )}

                <Form.Item name="lv007" label="Nội dung đề nghị" rules={[{ required: true }]}>
                    <Input.TextArea rows={2} placeholder="Nhập lý do chi tiền..." />
                </Form.Item>

                <Row gutter={16}>
                    <Col span={8}><Form.Item name="lv114" label="Mã dự án"><Input disabled /></Form.Item></Col>
                    <Col span={8}><Form.Item name="lv115" label="Tên dự án"><Input disabled /></Form.Item></Col>
                    <Col span={8}><Form.Item name="lv093" label="Mã kế hoạch"><Input disabled /></Form.Item></Col>
                </Row>

                <Divider orientation="left">
                    <Space>
                        <WalletOutlined />
                        <Text strong>Chi tiết thanh toán</Text>
                        <Button size="small" type="dashed" icon={<PlusOutlined />} onClick={handleAddDetail}>Thêm dòng</Button>
                    </Space>
                </Divider>

                <Table
                    dataSource={details}
                    columns={detailColumns}
                    pagination={false}
                    size="small"
                    bordered
                    footer={() => (
                        <div style={{ textAlign: 'right', paddingRight: '50px' }}>
                            <Text strong>Tổng cộng: </Text>
                            <Text type="danger" strong style={{ fontSize: '16px' }}>{totalAmount.toLocaleString('vi-VN')}</Text>
                            <Text strong> {form.getFieldValue('lv011')}</Text>
                        </div>
                    )}
                />
            </Form>
        </Modal>
    );
};

export default TaoDeNGhiChiTienModal;