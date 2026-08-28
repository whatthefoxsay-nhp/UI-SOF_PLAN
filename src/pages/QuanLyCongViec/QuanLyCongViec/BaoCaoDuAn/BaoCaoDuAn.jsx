import React, { useEffect, useMemo, useState } from 'react';
import {
    Breadcrumb,
    Button,
    Checkbox,
    Col,
    DatePicker,
    Divider,
    Form,
    Input,
    Row,
    Select,
    Space,
    Spin,
    message,
} from 'antd';
import { FileExcelOutlined, FileWordOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { ArrowLeft, Eye, FileText, Home, Printer, RefreshCw } from 'lucide-react';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import { callApi } from '../../../../services/apiServices';
import companyLogo from '../../../../auth/logo.png';
import styles from '../BaoCaoCongViecHangNgay/styles.module.css';

const { Option } = Select;

const reportTypes = [
    { value: 14, label: 'Báo cáo chi tiết dự án' },
    { value: 24, label: 'Báo cáo danh sách dự án' },
    { value: 26, label: 'Báo cáo danh sách dự án - chi tiết cấp hàng' },
    { value: 34, label: 'Báo cáo theo đối tượng khách hàng - tất cả' },
    { value: 44, label: 'Báo cáo theo đối tượng khách hàng - theo BC CT KH' },
];

const dateTypes = [
    { value: 0, label: 'Ngày tạo' },
    { value: 1, label: 'Ngày đóng hồ sơ thầu' },
    { value: 2, label: 'Ngày đóng thầu' },
    { value: 3, label: 'Thời gian dự kiến cấp hàng' },
    { value: 4, label: 'Thời gian hoàn thành dự án' },
];

const showLogOptions = [
    { value: 0, label: 'Ẩn - click vào thấy nhật ký' },
    { value: 1, label: 'Chỉ thấy nhật ký làm việc' },
    { value: 2, label: 'Thấy tất cả' },
];

const baseColumns = [
    { key: 'stt', title: 'STT', width: 44, align: 'center' },
    { key: 'projectId', title: 'Mã dự án', width: 95 },
    { key: 'projectName', title: 'Tên dự án', width: 180 },
    { key: 'customerName', title: 'Công ty/KH', width: 150 },
    { key: 'projectAddress', title: 'Địa chỉ dự án', width: 160 },
    { key: 'saleName', title: 'Sale', width: 110 },
    { key: 'ptttName', title: 'P.TTT', width: 110 },
    { key: 'adName', title: 'AD', width: 110 },
    { key: 'areaName', title: 'Khu vực', width: 100 },
    { key: 'projectTypeName', title: 'Loại hình dự án', width: 130 },
    { key: 'progressName', title: 'Tiến độ', width: 110 },
    { key: 'statusName', title: 'Trạng thái', width: 120 },
    { key: 'winPercentText', title: '% trúng', width: 78, align: 'right' },
    { key: 'expectedSupplyDate', title: 'Dự kiến cấp hàng', width: 112 },
    { key: 'completeDate', title: 'Hoàn thành dự án', width: 112 },
    { key: 'estimateAmountText', title: 'Tổng giá dự toán', width: 120, align: 'right' },
    { key: 'expectedSaleAmountText', title: 'Tổng giá bán dự kiến', width: 135, align: 'right' },
    { key: 'brand', title: 'Thương hiệu', width: 120 },
    { key: 'quoteNos', title: 'Số báo giá', width: 110 },
    { key: 'pbhNos', title: 'PBH', width: 110 },
    { key: 'contactsText', title: 'Thông tin liên hệ', width: 240 },
    { key: 'workLogsText', title: 'Nhật ký làm việc', width: 260 },
    { key: 'note', title: 'Ghi chú', width: 160 },
];

const forecastColumns = [
    { key: 'stt', title: 'STT', width: 44, align: 'center' },
    { key: 'projectName', title: 'Tên dự án', width: 190 },
    { key: 'saleName', title: 'Sale', width: 115 },
    { key: 'ptttName', title: 'P.TTT', width: 115 },
    { key: 'adName', title: 'AD', width: 115 },
    { key: 'statusName', title: 'Trạng thái dự án', width: 130 },
    { key: 'winPercentText', title: '% trúng', width: 80, align: 'right' },
    { key: 'brand', title: 'Thương hiệu/Nhà thầu chào', width: 160 },
    { key: 'q1Text', title: 'Quý I', width: 105, align: 'right' },
    { key: 'q2Text', title: 'Quý II', width: 105, align: 'right' },
    { key: 'q3Text', title: 'Quý III', width: 105, align: 'right' },
    { key: 'q4Text', title: 'Quý IV', width: 105, align: 'right' },
    { key: 'totalText', title: 'Tổng', width: 115, align: 'right' },
];

const customerColumns = [
    { key: 'stt', title: 'STT', width: 44, align: 'center' },
    { key: 'customerName', title: 'Tên công ty', width: 170 },
    { key: 'projectName', title: 'Tên dự án', width: 180 },
    { key: 'saleName', title: 'Sale', width: 115 },
    { key: 'ptttName', title: 'P.TTT', width: 115 },
    { key: 'adName', title: 'AD', width: 115 },
    { key: 'customerObjectName', title: 'Đối tượng khách hàng', width: 155 },
    { key: 'contactsText', title: 'Thông tin liên hệ', width: 260 },
    { key: 'statusName', title: 'Trạng thái', width: 120 },
    { key: 'expectedSaleAmountText', title: 'Tổng giá bán dự kiến', width: 135, align: 'right' },
    { key: 'brand', title: 'Thương hiệu', width: 120 },
    { key: 'workLogsText', title: 'Nhật ký làm việc', width: 260 },
];

const getColumns = (rad) => {
    if (rad === 14) return forecastColumns;
    if (rad === 34 || rad === 44) return customerColumns;
    return baseColumns;
};

const toOptions = (items, valueKey = 'id', labelKey = 'name') =>
    (Array.isArray(items) ? items : []).map((item) => ({
        value: item[valueKey] ?? item.lv001 ?? item.id,
        label: item[labelKey] ?? item.lv002 ?? item.lv003 ?? item.name ?? item.id,
        raw: item,
    }));

const listFilter = (items, query) => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return items;
    return items.filter((item) => `${item.value || ''} ${item.label || ''}`.toLowerCase().includes(normalized));
};

const CheckboxPanel = ({
    title,
    items,
    selected,
    setSelected,
    search,
    setSearch,
    placeholder,
}) => {
    const filtered = useMemo(() => listFilter(items, search), [items, search]);
    const visibleValues = filtered.map((item) => item.value).filter(Boolean);

    return (
        <div style={{ marginBottom: 20 }}>
            <div className={styles.checkboxPanelHeader}>
                <span className={styles.checkboxPanelTitle}>{title} ({selected.length})</span>
                <Checkbox
                    checked={visibleValues.length > 0 && visibleValues.every((value) => selected.includes(value))}
                    indeterminate={selected.some((value) => visibleValues.includes(value)) && !visibleValues.every((value) => selected.includes(value))}
                    onChange={(e) => {
                        if (e.target.checked) {
                            setSelected(Array.from(new Set([...selected, ...visibleValues])));
                        } else {
                            setSelected(selected.filter((value) => !visibleValues.includes(value)));
                        }
                    }}
                >
                    Tất cả
                </Checkbox>
            </div>
            <Input
                placeholder={placeholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={styles.checkboxPanelSearch}
                allowClear
            />
            <div className={styles.checkboxScrollContainer}>
                <Checkbox.Group value={selected} onChange={setSelected} style={{ width: '100%' }}>
                    {filtered.map((item) => (
                        <div key={item.value}>
                            <Checkbox value={item.value} className={styles.checkboxItem}>
                                {item.label}
                            </Checkbox>
                        </div>
                    ))}
                    {filtered.length === 0 && (
                        <div style={{ color: '#aaa', textAlign: 'center', padding: '10px 0' }}>Không tìm thấy dữ liệu</div>
                    )}
                </Checkbox.Group>
            </div>
        </div>
    );
};

const BaoCaoDuAn = () => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [printOrientation, setPrintOrientation] = useState('landscape');
    const [lookups, setLookups] = useState({});
    const [selectedAreas, setSelectedAreas] = useState([]);
    const [selectedSales, setSelectedSales] = useState([]);
    const [selectedPttt, setSelectedPttt] = useState([]);
    const [selectedAds, setSelectedAds] = useState([]);
    const [selectedProgress, setSelectedProgress] = useState([]);
    const [selectedStatuses, setSelectedStatuses] = useState([]);
    const [selectedCustomerObjects, setSelectedCustomerObjects] = useState([]);
    const [searches, setSearches] = useState({});
    const [reportData, setReportData] = useState([]);
    const [reportParams, setReportParams] = useState(null);
    const [summary, setSummary] = useState(null);

    useEffect(() => {
        const fetchLookups = async () => {
            setLoading(true);
            try {
                const data = await callApi('cr_lv0141', 'loadLookups');
                setLookups(data || {});
            } catch (error) {
                console.error('Failed to load project report lookups:', error);
                message.error('Không thể tải tham số báo cáo dự án.');
            } finally {
                setLoading(false);
            }
        };
        fetchLookups();
    }, []);

    const options = useMemo(() => ({
        projects: toOptions(lookups.projects),
        departments: toOptions(lookups.departments),
        employees: toOptions(lookups.employees),
        areas: toOptions(lookups.areas),
        projectTypes: toOptions(lookups.projectTypes),
        progress: toOptions(lookups.progress),
        statuses: toOptions(lookups.statuses),
        customerObjects: toOptions(lookups.customerObjects),
    }), [lookups]);

    const setSearch = (key, value) => setSearches((prev) => ({ ...prev, [key]: value }));

    const handleReset = () => {
        form.resetFields();
        setSelectedAreas([]);
        setSelectedSales([]);
        setSelectedPttt([]);
        setSelectedAds([]);
        setSelectedProgress([]);
        setSelectedStatuses([]);
        setSelectedCustomerObjects([]);
        setSearches({});
        message.info('Đã làm mới các điều kiện lọc.');
    };

    const handleFinish = async (values) => {
        setLoading(true);
        try {
            const rad = Number(values.reportType || 24);
            const payload = {
                rad,
                txtlv002: values.startDate ? values.startDate.format('DD/MM/YYYY') : '',
                txtlv003: values.endDate ? values.endDate.format('DD/MM/YYYY') : '',
                datetype: Number(values.datetype || 0),
                txtlv901: values.projectId || '',
                txtlv004: values.ownerId || '',
                txtlv007: values.departmentId || '',
                txtlv085: selectedAreas.join(','),
                txtlv079: selectedSales.join(','),
                txtlv080: selectedPttt.join(','),
                txtlv081: selectedAds.join(','),
                txtlv084: values.projectType || '',
                txtlv008: selectedProgress.join(','),
                txtlv100: selectedStatuses.join(','),
                DoiTuong: selectedCustomerObjects.join(','),
                isShow: Number(values.isShow || 0),
                isShowFull: values.isShowFull ? 1 : 0,
            };

            const response = await callApi('cr_lv0141', 'loadDataView', payload);
            const rows = Array.isArray(response) ? response : (response?.data || []);
            setReportData(rows);
            setSummary(response?.summary || null);
            setReportParams({
                ...payload,
                title: reportTypes.find((item) => item.value === rad)?.label || 'Báo cáo dự án',
            });
            if (!rows.length) {
                message.warning('Không tìm thấy dữ liệu báo cáo phù hợp.');
            }
        } catch (error) {
            console.error('Failed to load project report:', error);
            message.error('Lỗi khi tải dữ liệu báo cáo dự án.');
        } finally {
            setLoading(false);
        }
    };

    const getExportRows = () => {
        const columns = getColumns(reportParams?.rad);
        return reportData.map((row) => {
            const item = {};
            columns.forEach((col) => {
                item[col.title] = row[col.key] ?? '';
            });
            return item;
        });
    };

    const handleExportExcel = () => {
        if (!reportData.length) {
            message.warning('Không có dữ liệu để xuất!');
            return;
        }
        const rows = getExportRows();
        const worksheet = XLSX.utils.json_to_sheet(rows);
        worksheet['!cols'] = Object.keys(rows[0] || {}).map((key) => ({
            wch: Math.min(60, Math.max(key.length, ...rows.map((row) => String(row[key] || '').length)) + 2),
        }));
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Bao cao du an');
        XLSX.writeFile(workbook, `Bao_cao_du_an_${reportParams?.txtlv002?.replace(/\//g, '-') || 'data'}.xlsx`);
        message.success('Đã tải xuống file Excel thành công!');
    };

    const handleExportWord = () => {
        if (!reportData.length) {
            message.warning('Không có dữ liệu để xuất!');
            return;
        }
        const columns = getColumns(reportParams?.rad);
        const headerHtml = columns.map((col) => `<th style="padding:6px;">${col.title}</th>`).join('');
        const rowsHtml = reportData.map((row) => (
            `<tr>${columns.map((col) => `<td style="padding:6px;">${row[col.key] ?? ''}</td>`).join('')}</tr>`
        )).join('');
        const documentHtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
            <head><meta charset="utf-8"><title>${reportParams?.title || 'Báo cáo dự án'}</title></head>
            <body>
                <div style="text-align:center;font-family:Arial,sans-serif;margin-bottom:24px;">
                    <h1 style="font-size:26px;margin:0 0 10px 0;text-transform:uppercase;">CÔNG TY TNHH SOF</h1>
                    <h2 style="font-size:20px;margin:0 0 6px 0;text-transform:uppercase;">${reportParams?.title || 'Báo cáo dự án'}</h2>
                    <p style="font-size:12px;margin:0 0 20px 0;">Từ ngày: ${reportParams?.txtlv002 || ''} đến ${reportParams?.txtlv003 || ''}</p>
                </div>
                <table border="1" style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif;font-size:11px;">
                    <thead><tr style="background:#f2f2f2;text-align:center;font-weight:bold;">${headerHtml}</tr></thead>
                    <tbody>${rowsHtml}</tbody>
                </table>
            </body>
        </html>`;
        saveAs(new Blob(['\ufeff', documentHtml], { type: 'application/msword' }), 'Bao_cao_du_an.doc');
        message.success('Đã tải xuống file Word thành công!');
    };

    const columns = getColumns(reportParams?.rad);

    return (
        <div className={styles.container}>
            <style dangerouslySetInnerHTML={{
                __html: `
                @page { size: A4 ${printOrientation}; margin: 0 !important; }
                @media print {
                    @page { size: A4 ${printOrientation}; margin: 0 !important; }
                    body, html { margin: 0 !important; padding: 0 !important; background: #fff !important; }
                    body { padding: 12mm 15mm 12mm 12mm !important; }
                    .print-toolbar, aside, header, form, .ant-breadcrumb, [class*="pageTitle"], .ant-divider { display: none !important; }
                    .ant-layout, .ant-layout-content, [class*="container"], [class*="pageWrapper"], #print-content {
                        margin: 0 !important; padding: 0 !important; border: none !important; box-shadow: none !important;
                        background: transparent !important; width: 100% !important; max-width: 100% !important; overflow: visible !important;
                    }
                    .report-table { border: 1px solid #000 !important; width: 100% !important; border-collapse: collapse !important; table-layout: auto !important; }
                    .report-table th, .report-table td { border: 1px solid #000 !important; padding: 7px 9px !important; word-break: break-word !important; }
                    .report-table th { white-space: nowrap !important; text-align: center !important; background: #f5f5f5 !important; }
                }
            `}} />

            <Breadcrumb style={{ marginBottom: 16, fontSize: 14, padding: '12px 16px', borderRadius: 4, boxShadow: '0 1px 2px rgba(0,0,0,0.03)', userSelect: 'none' }}>
                <Breadcrumb.Item>
                    <Home size={14} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                    Trang chủ
                </Breadcrumb.Item>
                <Breadcrumb.Item>Quản lý công việc</Breadcrumb.Item>
                <Breadcrumb.Item>Báo cáo dự án</Breadcrumb.Item>
            </Breadcrumb>

            <div className={styles.pageTitle}>
                <FileText size={22} />
                Báo Cáo Dự Án
            </div>

            {loading && !Object.keys(lookups).length ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '40vh' }}>
                    <Spin size="large" tip="Đang tải tham số..." />
                </div>
            ) : (
                <div className={styles.pageWrapper}>
                    <Form
                        form={form}
                        layout="vertical"
                        onFinish={handleFinish}
                        initialValues={{
                            startDate: dayjs().startOf('month'),
                            endDate: dayjs(),
                            datetype: 0,
                            reportType: 24,
                            isShow: 0,
                            isShowFull: true,
                        }}
                        className={styles.customForm}
                    >
                        <Row gutter={[32, 0]}>
                            <Col xs={24} md={12}>
                                <Divider orientation="left" orientationMargin={0} className={styles.dividerSolid}>
                                    Thông tin & thời gian báo cáo
                                </Divider>
                                <Row gutter={16}>
                                    <Col span={12}>
                                        <Form.Item label="Từ ngày" name="startDate" rules={[{ required: true, message: 'Chọn ngày bắt đầu!' }]}>
                                            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" allowClear={false} />
                                        </Form.Item>
                                    </Col>
                                    <Col span={12}>
                                        <Form.Item label="Đến ngày" name="endDate" rules={[{ required: true, message: 'Chọn ngày kết thúc!' }]}>
                                            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" allowClear={false} />
                                        </Form.Item>
                                    </Col>
                                </Row>
                                <Form.Item label="Lọc theo ngày" name="datetype">
                                    <Select>{dateTypes.map((item) => <Option key={item.value} value={item.value}>{item.label}</Option>)}</Select>
                                </Form.Item>
                                <Form.Item label="Dự án" name="projectId">
                                    <Select dropdownMatchSelectWidth={false} placeholder="-- Tất cả dự án --" allowClear showSearch optionFilterProp="label">
                                        {options.projects.map((item) => <Option key={item.value} value={item.value} label={`${item.value} - ${item.label}`}>{item.value} - {item.label}</Option>)}
                                    </Select>
                                </Form.Item>
                                <Form.Item label="Người phụ trách" name="ownerId">
                                    <Select dropdownMatchSelectWidth={false} placeholder="-- Tất cả nhân viên --" allowClear showSearch optionFilterProp="label">
                                        {options.employees.map((item) => <Option key={item.value} value={item.value} label={`${item.value} - ${item.label}`}>{item.value} - {item.label}</Option>)}
                                    </Select>
                                </Form.Item>
                                <Form.Item label="Phòng ban" name="departmentId">
                                    <Select dropdownMatchSelectWidth={false} placeholder="-- Tất cả phòng ban --" allowClear showSearch optionFilterProp="label">
                                        {options.departments.map((item) => <Option key={item.value} value={item.value} label={`${item.value} - ${item.label}`}>{item.label}</Option>)}
                                    </Select>
                                </Form.Item>
                                <Form.Item label="Loại hình dự án" name="projectType">
                                    <Select dropdownMatchSelectWidth={false} placeholder="-- Tất cả loại hình --" allowClear showSearch optionFilterProp="label">
                                        {options.projectTypes.map((item) => <Option key={item.value} value={item.value} label={`${item.value} - ${item.label}`}>{item.label}</Option>)}
                                    </Select>
                                </Form.Item>
                                <Form.Item label="Loại báo cáo xuất" name="reportType">
                                    <Select>{reportTypes.map((item) => <Option key={item.value} value={item.value}>{item.label}</Option>)}</Select>
                                </Form.Item>
                                <Form.Item label="Hiển thị nhật ký làm việc" name="isShow">
                                    <Select>{showLogOptions.map((item) => <Option key={item.value} value={item.value}>{item.label}</Option>)}</Select>
                                </Form.Item>
                                <Form.Item name="isShowFull" valuePropName="checked">
                                    <Checkbox>Hiển thị thông tin đối tượng</Checkbox>
                                </Form.Item>
                            </Col>

                            <Col xs={24} md={12}>
                                <Divider orientation="left" orientationMargin={0} className={styles.dividerSolid}>
                                    Bộ lọc chi tiết (Chọn nhiều)
                                </Divider>
                                <CheckboxPanel title="Chọn khu vực" items={options.areas} selected={selectedAreas} setSelected={setSelectedAreas} search={searches.areas || ''} setSearch={(value) => setSearch('areas', value)} placeholder="Tìm khu vực..." />
                                <CheckboxPanel title="Chọn nhân viên KD" items={options.employees} selected={selectedSales} setSelected={setSelectedSales} search={searches.sales || ''} setSearch={(value) => setSearch('sales', value)} placeholder="Tìm nhân viên KD..." />
                                <CheckboxPanel title="Chọn nhân viên P.TTT" items={options.employees} selected={selectedPttt} setSelected={setSelectedPttt} search={searches.pttt || ''} setSearch={(value) => setSearch('pttt', value)} placeholder="Tìm nhân viên P.TTT..." />
                                <CheckboxPanel title="Chọn nhân viên AD" items={options.employees} selected={selectedAds} setSelected={setSelectedAds} search={searches.ads || ''} setSearch={(value) => setSearch('ads', value)} placeholder="Tìm nhân viên AD..." />
                                <CheckboxPanel title="Chọn tiến độ dự án" items={options.progress} selected={selectedProgress} setSelected={setSelectedProgress} search={searches.progress || ''} setSearch={(value) => setSearch('progress', value)} placeholder="Tìm tiến độ..." />
                                <CheckboxPanel title="Chọn trạng thái dự án" items={options.statuses} selected={selectedStatuses} setSelected={setSelectedStatuses} search={searches.statuses || ''} setSearch={(value) => setSearch('statuses', value)} placeholder="Tìm trạng thái..." />
                                <CheckboxPanel title="Chọn đối tượng khách hàng" items={options.customerObjects} selected={selectedCustomerObjects} setSelected={setSelectedCustomerObjects} search={searches.customerObjects || ''} setSearch={(value) => setSearch('customerObjects', value)} placeholder="Tìm đối tượng khách hàng..." />
                            </Col>
                        </Row>

                        <Divider style={{ margin: '20px 0 16px' }} />
                        <Space size="middle">
                            <Button type="primary" htmlType="submit" icon={<Eye size={16} />} loading={loading} className={styles.actionButtonPrimary}>
                                Xem Báo Cáo
                            </Button>
                            <Button onClick={handleReset} disabled={loading} icon={<RefreshCw size={16} />} className={styles.actionButtonReset}>
                                Làm Mới
                            </Button>
                        </Space>
                    </Form>

                    {reportParams && (
                        <div className={styles.reportViewContainer} style={{ marginTop: 30 }}>
                            <div className="print-toolbar" style={{ backgroundColor: '#fff', borderBottom: '1px solid #e1e8ed', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginBottom: 20, borderRadius: 12 }}>
                                <Space size="middle">
                                    <Button icon={<ArrowLeft size={16} />} onClick={() => { setReportParams(null); setReportData([]); setSummary(null); }} className={styles.actionButtonReset}>
                                        Ẩn báo cáo
                                    </Button>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{ fontWeight: 600, fontSize: 13, color: '#4b4344' }}>Khổ giấy:</span>
                                        <Select dropdownMatchSelectWidth={false} value={printOrientation} onChange={setPrintOrientation} style={{ width: 140 }}>
                                            <Option value="portrait">Khổ dọc (A4)</Option>
                                            <Option value="landscape">Khổ ngang (A4)</Option>
                                        </Select>
                                    </div>
                                </Space>
                                <Space>
                                    <Button type="primary" icon={<Printer size={16} />} onClick={() => window.print()} className={styles.actionButtonPrimary}>In Báo Cáo</Button>
                                    <Button icon={<FileExcelOutlined />} onClick={handleExportExcel} style={{ backgroundColor: '#2ecc71', borderColor: '#2ecc71', color: '#fff', height: 40, borderRadius: 10 }}>Xuất Excel</Button>
                                    <Button icon={<FileWordOutlined />} onClick={handleExportWord} style={{ backgroundColor: '#3498db', borderColor: '#3498db', color: '#fff', height: 40, borderRadius: 10 }}>Xuất Word</Button>
                                </Space>
                            </div>

                            <div id="print-content" style={{ padding: 20, backgroundColor: '#fff', borderRadius: 12, border: '1px solid #c1d9f3' }}>
                                <table border="0" style={{ width: '100%', marginBottom: 24, borderCollapse: 'collapse' }}>
                                    <tbody>
                                        <tr>
                                            <td style={{ width: '20%', textAlign: 'left', verticalAlign: 'middle' }}>
                                                <img src={companyLogo} alt="Logo" style={{ height: 70, display: 'block' }} />
                                            </td>
                                            <td style={{ width: '60%', textAlign: 'center', verticalAlign: 'middle' }}>
                                                <div style={{ font: 'bold 26px Arial', textTransform: 'uppercase', letterSpacing: 0.5, color: '#111' }}>CÔNG TY TNHH SOF</div>
                                            </td>
                                            <td style={{ width: '20%' }} />
                                        </tr>
                                    </tbody>
                                </table>

                                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                                    <h2 style={{ font: 'bold 22px Arial', margin: '0 0 6px 0', textTransform: 'uppercase' }}>{reportParams.title}</h2>
                                    <div style={{ font: 'italic 13px Arial', color: '#333' }}>
                                        Từ ngày: <span style={{ fontWeight: 600 }}>{reportParams.txtlv002 || '...'}</span> đến ngày: <span style={{ fontWeight: 600 }}>{reportParams.txtlv003 || '...'}</span>
                                    </div>
                                </div>

                                <div style={{ overflowX: 'auto' }}>
                                    <table className="report-table" border="1" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: 'Arial, sans-serif' }}>
                                        <thead>
                                            <tr style={{ backgroundColor: '#f5f5f5', textAlign: 'center', fontWeight: 'bold', height: 36 }}>
                                                {columns.map((col) => <th key={col.key} style={{ width: col.width }}>{col.title}</th>)}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {reportData.length > 0 ? reportData.map((row, index) => (
                                                <tr key={`${row.projectId || 'project'}-${index}`}>
                                                    {columns.map((col) => (
                                                        <td key={col.key} style={{ textAlign: col.align || 'left', verticalAlign: 'top', padding: '6px 8px' }}>
                                                            {row[col.key] ?? ''}
                                                        </td>
                                                    ))}
                                                </tr>
                                            )) : (
                                                <tr>
                                                    <td colSpan={columns.length} style={{ textAlign: 'center', padding: 24, color: '#999' }}>Không có dữ liệu</td>
                                                </tr>
                                            )}
                                            {summary && reportParams.rad === 14 && reportData.length > 0 && (
                                                <tr style={{ fontWeight: 'bold', background: '#fafafa' }}>
                                                    <td colSpan={8} style={{ textAlign: 'right' }}>Tổng</td>
                                                    <td style={{ textAlign: 'right' }}>{summary.q1Text || ''}</td>
                                                    <td style={{ textAlign: 'right' }}>{summary.q2Text || ''}</td>
                                                    <td style={{ textAlign: 'right' }}>{summary.q3Text || ''}</td>
                                                    <td style={{ textAlign: 'right' }}>{summary.q4Text || ''}</td>
                                                    <td style={{ textAlign: 'right' }}>{summary.totalText || ''}</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default BaoCaoDuAn;
