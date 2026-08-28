const stripVietnamese = (value = '') => String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0111/g, 'd')
    .replace(/\u0110/g, 'D');

const normalizeTitleKey = (value = '') => stripVietnamese(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

const repairMojibake = (value = '') => {
    const source = String(value);
    if (!/[ÃÂÄÆáºá»]/.test(source)) return source;
    try {
        return decodeURIComponent(escape(source));
    } catch {
        return source;
    }
};

const TITLE_MAP = {
    'stt': 'STT',
    'so thu tu': 'Số thứ tự',
    'thu tu': 'Thứ tự',
    'ma': 'Mã',
    'ma so': 'Mã số',
    'ma tu dong': 'Mã tự động',
    'ma nv': 'Mã NV',
    'ma nhan vien': 'Mã nhân viên',
    'ten nv': 'Tên NV',
    'ten nhan vien': 'Tên nhân viên',
    'ho va ten': 'Họ và tên',
    'ho ten': 'Họ tên',
    'ten phong ban': 'Tên phòng ban',
    'ma phong ban': 'Mã phòng ban',
    'phong ban': 'Phòng ban',
    'ma cong ty': 'Mã công ty',
    'ten cong ty': 'Tên công ty',
    'cong ty': 'Công ty',
    'ten viet tat': 'Tên viết tắt',
    'ten don vi': 'Tên đơn vị',
    'ma don vi': 'Mã đơn vị',
    'don vi': 'Đơn vị',
    'ngay sinh': 'Ngày sinh',
    'gioi tinh': 'Giới tính',
    'dia chi': 'Địa chỉ',
    'dien thoai': 'Điện thoại',
    'so dien thoai': 'Số điện thoại',
    'email': 'Email',
    'so cmnd': 'Số CMND',
    'so cccd': 'Số CCCD',
    'so cmnd cccd': 'Số CMND/CCCD',
    'cmnd cccd': 'CMND/CCCD',
    'ma so thue': 'Mã số thuế',
    'mst': 'MST',
    'quan he': 'Quan hệ',
    'nguoi lien ket': 'Người liên kết',
    'ten nguoi lien ket': 'Tên người liên kết',
    'nguoi phu thuoc': 'Người phụ thuộc',
    'phu thuoc gia dinh': 'Phụ thuộc gia đình',
    'bat dau giam tru': 'Bắt đầu giảm trừ',
    'ket thuc giam tru': 'Kết thúc giảm trừ',
    'ngay bat dau': 'Ngày bắt đầu',
    'ngay ket thuc': 'Ngày kết thúc',
    'end date': 'Ngày kết thúc',
    'tien te': 'Tiền tệ',
    'currency': 'Tiền tệ',
    'id': 'Mã',
    'code': 'Mã',
    'name': 'Tên',
    'description': 'Mô tả',
    'status': 'Trạng thái',
    'created by': 'Người tạo',
    'created time': 'Ngày giờ tạo',
    'created date': 'Ngày tạo',
    'date': 'Ngày',
    'amount': 'Số tiền',
    'employee code': 'Mã nhân viên',
    'employee name': 'Tên nhân viên',
    'full name': 'Họ và tên',
    'relationship': 'Quan hệ',
    'date of birth': 'Ngày sinh',
    'tax code': 'Mã số thuế',
    'home phone': 'ĐT nhà',
    'company phone': 'ĐT công ty',
    'mobile phone': 'ĐT di động',
    'contact name': 'Tên người liên hệ',
    'review round': 'Vòng đánh giá',
    'fine type': 'Loại phạt',
    'tool code': 'Mã CC',
    'muc giam tru': 'Mức giảm trừ',
    'deduction amount': 'Mức giảm trừ',
    'ghi chu': 'Ghi chú',
    'note': 'Ghi chú',
    'tuoi': 'Tuổi',
    'age': 'Tuổi',
    'trang thai': 'Trạng thái',
    'loai': 'Loại',
    'noi dung': 'Nội dung',
    'so tien': 'Số tiền',
    'ngay': 'Ngày',
    'thang': 'Tháng',
    'nam': 'Năm',
    'nguoi quan ly': 'Người quản lý',
    'duyet tam ung': 'Duyệt tạm ứng',
    'duyet dnvt': 'Duyệt ĐNVT',
    'duyet bao hanh': 'Duyệt bảo hành',
    'quan ly bc cong viec': 'Quản lý BC công việc',
    'fn thang': 'FN tháng',
    'danh sach ca': 'Danh sách ca',
    'tinh com tang ca': 'Tính cơm tăng ca',
    'vuot cong chuan': 'Vượt công chuẩn',
    'hinh thuc tinh cong': 'Hình thức tính công',
    'tang ca tu dong': 'Tăng ca tự động',
    'gio bat dau tang ca': 'Giờ bắt đầu tăng ca',
    'kpi': 'KPI',
    'ma lien ket': 'Mã liên kết',
    'khoa': 'Khóa',
    'da tru': 'Đã trừ',
    'con lai': 'Còn lại',
    'den ngay': 'Đến ngày',
    'tu ngay': 'Từ ngày',
    'so thang': 'Số tháng',
    'tong tien': 'Tổng tiền',
    'so tien thang': 'Số tiền/tháng',
    'khoan luong': 'Khoản lương',
    'duyet': 'Duyệt',
    'ngay tao': 'Ngày tạo',
    'nguoi tao': 'Người tạo',
    'thoi gian phat': 'Thời gian phạt',
    'tien phat': 'Tiền phạt',
    'ma cc': 'Mã CC',
    'dt nha': 'ĐT nhà',
    'dt cong ty': 'ĐT công ty',
    'dt di dong': 'ĐT di động',
    'ten nguoi lien he': 'Tên người liên hệ',
    'he so': 'Hệ số',
    'mo ta': 'Mô tả',
    'ten': 'Tên',
    'tu gio': 'Từ giờ',
    'den gio': 'Đến giờ',
    'gio nghi': 'Giờ nghỉ',
    'gio nghi tu': 'Giờ nghỉ từ',
    'gio nghi den': 'Giờ nghỉ đến',
    'ngay het han': 'Ngày hết hạn',
    'ma bang thue': 'Mã bảng thuế',
    'muc luong tu': 'Mức lương từ',
    'toi muc luong': 'Tới mức lương',
    'ti le': 'Tỉ lệ',
    'ma cham cong': 'Mã chấm công',
    'loai gio': 'Loại giờ',
    'ca tham chieu': 'Ca tham chiếu',
    'ma vong': 'Mã vòng',
    'chu y': 'Chú ý',
    'ma du an': 'Mã dự án',
    'ten du an': 'Tên dự án',
    'so gio lam': 'Số giờ làm',
    'ma ket qua': 'Mã kết quả',
    'so tien tru': 'Số tiền trừ',
    'tinh tru luong': 'Tính trừ lương',
    'ngay nghi': 'Ngày nghỉ',
    'ten tieng viet': 'Tên tiếng Việt',
    'ten tieng anh': 'Tên tiếng Anh',
    'gia tri chuyen doi vnd': 'Giá trị chuyển đổi (VNĐ)',
    'ma quoc gia': 'Mã quốc gia',
    'ten quoc gia': 'Tên quốc gia',
    'duong dan logo': 'Đường dẫn logo',
    'ma cong ty cha': 'Mã công ty cha',
    'cap bac': 'Cấp bậc',
    'tinh bang': 'Tỉnh/Bang',
    'giam doc': 'Giám đốc',
    'ngan hang': 'Ngân hàng',
    'chu tk': 'Chủ TK',
    'ten mau': 'Tên mẫu',
    'ten mau hop dong': 'Tên mẫu hợp đồng',
    'ten mau mua hang': 'Tên mẫu mua hàng',
    'ten mau spec': 'Tên mẫu Spec',
    'ten mau test report': 'Tên mẫu Test Report',
    'du hang': 'Đủ hàng',
    'du ho so': 'Đủ hồ sơ',
    'ten loai san pham': 'Tên loại sản phẩm',
    'phan loai cha': 'Phân loại cha',
};

const FIELD_TITLE_BY_TABLE = {
    cr_lv0278: { lv001: 'Mã', lv002: 'Tên mẫu Test Report', lv004: 'Tên Việt', lv005: 'Tên Anh' },
    cr_lv0319: { lv001: 'Mã', lv002: 'Tên mẫu Spec', lv004: 'Tên Việt', lv005: 'Tên Anh' },
    hr_lv0043: { lv001: 'Mã', lv002: 'Tên mẫu hợp đồng' },
    cr_lv0322: { lv001: 'Mã', lv002: 'Tên mẫu mua hàng', lv004: 'Tên Việt', lv005: 'Tên Anh' },
    cr_lv0328: { lv001: 'Mã', lv002: 'Tên mẫu', lv004: 'Tên Việt', lv005: 'Tên Anh' },
    cr_lv0318: { lv001: 'Mã', lv002: 'Tên mẫu', lv004: 'Tên Việt', lv005: 'Tên Anh' },
    sl_lv0016: { lv001: 'Mã', lv002: 'Tên mẫu', lv004: 'Tên Việt', lv005: 'Tên Anh', lv232: 'Đủ hàng', lv233: 'Đủ hồ sơ' },
    tc_lv0017: { lv001: 'Mã tự động', lv002: 'Mã nhân viên', lv003: 'Lần tính', lv004: 'Loại chi phí', lv005: 'Tiền', lv006: 'Mã tiền tệ', lv007: 'Ghi chú', lv008: 'Khóa', lv009: 'Người tạo' },
    sl_lv0005: { lv001: 'Mã đơn vị', lv002: 'Tên đơn vị', lv003: 'Hệ số' },
    tc_lv0004: { lv001: 'Mã', lv002: 'Tên', lv003: 'Từ giờ', lv004: 'Đến giờ', lv005: 'Giờ nghỉ', lv006: 'Giờ nghỉ từ', lv007: 'Giờ nghỉ đến', lv008: 'Ngày hết hạn' },
    tc_lv0005: { lv001: 'Mã bảng thuế', lv002: 'Mức lương từ', lv003: 'Tới mức lương', lv004: 'Tỉ lệ (%)' },
    tc_lv0045: { lv001: 'Mã', lv002: 'Tên', lv003: 'Mô tả' },
    tc_lv0002: { lv001: 'Mã', lv002: 'Tên', lv003: 'Mô tả', lv004: 'Loại giờ', lv005: 'Ca tham chiếu' },
    hr_lv0003: { lv001: 'Mã vòng', lv002: 'Ngày bắt đầu', lv003: 'Ngày kết thúc', lv004: 'Chú ý' },
    tc_lv0018: { lv001: 'Mã loại', lv002: 'Tên', lv003: 'Mô tả' },
    tc_lv0001: { lv001: 'Mã dự án', lv002: 'Mã phòng ban', lv003: 'Tên dự án', lv004: 'Mô tả', lv005: 'Ngày bắt đầu', lv006: 'Ngày kết thúc', lv007: 'Số giờ làm', lv008: 'Trạng thái', lv009: 'Ngày tạo' },
    hr_lv0035: { lv001: 'Mã kết quả', lv002: 'Mô tả', lv003: 'Số tiền trừ', lv004: 'Từ ngày', lv005: 'Đến ngày', lv006: 'Tính trừ lương' },
    tc_lv0003: { lv001: 'Mã', lv002: 'Ngày nghỉ', lv003: 'Mô tả', lv004: 'Mã chấm công' },
    hr_lv0018: { lv001: 'Mã', lv002: 'Tên tiếng Việt', lv005: 'Tên tiếng Anh', lv003: 'Giá trị chuyển đổi (VNĐ)', lv004: 'Thứ tự', lv006: 'Người tạo', lv007: 'Ngày tạo' },
    hr_lv0014: { lv001: 'Mã quốc gia', lv002: 'Tên quốc gia' },
    hr_lv0002: { lv001: 'Mã phòng ban', lv003: 'Tên phòng ban', lv004: 'Tên viết tắt', lv002: 'Tên công ty', lv006: 'FN tháng', lv005: 'Danh sách ca', lv007: 'Tính cơm tăng ca', lv008: 'Vượt công chuẩn', lv009: 'Hình thức tính công', lv099: 'KPI', lv010: 'Tăng ca tự động', lv011: 'Giờ bắt đầu tăng ca', lv100: 'Người quản lý', lv200: 'Duyệt tạm ứng', lv198: 'Duyệt ĐNVT', lv199: 'Duyệt bảo hành', lv300: 'Quản lý BC công việc', lv103: 'Thứ tự' },
    hr_lv0001: { lv001: 'Mã công ty', lv002: 'Tên công ty', lv003: 'Địa chỉ', lv004: 'Giám đốc', lv005: 'Điện thoại', lv006: 'Fax', lv007: 'Website', lv008: 'Mã số thuế', lv009: 'Đường dẫn logo', lv010: 'Mã công ty cha', lv011: 'Cấp bậc', lv012: 'Tỉnh/Bang', lv013: 'Quốc gia', lv016: 'Trạng thái', lv201: 'TK VCB', lv202: 'Chủ TK VCB', lv203: 'Ngân hàng VCB', lv211: 'TK SacomBank', lv212: 'Chủ TK SacomBank', lv213: 'Ngân hàng SacomBank' },
    hr_lv0042: { lv001: 'STT', lv002: 'Mã NV', lv032: 'Tên nhân viên', lv004: 'Khoản lương', lv005: 'Số tiền/tháng', lv006: 'Đơn vị', lv008: 'Từ ngày', lv009: 'Đến ngày', lv020: 'Số tháng', lv021: 'Tổng tiền', lv022: 'Đã trừ', lv023: 'Còn lại', lv010: 'Ghi chú', lv013: 'Khóa', lv027: 'Duyệt', lv012: 'Mã liên kết' },
    hr_lv0026: { lv001: 'Mã tự động', lv002: 'Mã NV', lv003: 'Tên nhân viên', lv004: 'Họ và tên', lv005: 'Quan hệ', lv006: 'Ngày sinh', lv007: 'Số CMND/CCCD', lv008: 'Mã số thuế', lv009: 'Bắt đầu giảm trừ', lv010: 'Kết thúc giảm trừ', lv011: 'Tiền tệ', lv012: 'Mức giảm trừ', lv013: 'Ghi chú', lv100: 'Người liên kết', lv105: 'Tuổi' },
    hr_lv0036: { lv001: 'Mã tự động', lv002: 'Mã nhân viên', tennv: 'Tên nhân viên', lv003: 'Loại', lv004: 'Nội dung', lv005: 'Ghi chú', lv006: 'Thời gian phạt', lv007: 'Tiền phạt', lv008: 'Khóa', lv009: 'Người tạo', lv010: 'Ngày giờ tạo' },
    hr_lv0020: { lv001: 'Mã nhân viên', lv002: 'Tên nhân viên', lv029: 'Mã phòng ban', lv005: 'Chức vụ', lv007: 'Hình', lv009: 'Trạng thái', lv299: 'KPI', lv030: 'Ngày bắt đầu làm', lv010: 'Mã CMND', lv011: 'Ngày cấp CMND', lv012: 'Nơi cấp', lv013: 'Mã số thuế', lv014: 'Số TK/TT', lv106: 'Chi nhánh NH', lv114: 'Số TK/TT (2)', lv116: 'Chi nhánh NH (2)', lv015: 'Ngày sinh', lv016: 'Nơi sinh', lv017: 'Tình trạng gia đình', lv018: 'Phái', lv019: 'Báo cáo công việc', lv020: 'Số sổ BHXH', lv021: 'Ngày cấp BH', lv022: 'Quốc tịch', lv023: 'Dân tộc', lv024: 'Tôn giáo', lv026: 'Chức danh chuyên môn', lv027: 'Nhóm chấm công', lv028: 'Trình độ văn hóa', lv032: 'Mã tỉnh', lv033: 'Công việc phải làm', lv034: 'Địa chỉ thường trú', lv035: 'Địa chỉ tạm trú', lv036: 'Nghề nghiệp', lv037: 'ĐT nhà', lv038: 'ĐT công ty', lv039: 'ĐT di động', lv040: 'Email công ty', lv041: 'Email khác', lv042: 'Người quản lý', lv043: 'Nơi cấp BHXH', lv044: 'Ngày nghỉ việc', lv045: 'Nguyên quán', lv049: 'Số người phụ thuộc', lv008: 'Thứ hạng tại công ty', lv099: 'Code Machine', lv101: 'Số thẻ', lv060: 'Chức vụ EN BBG', lv061: 'Chức vụ VN BBG', lv062: 'Khu vực dự án', lv063: 'Địa chỉ CMND', lv064: 'Chi nhánh công ty', lv065: 'Ngoại ngữ', lv066: 'Tin học', lv067: 'Chức vụ VN viết tắt', lv102: 'Phép/Năm', lv104: 'Ngày tạo', lv105: 'Người tạo' },
    hr_lv0024: { lv001: 'Mã tự động', lv002: 'Mã NV', lv003: 'Tên người liên hệ', lv004: 'Quan hệ', lv005: 'ĐT nhà', lv006: 'ĐT công ty', lv007: 'ĐT di động' },
    sl_lv0006: { lv001: 'Mã loại', lv002: 'Tên loại sản phẩm', lv003: 'Mô tả', lv004: 'Phân loại cha' },
};

const WORD_MAP = {
    'ma': 'mã',
    'ten': 'tên',
    'viet': 'viết',
    'tat': 'tắt',
    'nhan': 'nhân',
    'vien': 'viên',
    'phong': 'phòng',
    'ban': 'ban',
    'cong': 'công',
    'ty': 'ty',
    'don': 'đơn',
    'vi': 'vị',
    'ngay': 'ngày',
    'sinh': 'sinh',
    'gioi': 'giới',
    'tinh': 'tính',
    'dia': 'địa',
    'chi': 'chỉ',
    'dien': 'điện',
    'thoai': 'thoại',
    'so': 'số',
    'thue': 'thuế',
    'quan': 'quan',
    'he': 'hệ',
    'nguoi': 'người',
    'lien': 'liên',
    'ket': 'kết',
    'phu': 'phụ',
    'thuoc': 'thuộc',
    'gia': 'gia',
    'dinh': 'đình',
    'bat': 'bắt',
    'dau': 'đầu',
    'giam': 'giảm',
    'tru': 'trừ',
    'thuc': 'thức',
    'tien': 'tiền',
    'te': 'tệ',
    'muc': 'mức',
    'ghi': 'ghi',
    'chu': 'chú',
    'tuoi': 'tuổi',
    'trang': 'trạng',
    'thai': 'thái',
    'loai': 'loại',
    'noi': 'nội',
    'dung': 'dung',
    'thang': 'tháng',
    'nam': 'năm',
    'duyet': 'duyệt',
    'tam': 'tạm',
    'ung': 'ứng',
    'bao': 'bảo',
    'hanh': 'hành',
    'ca': 'ca',
    'danh': 'danh',
    'sach': 'sách',
    'hinh': 'hình',
    'com': 'cơm',
    'tang': 'tăng',
    'gio': 'giờ',
    'chuan': 'chuẩn',
    'vuot': 'vượt',
    'quoc': 'quốc',
    'tich': 'tịch',
    'dan': 'dân',
    'toc': 'tộc',
    'ton': 'tôn',
    'giao': 'giáo',
    'mau': 'màu',
    'da': 'da',
    'hon': 'hôn',
    'nghe': 'nghề',
    'van': 'văn',
    'bang': 'bằng',
    'duc': 'dục',
    'chuyen': 'chuyên',
    'mon': 'môn',
    'cap': 'cấp',
    'bac': 'bậc',
    'hoc': 'học',
    'luong': 'lương',
    'khoan': 'khoản',
    'khau': 'khấu',
    'nhap': 'nhập',
    'hoan': 'hoàn',
    'phat': 'phạt',
    'khoa': 'khóa',
    'mo': 'mở',
    'lap': 'lập',
    'tuan': 'tuần',
    'lam': 'làm',
    'viec': 'việc',
};

const applyWordAccents = (title) => {
    const normalized = normalizeTitleKey(title);
    if (!normalized) return title;
    const accented = normalized
        .split(' ')
        .map((word) => WORD_MAP[word] || word.toUpperCase())
        .join(' ');
    return accented.charAt(0).toUpperCase() + accented.slice(1);
};

export const isInvalidColumnTitle = (title) => {
    if (typeof title !== 'string') return false;
    const value = title.trim();
    if (!value) return true;
    if (/^lv\d+$/i.test(value)) return true;
    if (/[?�]/.test(value)) return true;
    return false;
};

export const normalizeVietnameseColumnTitle = (title, context = {}) => {
    const table = context.table || context.prefTable;
    const field = context.key || context.dataIndex;
    const mappedTitle = table && field ? FIELD_TITLE_BY_TABLE[table]?.[field] : null;
    const repairedTitle = typeof title === 'string' ? repairMojibake(title) : title;

    if (mappedTitle && (isInvalidColumnTitle(repairedTitle) || /^lv\d+$/i.test(String(repairedTitle || '').trim()))) {
        return mappedTitle;
    }

    if (typeof repairedTitle !== 'string' || repairedTitle.trim() === '') {
        return mappedTitle || repairedTitle;
    }

    if (!mappedTitle && /[À-ỹĐđ]/.test(repairedTitle) && !isInvalidColumnTitle(repairedTitle)) {
        return repairedTitle;
    }

    const key = normalizeTitleKey(repairedTitle);
    const normalizedTitle = TITLE_MAP[key] || applyWordAccents(repairedTitle);

    if (isInvalidColumnTitle(normalizedTitle)) {
        return mappedTitle || field || normalizedTitle;
    }

    return mappedTitle || normalizedTitle;
};

export const normalizeListJsonColumns = (columns = [], table) => {
    if (!Array.isArray(columns)) return [];
    return columns.map((column) => {
        const key = column?.key || column?.dataIndex;
        const context = { table, key, dataIndex: column?.dataIndex };
        const title = normalizeVietnameseColumnTitle(column?.title, context);
        return {
            ...column,
            title,
            titleText: normalizeVietnameseColumnTitle(column?.titleText || column?.title, context),
        };
    });
};
