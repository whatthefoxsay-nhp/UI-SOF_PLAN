import React, { useEffect } from 'react';
import { Drawer, Form, Input, Button, Space, Divider } from 'antd';
import { Save, Plus, Edit } from 'lucide-react';
import styles from '../../ChamCong&TienLuong/ThongTinCC/style.module.css';

const ThietLapKPIForm = ({ visible, onCancel, onFinish, initialValues, loading }) => {
    const [form] = Form.useForm();

    useEffect(() => {
        if (visible) {
            if (initialValues) {
                form.setFieldsValue(initialValues);
            } else {
                form.resetFields();
            }
        }
    }, [visible, initialValues, form]);

    const handleOk = () => {
        form.validateFields()
            .then((values) => {
                onFinish(values);
            })
            .catch((info) => {
                console.log('Validate Failed:', info);
            });
    };

    return (
        <Drawer
            title={
                <Space>
                    {initialValues ? <Edit size={18} /> : <Plus size={18} />}
                    {initialValues ? "Chỉnh sửa thiết lập KPI" : "Thêm mới thiết lập KPI"}
                </Space>
            }
            placement="right"
            width={600}
            open={visible}
            onClose={onCancel}
            className={styles.khoDrawer}
            destroyOnClose
            footer={
                <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button onClick={onCancel}>Hủy</Button>
                    <Button type="primary" onClick={handleOk} loading={loading} icon={<Save size={16} />}>
                        Lưu
                    </Button>
                </Space>
            }
        >
            <Form
                form={form}
                layout="vertical"
                initialValues={{ lv010: 0 }}
                className={styles.customForm}
            >
                <Divider orientation="center" className={styles.dividerSolid}>THÔNG TIN KPI</Divider>
                <Form.Item
                    name="lv001"
                    label="Mã KPI"
                    rules={[{ required: true, message: 'Vui lòng nhập mã KPI' }]}
                >
                    <Input disabled={!!initialValues} placeholder="Ví dụ: KPI1" maxLength={20} />
                </Form.Item>

                <Form.Item
                    name="lv002"
                    label="Tên KPI"
                    rules={[{ required: true, message: 'Vui lòng nhập tên KPI' }]}
                >
                    <Input placeholder="Nhập tên KPI" />
                </Form.Item>

                <Divider orientation="center" className={styles.dividerSolid}>GHI CHÚ</Divider>
                <Form.Item
                    name="lv003"
                    label="Ghi chú"
                >
                    <Input.TextArea rows={4} placeholder="Nhập ghi chú" />
                </Form.Item>
            </Form>
        </Drawer>
    );
};

export default ThietLapKPIForm;
