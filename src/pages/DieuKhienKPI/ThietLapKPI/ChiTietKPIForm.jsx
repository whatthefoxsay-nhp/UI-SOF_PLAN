import React from 'react';
import { Form, Input, Select, InputNumber, Divider } from 'antd';
import { useMasterData } from '../../../hooks/useApiQueries';
import styles from '../../ChamCong&TienLuong/ThongTinCC/style.module.css';

const ChiTietKPIForm = ({ form, onFinish, initialValues, parentValues }) => {
    // Fetch Criteria List for Select
    const { data: criteriaList } = useMasterData('ki_lv0002_select', 'TieuChiKPI');

    return (
        <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            className={styles.customForm}
        >
            <Divider orientation="center" className={styles.dividerSolid}>THÔNG TIN LIÊN KẾT</Divider>
            <Form.Item
                name="lv001"
                label="Mã tự động"
            >
                <Input disabled placeholder="Tự động sinh" />
            </Form.Item>

            <Form.Item
                label="KPI"
            >
                <Input disabled value={parentValues?.lv002} />
            </Form.Item>

            <Divider orientation="center" className={styles.dividerSolid}>TIÊU CHÍ & GIÁ TRỊ</Divider>
            <Form.Item
                name="lv003"
                label="Tiêu chí KPI"
                rules={[{ required: true, message: 'Vui lòng chọn tiêu chí' }]}
            >
                <Select
                    showSearch
                    optionFilterProp="children"
                    placeholder="Chọn tiêu chí"
                    filterOption={(input, option) =>
                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                    options={criteriaList?.map(item => ({
                        value: item.lv001,
                        label: `${item.lv002} (${item.lv001})`
                    }))}
                />
            </Form.Item>

            <Form.Item
                name="lv004"
                label="Hệ số tính"
                rules={[{ required: true, message: 'Nhập hệ số' }]}
                initialValue={1}
            >
                <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>

            <Form.Item
                name="lv005"
                label="Giá trị mặc định"
                initialValue={0}
            >
                <InputNumber style={{ width: '100%' }} />
            </Form.Item>

            <Divider orientation="center" className={styles.dividerSolid}>GHI CHÚ</Divider>
            <Form.Item
                name="lv006"
                label="Ghi chú"
            >
                <Input placeholder="Nhập ghi chú" />
            </Form.Item>
        </Form>
    );
};

export default ChiTietKPIForm;
