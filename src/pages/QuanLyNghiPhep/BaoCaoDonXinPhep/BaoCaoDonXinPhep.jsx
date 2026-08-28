import {
    Button,
    Card,
    Checkbox,
    Col,
    DatePicker,
    Empty,
    Row,
    Select,
    Space,
    Table,
    Tag,
    Tooltip,
    message,
} from 'antd';
import dayjs from 'dayjs';
import {
    Building2,
    Calendar,
    ClipboardList,
    FileSpreadsheet,
    FileText,
    Filter,
    Printer,
    RefreshCw,
    Search,
    Users,
} from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { useReactToPrint } from 'react-to-print';
import * as XLSX from 'xlsx';

import CheckboxMauBaoCao from '../../../components/CheckBox/CheckboxMauBaoCao';
import CheckboxPhongBan from '../../../components/CheckBox/CheckboxPhongBan';
import CheckboxTrangThaiNV from '../../../components/CheckBox/CheckboxTrangThaiNV';
import SelectNhanVien from '../../../components/DropDown/SelectNhanVien';
import { execCRUD } from '../../../services/apiServices';
import './BaoCaoDonXinPhep.css';

// ==================== CONSTANTS ====================
const SORT_OPTIONS = [
    { value: 0, label: 'Theo phòng ban' },
    { value: 1, label: 'Theo nhân viên' },
    { value: 2, label: 'Theo nhóm' },
    { value: 3, label: 'Theo mã chấm công' },
    { value: 4, label: 'Theo ngày đơn' },
];

const TABLE_COLUMNS = [
    {
        title: 'STT',
        dataIndex: 'stt',
        key: 'stt',
        width: 50,
        align: 'center',
    },
    {
        title: 'Mã NV',
        dataIndex: 'maNhanVien',
        key: 'maNhanVien',
        width: 80,
        render: (text) => <Tag color='blue'>{text}</Tag>,
    },
    {
        title: 'Họ tên',
        dataIndex: 'hoTen',
        key: 'hoTen',
        width: 150,
        render: (text) => <span style={{ fontWeight: 500 }}>{text}</span>,
    },
    {
        title: 'Phòng ban',
        dataIndex: 'phongBan',
        key: 'phongBan',
        width: 120,
    },
    {
        title: 'Loại đơn',
        dataIndex: 'loaiDon',
        key: 'loaiDon',
        width: 120,
        render: (text) => <Tag color='purple'>{text || '—'}</Tag>,
    },
    {
        title: 'Từ ngày',
        dataIndex: 'ngayBatDau',
        key: 'ngayBatDau',
        width: 130,
        render: (text) => (text ? dayjs(text).format('DD/MM/YYYY HH:mm') : '—'),
    },
    {
        title: 'Đến ngày',
        dataIndex: 'ngayKetThuc',
        key: 'ngayKetThuc',
        width: 130,
        render: (text) => (text ? dayjs(text).format('DD/MM/YYYY HH:mm') : '—'),
    },
    {
        title: 'Lý do',
        dataIndex: 'lyDo',
        key: 'lyDo',
        ellipsis: true,
        render: (text) => (
            <Tooltip title={text}>
                <span>{text || '—'}</span>
            </Tooltip>
        ),
    },
];

// ==================== MAIN COMPONENT ====================
const BaoCaoDonXinPhep = () => {
    // State
    const [reportData, setReportData] = useState([]);
    const [loading, setLoading] = useState(false);

    // Filter states
    const [departments, setDepartments] = useState([]);
    const [includeChildren, setIncludeChildren] = useState(true);
    const [statuses, setStatuses] = useState(['0', '1', '4', '5', '6']);
    const [employeeId, setEmployeeId] = useState(null);
    const [dateFrom, setDateFrom] = useState(dayjs().startOf('month'));
    const [dateTo, setDateTo] = useState(dayjs());
    const [templates, setTemplates] = useState(['4', '5', '6', '7', '8', '9']);
    const [sortBy, setSortBy] = useState(4);
    const [isStaffOff, setIsStaffOff] = useState(true);

    // Ref for printing
    const printRef = useRef(null);

    // Handle print
    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: 'Bao_cao_don_xin_phep',
    });

    // Load report data
    const handleLoadReport = useCallback(async () => {
        setLoading(true);
        try {
            const params = {
                datefrom: dateFrom ? dateFrom.format('YYYY-MM-DD') : '',
                dateto: dateTo ? dateTo.format('YYYY-MM-DD') : '',
                departments: departments.join(','),
                statuses: statuses.join(','),
                templates: templates.join(','),
                employeeId: employeeId || '',
                sortBy: sortBy,
                includeChildren: includeChildren ? 1 : 0,
                isStaffOff: isStaffOff ? 1 : 0,
            };

            const data = await execCRUD('jo_lv0040', 'loadBaoCaoDonXinPhep', params);

            if (data && Array.isArray(data)) {
                const mappedData = data.map((item, index) => ({
                    ...item,
                    maChamCong: item.maChamCong || item.maCC,
                    key: item.maPhieu || index,
                    stt: index + 1,
                }));
                setReportData(mappedData);
                message.success(`Tìm thấy ${mappedData.length} đơn xin phép`);
            } else {
                setReportData([]);
                message.info('Không tìm thấy dữ liệu');
            }
        } catch (error) {
            console.error('Error loading report:', error);
            message.error('Có lỗi xảy ra');
        } finally {
            setLoading(false);
        }
    }, [dateFrom, dateTo, departments, statuses, templates, employeeId, sortBy, includeChildren, isStaffOff]);

    // Export to Excel
    const handleExportExcel = useCallback(() => {
        if (reportData.length === 0) {
            message.warning('Không có dữ liệu để xuất');
            return;
        }

        const exportData = reportData.map((item, index) => ({
            STT: index + 1,
            'Mã NV': item.maNhanVien,
            'Họ tên': item.hoTen,
            'Phòng ban': item.phongBan,
            'Loại đơn': item.loaiDon,
            'Từ ngày': item.ngayBatDau ? dayjs(item.ngayBatDau).format('DD/MM/YYYY HH:mm') : '',
            'Đến ngày': item.ngayKetThuc ? dayjs(item.ngayKetThuc).format('DD/MM/YYYY HH:mm') : '',
            'Lý do': item.lyDo,
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Báo cáo');
        XLSX.writeFile(wb, `Bao_cao_don_xin_phep_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`);
        message.success('Xuất Excel thành công!');
    }, [reportData]);

    // Export to Word
    const handleExportWord = useCallback(() => {
        if (reportData.length === 0) {
            message.warning('Không có dữ liệu để xuất');
            return;
        }

        let tableHtml = `
            <html><head><meta charset="utf-8"><title>Báo cáo đơn xin phép & tăng ca</title>
            <style>
                table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; }
                th, td { border: 1px solid #333; padding: 8px; font-size: 11px; }
                .title-header { text-align: center; font-size: 16px; font-weight: bold; }
            </style>
            </head><body>
            <table border="1" cellpadding="8" cellspacing="0">
                <tr>
                    <td colspan="3" align="center" style="width: 30%">
                        <b>MINH PHƯƠNG</b><br><span style="font-size: 9px">HỆ THỐNG QUẢN LÝ KHO</span>
                    </td>
                    <td colspan="4" align="center" style="width: 45%">
                        <h2>BÁO CÁO ĐƠN XIN PHÉP & TĂNG CA</h2>
                        <span style="font-size: 10px">Từ ngày: ${dateFrom ? dateFrom.format('DD/MM/YYYY') : '...'} - Đến ngày: ${dateTo ? dateTo.format('DD/MM/YYYY') : '...'}</span>
                    </td>
                    <td colspan="3" style="width: 25%">
                        <b>Mã:</b> BM-HCNS-15<br>
                        <b>Lần sửa đổi:</b> 01<br>
                        <b>Ngày ban hành:</b> 15/05/2012
                    </td>
                </tr>
                <tr style="background-color: #f1f5f9; font-weight: bold; text-align: center;">
                    <td>STT</td>
                    <td>Mã NV</td>
                    <td>Mã phiếu</td>
                    <td>Họ tên</td>
                    <td>Phòng ban</td>
                    <td>Mã chấm công</td>
                    <td>Loại đơn</td>
                    <td>Từ ngày</td>
                    <td>Đến ngày</td>
                    <td>Lý do</td>
                </tr>`;

        reportData.forEach((item, index) => {
            tableHtml += `<tr>
                <td align="center">${index + 1}</td>
                <td align="center">${item.maNhanVien || ''}</td>
                <td align="center">${item.maPhieu || ''}</td>
                <td><b>${item.hoTen || ''}</b></td>
                <td>${item.phongBan || ''}</td>
                <td align="center">${item.maChamCong || ''}</td>
                <td>${item.loaiDon || ''}</td>
                <td align="center">${item.ngayBatDau ? dayjs(item.ngayBatDau).format('DD/MM/YYYY HH:mm') : ''}</td>
                <td align="center">${item.ngayKetThuc ? dayjs(item.ngayKetThuc).format('DD/MM/YYYY HH:mm') : ''}</td>
                <td>${item.lyDo || ''}</td>
            </tr>`;
        });

        tableHtml += `
                <tr>
                    <td colspan="10" style="padding: 20px 10px;">
                        <table width="100%" border="0" style="font-size: 11px; border: none;">
                            <tr>
                                <td width="25%" align="center" style="border: none;"><b>Ban Giám Đốc</b><br><br><br><br>(Ký, họ tên)</td>
                                <td width="25%" align="center" style="border: none;"><b>Trưởng Bộ phận</b><br><br><br><br>(Ký, họ tên)</td>
                                <td width="25%" align="center" style="border: none;"><b>TP.HCNS</b><br><br><br><br>(Ký, họ tên)</td>
                                <td width="25%" align="center" style="border: none;"><b>Người lập biểu</b><br><br><br><br>(Ký, họ tên)</td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table></body></html>`;

        const blob = new Blob(['\ufeff', tableHtml], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Bao_cao_don_xin_phep_${dayjs().format('YYYYMMDD_HHmmss')}.doc`;
        link.click();
        URL.revokeObjectURL(url);
        message.success('Xuất Word thành công!');
    }, [reportData, dateFrom, dateTo]);

    // Reset filters
    const handleReset = useCallback(() => {
        setDepartments([]);
        setStatuses(['0', '1', '4', '5', '6']);
        setTemplates(['4', '5', '6', '7', '8', '9']);
        setEmployeeId(null);
        setDateFrom(dayjs().startOf('month'));
        setDateTo(dayjs());
        setSortBy(4);
        setIncludeChildren(true);
        setIsStaffOff(true);
        setReportData([]);
        message.info('Đã đặt lại bộ lọc');
    }, []);

    return (
        <div className='bcdxp-container'>
            {/* Header - uses CSS class for theme gradient */}
            <div className='bcdxp-header'>
                <h2>
                    <ClipboardList size={24} />
                    Báo cáo Đơn xin phép
                </h2>
                <p>Xem và xuất báo cáo đơn xin phép của nhân viên</p>
            </div>

            {/* Filter Card */}
            <Card
                className='bcdxp-filter-card'
                title={
                    <>
                        <Filter size={16} />
                        Bộ lọc tìm kiếm
                    </>
                }>
                <Row gutter={[12, 12]}>
                    {/* Phòng ban */}
                    <Col xs={24} md={8}>
                        <div className='bcdxp-filter-section'>
                            <div className='bcdxp-filter-label'>
                                <Building2 size={14} />
                                Phòng ban
                            </div>
                            <div className='bcdxp-checkbox-list'>
                                <CheckboxPhongBan value={departments} onChange={setDepartments} />
                            </div>
                            <Checkbox
                                checked={includeChildren}
                                onChange={(e) => setIncludeChildren(e.target.checked)}
                                style={{ marginTop: 8, fontSize: 12 }}>
                                Bao gồm phòng ban con
                            </Checkbox>
                        </div>
                    </Col>

                    {/* Trạng thái nhân viên */}
                    <Col xs={24} md={8}>
                        <div className='bcdxp-filter-section'>
                            <div className='bcdxp-filter-label'>
                                <Users size={14} />
                                Trạng thái nhân viên
                            </div>
                            <div className='bcdxp-checkbox-list'>
                                <CheckboxTrangThaiNV value={statuses} onChange={setStatuses} />
                            </div>
                        </div>
                    </Col>

                    {/* Loại đơn */}
                    <Col xs={24} md={8}>
                        <div className='bcdxp-filter-section'>
                            <div className='bcdxp-filter-label'>
                                <ClipboardList size={14} />
                                Loại đơn
                            </div>
                            <div className='bcdxp-checkbox-list'>
                                <CheckboxMauBaoCao value={templates} onChange={setTemplates} />
                            </div>
                        </div>
                    </Col>

                    {/* Row 2 */}
                    <Col xs={24} md={6}>
                        <div className='bcdxp-filter-section'>
                            <div className='bcdxp-filter-label'>
                                <Users size={14} />
                                Nhân viên cụ thể
                            </div>
                            <SelectNhanVien
                                value={employeeId}
                                onChange={setEmployeeId}
                                placeholder='Tất cả nhân viên'
                                allowClear
                                style={{ width: '100%' }}
                            />
                        </div>
                    </Col>

                    <Col xs={12} md={4}>
                        <div className='bcdxp-filter-section'>
                            <div className='bcdxp-filter-label'>
                                <Calendar size={14} />
                                Từ ngày
                            </div>
                            <DatePicker
                                value={dateFrom}
                                onChange={setDateFrom}
                                format='DD/MM/YYYY'
                                style={{ width: '100%' }}
                            />
                        </div>
                    </Col>

                    <Col xs={12} md={4}>
                        <div className='bcdxp-filter-section'>
                            <div className='bcdxp-filter-label'>
                                <Calendar size={14} />
                                Đến ngày
                            </div>
                            <DatePicker value={dateTo} onChange={setDateTo} format='DD/MM/YYYY' style={{ width: '100%' }} />
                        </div>
                    </Col>

                    <Col xs={12} md={5}>
                        <div className='bcdxp-filter-section'>
                            <div className='bcdxp-filter-label'>
                                <Filter size={14} />
                                Sắp xếp theo
                            </div>
                            <Select dropdownMatchSelectWidth={false} value={sortBy} onChange={setSortBy} options={SORT_OPTIONS} style={{ width: '100%' }} />
                        </div>
                    </Col>

                    <Col xs={12} md={5}>
                        <div className='bcdxp-filter-section'>
                            <div className='bcdxp-filter-label'>Tùy chọn khác</div>
                            <Checkbox checked={isStaffOff} onChange={(e) => setIsStaffOff(e.target.checked)}>
                                Theo ngày nghỉ NV
                            </Checkbox>
                        </div>
                    </Col>
                </Row>

                {/* Action Bar */}
                <div className='bcdxp-action-bar'>
                    <Button type='primary' className='bcdxp-btn-primary' onClick={handleLoadReport} loading={loading}>
                        <Search size={16} />
                        Tìm kiếm
                    </Button>

                    <Button onClick={handleReset}>
                        <RefreshCw size={14} />
                        Đặt lại
                    </Button>

                    <div style={{ flex: 1 }} />

                    <Space>
                        <Tooltip title='Xuất Excel'>
                            <Button onClick={handleExportExcel} disabled={reportData.length === 0}>
                                <FileSpreadsheet size={14} />
                                Excel
                            </Button>
                        </Tooltip>

                        <Tooltip title='Xuất Word'>
                            <Button onClick={handleExportWord} disabled={reportData.length === 0}>
                                <FileText size={14} />
                                Word
                            </Button>
                        </Tooltip>

                        <Tooltip title='In PDF'>
                            <Button onClick={handlePrint} disabled={reportData.length === 0}>
                                <Printer size={14} />
                                PDF
                            </Button>
                        </Tooltip>
                    </Space>
                </div>
            </Card>

            {/* Result Card */}
            <Card
                className='bcdxp-result-card'
                title={
                    <>
                        <ClipboardList size={16} />
                        Kết quả tìm kiếm
                        {reportData.length > 0 && <Tag color='blue'>{reportData.length} kết quả</Tag>}
                    </>
                }
                bodyStyle={{ padding: 0 }}>
                {/* Stats Bar */}
                {reportData.length > 0 && (
                    <div className='bcdxp-stats-bar'>
                        <div className='bcdxp-stat-item'>
                            <div className='bcdxp-stat-icon'>
                                <ClipboardList size={16} />
                            </div>
                            <div>
                                <div className='bcdxp-stat-value'>{reportData.length}</div>
                                <div className='bcdxp-stat-label'>Tổng đơn</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Table */}
                <div ref={printRef} className="bcdxp-printable-area">
                    {/* Screen-only Table */}
                    <div className="bcdxp-screen-only">
                        {reportData.length > 0 ? (
                            <Table
                                columns={TABLE_COLUMNS}
                                dataSource={reportData}
                                loading={loading}
                                pagination={{
                                    pageSize: 15,
                                    showTotal: (total, range) => `${range[0]}-${range[1]} / ${total}`,
                                    showSizeChanger: true,
                                    pageSizeOptions: ['10', '15', '25', '50'],
                                }}
                                scroll={{ x: 1000 }}
                                size='small'
                            />
                        ) : (
                            <Empty
                                className='bcdxp-empty'
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                description='Chọn bộ lọc và nhấn "Tìm kiếm" để xem kết quả'
                            />
                        )}
                    </div>

                    {/* Print-only Layout */}
                    {reportData.length > 0 && (
                        <div className="bcdxp-print-only">
                            <table border="1" cellPadding="8" cellSpacing="0" style={{ borderCollapse: 'collapse', width: '100%', fontFamily: 'Arial, sans-serif', color: 'black' }}>
                                <tbody>
                                    <tr>
                                        <td colSpan="3" style={{ textAlign: 'center', verticalAlign: 'middle', width: '30%', padding: '10px' }}>
                                            <div style={{ fontWeight: 'bold', fontSize: '15px' }}>MINH PHƯƠNG</div>
                                            <div style={{ fontSize: '10px', color: '#555' }}>HỆ THỐNG QUẢN LÝ KHO</div>
                                        </td>
                                        <td colSpan="4" style={{ textAlign: 'center', verticalAlign: 'middle', width: '45%', padding: '10px' }}>
                                            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>BÁO CÁO ĐƠN XIN PHÉP & TĂNG CA</h2>
                                            <p style={{ margin: '5px 0 0 0', fontSize: '11px' }}>
                                                Từ ngày: {dateFrom ? dateFrom.format('DD/MM/YYYY') : '...'} đến ngày: {dateTo ? dateTo.format('DD/MM/YYYY') : '...'}
                                            </p>
                                        </td>
                                        <td colSpan="3" style={{ verticalAlign: 'middle', width: '25%', padding: '10px', fontSize: '10px' }}>
                                            <div style={{ marginBottom: '3px' }}><b>Mã:</b> BM-HCNS-15</div>
                                            <div style={{ marginBottom: '3px' }}><b>Lần sửa đổi:</b> 01</div>
                                            <div><b>Ngày ban hành:</b> 15/05/2012</div>
                                        </td>
                                    </tr>
                                    <tr style={{ background: '#f1f5f9', fontWeight: 'bold', textAlign: 'center', fontSize: '11px' }}>
                                        <td style={{ width: '40px' }}>STT</td>
                                        <td style={{ width: '80px' }}>Mã NV</td>
                                        <td style={{ width: '80px' }}>Mã phiếu</td>
                                        <td style={{ width: '130px' }}>Họ tên</td>
                                        <td style={{ width: '120px' }}>Phòng ban</td>
                                        <td style={{ width: '100px' }}>Mã chấm công</td>
                                        <td style={{ width: '110px' }}>Loại đơn</td>
                                        <td style={{ width: '110px' }}>Từ ngày</td>
                                        <td style={{ width: '110px' }}>Đến ngày</td>
                                        <td>Lý do</td>
                                    </tr>
                                    {reportData.map((item, index) => (
                                        <tr key={item.key || index} style={{ fontSize: '11px' }}>
                                            <td style={{ textAlign: 'center' }}>{index + 1}</td>
                                            <td style={{ textAlign: 'center' }}>{item.maNhanVien}</td>
                                            <td style={{ textAlign: 'center' }}>{item.maPhieu}</td>
                                            <td><b>{item.hoTen}</b></td>
                                            <td>{item.phongBan}</td>
                                            <td style={{ textAlign: 'center' }}>{item.maChamCong}</td>
                                            <td>{item.loaiDon}</td>
                                            <td style={{ textAlign: 'center' }}>{item.ngayBatDau ? dayjs(item.ngayBatDau).format('DD/MM/YYYY HH:mm') : ''}</td>
                                            <td style={{ textAlign: 'center' }}>{item.ngayKetThuc ? dayjs(item.ngayKetThuc).format('DD/MM/YYYY HH:mm') : ''}</td>
                                            <td>{item.lyDo}</td>
                                        </tr>
                                    ))}
                                    <tr>
                                        <td colSpan="10" style={{ padding: '20px 10px', verticalAlign: 'top' }}>
                                            <table width="100%" border="0" style={{ fontSize: '11px', border: 'none' }}>
                                                <tbody>
                                                    <tr>
                                                        <td width="25%" align="center" style={{ border: 'none' }}><b>Ban Giám Đốc</b><br /><br /><br /><br />(Ký, họ tên)</td>
                                                        <td width="25%" align="center" style={{ border: 'none' }}><b>Trưởng Bộ phận</b><br /><br /><br /><br />(Ký, họ tên)</td>
                                                        <td width="25%" align="center" style={{ border: 'none' }}><b>TP.HCNS</b><br /><br /><br /><br />(Ký, họ tên)</td>
                                                        <td width="25%" align="center" style={{ border: 'none' }}><b>Người lập biểu</b><br /><br /><br /><br />(Ký, họ tên)</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
};

export default BaoCaoDonXinPhep;
