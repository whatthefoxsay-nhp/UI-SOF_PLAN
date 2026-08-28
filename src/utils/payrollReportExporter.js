import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const COMPANY_NAME = 'CÔNG TY TRÁCH NHIỆM HỮU HẠN SOF';

/**
 * Format number to Vietnamese currency string (e.g. 1,000,000)
 */
export const formatNumber = (num) => {
    if (num === null || num === undefined || isNaN(num) || num === 0) return '-';
    return Number(num).toLocaleString('vi-VN');
};

/**
 * Group data by Department
 */
export const groupDataByDepartment = (data = []) => {
    const groups = {};
    data.forEach((item) => {
        const dep = item.DepName || 'Khác / Chưa phân bổ';
        if (!groups[dep]) {
            groups[dep] = [];
        }
        groups[dep].push(item);
    });
    return groups;
};

/**
 * Calculate total values for a list of records
 */
export const calculateTotals = (items = []) => {
    const keys = [
        'SalaryBase',
        'SalaryKPI',
        'SalaryLevel',
        'Allowance_Job',
        'Allowance_Support',
        'Bonus_Unexpected',
        'Bonus_Other',
        'WorkDays',
        'SalaryKPI_Real',
        'Income_Total',
        'Insurance',
        'UnionFee',
        'PIT',
        'LateMinutes',
        'LateFees',
        'Fine_Late',
        'Fine_Uniform',
        'Fine_Phone',
        'Fine_Taxi',
        'VayHo',
        'HangMau',
        'HoanUng',
        'Fine_Other',
        'Fine_Total',
        'Advance_Work',
        'Advance_Salary',
        'Advance_Total',
        'Income_AfterTax',
        'NetSalary',
    ];

    const totals = {};
    keys.forEach((k) => (totals[k] = 0));

    items.forEach((item) => {
        keys.forEach((k) => {
            totals[k] += Number(item[k]) || 0;
        });
    });

    return totals;
};

/**
 * Export Payroll Report to Excel (.xlsx)
 */
export const exportPayrollToExcel = ({ dataSource = [], periodInfo = {}, templateTitle = 'BÁO CÁO LƯƠNG THÁNG' }) => {
    const info = periodInfo || {};
    const wb = XLSX.utils.book_new();

    const titleMonthYear = info.month && info.year 
        ? `THÁNG ${info.month}/${info.year}` 
        : '';
    
    const subtitleDate = info.dateStart && info.dateEnd
        ? `Từ ngày: ${info.dateStart} đến ngày ${info.dateEnd}`
        : '';

    // Sheet Header rows
    const sheetData = [
        [COMPANY_NAME],
        [`${templateTitle.toUpperCase()} ${titleMonthYear}`],
        [subtitleDate],
        [], // empty row
        [
            'STT',
            'Mã NV',
            'Họ và tên',
            'Chức vụ',
            'Bộ phận',
            'Lương CB',
            'Lương KPI',
            'Mức lương',
            'Phụ cấp TN',
            'Phụ cấp HT',
            'Thưởng ĐX',
            'Thưởng khác',
            'Ngày công',
            'Lương KPI thực tế',
            'Tổng thu nhập',
            'BHXH (10.5%)',
            'KPCĐ (1%)',
            'Thuế TNCN',
            'Phút đi trễ',
            'Trừ đi trễ',
            'Phạt đi trễ',
            'Đồng phục',
            'Điện thoại',
            'Taxi/Grab',
            'Vay hộ',
            'Hàng mẫu',
            'Hoàn ứng',
            'Phạt khác',
            'Tổng phạt',
            'Ứng công tác',
            'Ứng lương',
            'Tổng tạm ứng',
            'Thu nhập sau thuế',
            'Thực lãnh',
        ],
    ];

    const groupedData = groupDataByDepartment(dataSource);
    let sttOverall = 1;
    const grandTotals = calculateTotals(dataSource);

    Object.keys(groupedData).forEach((depName) => {
        // Add department title row
        sheetData.push([`Phòng ban: ${depName}`]);

        const depItems = groupedData[depName];
        depItems.forEach((item) => {
            sheetData.push([
                sttOverall++,
                item.CodeID || '',
                item.Name || '',
                item.Title || '',
                item.DepName || '',
                Number(item.SalaryBase) || 0,
                Number(item.SalaryKPI) || 0,
                Number(item.SalaryLevel) || 0,
                Number(item.Allowance_Job) || 0,
                Number(item.Allowance_Support) || 0,
                Number(item.Bonus_Unexpected) || 0,
                Number(item.Bonus_Other) || 0,
                Number(item.WorkDays) || 0,
                Number(item.SalaryKPI_Real) || 0,
                Number(item.Income_Total) || 0,
                Number(item.Insurance) || 0,
                Number(item.UnionFee) || 0,
                Number(item.PIT) || 0,
                Number(item.LateMinutes) || 0,
                Number(item.LateFees) || 0,
                Number(item.Fine_Late) || 0,
                Number(item.Fine_Uniform) || 0,
                Number(item.Fine_Phone) || 0,
                Number(item.Fine_Taxi) || 0,
                Number(item.VayHo) || 0,
                Number(item.HangMau) || 0,
                Number(item.HoanUng) || 0,
                Number(item.Fine_Other) || 0,
                Number(item.Fine_Total) || 0,
                Number(item.Advance_Work) || 0,
                Number(item.Advance_Salary) || 0,
                Number(item.Advance_Total) || 0,
                Number(item.Income_AfterTax) || 0,
                Number(item.NetSalary) || 0,
            ]);
        });

        // Add department subtotal
        const depTotals = calculateTotals(depItems);
        sheetData.push([
            '',
            '',
            `CỘNG PHÒNG BAN: ${depName.toUpperCase()}`,
            '',
            '',
            depTotals.SalaryBase,
            depTotals.SalaryKPI,
            depTotals.SalaryLevel,
            depTotals.Allowance_Job,
            depTotals.Allowance_Support,
            depTotals.Bonus_Unexpected,
            depTotals.Bonus_Other,
            depTotals.WorkDays,
            depTotals.SalaryKPI_Real,
            depTotals.Income_Total,
            depTotals.Insurance,
            depTotals.UnionFee,
            depTotals.PIT,
            depTotals.LateMinutes,
            depTotals.LateFees,
            depTotals.Fine_Late,
            depTotals.Fine_Uniform,
            depTotals.Fine_Phone,
            depTotals.Fine_Taxi,
            depTotals.VayHo,
            depTotals.HangMau,
            depTotals.HoanUng,
            depTotals.Fine_Other,
            depTotals.Fine_Total,
            depTotals.Advance_Work,
            depTotals.Advance_Salary,
            depTotals.Advance_Total,
            depTotals.Income_AfterTax,
            depTotals.NetSalary,
        ]);

        sheetData.push([]); // Empty row after group
    });

    // Add Grand Total
    sheetData.push([
        '',
        '',
        'TỔNG CỘNG TOÀN CÔNG TY',
        '',
        '',
        grandTotals.SalaryBase,
        grandTotals.SalaryKPI,
        grandTotals.SalaryLevel,
        grandTotals.Allowance_Job,
        grandTotals.Allowance_Support,
        grandTotals.Bonus_Unexpected,
        grandTotals.Bonus_Other,
        grandTotals.WorkDays,
        grandTotals.SalaryKPI_Real,
        grandTotals.Income_Total,
        grandTotals.Insurance,
        grandTotals.UnionFee,
        grandTotals.PIT,
        grandTotals.LateMinutes,
        grandTotals.LateFees,
        grandTotals.Fine_Late,
        grandTotals.Fine_Uniform,
        grandTotals.Fine_Phone,
        grandTotals.Fine_Taxi,
        grandTotals.VayHo,
        grandTotals.HangMau,
        grandTotals.HoanUng,
        grandTotals.Fine_Other,
        grandTotals.Fine_Total,
        grandTotals.Advance_Work,
        grandTotals.Advance_Salary,
        grandTotals.Advance_Total,
        grandTotals.Income_AfterTax,
        grandTotals.NetSalary,
    ]);

    const ws = XLSX.utils.aoa_to_sheet(sheetData);

    // Set column widths
    ws['!cols'] = [
        { wch: 6 },  // STT
        { wch: 12 }, // Mã NV
        { wch: 25 }, // Họ tên
        { wch: 20 }, // Chức vụ
        { wch: 22 }, // Bộ phận
        { wch: 14 }, // Lương CB
        { wch: 14 }, // Lương KPI
        { wch: 14 }, // Mức lương
        { wch: 14 }, // Phụ cấp TN
        { wch: 14 }, // Phụ cấp HT
        { wch: 14 }, // Thưởng ĐX
        { wch: 14 }, // Thưởng khác
        { wch: 10 }, // Ngày công
        { wch: 15 }, // Lương KPI TT
        { wch: 16 }, // Tổng thu nhập
        { wch: 14 }, // BHXH
        { wch: 12 }, // KPCĐ
        { wch: 14 }, // Thuế TNCN
        { wch: 10 }, // Phút đi trễ
        { wch: 12 }, // Trừ đi trễ
        { wch: 12 }, // Phạt đi trễ
        { wch: 12 }, // Đồng phục
        { wch: 12 }, // Điện thoại
        { wch: 12 }, // Taxi/Grab
        { wch: 12 }, // Vay hộ
        { wch: 12 }, // Hàng mẫu
        { wch: 12 }, // Hoàn ứng
        { wch: 12 }, // Phạt khác
        { wch: 14 }, // Tổng phạt
        { wch: 14 }, // Ứng CT
        { wch: 14 }, // Ứng lương
        { wch: 14 }, // Cộng ứng
        { wch: 16 }, // TN sau thuế
        { wch: 18 }, // Thực lãnh
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'BaoCaoLuong');

    const fileName = `BaoCaoLuong_${info.month || ''}_${info.year || ''}.xlsx`;
    XLSX.writeFile(wb, fileName);
};

/**
 * Generate Printable HTML String for Web Preview & Word Export
 */
export const generateReportHTML = ({ dataSource = [], periodInfo = {}, templateTitle = 'BÁO CÁO LƯƠNG THÁNG' }) => {
    const info = periodInfo || {};
    const groupedData = groupDataByDepartment(dataSource);
    const grandTotals = calculateTotals(dataSource);

    const titleMonthYear = info.month && info.year 
        ? `THÁNG ${info.month}/${info.year}` 
        : '';

    const subtitleDate = info.dateStart && info.dateEnd
        ? `Từ ngày: ${info.dateStart} đến ngày ${info.dateEnd}`
        : '';

    let rowsHTML = '';
    let sttOverall = 1;

    Object.keys(groupedData).forEach((depName) => {
        // Department Header Row
        rowsHTML += `
            <tr class="bg-gray-100 font-bold">
                <td colspan="34" style="background-color: #f3f4f6; text-align: left; padding: 6px 10px; font-weight: bold;">
                    Phòng ban: ${depName}
                </td>
            </tr>
        `;

        const depItems = groupedData[depName];
        depItems.forEach((item) => {
            rowsHTML += `
                <tr>
                    <td style="text-align: center;">${sttOverall++}</td>
                    <td style="text-align: center;">${item.CodeID || ''}</td>
                    <td style="text-align: left; font-weight: 500;">${item.Name || ''}</td>
                    <td style="text-align: left;">${item.Title || ''}</td>
                    <td style="text-align: left;">${item.DepName || ''}</td>
                    <td style="text-align: right;">${formatNumber(item.SalaryBase)}</td>
                    <td style="text-align: right;">${formatNumber(item.SalaryKPI)}</td>
                    <td style="text-align: right;">${formatNumber(item.SalaryLevel)}</td>
                    <td style="text-align: right;">${formatNumber(item.Allowance_Job)}</td>
                    <td style="text-align: right;">${formatNumber(item.Allowance_Support)}</td>
                    <td style="text-align: right;">${formatNumber(item.Bonus_Unexpected)}</td>
                    <td style="text-align: right;">${formatNumber(item.Bonus_Other)}</td>
                    <td style="text-align: center;">${formatNumber(item.WorkDays)}</td>
                    <td style="text-align: right;">${formatNumber(item.SalaryKPI_Real)}</td>
                    <td style="text-align: right; font-weight: bold;">${formatNumber(item.Income_Total)}</td>
                    <td style="text-align: right;">${formatNumber(item.Insurance)}</td>
                    <td style="text-align: right;">${formatNumber(item.UnionFee)}</td>
                    <td style="text-align: right;">${formatNumber(item.PIT)}</td>
                    <td style="text-align: center;">${item.LateMinutes || '-'}</td>
                    <td style="text-align: right;">${formatNumber(item.LateFees)}</td>
                    <td style="text-align: right;">${formatNumber(item.Fine_Late)}</td>
                    <td style="text-align: right;">${formatNumber(item.Fine_Uniform)}</td>
                    <td style="text-align: right;">${formatNumber(item.Fine_Phone)}</td>
                    <td style="text-align: right;">${formatNumber(item.Fine_Taxi)}</td>
                    <td style="text-align: right;">${formatNumber(item.VayHo)}</td>
                    <td style="text-align: right;">${formatNumber(item.HangMau)}</td>
                    <td style="text-align: right;">${formatNumber(item.HoanUng)}</td>
                    <td style="text-align: right;">${formatNumber(item.Fine_Other)}</td>
                    <td style="text-align: right;">${formatNumber(item.Fine_Total)}</td>
                    <td style="text-align: right;">${formatNumber(item.Advance_Work)}</td>
                    <td style="text-align: right;">${formatNumber(item.Advance_Salary)}</td>
                    <td style="text-align: right;">${formatNumber(item.Advance_Total)}</td>
                    <td style="text-align: right;">${formatNumber(item.Income_AfterTax)}</td>
                    <td style="text-align: right; font-weight: bold; color: #1e40af;">${formatNumber(item.NetSalary)}</td>
                </tr>
            `;
        });

        // Department Subtotal
        const depTotals = calculateTotals(depItems);
        rowsHTML += `
            <tr style="background-color: #eff6ff; font-weight: bold;">
                <td colspan="5" style="text-align: left; padding: 6px 10px; font-weight: bold;">
                    CỘNG PHÒNG BAN: ${depName.toUpperCase()}
                </td>
                <td style="text-align: right;">${formatNumber(depTotals.SalaryBase)}</td>
                <td style="text-align: right;">${formatNumber(depTotals.SalaryKPI)}</td>
                <td style="text-align: right;">${formatNumber(depTotals.SalaryLevel)}</td>
                <td style="text-align: right;">${formatNumber(depTotals.Allowance_Job)}</td>
                <td style="text-align: right;">${formatNumber(depTotals.Allowance_Support)}</td>
                <td style="text-align: right;">${formatNumber(depTotals.Bonus_Unexpected)}</td>
                <td style="text-align: right;">${formatNumber(depTotals.Bonus_Other)}</td>
                <td style="text-align: center;">${formatNumber(depTotals.WorkDays)}</td>
                <td style="text-align: right;">${formatNumber(depTotals.SalaryKPI_Real)}</td>
                <td style="text-align: right;">${formatNumber(depTotals.Income_Total)}</td>
                <td style="text-align: right;">${formatNumber(depTotals.Insurance)}</td>
                <td style="text-align: right;">${formatNumber(depTotals.UnionFee)}</td>
                <td style="text-align: right;">${formatNumber(depTotals.PIT)}</td>
                <td style="text-align: center;">-</td>
                <td style="text-align: right;">${formatNumber(depTotals.LateFees)}</td>
                <td style="text-align: right;">${formatNumber(depTotals.Fine_Late)}</td>
                <td style="text-align: right;">${formatNumber(depTotals.Fine_Uniform)}</td>
                <td style="text-align: right;">${formatNumber(depTotals.Fine_Phone)}</td>
                <td style="text-align: right;">${formatNumber(depTotals.Fine_Taxi)}</td>
                <td style="text-align: right;">${formatNumber(depTotals.VayHo)}</td>
                <td style="text-align: right;">${formatNumber(depTotals.HangMau)}</td>
                <td style="text-align: right;">${formatNumber(depTotals.HoanUng)}</td>
                <td style="text-align: right;">${formatNumber(depTotals.Fine_Other)}</td>
                <td style="text-align: right;">${formatNumber(depTotals.Fine_Total)}</td>
                <td style="text-align: right;">${formatNumber(depTotals.Advance_Work)}</td>
                <td style="text-align: right;">${formatNumber(depTotals.Advance_Salary)}</td>
                <td style="text-align: right;">${formatNumber(depTotals.Advance_Total)}</td>
                <td style="text-align: right;">${formatNumber(depTotals.Income_AfterTax)}</td>
                <td style="text-align: right; color: #1d4ed8;">${formatNumber(depTotals.NetSalary)}</td>
            </tr>
        `;
    });

    // Grand Total
    const grandTotalHTML = `
        <tr style="background-color: #dbeafe; font-weight: bold; font-size: 13px;">
            <td colspan="5" style="text-align: left; padding: 8px 10px; font-weight: bold;">
                TỔNG CỘNG TOÀN CÔNG TY
            </td>
            <td style="text-align: right;">${formatNumber(grandTotals.SalaryBase)}</td>
            <td style="text-align: right;">${formatNumber(grandTotals.SalaryKPI)}</td>
            <td style="text-align: right;">${formatNumber(grandTotals.SalaryLevel)}</td>
            <td style="text-align: right;">${formatNumber(grandTotals.Allowance_Job)}</td>
            <td style="text-align: right;">${formatNumber(grandTotals.Allowance_Support)}</td>
            <td style="text-align: right;">${formatNumber(grandTotals.Bonus_Unexpected)}</td>
            <td style="text-align: right;">${formatNumber(grandTotals.Bonus_Other)}</td>
            <td style="text-align: center;">${formatNumber(grandTotals.WorkDays)}</td>
            <td style="text-align: right;">${formatNumber(grandTotals.SalaryKPI_Real)}</td>
            <td style="text-align: right;">${formatNumber(grandTotals.Income_Total)}</td>
            <td style="text-align: right;">${formatNumber(grandTotals.Insurance)}</td>
            <td style="text-align: right;">${formatNumber(grandTotals.UnionFee)}</td>
            <td style="text-align: right;">${formatNumber(grandTotals.PIT)}</td>
            <td style="text-align: center;">-</td>
            <td style="text-align: right;">${formatNumber(grandTotals.LateFees)}</td>
            <td style="text-align: right;">${formatNumber(grandTotals.Fine_Late)}</td>
            <td style="text-align: right;">${formatNumber(grandTotals.Fine_Uniform)}</td>
            <td style="text-align: right;">${formatNumber(grandTotals.Fine_Phone)}</td>
            <td style="text-align: right;">${formatNumber(grandTotals.Fine_Taxi)}</td>
            <td style="text-align: right;">${formatNumber(grandTotals.VayHo)}</td>
            <td style="text-align: right;">${formatNumber(grandTotals.HangMau)}</td>
            <td style="text-align: right;">${formatNumber(grandTotals.HoanUng)}</td>
            <td style="text-align: right;">${formatNumber(grandTotals.Fine_Other)}</td>
            <td style="text-align: right;">${formatNumber(grandTotals.Fine_Total)}</td>
            <td style="text-align: right;">${formatNumber(grandTotals.Advance_Work)}</td>
            <td style="text-align: right;">${formatNumber(grandTotals.Advance_Salary)}</td>
            <td style="text-align: right;">${formatNumber(grandTotals.Advance_Total)}</td>
            <td style="text-align: right;">${formatNumber(grandTotals.Income_AfterTax)}</td>
            <td style="text-align: right; color: #1e3a8a;">${formatNumber(grandTotals.NetSalary)}</td>
        </tr>
    `;

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8" />
            <title>${templateTitle}</title>
            <style>
                body { font-family: 'Arial', sans-serif; font-size: 11px; color: #333; margin: 20px; }
                .report-header { text-align: center; margin-bottom: 20px; }
                .company-title { font-weight: bold; font-size: 14px; text-transform: uppercase; color: #1e3a8a; }
                .report-title { font-weight: bold; font-size: 18px; text-transform: uppercase; margin-top: 5px; color: #111827; }
                .report-subtitle { font-style: italic; font-size: 12px; color: #4b5563; margin-top: 3px; }
                table.tbl-report { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 10px; }
                table.tbl-report th, table.tbl-report td { border: 1px solid #cbd5e1; padding: 4px 6px; }
                table.tbl-report th { background-color: #f1f5f9; font-weight: bold; text-align: center; }
                .footer-signatures { width: 100%; margin-top: 40px; border-collapse: collapse; }
                .footer-signatures td { border: none; text-align: center; vertical-align: top; padding: 5px; }
                @media print {
                    body { margin: 0; }
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="report-header">
                <div class="company-title">${COMPANY_NAME}</div>
                <div class="report-title">${templateTitle} ${titleMonthYear}</div>
                <div class="report-subtitle">${subtitleDate}</div>
            </div>

            <table class="tbl-report">
                <thead>
                    <tr>
                        <th rowspan="2">STT</th>
                        <th rowspan="2">Mã NV</th>
                        <th rowspan="2">Họ và tên</th>
                        <th rowspan="2">Chức vụ</th>
                        <th rowspan="2">Bộ phận</th>
                        <th colspan="10">CÁC KHOẢN CỘNG THU NHẬP</th>
                        <th colspan="3">GIẢM TRỪ BH & THUẾ</th>
                        <th colspan="3">ĐI TRỄ</th>
                        <th colspan="8">CÁC KHOẢN TRỪ KHÁC</th>
                        <th colspan="3">TẠM ỨNG</th>
                        <th rowspan="2">TN Sau Thuế</th>
                        <th rowspan="2">THỰC LÃNH</th>
                    </tr>
                    <tr>
                        <th>Lương CB</th>
                        <th>Lương KPI</th>
                        <th>Mức lương</th>
                        <th>PC TN</th>
                        <th>PC HT</th>
                        <th>Thưởng ĐX</th>
                        <th>Thưởng khác</th>
                        <th>Công</th>
                        <th>KPI TT</th>
                        <th>Tổng Thu Nhập</th>
                        <th>BHXH (10.5%)</th>
                        <th>KPCĐ (1%)</th>
                        <th>Thuế TNCN</th>
                        <th>Phút</th>
                        <th>Trừ đi trễ</th>
                        <th>Phạt đi trễ</th>
                        <th>Đồng phục</th>
                        <th>Điện thoại</th>
                        <th>Taxi/Grab</th>
                        <th>Vay hộ</th>
                        <th>Hàng mẫu</th>
                        <th>Hoàn ứng</th>
                        <th>Phạt khác</th>
                        <th>Tổng phạt</th>
                        <th>Ứng CT</th>
                        <th>Ứng lương</th>
                        <th>Cộng ứng</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHTML}
                    ${grandTotalHTML}
                </tbody>
            </table>

            <table class="footer-signatures">
                <tr>
                    <td colspan="4" style="text-align: right; padding-bottom: 15px; font-style: italic;">
                        ..., ngày ..... tháng ..... năm 20...
                    </td>
                </tr>
                <tr style="font-weight: bold;">
                    <td width="25%">Người Lập Biểu</td>
                    <td width="25%">Trưởng Bộ Phận</td>
                    <td width="25%">Kế Toán Trưởng</td>
                    <td width="25%">Ban Giám Đốc</td>
                </tr>
                <tr style="height: 60px;">
                    <td></td><td></td><td></td><td></td>
                </tr>
                <tr style="font-style: italic; color: #6b7280;">
                    <td>(Ký, họ tên)</td>
                    <td>(Ký, họ tên)</td>
                    <td>(Ký, họ tên)</td>
                    <td>(Ký, duyệt)</td>
                </tr>
            </table>
        </body>
        </html>
    `;
};

/**
 * Export Payroll Report to Word (.doc)
 */
export const exportPayrollToWord = ({ dataSource = [], periodInfo = {}, templateTitle = 'BÁO CÁO LƯƠNG THÁNG' }) => {
    const info = periodInfo || {};
    const htmlContent = generateReportHTML({ dataSource, periodInfo: info, templateTitle });
    const blob = new Blob(['\ufeff' + htmlContent], {
        type: 'application/msword;charset=utf-8',
    });
    const fileName = `BaoCaoLuong_${info.month || ''}_${info.year || ''}.doc`;
    saveAs(blob, fileName);
};
