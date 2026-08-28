import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, DatePicker, InputNumber, message, Row, Col, Tabs } from 'antd';
import { Save, RotateCcw, FileText } from 'lucide-react';
import dayjs from 'dayjs';
import SelectChiNhanh from '../../../components/DropDown/SelectChiNhanh';
import SelectSoDot from '../../../components/DropDown/SelectSoDot';
import SelectCongViec from '../../../components/DropDown/SelectCongViec';
import SelectNguonPhieu from '../../../components/DropDown/SelectNguonPhieu';
import SelectTaiKhoan from '../../../components/DropDown/SelectTaiKhoan';
import SelectTienTe from '../../../components/DropDown/SelectTienTe';
import SelectPMH from '../../../components/DropDown/SelectPMH';
import SelectNCC from '../../../components/DropDown/SelectNCC';
import SelectMaLienKet from '../../../components/DropDown/SelectMaLienKet';
// Assuming using generic API LoadData
import { lv_LoadDataAPI } from '../../../services/apiServices';

import '../PhieuThu/NhapChiTietThuTien.css';
import './KeToanLuong/TraTienLuong.css'; // Adjust path to CSS

const { TextArea } = Input;
const vclass = 'ac_lv0075';

const NhapPhieuChiNhanhContent = ({ editingRecord, onSuccess, temporaryId, chiTietCount, initialData }) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const isEditing = !!editingRecord;

    useEffect(() => {
        if (editingRecord) {
            form.setFieldsValue({
                ...editingRecord,
                lv022: editingRecord.lv115 || editingRecord.lv022, // Chi nhánh (lv115 in Table -> lv022 in Form)
                lv818: editingRecord.lv018, // Số đợt
                lv114: editingRecord.lv114, // Công việc
                lv801: editingRecord.lv120 || editingRecord.lv001, // Mã phiếu chi
                lv809: editingRecord.lv009 ? dayjs(editingRecord.lv009) : null, // Ngày đề nghị chi
                lv814: editingRecord.lv014 ? dayjs(editingRecord.lv014) : null, // Ngày chi
                lv815: editingRecord.lv015, // Số hóa đơn
                lv116: editingRecord.lv013, // PMH (lv013 in Table -> lv116 in Form)
                lv803: editingRecord.lv003, // Nguồn phiếu
                lv804: editingRecord.lv004, // Mã tham chiếu
                lv899: editingRecord.lv099, // Quyển số
                lv805: editingRecord.lv005, // Tên
                lv806: editingRecord.lv006, // Địa chỉ
                lv898: editingRecord.lv098, // Mã NCC
                lv807: editingRecord.lv007, // Lý do
                lv813: editingRecord.lv013, // Mã liên kết
                lv811: editingRecord.lv011, // Mã tiền tệ
                lv810: editingRecord.lv010, // Tài khoản quỹ
                lv812: editingRecord.lv012, // Tỷ giá quy đổi
            });
        } else {
            form.resetFields();
            form.setFieldsValue({
                lv814: dayjs(),
                lv809: dayjs(),
                lv812: 1,
                lv811: 'VND',
                lv810: '1111',
                ...(initialData || {})
            });
        }
    }, [editingRecord, form, initialData]);

    const handleSubmit = async (values) => {
        if (!isEditing && chiTietCount === 0) {
            message.warning('Vui lòng thêm ít nhất 1 chi tiết phiếu chi');
            return;
        }

        setLoading(true);
        try {
            const apiFunc = isEditing ? 'update' : 'add';
            const submitData = {
                ...values,
                lv001: isEditing ? editingRecord.lv001 : undefined,
                maTam: !isEditing ? temporaryId : undefined,
                lv809: values.lv809 ? values.lv809.format('DD/MM/YYYY') : '',
                lv814: values.lv814 ? values.lv814.format('DD/MM/YYYY') : '',
            };

            const response = await lv_LoadDataAPI(vclass, apiFunc, submitData);
            if (response) {
                message.success(isEditing ? 'Cập nhật phiếu chi thành công!' : 'Tạo phiếu chi thành công!');
                if (!isEditing) handleReset();
                if (onSuccess) onSuccess();
            } else {
                message.error('Có lỗi xảy ra khi lưu dữ liệu!');
            }
        } catch (error) {
            console.error('Error saving:', error);
            message.error('Lỗi kết nối hệ thống!');
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        form.resetFields();
        form.setFieldsValue({
            lv814: dayjs(),
            lv809: dayjs(),
            lv812: 1,
            lv811: 'VND',
            lv810: '1111'
        });
    };

    const handleFinishFailed = (errorInfo) => {
        const fieldNames = {
            lv022: 'Chi nhánh',
            lv814: 'Ngày chi',
            lv116: 'PMH',
            lv804: 'Mã tham chiếu',
            lv813: 'Mã liên kết',
            lv811: 'Mã tiền tệ',
            lv810: 'Tài khoản quỹ',
            lv812: 'Tỷ giá quy đổi',
            lv807: 'Lý do',
            lv805: 'Tên',
            lv898: 'Mã NCC/KH'
        };

        const missingFields = errorInfo.errorFields.map(field => fieldNames[field.name[0]] || field.name[0]);
        message.error(`Vui lòng điền đầy đủ các thông tin bắt buộc: ${missingFields.join(', ')}`);
    };

    return (
        <div className="nhap-phieu-thu-nhanh-container">
            <Card
                title={
                    <div className="chi-tiet-header">
                        <div className="chi-tiet-header-left">
                            <div className="chi-tiet-header-icon">
                                <FileText size={20} />
                            </div>
                            <div>
                                <div className="chi-tiet-header-title">
                                    {isEditing ? "Chỉnh sửa Phiếu Chi" : "Tạo phiếu chi tiền"}
                                </div>
                                <div className="chi-tiet-header-subtitle">
                                    Nhập và quản lý thông tin phiếu chi tiền mặt
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <Button
                                type="default"
                                icon={<RotateCcw size={16} />}
                                onClick={handleReset}
                            >
                                {isEditing ? 'Hoàn tác' : 'Tạo lại'}
                            </Button>
                            <Button
                                type="primary"
                                icon={<Save size={16} />}
                                onClick={() => form.submit()}
                                loading={loading}
                            >
                                {isEditing ? 'Cập nhật' : 'Lưu Phiếu'}
                            </Button>
                        </div>
                    </div>
                }
                className="nhap-phieu-thu-nhanh-card"
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSubmit}
                    onFinishFailed={handleFinishFailed}
                    autoComplete="off"
                    className="nhap-phieu-thu-form"
                >
                    <Tabs
                        defaultActiveKey="basic"
                        items={[
                            {
                                key: 'basic',
                                label: 'Thông tin cơ bản',
                                children: (
                                    <>
                                        <Row gutter={8}>
                                            {/* Row 1: Tất cả thông tin chính */}
                                            <Col xs={24} sm={12} md={6}>
                                                <Form.Item label="Ngày đề nghị" name="lv809">
                                                    <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
                                                </Form.Item>
                                            </Col>
                                            <Col xs={24} sm={12} md={6}>
                                                <Form.Item label="Ngày chi sổ" name="lv814" rules={[{ required: true, message: 'Vui lòng chọn ngày chi' }]}>
                                                    <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
                                                </Form.Item>
                                            </Col>
                                            <Col xs={24} sm={12} md={6}>
                                                <Form.Item label="Số hóa đơn" name="lv815">
                                                    <Input placeholder="Số hóa đơn" />
                                                </Form.Item>
                                            </Col>
                                            <Col xs={24} sm={12} md={6}>
                                                <Form.Item label="Mã NCC" name="lv898">
                                                    <SelectNCC placeholder="Chọn NCC" />
                                                </Form.Item>
                                            </Col>
                                        </Row>

                                        <Row gutter={8}>
                                            {/* Row 2: Tên đối tượng, Địa chỉ, Lý do chi */}
                                            <Col xs={24} sm={12} md={8}>
                                                <Form.Item label="Tên đối tượng" name="lv805">
                                                    <Input placeholder="Nhập tên đối tượng" />
                                                </Form.Item>
                                            </Col>
                                            <Col xs={24} sm={12} md={8}>
                                                <Form.Item label="Địa chỉ" name="lv806">
                                                    <Input placeholder="Nhập địa chỉ" />
                                                </Form.Item>
                                            </Col>
                                            <Col xs={24} sm={12} md={8}>
                                                <Form.Item
                                                    label="Lý do chi"
                                                    name="lv807"
                                                >
                                                    <TextArea placeholder="Nhập lý do chi tiền" rows={1} style={{ resize: 'none' }} />
                                                </Form.Item>
                                            </Col>
                                        </Row>

                                        <Row gutter={8}>
                                            {/* Row 3: Mã tiền tệ, Tài khoản quỹ, Tỷ giá quy đổi */}
                                            <Col xs={24} sm={12} md={8}>
                                                <Form.Item label="Mã tiền tệ" name="lv811" rules={[{ required: true, message: 'Vui lòng chọn tiền tệ' }]}>
                                                    <SelectTienTe placeholder="Chọn tiền tệ" />
                                                </Form.Item>
                                            </Col>
                                            <Col xs={24} sm={12} md={8}>
                                                <Form.Item label="Tài khoản quỹ" name="lv810" rules={[{ required: true, message: 'Vui lòng chọn tài khoản quỹ' }]}>
                                                    <SelectTaiKhoan placeholder="Chọn tài khoản quỹ" />
                                                </Form.Item>
                                            </Col>
                                            <Col xs={24} sm={12} md={8}>
                                                <Form.Item label="Tỷ giá quy đổi" name="lv812" rules={[{ required: true, message: 'Vui lòng nhập tỷ giá' }]}>
                                                    <InputNumber
                                                        style={{ width: '100%' }}
                                                        placeholder="Nhập tỷ giá"
                                                        min={0}
                                                        formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                                        parser={value => value.replace(/\$\s?|(,*)/g, '')}
                                                    />
                                                </Form.Item>
                                            </Col>
                                        </Row>
                                    </>
                                )
                            },
                            {
                                key: 'advanced',
                                label: 'Thông tin nâng cao',
                                children: (
                                    <>
                                        <Row gutter={8}>
                                            {/* Row 1: Chi nhánh, Số đợt, Công việc, PMH */}
                                            <Col xs={24} sm={12} md={6}>
                                                <Form.Item
                                                    label="Chi nhánh"
                                                    name="lv022"
                                                    rules={[{ required: true, message: 'Vui lòng chọn chi nhánh' }]}
                                                >
                                                    <SelectChiNhanh placeholder="Chọn chi nhánh" />
                                                </Form.Item>
                                            </Col>
                                            <Col xs={24} sm={12} md={6}>
                                                <Form.Item label="Số đợt" name="lv818">
                                                    <SelectSoDot placeholder="Chọn số đợt" />
                                                </Form.Item>
                                            </Col>
                                            <Col xs={24} sm={12} md={6}>
                                                <Form.Item label="Công việc" name="lv114">
                                                    <SelectCongViec placeholder="Chọn công việc" />
                                                </Form.Item>
                                            </Col>
                                            <Col xs={24} sm={12} md={6}>
                                                <Form.Item label="PMH" name="lv116">
                                                    <SelectPMH placeholder="Chọn PMH" />
                                                </Form.Item>
                                            </Col>
                                        </Row>

                                        <Row gutter={8}>
                                            {/* Row 2: Nguồn phiếu, Mã tham chiếu, Mã liên kết */}
                                            <Col xs={24} sm={12} md={8}>
                                                <Form.Item label="Nguồn phiếu" name="lv803">
                                                    <SelectNguonPhieu placeholder="Chọn nguồn phiếu" />
                                                </Form.Item>
                                            </Col>
                                            <Col xs={24} sm={12} md={8}>
                                                <Form.Item label="Mã tham chiếu" name="lv804" rules={[{ required: true, message: 'Vui lòng nhập mã tham chiếu' }]}>
                                                    <Input placeholder="Mã tham chiếu" />
                                                </Form.Item>
                                            </Col>
                                            <Col xs={24} sm={12} md={8}>
                                                <Form.Item label="Mã liên kết" name="lv813">
                                                    <SelectMaLienKet placeholder="Nhập mã liên kết" />
                                                </Form.Item>
                                            </Col>
                                        </Row>
                                    </>
                                )
                            }
                        ]}
                    />
                </Form>
            </Card>
        </div>
    );
};

export default NhapPhieuChiNhanhContent;
