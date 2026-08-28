import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Breadcrumb,
    Button,
    Card,
    Col,
    Descriptions,
    Result,
    Row,
    Skeleton,
    Space,
    Statistic,
    Tabs,
    Tag,    
    Tooltip,
    Typography,
    message,
} from 'antd';

import {
    ArrowLeft,
    Bell,
    Briefcase,
    CalendarDays,
    CheckCircle,
    Coins,
    FileText,
    FolderKanban,
    ListTodo,
    RefreshCw,
    ShieldCheck,
    ShoppingCart,
    UserRound,
    Warehouse,
} from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { execCRUD } from '../../services/apiServices';
import TongHopTab from './tabs/TongHopTab';
import XemTongCVTab from './tabs/XemTongCVTab';
import KanbanTab from './tabs/KanbanTab';
import NhapCongViecTab from './tabs/NhapCongViecTab';
import GiaoViecTab from './tabs/GiaoViecTab';
import TienDoTab from './tabs/TienDoTab';
import DSSaleThamGiaTab from './tabs/DSSaleThamGiaTab';
import DSNhanVienThamGiaTab from './tabs/DSNhanVienThamGiaTab';
import ThongTinLienHeTab from './tabs/ThongTinLienHeTab';
import BaoGiaTab from './tabs/BaoGiaTab';
import HopDongTab from './tabs/HopDongTab';
import DeNghiVatTuTab from './tabs/DeNghiVatTuTab';
import MuaHangTab from './tabs/MuaHangTab';
import ThuTienTab from './tabs/ThuTienTab';
import DeNghiChiTienTab from './tabs/DeNghiChiTienTab';
import ChiTienTab from './tabs/ChiTienTab';
import NhapKhoTab from './tabs/NhapKhoTab';
import XuatKhoTab from './tabs/XuatKhoTab';
import BaoHanhPBHTab from './tabs/BaoHanhPBHTab';
import CanhBaoTab from './tabs/CanhBaoTab';
import ThemIconTab from './tabs/ThemIconTab';
import styles from './QuanLyKeHoach.module.css';

const { Text, Title } = Typography;

// Helper to decode double-encoded UTF-8 (Mojibake) back to standard Vietnamese UTF-8
export const decodeMojibake = (str) => {
    if (!str || typeof str !== 'string') return str;
    const hasMojibakeMarkers = /[\u00c3\u00c2]|\u00e1[\u00ba\u00bb]|\u00c4[\u0090\u0091]/.test(str);
    if (!hasMojibakeMarkers) return str;
    const unicodeMap = {
        0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84, 0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87,
        0x02c6: 0x88, 0x2030: 0x89, 0x0160: 0x8a, 0x2039: 0x8b, 0x0152: 0x8c, 0x017d: 0x8e,
        0x2018: 0x91, 0x2019: 0x92, 0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
        0x02dc: 0x98, 0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b, 0x0153: 0x9c, 0x017e: 0x9e, 0x0178: 0x9f
    };
    try {
        const bytes = [];
        for (let i = 0; i < str.length; i++) {
            const code = str.charCodeAt(i);
            if (code < 256) {
                bytes.push(code);
            } else if (unicodeMap[code] !== undefined) {
                bytes.push(unicodeMap[code]);
            } else {
                bytes.push(code & 0xFF);
            }
        }
        return new TextDecoder('utf-8').decode(new Uint8Array(bytes));
    } catch (e) {
        return str;
    }
};

// Recursively decode all strings in an object or array
export const decodeStrings = (obj) => {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'string') {
        return decodeMojibake(obj);
    }
    if (Array.isArray(obj)) {
        return obj.map(decodeStrings);
    }
    if (typeof obj === 'object') {
        const result = {};
        for (const [key, value] of Object.entries(obj)) {
            result[key] = decodeStrings(value);
        }
        return result;
    }
    return obj;
};

export const normalizeRows = (value) => {
    if (Array.isArray(value)) return value;
    if (Array.isArray(value?.rows)) return value.rows;
    if (Array.isArray(value?.data)) return value.data;
    if (Array.isArray(value?.items)) return value.items;
    return [];
};

export const getTabRows = (detailData, tabKey, sourceKey = tabKey) => {
    const tabs = detailData?.tabs || {};
    return normalizeRows(tabs[sourceKey] ?? detailData?.[sourceKey] ?? detailData?.[tabKey]);
};

const LEGACY_TABS = [
    { key: 'summaryItems', legacyValue: 0, label: 'Tổng hợp', icon: FolderKanban, oldModule: 'cr_lv0145/cr_lv0145.php' },
    { key: 'kanban', legacyValue: 22, label: 'Bảng công việc Kanban', icon: FolderKanban, oldModule: 'cr_lv0094/kanban_loader.php', sourceKey: 'tasks', readOnly: true },
    { key: 'workloadMore', legacyValue: 21, label: 'Xem tổng CV', icon: CheckCircle, oldModule: 'cr_lv0025/cr_lv0025-21.php' },
    { key: 'tasks', legacyValue: 1, label: 'Nhập công việc', icon: ListTodo, oldModule: 'cr_lv0092/cr_lv0092-1.php' },
    { key: 'assignment', legacyValue: 12, label: 'Giao việc', icon: ListTodo, oldModule: 'cr_lv0005/cr_lv0005_12.php', sourceKey: 'tasks' },
    { key: 'progress', legacyValue: 33, label: 'Tiến độ & DS dự kiến', icon: FileText, oldModule: 'cr_lv0409/cr_lv0409.php' },
    { key: 'saleShares', legacyValue: 34, label: 'DS sale tham gia', icon: Briefcase, oldModule: 'cr_lv0414/cr_lv0414.php' },
    { key: 'participantStaff', legacyValue: 35, label: 'DS nhân viên tham gia', icon: Briefcase, oldModule: 'da_lh0014/da_lh0014.php' },
    { key: 'contacts', legacyValue: 13, label: 'Thông tin liên hệ', icon: Bell, oldModule: 'cr_lv0129/cr_lv0129.php' },
    { key: 'quotes', legacyValue: 2, label: 'Báo giá', icon: FileText, oldModule: 'sl_lv0010/sl_lv0010-1.php' },
    { key: 'contracts', legacyValue: 3, label: 'Hợp đồng', icon: Briefcase, oldModule: 'sl_lv0013/sl_lv0013-1.php' },
    { key: 'materialRequests', legacyValue: 17, label: 'Đề nghị vật tư', icon: ShoppingCart, oldModule: 'cr_lv0150/cr_lv0150-17.php' },
    { key: 'purchase', legacyValue: 4, label: 'Mua hàng', icon: ShoppingCart, oldModule: 'wh_lv0021/wh_lv0021-1.php' },
    { key: 'receipts', legacyValue: 5, label: 'Thu tiền', icon: Coins, oldModule: 'cr_lv0032/cr_lv0032.php' },
    { key: 'paymentRequests', legacyValue: 16, label: 'Đề nghị chi tiền', icon: Coins, oldModule: 'cr_lv0202/cr_lv0202-16.php' },
    { key: 'payments', legacyValue: 6, label: 'Chi tiền', icon: Coins, oldModule: 'cr_lv0033/cr_lv0033.php' },
    { key: 'inStock', legacyValue: 7, label: 'Nhập kho', icon: Warehouse, oldModule: 'cr_lv0037/cr_lv0037.php' },
    { key: 'outStock', legacyValue: 8, label: 'Xuất kho', icon: Warehouse, oldModule: 'cr_lv0038/cr_lv0038.php' },
    { key: 'warrantySale', legacyValue: 10, label: 'Bảo hành PBH', icon: ShieldCheck, oldModule: 'cr_lv0330/cr_lv0330-11.php' },
    { key: 'alerts', legacyValue: 11, label: 'Cảnh báo', icon: Bell, oldModule: 'cr_lv0047/cr_lv0047.php' },
    { key: 'futureIcon', legacyValue: 23, label: 'Thêm icon', icon: FileText, oldModule: 'da_lh0006/da_lh0006.php', placeholder: true },
];

// Ánh xạ tab key -> component riêng để dễ debug và bảo trì
const TAB_COMPONENT_MAP = {
    summaryItems: TongHopTab,
    kanban: KanbanTab,
    workloadMore: XemTongCVTab,
    tasks: NhapCongViecTab,
    assignment: GiaoViecTab,
    progress: TienDoTab,
    saleShares: DSSaleThamGiaTab,
    participantStaff: DSNhanVienThamGiaTab,
    contacts: ThongTinLienHeTab,
    quotes: BaoGiaTab,
    contracts: HopDongTab,
    materialRequests: DeNghiVatTuTab,
    purchase: MuaHangTab,
    receipts: ThuTienTab,
    paymentRequests: DeNghiChiTienTab,
    payments: ChiTienTab,
    inStock: NhapKhoTab,
    outStock: XuatKhoTab,
    warrantySale: BaoHanhPBHTab,
    alerts: CanhBaoTab,
    futureIcon: ThemIconTab,
};

const toNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const formatMoney = (value) => toNumber(value).toLocaleString('vi-VN', { maximumFractionDigits: 0 });
const displayValue = (value) => value || <Text type="secondary">-</Text>;

const formatDate = (val) => {
    if (!val) return null;
    const str = String(val).trim();
    if (!str) return null;
    if (/^\d{2}\/\d{2}\/\d{4}/.test(str)) {
        return str.substring(0, 10);
    }
    const match = str.match(/^(\d{4})[-/](\d{2})[-/](\d{2})/);
    if (match) {
        return `${match[3]}/${match[2]}/${match[1]}`;
    }
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    }
    return str;
};

const getPlanName = (record, detailData, planId) => (
    record?.lv002 || detailData?.plan?.lv002 || detailData?.plan?.ten_ke_hoach || planId
);

const statusTag = (value) => {
    const closed = String(value ?? '0') === '1';
    return <Tag color={closed ? 'green' : 'blue'}>{closed ? 'Đã đóng' : 'Đang mở'}</Tag>;
};

const permissionTag = (value) => {
    const permission = value || 'PRIVATE';
    return <Tag color={permission === 'PUBLIC' ? 'cyan' : 'blue'}>{permission}</Tag>;
};

const canViewTab = (detailData, tabKey) => {
    const permissions = detailData?.permissions || detailData?.rights || {};
    const tabPermission = permissions[tabKey];
    if (!tabPermission) return true;
    if (typeof tabPermission === 'boolean') return tabPermission;
    return tabPermission.view !== false && tabPermission.GetView !== 0;
};

// PlaceholderTab đã được tách vào ThemIconTab.jsx

const ChiTietKeHoach = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const routeRecord = location.state?.record || null;
    const [loading, setLoading] = useState(false);
    const [detailData, setDetailData] = useState(null);
    const [activeTab, setActiveTab] = useState('summaryItems');
    const [taskDraft, setTaskDraft] = useState(null);

    const planId = decodeURIComponent(id || routeRecord?.lv001 || '');

    const fetchDetail = useCallback(async () => {
        if (!planId) return;
        setLoading(true);
        try {
            const result = await execCRUD('cr_lv0094_detail', 'loadPlanDetail', { lv001: planId });
            let parsedResult = result;
            if (typeof result === 'string') {
                try {
                    parsedResult = JSON.parse(result.trim());
                } catch (e) {
                    console.error('Lỗi phân tích JSON từ chuỗi kết quả:', e);
                }
            }
            if (parsedResult && parsedResult.success === false) {
                message.error(parsedResult.message || 'Không thể tải chi tiết kế hoạch');
                setDetailData(null);
                return;
            }
            const decodedResult = { ...parsedResult };
            if (decodedResult.columns) {
                decodedResult.columns = decodeStrings(decodedResult.columns);
            }
            setDetailData(decodedResult || {});
        } catch (error) {
            console.error(error);
            message.error('Lỗi kết nối máy chủ khi tải chi tiết kế hoạch');
            setDetailData(null);
        } finally {
            setLoading(false);
        }
    }, [planId]);

    useEffect(() => {
        fetchDetail();
    }, [fetchDetail]);

    useEffect(() => {
        const handleCreateTask = (event) => {
            setTaskDraft(event.detail || null);
            setActiveTab('tasks');
        };
        window.addEventListener('quanLyKeHoach:createTask', handleCreateTask);
        return () => window.removeEventListener('quanLyKeHoach:createTask', handleCreateTask);
    }, []);

    const plan = useMemo(() => ({ ...(routeRecord || {}), ...(detailData?.plan || {}) }), [detailData, routeRecord]);
    const summary = detailData?.summary || {};
    const planName = getPlanName(routeRecord, detailData, planId);
    const taskCount = summary.tasks ?? summary.workload ?? getTabRows(detailData, 'tasks').length;
    const summaryCount = summary.summaryItems ?? getTabRows(detailData, 'summaryItems').length;
    const receiptCount = summary.receipts ?? getTabRows(detailData, 'receipts').length;
    const paymentCount = summary.payments ?? getTabRows(detailData, 'payments').length;
    const materialRequestCount = summary.materialRequests ?? getTabRows(detailData, 'materialRequests').length;

    const visibleTabs = useMemo(() => LEGACY_TABS.filter((tab) => canViewTab(detailData, tab.key)), [detailData]);

    const tabItems = useMemo(() => (
        visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const TabComponent = TAB_COMPONENT_MAP[tab.key];
            return {
                key: tab.key,
                label: (
                    <Space size={6}>
                        <Icon size={15} />
                        <span>{tab.label}</span>
                    </Space>
                ),
                children: TabComponent
                    ? <TabComponent detailData={detailData || {}} onRefresh={fetchDetail} prefillTask={tab.key === 'tasks' ? taskDraft : null} onPrefillTaskConsumed={() => setTaskDraft(null)} />
                    : null,
            };
        })
    ), [detailData, fetchDetail, visibleTabs, taskDraft]);

    if (!planId) {
        return (
            <Result
                status="warning"
                title="Thiếu mã kế hoạch"
                extra={<Button onClick={() => navigate('/quan-ly-ke-hoach')}>Quay lại danh sách</Button>}
            />
        );
    }

    return (
        <div className={styles.container}>
            <Breadcrumb
                className={styles.detailBreadcrumb}
                items={[
                    { title: 'Quản lý kế hoạch' },
                    { title: planId },
                ]}
            />

            <Card className={styles.detailHeroCard} size="small">
                <div className={styles.detailHeroContent}>
                    <Space className={styles.detailHeaderTitle} align="start">
                        <FolderKanban size={22} />
                        <div>
                            <Title level={4}>{planName}</Title>
                            <Space wrap size={6}>
                                <Text code>{planId}</Text>
                                {statusTag(plan.lv098)}
                                {permissionTag(plan.lv007)}
                                {(plan.ten_du_an || plan.lv501 || plan.lv009) && (
                                    <Tag color="geekblue">{plan.ten_du_an || plan.lv501 || plan.lv009}</Tag>
                                )}
                            </Space>
                        </div>
                    </Space>
                    <Space wrap>
                        <Button icon={<ArrowLeft size={16} />} onClick={() => navigate('/quan-ly-ke-hoach')}>Quay lại</Button>
                        <Button type="primary" icon={<RefreshCw size={16} />} onClick={fetchDetail} loading={loading}>Tải lại</Button>
                    </Space>
                </div>
            </Card>

            {loading && !detailData ? (
                <Card className={styles.pageWrapper}>
                    <Skeleton active paragraph={{ rows: 10 }} />
                </Card>
            ) : (
                <div className={styles.detailOverview}>
                    <Card className={styles.detailInfoCard} size="small" title="Thông tin kế hoạch">
                        <Row gutter={[12, 12]}>
                            <Col xs={24} xl={19}>
                                <Descriptions size="small" column={{ xs: 1, sm: 2, md: 3 }} bordered>
                                    <Descriptions.Item label="Mã kế hoạch">{displayValue(plan.lv001 || planId)}</Descriptions.Item>
                                    <Descriptions.Item label="Trạng thái">{statusTag(plan.lv098)}</Descriptions.Item>
                                    <Descriptions.Item label="Quyền">{permissionTag(plan.lv007)}</Descriptions.Item>

                                    <Descriptions.Item label="Tên kế hoạch" span={2}>{displayValue(plan.lv002 || plan.ten_ke_hoach)}</Descriptions.Item>
                                    <Descriptions.Item label="Loại dự án">{displayValue(plan.ten_loai_hinh || plan.lv084)}</Descriptions.Item>

                                    <Descriptions.Item label="Dự án" span={2}>{displayValue(plan.ten_du_an || plan.lv009 || plan.lv501)}</Descriptions.Item>
                                    <Descriptions.Item label="Người tạo">
                                        <Space size={6}><UserRound size={14} />{displayValue(plan.ten_nguoi_tao || plan.lv004)}</Space>
                                    </Descriptions.Item>

                                    <Descriptions.Item label="Ngày bắt đầu">
                                        <Space size={6}><CalendarDays size={14} />{displayValue(formatDate(plan.lv077 || plan.ngay_bat_dau))}</Space>
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Ngày kết thúc">
                                        <Space size={6}><CalendarDays size={14} />{displayValue(formatDate(plan.lv078 || plan.ngay_ket_thuc))}</Space>
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Khu vực">{displayValue(plan.ten_khu_vuc || plan.lv085)}</Descriptions.Item>

                                    <Descriptions.Item label="Thương hiệu">{displayValue(plan.lv082)}</Descriptions.Item>
                                    <Descriptions.Item label="Địa chỉ dự án" span={2}>{displayValue(plan.lv083)}</Descriptions.Item>

                                    <Descriptions.Item label="Thông tin" span={3}>
                                        {plan.lv090 ? <Tooltip title={plan.lv090}><Text>{plan.lv090}</Text></Tooltip> : <Text type="secondary">-</Text>}
                                    </Descriptions.Item>
                                </Descriptions>
                            </Col>
                            <Col xs={24} xl={5}>
                                <Row gutter={[8, 8]}>
                                    <Col xs={12} sm={6} xl={12}>
                                        <Card size="small"><Statistic title="Công việc" value={taskCount} /></Card>
                                    </Col>
                                    <Col xs={12} sm={6} xl={12}>
                                        <Card size="small"><Statistic title="Tổng hợp" value={summaryCount} /></Card>
                                    </Col>
                                    <Col xs={12} sm={6} xl={12}>
                                        <Card size="small"><Statistic title="Thu/Chi" value={`${receiptCount}/${paymentCount}`} /></Card>
                                    </Col>
                                    <Col xs={12} sm={6} xl={12}>
                                        <Card size="small"><Statistic title="Đề nghị VT" value={materialRequestCount} /></Card>
                                    </Col>
                                    <Col xs={24}>
                                        <Card size="small">
                                            <Statistic title="Dự toán" value={`${formatMoney(summary.estimateAmount || plan.lv075 || plan.lv076 || 0)} VND`} />
                                        </Card>
                                    </Col>
                                </Row>
                            </Col>
                        </Row>
                    </Card>

                    <Card className={styles.detailTabsCard}>
                        <Tabs
                            className={styles.detailTabs}
                            activeKey={activeTab}
                            onChange={setActiveTab}
                            items={tabItems}
                            tabPosition="top"
                        />
                    </Card>
                </div>
            )}
        </div>
    );
};

export default ChiTietKeHoach;
