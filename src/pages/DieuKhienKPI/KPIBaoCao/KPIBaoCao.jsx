import React, { useCallback, useState } from 'react';
import { Form, Button, Row, Col, Select, Checkbox, Card, Table, Breadcrumb, message, Space, Tag, Tooltip } from 'antd';
import { HomeOutlined, DownloadOutlined, ReloadOutlined } from '@ant-design/icons';
import { FileText, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { lv_LoadDataAPI } from '../../../services/apiServices';
import SelectLanTinhLuong from '../../../components/DropDown/SelectLanTinhLuong';
import SelectPhongBan from '../../../components/DropDown/SelectPhongBan';
import SelectNhanVien from '../../../components/DropDown/SelectNhanVien';
import CheckboxTrangThaiNV from '../../../components/CheckBox/CheckboxTrangThaiNV';
import styles from '../../ChamCong&TienLuong/ThongTinCC/style.module.css';
import './KPIBaoCao.css';

const { Option } = Select;

const EMPTY_STATUSES = [];

const KPIBaoCao = () => {
    const [form] = Form.useForm();
    const [reportData, setReportData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [reportTitle, setReportTitle] = useState('');

    const handleReport = useCallback(async () => {
        setLoading(true);
        try {
            const values = form.getFieldsValue();
            const period = values.thangDanhGia;
            const department = values.phongBan;
            const employee = values.maNhanVien;
            const statuses = values.trangThaiNV || EMPTY_STATUSES;
            const template = values.mauBaoCao;
            const sortBy = values.sapXep;

            const payload = {
                thangDanhGia: period || '',
                phongBan: department || '',
                maNhanVien: employee || '',
                trangThaiNV: statuses.join(','),
                mauBaoCao: template,
                sapXep: sortBy,
                layPhongBanCon: values.layPhongBanCon ? 1 : 0,
            };

            const response = await lv_LoadDataAPI('ki_lv0010', 'LoadDataView', payload);
            let rows = Array.isArray(response) ? response : (Array.isArray(response?.data) ? response.data : []);
            rows = rows.map((item) => ({
                ...item,
                key: item.lv001 || `temp_${Math.random()}`,
            }));

            if (department) {
                rows = rows.filter((item) =>
                    String(item.lv029_ ?? '').includes(String(department)) ||
                    String(item.lv029 ?? '').includes(String(department))
                );
            }
            if (employee) {
                rows = rows.filter((item) =>
                    String(item.lv002 ?? '').includes(String(employee))
                );
            }
            if (statuses.length > 0) {
                rows = rows.filter((item) => {
                    const s = item.lv097 ?? item.trangThaiNV;
                    return s == null || String(s).trim() === '' || statuses.includes(String(s));
                });
            }

            setReportData(rows);
            setReportTitle(`Kỳ: ${period ? String(period).split('/').pop() : 'Tất cả'}${department ? ` - PB: ${department}` : ''}`);
            message.success(`Tìm thấy ${rows.length} dòng dữ liệu báo cáo KPI`);
        } catch (error) {
            console.error('Lỗi khi tạo báo cáo KPI:', error);
            message.error('Có lỗi xảy ra khi tạo báo cáo');
        } finally {
            setLoading(false);
        }
    }, [form]);

    const handleReset = useCallback(() => {
        form.resetFields();
        setReportData([]);
        setReportTitle('');
    }, [form]);

    const getDataForExport = useCallback(() => {
        if (!reportData.length) return [];
        return reportData.map((item, index) => ({
            'STT': index + 1,
            'Mã NV': item.lv002 || '',
            'Tên nhân viên': item.lv099 || '',
            'CMND': item.lv010 || '',
            'Phòng ban': item.lv029_ || item.lv029 || '',
            'Kỳ tính': item.lv003_ || item.lv003 || '',
            'Tổng điểm TB': item.lv006 != null ? item.lv006 : 0,
        }));
    }, [reportData]);

    const handleExportExcel = useCallback(() => {
        const data = getDataForExport();
        if (data.length === 0) {
            message.warning('Không có dữ liệu để xuất! Hãy bấm "Xem Báo Cáo" trước.');
            return;
        }
        const worksheet = XLSX.utils.json_to_sheet(data);
        const keys = Object.keys(data[0]);
        worksheet['!cols'] = keys.map((key) => ({
            wch: Math.max(key.length, ...data.map((row) => (row[key] ? String(row[key]).length : 0))) + 2,
        }));
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'BaoCaoKPI');
        XLSX.writeFile(workbook, `BaoCaoKPI_${new Date().toISOString().slice(0, 10)}.xlsx`);
        message.success('Đã xuất file Excel thành công!');
    }, [getDataForExport]);

    const handleExportWord = useCallback(() => {
        const data = getDataForExport();
        if (data.length === 0) {
            message.warning('Không có dữ liệu để xuất! Hãy bấm "Xem Báo Cáo" trước.');
            return;
        }
        const headers = Object.keys(data[0]);
        const thead = headers.map((h) => `<th style="padding: 6px; border: 1px solid #333; background: #1890ff; color: #fff;">${h}</th>`).join('');
        const tbody = data.map((row) =>
            `<tr>${headers.map((h) => `<td style="padding: 6px; border: 1px solid #333;">${row[h] ?? ''}</td>`).join('')}</tr>`
        ).join('');
        const html = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset='utf-8'><title>Báo Cáo KPI Theo Điều Kiện</title></head>
        <body>
            <h2 style="text-align: center;">BÁO CÁO KPI THEO ĐIỀU KIỆN</h2>
            <p style="text-align: center;">${reportTitle}</p>
            <table border="1" style="border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; font-size: 12px;">
                <thead><tr>${thead}</tr></thead>
                <tbody>${tbody}</tbody>
            </table>
        </body></html>`;
        const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
        saveAs(blob, `BaoCaoKPI_${new Date().toISOString().slice(0, 10)}.doc`);
        message.success('Đã xuất file Word thành công!');
    }, [getDataForExport, reportTitle]);

    const columns = [
        {
            title: 'STT',
            dataIndex: 'index',
            key: 'index',
            render: (text, record, index) => index + 1,
            width: 60,
            align: 'center',
        },
        {
            title: 'Mã NV',
            dataIndex: 'lv002',
            key: 'lv002',
            width: 120,
        },
        {
            title: 'Tên nhân viên',
            dataIndex: 'lv099',
            key: 'lv099',
        },
        {
            title: 'CMND',
            dataIndex: 'lv010',
            key: 'lv010',
            width: 150,
        },
        {
            title: 'Phòng ban',
            dataIndex: 'lv029_',
            key: 'lv029_',
            width: 150,
        },
        {
            title: 'Kỳ tính',
            dataIndex: 'lv003_',
            key: 'lv003_',
            width: 180,
        },
        {
            title: 'Tổng điểm TB',
            dataIndex: 'lv006',
            key: 'lv006',
            align: 'right',
            width: 150,
        },
    ];

    return (
        <div className={styles.khoContainer}>
            <Breadcrumb className={styles.pageBreadcrumb}>
                <Breadcrumb.Item>
                    <HomeOutlined style={{ marginRight: 8 }} />
                    Trang chủ
                </Breadcrumb.Item>
                <Breadcrumb.Item>Quản lý công việc</Breadcrumb.Item>
                <Breadcrumb.Item>Điều khiển KPI</Breadcrumb.Item>
                <Breadcrumb.Item>Báo cáo KPI</Breadcrumb.Item>
            </Breadcrumb>

            <div className={styles.khoHeader}>
                <div className={styles.khoTitle}>
                    <FileText size={28} strokeWidth={1.5} />
                    <div>
                        <h2 className={styles.khoTitleText}>Báo Cáo KPI Theo Điều Kiện</h2>
                    </div>
                </div>
                <div className={styles.khoActions}>
                    <Tooltip title="Đặt lại bộ lọc">
                        <Button type="dashed" icon={<ReloadOutlined />} onClick={handleReset}>
                            Đặt lại
                        </Button>
                    </Tooltip>
                </div>
            </div>

            <Card className={`${styles.cardShadow} ${styles.customForm}`} bordered={false}>
                <Form
                    form={form}
                    layout="horizontal"
                    labelCol={{ span: 8 }}
                    wrapperCol={{ span: 16 }}
                    initialValues={{ layPhongBanCon: true }}
                >
                    <Row gutter={24}>
                        <Col span={12}>
                            <Form.Item label="Chọn tháng đánh giá" name="thangDanhGia">
                                <SelectLanTinhLuong style={{ width: '100%' }} placeholder="-- Chọn thông số tính lương --" allowClear />
                            </Form.Item>

                            <Form.Item label="Phòng ban" name="phongBan">
                                <SelectPhongBan style={{ width: '100%' }} placeholder="-- Chọn phòng ban --" allowClear />
                            </Form.Item>

                            <Form.Item name="layPhongBanCon" valuePropName="checked" wrapperCol={{ offset: 8, span: 16 }}>
                                <Checkbox>Lấy phòng ban con</Checkbox>
                            </Form.Item>

                            <Form.Item label="Nhân viên" name="maNhanVien">
                                <SelectNhanVien style={{ width: '100%' }} placeholder="-- Chọn nhân viên --" allowClear />
                            </Form.Item>

                            <Form.Item label="Mẫu báo cáo" name="mauBaoCao" initialValue="0">
                                <Select>
                                    <Option value="0">Mẫu theo tháng</Option>
                                    <Option value="1">Mẫu bình quân năm</Option>
                                </Select>
                            </Form.Item>

                            <Form.Item label="Sắp xếp" name="sapXep" initialValue="4">
                                <Select>
                                    <Option value="0">Theo phòng ban</Option>
                                    <Option value="1">Theo nhân viên</Option>
                                    <Option value="2">Theo nhóm</Option>
                                    <Option value="3">Theo mã chấm công</Option>
                                    <Option value="4">Theo ngày đơn</Option>
                                </Select>
                            </Form.Item>
                        </Col>

                        <Col span={12}>
                            <Form.Item label="Trạng thái nhân viên" name="trangThaiNV">
                                <CheckboxTrangThaiNV />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row justify="center" style={{ marginTop: 24, marginBottom: 8 }}>
                        <Col>
                            <Space>
                                <Button type="primary" icon={<FileText size={16} />} onClick={handleReport} loading={loading}>
                                    Xem Báo Cáo
                                </Button>
                                <Tooltip title="Xuất dữ liệu đã lọc ra Excel">
                                    <Button type="default" icon={<FileSpreadsheet size={16} />} onClick={handleExportExcel} disabled={reportData.length === 0}>
                                        Xuất Excel
                                    </Button>
                                </Tooltip>
                                <Tooltip title="Xuất dữ liệu đã lọc ra Word">
                                    <Button type="default" icon={<FileText size={16} />} onClick={handleExportWord} disabled={reportData.length === 0}>
                                        Xuất Word
                                    </Button>
                                </Tooltip>
                            </Space>
                        </Col>
                    </Row>
                </Form>
            </Card>

            <Card
                className={styles.mainCard}
                bordered={false}
                title={reportTitle && (
                    <Space>
                        <FileText size={16} />
                        {reportTitle}
                        <Tag color="blue">{reportData.length} dòng</Tag>
                    </Space>
                )}
            >
                <Table
                    columns={columns}
                    dataSource={reportData}
                    loading={loading}
                    className={styles.customTable}
                    scroll={{ x: 'max-content' }}
                    pagination={{
                        pageSize: 20,
                        showSizeChanger: true,
                        pageSizeOptions: ['10', '20', '50', '100'],
                        showTotal: (total) => `Tổng số: ${total}`,
                    }}
                    locale={{ emptyText: 'Bấm "Xem Báo Cáo" để hiển thị kết quả theo điều kiện lọc' }}
                />
            </Card>
        </div>
    );
};

export default KPIBaoCao;
