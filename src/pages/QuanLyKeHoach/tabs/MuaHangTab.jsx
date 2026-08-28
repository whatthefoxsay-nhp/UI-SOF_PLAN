import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Button, Drawer, Empty, Form, Input, InputNumber,
    Modal, Space, Table, Tag, Tooltip, Typography, message,
    DatePicker, Row, Col, Card, Statistic, Divider, Popconfirm,
    Tabs, Upload, Spin, Select,
} from 'antd';
import dayjs from 'dayjs';
import * as XLSX from "xlsx";
import {
    Plus, RefreshCw, Trash2,
    Eye, Edit, FileText, ClipboardList, FileDown as FileDownIcon,
    Upload as UploadIcon
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import {
    PaymentScheduleTab,
    PurchaseQaTab,
    WarehouseReceiptTab,
    HrWarehouseReceiptTab,
} from './muaHangDetail/PurchaseChildModule';
import {
    execCRUD,
    createPhieuMuaHang,
    deletePhieuMuaHang,
    updatePhieuMuaHang,
    getPhieuMuaHangById,
    listChiTietPhieuMuaHang,
    listNhaCungCap,
    getAllSanPham,
    getDanhSachKho,
    loadTienTe,
    loadDonVi
} from '../../../services/apiServices';
import { toMySQLDate } from '../../../utils/helpers';
import { getDefaultWarehouseCode } from "../../../constants/warehouseConfig";
import PhieuChiTabUI from '../../PhieuMuaHang/PhieuChiTabUI';
import SelectDonVi from '../../../components/DropDown/SelectDonVi';
import SelectPhieuDNVT from '../../../components/DropDown/SelectPhieuDNVT';
import styles from '../QuanLyKeHoach.module.css';
import '../../PhieuMuaHang/PhieuMuaHang.css';

const { Text } = Typography;
const { RangePicker } = DatePicker;

// ── CONSTANTS ──────────────────────────────────────────────────────────────
const CHILD_KEY = 'purchase';
const TAB_LABEL = 'Mua hàng';
const TAB_MODULE = 'wh_lv0021/wh_lv0021-1.php';

// ── HELPERS ─────────────────────────────────────────────────────────────────
const parseDateValue = (value) => {
    if (!value) return null;
    if (dayjs.isDayjs(value)) return value;
    if (value instanceof Date) return dayjs(value);
    const str = String(value);
    if (/^\d{14}$/.test(str)) return dayjs(str, "YYYYMMDDHHmmss");
    if (/^\d{8}$/.test(str)) return dayjs(str, "YYYYMMDD");
    const parsed = dayjs(str);
    return parsed.isValid() ? parsed : null;
};

const formatDateValue = (value) => {
    const parsed = parseDateValue(value);
    return parsed ? parsed.format("DD/MM/YYYY HH:mm") : "";
};

const formatDateOnlyValue = (value) => {
    const parsed = parseDateValue(value);
    return parsed ? parsed.format("DD/MM/YYYY") : "";
};

const formatCurrency = (value, currencyCode) => {
    let code = currencyCode || "VND";
    if (!code || typeof code !== 'string' || code.length !== 3) {
        code = "VND";
    }
    return Number(value || 0).toLocaleString("vi-VN", {
        style: "currency",
        currency: code,
        maximumFractionDigits: code === "VND" ? 0 : 2,
    });
};

const normalizePurchaseOrder = (item) => ({
    maPhieuMuaHang: item?.maPhieuMuaHang ?? item?.maPMH ?? item?.lv001 ?? item?.id ?? "",
    phieuDNVT: item?.phieuDNVT ?? item?.lv088 ?? "",
    maNhomDonHang: item?.maNhomDonHang ?? item?.lv087 ?? "",
    maPMH: item?.maPMH ?? item?.lv001 ?? "",
    pbhSo: item?.pbhSo ?? item?.lv089 ?? "",
    tenDuAn: item?.tenDuAn ?? item?.lv114 ?? "", 
    nhaCungCap: item?.nhaCungCap ?? item?.supplier_name ?? item?.lv008 ?? item?.lv002 ?? "",
    maNCC: item?.maNCC ?? item?.lv002 ?? "",
    maKho: item?.maKho ?? item?.lv102 ?? item?.lv003 ?? "",
    ngayMua: item?.ngayMua ?? item?.lv004 ?? item?.lv009 ?? "",
    ghiChu: item?.ghiChu ?? item?.lv009 ?? item?.lv010 ?? "",
    tongTien: Number(item?.tongTien ?? item?.total_amount ?? item?.lv012 ?? 0),
});

const normalizeDetail = (item) => ({
    maNCC: item?.maNCC ?? "",
    maBOM: item?.maBOM ?? "",
    soLuongMua: Number(item?.soLuongMua ?? 0),
    dvt: item?.dvt ?? "",
    donGia: Number(item?.donGia ?? 0),
    donViTien: (item?.donViTien && item.donViTien.length === 3) ? item.donViTien : "VND",
    moTa: item?.moTa ?? "",
    pbh: item?.pbh ?? "",
    ngayGiaoHang: item?.ngayGiaoHang ?? "",
});

// ── MAIN COMPONENT ──────────────────────────────────────────────────────────
const MuaHangTab = ({ detailData, onRefresh }) => {
    const planId = detailData?.plan?.lv001;
    const { hasPermission } = useAuth();
    const MODULE_CODE = "Wh0021"; // Purchase Orders

    // ── STATE ──────────────────────────────────────────────────────────────
    const [loading, setLoading] = useState(false);
    const [purchaseOrders, setPurchaseOrders] = useState([]);
    const [filteredOrders, setFilteredOrders] = useState([]);
    const [selectedRowKeys, setSelectedRowKeys] = useState([]);
    const hasSelection = selectedRowKeys.length > 0;

    const [filters, setFilters] = useState({
        search: "",
        dateRange: null,
        nhaCungCap: undefined,
    });

    // Master data
    const [suppliers, setSuppliers] = useState([]);
    const [suppliersLoading, setSuppliersLoading] = useState(false);
    const [products, setProducts] = useState([]);
    const [productsLoading, setProductsLoading] = useState(false);
    const [warehouses, setWarehouses] = useState([]);
    const [warehousesLoading, setWarehousesLoading] = useState(false);
    const [currencies, setCurrencies] = useState([]);
    const [currenciesLoading, setCurrenciesLoading] = useState(false);
    const [units, setUnits] = useState([]);
    const [unitsLoading, setUnitsLoading] = useState(false);

    // Create PO
    const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
    const [createSubmitting, setCreateSubmitting] = useState(false);
    const [createForm] = Form.useForm();
    const createDetailsWatch = Form.useWatch("details", createForm);

    // Edit PO
    const [editDrawerOpen, setEditDrawerOpen] = useState(false);
    const [editPmhCode, setEditPmhCode] = useState(null);
    const [editLoading, setEditLoading] = useState(false);
    const [editSubmitting, setEditSubmitting] = useState(false);
    const [editForm] = Form.useForm();
    const [editOriginalDetails, setEditOriginalDetails] = useState([]);

    // Detail PO view
    const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [orderDetails, setOrderDetails] = useState([]);
    const [detailForm] = Form.useForm();
    const [detailSubmitting, setDetailSubmitting] = useState(false);
    const detailDetailsWatch = Form.useWatch("details", detailForm);



    // ── SYNC DATA ──────────────────────────────────────────────────────────
    useEffect(() => {
        const raw = detailData?.tabs?.[CHILD_KEY] ?? detailData?.[CHILD_KEY] ?? [];
        setPurchaseOrders(Array.isArray(raw) ? raw.map(normalizePurchaseOrder) : []);
        setSelectedRowKeys([]);
    }, [detailData]);

    // ── MASTER DATA FETCHING ────────────────────────────────────────────────
    const fetchSuppliers = useCallback(async () => {
        setSuppliersLoading(true);
        try {
            const data = await listNhaCungCap();
            setSuppliers(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error(error);
            message.error("Không thể tải danh sách nhà cung cấp.");
        } finally {
            setSuppliersLoading(false);
        }
    }, []);

    const fetchWarehouses = useCallback(async () => {
        setWarehousesLoading(true);
        try {
            const data = await getDanhSachKho();
            setWarehouses(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error(error);
            message.error("Không thể tải danh sách kho.");
        } finally {
            setWarehousesLoading(false);
        }
    }, []);

    const fetchAllProducts = useCallback(async () => {
        setProductsLoading(true);
        try {
            const data = await getAllSanPham();
            setProducts(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error(error);
            message.error("Không thể tải danh sách sản phẩm.");
        } finally {
            setProductsLoading(false);
        }
    }, []);

    const fetchUnits = useCallback(async () => {
        setUnitsLoading(true);
        try {
            const data = await loadDonVi();
            setUnits(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error(error);
            message.error("Không thể tải danh sách đơn vị.");
        } finally {
            setUnitsLoading(false);
        }
    }, []);

    const fetchCurrencies = useCallback(async () => {
        setCurrenciesLoading(true);
        try {
            const data = await loadTienTe();
            setCurrencies(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error(error);
            message.error("Không thể tải danh sách tiền tệ.");
        } finally {
            setCurrenciesLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSuppliers();
        fetchWarehouses();
        fetchAllProducts();
        fetchCurrencies();
        fetchUnits();
    }, [fetchSuppliers, fetchWarehouses, fetchAllProducts, fetchCurrencies, fetchUnits]);

    // ── OPTIONS ─────────────────────────────────────────────────────────────
    const supplierOptions = useMemo(
        () => suppliers.map((item) => ({
            label: `${item?.tenNCC || item?.maNCC} (${item?.maNCC})`,
            value: item?.maNCC,
        })),
        [suppliers]
    );

    const warehouseOptions = useMemo(
        () => warehouses.map((item) => ({
            label: `${item?.tenKho || item?.maKho} (${item?.maKho})`,
            value: item?.maKho || item?.lv001,
        })),
        [warehouses]
    );

    const currencyOptions = useMemo(
        () => currencies.map((item) => {
            const code = item?.lv001 || "";
            const name = item?.lv002 || "";
            return {
                label: name || code,
                value: code || name,
            };
        }),
        [currencies]
    );

    const productOptions = useMemo(
        () => products.map((item) => ({
            label: `${item?.maSp || item?.lv001} - ${item?.tenSp || item?.lv002}`,
            value: item?.maSp || item?.lv001 || "",
            data: item,
        })),
        [products]
    );

    const planTasksOptions = useMemo(() => {
        const tasks = detailData?.tabs?.tasks ?? detailData?.tasks ?? [];
        return tasks.map(t => ({
            label: `${t.lv001} - ${t.lv004 || ''}`,
            value: t.lv001
        }));
    }, [detailData]);

    const productMap = useMemo(() => {
        const map = {};
        products.forEach((p) => {
            map[p.maSp || p.lv001] = p;
        });
        return map;
    }, [products]);

    const getWarehouseName = (code) => {
        if (!code) return "—";
        const warehouse = warehouses.find(
            (w) => w.maKho === code || w.lv001 === code
        );
        return warehouse ? warehouse.tenKho || warehouse.lv003 : code;
    };

    // ── FILTERS ─────────────────────────────────────────────────────────────
    useEffect(() => {
        let data = [...purchaseOrders];

        if (filters.nhaCungCap) {
            data = data.filter((item) => item.maNCC === filters.nhaCungCap || item.nhaCungCap === filters.nhaCungCap);
        }

        if (filters.search) {
            const keyword = filters.search.trim().toLowerCase();
            data = data.filter((item) => {
                const values = [
                    item.maPhieuMuaHang,
                    item.maPMH,
                    item.phieuDNVT,
                    item.tenDuAn,
                    item.nhaCungCap,
                ]
                    .filter(Boolean)
                    .map((value) => String(value).toLowerCase());
                return values.some((value) => value.includes(keyword));
            });
        }

        if (filters.dateRange && filters.dateRange.length === 2) {
            const [start, end] = filters.dateRange;
            data = data.filter((item) => {
                const date = parseDateValue(item.ngayMua);
                if (!date) return false;
                const inclusiveEnd = end ? end.endOf("day") : end;
                return date.isBetween(start.startOf("day"), inclusiveEnd, null, "[]");
            });
        }

        setFilteredOrders(data);
    }, [filters, purchaseOrders]);

    const handleFilterChange = (field, value) => {
        setFilters((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const orderStats = useMemo(() => {
        const total = filteredOrders.length;
        const totalAmount = filteredOrders.reduce(
            (sum, item) => sum + (item?.tongTien || 0),
            0
        );
        return { total, totalAmount };
    }, [filteredOrders]);

    const getDraftTotal = (detailsWatch) => {
        if (!detailsWatch || !Array.isArray(detailsWatch)) return 0;
        return detailsWatch.reduce((sum, item) => {
            const qty = Number(item?.soLuongMua || 0);
            const price = Number(item?.donGia || 0);
            return sum + qty * price;
        }, 0);
    };

    const getDraftQuantity = (detailsWatch) => {
        if (!detailsWatch || !Array.isArray(detailsWatch)) return 0;
        return detailsWatch.reduce(
            (sum, item) => sum + Number(item?.soLuongMua || 0),
            0
        );
    };

    const handleSelectProduct = (formInstance, index, productCode, option) => {
        const product = option?.data;
        if (!product) return;

        formInstance.setFieldValue(["details", index, "maBOM"], productCode);
        formInstance.setFieldValue(["details", index, "dvt"], product.dvt || "");
        formInstance.setFieldValue(["details", index, "donGia"], Number(product.giaBan || 0));
        formInstance.setFieldValue(["details", index, "moTa"], product.moTa || "");
        formInstance.setFieldValue(["details", index, "donViTien"], "VND");
    };

    const handleSupplierChange = (formInstance, value) => {
        formInstance.setFieldsValue({ nhaCungCap: value });
    };

    const handleDownloadTemplate = () => {
        const link = document.createElement("a");
        link.href = "/templates/MAU_PHIEU_MUA_HANG.xlsx";
        link.download = "MAU_PHIEU_MUA_HANG.xlsx";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleImportExcel = (formInstance, info) => {
        const file = info.file;
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: "array", cellDates: true });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);

                if (!jsonData || jsonData.length === 0) {
                    message.warning("File Excel không có dữ liệu hoặc sai định dạng.");
                    return;
                }

                const missingProducts = [];
                const newDetails = jsonData.map((row) => {
                    const maSp = String(row["Mã Sản Phẩm"] || "").trim();
                    if (!maSp) return null;

                    const product = productMap[maSp];
                    if (!product) {
                        missingProducts.push(maSp);
                        return null;
                    }

                    const excelUnit = String(row["Đơn vị 1"] || "").trim();
                    let finalUnit = product.maDv || product.lv004 || "";
                    if (excelUnit) {
                        const foundUnit = units.find(u => 
                            String(u.tenDonVi || "").toLowerCase() === excelUnit.toLowerCase() || 
                            String(u.maDonVi || "").toLowerCase() === excelUnit.toLowerCase()
                        );
                        if (foundUnit) finalUnit = foundUnit.maDonVi;
                    }

                    let deliveryDate = dayjs();
                    if (row["Ngày giao hàng"]) {
                        const parsedDate = dayjs(row["Ngày giao hàng"]);
                        if (parsedDate.isValid()) {
                            deliveryDate = parsedDate;
                        }
                    }

                    return {
                        maBOM: maSp,
                        soLuongMua: Number(row["Số lượng 1"] || 0),
                        dvt: finalUnit,
                        donGia: Number(row["Giá"] || product.giaBan || 0),
                        donViTien: row["Đơn Giá"] || "VND",
                        moTa: row["Ghi chú"] || row["Mô tả"] || "",
                        ngayGiaoHang: deliveryDate,
                    };
                }).filter(Boolean);

                if (missingProducts.length > 0) {
                    Modal.error({
                        title: "Không tìm thấy sản phẩm",
                        content: (
                            <div>
                                <p>Các mã sản phẩm sau không tồn tại trong hệ thống:</p>
                                <div style={{ maxHeight: '200px', overflowY: 'auto', background: '#f5f5f5', padding: '8px', borderRadius: '4px' }}>
                                    {missingProducts.map(code => <Tag key={code} color="red" style={{ marginBottom: '4px' }}>{code}</Tag>)}
                                </div>
                            </div>
                        ),
                    });
                }

                if (newDetails.length === 0) return;

                const currentDetails = formInstance.getFieldValue("details") || [];
                const filteredCurrent = currentDetails.filter(d => d.maBOM);
                
                formInstance.setFieldsValue({
                    details: [...filteredCurrent, ...newDetails]
                });

                message.success(`Đã nhập thành công ${newDetails.length} sản phẩm.`);
            } catch (error) {
                console.error("Import error:", error);
                message.error("Có lỗi xảy ra khi đọc file Excel.");
            }
        };

        reader.readAsArrayBuffer(file);
        return false;
    };

    // ── CREATE PO ACTIONS ───────────────────────────────────────────────────
    const resetCreateForm = () => {
        createForm.resetFields();
        createForm.setFieldsValue({
            details: [
                {
                    soLuongMua: 1,
                    donViTien: "VND",
                    ngayGiaoHang: dayjs(),
                },
            ],
            ngayMua: dayjs(),
            maKho: getDefaultWarehouseCode() || undefined,
            lv114: planTasksOptions?.[0]?.value || undefined, 
        });
    };

    const openCreateDrawer = () => {
        if (!hasPermission(MODULE_CODE, "Add")) {
            message.error("Bạn không có quyền tạo phiếu mua hàng");
            return;
        }
        resetCreateForm();
        setCreateDrawerOpen(true);
    };

    const handleSaveOrder = async () => {
        try {
            if (!hasPermission(MODULE_CODE, "Add")) {
                message.error("Bạn không có quyền tạo phiếu mua hàng");
                return;
            }

            const values = await createForm.validateFields();
            if (!values.details || values.details.length === 0) {
                message.warning("Vui lòng thêm ít nhất một sản phẩm.");
                return;
            }

            setCreateSubmitting(true);

            const detailsPayload = values.details.map((detail) => ({
                maBOM: detail.maBOM || "",
                soLuong: Number(detail.soLuongMua || 0),
                dvt: detail.dvt || "",
                gia: Number(detail.donGia || 0),
                donViGia: detail.donViTien || "VND",
                moTa: detail.moTa || "",
                pbh: detail.pbh || "",
                ngayGiaoHang: detail.ngayGiaoHang
                    ? toMySQLDate(detail.ngayGiaoHang, "date")
                    : "",
            }));

            const tongTien = detailsPayload.reduce(
                (sum, item) => sum + (item.soLuong || 0) * (item.gia || 0),
                0
            );

            const payload = {
                nhaCungCap: values.nhaCungCap || "",
                maNCC: values.nhaCungCap || "", 
                ghiChu: values.ghiChu || "",
                ngayMua: values.ngayMua ? toMySQLDate(values.ngayMua, "datetime") : "",
                tongTien,
                maKho: values.maKho || "",
                phieuDNVT: values.phieuDNVT || "",
                lv114: values.lv114 || "", 
                details: detailsPayload,
            };

            await createPhieuMuaHang(payload);
            message.success("Tạo phiếu mua hàng thành công.");

            setCreateDrawerOpen(false);
            if (onRefresh) await onRefresh();
        } catch (error) {
            if (error?.errorFields) return;
            console.error(error);
            message.error("Không thể lưu phiếu mua hàng, vui lòng thử lại.");
        } finally {
            setCreateSubmitting(false);
        }
    };

    // ── EDIT PO ACTIONS ─────────────────────────────────────────────────────
    const openEditDrawer = (record) => {
        if (!hasPermission(MODULE_CODE, "Edit")) {
            message.error("Bạn không có quyền cập nhật phiếu mua hàng");
            return;
        }
        setEditPmhCode(record?.maPhieuMuaHang || record?.maPMH);
        setEditDrawerOpen(true);
    };

    useEffect(() => {
        const loadOrderData = async () => {
            if (!editDrawerOpen || !editPmhCode) return;
            setEditLoading(true);
            try {
                const header = await getPhieuMuaHangById(editPmhCode);
                const normalizedHeader = header ? normalizePurchaseOrder(header) : {};
                const detailResponse = await listChiTietPhieuMuaHang(editPmhCode);
                const details = Array.isArray(detailResponse)
                    ? detailResponse.map(normalizeDetail)
                    : [];

                setEditOriginalDetails(details);

                editForm.setFieldsValue({
                    nhaCungCap: normalizedHeader.maNCC || undefined,
                    maKho: normalizedHeader.maKho || undefined,
                    phieuDNVT: normalizedHeader.phieuDNVT || undefined,
                    lv114: normalizedHeader.tenDuAn || undefined, 
                    ngayMua: parseDateValue(normalizedHeader.ngayMua) || dayjs(),
                    ghiChu: normalizedHeader.ghiChu || "",
                });
            } catch (error) {
                console.error(error);
                message.error("Không thể tải dữ liệu phiếu mua hàng để sửa.");
                setEditDrawerOpen(false);
            } finally {
                setEditLoading(false);
            }
        };

        loadOrderData();
    }, [editDrawerOpen, editPmhCode, editForm]);

    const handleUpdateOrder = async () => {
        try {
            if (!hasPermission(MODULE_CODE, "Edit")) {
                message.error("Bạn không có quyền cập nhật phiếu mua hàng");
                return;
            }

            const values = await editForm.validateFields();
            setEditSubmitting(true);

            const detailsPayload = editOriginalDetails.map((detail) => ({
                maBOM: detail.maBOM || "",
                soLuong: Number(detail.soLuongMua || 0),
                dvt: detail.dvt || "",
                gia: Number(detail.donGia || 0),
                donViGia: detail.donViTien || "VND",
                moTa: detail.moTa || "",
                pbh: detail.pbh || "",
                ngayGiaoHang: detail.ngayGiaoHang
                    ? toMySQLDate(parseDateValue(detail.ngayGiaoHang), "date")
                    : "",
            }));

            const tongTien = detailsPayload.reduce(
                (sum, item) => sum + (item.soLuong || 0) * (item.gia || 0),
                0
            );

            const payload = {
                nhaCungCap: values.nhaCungCap || "",
                maNCC: values.nhaCungCap || "",
                ghiChu: values.ghiChu || "",
                ngayMua: values.ngayMua ? toMySQLDate(values.ngayMua, "datetime") : "",
                tongTien,
                maKho: values.maKho || "",
                phieuDNVT: values.phieuDNVT || "",
                tenDuAn: values.lv114 || "", 
                details: detailsPayload,
                maPhieuMuaHang: editPmhCode,
            };

            await updatePhieuMuaHang(payload);
            message.success("Cập nhật phiếu mua hàng thành công.");

            setEditDrawerOpen(false);
            setEditPmhCode(null);
            if (onRefresh) await onRefresh();
        } catch (error) {
            if (error?.errorFields) return;
            console.error(error);
            message.error("Không thể lưu phiếu mua hàng, vui lòng thử lại.");
        } finally {
            setEditSubmitting(false);
        }
    };

    // ── DELETE PO ACTIONS ───────────────────────────────────────────────────
    const handleBatchDelete = async () => {
        if (!hasPermission(MODULE_CODE, "Del")) {
            message.error("Bạn không có quyền xóa phiếu mua hàng");
            return;
        }
        setLoading(true);
        try {
            let successCount = 0;
            let failCount = 0;
            for (const key of selectedRowKeys) {
                const res = await deletePhieuMuaHang(key);
                if (res && res.success !== false) {
                    successCount++;
                } else {
                    failCount++;
                }
            }
            if (successCount > 0) {
                message.success(`Đã xoá thành công ${successCount} phiếu mua hàng.`);
            }
            if (failCount > 0) {
                message.error(`Không thể xoá ${failCount} phiếu mua hàng.`);
            }
            setSelectedRowKeys([]);
            if (onRefresh) await onRefresh();
        } catch (error) {
            console.error(error);
            message.error("Không thể xoá các phiếu đã chọn, vui lòng thử lại.");
        } finally {
            setLoading(false);
        }
    };

    // ── DETAILS VIEW ACTIONS ────────────────────────────────────────────────
    const openDetailDrawer = async (record) => {
        setSelectedOrder(null);
        setOrderDetails([]);
        detailForm.resetFields();
        setDetailDrawerOpen(true);
        setDetailLoading(true);

        try {
            const header = await getPhieuMuaHangById(
                record?.maPhieuMuaHang || record?.maPMH
            );
            if (header) {
                setSelectedOrder(normalizePurchaseOrder(header));
            } else {
                setSelectedOrder(record);
            }

            const detailResponse = await listChiTietPhieuMuaHang(
                record?.maPhieuMuaHang || record?.maPMH
            );
            const details = Array.isArray(detailResponse)
                ? detailResponse.map(normalizeDetail)
                : [];
            setOrderDetails(details);
            
            // Map details for Form.List
            const formDetails = details.map((item) => ({
                ...item,
                ngayGiaoHang: parseDateValue(item.ngayGiaoHang) || dayjs(),
            }));
            detailForm.setFieldsValue({ details: formDetails });
        } catch (error) {
            console.error(error);
            message.error("Không thể tải chi tiết phiếu mua hàng.");
        } finally {
            setDetailLoading(false);
        }
    };

    const closeDetailDrawer = () => {
        setDetailDrawerOpen(false);
        setSelectedOrder(null);
        setOrderDetails([]);
        detailForm.resetFields();
    };

    const handleSaveDetailChanges = async () => {
        try {
            if (!hasPermission(MODULE_CODE, "Edit")) {
                message.error("Bạn không có quyền cập nhật chi tiết phiếu mua hàng.");
                return;
            }

            const values = await detailForm.validateFields();
            setDetailSubmitting(true);

            const details = values.details || [];
            
            const detailsPayload = details.map((detail) => ({
                maBOM: detail.maBOM || "",
                soLuong: Number(detail.soLuongMua || 0),
                dvt: detail.dvt || "",
                gia: Number(detail.donGia || 0),
                donViGia: detail.donViTien || "VND",
                moTa: detail.moTa || "",
                pbh: detail.pbh || "",
                ngayGiaoHang: detail.ngayGiaoHang
                    ? toMySQLDate(parseDateValue(detail.ngayGiaoHang), "date")
                    : "",
            }));

            const tongTien = detailsPayload.reduce(
                (sum, item) => sum + (item.soLuong || 0) * (item.gia || 0),
                0
            );

            const header = selectedOrder;
            const payload = {
                maPhieuMuaHang: header.maPMH || header.maPhieuMuaHang,
                nhaCungCap: header.maNCC || header.nhaCungCap,
                maNCC: header.maNCC || header.nhaCungCap,
                ghiChu: header.ghiChu || "",
                ngayMua: header.ngayMua ? toMySQLDate(parseDateValue(header.ngayMua), "datetime") : "",
                tongTien,
                maKho: header.maKho || "",
                phieuDNVT: header.phieuDNVT || "",
                tenDuAn: header.tenDuAn || "", 
                details: detailsPayload,
            };

            await updatePhieuMuaHang(payload);
            message.success("Lưu chi tiết phiếu mua hàng thành công.");

            // Refresh local detail state
            const freshHeader = await getPhieuMuaHangById(payload.maPhieuMuaHang);
            if (freshHeader) {
                setSelectedOrder(normalizePurchaseOrder(freshHeader));
            }
            const freshDetails = await listChiTietPhieuMuaHang(payload.maPhieuMuaHang);
            const normalizedFreshDetails = Array.isArray(freshDetails) ? freshDetails.map(normalizeDetail) : [];
            setOrderDetails(normalizedFreshDetails);

            // Update form with fresh data
            const formDetails = normalizedFreshDetails.map((item) => ({
                ...item,
                ngayGiaoHang: parseDateValue(item.ngayGiaoHang) || dayjs(),
            }));
            detailForm.setFieldsValue({ details: formDetails });

            // Refresh parent table
            if (onRefresh) await onRefresh();
        } catch (error) {
            if (error?.errorFields) return;
            console.error(error);
            message.error("Không thể lưu chi tiết phiếu mua hàng, vui lòng thử lại.");
        } finally {
            setDetailSubmitting(false);
        }
    };



    // ── RENDER GENERAL PO FIELDS ─────────────────────────────────────────────
    const renderHeaderFields = (formInstance) => (
        <Row gutter={12}>
            <Col flex="1 1 200px">
                <Form.Item
                    label="Nhà cung cấp"
                    name="nhaCungCap"
                    rules={[{ required: true, message: "Vui lòng chọn nhà cung cấp" }]}
                >
                    <Select
                        placeholder="Chọn nhà cung cấp"
                        options={supplierOptions}
                        showSearch
                        optionFilterProp="label"
                        loading={suppliersLoading}
                        onChange={(val) => handleSupplierChange(formInstance, val)}
                        size="middle"
                    />
                </Form.Item>
            </Col>
            <Col flex="1 1 180px">
                <Form.Item
                    label="Nhập vào kho"
                    name="maKho"
                    rules={[{ required: true, message: "Vui lòng chọn kho" }]}
                >
                    <Select
                        placeholder="Chọn kho nhập hàng"
                        options={warehouseOptions}
                        loading={warehousesLoading}
                        showSearch
                        optionFilterProp="label"
                        size="middle"
                    />
                </Form.Item>
            </Col>
            <Col flex="1 1 180px">
                <Form.Item label="Phiếu đề nghị vật tư" name="phieuDNVT">
                    <SelectPhieuDNVT placeholder="Chọn đề nghị vật tư" size="middle" allowClear />
                </Form.Item>
            </Col>
            <Col flex="1 1 180px">
                <Form.Item
                    label="Liên kết Công việc"
                    name="lv114"
                    rules={[{ required: true, message: "Vui lòng liên kết với một Công việc" }]}
                >
                    <Select
                        placeholder="Chọn Công việc..."
                        options={planTasksOptions}
                        showSearch
                        optionFilterProp="label"
                        size="middle"
                    />
                </Form.Item>
            </Col>
            <Col flex="1 1 180px">
                <Form.Item label="Ngày mua" name="ngayMua">
                    <DatePicker
                        format="DD/MM/YYYY HH:mm"
                        showTime
                        style={{ width: "100%" }}
                        size="middle"
                    />
                </Form.Item>
            </Col>
            <Col flex="2 1 300px">
                <Form.Item label="Ghi chú" name="ghiChu">
                    <Input placeholder="Thông tin bổ sung cho phiếu mua hàng" size="middle" />
                </Form.Item>
            </Col>
        </Row>
    );

    // ── RENDER DYNAMIC FORM FIELDS ──────────────────────────────────────────
    const renderFormFields = (formInstance, detailsWatch) => (
        <>
            {renderHeaderFields(formInstance)}

            <Divider orientation="left">Chi tiết phiếu mua hàng</Divider>
            <Form.List name="details">
                {(fields, { add, remove }) => (
                    <div className="phieu-mua-hang-details-wrapper">
                        <div className="phieu-mua-hang-detail-header">
                            <Row gutter={8}>
                                <Col span={6}>
                                    <Typography.Text strong>Sản phẩm</Typography.Text>
                                </Col>
                                <Col span={2}>
                                    <Typography.Text strong>SL</Typography.Text>
                                </Col>
                                <Col span={3}>
                                    <Typography.Text strong>ĐVT</Typography.Text>
                                </Col>
                                <Col span={3}>
                                    <Typography.Text strong>Đơn giá</Typography.Text>
                                </Col>
                                <Col span={2}>
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
                        <div className="phieu-mua-hang-fields-list">
                            {fields.map((field, index) => (
                                <div key={field.key} className="phieu-mua-hang-detail-row">
                                    <Row gutter={8} align="top">
                                        <Col span={6}>
                                            <Form.Item
                                                {...field}
                                                name={[field.name, "maBOM"]}
                                                rules={[{ required: true, message: "Chọn SP" }]}
                                            >
                                                <Select
                                                    placeholder="Sản phẩm"
                                                    options={productOptions}
                                                    showSearch
                                                    optionFilterProp="label"
                                                    loading={productsLoading}
                                                    onChange={(val, option) =>
                                                        handleSelectProduct(formInstance, field.name, val, option)
                                                    }
                                                    size="middle"
                                                />
                                            </Form.Item>
                                        </Col>
                                        <Col span={2}>
                                            <Form.Item
                                                {...field}
                                                name={[field.name, "soLuongMua"]}
                                                rules={[{ required: true, message: "Nhập SL" }]}
                                            >
                                                <InputNumber
                                                    min={0}
                                                    style={{ width: "100%" }}
                                                    placeholder="SL"
                                                    size="middle"
                                                />
                                            </Form.Item>
                                        </Col>
                                        <Col span={3}>
                                            <Form.Item
                                                {...field}
                                                name={[field.name, "dvt"]}
                                                rules={[{ required: true, message: "Chọn ĐVT" }]}
                                            >
                                                <SelectDonVi placeholder="ĐVT" size="middle" />
                                            </Form.Item>
                                        </Col>
                                        <Col span={3}>
                                            <Form.Item
                                                {...field}
                                                name={[field.name, "donGia"]}
                                                rules={[{ required: true, message: "Nhập giá" }]}
                                            >
                                                <InputNumber
                                                    min={0}
                                                    style={{ width: "100%" }}
                                                    placeholder="Giá"
                                                    size="middle"
                                                    formatter={(v) => v ? `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : ""}
                                                    parser={(v) => v.replace(/,/g, "")}
                                                />
                                            </Form.Item>
                                        </Col>
                                        <Col span={2}>
                                            <Form.Item
                                                {...field}
                                                name={[field.name, "donViTien"]}
                                            >
                                                <Select
                                                    size="middle"
                                                    options={currencyOptions}
                                                    loading={currenciesLoading}
                                                    placeholder="Tệ"
                                                />
                                            </Form.Item>
                                        </Col>
                                        <Col span={3}>
                                            <Form.Item
                                                {...field}
                                                name={[field.name, "ngayGiaoHang"]}
                                                rules={[
                                                    {
                                                        validator: (_, value) => {
                                                            const ngayMua = formInstance.getFieldValue("ngayMua");
                                                            if (value && ngayMua && value.isBefore(ngayMua, "day")) {
                                                                return Promise.reject(new Error(">= Ngày mua"));
                                                            }
                                                            return Promise.resolve();
                                                        },
                                                    },
                                                ]}
                                            >
                                                <DatePicker
                                                    format="DD/MM/YYYY"
                                                    style={{ width: "100%" }}
                                                    placeholder="Ngày GH"
                                                    size="middle"
                                                    disabledDate={(current) => current && current < dayjs().startOf("day")}
                                                />
                                            </Form.Item>
                                        </Col>
                                        <Col span={4}>
                                            <Form.Item
                                                {...field}
                                                name={[field.name, "moTa"]}
                                            >
                                                <Input placeholder="Mô tả" size="middle" />
                                            </Form.Item>
                                        </Col>
                                        <Col span={1} style={{ textAlign: "center" }}>
                                            {fields.length > 1 && (
                                                <Button
                                                    type="link"
                                                    danger
                                                    icon={<Trash2 size={16} />}
                                                    onClick={() => remove(field.name)}
                                                    size="middle"
                                                    style={{ padding: 0 }}
                                                />
                                            )}
                                        </Col>
                                    </Row>
                                </div>
                            ))}
                        </div>
                        <div className="phieu-mua-hang-import-actions" style={{ padding: "0 16px 16px" }}>
                            <Button
                                type="dashed"
                                block
                                onClick={() => add({ soLuongMua: 1, donViTien: "VND", ngayGiaoHang: dayjs() })}
                                icon={<Plus size={16} />}
                            >
                                Thêm sản phẩm mua hàng
                            </Button>
                        </div>
                    </div>
                )}
            </Form.List>

            <Card className="phieu-mua-hang-summary-card" size="small">
                <Row gutter={16}>
                    <Col span={12}>
                        <Space direction="vertical" size={4}>
                            <Typography.Text type="secondary">Tổng số lượng mua</Typography.Text>
                            <Typography.Title level={4} style={{ margin: 0 }}>
                                {Number(getDraftQuantity(detailsWatch) || 0).toLocaleString("vi-VN")}
                            </Typography.Title>
                        </Space>
                    </Col>
                    <Col span={12}>
                        <Space direction="vertical" size={4}>
                            <Typography.Text type="secondary">Tổng giá trị dự kiến</Typography.Text>
                            <Typography.Title level={4} style={{ margin: 0 }}>
                                {Number(getDraftTotal(detailsWatch) || 0).toLocaleString("vi-VN", {
                                    style: "currency",
                                    currency: "VND",
                                    maximumFractionDigits: 0,
                                })}
                            </Typography.Title>
                        </Space>
                    </Col>
                </Row>
            </Card>
        </>
    );

    // ── TABLE COLUMNS ───────────────────────────────────────────────────────
    const columns = [
        {
            title: "Mã PMH",
            dataIndex: "maPMH",
            key: "maPMH",
            width: 130,
            render: (value) => <Tag color="blue" style={{ fontWeight: 600 }}>{value}</Tag>,
        },
        {
            title: "Nhà cung cấp",
            dataIndex: "nhaCungCap",
            key: "nhaCungCap",
            width: 220,
        },
        {
            title: "Ngày mua",
            dataIndex: "ngayMua",
            key: "ngayMua",
            width: 140,
            render: (value) => formatDateValue(value),
        },
        {
            title: "Nhập vào kho",
            dataIndex: "maKho",
            key: "maKho",
            width: 160,
            render: (value) => getWarehouseName(value),
        },
        {
            title: "Tổng tiền",
            dataIndex: "tongTien",
            key: "tongTien",
            width: 160,
            align: "right",
            render: (value) => <Text strong>{formatCurrency(value, "VND")}</Text>,
        },
        {
            title: "Ghi chú",
            dataIndex: "ghiChu",
            key: "ghiChu",
            ellipsis: true,
            width: 220,
            render: (value) => value || "—",
        },
    ];



    return (
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
            {/* Stats row */}
            <Row gutter={[16, 16]} className="phieu-mua-hang-stats" style={{ width: '100%', margin: 0 }}>
                <Col xs={24} sm={12}>
                    <Card className="phieu-mua-hang-stat-card" size="small">
                        <Statistic
                            title="Tổng số phiếu"
                            value={orderStats.total}
                            prefix={<FileText size={18} />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12}>
                    <Card className="phieu-mua-hang-stat-card" size="small">
                        <Statistic
                            title="Tổng giá trị"
                            value={orderStats.totalAmount}
                            precision={0}
                            formatter={(value) =>
                                Number(value || 0).toLocaleString("vi-VN", {
                                    style: "currency",
                                    currency: "VND",
                                    maximumFractionDigits: 0,
                                })
                            }
                            prefix={<ClipboardList size={18} />}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Toolbar */}
            <div className={styles.toolbarRow}>
                <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}>
                    <Space wrap size={16}>
                        <Text strong>{TAB_LABEL}</Text>
                        <Tag>{TAB_MODULE}</Tag>
                        <Text type="secondary">{filteredOrders.length} phiếu</Text>
                    </Space>
                    <Space wrap>
                        <Input.Search
                            placeholder="Tìm theo mã phiếu, người mua, dự án..."
                            allowClear
                            style={{ width: 250 }}
                            value={filters.search}
                            onChange={(e) => handleFilterChange("search", e.target.value)}
                        />
                        <Select
                            allowClear
                            placeholder="Lọc theo NCC"
                            style={{ width: 160 }}
                            value={filters.nhaCungCap}
                            onChange={(value) => handleFilterChange("nhaCungCap", value)}
                            options={supplierOptions}
                        />
                        <RangePicker
                            allowClear
                            style={{ width: 220 }}
                            value={filters.dateRange}
                            onChange={(value) => handleFilterChange("dateRange", value)}
                        />
                        <Button icon={<RefreshCw size={16} />} onClick={() => onRefresh?.()} loading={loading}>Tải lại</Button>
                        {!!planId && <Button type="primary" icon={<Plus size={16} />} onClick={openCreateDrawer}>Thêm mới</Button>}
                    </Space>
                </Space>
            </div>

            {/* Batch Action Bar */}
            {!!planId && (
                <div className={`${styles.batchActionBar} ${!hasSelection ? styles.batchActionBarDisabled : ''}`}>
                    <span style={{ fontWeight: 600, color: hasSelection ? '#197dd3' : '#8c8c8c', marginRight: 8 }}>
                        Thao tác:
                    </span>
                    
                    <Button
                        icon={<Eye size={16} />}
                        disabled={selectedRowKeys.length !== 1}
                        type="primary"
                        ghost
                        onClick={() => {
                            const selectedRecord = purchaseOrders.find(item => item.maPMH === selectedRowKeys[0]);
                            if (selectedRecord) openDetailDrawer(selectedRecord);
                        }}
                    >
                        Chi tiết
                    </Button>

                    <Button
                        icon={<Edit size={16} />}
                        disabled={selectedRowKeys.length !== 1}
                        onClick={() => {
                            const selectedRecord = purchaseOrders.find(item => item.maPMH === selectedRowKeys[0]);
                            if (selectedRecord) openEditDrawer(selectedRecord);
                        }}
                    >
                        Chỉnh sửa
                    </Button>

                    <Popconfirm
                        title="Xóa phiếu mua hàng"
                        description={`Xóa ${selectedRowKeys.length} bản ghi đã chọn?`}
                        onConfirm={handleBatchDelete}
                        okText="Xóa"
                        cancelText="Hủy"
                        disabled={selectedRowKeys.length === 0}
                        okButtonProps={{ danger: true }}
                    >
                        <Button danger icon={<Trash2 size={16} />} disabled={selectedRowKeys.length === 0}>
                            Xóa đã chọn
                        </Button>
                    </Popconfirm>

                    <span style={{ marginLeft: 'auto', color: '#8c8c8c' }}>
                        Đã chọn <b>{selectedRowKeys.length}</b> dòng
                    </span>
                </div>
            )}

            {/* Main Table */}
            <Table
                rowKey="maPMH"
                columns={columns}
                dataSource={filteredOrders}
                loading={loading}
                size="small"
                bordered
                rowSelection={planId ? {
                    selectedRowKeys,
                    onChange: (keys) => setSelectedRowKeys(keys),
                } : undefined}
                pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t) => `Tổng: ${t} phiếu` }}
                scroll={{ x: 1200 }}
                onRow={(record) => ({ onDoubleClick: () => openDetailDrawer(record) })}
            />

            {/* CREATE DRAWER */}
            <Drawer
                width={1080}
                open={createDrawerOpen}
                title="Tạo phiếu mua hàng"
                onClose={() => setCreateDrawerOpen(false)}
                extra={
                    <Space>
                        <Button
                            icon={<FileDownIcon size={16} />}
                            onClick={handleDownloadTemplate}
                            style={{ color: "#1890ff", borderColor: "#1890ff" }}
                        >
                            Tải mẫu Excel
                        </Button>
                        <Upload
                            beforeUpload={(file) => {
                                handleImportExcel(createForm, { file });
                                return false;
                            }}
                            showUploadList={false}
                            accept=".xlsx, .xls"
                        >
                            <Button
                                icon={<UploadIcon size={16} />}
                                style={{ backgroundColor: "#52c41a", color: "white", borderColor: "#52c41a" }}
                            >
                                Nhập từ Excel
                            </Button>
                        </Upload>
                        <Button onClick={resetCreateForm} danger ghost>
                            Xoá trắng
                        </Button>
                        <Button
                            type="primary"
                            onClick={handleSaveOrder}
                            loading={createSubmitting}
                        >
                            Lưu phiếu
                        </Button>
                    </Space>
                }
            >
                <Form
                    layout="vertical"
                    form={createForm}
                    initialValues={{
                        details: [
                            {
                                soLuongMua: 1,
                                donViTien: "VND",
                                ngayGiaoHang: dayjs(),
                            },
                        ],
                        ngayMua: dayjs(),
                    }}
                >
                    {renderFormFields(createForm, createDetailsWatch)}
                </Form>
            </Drawer>

            {/* EDIT DRAWER */}
            <Drawer
                width={600}
                open={editDrawerOpen}
                title={`Cập nhật phiếu mua hàng – ${editPmhCode || ''}`}
                onClose={() => { setEditDrawerOpen(false); setEditPmhCode(null); }}
                extra={
                    <Space>
                        <Button
                            type="primary"
                            onClick={handleUpdateOrder}
                            loading={editSubmitting}
                        >
                            Cập nhật
                        </Button>
                    </Space>
                }
            >
                <Spin spinning={editLoading}>
                    <Form layout="vertical" form={editForm}>
                        {renderHeaderFields(editForm)}
                    </Form>
                </Spin>
            </Drawer>

            {/* DETAILS VIEW DRAWER */}
            <Drawer
                width="85%"
                open={detailDrawerOpen}
                title={`Chi tiết phiếu mua hàng ${selectedOrder?.maPMH || ""}`}
                onClose={closeDetailDrawer}
            >
                {selectedOrder ? (
                    <Tabs
                        defaultActiveKey="1"
                        size="large"
                        items={[
                            {
                                key: "1",
                                label: "Chi tiết",
                                children: (
                                    <Form form={detailForm} layout="vertical">
                                        <Space direction="vertical" size="large" style={{ width: "100%" }}>
                                            <Card size="small">
                                                <Row gutter={[16, 8]}>
                                                    <Col span={4}>
                                                        <Typography.Text type="secondary">Mã PMH</Typography.Text>
                                                        <div>{selectedOrder.maPMH || "—"}</div>
                                                    </Col>
                                                    <Col span={5}>
                                                        <Typography.Text type="secondary">Nhà cung cấp</Typography.Text>
                                                        <div>{selectedOrder.nhaCungCap || "—"}</div>
                                                    </Col>
                                                    <Col span={4}>
                                                        <Typography.Text type="secondary">Ngày mua</Typography.Text>
                                                        <div>{formatDateValue(selectedOrder.ngayMua) || "—"}</div>
                                                    </Col>
                                                    <Col span={5}>
                                                        <Typography.Text type="secondary">Nhập vào kho</Typography.Text>
                                                        <div>{getWarehouseName(selectedOrder.maKho)}</div>
                                                    </Col>
                                                    <Col span={6}>
                                                        <Typography.Text type="secondary">Mã công việc liên kết</Typography.Text>
                                                        <div><Tag color="cyan">{selectedOrder.tenDuAn || "—"}</Tag></div>
                                                    </Col>
                                                    <Col span={24}>
                                                        <Typography.Text type="secondary">Ghi chú</Typography.Text>
                                                        <div>{selectedOrder.ghiChu || "—"}</div>
                                                    </Col>
                                                </Row>
                                            </Card>
                                            <Card 
                                                size="small"
                                                title={<span style={{ fontWeight: 600, fontSize: 16 }}>Danh sách sản phẩm</span>}
                                                extra={
                                                    (!!planId && hasPermission(MODULE_CODE, "Edit")) && (
                                                        <Button
                                                            type="primary"
                                                            onClick={handleSaveDetailChanges}
                                                            loading={detailSubmitting}
                                                        >
                                                            Lưu thay đổi
                                                        </Button>
                                                    )
                                                }
                                            >
                                                <Form.List name="details">
                                                    {(fields, { add, remove }) => {
                                                        const isEditable = !!planId && hasPermission(MODULE_CODE, "Edit");
                                                        return (
                                                            <div className="phieu-mua-hang-details-wrapper">
                                                                <div className="phieu-mua-hang-detail-header">
                                                                    <Row gutter={8}>
                                                                        <Col span={6}>
                                                                            <Typography.Text strong>Sản phẩm</Typography.Text>
                                                                        </Col>
                                                                        <Col span={1}>
                                                                            <Typography.Text strong>SL</Typography.Text>
                                                                        </Col>
                                                                        <Col span={2}>
                                                                            <Typography.Text strong>ĐVT</Typography.Text>
                                                                        </Col>
                                                                        <Col span={2}>
                                                                            <Typography.Text strong>Đơn giá</Typography.Text>
                                                                        </Col>
                                                                        <Col span={3}>
                                                                            <Typography.Text strong>Tiền</Typography.Text>
                                                                        </Col>
                                                                        <Col span={2}>
                                                                            <Typography.Text strong>Ngày GH</Typography.Text>
                                                                        </Col>
                                                                        <Col span={7}>
                                                                            <Typography.Text strong>Mô tả</Typography.Text>
                                                                        </Col>
                                                                        <Col span={1}></Col>
                                                                    </Row>
                                                                </div>
                                                                <div className="phieu-mua-hang-fields-list">
                                                                    {fields.map((field, index) => (
                                                                        <div key={field.key} className="phieu-mua-hang-detail-row">
                                                                            <Row gutter={8} align="top">
                                                                                <Col span={6}>
                                                                                    <Form.Item
                                                                                        {...field}
                                                                                        name={[field.name, "maBOM"]}
                                                                                        rules={[{ required: true, message: "Chọn SP" }]}
                                                                                    >
                                                                                        <Select
                                                                                            placeholder="Sản phẩm"
                                                                                            options={productOptions}
                                                                                            showSearch
                                                                                            optionFilterProp="label"
                                                                                            loading={productsLoading}
                                                                                            onChange={(val, option) =>
                                                                                                handleSelectProduct(detailForm, field.name, val, option)
                                                                                            }
                                                                                            size="middle"
                                                                                            disabled={!isEditable}
                                                                                        />
                                                                                    </Form.Item>
                                                                                </Col>
                                                                                <Col span={1}>
                                                                                    <Form.Item
                                                                                        {...field}
                                                                                        name={[field.name, "soLuongMua"]}
                                                                                        rules={[{ required: true, message: "Nhập SL" }]}
                                                                                    >
                                                                                        <InputNumber
                                                                                            min={0}
                                                                                            style={{ width: "100%" }}
                                                                                            placeholder="SL"
                                                                                            size="middle"
                                                                                            disabled={!isEditable}
                                                                                        />
                                                                                    </Form.Item>
                                                                                </Col>
                                                                                <Col span={2}>
                                                                                    <Form.Item
                                                                                        {...field}
                                                                                        name={[field.name, "dvt"]}
                                                                                        rules={[{ required: true, message: "Chọn ĐVT" }]}
                                                                                    >
                                                                                        <SelectDonVi placeholder="ĐVT" size="middle" disabled={!isEditable} />
                                                                                    </Form.Item>
                                                                                </Col>
                                                                                <Col span={2}>
                                                                                    <Form.Item
                                                                                        {...field}
                                                                                        name={[field.name, "donGia"]}
                                                                                        rules={[{ required: true, message: "Nhập giá" }]}
                                                                                    >
                                                                                        <InputNumber
                                                                                            min={0}
                                                                                            style={{ width: "100%" }}
                                                                                            placeholder="Giá"
                                                                                            size="middle"
                                                                                            formatter={(v) => v ? `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : ""}
                                                                                            parser={(v) => v.replace(/,/g, "")}
                                                                                            disabled={!isEditable}
                                                                                        />
                                                                                    </Form.Item>
                                                                                </Col>
                                                                                <Col span={3}>
                                                                                    <Form.Item
                                                                                        {...field}
                                                                                        name={[field.name, "donViTien"]}
                                                                                    >
                                                                                        <Select
                                                                                            size="middle"
                                                                                            options={currencyOptions}
                                                                                            loading={currenciesLoading}
                                                                                            placeholder="Tệ"
                                                                                            disabled={!isEditable}
                                                                                        />
                                                                                    </Form.Item>
                                                                                </Col>
                                                                                <Col span={2}>
                                                                                    <Form.Item
                                                                                        {...field}
                                                                                        name={[field.name, "ngayGiaoHang"]}
                                                                                        rules={[
                                                                                            {
                                                                                                validator: (_, value) => {
                                                                                                    const ngayMua = selectedOrder ? parseDateValue(selectedOrder.ngayMua) : null;
                                                                                                    if (value && ngayMua && value.isBefore(ngayMua, "day")) {
                                                                                                        return Promise.reject(new Error(">= Ngày mua"));
                                                                                                    }
                                                                                                    return Promise.resolve();
                                                                                                },
                                                                                            },
                                                                                        ]}
                                                                                    >
                                                                                        <DatePicker
                                                                                            format="DD/MM/YYYY"
                                                                                            style={{ width: "100%" }}
                                                                                            placeholder="Ngày GH"
                                                                                            size="middle"
                                                                                            disabledDate={(current) => {
                                                                                                const ngayMua = selectedOrder ? parseDateValue(selectedOrder.ngayMua) : null;
                                                                                                if (ngayMua) {
                                                                                                    return current && current < ngayMua.startOf("day");
                                                                                                }
                                                                                                return current && current < dayjs().startOf("day");
                                                                                            }}
                                                                                            disabled={!isEditable}
                                                                                        />
                                                                                    </Form.Item>
                                                                                </Col>
                                                                                <Col span={7}>
                                                                                    <Form.Item
                                                                                        {...field}
                                                                                        name={[field.name, "moTa"]}
                                                                                    >
                                                                                        <Input placeholder="Mô tả" size="middle" disabled={!isEditable} />
                                                                                    </Form.Item>
                                                                                </Col>
                                                                                <Col span={1} style={{ textAlign: "center" }}>
                                                                                    {isEditable && fields.length > 1 && (
                                                                                        <Button
                                                                                            type="link"
                                                                                            danger
                                                                                            icon={<Trash2 size={16} />}
                                                                                            onClick={() => remove(field.name)}
                                                                                            size="middle"
                                                                                            style={{ padding: 0 }}
                                                                                        />
                                                                                    )}
                                                                                </Col>
                                                                            </Row>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                                {isEditable && (
                                                                    <div className="phieu-mua-hang-import-actions" style={{ padding: "0 16px 16px" }}>
                                                                        <Button
                                                                            type="dashed"
                                                                            block
                                                                            onClick={() => add({ soLuongMua: 1, donViTien: "VND", ngayGiaoHang: dayjs() })}
                                                                            icon={<Plus size={16} />}
                                                                        >
                                                                            Thêm sản phẩm mua hàng
                                                                        </Button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    }}
                                                </Form.List>
                                                <Card className="phieu-mua-hang-summary-card" size="small" style={{ marginTop: 16 }}>
                                                    <Row gutter={16}>
                                                        <Col span={12}>
                                                            <Space direction="vertical" size={4}>
                                                                <Typography.Text type="secondary">Tổng số lượng mua</Typography.Text>
                                                                <Typography.Title level={4} style={{ margin: 0 }}>
                                                                    {Number(getDraftQuantity(detailDetailsWatch) || 0).toLocaleString("vi-VN")}
                                                                </Typography.Title>
                                                            </Space>
                                                        </Col>
                                                        <Col span={12}>
                                                            <Space direction="vertical" size={4}>
                                                                <Typography.Text type="secondary">Tổng giá trị dự kiến</Typography.Text>
                                                                <Typography.Title level={4} style={{ margin: 0 }}>
                                                                    {Number(getDraftTotal(detailDetailsWatch) || 0).toLocaleString("vi-VN", {
                                                                        style: "currency",
                                                                        currency: "VND",
                                                                        maximumFractionDigits: 0,
                                                                    })}
                                                                </Typography.Title>
                                                            </Space>
                                                        </Col>
                                                    </Row>
                                                </Card>
                                            </Card>
                                        </Space>
                                    </Form>
                                ),
                            },
                            {
                                key: "2",
                                label: "Phiếu chi",
                                children: (
                                    <PhieuChiTabUI
                                        maPMH={selectedOrder.maPMH}
                                        tongTien={
                                            selectedOrder.tongTien ||
                                            orderDetails.reduce(
                                                (sum, item) => sum + (item.soLuongMua || 0) * (item.donGia || 0),
                                                0
                                            )
                                        }
                                    />
                                ),
                            },
                            {
                                key: "3",
                                label: "Lần thanh toán",
                                children: <PaymentScheduleTab purchaseOrderId={selectedOrder.maPMH || selectedOrder.maPhieuMuaHang} />,
                            },
                            {
                                key: "4",
                                label: "QA KQ PTH",
                                children: <PurchaseQaTab purchaseOrderId={selectedOrder.maPMH || selectedOrder.maPhieuMuaHang} />,
                            },
                            {
                                key: "5",
                                label: "Nhập kho",
                                children: <WarehouseReceiptTab purchaseOrderId={selectedOrder.maPMH || selectedOrder.maPhieuMuaHang} />,
                            },
                            {
                                key: "6",
                                label: "NK - HCNS",
                                children: <HrWarehouseReceiptTab purchaseOrderId={selectedOrder.maPMH || selectedOrder.maPhieuMuaHang} />,
                            },
                        ]}
                    />
                ) : (
                    <Empty description="Không có dữ liệu phiếu mua hàng" />
                )}
            </Drawer>


        </Space>
    );
};

export default MuaHangTab;
