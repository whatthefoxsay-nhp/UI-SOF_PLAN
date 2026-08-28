/**
* Utility to convert numbers to Vietnamese words
*/
export const docSoThanhChu = (so) => {
    if (so === 0) return 'Không đồng';
    if (so < 0) return 'Âm ' + docSoThanhChu(Math.abs(so));

    const unitWords = ['', 'ngàn', 'triệu', 'tỷ', 'ngàn tỷ', 'triệu tỷ'];
    const chuSo = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

    const doc3So = (n) => {
        let res = '';
        const tram = Math.floor(n / 100);
        const chuc = Math.floor((n % 100) / 10);
        const donvi = n % 10;

        if (tram > 0) {
            res += chuSo[tram] + ' trăm ';
            if (chuc === 0 && donvi > 0) res += 'lẻ ';
        }

        if (chuc > 1) {
            res += chuSo[chuc] + ' mươi ';
            if (donvi === 1) res += 'mốt';
            else if (donvi === 5) res += 'lăm';
            else if (donvi > 0) res += chuSo[donvi];
        } else if (chuc === 1) {
            res += 'mười ';
            if (donvi === 5) res += 'lăm';
            else if (donvi > 0) res += chuSo[donvi];
        } else if (tram > 0 && donvi > 0) {
            res += chuSo[donvi];
        } else if (donvi > 0) {
            res += chuSo[donvi];
        }

        return res.trim();
    };

    let str = '';
    let i = 0;
    let tempSo = so;

    while (tempSo > 0) {
        const n = tempSo % 1000;
        if (n > 0) {
            const s = doc3So(n);
            str = s + ' ' + unitWords[i] + ' ' + str;
        }
        tempSo = Math.floor(tempSo / 1000);
        i++;
    }

    str = str.trim();
    if (str.length > 0) {
        str = str.charAt(0).toUpperCase() + str.slice(1);
        return str + ' đồng';
    }
    return '';
};

export const generatePayrollHTML = (data, periodInfo, logoUrl = '', templateId = '41') => {
    const templateTitleMap = {
        '9': 'BẢNG LƯƠNG TỔNG THÁNG',
        '30': 'BẢNG LƯƠNG VĂN PHÒNG',
        '40': 'BẢNG LƯƠNG TỔNG',
        '41': 'BẢNG LƯƠNG CHI TIẾT',
        '4': 'BÁO CÁO NGÂN HÀNG',
        '19': 'DANH SÁCH CHI LƯƠNG QUA THẺ',
        '42': 'BÁO CÁO NGÂN HÀNG ỨNG LƯƠNG - TK1',
        '43': 'BÁO CÁO NGÂN HÀNG ỨNG LƯƠNG - TK2',
        '44': 'BÁO CÁO TIỀN MẶT ỨNG LƯƠNG',
        '51': 'BÁO CÁO KHOẢN TRỪ - MẪU TỔNG',
        '52': 'BÁO CÁO KHOẢN TRỪ - ĐI TRỄ VÀ TRỪ HOÀN ỨNG',
        '53': 'BÁO CÁO KHOẢN TRỪ - TRỪ KHÁC',
        '10': 'KINH PHÍ CÔNG ĐOÀN THEO THÁNG',
        '11': 'THAM GIA BẢO HIỂM THEO THÁNG',
        '12': 'KINH PHÍ CÔNG ĐOÀN THEO PHÒNG BAN',
        '13': 'TRÍCH ĐÓNG BẢO HIỂM THEO PHÒNG BAN',
        '14': 'BÁO CÁO THUẾ TNCN THEO THÁNG',
        '15': 'BÁO CÁO THUẾ TNCN THEO NĂM',
        '25': 'BÁO CÁO THUẾ TNCN NNN THEO THÁNG',
        '67': 'BÁO CÁO PIT NĂM TỪ NGƯỜI PHỤ THUỘC',
        '68': 'BÁO CÁO LƯƠNG THÁNG 13',
        '56': 'BÁO CÁO NGÂN HÀNG LƯƠNG THÁNG 13',
        '58': 'BÁO CÁO TIỀN MẶT LƯƠNG THÁNG 13',
    };

    const title = templateTitleMap[templateId] || 'BÁO CÁO LƯƠNG';
    const { month, year, dateStart, dateEnd } = periodInfo;
    const formatNum = (val) => (val ? Math.round(val).toLocaleString() : '');

    const isBankTemplate = ['4', '19', '42', '43', '56'].includes(templateId);
    const isPITTemplate = ['14', '15', '25', '67'].includes(templateId);

    const numericFields = [
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
        'LateCount',
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
    numericFields.forEach((field) => (totals[field] = 0));

    let rowsHtml = '';
    data.forEach((row, index) => {
        // Accumulate totals
        numericFields.forEach((field) => {
            totals[field] += row[field] || 0;
        });

        if (isBankTemplate) {
            rowsHtml += `
                <tr>
                    <td align="center">${index + 1}</td>
                    <td align="left" style="white-space: nowrap;">${row.Name || ''}</td>
                    <td align="center">${row.BankAccount || ''}</td>
                    <td align="right" style="font-weight: bold;">${formatNum(row.NetSalary)}</td>
                    <td align="left">${row.BankName || ''}</td>
                    <td align="left">Luong thang ${month}/${year} - ${row.Name}</td>
                </tr>
            `;
        } else if (isPITTemplate) {
            rowsHtml += `
                <tr>
                    <td align="center">${index + 1}</td>
                    <td align="left" style="white-space: nowrap;">${row.Name || ''}</td>
                    <td align="center">${row.PITCode || ''}</td>
                    <td align="right">${formatNum(row.Income_Total)}</td>
                    <td align="right">${formatNum(row.Insurance)}</td>
                    <td align="right">${formatNum(row.UnionFee)}</td>
                    <td align="right" style="font-weight: bold; color: red;">${formatNum(row.PIT)}</td>
                    <td align="right">${formatNum(row.Income_AfterTax)}</td>
                </tr>
            `;
        } else {
            rowsHtml += `
                <tr>
                    <td align="center">${index + 1}</td>
                    <td align="left" style="white-space: nowrap;">${row.Name || ''}</td>
                    <td align="left" style="white-space: nowrap;">${row.Title || ''}</td>
                    <td align="right">${formatNum(row.SalaryBase)}</td>
                    <td align="right">${formatNum(row.SalaryKPI)}</td>
                    <td align="right" style="color: red;">${formatNum(row.SalaryLevel)}</td>
                    <td align="right">${formatNum(row.Allowance_Job)}</td>
                    <td align="right">${formatNum(row.Allowance_Support)}</td>
                    <td align="right">${formatNum(row.Bonus_Unexpected)}</td>
                    <td align="right">${formatNum(row.Bonus_Other)}</td>
                    <td align="center">${row.WorkDays || ''}</td>
                    <td align="right">${formatNum(row.SalaryKPI_Real)}</td>
                    <td align="right">${formatNum(row.Income_Total)}</td>
                    <td align="right">${formatNum(row.Insurance)}</td>
                    <td align="right">${formatNum(row.UnionFee)}</td>
                    <td align="right">${formatNum(row.PIT)}</td>
                    <td align="center">${row.LateMinutes || ''}</td>
                    <td align="right">${formatNum(row.LateFees)}</td>
                    <td align="center">${row.LateCount || ''}</td>
                    <td align="right">${formatNum(row.Fine_Late)}</td>
                    <td align="right">${formatNum(row.Fine_Uniform)}</td>
                    <td align="right">${formatNum(row.Fine_Phone)}</td>
                    <td align="right">${formatNum(row.Fine_Taxi)}</td>
                    <td align="right">${formatNum(row.VayHo)}</td>
                    <td align="right">${formatNum(row.HangMau)}</td>
                    <td align="right">${formatNum(row.HoanUng)}</td>
                    <td align="right">${formatNum(row.Fine_Other)}</td>
                    <td align="right">${formatNum(row.Fine_Total)}</td>
                    <td align="right">${formatNum(row.Advance_Work)}</td>
                    <td align="right">${formatNum(row.Advance_Salary)}</td>
                    <td align="right">${formatNum(row.Advance_Total)}</td>
                    <td align="right">${formatNum(row.Income_AfterTax)}</td>
                    <td align="right">${formatNum(row.NetSalary)}</td>
                    <td align="center">${row.KhuVuc || ''}</td>
                    <td align="center">${row.ChiNhanh || ''}</td>
                </tr>
            `;
        }
    });

    // Header Content based on template
    let headerHtml = '';
    if (isBankTemplate) {
        headerHtml = `
            <thead>
                <tr>
                    <th class="lvhtable">STT</th>
                    <th class="lvhtable">HỌ VÀ TÊN</th>
                    <th class="lvhtable">SỐ TÀI KHOẢN</th>
                    <th class="lvhtable">SỐ TIỀN</th>
                    <th class="lvhtable">NGÂN HÀNG</th>
                    <th class="lvhtable">NỘI DUNG</th>
                </tr>
            </thead>
        `;
    } else if (isPITTemplate) {
        headerHtml = `
            <thead>
                <tr>
                    <th class="lvhtable">STT</th>
                    <th class="lvhtable">HỌ VÀ TÊN</th>
                    <th class="lvhtable">MÃ SỐ THUẾ</th>
                    <th class="lvhtable">TỔNG THU NHẬP</th>
                    <th class="lvhtable">BHXH (10.5%)</th>
                    <th class="lvhtable">KPCĐ (1%)</th>
                    <th class="lvhtable">THUẾ TNCN</th>
                    <th class="lvhtable">THU NHẬP SAU THUẾ</th>
                </tr>
            </thead>
        `;
    } else {
        headerHtml = `
            <thead>
                <tr>
                    <th rowspan="2" class="lvhtable">STT</th>
                    <th rowspan="2" class="lvhtable">HỌ VÀ TÊN</th>
                    <th rowspan="2" class="lvhtable">CHỨC VỤ</th>
                    <th rowspan="2" class="lvhtable">LƯƠNG CB</th>
                    <th rowspan="2" class="lvhtable">LƯƠNG KPI</th>
                    <th rowspan="2" class="lvhtable" style="color: #ff9999;">MỨC LƯƠNG</th>
                    <th colspan="5" class="lvhtable">CÁC KHOẢN CỘNG</th>
                    <th rowspan="2" class="lvhtable">LƯƠNG KPI THỰC NHẬN</th>
                    <th rowspan="2" class="lvhtable">TỔNG THU NHẬP</th>
                    <th colspan="3" class="lvhtable">CÁC KHOẢN GIẢM TRỪ</th>
                    <th colspan="2" class="lvhtable">TRỪ ĐI TRỄ</th>
                    <th colspan="10" class="lvhtable">CÁC KHOẢN TRỪ PHẠT SAU THUẾ</th>
                    <th colspan="3" class="lvhtable">TRỪ CÁC KHOẢN TẠM ỨNG</th>
                    <th rowspan="2" class="lvhtable">THU NHẬP SAU THUẾ</th>
                    <th rowspan="2" class="lvhtable">THỰC LÃNH</th>
                    <th rowspan="2" class="lvhtable">KV</th>
                    <th rowspan="2" class="lvhtable">MÃ CTY</th>
                </tr>
                <tr>
                    <!-- CÁC KHOẢN CỘNG -->
                    <th class="lvhtable">PHỤ CẤP TRÁCH NHIỆM, CV</th>
                    <th class="lvhtable">PHỤ CẤP HỖ TRỢ</th>
                    <th class="lvhtable">THƯỞNG ĐỘT XUẤT</th>
                    <th class="lvhtable">THƯỞNG KHÁC</th>
                    <th class="lvhtable">NGÀY CÔNG</th>
                    <!-- GIẢM TRỪ -->
                    <th class="lvhtable">BHXH, BHYT, BHTN (10.5%)</th>
                    <th class="lvhtable">KPCĐ (1%)</th>
                    <th class="lvhtable">THUẾ TNCN</th>
                    <!-- TRỪ ĐI TRỄ -->
                    <th class="lvhtable">SỐ PHÚT</th>
                    <th class="lvhtable">SỐ TIỀN</th>
                    <!-- PHẠT SAU THUẾ -->
                    <th class="lvhtable">SỐ LẦN ĐI TRỄ</th>
                    <th class="lvhtable">PHẠT LẦN ĐI TRỄ</th>
                    <th class="lvhtable">PHẠT ĐỒNG PHỤC</th>
                    <th class="lvhtable">PHẠT ĐIỆN THOẠI</th>
                    <th class="lvhtable">PHẠT TAXI, GRAB</th>
                    <th class="lvhtable">LÃI, GỐC VAY HỘ</th>
                    <th class="lvhtable">TRỪ HÀNG MẪU</th>
                    <th class="lvhtable">PHẠT HOÀN ỨNG</th>
                    <th class="lvhtable">PHẠT KHÁC</th>
                    <th class="lvhtable">CỘNG</th>
                    <!-- TẠM ỨNG -->
                    <th class="lvhtable">ỨNG CÔNG TÁC</th>
                    <th class="lvhtable">ỨNG LƯƠNG</th>
                    <th class="lvhtable">CỘNG ỨNG</th>
                </tr>
            </thead>
        `;
    }

    // Footer Summary row
    let footerHtml = '';
    if (isBankTemplate) {
        footerHtml = `
            <tr style="font-weight: bold;">
                <td colspan="3" align="right">TỔNG CỘNG:</td>
                <td align="right">${formatNum(totals.NetSalary)}</td>
                <td colspan="2"></td>
            </tr>
            <tr>
                <td colspan="3" align="right">Bằng chữ:</td>
                <td colspan="3" align="left"><i>${docSoThanhChu(totals.NetSalary)}</i></td>
            </tr>
        `;
    } else if (isPITTemplate) {
        footerHtml = `
            <tr style="font-weight: bold;">
                <td colspan="3" align="right">TỔNG CỘNG:</td>
                <td align="right">${formatNum(totals.Income_Total)}</td>
                <td align="right">${formatNum(totals.Insurance)}</td>
                <td align="right">${formatNum(totals.UnionFee)}</td>
                <td align="right">${formatNum(totals.PIT)}</td>
                <td align="right">${formatNum(totals.Income_AfterTax)}</td>
            </tr>
        `;
    } else {
        footerHtml = `
            <tr style="font-weight: bold;">
                <td colspan="3" align="right">TỔNG CỘNG:</td>
                <td colspan="32" align="left">${formatNum(totals.NetSalary)}</td>
            </tr>
            <tr>
                <td colspan="3" align="right">Bằng chữ:</td>
                <td colspan="32" align="left"><i>${docSoThanhChu(totals.NetSalary)}</i></td>
            </tr>
        `;
    }

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${title} Tháng ${month}/${year}</title>
    <style>
        body { font-family: "Times New Roman", Times, serif; font-size: 11px; margin: 20px; }
        table { border-collapse: collapse; width: 100%; margin-top: 10px; }
        table, th, td { border: 1px solid black; }
        th, td { padding: 3px; line-height: 1.2; }
        .header-table { border: none; width: 100%; }
        .header-table td { border: none; }
        .lvhtable { background-color: #004ecc; color: white; font-weight: bold; text-align: center; }
        .title { font-size: 16px; font-weight: bold; text-align: center; }
        .subtitle { font-size: 12px; text-align: center; margin-bottom: 10px; }
        .footer-table { border: none; margin-top: 30px; width: 100%; }
        .footer-table td { border: none; text-align: center; width: 25%; font-size: 12px; }
        @media print {
            .lvhtable { background-color: #004ecc !important; -webkit-print-color-adjust: exact; }
            button { display: none; }
        }
    </style>
</head>
<body>
    <table class="header-table">
        <tr>
            <td width="150" align="center">
                ${logoUrl ? `<img src="${logoUrl}" height="60" />` : ''}
            </td>
            <td align="center">
                <div style="font-size: 14px; font-weight: bold;">CÔNG TY CỔ PHẦN CÔNG NGHỆ ĐẦU TƯ MINH PHƯƠNG</div>
                <div class="title">${title} THÁNG ${month}/${year}</div>
                <div class="subtitle">Ngày bắt đầu: ${dateStart} đến ngày ${dateEnd}</div>
            </td>
            <td width="150"></td>
        </tr>
    </table>

    <table>
        ${headerHtml}
        <tbody>
            ${rowsHtml}
        </tbody>
        <tfoot>
            ${footerHtml}
        </tfoot>
    </table>

    <div style="text-align: right; margin-top: 20px;">
        TP.HCM, ngày ${new Date().getDate()} tháng ${new Date().getMonth() + 1} năm ${new Date().getFullYear()}
    </div>

    <table class="footer-table">
        <tr>
            <td><strong>Người lập biểu</strong></td>
            <td><strong>Trưởng bộ phận</strong></td>
            <td><strong>Kế toán</strong></td>
            <td><strong>Duyệt</strong></td>
        </tr>
        <tr height="80">
            <td></td><td></td><td></td><td></td>
        </tr>
        <tr>
            <td>....................................</td>
            <td>....................................</td>
            <td>....................................</td>
            <td>....................................</td>
        </tr>
    </table>
</body>
</html>
    `;
};

export const generateKPCĐ2PercentHTML = (data, year, logoUrl = '') => {
    const formatNum = (val) => (val ? Math.round(val).toLocaleString() : '-');
    const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
    let rowsHtml = '';
    data.forEach((dept, index) => {
        let deptTotal = 0;
        let monthlyCells = '';
        months.forEach((m) => {
            const val = dept.Monthly[m]?.Totals || 0;
            deptTotal += val;
            monthlyCells += `<td align="right">${formatNum(val)}</td>`;
        });
        rowsHtml += `
            <tr>
                <td align="center">${index + 1}</td>
                <td align="left" style="white-space: nowrap; font-weight: bold;">${dept.DeptName || ''}</td>
                ${monthlyCells}
                <td align="right" style="font-weight: bold;">${formatNum(deptTotal)}</td>
            </tr>
        `;
    });
    let grandTotalCells = '';
    let totalAll = 0;
    months.forEach((m) => {
        let monthTotal = 0;
        data.forEach((dept) => {
            monthTotal += dept.Monthly[m]?.Totals || 0;
        });
        totalAll += monthTotal;
        grandTotalCells += `<td align="right">${formatNum(monthTotal)}</td>`;
    });
    rowsHtml += `
        <tr style="background-color: #f0f5ff; font-weight: bold;">
            <td colspan="2" align="center">TỔNG CỘNG:</td>
            ${grandTotalCells}
            <td align="right">${formatNum(totalAll)}</td>
        </tr>
    `;
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Báo Cáo KPCĐ 2% Năm ${year}</title>
    <style>
        body { font-family: "Times New Roman", Times, serif; font-size: 11px; margin: 20px; }
        table { border-collapse: collapse; width: 100%; margin-top: 10px; }
        table, th, td { border: 1px solid black; }
        th, td { padding: 5px; line-height: 1.2; }
        .lvhtable { background-color: #004ecc; color: white; font-weight: bold; text-align: center; }
        .title { font-size: 16px; font-weight: bold; text-align: center; }
        .header-table { border: none; width: 100%; }
        .header-table td { border: none; }
    </style>
</head>
<body>
    <table class="header-table">
        <tr>
            <td width="150" align="center">
                ${logoUrl ? `<img src="${logoUrl}" height="60" />` : ''}
            </td>
            <td align="center">
                <div style="font-size: 14px; font-weight: bold;">CÔNG TY CỔ PHẦN CÔNG NGHỆ ĐẦU TƯ MINH PHƯƠNG</div>
                <div class="title">BÁO CÁO KINH PHÍ CÔNG ĐOÀN 2% NĂM ${year}</div>
            </td>
            <td width="150"></td>
        </tr>
    </table>
    <table>
        <thead>
            <tr>
                <th class="lvhtable">STT</th>
                <th class="lvhtable">PHÒNG BAN</th>
                ${months.map((m) => `<th class="lvhtable">THÁNG ${parseInt(m)}</th>`).join('')}
                <th class="lvhtable">TỔNG CỘNG</th>
            </tr>
        </thead>
        <tbody>
            ${rowsHtml}
        </tbody>
    </table>
</body>
</html>
    `;
};
