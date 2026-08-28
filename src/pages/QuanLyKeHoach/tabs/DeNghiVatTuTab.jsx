import React, {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";
import {
    Button,
    Card,
    Col,
    DatePicker,
    Divider,
    Drawer,
    Empty,
    Form,
    Input,
    InputNumber,
    Modal,
    Popconfirm,
    Row,
    Select,
    Space,
    Statistic,
    Table,
    Tag,
    Timeline,
    Tooltip,
    Typography,
    message,
    Image as AntImage,
    Spin,
    Tabs,
    Upload,
} from "antd";
import {
    ArrowRightLeft,
    CheckCircle2,
    ClipboardList,
    Clock,
    Edit3,
    Eye,
    FileText,
    History,
    Image as ImageIcon,
    MessageSquare,
    PackagePlus,
    Paperclip,
    Plus,
    RefreshCw,
    ShieldCheck,
    Trash2,
    Upload as UploadIcon,
    User,
    Warehouse,
    X,
    XCircle,
    Search,
} from "lucide-react";
import dayjs from "dayjs";
import { execCRUD, loadTienTe } from "../../../services/apiServices";
import { toMySQLDate } from "../../../utils/helpers";
import approvalEventBus from "../../../utils/approvalEventBus";
import { useAuth } from "../../../contexts/AuthContext";
import { uploadImageFile, getImageUrl } from "../../../services/imageService";
import SelectCongViec from "../../../components/DropDown/SelectCongViec";
import SelectDonVi from "../../../components/DropDown/SelectDonVi";
import EditPhieuMuaHangDrawer from "../../../components/Order/EditPhieuMuaHangDrawer";
import styles from "../QuanLyKeHoach.module.css";
import "../../QuanLyDeNghiVatTu/QuanLyDeNghiVatTu.css";

const { Text } = Typography;

// ─── Class constants ──────────────────────────────────────────────────────────
const HEADER_CLASS = "cr_lv0150";   // Phiếu ĐNVT (header)
const DETAIL_CLASS = "cr_lv0151";  // Chi tiết dòng vật tư đã lưu
const HISTORY_CLASS = "cr_lv0313"; // Lịch sử duyệt
const DOCUMENT_CLASS = "cr_lv0384"; // Tài liệu đính kèm
const CHILD_KEY = "materialRequests";
const TAB_LABEL = "Đề nghị vật tư";
const TAB_MODULE = "cr_lv0150/cr_lv0150-17.php";

// ─── Trạng thái duyệt ────────────────────────────────────────────────────────
const trangThaiDuyetMap = {
    "-1": { color: "error", label: "Bị từ chối", icon: <XCircle size={13} /> },
    "0": { color: "default", label: "Chờ đề xuất", icon: <ClipboardList size={13} /> },
    "1": { color: "warning", label: "Đã đề xuất", icon: <ArrowRightLeft size={13} /> },
    "2": { color: "success", label: "Đã duyệt", icon: <CheckCircle2 size={13} /> },
};

const trangThaiLockMap = {
    "0": { color: "blue", label: "Mở" },
    "1": { color: "green", label: "Khoá" },
};

const TrangThaiDuyetTag = ({ value }) => {
    const cfg = trangThaiDuyetMap[String(value ?? 0)] ?? trangThaiDuyetMap["0"];
    return (
        <Tag
            color={cfg.color === "error" ? "red" : cfg.color === "success" ? "green" : cfg.color === "warning" ? "orange" : "default"}
            icon={cfg.icon}
            style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
        >
            {cfg.label}
        </Tag>
    );
};

// ─── Format helpers ───────────────────────────────────────────────────────────
const parseDate = (v) => {
    if (!v) return null;
    if (dayjs.isDayjs(v)) return v;
    const s = String(v);
    if (/^\d{8}$/.test(s)) return dayjs(s, "YYYYMMDD");
    if (/^\d{14}$/.test(s)) return dayjs(s, "YYYYMMDDHHmmss");
    const p = dayjs(s);
    return p.isValid() ? p : null;
};

const fmtDate = (v) => {
    const d = parseDate(v);
    return d ? d.format("DD/MM/YYYY") : v ? String(v) : "—";
};

const fmtDateTime = (v) => {
    const d = parseDate(v);
    return d ? d.format("DD/MM/YYYY HH:mm") : v ? String(v) : "—";
};

const fmtCurrency = (val, code) => {
    const cleanCode = String(code || "").trim().toUpperCase();
    const validCode = /^[A-Z]{3}$/.test(cleanCode) ? cleanCode : "VND";
    return Number(val || 0).toLocaleString("vi-VN", {
        style: "currency",
        currency: validCode,
        maximumFractionDigits: 0,
    });
};

// ─── Component chính ─────────────────────────────────────────────────────────
const DeNghiVatTuTab = ({ detailData, onRefresh }) => {
    const planId = detailData?.plan?.lv001;
    const { user } = useAuth();

    // ── Master data ──────────────────────────────────────────────────────────
    const [khoList, setKhoList] = useState([]);
    const [nhanVienList, setNhanVienList] = useState([]);
    const [sanPhamList, setSanPhamList] = useState([]);

    // ── Danh sách phiếu ĐNVT ─────────────────────────────────────────────────
    const [records, setRecords] = useState([]);
    const [filteredRecords, setFilteredRecords] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedRowKeys, setSelectedRowKeys] = useState([]);

    // ── Bộ lọc ───────────────────────────────────────────────────────────────
    const [filters, setFilters] = useState({
        lv027: undefined,
        lv002: undefined,
        search: ""
    });

    // ── Drawer xem chi tiết phiếu ─────────────────────────────────────────────
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [drawerLoading, setDrawerLoading] = useState(false);
    const [selectedHeader, setSelectedHeader] = useState(null);
    const [detailRows, setDetailRows] = useState([]);
    const [historyRows, setHistoryRows] = useState([]);
    const [documentRows, setDocumentRows] = useState([]);
    const [documentLoading, setDocumentLoading] = useState(false);
    const [drawerTab, setDrawerTab] = useState("chitiet");

    // ── Modal TẠO phiếu ─────────────────────────────────────────────────────
    const [createOpen, setCreateOpen] = useState(false);
    const [createSubmitting, setCreateSubmitting] = useState(false);
    const [headerForm] = Form.useForm();

    // ── Modal SỬA phiếu ──────────────────────────────────────────────────────
    const [editOpen, setEditOpen] = useState(false);
    const [editSubmitting, setEditSubmitting] = useState(false);
    const [editingHeader, setEditingHeader] = useState(null);
    const [editForm] = Form.useForm();
    const [deletedDetailIds, setDeletedDetailIds] = useState([]);

    // ── Tiền tệ & Phiếu mua hàng liên quan ────────────────────────────────────
    const [currencies, setCurrencies] = useState([]);
    const [currenciesLoading, setCurrenciesLoading] = useState(false);
    const [pmhInfo, setPmhInfo] = useState(null);
    const [pmhLoading, setPmhLoading] = useState(false);
    const [editPmhDrawerOpen, setEditPmhDrawerOpen] = useState(false);
    const [editPmhCode, setEditPmhCode] = useState(null);

    // ─── Computed options ──────────────────────────────────────────────────────
    const khoOptions = useMemo(
        () => khoList.map((k) => ({ value: k.lv001, label: `${k.lv003 ?? k.lv001}` })),
        [khoList]
    );

    const nhanVienOptions = useMemo(
        () => nhanVienList.map((n) => ({ value: n.lv001, label: `${n.lv002 ?? n.lv001} (${n.lv001})` })),
        [nhanVienList]
    );

    const sanPhamOptions = useMemo(
        () => sanPhamList.map((s) => ({
            value: s.lv001,
            label: `${s.lv001} - ${s.lv002 ?? ""}${s.lv004 ? ` (${s.lv004})` : ""}`,
        })),
        [sanPhamList]
    );

    const nhanVienMap = useMemo(() => {
        const m = {};
        nhanVienList.forEach((n) => { if (n.lv001) m[n.lv001] = n; });
        return m;
    }, [nhanVienList]);

    const sanPhamMap = useMemo(() => {
        const m = {};
        sanPhamList.forEach((s) => { if (s.lv001) m[s.lv001] = s; });
        return m;
    }, [sanPhamList]);

    const currencyOptions = useMemo(
        () =>
            currencies.map((item) => {
                const code = item?.lv001 || "";
                const name = item?.lv002 || "";
                return {
                    label: name || code,
                    value: code || name,
                };
            }),
        [currencies]
    );

    const historyTimeline = useMemo(() => {
        if (!historyRows.length) return [];
        const maxLv008 = Math.max(...historyRows.map((h) => Number(h.lv008 ?? 0)));
        return historyRows.map((h) => {
            const isFun = h.lv006 === "Apr";
            const roundLabel = `Vòng ${maxLv008 - Number(h.lv008 ?? 0) + 1}`;
            const nv = nhanVienMap[h.lv004];
            const tenNV = nv ? `${nv.lv002 ?? ""} (${nv.lv001})` : h.lv004 ?? "—";
            return {
                color: isFun ? "#52c41a" : "#ff4d4f",
                dot: isFun ? <CheckCircle2 size={16} color="#52c41a" /> : <XCircle size={16} color="#ff4d4f" />,
                label: <span style={{ fontSize: 11, color: "#8c8c8c" }}>{roundLabel}</span>,
                children: (
                    <div className="duyet-timeline-item">
                        <div className="duyet-timeline-action" style={{ color: isFun ? "#52c41a" : "#ff4d4f" }}>{isFun ? "✔ Đã duyệt" : "✖ Trả lại"}</div>
                        <div className="duyet-timeline-desc">{h.lv003}</div>
                        <div className="duyet-timeline-meta"><User size={11} /> {tenNV} &nbsp;·&nbsp; <Clock size={11} /> {fmtDateTime(h.lv005)}</div>
                        {h.lv009 && <div className="duyet-timeline-remark"><MessageSquare size={11} /> {h.lv009}</div>}
                    </div>
                ),
            };
        });
    }, [historyRows, nhanVienMap]);

    // ─── Stats ────────────────────────────────────────────────────────────────
    const stats = useMemo(() => {
        return {
            total: filteredRecords.length,
            choXuLy: filteredRecords.filter((r) => String(r.lv027) === "0").length,
            deXuat: filteredRecords.filter((r) => String(r.lv027) === "1").length,
            daDuyet: filteredRecords.filter((r) => String(r.lv027) === "2").length,
        };
    }, [filteredRecords]);

    // ─── Fetch master data ────────────────────────────────────────────────────
    const fetchKho = useCallback(async () => {
        try {
            const d = await execCRUD("ts_lv0001", "load");
            setKhoList(Array.isArray(d) ? d : []);
        } catch { /* silent */ }
    }, []);

    const fetchNhanVien = useCallback(async () => {
        try {
            const d = await execCRUD("hr_lv0020", "load");
            setNhanVienList(Array.isArray(d) ? d : []);
        } catch { /* silent */ }
    }, []);

    const fetchSanPham = useCallback(async () => {
        try {
            const d = await execCRUD("sl_lv0007", "load");
            setSanPhamList(Array.isArray(d) ? d : []);
        } catch { /* silent */ }
    }, []);

    const fetchCurrencies = useCallback(async () => {
        setCurrenciesLoading(true);
        try {
            const d = await loadTienTe();
            setCurrencies(Array.isArray(d) ? d : []);
        } catch { /* silent */ }
        finally {
            setCurrenciesLoading(false);
        }
    }, []);

    // ─── Fetch danh sách phiếu ĐNVT ──────────────────────────────────────────
    const fetchRecords = useCallback(async () => {
        setLoading(true);
        try {
            if (onRefresh) {
                await onRefresh();
            }
        } catch {
            message.error("Không thể tải danh sách đề nghị vật tư.");
        } finally {
            setLoading(false);
        }
    }, [onRefresh]);

    // ─── Sync data from parent ───────────────────────────────────────────────
    useEffect(() => {
        const raw = detailData?.tabs?.[CHILD_KEY] ?? detailData?.[CHILD_KEY] ?? [];
        setRecords(Array.isArray(raw) ? raw.map((r, i) => ({ ...r, key: r.lv001 ?? i })) : []);
    }, [detailData]);

    // Fetch master data on mount
    useEffect(() => {
        fetchKho();
        fetchNhanVien();
        fetchSanPham();
        fetchCurrencies();
    }, [fetchKho, fetchNhanVien, fetchSanPham, fetchCurrencies]);

    // Filters logic
    useEffect(() => {
        let data = [...records];
        if (filters.lv027 !== undefined && filters.lv027 !== null && filters.lv027 !== "") {
            data = data.filter((r) => String(r.lv027) === String(filters.lv027));
        }
        if (filters.lv002) {
            data = data.filter((r) => r.lv002 === filters.lv002);
        }
        if (filters.search) {
            const kw = filters.search.trim().toLowerCase();
            data = data.filter((r) =>
                [r.lv001, r.lv002, r.lv003, r.lv004, r.lv114, r.lv117]
                    .filter(Boolean)
                    .some((v) => String(v).toLowerCase().includes(kw))
            );
        }
        setFilteredRecords(data);
    }, [filters, records]);

    // ─── Fetch chi tiết phiếu đã lưu (cr_lv0151) ────────────────────────────
    const fetchDrawerData = useCallback(async (maPhieu) => {
        setDrawerLoading(true);
        setDocumentLoading(true);
        setPmhLoading(true);
        try {
            const [det, hist, docs, pmhRes] = await Promise.all([
                execCRUD(DETAIL_CLASS, "loadId", { lv002: maPhieu }),
                execCRUD(HISTORY_CLASS, "loadId", { lv002: maPhieu }),
                execCRUD(DOCUMENT_CLASS, "loadId", { lv002: maPhieu }),
                execCRUD("cr_lv0155", "checkpmh", { lv001: maPhieu }),
            ]);
            setDetailRows(Array.isArray(det) ? det : []);
            setHistoryRows(Array.isArray(hist) ? hist : []);
            setDocumentRows(Array.isArray(docs) ? docs : []);
            if (pmhRes?.success) {
                setPmhInfo(pmhRes);
            } else {
                setPmhInfo({ hasPMH: false });
            }
        } catch {
            message.error("Không thể tải dữ liệu chi tiết phiếu.");
        } finally {
            setDrawerLoading(false);
            setDocumentLoading(false);
            setPmhLoading(false);
        }
    }, []);

    // ─── Handlers: Tạo phiếu ─────────────────────────────────────────────────
    const openCreateModal = useCallback(async () => {
        headerForm.resetFields();
        setLoading(true);
        let allRecords = [];
        try {
            const d = await execCRUD(HEADER_CLASS, "load");
            allRecords = Array.isArray(d) ? d : [];
        } catch (e) {
            console.error("Failed to load all records for code generation", e);
        } finally {
            setLoading(false);
        }

        const currentYear = dayjs().format("YY");
        const suffix = `/ĐNVT/MP${currentYear}`;
        let maxNum = 0;

        allRecords.forEach((r) => {
            const code = String(r?.lv001 || "");
            if (code.endsWith(suffix)) {
                const parts = code.split("/");
                if (parts.length >= 3) {
                    const numPart = parseInt(parts[0], 10);
                    if (!isNaN(numPart) && numPart > maxNum) {
                        maxNum = numPart;
                    }
                }
            }
        });

        const nextNum = maxNum + 1;
        const nextCode = `${String(nextNum).padStart(4, "0")}${suffix}`;

        headerForm.setFieldsValue({
            lv001: nextCode,
            lv009: dayjs(),
            lv004: `Đề nghị vật tư ngày ${dayjs().format("DD/MM/YYYY")}`,
            lv114: undefined,
            details: [{ lv004: 1, lv009: "VND", lv010: dayjs() }],
        });
        setCreateOpen(true);
    }, [headerForm]);

    const handleSavePhieu = async () => {
        let formValues;
        try {
            formValues = await headerForm.validateFields();
        } catch (err) {
            if (err?.errorFields) return;
            message.error("Vui lòng điền đầy đủ thông tin phiếu.");
            return;
        }

        const details = formValues.details || [];
        if (details.length === 0 || !details.some(d => d.lv003)) {
            message.warning("Vui lòng thêm ít nhất 1 vật tư trước khi lưu phiếu.");
            return;
        }

        try {
            setCreateSubmitting(true);
            const headerPayload = {
                lv001: formValues.lv001,
                lv002: formValues.lv002,
                lv004: formValues.lv004,
                lv114: formValues.lv114 || "",
                lv009: formValues.lv009 ? toMySQLDate(formValues.lv009, "datetime") : dayjs().format("YYYY-MM-DD HH:mm:ss"),
                lv005: "PLAN",
                lv006: planId,
            };
            await execCRUD(HEADER_CLASS, "insert", headerPayload);

            for (const item of details) {
                if (!item.lv003) continue;
                const itemPayload = {
                    lv002: formValues.lv001,
                    lv003: item.lv003,
                    lv004: Number(item.lv004 || 0),
                    lv005: item.lv005 || "",
                    lv006: Number(item.lv006 ?? item.lv004 ?? 0),
                    lv008: Number(item.lv008 || 0),
                    lv009: item.lv009 || "VND",
                    lv010: item.lv010 ? toMySQLDate(item.lv010, "date") : "",
                    lv015: item.lv015 ?? "",
                };
                await execCRUD(DETAIL_CLASS, "insert", itemPayload);
            }

            message.success("Tạo phiếu và thêm vật tư thành công!");
            setCreateOpen(false);
            headerForm.resetFields();
            fetchRecords();
        } catch (err) {
            message.error("Có lỗi xảy ra khi lưu phiếu.");
        } finally {
            setCreateSubmitting(false);
        }
    };

    const openEditModal = useCallback(async (record) => {
        setEditingHeader(record);
        setDeletedDetailIds([]);
        editForm.resetFields();
        setEditOpen(true);
        setEditSubmitting(true);
        try {
            const details = await execCRUD(DETAIL_CLASS, "loadId", { lv002: record.lv001 });
            editForm.setFieldsValue({
                lv001: record.lv001,
                lv002: record.lv002,
                lv004: record.lv004,
                lv009: parseDate(record.lv009),
                lv010: parseDate(record.lv010),
                lv011: record.lv011,
                lv099: record.lv099,
                lv114: record.lv114 || undefined,
                lv029: String(record.lv029 ?? "0"),
                details: Array.isArray(details) ? details.map(item => ({
                    lv001: item.lv001,
                    lv002: item.lv002,
                    lv003: item.lv003,
                    lv004: Number(item.lv004 ?? 0),
                    lv005: item.lv005,
                    lv006: Number(item.lv006 ?? item.lv004 ?? 0),
                    lv008: Number(item.lv008 ?? 0),
                    lv009: item.lv009 || "VND",
                    lv010: item.lv010 ? parseDate(item.lv010) : null,
                    lv015: item.lv015 ?? "",
                })) : [],
            });
        } catch {
            message.error("Không thể tải chi tiết vật tư của phiếu.");
        } finally {
            setEditSubmitting(false);
        }
    }, [editForm]);

    const handleEditSubmit = async () => {
        try {
            const values = await editForm.validateFields();
            setEditSubmitting(true);

            await execCRUD(HEADER_CLASS, "update", {
                lv001: editingHeader.lv001,
                lv002: values.lv002 ?? "",
                lv004: values.lv004 ?? "",
                lv009: values.lv009 ? toMySQLDate(values.lv009, "datetime") : "",
                lv010: values.lv010 ? toMySQLDate(values.lv010, "date") : "",
                lv011: values.lv011 ?? "",
                lv099: values.lv099 ?? "",
                lv114: values.lv114 ?? "",
                lv029: values.lv029 ?? "0",
                lv005: editingHeader.lv005 || "PLAN",
                lv006: editingHeader.lv006 || planId,
            });

            for (const id of deletedDetailIds) {
                await execCRUD(DETAIL_CLASS, "delete", { lv001: id });
            }

            const details = values.details || [];
            for (const item of details) {
                if (!item.lv003) continue;
                const itemPayload = {
                    lv002: editingHeader.lv001,
                    lv003: item.lv003,
                    lv004: Number(item.lv004 || 0),
                    lv005: item.lv005 || "",
                    lv006: Number(item.lv006 ?? item.lv004 ?? 0),
                    lv008: Number(item.lv008 || 0),
                    lv009: item.lv009 || "VND",
                    lv010: item.lv010 ? toMySQLDate(item.lv010, "date") : "",
                    lv015: item.lv015 ?? "",
                };

                if (item.lv001) {
                    await execCRUD(DETAIL_CLASS, "update", {
                        ...itemPayload,
                        lv001: item.lv001,
                    });
                } else {
                    await execCRUD(DETAIL_CLASS, "insert", itemPayload);
                }
            }

            message.success("Cập nhật phiếu đề nghị thành công.");
            setEditOpen(false);
            setDeletedDetailIds([]);
            fetchRecords();
        } catch (err) {
            if (err?.errorFields) return;
            message.error("Không thể cập nhật phiếu.");
        } finally {
            setEditSubmitting(false);
        }
    };

    const handleViewDetail = () => {
        const record = records.find(r => r.lv001 === selectedRowKeys[0]);
        if (record) openDrawer(record);
    };

    const handleEdit = () => {
        const record = records.find(r => r.lv001 === selectedRowKeys[0]);
        if (record) openEditModal(record);
    };

    const handleBatchApprove = async () => {
        if (!selectedRowKeys.length) return;
        Modal.confirm({
            title: "Đề xuất duyệt",
            content: `Xác nhận đề xuất duyệt cho ${selectedRowKeys.length} phiếu đã chọn?`,
            okText: 'Xác nhận', cancelText: 'Hủy',
            onOk: async () => {
                let count = 0;
                for (const id of selectedRowKeys) {
                    try {
                        await execCRUD("cr_lv0150", "apr", { lv001: id });
                        approvalEventBus.publish("proposed", { phieuId: id });
                        count++;
                    } catch (e) {
                        console.error(e);
                    }
                }
                if (count > 0) {
                    message.success(`Đã đề xuất duyệt thành công cho ${count} phiếu.`);
                    setSelectedRowKeys([]);
                    fetchRecords();
                } else {
                    message.error("Có lỗi xảy ra khi đề xuất duyệt.");
                }
            }
        });
    };

    const handleBatchDelete = async () => {
        if (!selectedRowKeys.length) return;
        Modal.confirm({
            title: "Xác nhận xóa",
            content: `Bạn có chắc chắn muốn xóa ${selectedRowKeys.length} phiếu đề nghị vật tư đã chọn?`,
            okText: 'Xóa', okType: 'danger', cancelText: 'Hủy',
            onOk: async () => {
                let count = 0;
                for (const id of selectedRowKeys) {
                    try {
                        await execCRUD(HEADER_CLASS, "delete", { lv001: id });
                        count++;
                    } catch (e) {
                        console.error(e);
                    }
                }
                if (count > 0) {
                    message.success(`Đã xóa thành công ${count} phiếu.`);
                    setSelectedRowKeys([]);
                    fetchRecords();
                } else {
                    message.error("Có lỗi xảy ra khi xóa.");
                }
            }
        });
    };

    const openDrawer = async (record) => {
        setSelectedHeader(record);
        setDetailRows([]);
        setHistoryRows([]);
        setDocumentRows([]);
        setPmhInfo(null);
        setDrawerTab("chitiet");
        setDrawerOpen(true);
        await fetchDrawerData(record.lv001);
    };

    const handleOpenEditPmh = () => {
        if (!pmhInfo?.pmhData?.PMH) return;
        setEditPmhCode(pmhInfo.pmhData.PMH);
        setEditPmhDrawerOpen(true);
    };

    const handleUploadDocument = async (file) => {
        if (!selectedHeader) return false;
        try {
            setDocumentLoading(true);
            const res = await uploadImageFile(file, "", user?.id || "");
            if (res.success && res.token) {
                const payload = {
                    lv002: selectedHeader.lv001,
                    lv003: "Ảnh minh họa",
                    lv004: file.name,
                    lv005: res.token,
                    lv009: user?.id || "",
                    lv010: dayjs().format("YYYY-MM-DD HH:mm:ss"),
                };
                await execCRUD(DOCUMENT_CLASS, "insert", payload);
                message.success("Tải lên tài liệu thành công.");
                const updatedDocs = await execCRUD(DOCUMENT_CLASS, "loadId", { lv002: selectedHeader.lv001 });
                setDocumentRows(Array.isArray(updatedDocs) ? updatedDocs : []);
            } else {
                message.error(res.error || "Lỗi khi tải lên hình ảnh.");
            }
        } catch (err) {
            message.error("Không thể tải lên tài liệu.");
        } finally {
            setDocumentLoading(false);
        }
        return false;
    };

    const handleDeleteDocument = async (doc) => {
        try {
            setDocumentLoading(true);
            await execCRUD(DOCUMENT_CLASS, "delete", { lv001: doc.lv001 });
            message.success("Đã xoá tài liệu.");
            const updatedDocs = await execCRUD(DOCUMENT_CLASS, "loadId", { lv002: selectedHeader.lv001 });
            setDocumentRows(Array.isArray(updatedDocs) ? updatedDocs : []);
        } catch {
            message.error("Không thể xoá tài liệu.");
        } finally {
            setDocumentLoading(false);
        }
    };

    // ─── COLUMNS ────────────────────────────────────────────────────────────
    const columns = [
        {
            title: "Mã phiếu",
            dataIndex: "lv001",
            key: "lv001",
            width: 160,
            render: (v) => <Tag color="blue" style={{ fontWeight: 600 }}>{v}</Tag>,
        },
        {
            title: "Kho",
            dataIndex: "lv002",
            key: "lv002",
            width: 130,
            render: (v) => {
                const kho = khoList.find((k) => k.lv001 === v);
                return kho ? (
                    <Tooltip title={`Mã kho: ${v}`}>
                        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <Warehouse size={13} style={{ color: "#1677ff" }} />
                            {kho.lv003 ?? v}
                        </span>
                    </Tooltip>
                ) : (v || "—");
            },
        },
        {
            title: "Nội dung",
            dataIndex: "lv004",
            key: "lv004",
            width: 250,
            ellipsis: true,
            render: (v) => <span title={v}>{v || "—"}</span>,
        },
        {
            title: "Ngày ĐN",
            dataIndex: "lv009",
            key: "lv009",
            width: 110,
            render: fmtDate,
        },
        {
            title: "Người tạo",
            dataIndex: "lv117",
            key: "lv117",
            width: 130,
            render: (v) => {
                const nv = nhanVienList.find((n) => n.lv001 === v);
                return nv ? nv.lv002 ?? v : (v || "—");
            },
        },
        {
            title: "Trạng thái duyệt",
            dataIndex: "lv027",
            key: "lv027",
            width: 120,
            render: (v) => <TrangThaiDuyetTag value={v} />,
        },
        {
            title: "Khoá",
            dataIndex: "lv007",
            key: "lv007",
            width: 80,
            render: (v) => {
                const cfg = trangThaiLockMap[String(v ?? 0)] ?? trangThaiLockMap["0"];
                return <Tag color={cfg.color}>{cfg.label}</Tag>;
            },
        },
    ];

    const detailColumns = [
        {
            title: "Mã vật tư",
            dataIndex: "lv003",
            width: 120,
            align: "center",
            render: (v) => <Tag color="cyan">{v}</Tag>
        },
        {
            title: "Tên vật tư",
            dataIndex: "lv003",
            key: "tenVT",
            ellipsis: true,
            render: (v) => sanPhamMap[v]?.lv002 ?? "—",
        },
        {
            title: "ĐVT",
            dataIndex: "lv005",
            width: 70,
            align: "center",
        },
        {
            title: "SL đề nghị",
            dataIndex: "lv004",
            width: 90,
            align: "right",
            render: (v) => <strong>{Number(v || 0).toLocaleString("vi-VN")}</strong>,
        },
        {
            title: "SL cấp phát",
            dataIndex: "lv006",
            width: 90,
            align: "right",
            render: (v) => (Number(v || 0) > 0 ? <span style={{ color: "#52c41a", fontWeight: 600 }}>{Number(v).toLocaleString("vi-VN")}</span> : "—"),
        },
        {
            title: "Đơn giá",
            dataIndex: "lv008",
            width: 100,
            align: "right",
            render: (v) => Number(v || 0).toLocaleString("vi-VN")
        },
        {
            title: "Tiền",
            dataIndex: "lv009",
            width: 60,
            align: "center",
            render: (v) => v || "VND",
        },
        {
            title: "Mô tả sản phẩm",
            dataIndex: "lv010",
            width: 280,
            render: (v) => (
                <div
                    className="dnvt-product-description"
                    style={{
                        whiteSpace: "normal",
                        wordBreak: "break-word",
                        textAlign: "left",
                        fontSize: "13px",
                        lineHeight: "1.6"
                    }}
                    dangerouslySetInnerHTML={{ __html: v || "—" }}
                />
            ),
        },
        {
            title: "Thành tiền",
            key: "thanhTien",
            width: 110,
            align: "right",
            render: (_, record) => {
                const qty = Number(record.lv004 || 0);
                const price = Number(record.lv008 || 0);
                return fmtCurrency(qty * price, record.lv009);
            }
        },
        {
            title: "Ghi chú",
            dataIndex: "lv015",
            ellipsis: true,
            render: (v) => v || "—",
        },
    ];

    const HeaderFormFields = ({ form }) => {
        const isEdit = form === editForm;
        return (
            <>
                <Divider className="dnvt-divider" orientation="left">Thông tin kho & thời gian</Divider>
                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item name="lv001" label="Mã phiếu" rules={[{ required: true, message: "Nhập mã phiếu" }]}>
                            <Input placeholder="Mã phiếu" disabled={isEdit} />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item name="lv002" label="Kho vật tư" rules={[{ required: true, message: "Chọn kho vật tư" }]}>
                            <Select dropdownMatchSelectWidth={false} showSearch allowClear options={khoOptions} placeholder="Chọn kho vật tư" />
                        </Form.Item>
                    </Col>
                </Row>
                <Divider className="dnvt-divider" orientation="left">Nội dung & Công việc</Divider>
                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item name="lv009" label="Ngày đề nghị">
                            <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" placeholder="Ngày đề nghị" />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item name="lv114" label="Công việc">
                            <SelectCongViec placeholder="Chọn công việc..." allowClear />
                        </Form.Item>
                    </Col>
                    <Col span={24}>
                        <Form.Item name="lv004" label="Mục đích / Nội dung" rules={[{ required: true, message: "Nhập mục đích sử dụng" }]}>
                            <Input.TextArea rows={2} placeholder="Nhập mục đích sử dụng vật tư..." />
                        </Form.Item>
                    </Col>
                </Row>
            </>
        );
    };

    const DetailsFormList = ({ form }) => {
        const detailsWatch = Form.useWatch("details", form) || [];
        const totalQuantity = detailsWatch.reduce((sum, item) => sum + Number(item?.lv004 || 0), 0);
        const totalAmount = detailsWatch.reduce((sum, item) => sum + Number(item?.lv004 || 0) * Number(item?.lv008 || 0), 0);

        return (
            <Form.List name="details">
                {(fields, { add, remove }) => (
                    <div className="phieu-mua-hang-details-wrapper">
                        <div className="phieu-mua-hang-detail-header" style={{ marginBottom: 8, marginTop: 12 }}>
                            <Row gutter={8}>
                                <Col span={5}>
                                    <Typography.Text strong>Vật tư / Sản phẩm</Typography.Text>
                                </Col>
                                <Col span={2}>
                                    <Typography.Text strong>SL đề nghị</Typography.Text>
                                </Col>
                                <Col span={2}>
                                    <Typography.Text strong>ĐVT</Typography.Text>
                                </Col>
                                <Col span={3}>
                                    <Typography.Text strong>Đơn giá</Typography.Text>
                                </Col>
                                <Col span={4}>
                                    <Typography.Text strong>Tiền</Typography.Text>
                                </Col>
                                <Col span={3}>
                                    <Typography.Text strong>Ngày GH</Typography.Text>
                                </Col>
                                <Col span={4}>
                                    <Typography.Text strong>Mô tả</Typography.Text>
                                </Col>
                                <Col span={1}></Col>
                            </Row>
                        </div>
                        <div className="phieu-mua-hang-fields-list" style={{ maxHeight: "300px", overflowY: "auto" }}>
                            {fields.map((field, index) => {
                                const handleSelectProduct = (val) => {
                                    const sp = sanPhamMap[val];
                                    if (sp) {
                                        form.setFieldValue(["details", field.name, "lv005"], sp.lv004 ?? sp.lv005 ?? "");
                                        form.setFieldValue(["details", field.name, "lv008"], Number(sp.lv007 || 0));
                                        form.setFieldValue(["details", field.name, "lv009"], sp.lv008 || "VND");
                                        form.setFieldValue(["details", field.name, "lv015"], sp.lv011 ?? sp.moTa ?? "");
                                        form.setFieldValue(["details", field.name, "lv010"], dayjs());
                                    }
                                };
                                return (
                                    <div key={field.key} className="phieu-mua-hang-detail-row" style={{ marginBottom: 8 }}>
                                        <Row gutter={8} align="top">
                                            <Col span={5}>
                                                <Form.Item
                                                    {...field}
                                                    name={[field.name, "lv003"]}
                                                    rules={[{ required: true, message: "Chọn vật tư" }]}
                                                    style={{ marginBottom: 0 }}
                                                >
                                                    <Select
                                                        placeholder="Chọn vật tư..."
                                                        options={sanPhamOptions}
                                                        showSearch
                                                        optionFilterProp="label"
                                                        filterOption={(input, option) =>
                                                            String(option?.label ?? "").toLowerCase().includes(input.toLowerCase())
                                                        }
                                                        onChange={handleSelectProduct}
                                                        size="middle"
                                                    />
                                                </Form.Item>
                                            </Col>
                                            <Col span={2}>
                                                <Form.Item
                                                    {...field}
                                                    name={[field.name, "lv004"]}
                                                    rules={[{ required: true, message: "Nhập SL" }]}
                                                    style={{ marginBottom: 0 }}
                                                >
                                                    <InputNumber
                                                        min={0}
                                                        style={{ width: "100%" }}
                                                        placeholder="SL"
                                                        size="middle"
                                                    />
                                                </Form.Item>
                                            </Col>
                                            <Col span={2}>
                                                <Form.Item
                                                    {...field}
                                                    name={[field.name, "lv005"]}
                                                    rules={[{ required: true, message: "Chọn ĐVT" }]}
                                                    style={{ marginBottom: 0 }}
                                                >
                                                    <SelectDonVi placeholder="ĐVT" size="middle" />
                                                </Form.Item>
                                            </Col>
                                            <Col span={3}>
                                                <Form.Item
                                                    {...field}
                                                    name={[field.name, "lv008"]}
                                                    rules={[{ required: true, message: "Nhập giá" }]}
                                                    style={{ marginBottom: 0 }}
                                                >
                                                    <InputNumber
                                                        min={0}
                                                        style={{ width: "100%" }}
                                                        placeholder="Giá"
                                                        size="middle"
                                                        formatter={(value) =>
                                                            value
                                                                ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                                                                : ""
                                                        }
                                                        parser={(value) => value.replace(/,/g, "")}
                                                    />
                                                </Form.Item>
                                            </Col>
                                            <Col span={4}>
                                                <Form.Item
                                                    {...field}
                                                    name={[field.name, "lv009"]}
                                                    style={{ marginBottom: 0 }}
                                                >
                                                    <Select
                                                        size="middle"
                                                        options={currencyOptions}
                                                        loading={currenciesLoading}
                                                        placeholder="VND"
                                                    />
                                                </Form.Item>
                                            </Col>
                                            <Col span={3}>
                                                <Form.Item
                                                    {...field}
                                                    name={[field.name, "lv010"]}
                                                    style={{ marginBottom: 0 }}
                                                >
                                                    <DatePicker
                                                        format="DD/MM/YYYY"
                                                        style={{ width: "100%" }}
                                                        placeholder="Ngày GH"
                                                        size="middle"
                                                    />
                                                </Form.Item>
                                            </Col>
                                            <Col span={4}>
                                                <Form.Item
                                                    {...field}
                                                    name={[field.name, "lv015"]}
                                                    style={{ marginBottom: 0 }}
                                                >
                                                    <Input placeholder="Ghi chú" size="middle" />
                                                </Form.Item>
                                            </Col>
                                            <Col span={1} style={{ textAlign: "center", paddingTop: 4 }}>
                                                {fields.length > 1 && (
                                                    <Button
                                                        type="link"
                                                        danger
                                                        icon={<Trash2 size={16} />}
                                                        onClick={() => {
                                                            if (form === editForm) {
                                                                const currentDetails = editForm.getFieldValue("details");
                                                                const removedItem = currentDetails[field.name];
                                                                if (removedItem && removedItem.lv001) {
                                                                    setDeletedDetailIds(prev => [...prev, removedItem.lv001]);
                                                                }
                                                            }
                                                            remove(field.name);
                                                        }}
                                                        size="middle"
                                                        style={{ padding: 0 }}
                                                    />
                                                )}
                                            </Col>
                                        </Row>
                                    </div>
                                );
                            })}
                        </div>
                        <div style={{ marginTop: 12 }}>
                            <Button
                                type="dashed"
                                block
                                onClick={() => add({ lv004: 1, lv009: "VND", lv010: dayjs() })}
                                icon={<Plus size={16} />}
                            >
                                Thêm vật tư
                            </Button>
                        </div>

                        <Card className="phieu-mua-hang-summary-card" size="small" style={{ marginTop: 12 }}>
                            <Row gutter={16}>
                                <Col span={12}>
                                    <Space direction="vertical" size={4}>
                                        <Typography.Text type="secondary">
                                            Tổng số lượng đề nghị
                                        </Typography.Text>
                                        <Typography.Title level={4} style={{ margin: 0 }}>
                                            {Number(totalQuantity || 0).toLocaleString("vi-VN")}
                                        </Typography.Title>
                                    </Space>
                                </Col>
                                <Col span={12}>
                                    <Space direction="vertical" size={4}>
                                        <Typography.Text type="secondary">
                                            Tổng giá trị dự kiến
                                        </Typography.Text>
                                        <Typography.Title level={4} style={{ margin: 0 }}>
                                            {Number(totalAmount || 0).toLocaleString("vi-VN", {
                                                style: "currency",
                                                currency: "VND",
                                                maximumFractionDigits: 0,
                                            })}
                                        </Typography.Title>
                                    </Space>
                                </Col>
                            </Row>
                        </Card>
                    </div>
                )}
            </Form.List>
        );
    };

    const hasSelection = selectedRowKeys.length > 0;

    return (
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
            {/* Stats row */}
            <Row gutter={[16, 16]} className="dnvt-stats" style={{ width: '100%', margin: 0 }}>
                {[
                    { label: "Tổng phiếu", value: stats.total, cls: "dnvt-stat-total", icon: <ClipboardList size={18} /> },
                    { label: "Chờ xử lý", value: stats.choXuLy, cls: "dnvt-stat-cho", icon: <FileText size={18} /> },
                    { label: "Đã đề xuất", value: stats.deXuat, cls: "dnvt-stat-deXuat", icon: <ArrowRightLeft size={18} /> },
                    { label: "Đã duyệt", value: stats.daDuyet, cls: "dnvt-stat-duyet", icon: <CheckCircle2 size={18} /> },
                ].map((s) => (
                    <Col xs={12} sm={6} key={s.label}>
                        <Card className={`dnvt-stat-card ${s.cls}`} size="small">
                            <Statistic title={s.label} value={s.value} prefix={s.icon} />
                        </Card>
                    </Col>
                ))}
            </Row>

            <div className={styles.toolbarRow}>
                <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}>
                    <Space wrap size={16}>
                        <Text strong>{TAB_LABEL}</Text>
                        <Tag>{TAB_MODULE}</Tag>
                        <Text type="secondary">{filteredRecords.length} phiếu</Text>
                    </Space>
                    <Space wrap>
                        <Input
                            allowClear
                            prefix={<Search size={15} />}
                            placeholder="Tìm mã phiếu, kho, nội dung..."
                            value={filters.search}
                            onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
                            style={{ width: 250 }}
                        />
                        <Select
                            allowClear
                            placeholder="Lọc kho"
                            style={{ width: 140 }}
                            options={khoOptions}
                            value={filters.lv002}
                            onChange={(v) => setFilters((p) => ({ ...p, lv002: v }))}
                        />
                        <Select
                            allowClear
                            placeholder="Lọc trạng thái duyệt"
                            style={{ width: 150 }}
                            options={[
                                { value: "0", label: "Chờ đề xuất" },
                                { value: "1", label: "Đã đề xuất" },
                                { value: "2", label: "Đã duyệt" },
                                { value: "-1", label: "Bị từ chối" },
                            ]}
                            value={filters.lv027}
                            onChange={(v) => setFilters((p) => ({ ...p, lv027: v }))}
                        />
                        <Button icon={<RefreshCw size={16} />} onClick={fetchRecords} loading={loading}>Làm mới</Button>
                        {!!planId && (
                            <Button
                                type="primary"
                                icon={<Plus size={16} />}
                                onClick={openCreateModal}
                            >
                                Tạo đề nghị
                            </Button>
                        )}
                    </Space>
                </Space>
            </div>

            {!!planId && (
                <div className={`${styles.batchActionBar} ${!hasSelection ? styles.batchActionBarDisabled : ''}`}>
                    <span style={{ fontWeight: 600, color: hasSelection ? '#197dd3' : '#8c8c8c', marginRight: 8 }}>Thao tác:</span>
                    <Text><b>{selectedRowKeys.length}</b> phiếu đã chọn</Text>

                    <Button
                        icon={<Eye size={16} />}
                        disabled={selectedRowKeys.length !== 1}
                        type="primary"
                        ghost
                        onClick={handleViewDetail}
                    >
                        Xem chi tiết
                    </Button>

                    <Button
                        icon={<Edit3 size={16} />}
                        disabled={selectedRowKeys.length !== 1 || (selectedRowKeys.length === 1 && String(records.find(r => r.lv001 === selectedRowKeys[0])?.lv027) === "2")}
                        onClick={handleEdit}
                    >
                        Chỉnh sửa
                    </Button>

                    <Button
                        icon={<ShieldCheck size={16} />}
                        disabled={selectedRowKeys.length === 0 || selectedRowKeys.some(id => String(records.find(r => r.lv001 === id)?.lv027) !== "0")}
                        onClick={handleBatchApprove}
                    >
                        Đề xuất duyệt
                    </Button>

                    <Button
                        danger
                        icon={<Trash2 size={16} />}
                        disabled={selectedRowKeys.length === 0 || selectedRowKeys.some(id => String(records.find(r => r.lv001 === id)?.lv027) === "2")}
                        onClick={handleBatchDelete}
                    >
                        Xóa
                    </Button>
                </div>
            )}

            <Table
                rowKey="lv001"
                dataSource={filteredRecords}
                columns={columns}
                loading={loading}
                size="small"
                bordered
                scroll={{ x: 1100 }}
                rowSelection={planId ? {
                    selectedRowKeys,
                    onChange: setSelectedRowKeys,
                } : undefined}
                pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t) => `Tổng ${t} phiếu` }}
                onRow={(record) => ({
                    onDoubleClick: () => {
                        openDrawer(record);
                    }
                })}
            />

            {/* CREATE DRAWER */}
            <Drawer
                open={createOpen}
                title={
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <PackagePlus size={20} style={{ color: "#1677ff" }} />
                        <span>Tạo đề nghị vật tư </span>
                    </div>
                }
                width={860}
                onClose={() => { setCreateOpen(false); }}
                extra={
                    <Space>
                        <Button onClick={() => { setCreateOpen(false); }}>Huỷ</Button>
                        <Button
                            type="primary"
                            loading={createSubmitting}
                            onClick={handleSavePhieu}
                            className="dnvt-btn-primary"
                        >
                            Lưu phiếu đề nghị
                        </Button>
                    </Space>
                }
            >
                <Form
                    form={headerForm}
                    layout="vertical"
                    className="dnvt-form"
                    preserve={true}
                    initialValues={{
                        details: [
                            {
                                lv004: 1,
                            },
                        ],
                        lv009: dayjs(),
                    }}
                >
                    <HeaderFormFields form={headerForm} />
                    <Divider className="dnvt-divider" orientation="left">Danh sách vật tư đề nghị</Divider>
                    <DetailsFormList form={headerForm} />
                </Form>
            </Drawer>

            {/* EDIT DRAWER */}
            <Drawer
                open={editOpen}
                title={
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Edit3 size={18} style={{ color: "#fa8c16" }} />
                        <span>Sửa phiếu đề nghị – {editingHeader?.lv001}</span>
                    </div>
                }
                width={860}
                onClose={() => { setEditOpen(false); setDeletedDetailIds([]); }}
                extra={
                    <Space>
                        <Button onClick={() => { setEditOpen(false); setDeletedDetailIds([]); }}>Huỷ</Button>
                        <Button
                            type="primary"
                            loading={editSubmitting}
                            onClick={handleEditSubmit}
                            className="dnvt-btn-primary"
                        >
                            Cập nhật
                        </Button>
                    </Space>
                }
            >
                <Form form={editForm} layout="vertical" className="dnvt-form">
                    <HeaderFormFields form={editForm} />
                    <Divider className="dnvt-divider" orientation="left">Danh sách vật tư đề nghị</Divider>
                    <DetailsFormList form={editForm} />
                </Form>
            </Drawer>

            {/* DETAIL DRAWER */}
            <Drawer
                open={drawerOpen}
                onClose={() => {
                    setDrawerOpen(false);
                    setSelectedHeader(null);
                    setDetailRows([]);
                    setHistoryRows([]);
                }}
                width={1100}
                className="dnvt-drawer"
                title={
                    <div className="dnvt-drawer-title">
                        <FileText size={18} style={{ color: "#1677ff" }} />
                        <span>Chi tiết phiếu ĐNVT – {selectedHeader?.lv001}</span>
                        <TrangThaiDuyetTag value={selectedHeader?.lv027} />
                    </div>
                }
            >
                {selectedHeader && (
                    <div className="dnvt-header-info-card">
                        <Row gutter={[16, 8]}>
                            {[
                                { label: "Kho vật tư", value: (() => { const k = khoList.find(k => k.lv001 === selectedHeader.lv002); return k ? k.lv003 : selectedHeader.lv002; })() },
                                { label: "Ngày đề nghị", value: fmtDate(selectedHeader.lv009) },
                                { label: "Ngày cần nhận", value: fmtDate(selectedHeader.lv010) },
                                { label: "Người tạo", value: (() => { const nv = nhanVienList.find(n => n.lv001 === selectedHeader.lv117); return nv ? nv.lv002 : selectedHeader.lv117; })() },
                                { label: "Ngày tạo", value: fmtDateTime(selectedHeader.lv118) },
                                { label: "Loại cấp phát", value: selectedHeader.lv029 === "0" ? "Cấp phát" : "Lưu kho" },
                            ].map((item) => (
                                <Col xs={12} sm={8} key={item.label}>
                                    <span className="dnvt-info-label">{item.label}</span>
                                    <div className="dnvt-info-value">{item.value || "—"}</div>
                                </Col>
                            ))}
                        </Row>
                        {selectedHeader.lv004 && (
                            <div style={{ marginTop: 12, padding: "8px 12px", background: "#f0f8ff", borderRadius: 8, borderLeft: "3px solid #1677ff" }}>
                                <Typography.Text type="secondary" style={{ fontSize: 12 }}>Nội dung:</Typography.Text>
                                <div style={{ marginTop: 2, fontWeight: 500 }}>{selectedHeader.lv004}</div>
                            </div>
                        )}
                    </div>
                )}

                <Tabs
                    activeKey={drawerTab}
                    onChange={setDrawerTab}
                    className="dnvt-drawer-tabs"
                    items={[
                        {
                            key: "chitiet",
                            label: (
                                <span>
                                    <ClipboardList size={13} /> Chi tiết vật tư ({detailRows.length})
                                </span>
                            ),
                            children: (
                                <div style={{ paddingTop: 16 }}>
                                    <Table
                                        rowKey={(r) => r.lv001 ?? Math.random()}
                                        dataSource={detailRows}
                                        columns={detailColumns}
                                        loading={drawerLoading}
                                        size="small"
                                        pagination={false}
                                        scroll={{ x: 1100 }}
                                        locale={{ emptyText: <Empty description="Chưa có dòng vật tư nào." /> }}
                                        summary={(rows) => {
                                            const totalQty = rows.reduce((s, r) => s + Number(r.lv004 || 0), 0);
                                            const totalAmount = rows.reduce((s, r) => s + Number(r.lv004 || 0) * Number(r.lv008 || 0), 0);
                                            return totalQty > 0 ? (
                                                <Table.Summary.Row>
                                                    <Table.Summary.Cell colSpan={3} />
                                                    <Table.Summary.Cell align="right">
                                                        <strong style={{ color: "#1677ff" }}>SL: {totalQty.toLocaleString("vi-VN")}</strong>
                                                    </Table.Summary.Cell>
                                                    <Table.Summary.Cell colSpan={4} />
                                                    <Table.Summary.Cell align="right">
                                                        <strong style={{ color: "#d9363e" }}>
                                                            {fmtCurrency(totalAmount, rows[0]?.lv009)}
                                                        </strong>
                                                    </Table.Summary.Cell>
                                                    <Table.Summary.Cell colSpan={1} />
                                                </Table.Summary.Row>
                                            ) : null;
                                        }}
                                    />
                                </div>
                            )
                        },
                        {
                            key: "phieumuahang",
                            label: (
                                <span>
                                    <ClipboardList size={13} /> Phiếu mua hàng
                                </span>
                            ),
                            children: (
                                <div style={{ paddingTop: 16 }}>
                                    {pmhLoading ? (
                                        <div style={{ textAlign: "center", padding: "30px 0" }}><Spin /></div>
                                    ) : pmhInfo?.hasPMH === true ? (
                                        <Card
                                            size="small"
                                            title={
                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                    <span>Thông tin Phiếu Mua Hàng</span>
                                                    {pmhInfo.pmhData?.TTPMH !== "1" && (
                                                        <Button
                                                            size="small"
                                                            type="primary"
                                                            icon={<Edit3 size={14} />}
                                                            onClick={handleOpenEditPmh}
                                                        >
                                                            Sửa PMH
                                                        </Button>
                                                    )}
                                                </div>
                                            }
                                            style={{ backgroundColor: "#f0f5ff", borderColor: "#adc6ff" }}
                                        >
                                            <Row gutter={[16, 10]} style={{ padding: "8px 12px" }}>
                                                <Col xs={12} sm={8}><span className="dnvt-info-label">Mã PMH</span><div className="dnvt-info-value"><Tag color="cyan" style={{ fontWeight: 700 }}>{pmhInfo.pmhData?.PMH}</Tag></div></Col>
                                                <Col xs={12} sm={8}><span className="dnvt-info-label">Ngày mua hàng</span><div className="dnvt-info-value">{fmtDateTime(pmhInfo.pmhData?.NgayPMH)}</div></Col>
                                                <Col xs={12} sm={8}><span className="dnvt-info-label">Ngày giao hàng</span><div className="dnvt-info-value">{fmtDateTime(pmhInfo.pmhData?.NgayGiao)}</div></Col>
                                                <Col xs={12} sm={8}><span className="dnvt-info-label">Tỷ lệ thuế</span><div className="dnvt-info-value">{(pmhInfo.pmhData?.Thue || 0)} %</div></Col>
                                                <Col xs={12} sm={8}><span className="dnvt-info-label">Phương thức thanh toán</span><div className="dnvt-info-value">{pmhInfo.pmhData?.PTTT || "—"}</div></Col>
                                                <Col xs={12} sm={8}><span className="dnvt-info-label">Tổng tiền</span><div className="dnvt-info-value"><strong style={{ color: "#d9363e" }}>{Number(pmhInfo.pmhData?.TongTien || 0).toLocaleString("vi-VN")}</strong></div></Col>
                                                <Col xs={12} sm={8}><span className="dnvt-info-label">Tình trạng PMH</span><div className="dnvt-info-value"><Tag color={pmhInfo.pmhData?.TTPMH === "1" ? "green" : "gold"}>{pmhInfo.pmhData?.TTPMH === "1" ? "Đã xác nhận" : "Khởi tạo"}</Tag></div></Col>
                                                <Col xs={12} sm={8}><span className="dnvt-info-label">Phiếu nhập kho</span><div className="dnvt-info-value">{pmhInfo.pmhData?.PNK || "—"}</div></Col>
                                                <Col xs={12} sm={8}><span className="dnvt-info-label">Ngày nhập kho</span><div className="dnvt-info-value">{fmtDate(pmhInfo.pmhData?.NgayPNK)}</div></Col>
                                                {pmhInfo.pmhData?.GhiChu && (
                                                    <Col xs={24}><span className="dnvt-info-label">Ghi chú PMH</span><div className="dnvt-info-value" style={{ fontStyle: "italic", color: "#595959" }}>{pmhInfo.pmhData.GhiChu}</div></Col>
                                                )}
                                            </Row>
                                        </Card>
                                    ) : (
                                        <div style={{ textAlign: "center", padding: "32px 0" }}>
                                            <Empty description="Chưa biên soạn phiếu mua hàng cho vật tư này." />
                                        </div>
                                    )}
                                </div>
                            ),
                        },
                        {
                            key: "tailieu",
                            label: (
                                <span>
                                    <Paperclip size={13} /> Tài liệu ({documentRows.length})
                                </span>
                            ),
                            children: (
                                <div className="dnvt-document-tab">
                                    <div className="dnvt-upload-panel">
                                        <Typography.Text type="secondary">
                                            <ImageIcon size={14} /> Đính kèm hình ảnh minh họa cho phiếu đề nghị
                                        </Typography.Text>
                                        <Upload
                                            beforeUpload={handleUploadDocument}
                                            showUploadList={false}
                                            accept="image/*"
                                        >
                                            <Button icon={<UploadIcon size={14} />} type="primary" ghost>Tải lên</Button>
                                        </Upload>
                                    </div>

                                    <Table
                                        rowKey="lv001"
                                        dataSource={documentRows}
                                        loading={documentLoading}
                                        size="small"
                                        className="dnvt-doc-table"
                                        pagination={false}
                                        columns={[
                                            {
                                                title: "Xem",
                                                width: 100,
                                                align: "center",
                                                render: (doc) => (
                                                    <AntImage
                                                        src={getImageUrl(doc.lv005)}
                                                        width={40}
                                                        height={40}
                                                        className="dnvt-doc-preview-thumb"
                                                        fallback="https://placehold.co/100x100?text=No+Image"
                                                    />
                                                )
                                            },
                                            {
                                                title: "Tên file",
                                                dataIndex: "lv004",
                                                ellipsis: true,
                                            },
                                            {
                                                title: "Người đăng",
                                                dataIndex: "lv009",
                                                width: 120,
                                                render: (v) => nhanVienMap[v]?.lv002 || v
                                            },
                                            {
                                                title: "Ngày đăng",
                                                dataIndex: "lv010",
                                                width: 140,
                                                render: fmtDateTime
                                            },
                                            {
                                                title: "Thao tác",
                                                width: 80,
                                                align: "center",
                                                render: (doc) => (
                                                    <Popconfirm title="Xoá tài liệu này?" onConfirm={() => handleDeleteDocument(doc)}>
                                                        <Button type="link" danger icon={<Trash2 size={16} />} />
                                                    </Popconfirm>
                                                )
                                            }
                                        ]}
                                    />
                                </div>
                            )
                        },
                        {
                            key: "lichsu",
                            label: (
                                <span>
                                    <History size={13} /> Lịch sử duyệt ({historyRows.length})
                                </span>
                            ),
                            children: (
                                <div className="dnvt-timeline-wrap">
                                    {historyRows.length === 0 ? (
                                        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có lịch sử duyệt." />
                                    ) : (
                                        <Timeline mode="left" items={historyTimeline} />
                                    )}
                                </div>
                            )
                        }
                    ]}
                />
            </Drawer>

            <EditPhieuMuaHangDrawer
                open={editPmhDrawerOpen}
                onClose={() => {
                    setEditPmhDrawerOpen(false);
                    setEditPmhCode(null);
                }}
                maPMH={editPmhCode}
                onSaveSuccess={async () => {
                    if (selectedHeader) {
                        await fetchDrawerData(selectedHeader.lv001);
                    }
                }}
            />
        </Space>
    );
};

export default DeNghiVatTuTab;
