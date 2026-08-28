import React, { useEffect, useState, useMemo } from 'react';
import {
    Breadcrumb,
    Button,
    Col,
    DatePicker,
    Divider,
    Form,
    Input,
    Row,
    Select,
    Space,
    Checkbox,
    Spin,
    message,
} from 'antd';
import dayjs from 'dayjs';
import { FileText, Home, RefreshCw, Eye, ArrowLeft, Printer } from 'lucide-react';
import { FileExcelOutlined, FileWordOutlined } from '@ant-design/icons';
import { callApi } from '../../../../services/apiServices';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import styles from './styles.module.css';
import companyLogo from '../../../../auth/logo.png';

const { Option } = Select;

const BaoCaoCongViecHangNgay = () => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    // Removed viewMode to render report inline directly below the form
    const [printOrientation, setPrintOrientation] = useState('landscape'); // 'portrait' | 'landscape'
    const [logoBase64, setLogoBase64] = useState('');

    useEffect(() => {
        const convertLogo = () => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                const dataURL = canvas.toDataURL('image/png');
                setLogoBase64(dataURL);
            };
            img.onerror = (err) => {
                console.error('Canvas conversion failed, trying fetch fallback:', err);
                fetch(companyLogo)
                    .then(res => res.blob())
                    .then(blob => {
                        const reader = new FileReader();
                        reader.onloadend = () => setLogoBase64(reader.result);
                        reader.readAsDataURL(blob);
                    })
                    .catch(fetchErr => console.error('Fetch conversion failed:', fetchErr));
            };
            img.src = companyLogo;
        };
        if (companyLogo) {
            convertLogo();
        }
    }, []);

    // Lookups data
    const [departmentList, setDepartmentList] = useState([]);
    const [employeeList, setEmployeeList] = useState([]);
    const [planTypeList, setPlanTypeList] = useState([]);
    const [workCodeList, setWorkCodeList] = useState([]);
    const [statusList, setStatusList] = useState([]);

    // Checkboxes selection state
    const [selectedDepts, setSelectedDepts] = useState([]);
    const [selectedWorkCodes, setSelectedWorkCodes] = useState([]);
    const [selectedStatuses, setSelectedStatuses] = useState([]);

    // Search filter queries for checkboxes
    const [deptSearch, setDeptSearch] = useState('');
    const [workCodeSearch, setWorkCodeSearch] = useState('');
    const [statusSearch, setStatusSearch] = useState('');

    // Report data states
    const [reportData, setReportData] = useState([]);
    const [reportParams, setReportParams] = useState(null);

    // Fetch lookups on mount
    useEffect(() => {
        const fetchLookups = async () => {
            setLoading(true);
            try {
                const [deptRes, empRes, lookupsRes] = await Promise.all([
                    callApi('hr_lv0002', 'loadPhongBan'),
                    callApi('hr_lv0020', 'loadNhanVien'),
                    callApi('cr_lv0006', 'loadLookups'),
                ]);

                if (Array.isArray(deptRes)) setDepartmentList(deptRes);
                if (Array.isArray(empRes)) setEmployeeList(empRes);
                if (lookupsRes) {
                    if (Array.isArray(lookupsRes.planTypes)) setPlanTypeList(lookupsRes.planTypes);
                    if (Array.isArray(lookupsRes.workCodes)) setWorkCodeList(lookupsRes.workCodes);
                    if (Array.isArray(lookupsRes.statuses)) setStatusList(lookupsRes.statuses);
                }
            } catch (error) {
                console.error('Failed to load lookups for daily report:', error);
                message.error('Không thể tải các tham số cấu hình. Vui lòng thử lại.');
            } finally {
                setLoading(false);
            }
        };
        fetchLookups();
    }, []);

    // Filter checkbox lists based on search terms
    const filteredDepts = useMemo(() => {
        return departmentList.filter(item => {
            const name = item.lv003 || item.lv002 || item.name || '';
            const code = item.lv001 || '';
            return name.toLowerCase().includes(deptSearch.toLowerCase()) ||
                code.toLowerCase().includes(deptSearch.toLowerCase());
        });
    }, [departmentList, deptSearch]);

    const filteredWorkCodes = useMemo(() => {
        return workCodeList.filter(item => {
            const name = item.name || '';
            const code = item.code || '';
            return name.toLowerCase().includes(workCodeSearch.toLowerCase()) ||
                code.toLowerCase().includes(workCodeSearch.toLowerCase());
        });
    }, [workCodeList, workCodeSearch]);

    const filteredStatuses = useMemo(() => {
        return statusList.filter(item => {
            const name = item.name || item.code || '';
            return name.toLowerCase().includes(statusSearch.toLowerCase());
        });
    }, [statusList, statusSearch]);

    // Handle Checkbox Changes
    const handleDeptChange = (checkedValues) => {
        setSelectedDepts(checkedValues);
    };

    const handleWorkCodeChange = (checkedValues) => {
        setSelectedWorkCodes(checkedValues);
    };

    const handleStatusChange = (checkedValues) => {
        setSelectedStatuses(checkedValues);
    };

    // Toggle Select All
    const toggleSelectAllDepts = (e) => {
        if (e.target.checked) {
            setSelectedDepts(filteredDepts.map(item => item.lv001));
        } else {
            setSelectedDepts([]);
        }
    };

    const toggleSelectAllWorkCodes = (e) => {
        if (e.target.checked) {
            setSelectedWorkCodes(filteredWorkCodes.map(item => item.id));
        } else {
            setSelectedWorkCodes([]);
        }
    };

    const toggleSelectAllStatuses = (e) => {
        if (e.target.checked) {
            setSelectedStatuses(filteredStatuses.map(item => item.id));
        } else {
            setSelectedStatuses([]);
        }
    };

    // Reset Form
    const handleReset = () => {
        form.resetFields();
        setSelectedDepts([]);
        setSelectedWorkCodes([]);
        setSelectedStatuses([]);
        setDeptSearch('');
        setWorkCodeSearch('');
        setStatusSearch('');
        message.info('Đã làm mới các điều kiện lọc.');
    };

    // Trigger report loading on form submit
    const handleFinish = async (values) => {
        setLoading(true);
        try {
            const payload = {
                dateworkfrom: values.startDate ? values.startDate.format('DD/MM/YYYY') : '',
                dateworkto: values.endDate ? values.endDate.format('DD/MM/YYYY') : '',
                datetype: parseInt(values.datetype || '0', 10),
                lv029: selectedDepts.join(','),
                txtlv002: values.txtlv002 || '',
                txtlv807: values.txtlv807 || '',
                lv003: selectedWorkCodes.join(','),
                lv027: selectedStatuses.join(','),
                lv006: values.txtlv006 || '',
                lv007: values.txtlv007 || '',
                lv008: values.txtlv008 || '',
            };

            const rad = parseInt(values.reportType || '1', 10);
            const func = rad === 2 ? 'loadListReport' : 'loadReport';

            const data = await callApi('cr_lv0006', func, payload);
            if (Array.isArray(data) && data.length > 0) {
                setReportData(data);
                setReportParams({
                    rad,
                    startDate: payload.dateworkfrom,
                    endDate: payload.dateworkto
                });
                message.success(`Tải dữ liệu báo cáo thành công! (${data.length} bản ghi)`);
            } else {
                setReportData([]);
                message.warning('Không tìm thấy dữ liệu báo cáo phù hợp.');
            }
        } catch (error) {
            console.error('Failed to load report data:', error);
            message.error('Lỗi khi tải dữ liệu báo cáo.');
        } finally {
            setLoading(false);
        }
    };

    // Client-side Excel Export
    const handleExportExcel = () => {
        if (reportData.length === 0) {
            message.warning('Không có dữ liệu để xuất!');
            return;
        }

        let dataToExport = [];
        if (reportParams.rad === 1) {
            dataToExport = reportData.map((item) => ({
                'STT': item.stt,
                'Thời gian': item.thoiGian,
                'Công ty': item.tenCTy || item.congTy || '',
                'Dự án': item.duAn || '',
                'NVPT': item.nvptTen || item.nvptId || '',
                'Thông tin liên hệ': item.lienHe || '',
                'Nội dung công việc': item.noiDungCV || '',
                'Địa chỉ gặp': item.diaChiGap || '',
                'Kết quả': item.ketQua || '',
                'Hoàn thành': item.hoanThanhText || '',
                'Phản hồi': item.phanHoi || '',
                'Người phản hồi': item.nguoiPhanHoiTen || '',
                'Ngày giờ phản hồi': item.ngayGioPhanHoi || ''
            }));
        } else {
            dataToExport = reportData.map((item) => ({
                'STT': item.stt,
                'Mã công việc': item.maCongViec,
                'Tiến độ': item.tienDo || '',
                'Thương hiệu': item.thuongHieu || '',
                'Địa chỉ dự án': item.diaChiDuAn || '',
                'Trạng thái dự án': item.trangThaiDuAn || '',
                'Loại hình dự án': item.loaiHinhDuAn || '',
                'Sale': item.sale || '',
                'P.TTT': item.pTTT || '',
                'AD': item.ad || '',
                'Tên dự án': item.tenDuAn || '',
                'Nội dung công việc': item.noiDungCV || '',
                'Ngày giao': item.ngayGiao || '',
                'Ngày hạn': item.ngayHan || '',
                'NV làm chính': item.nvLamChinh || '',
                'NV làm phụ': item.nvLamPhu || '',
                'Người duyệt': item.nguoiDuyet || '',
                'Trạng thái CV': item.trangThaiCV || '',
                'Ghi chú': item.attachment || ''
            }));
        }

        const title = reportParams.rad === 2 ? 'BÁO CÁO KẾ HOẠCH CÔNG VIỆC CHI TIẾT' : 'BÁO CÁO CÔNG VIỆC HÀNG NGÀY';
        const dateText = `Từ ngày: ${reportParams.startDate} đến ngày: ${reportParams.endDate}`;

        const headerAOA = [
            ['CÔNG TY TNHH SOF'],
            [title],
            [dateText],
            [] // Empty row spacer
        ];

        const worksheet = XLSX.utils.aoa_to_sheet(headerAOA);

        // Add table headers and data starting at row 5 (cell A5)
        XLSX.utils.sheet_add_json(worksheet, dataToExport, { origin: 'A5' });

        // Merge title lines across columns
        const numCols = Object.keys(dataToExport[0] || {}).length;
        worksheet['!merges'] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: numCols - 1 } },
            { s: { r: 1, c: 0 }, e: { r: 1, c: numCols - 1 } },
            { s: { r: 2, c: 0 }, e: { r: 2, c: numCols - 1 } }
        ];

        const colsWidth = Object.keys(dataToExport[0] || {}).map((key) => ({
            wch: Math.max(key.length, ...dataToExport.map((row) => (row[key] ? row[key].toString().length : 0))) + 2,
        }));
        worksheet['!cols'] = colsWidth;

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Báo cáo');

        const fileName = reportParams.rad === 2
            ? `Bao_cao_ke_hoach_cong_viec_chi_tiet_${reportParams.startDate.replace(/\//g, '-')}.xlsx`
            : `Bao_cao_cong_viec_hang_ngay_${reportParams.startDate.replace(/\//g, '-')}.xlsx`;

        XLSX.writeFile(workbook, fileName);
        message.success('Đã tải xuống file Excel thành công!');
    };

    // Client-side Word Export
    const handleExportWord = () => {
        if (reportData.length === 0) {
            message.warning('Không có dữ liệu để xuất!');
            return;
        }

        const title = reportParams.rad === 2 ? 'BÁO CÁO KẾ HOẠCH CÔNG VIỆC CHI TIẾT' : 'BÁO CÁO CÔNG VIỆC HÀNG NGÀY';
        const headers = reportParams.rad === 2
            ? ['STT', 'Mã công việc', 'Tiến độ', 'Thương hiệu', 'Địa chỉ dự án', 'Trạng thái dự án', 'Loại hình dự án', 'Sale', 'P.TTT', 'AD', 'Tên dự án', 'Nội dung công việc', 'Ngày giao', 'Ngày hạn', 'NV làm chính', 'NV làm phụ', 'Người duyệt', 'Trạng thái CV', 'Ghi chú']
            : ['STT', 'Thời gian', 'Công ty', 'Dự án', 'NVPT', 'Thông tin liên hệ', 'Nội dung công việc', 'Địa chỉ gặp', 'Kết quả', 'Hoàn thành', 'Phản hồi', 'Người phản hồi', 'Ngày giờ phản hồi'];

        let rowsHtml = '';
        reportData.forEach((item) => {
            if (reportParams.rad === 1) {
                rowsHtml += `<tr>
                    <td style="padding: 6px; font-family: 'Times New Roman', Times, serif; font-size: 13pt; text-align: center; border: 1px solid #000000;">${item.stt}</td>
                    <td style="padding: 6px; font-family: 'Times New Roman', Times, serif; font-size: 13pt; border: 1px solid #000000;">${item.thoiGian || ''}</td>
                    <td style="padding: 6px; font-family: 'Times New Roman', Times, serif; font-size: 13pt; border: 1px solid #000000;">${item.tenCTy || item.congTy || ''}</td>
                    <td style="padding: 6px; font-family: 'Times New Roman', Times, serif; font-size: 13pt; border: 1px solid #000000;">${item.duAn || ''}</td>
                    <td style="padding: 6px; font-family: 'Times New Roman', Times, serif; font-size: 13pt; text-align: center; border: 1px solid #000000;">${item.nvptTen || item.nvptId || ''}</td>
                    <td style="padding: 6px; font-family: 'Times New Roman', Times, serif; font-size: 13pt; border: 1px solid #000000;">${item.lienHe || ''}</td>
                    <td style="padding: 6px; font-family: 'Times New Roman', Times, serif; font-size: 13pt; border: 1px solid #000000;">${item.noiDungCV || ''}</td>
                    <td style="padding: 6px; font-family: 'Times New Roman', Times, serif; font-size: 13pt; border: 1px solid #000000;">${item.diaChiGap || ''}</td>
                    <td style="padding: 6px; font-family: 'Times New Roman', Times, serif; font-size: 13pt; border: 1px solid #000000;">${item.ketQua || ''}</td>
                    <td style="padding: 6px; font-family: 'Times New Roman', Times, serif; font-size: 13pt; text-align: center; border: 1px solid #000000;">${item.hoanThanhText || ''}</td>
                    <td style="padding: 6px; font-family: 'Times New Roman', Times, serif; font-size: 13pt; border: 1px solid #000000;">${item.phanHoi || ''}</td>
                    <td style="padding: 6px; font-family: 'Times New Roman', Times, serif; font-size: 13pt; text-align: center; border: 1px solid #000000;">${item.nguoiPhanHoiTen || ''}</td>
                    <td style="padding: 6px; font-family: 'Times New Roman', Times, serif; font-size: 13pt; text-align: center; border: 1px solid #000000;">${item.ngayGioPhanHoi || ''}</td>
                </tr>`;
            } else {
                rowsHtml += `<tr>
                    <td style="padding: 6px; font-family: 'Times New Roman', Times, serif; font-size: 13pt; text-align: center; border: 1px solid #000000;">${item.stt}</td>
                    <td style="padding: 6px; font-family: 'Times New Roman', Times, serif; font-size: 13pt; text-align: center; border: 1px solid #000000;">${item.maCongViec || ''}</td>
                    <td style="padding: 6px; font-family: 'Times New Roman', Times, serif; font-size: 13pt; text-align: center; border: 1px solid #000000;">${item.tienDo || ''}</td>
                    <td style="padding: 6px; font-family: 'Times New Roman', Times, serif; font-size: 13pt; border: 1px solid #000000;">${item.thuongHieu || ''}</td>
                    <td style="padding: 6px; font-family: 'Times New Roman', Times, serif; font-size: 13pt; border: 1px solid #000000;">${item.diaChiDuAn || ''}</td>
                    <td style="padding: 6px; font-family: 'Times New Roman', Times, serif; font-size: 13pt; text-align: center; border: 1px solid #000000;">${item.trangThaiDuAn || ''}</td>
                    <td style="padding: 6px; font-family: 'Times New Roman', Times, serif; font-size: 13pt; text-align: center; border: 1px solid #000000;">${item.loaiHinhDuAn || ''}</td>
                    <td style="padding: 6px; font-family: 'Times New Roman', Times, serif; font-size: 13pt; text-align: center; border: 1px solid #000000;">${item.sale || ''}</td>
                    <td style="padding: 6px; font-family: 'Times New Roman', Times, serif; font-size: 13pt; text-align: center; border: 1px solid #000000;">${item.pTTT || ''}</td>
                    <td style="padding: 6px; font-family: 'Times New Roman', Times, serif; font-size: 13pt; text-align: center; border: 1px solid #000000;">${item.ad || ''}</td>
                    <td style="padding: 6px; font-family: 'Times New Roman', Times, serif; font-size: 13pt; border: 1px solid #000000;">${item.tenDuAn || ''}</td>
                    <td style="padding: 6px; font-family: 'Times New Roman', Times, serif; font-size: 13pt; border: 1px solid #000000;">${item.noiDungCV || ''}</td>
                    <td style="padding: 6px; font-family: 'Times New Roman', Times, serif; font-size: 13pt; text-align: center; border: 1px solid #000000;">${item.ngayGiao || ''}</td>
                    <td style="padding: 6px; font-family: 'Times New Roman', Times, serif; font-size: 13pt; text-align: center; border: 1px solid #000000;">${item.ngayHan || ''}</td>
                    <td style="padding: 6px; font-family: 'Times New Roman', Times, serif; font-size: 13pt; text-align: center; border: 1px solid #000000;">${item.nvLamChinh || ''}</td>
                    <td style="padding: 6px; font-family: 'Times New Roman', Times, serif; font-size: 13pt; text-align: center; border: 1px solid #000000;">${item.nvLamPhu || ''}</td>
                    <td style="padding: 6px; font-family: 'Times New Roman', Times, serif; font-size: 13pt; text-align: center; border: 1px solid #000000;">${item.nguoiDuyet || ''}</td>
                    <td style="padding: 6px; font-family: 'Times New Roman', Times, serif; font-size: 13pt; text-align: center; border: 1px solid #000000;">${item.trangThaiCV || ''}</td>
                    <td style="padding: 6px; font-family: 'Times New Roman', Times, serif; font-size: 13pt; border: 1px solid #000000;">${item.attachment || ''}</td>
                </tr>`;
            }
        });

        const tableHtml = `
            <table border="1" style="border-collapse: collapse; width: 100%;">
                <thead>
                    <tr style="background-color: #f2f2f2; font-weight: bold; text-align: center;">
                        ${headers.map(h => `<th style="padding: 6px; font-family: 'Times New Roman', Times, serif; font-size: 13pt; border: 1px solid #000000;">${h}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
            </table>
        `;

        const logoHtml = logoBase64
            ? `<td style="width: 20%; text-align: left; vertical-align: middle;">
                   <img src="${logoBase64}" alt="Logo" style="height: 70px; display: block;" />
               </td>`
            : `<td style="width: 20%;"></td>`;

        const documentHtml = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
            <meta charset='utf-8'>
            <title>${title}</title>
            <style>
                @page Section1 {
                    size: 841.9pt 595.3pt; /* A4 Landscape */
                    margin: 0.75in 0.75in 0.75in 0.75in;
                    mso-header-margin: 36.0pt;
                    mso-footer-margin: 36.0pt;
                    mso-paper-source: 0;
                }
                div.Section1 {
                    page: Section1;
                }
                body {
                    font-family: 'Times New Roman', Times, serif;
                    font-size: 13pt;
                }
                h1 {
                    font-family: 'Times New Roman', Times, serif;
                    font-size: 18pt;
                    font-weight: bold;
                    margin: 0;
                    text-transform: uppercase;
                }
                h2 {
                    font-family: 'Times New Roman', Times, serif;
                    font-size: 18pt;
                    font-weight: bold;
                    margin: 0;
                    text-transform: uppercase;
                }
                p {
                    font-family: 'Times New Roman', Times, serif;
                    font-size: 13pt;
                    margin: 0;
                }
            </style>
        </head>
        <body>
            <div class="Section1">
                <table border="0" style="width: 100%; margin-bottom: 24px; border-collapse: collapse;">
                    <tbody>
                        <tr>
                            ${logoHtml}
                            <td style="width: 60%; text-align: center; vertical-align: middle;">
                                <h1 style="text-align: center;">CÔNG TY TNHH SOF</h1>
                            </td>
                            <td style="width: 20%;"></td>
                        </tr>
                    </tbody>
                </table>
                
                <div style="text-align: center; margin-bottom: 24px;">
                    <h2 style="text-align: center; text-transform: uppercase;">${title}</h2>
                    <p style="text-align: center; font-style: italic;">Từ ngày: ${reportParams.startDate} đến ngày: ${reportParams.endDate}</p>
                </div>
                <br/>
                ${tableHtml}
            </div>
        </body></html>`;

        const blob = new Blob(['\ufeff', documentHtml], { type: 'application/msword' });
        const fileName = reportParams.rad === 2
            ? `Bao_cao_ke_hoach_cong_viec_chi_tiet_${reportParams.startDate.replace(/\//g, '-')}.doc`
            : `Bao_cao_cong_viec_hang_ngay_${reportParams.startDate.replace(/\//g, '-')}.doc`;
        saveAs(blob, fileName);
        message.success('Đã tải xuống file Word thành công!');
    };

    return (
        <div className={styles.container}>
            {/* Global Print Styling */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @page {
                    size: A4 ${printOrientation};
                    margin: 0 !important;
                }
                
                @media print {
                    @page {
                        size: A4 ${printOrientation};
                        margin: 0 !important;
                    }
                    :root {
                        --sidebar-width: 0px !important;
                    }
                    
                    * {
                        box-sizing: border-box !important;
                    }
                    
                    /* Hide all layout navigation, forms, sidebars, headers, and toolbars */
                    .print-toolbar,
                    .sidebar-menu,
                    .header-bar,
                    aside,
                    header,
                    .sidebar-container,
                    .header-container,
                    .ant-layout-sider,
                    .ant-layout-header,
                    form,
                    [class*="customForm"],
                    .ant-breadcrumb,
                    [class*="ant-breadcrumb"],
                    .pageTitle,
                    [class*="pageTitle"],
                    .ant-divider,
                    [class*="ant-divider"] {
                        display: none !important;
                    }
                    
                    /* Reset body and layouts margins and offsets, adding padding to body to restore printing margins safely */
                    body, 
                    html {
                        margin: 0 !important;
                        padding: 0 !important;
                        background: #fff !important;
                        background-color: #fff !important;
                    }

                    body {
                        padding: 12mm 15mm 12mm 12mm !important; /* Set margin inside the A4 print page safely */
                    }
                    
                    .ant-layout, 
                    .ant-layout-content,
                    .app-content, 
                    .page-scroll-wrapper,
                    [class*="container"],
                    [class*="pageWrapper"],
                    [class*="reportViewContainer"],
                    #print-content {
                        margin: 0 !important;
                        padding: 0 !important;
                        border: none !important;
                        border-radius: 0 !important;
                        box-shadow: none !important;
                        background: transparent !important;
                        background-color: transparent !important;
                        min-height: auto !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        position: static !important;
                        overflow: visible !important;
                    }
                    
                    #print-content {
                        width: 100% !important;
                        max-width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        overflow: visible !important;
                    }
                    
                    .report-table {
                        border: 1px solid #000 !important;
                        width: 100% !important;
                        border-collapse: collapse !important;
                        margin-top: 15px !important;
                        overflow: visible !important;
                        table-layout: auto !important;
                    }
                    .report-table th {
                        white-space: nowrap !important;
                        text-align: center !important;
                        vertical-align: middle !important;
                        font-weight: bold !important;
                        background-color: #f5f5f5 !important;
                    }
                    .report-table th, .report-table td {
                        border: 1px solid #000 !important;
                        padding: 8px 10px !important;
                        word-break: break-word !important;
                    }
                }
            `}} />
            <Breadcrumb
                style={{
                    marginBottom: '16px',
                    fontSize: '14px',
                    padding: '12px 16px',
                    borderRadius: '4px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                    userSelect: 'none',
                }}
            >
                <Breadcrumb.Item>
                    <Home size={14} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                    Trang chủ
                </Breadcrumb.Item>
                <Breadcrumb.Item>Quản lý công việc</Breadcrumb.Item>
                <Breadcrumb.Item>Báo cáo công việc hàng ngày</Breadcrumb.Item>
            </Breadcrumb>

            <div className={styles.pageTitle}>
                <FileText size={22} />
                Báo Cáo Công Việc Hàng Ngày
            </div>

            {loading && departmentList.length === 0 ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '40vh' }}>
                    <Spin size="large" tip="Đang tải tham số..." />
                </div>
            ) : (
                <div className={styles.pageWrapper}>
                    <Form
                        form={form}
                        layout='vertical'
                        onFinish={handleFinish}
                        initialValues={{
                            startDate: dayjs().startOf('month'),
                            endDate: dayjs(),
                            datetype: 0,
                            reportType: 1,
                        }}
                        className={styles.customForm}
                    >
                        <Row gutter={[32, 0]}>
                            {/* Left column - Selectors & Time parameters */}
                            <Col xs={24} md={12}>
                                <Divider orientation='left' orientationMargin={0} className={styles.dividerSolid}>
                                    Thông tin & thời gian báo cáo
                                </Divider>

                                <Row gutter={16}>
                                    <Col span={12}>
                                        <Form.Item
                                            label='Từ ngày'
                                            name='startDate'
                                            rules={[{ required: true, message: 'Chọn ngày bắt đầu!' }]}
                                        >
                                            <DatePicker style={{ width: '100%' }} format='DD/MM/YYYY' allowClear={false} />
                                        </Form.Item>
                                    </Col>
                                    <Col span={12}>
                                        <Form.Item
                                            label='Đến ngày'
                                            name='endDate'
                                            rules={[{ required: true, message: 'Chọn ngày kết thúc!' }]}
                                        >
                                            <DatePicker style={{ width: '100%' }} format='DD/MM/YYYY' allowClear={false} />
                                        </Form.Item>
                                    </Col>
                                </Row>

                                <Form.Item label='Lọc theo ngày' name='datetype'>
                                    <Select dropdownMatchSelectWidth={false} style={{ width: '100%' }}>
                                        <Option value={0}>Ngày tạo phản hồi</Option>
                                        <Option value={1}>Ngày hoàn thành công việc</Option>
                                    </Select>
                                </Form.Item>

                                <Form.Item label='Loại kế hoạch' name='txtlv807'>
                                    <Select dropdownMatchSelectWidth={false} placeholder='-- Chọn loại kế hoạch --' allowClear showSearch optionFilterProp='children'>
                                        {planTypeList.map((type) => (
                                            <Option key={type.id} value={type.id}>
                                                {type.name}
                                            </Option>
                                        ))}
                                    </Select>
                                </Form.Item>

                                <Form.Item label='Nhân viên làm chính' name='txtlv006'>
                                    <Select dropdownMatchSelectWidth={false} placeholder='-- Tất cả nhân viên --' allowClear showSearch optionFilterProp='label'>
                                        {employeeList.map((emp) => (
                                            <Option key={emp.lv001} value={emp.lv001} label={`${emp.lv001} - ${emp.lv002} ${emp.lv003}`}>
                                                {emp.lv001} - {emp.lv002} {emp.lv003}
                                            </Option>
                                        ))}
                                    </Select>
                                </Form.Item>

                                <Form.Item label='Nhân viên làm phụ' name='txtlv007'>
                                    <Select dropdownMatchSelectWidth={false} placeholder='-- Tất cả nhân viên --' allowClear showSearch optionFilterProp='label'>
                                        {employeeList.map((emp) => (
                                            <Option key={emp.lv001} value={emp.lv001} label={`${emp.lv001} - ${emp.lv002} ${emp.lv003}`}>
                                                {emp.lv001} - {emp.lv002} {emp.lv003}
                                            </Option>
                                        ))}
                                    </Select>
                                </Form.Item>

                                <Form.Item label='Người duyệt' name='txtlv008'>
                                    <Select dropdownMatchSelectWidth={false} placeholder='-- Tất cả người duyệt --' allowClear showSearch optionFilterProp='label'>
                                        {employeeList.map((emp) => (
                                            <Option key={emp.lv001} value={emp.lv001} label={`${emp.lv001} - ${emp.lv002} ${emp.lv003}`}>
                                                {emp.lv001} - {emp.lv002} {emp.lv003}
                                            </Option>
                                        ))}
                                    </Select>
                                </Form.Item>

                                <Form.Item label='Loại báo cáo xuất' name='reportType'>
                                    <Select dropdownMatchSelectWidth={false} style={{ width: '100%' }}>
                                        <Option value={1}>Báo cáo theo phản hồi công việc</Option>
                                        <Option value={2}>Báo cáo danh sách công việc</Option>
                                    </Select>
                                </Form.Item>
                            </Col>

                            {/* Right column - Clean scrollable checkbox filters */}
                            <Col xs={24} md={12}>
                                <Divider orientation='left' orientationMargin={0} className={styles.dividerSolid}>
                                    Bộ lọc chi tiết (Chọn nhiều)
                                </Divider>

                                {/* Department Checkbox Panel */}
                                <div style={{ marginBottom: 20 }}>
                                    <div className={styles.checkboxPanelHeader}>
                                        <span className={styles.checkboxPanelTitle}>Chọn Phòng Ban ({selectedDepts.length})</span>
                                        <Checkbox
                                            onChange={toggleSelectAllDepts}
                                            checked={filteredDepts.length > 0 && selectedDepts.length === filteredDepts.length}
                                            indeterminate={selectedDepts.length > 0 && selectedDepts.length < filteredDepts.length}
                                        >
                                            Tất cả
                                        </Checkbox>
                                    </div>
                                    <Input
                                        placeholder="Tìm phòng ban..."
                                        value={deptSearch}
                                        onChange={(e) => setDeptSearch(e.target.value)}
                                        className={styles.checkboxPanelSearch}
                                        allowClear
                                    />
                                    <div className={styles.checkboxScrollContainer}>
                                        <Checkbox.Group value={selectedDepts} onChange={handleDeptChange} style={{ width: '100%' }}>
                                            {filteredDepts.map((item) => {
                                                const val = item.lv001;
                                                const label = item.lv003 || item.lv002 || val;
                                                return (
                                                    <div key={val}>
                                                        <Checkbox value={val} className={styles.checkboxItem}>
                                                            {label}
                                                        </Checkbox>
                                                    </div>
                                                );
                                            })}
                                            {filteredDepts.length === 0 && (
                                                <div style={{ color: '#aaa', textAlign: 'center', padding: '10px 0' }}>Không tìm thấy phòng ban nào</div>
                                            )}
                                        </Checkbox.Group>
                                    </div>
                                </div>

                                {/* Work Code Checkbox Panel */}
                                <div style={{ marginBottom: 20 }}>
                                    <div className={styles.checkboxPanelHeader}>
                                        <span className={styles.checkboxPanelTitle}>Chọn Mã Công Việc ({selectedWorkCodes.length})</span>
                                        <Checkbox
                                            onChange={toggleSelectAllWorkCodes}
                                            checked={filteredWorkCodes.length > 0 && selectedWorkCodes.length === filteredWorkCodes.length}
                                            indeterminate={selectedWorkCodes.length > 0 && selectedWorkCodes.length < filteredWorkCodes.length}
                                        >
                                            Tất cả
                                        </Checkbox>
                                    </div>
                                    <Input
                                        placeholder="Tìm mã hoặc tên công việc..."
                                        value={workCodeSearch}
                                        onChange={(e) => setWorkCodeSearch(e.target.value)}
                                        className={styles.checkboxPanelSearch}
                                        allowClear
                                    />
                                    <div className={styles.checkboxScrollContainer}>
                                        <Checkbox.Group value={selectedWorkCodes} onChange={handleWorkCodeChange} style={{ width: '100%' }}>
                                            {filteredWorkCodes.map((item) => {
                                                return (
                                                    <div key={item.id}>
                                                        <Checkbox value={item.id} className={styles.checkboxItem}>
                                                            {item.code} - {item.name}
                                                        </Checkbox>
                                                    </div>
                                                );
                                            })}
                                            {filteredWorkCodes.length === 0 && (
                                                <div style={{ color: '#aaa', textAlign: 'center', padding: '10px 0' }}>Không tìm thấy mã công việc nào</div>
                                            )}
                                        </Checkbox.Group>
                                    </div>
                                </div>

                                {/* Status Checkbox Panel */}
                                <div style={{ marginBottom: 20 }}>
                                    <div className={styles.checkboxPanelHeader}>
                                        <span className={styles.checkboxPanelTitle}>Chọn Trạng Thái ({selectedStatuses.length})</span>
                                        <Checkbox
                                            onChange={toggleSelectAllStatuses}
                                            checked={filteredStatuses.length > 0 && selectedStatuses.length === filteredStatuses.length}
                                            indeterminate={selectedStatuses.length > 0 && selectedStatuses.length < filteredStatuses.length}
                                        >
                                            Tất cả
                                        </Checkbox>
                                    </div>
                                    <Input
                                        placeholder="Tìm trạng thái..."
                                        value={statusSearch}
                                        onChange={(e) => setStatusSearch(e.target.value)}
                                        className={styles.checkboxPanelSearch}
                                        allowClear
                                    />
                                    <div className={styles.checkboxScrollContainer}>
                                        <Checkbox.Group value={selectedStatuses} onChange={handleStatusChange} style={{ width: '100%' }}>
                                            {filteredStatuses.map((item) => {
                                                return (
                                                    <div key={item.id}>
                                                        <Checkbox value={item.id} className={styles.checkboxItem}>
                                                            {item.name}
                                                        </Checkbox>
                                                    </div>
                                                );
                                            })}
                                            {filteredStatuses.length === 0 && (
                                                <div style={{ color: '#aaa', textAlign: 'center', padding: '10px 0' }}>Không tìm thấy trạng thái nào</div>
                                            )}
                                        </Checkbox.Group>
                                    </div>
                                </div>
                            </Col>
                        </Row>

                        <Divider style={{ margin: '20px 0 16px' }} />

                        {/* Actions toolbar */}
                        <Space size="middle">
                            <Button
                                type='primary'
                                htmlType='submit'
                                icon={<Eye size={16} />}
                                loading={loading}
                                className={styles.actionButtonPrimary}
                            >
                                Xem Báo Cáo
                            </Button>
                            <Button
                                onClick={handleReset}
                                disabled={loading}
                                icon={<RefreshCw size={16} />}
                                className={styles.actionButtonReset}
                            >
                                Làm Mới
                            </Button>
                        </Space>
                    </Form>

                    {/* Report Table container rendered directly below the form */}
                    {reportParams && (
                        <div className={styles.reportViewContainer} style={{ marginTop: '30px' }}>
                            {/* Print Control Toolbar */}
                            <div className="print-toolbar" style={{
                                backgroundColor: '#ffffff',
                                borderBottom: '1px solid #e1e8ed',
                                padding: '12px 24px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                                marginBottom: '20px',
                                borderRadius: '12px'
                            }}>
                                <Space size="middle">
                                    <Button icon={<ArrowLeft size={16} />} onClick={() => { setReportParams(null); setReportData([]); }} className={styles.actionButtonReset}>
                                        Ẩn báo cáo
                                    </Button>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontWeight: 600, fontSize: '13px', color: '#4b4344' }}>Khổ giấy:</span>
                                        <Select dropdownMatchSelectWidth={false} value={printOrientation} onChange={setPrintOrientation} style={{ width: 140 }}>
                                            <Option value="portrait">Khổ dọc (A4)</Option>
                                            <Option value="landscape">Khổ ngang (A4)</Option>
                                        </Select>
                                    </div>
                                </Space>
                                <Space>
                                    <Button type="primary" icon={<Printer size={16} />} onClick={() => window.print()} className={styles.actionButtonPrimary}>
                                        In Báo Cáo
                                    </Button>
                                    <Button icon={<FileExcelOutlined />} onClick={handleExportExcel} style={{ backgroundColor: '#2ecc71', borderColor: '#2ecc71', color: '#fff', height: 40, borderRadius: 10 }}>
                                        Xuất Excel
                                    </Button>
                                    <Button icon={<FileWordOutlined />} onClick={handleExportWord} style={{ backgroundColor: '#3498db', borderColor: '#3498db', color: '#fff', height: 40, borderRadius: 10 }}>
                                        Xuất Word
                                    </Button>
                                </Space>
                            </div>

                            <div id="print-content" style={{ padding: '20px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #c1d9f3' }}>
                                {/* Document Header */}
                                <table border="0" style={{ width: '100%', marginBottom: '24px', borderCollapse: 'collapse' }}>
                                    <tbody>
                                        <tr>
                                            <td style={{ width: '20%', textAlign: 'left', verticalAlign: 'middle' }}>
                                                <img src={companyLogo} alt="Logo" style={{ height: '70px', display: 'block' }} />
                                            </td>
                                            <td style={{ width: '60%', textAlign: 'center', verticalAlign: 'middle' }}>
                                                <div style={{ font: 'bold 26px Arial', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#111' }}>
                                                    CÔNG TY TNHH SOF
                                                </div>
                                            </td>
                                            <td style={{ width: '20%' }}></td>
                                        </tr>
                                    </tbody>
                                </table>

                                {/* Report Title */}
                                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                                    <h2 style={{ font: 'bold 22px Arial', margin: '0 0 6px 0', textTransform: 'uppercase' }}>
                                        {reportParams.rad === 2 ? 'Báo Cáo Kế Hoạch Công Việc Chi Tiết' : 'Báo Cáo Công Việc Hàng Ngày'}
                                    </h2>
                                    <div style={{ font: 'italic 13px Arial', color: '#333' }}>
                                        Từ ngày: <span style={{ fontWeight: 600 }}>{reportParams.startDate || '...'}</span> đến ngày: <span style={{ fontWeight: 600 }}>{reportParams.endDate || '...'}</span>
                                    </div>
                                </div>

                                {/* Report Data Table */}
                                <div style={{ overflowX: 'auto' }}>
                                    <table className="report-table" border="1" style={{
                                        width: '100%',
                                        borderCollapse: 'collapse',
                                        fontSize: '11px',
                                        fontFamily: 'Arial, sans-serif'
                                    }}>
                                        <thead>
                                            <tr style={{ backgroundColor: '#f5f5f5', textAlign: 'center', fontWeight: 'bold', height: '36px' }}>
                                                {reportParams.rad === 1 ? (
                                                    <>
                                                        <th style={{ width: '40px' }}>STT</th>
                                                        <th style={{ width: '140px' }}>Thời gian</th>
                                                        <th style={{ width: '160px' }}>Công ty</th>
                                                        <th style={{ width: '140px' }}>Dự án</th>
                                                        <th style={{ width: '120px' }}>NVPT</th>
                                                        <th style={{ width: '120px' }}>Thông tin liên hệ</th>
                                                        <th>Nội dung công việc</th>
                                                        <th style={{ width: '130px' }}>Địa chỉ gặp</th>
                                                        <th style={{ width: '120px' }}>Kết quả</th>
                                                        <th style={{ width: '100px' }}>Hoàn thành</th>
                                                        <th>Phản hồi</th>
                                                        <th style={{ width: '110px' }}>Người phản hồi</th>
                                                        <th style={{ width: '120px' }}>Ngày phản hồi</th>
                                                    </>
                                                ) : (
                                                    <>
                                                        <th style={{ width: '40px' }}>STT</th>
                                                        <th style={{ width: '80px' }}>Mã CV</th>
                                                        <th style={{ width: '90px' }}>Tiến độ</th>
                                                        <th style={{ width: '90px' }}>Thương hiệu</th>
                                                        <th>Địa chỉ dự án</th>
                                                        <th style={{ width: '100px' }}>Trạng thái DA</th>
                                                        <th style={{ width: '100px' }}>Loại hình DA</th>
                                                        <th style={{ width: '90px' }}>Sale</th>
                                                        <th style={{ width: '90px' }}>P.TTT</th>
                                                        <th style={{ width: '90px' }}>AD</th>
                                                        <th>Tên dự án</th>
                                                        <th>Nội dung công việc</th>
                                                        <th style={{ width: '80px' }}>Ngày giao</th>
                                                        <th style={{ width: '80px' }}>Ngày hạn</th>
                                                        <th style={{ width: '100px' }}>NV làm chính</th>
                                                        <th style={{ width: '100px' }}>NV làm phụ</th>
                                                        <th style={{ width: '100px' }}>Người duyệt</th>
                                                        <th style={{ width: '100px' }}>Trạng thái CV</th>
                                                        <th>Ghi chú / Đính kèm</th>
                                                    </>
                                                )}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {reportData.map((row) => (
                                                <tr key={row.id} style={{ height: '32px' }}>
                                                    {reportParams.rad === 1 ? (
                                                        <>
                                                            <td style={{ textAlign: 'center' }}>{row.stt}</td>
                                                            <td style={{ padding: '6px' }}>{row.thoiGian}</td>
                                                            <td style={{ padding: '6px' }}>{row.tenCTy || row.congTy}</td>
                                                            <td style={{ padding: '6px' }}>{row.duAn}</td>
                                                            <td style={{ padding: '6px', textAlign: 'center' }}>{row.nvptTen}</td>
                                                            <td style={{ padding: '6px' }}>{row.lienHe}</td>
                                                            <td style={{ padding: '6px' }}>{row.noiDungCV}</td>
                                                            <td style={{ padding: '6px' }}>{row.diaChiGap}</td>
                                                            <td style={{ padding: '6px' }}>{row.ketQua}</td>
                                                            <td style={{ padding: '6px', textAlign: 'center' }}>{row.hoanThanhText}</td>
                                                            <td style={{ padding: '6px' }}>{row.phanHoi}</td>
                                                            <td style={{ padding: '6px', textAlign: 'center' }}>{row.nguoiPhanHoiTen}</td>
                                                            <td style={{ padding: '6px', textAlign: 'center' }}>{row.ngayGioPhanHoi}</td>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <td style={{ textAlign: 'center' }}>{row.stt}</td>
                                                            <td style={{ textAlign: 'center' }}>{row.maCongViec}</td>
                                                            <td style={{ padding: '6px', textAlign: 'center' }}>{row.tienDo}</td>
                                                            <td style={{ padding: '6px' }}>{row.thuongHieu}</td>
                                                            <td style={{ padding: '6px' }}>{row.diaChiDuAn}</td>
                                                            <td style={{ padding: '6px', textAlign: 'center' }}>{row.trangThaiDuAn}</td>
                                                            <td style={{ padding: '6px', textAlign: 'center' }}>{row.loaiHinhDuAn}</td>
                                                            <td style={{ padding: '6px', textAlign: 'center' }}>{row.sale}</td>
                                                            <td style={{ padding: '6px', textAlign: 'center' }}>{row.pTTT}</td>
                                                            <td style={{ padding: '6px', textAlign: 'center' }}>{row.ad}</td>
                                                            <td style={{ padding: '6px' }}>{row.tenDuAn}</td>
                                                            <td style={{ padding: '6px' }}>{row.noiDungCV}</td>
                                                            <td style={{ padding: '6px', textAlign: 'center' }}>{row.ngayGiao}</td>
                                                            <td style={{ padding: '6px', textAlign: 'center' }}>{row.ngayHan}</td>
                                                            <td style={{ padding: '6px', textAlign: 'center' }}>{row.nvLamChinh}</td>
                                                            <td style={{ padding: '6px', textAlign: 'center' }}>{row.nvLamPhu}</td>
                                                            <td style={{ padding: '6px', textAlign: 'center' }}>{row.nguoiDuyet}</td>
                                                            <td style={{ padding: '6px', textAlign: 'center' }}>{row.trangThaiCV}</td>
                                                            <td style={{ padding: '6px' }} dangerouslySetInnerHTML={{ __html: row.attachment }}></td>
                                                        </>
                                                    )}
                                                </tr>
                                            ))}

                                            {reportData.length === 0 && (
                                                <tr>
                                                    <td colSpan={reportParams.rad === 1 ? 13 : 19} style={{ textAlign: 'center', height: '80px', color: '#888', fontSize: '13px' }}>
                                                        Không có dữ liệu báo cáo nào phù hợp với các điều kiện lọc.
                                                    </td>
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

export default BaoCaoCongViecHangNgay;
