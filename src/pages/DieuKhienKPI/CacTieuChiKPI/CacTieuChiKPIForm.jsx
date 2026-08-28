import React from 'react';
import { Form, Input, InputNumber, Divider } from 'antd';
import SelectKieuDanhGia from '../../../components/DropDown/SelectKieuDanhGia';
import SelectTieuChiKPI from '../../../components/DropDown/SelectTieuChiKPI';
import styles from '../../ChamCong&TienLuong/ThongTinCC/style.module.css';

export default function CacTieuChiKPIForm({ form, onFinish }) {
    return (
        <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            className={styles.customForm}
        >
            <Divider orientation="center" className={styles.dividerSolid}>THÔNG TIN CHÍNH</Divider>
            <Form.Item
                label="Mã tiêu chí KPI"
                name="lv001"
                rules={[{ required: true, message: 'Vui lòng nhập mã tiêu chí' }]}
            >
                <Input placeholder="Nhập mã tiêu chí" maxLength={32} />
            </Form.Item>

            <Form.Item
                label="Tên tiêu chí"
                name="lv002"
                rules={[{ required: true, message: 'Vui lòng nhập tên tiêu chí' }]}
            >
                <Input placeholder="Nhập tên tiêu chí" maxLength={225} />
            </Form.Item>

            <Form.Item label="Mô tả" name="lv003">
                <Input.TextArea rows={4} placeholder="Nhập mô tả" />
            </Form.Item>

            <Divider orientation="center" className={styles.dividerSolid}>PHÂN LOẠI & CẤU HÌNH</Divider>
            <Form.Item label="Kiểu đánh giá" name="lv004">
                <SelectKieuDanhGia />
            </Form.Item>

            <Form.Item
                noStyle
                shouldUpdate={(prevValues, currentValues) => prevValues.lv001 !== currentValues.lv001}
            >
                {({ getFieldValue }) => (
                    <Form.Item label="Mã cha" name="lv009">
                        <SelectTieuChiKPI excludeCode={getFieldValue('lv001')} />
                    </Form.Item>
                )}
            </Form.Item>

            <Form.Item label="Số thứ tự" name="lv010">
                <InputNumber style={{ width: '100%' }} placeholder="Nhập số thứ tự" />
            </Form.Item>
        </Form>
    );
}
