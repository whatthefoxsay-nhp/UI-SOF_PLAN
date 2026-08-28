import React, { useState, useEffect, useMemo } from 'react';
import {
    Card,
    Empty,
    Input,
    Button,
    Space,
    Table,
    Tag,
    Tooltip,
    Typography,
    Tabs,
    Descriptions,
    Badge,
} from 'antd';
import dayjs from 'dayjs';
import { 
    Search, 
    RefreshCw, 
    Briefcase, 
    FileText, 
    FileCheck, 
    DollarSign, 
    ShoppingCart, 
    CreditCard, 
    AlertTriangle, 
    Inbox, 
    ExternalLink, 
    ShieldCheck 
} from 'lucide-react';
import styles from '../QuanLyKeHoach.module.css';

const { Text, Title } = Typography;

// ── HELPERS ────────────────────────────────────────────────────────────────
const isEmptyDate = (value) => (
    !value ||
    value === '0000-00-00' ||
    value === '0000-00-00 00:00:00' ||
    value === '1900-01-01' ||
    value === '1900-01-01 00:00:00'
);

const formatDate = (value) => {
    if (isEmptyDate(value)) return '—';
    const parsed = dayjs(value);
    return parsed.isValid() ? parsed.format('DD/MM/YYYY') : String(value);
};

const formatMoney = (value) => {
    const parsed = Number(String(value ?? '').replace(/,/g, ''));
    if (!Number.isFinite(parsed)) return value ?? '—';
    return parsed.toLocaleString('vi-VN') + ' đ';
};

const TRANG_THAI_CHUNG_MAP = {
    '0': { label: 'Chờ duyệt', color: 'warning' },
    '1': { label: 'Đã duyệt/Hoàn tất', color: 'success' },
    '2': { label: 'Hủy/Từ chối', color: 'error' },
};

const renderTrangThaiChung = (val) => {
    const info = TRANG_THAI_CHUNG_MAP[String(val ?? '')];
    return info ? <Tag color={info.color}>{info.label}</Tag> : <Tag>{val ?? '—'}</Tag>;
};

// ── MAIN COMPONENT ──────────────────────────────────────────────────────────
const TongHopTab = ({ detailData, onRefresh }) => {
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [activeSubTab, setActiveSubTab] = useState('0');

    const handleRefresh = async () => {
        setLoading(true);
        if (onRefresh) {
            await onRefresh();
        }
        setLoading(false);
    };

    // ── DATA SOURCES FROM DETAIL_DATA ─────────────────────────────────────────
    const planInfo = detailData?.plan ?? {};
    const tabData = detailData?.tabs ?? {};

    const tasksData = tabData.tasks ?? [];
    const quotesData = tabData.quotes ?? [];
    const contractsData = tabData.contracts ?? [];
    const receiptsData = tabData.receipts ?? [];
    const purchaseData = tabData.purchase ?? [];
    const paymentsData = tabData.payments ?? [];
    const alertsData = tabData.alerts ?? [];
    const inStockData = tabData.inStock ?? [];
    const outStockData = tabData.outStock ?? [];
    const warrantyData = tabData.warrantySale ?? [];
    const summaryItemsRaw = tabData.summaryItems ?? [];

    const summaryRows = useMemo(() => {
        const summaryRow = summaryItemsRaw[0];
        if (!summaryRow) return [];

        const rows = [];
        // Project main row
        rows.push({
            key: 'project_main',
            row_type: 'project',
            stt: 1,
            ten_sale: summaryRow.ten_sale || '—',
            ten_ttt: summaryRow.ten_ttt || '—',
            ten_ad: summaryRow.ten_ad || '—',
            ten_du_an: summaryRow.ten_du_an || '—',
            dia_chi: summaryRow.dia_chi || '—',
            loai_hinh: summaryRow.loai_hinh || '—',
            doi_tuong_kh: summaryRow.doi_tuong_kh || '—',
            thong_tin_lien_he: summaryRow.thong_tin_lien_he || '—',
            tien_do: summaryRow.tien_do || '—',
            tinh_trang: summaryRow.tinh_trang || '—',
            pt_trung_thau: summaryRow.pt_trung_thau ?? '0.00',
            tg_cap_hang: summaryRow.tg_cap_hang,
            tg_hoan_thanh: summaryRow.tg_hoan_thanh,
            gia_du_toan: summaryRow.gia_du_toan || 0,
            gia_ban: summaryRow.gia_ban || 0,
            thuong_hieu: summaryRow.thuong_hieu || '—',
            so_bbg: summaryRow.so_bbg || '—',
            so_pbh: summaryRow.so_pbh || '—',
            nhat_ky: '',
            ghi_chu: ''
        });

        // Loop over the 12 groups
        const groups = summaryRow.contacts_by_group || [];
        groups.forEach((group) => {
            const groupCode = group.group_code;
            const groupName = group.group_name;
            const contacts = group.contacts || [];

            if (contacts.length === 0) {
                // Group Header row with empty contact
                rows.push({
                    key: `group_header_${group.group_id}`,
                    row_type: 'contact_group_header',
                    doi_tuong_kh: `${groupCode}. ${groupName}`,
                    thong_tin_lien_he: ''
                });
                rows.push({
                    key: `group_empty_${group.group_id}`,
                    row_type: 'contact_detail',
                    doi_tuong_kh: `${groupCode}.1 Thông tin người liên hệ 1: Họ tên, chức vụ, sđt, email`,
                    thong_tin_lien_he: '',
                    nhat_ky: ''
                });
            } else {
                // Group Header row
                const firstContact = contacts[0];
                rows.push({
                    key: `group_header_${group.group_id}`,
                    row_type: 'contact_group_header',
                    doi_tuong_kh: `${groupCode}. ${groupName}`,
                    thong_tin_lien_he: firstContact.company_name || ''
                });

                // Add contact detail rows
                contacts.forEach((contact, idx) => {
                    rows.push({
                        key: `contact_detail_${contact.contact_id}`,
                        row_type: 'contact_detail',
                        doi_tuong_kh: `${groupCode}.${idx + 1} Thông tin người liên hệ ${idx + 1}: Họ tên, chức vụ, sđt, email`,
                        thong_tin_lien_he: contact.contact_info_text || '',
                        nhat_ky: contact.diary_logs || ''
                    });
                });
            }
        });

        return rows;
    }, [summaryItemsRaw]);

    // ── DEFINE COLUMNS FOR TABS ──────────────────────────────────────────────

    // 1. Công việc (Tasks)
    const taskColumns = [
        { title: 'STT', key: 'stt', width: 60, align: 'center', render: (_, __, idx) => idx + 1 },
        { title: 'Mã công việc', dataIndex: 'lv001', key: 'lv001', width: 130, render: (val) => <Text strong style={{ color: '#1677ff' }}>{val}</Text> },
        { title: 'Tên công việc', dataIndex: 'lv004', key: 'lv004', ellipsis: true, width: 250, render: (val) => <Tooltip title={val}><span>{val || '—'}</span></Tooltip> },
        { title: 'Ngày bắt đầu', dataIndex: 'lv005', key: 'lv005', width: 120, render: formatDate },
        { title: 'Ngày hoàn thành', dataIndex: 'lv101', key: 'lv101', width: 120, render: formatDate },
        { title: 'Người xử lý', dataIndex: 'handler_name', key: 'handler_name', width: 160, render: (val, r) => val || r.lv006 || '—' },
        { title: 'Người tạo', dataIndex: 'lv008', key: 'lv008', width: 120 },
        { title: 'Trạng thái', dataIndex: 'lv009', key: 'lv009', width: 120, align: 'center', render: renderTrangThaiChung }
    ];

    // 0. Tổng hợp dự án (Summary)
    const summaryColumns = [
        { title: 'STT', dataIndex: 'stt', key: 'stt', width: 60, align: 'center', render: (val, r) => r.row_type === 'project' ? val : '' },
        { title: 'Sale', dataIndex: 'ten_sale', key: 'ten_sale', width: 120, render: (val, r) => r.row_type === 'project' ? val : '' },
        { title: 'P.TTT', dataIndex: 'ten_ttt', key: 'ten_ttt', width: 100, render: (val, r) => r.row_type === 'project' ? val : '' },
        { title: 'AD', dataIndex: 'ten_ad', key: 'ten_ad', width: 120, render: (val, r) => r.row_type === 'project' ? val : '' },
        { title: 'Tên dự án', dataIndex: 'ten_du_an', key: 'ten_du_an', width: 200, render: (val, r) => r.row_type === 'project' ? <Text strong>{val}</Text> : '' },
        { title: 'Địa chỉ dự án', dataIndex: 'dia_chi', key: 'dia_chi', width: 200, render: (val, r) => r.row_type === 'project' ? val : '' },
        { title: 'Loại hình dự án', dataIndex: 'loai_hinh', key: 'loai_hinh', width: 150, render: (val, r) => r.row_type === 'project' ? val : '' },
        { 
            title: 'Đối tượng khách hàng', 
            dataIndex: 'doi_tuong_kh', 
            key: 'doi_tuong_kh', 
            width: 300,
            render: (val, r) => {
                if (r.row_type === 'project') return <Text strong>{val || '—'}</Text>;
                if (r.row_type === 'contact_group_header') return <Text strong>{val}</Text>;
                return <span style={{ fontStyle: 'italic' }}>{val}</span>;
            }
        },
        { 
            title: 'Thông tin liên hệ', 
            dataIndex: 'thong_tin_lien_he', 
            key: 'thong_tin_lien_he', 
            width: 250,
            render: (val, r) => {
                if (r.row_type === 'project') return <Text strong>{val || '—'}</Text>;
                if (r.row_type === 'contact_group_header') return <Text strong>{val}</Text>;
                return <span style={{ fontStyle: 'italic' }}>{val}</span>;
            }
        },
        { title: 'Tiến độ dự án', dataIndex: 'tien_do', key: 'tien_do', width: 150, render: (val, r) => r.row_type === 'project' ? val : '' },
        { title: 'Tình trạng dự án', dataIndex: 'tinh_trang', key: 'tinh_trang', width: 150, render: (val, r) => r.row_type === 'project' ? val : '' },
        { title: '% trúng thầu', dataIndex: 'pt_trung_thau', key: 'pt_trung_thau', width: 100, align: 'center', render: (val, r) => r.row_type === 'project' ? (val ? `${val}%` : '0%') : '' },
        { title: 'Thời gian cấp hàng', dataIndex: 'tg_cap_hang', key: 'tg_cap_hang', width: 130, render: (val, r) => r.row_type === 'project' ? formatDate(val) : '' },
        { title: 'Thời gian hoàn thành', dataIndex: 'tg_hoan_thanh', key: 'tg_hoan_thanh', width: 130, render: (val, r) => r.row_type === 'project' ? formatDate(val) : '' },
        { title: 'Tổng giá dự toán', dataIndex: 'gia_du_toan', key: 'gia_du_toan', width: 150, align: 'right', render: (val, r) => r.row_type === 'project' ? formatMoney(val) : '' },
        { title: 'Tổng giá bán dự kiến', dataIndex: 'gia_ban', key: 'gia_ban', width: 150, align: 'right', render: (val, r) => r.row_type === 'project' ? formatMoney(val) : '' },
        { title: 'Thương hiệu', dataIndex: 'thuong_hieu', key: 'thuong_hieu', width: 130, render: (val, r) => r.row_type === 'project' ? val : '' },
        { title: 'Số Báo giá', dataIndex: 'so_bbg', key: 'so_bbg', width: 150, render: (val, r) => r.row_type === 'project' ? val : '' },
        { title: 'PBH', dataIndex: 'so_pbh', key: 'so_pbh', width: 150, render: (val, r) => r.row_type === 'project' ? val : '' },
        { 
            title: 'Nhật ký làm việc', 
            dataIndex: 'nhat_ky', 
            key: 'nhat_ky', 
            width: 350,
            render: (val, r) => {
                if (r.row_type === 'contact_detail' && val) {
                    return <div dangerouslySetInnerHTML={{ __html: val }} />;
                }
                return '';
            }
        },
        { title: 'Ghi chú', dataIndex: 'ghi_chu', key: 'ghi_chu', width: 150, render: (val, r) => r.row_type === 'project' ? val : '' }
    ];

    // 2. Báo giá (Quotes)
    const quoteColumns = [
        { title: 'STT', key: 'stt', width: 60, align: 'center', render: (_, __, idx) => idx + 1 },
        { title: 'Mã báo giá', dataIndex: 'lv001', key: 'lv001', width: 130, render: (val) => <Text strong style={{ color: '#1677ff' }}>{val}</Text> },
        { title: 'Khách hàng', dataIndex: 'lv002', key: 'lv002', width: 130 },
        { title: 'Tên / Nội dung báo giá', dataIndex: 'lv004', key: 'lv004', ellipsis: true, width: 250, render: (val) => <Tooltip title={val}><span>{val || '—'}</span></Tooltip> },
        { title: 'Ngày tạo', dataIndex: 'lv005', key: 'lv005', width: 120, render: formatDate },
        { title: 'Tổng tiền', dataIndex: 'lv012', key: 'lv012', width: 160, align: 'right', render: formatMoney },
        { title: 'Trạng thái', dataIndex: 'lv016', key: 'lv016', width: 120, align: 'center', render: renderTrangThaiChung },
        { title: 'Mô tả', dataIndex: 'lv003', key: 'lv003', ellipsis: true, width: 200, render: (val) => <Tooltip title={val}><span>{val || '—'}</span></Tooltip> }
    ];

    // 3. Bán hàng (Contracts)
    const contractColumns = [
        { title: 'STT', key: 'stt', width: 60, align: 'center', render: (_, __, idx) => idx + 1 },
        { title: 'Mã phiếu', dataIndex: 'lv001', key: 'lv001', width: 120, render: (val) => <Text strong style={{ color: '#1677ff' }}>{val}</Text> },
        { title: 'Công việc', dataIndex: 'job_name', key: 'job_name', width: 200, ellipsis: true, render: (val, record) => <Tooltip title={val}><span>{val || record.lv114 || '—'}</span></Tooltip> },
        { title: 'PBH Số', dataIndex: 'lv115', key: 'lv115', width: 140 },
        { title: 'HĐKT Số', dataIndex: 'lv014', key: 'lv014', width: 140 },
        { title: 'PLHĐKT', dataIndex: 'lv225', key: 'lv225', width: 110 },
        { title: 'PO Số', dataIndex: 'lv214', key: 'lv214', width: 110 },
        { title: 'Tên hợp đồng', dataIndex: 'lv003', key: 'lv003', ellipsis: true, width: 250, render: (val) => <Tooltip title={val}><span>{val || '—'}</span></Tooltip> },
        { title: 'Khách hàng', dataIndex: 'customer_name', key: 'customer_name', width: 180, ellipsis: true, render: (val, record) => val || record.lv002 || '—' },
        { title: 'Ngày bán hàng', dataIndex: 'lv004', key: 'lv004', width: 120, render: formatDate },
        { title: 'Giá trị', dataIndex: 'contract_amount', key: 'contract_amount', width: 150, align: 'right', render: formatMoney },
        { title: 'Trạng thái', dataIndex: 'lv011', key: 'lv011', width: 120, align: 'center', render: renderTrangThaiChung }
    ];

    // 4. Thu tiền (Receipts)
    const receiptColumns = [
        { title: 'STT', key: 'stt', width: 60, align: 'center', render: (_, __, idx) => idx + 1 },
        { title: 'Mã phiếu thu', dataIndex: 'lv001', key: 'lv001', width: 130, render: (val) => <Text strong style={{ color: '#1677ff' }}>{val}</Text> },
        { title: 'Loại thu', dataIndex: 'lv003', key: 'lv003', width: 120 },
        { title: 'Nội dung thu', dataIndex: 'lv004', key: 'lv004', ellipsis: true, width: 250, render: (val) => <Tooltip title={val}><span>{val || '—'}</span></Tooltip> },
        { title: 'Ngày thu', dataIndex: 'lv005', key: 'lv005', width: 120, render: formatDate },
        { title: 'Số tiền thu', dataIndex: 'lv006', key: 'lv006', width: 160, align: 'right', render: formatMoney },
        { title: 'Trạng thái', dataIndex: 'lv016', key: 'lv016', width: 120, align: 'center', render: renderTrangThaiChung }
    ];

    // 5. Mua hàng (Purchase)
    const purchaseColumns = [
        { title: 'STT', key: 'stt', width: 60, align: 'center', render: (_, __, idx) => idx + 1 },
        { title: 'Mã PO', dataIndex: 'lv001', key: 'lv001', width: 130, render: (val) => <Text strong style={{ color: '#1677ff' }}>{val}</Text> },
        { title: 'Ngày lập', dataIndex: 'lv003', key: 'lv003', width: 120, render: formatDate },
        { title: 'Nhà cung cấp', dataIndex: 'lv004', key: 'lv004', width: 220, ellipsis: true },
        { title: 'Mô tả', dataIndex: 'lv005', key: 'lv005', ellipsis: true, width: 250, render: (val) => <Tooltip title={val}><span>{val || '—'}</span></Tooltip> },
        { title: 'Số lượng', dataIndex: 'lv006', key: 'lv006', width: 100, align: 'right', render: (val) => Number(val ?? 0).toLocaleString('vi-VN') },
        { title: 'Tổng tiền', dataIndex: 'lv012', key: 'lv012', width: 160, align: 'right', render: formatMoney },
        { title: 'Trạng thái', dataIndex: 'lv016', key: 'lv016', width: 120, align: 'center', render: renderTrangThaiChung }
    ];

    // 6. Chi tiền (Payments)
    const paymentColumns = [
        { title: 'STT', key: 'stt', width: 60, align: 'center', render: (_, __, idx) => idx + 1 },
        { title: 'Mã phiếu chi', dataIndex: 'lv001', key: 'lv001', width: 130, render: (val) => <Text strong style={{ color: '#1677ff' }}>{val}</Text> },
        { title: 'Loại chi', dataIndex: 'lv003', key: 'lv003', width: 120 },
        { title: 'Nội dung chi', dataIndex: 'lv004', key: 'lv004', ellipsis: true, width: 250, render: (val) => <Tooltip title={val}><span>{val || '—'}</span></Tooltip> },
        { title: 'Ngày chi', dataIndex: 'lv005', key: 'lv005', width: 120, render: formatDate },
        { title: 'Số tiền chi', dataIndex: 'lv006', key: 'lv006', width: 160, align: 'right', render: formatMoney },
        { title: 'Trạng thái', dataIndex: 'lv016', key: 'lv016', width: 120, align: 'center', render: renderTrangThaiChung }
    ];

    // 7. Cảnh báo (Alerts)
    const alertColumns = [
        { title: 'STT', key: 'stt', width: 60, align: 'center', render: (_, __, idx) => idx + 1 },
        { title: 'Mã cảnh báo', dataIndex: 'lv001', key: 'lv001', width: 120, render: (val) => <Text strong style={{ color: '#1677ff' }}>{val}</Text> },
        { title: 'Loại cảnh báo', dataIndex: 'ten_loai_canh_bao', key: 'ten_loai_canh_bao', width: 180, ellipsis: true, render: (val, r) => val || r.lv004_label || '—' },
        { title: 'Nội dung', dataIndex: 'lv011', key: 'lv011', ellipsis: true, width: 250, render: (val) => <Tooltip title={val}><span>{val || '—'}</span></Tooltip> },
        { title: 'Ngày cảnh báo', dataIndex: 'lv006', key: 'lv006', width: 120, render: formatDate },
        { title: 'Người tiếp nhận', dataIndex: 'ten_nguoi_tiep_nhan', key: 'ten_nguoi_tiep_nhan', width: 160, render: (val, r) => val || r.lv013_label || '—' },
        { title: 'Trạng thái', dataIndex: 'lv009', key: 'lv009', width: 120, align: 'center', render: renderTrangThaiChung }
    ];

    // 8. Nhập kho (InStock)
    const inStockColumns = [
        { title: 'STT', key: 'stt', width: 60, align: 'center', render: (_, __, idx) => idx + 1 },
        { title: 'Mã phiếu NK', dataIndex: 'lv001', key: 'lv001', width: 130, render: (val) => <Text strong style={{ color: '#1677ff' }}>{val}</Text> },
        { title: 'Mã hàng hóa', dataIndex: 'lv003', key: 'lv003', width: 120 },
        { title: 'Tên hàng / Mô tả', dataIndex: 'lv004', key: 'lv004', ellipsis: true, width: 250, render: (val) => <Tooltip title={val}><span>{val || '—'}</span></Tooltip> },
        { title: 'Ngày nhập', dataIndex: 'lv005', key: 'lv005', width: 120, render: formatDate },
        { title: 'Số lượng', dataIndex: 'lv006', key: 'lv006', width: 110, align: 'right', render: (val) => Number(val ?? 0).toLocaleString('vi-VN') },
        { title: 'Tổng tiền', dataIndex: 'lv012', key: 'lv012', width: 150, align: 'right', render: formatMoney },
        { title: 'Trạng thái', dataIndex: 'lv016', key: 'lv016', width: 120, align: 'center', render: renderTrangThaiChung }
    ];

    // 9. Xuất kho (OutStock)
    const outStockColumns = [
        { title: 'STT', key: 'stt', width: 60, align: 'center', render: (_, __, idx) => idx + 1 },
        { title: 'Mã phiếu XK', dataIndex: 'lv001', key: 'lv001', width: 130, render: (val) => <Text strong style={{ color: '#1677ff' }}>{val}</Text> },
        { title: 'Mã hàng hóa', dataIndex: 'lv003', key: 'lv003', width: 120 },
        { title: 'Tên hàng / Mô tả', dataIndex: 'lv004', key: 'lv004', ellipsis: true, width: 250, render: (val) => <Tooltip title={val}><span>{val || '—'}</span></Tooltip> },
        { title: 'Ngày xuất', dataIndex: 'lv005', key: 'lv005', width: 120, render: formatDate },
        { title: 'Số lượng xuất', dataIndex: 'lv006', key: 'lv006', width: 120, align: 'right', render: (val) => Number(val ?? 0).toLocaleString('vi-VN') },
        { title: 'Tổng tiền', dataIndex: 'lv012', key: 'lv012', width: 150, align: 'right', render: formatMoney },
        { title: 'Trạng thái', dataIndex: 'lv016', key: 'lv016', width: 120, align: 'center', render: renderTrangThaiChung }
    ];

    // 10. Bảo hành (Warranty)
    const warrantyColumns = [
        { title: 'STT', key: 'stt', width: 60, align: 'center', render: (_, __, idx) => idx + 1 },
        { title: 'Mã bảo hành', dataIndex: 'lv001', key: 'lv001', width: 130, render: (val) => <Text strong style={{ color: '#1677ff' }}>{val}</Text> },
        { title: 'Số PBH', dataIndex: 'lv115', key: 'lv115', width: 140 },
        { title: 'Nội dung', dataIndex: 'lv004', key: 'lv004', ellipsis: true, width: 250, render: (val) => <Tooltip title={val}><span>{val || '—'}</span></Tooltip> },
        { title: 'Ngày lập', dataIndex: 'lv009', key: 'lv009', width: 120, render: formatDate },
        { title: 'Thời hạn BH', dataIndex: 'lv012', key: 'lv012', width: 120 },
        { title: 'Khách hàng', dataIndex: 'lv803', key: 'lv803', width: 180, ellipsis: true },
        { title: 'Trạng thái', dataIndex: 'lv011', key: 'lv011', width: 120, align: 'center', render: renderTrangThaiChung }
    ];

    // ── SUB-TABS DATA & CONFIG MAP ──────────────────────────────────────────
    const subTabConfigs = useMemo(() => ({
        '0': { label: 'Công việc', data: summaryRows, columns: summaryColumns, emptyText: 'Không có dữ liệu tổng hợp' },
        '1': { label: 'Báo giá', data: quotesData, columns: quoteColumns, emptyText: 'Không có dữ liệu báo giá' },
        '2': { label: 'Bán hàng', data: contractsData, columns: contractColumns, emptyText: 'Không có dữ liệu bán hàng' },
        '3': { label: 'Thu tiền', data: receiptsData, columns: receiptColumns, emptyText: 'Không có dữ liệu thu tiền' },
        '4': { label: 'Mua hàng', data: purchaseData, columns: purchaseColumns, emptyText: 'Không có dữ liệu mua hàng' },
        '5': { label: 'Chi tiền', data: paymentsData, columns: paymentColumns, emptyText: 'Không có dữ liệu chi tiền' },
        '6': { label: 'Cảnh báo', data: alertsData, columns: alertColumns, emptyText: 'Không có dữ liệu cảnh báo' },
        '7': { label: 'Nhập kho', data: inStockData, columns: inStockColumns, emptyText: 'Không có dữ liệu nhập kho' },
        '8': { label: 'Xuất kho', data: outStockData, columns: outStockColumns, emptyText: 'Không có dữ liệu xuất kho' },
        '9': { label: 'Bảo hành', data: warrantyData, columns: warrantyColumns, emptyText: 'Không có dữ liệu bảo hành' },
    }), [summaryRows, summaryColumns, quotesData, contractsData, receiptsData, purchaseData, paymentsData, alertsData, inStockData, outStockData, warrantyData]);

    const activeConfig = subTabConfigs[activeSubTab] ?? subTabConfigs['0'];
    const activeRawRows = activeConfig.data;

    // ── FILTER ROWS ─────────────────────────────────────────────────────────
    const filteredRows = useMemo(() => {
        const kw = searchText.trim().toLowerCase();
        if (!kw) return activeRawRows.map((r, i) => ({ ...r, key: r.lv001 ?? i }));
        return activeRawRows
            .filter((r) => Object.values(r || {}).some((v) => String(v ?? '').toLowerCase().includes(kw)))
            .map((r, i) => ({ ...r, key: r.lv001 ?? i }));
    }, [activeRawRows, searchText]);

    // ── TAB ITEMS FOR TABS COMPONENT ─────────────────────────────────────────
    const tabItems = Object.entries(subTabConfigs).map(([key, config]) => {
        let count = config.data.length;
        // Icon map
        let Icon = Briefcase;
        if (key === '1') Icon = FileText;
        if (key === '2') Icon = FileCheck;
        if (key === '3') Icon = DollarSign;
        if (key === '4') Icon = ShoppingCart;
        if (key === '5') Icon = CreditCard;
        if (key === '6') Icon = AlertTriangle;
        if (key === '7') Icon = Inbox;
        if (key === '8') Icon = ExternalLink;
        if (key === '9') Icon = ShieldCheck;

        return {
            key,
            label: (
                <Space size={6}>
                    <Icon size={14} />
                    <span>{config.label}</span>
                    <Badge count={count} size="small" offset={[2, -2]} style={{ backgroundColor: '#1677ff' }} />
                </Space>
            ),
        };
    });

    return (
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
            
            {/* OVERVIEW PANEL - DISPLAYED IN TAB 0 (CONG VIEC / DU AN) */}
            {/* {activeSubTab === '0' && planInfo.lv001 && (
                <Card 
                    title={<Title level={5} style={{ margin: 0 }}>Thông tin tổng quan dự án #{planInfo.lv001}</Title>} 
                    bordered={false} 
                    className={styles.infoCard}
                    size="small"
                >
                    <Descriptions bordered size="small" column={{ xxl: 4, xl: 3, md: 2, sm: 1 }}>
                        <Descriptions.Item label="Tên dự án/kế hoạch" span={2}>
                            <Text strong>{planInfo.lv002 || '—'}</Text>
                        </Descriptions.Item>
                        <Descriptions.Item label="Thương hiệu">
                            {planInfo.lv082 || '—'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Khu vực">
                            {planInfo.lv085 || '—'}
                        </Descriptions.Item>

                        <Descriptions.Item label="Kinh doanh (Sale)">
                            {planInfo.ten_sale || planInfo.lv079 || '—'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Phòng TTT">
                            {planInfo.lv080 || '—'}
                        </Descriptions.Item>
                        <Descriptions.Item label="AD">
                            {planInfo.lv081 || '—'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Người tạo">
                            {planInfo.ten_nguoi_tao || planInfo.lv004 || '—'}
                        </Descriptions.Item>

                        <Descriptions.Item label="Loại hình">
                            {planInfo.lv084 || '—'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Địa chỉ dự án" span={2}>
                            {planInfo.lv083 || '—'}
                        </Descriptions.Item>
                        <Descriptions.Item label="% trúng thầu">
                            {planInfo.lv073 ? <Tag color="blue">{planInfo.lv073}%</Tag> : '—'}
                        </Descriptions.Item>

                        <Descriptions.Item label="Tiến độ">
                            {planInfo.lv008 || '—'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Trạng thái">
                            {planInfo.lv100 || '—'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Ngày dự kiến cấp">
                            {formatDate(planInfo.lv074)}
                        </Descriptions.Item>
                        <Descriptions.Item label="Ngày hoàn thành">
                            {formatDate(planInfo.lv101)}
                        </Descriptions.Item>

                        <Descriptions.Item label="Doanh số dự kiến" span={4}>
                            <Descriptions bordered size="small" column={4}>
                                <Descriptions.Item label="Tổng giá dự toán">
                                    <Text type="danger" strong>{formatMoney(planInfo.lv075)}</Text>
                                </Descriptions.Item>
                                <Descriptions.Item label="Tổng giá bán dự kiến" span={3}>
                                    <Text type="success" strong>{formatMoney(planInfo.lv102)}</Text>
                                </Descriptions.Item>
                            </Descriptions>
                        </Descriptions.Item>
                    </Descriptions>
                </Card>
            )} */}

            {/* TABS SELECTOR & SEARCH TOOLBAR */}
            <div className={styles.toolbarRow} style={{ paddingBottom: 0 }}>
                <Space wrap style={{ width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Tabs 
                        activeKey={activeSubTab} 
                        onChange={setActiveSubTab} 
                        items={tabItems} 
                        style={{ marginBottom: -16 }}
                    />
                    <Space wrap>
                        <Input
                            allowClear
                            prefix={<Search size={15} />}
                            placeholder={`Tìm trong ${activeConfig.label}...`}
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            style={{ width: 260 }}
                        />
                        <Button icon={<RefreshCw size={16} />} onClick={handleRefresh} loading={loading}>
                            Tải lại
                        </Button>
                    </Space>
                </Space>
            </div>

            {/* DATA TABLE */}
            <Table
                className={styles.mainTable}
                columns={activeConfig.columns}
                dataSource={filteredRows}
                loading={loading}
                size="small"
                bordered
                pagination={{ pageSize: 30, showSizeChanger: true, showTotal: (t) => `Tổng: ${t} dòng` }}
                scroll={{ x: Math.max(1200, activeConfig.columns.length * 140) }}
                onRow={(record) => {
                    if (activeSubTab === '0') {
                        if (record.row_type === 'project') {
                            return { style: { backgroundColor: '#fdf6e2' } };
                        }
                        if (record.row_type === 'contact_group_header') {
                            return { style: { backgroundColor: '#f5f5f5' } };
                        }
                    }
                    return {};
                }}
                locale={{
                    emptyText: (
                        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={activeConfig.emptyText} />
                    ),
                }}
            />
        </Space>
    );
};

export default TongHopTab;
