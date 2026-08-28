import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Breadcrumb,
  Button,
  Card,
  Col,
  DatePicker,
  Divider,
  Drawer,
  Form,
  Input,
  message,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Tabs
} from "antd";
import dayjs from "dayjs";
import {
  Calendar,
  Edit,
  FileText,
  Lock,
  Plus,
  Search,
  Trash2,
  CheckCircle,
  ArrowLeftRight
} from "lucide-react";
import { ReloadOutlined } from "@ant-design/icons";
import { callApi, execCRUD } from "../../../../services/apiServices";
import { useMasterData } from "../../../../hooks/useApiQueries";
import SelectNhanVien from "../../../../components/DropDown/SelectNhanVien";
import styles from "./styles.module.css";

const { Option } = Select;
const { Search: SearchInput } = Input;

// ========== CONSTANTS ==========
const TRANG_THAI_OPTIONS = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "00", label: "Chưa thực hiện" },
  { value: "10", label: "Đang thực hiện" },
  { value: "11", label: "Đề xuất duyệt" },
  { value: "12", label: "Hoàn thành / đã khóa" },
];

const FALLBACK_CATEGORY_OPTIONS = [
  { value: "0", label: "Quy trình đề xuất duyệt" },
  { value: "1", label: "Quy trình hoàn thành" },
  { value: "2", label: "Quy trình hoàn thành" },
  { value: "3", label: "Quy trình đề xuất duyệt" },
];

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const DEFAULT_PAGE_SIZE = 20;
const FALLBACK_REFERENCE_SOURCES = [
  { value: "CUS", label: "Khách hàng (CUS)" },
  { value: "EMP", label: "Nhân viên (EMP)" },
  { value: "SUP", label: "Nhà cung cấp (SUP)" },
  { value: "DEP", label: "Phòng ban (DEP)" },
  { value: "HR", label: "Nghiệp vụ (HR)" },
  { value: "OTH", label: "Khác (OTH)" },
];

// ========== HELPERS ==========
const formatDate = (dateStr) => {
  if (!dateStr || dateStr === "1900-01-01 00:00:00" || dateStr === "1900-01-01") return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return dateStr;
  }
};

const getTrangThaiLabel = (lv011, lv027) => {
  if (String(lv011) === "0" && String(lv027) === "0") return { label: "Chưa thực hiện", cls: "status-pending" };
  if (String(lv011) === "1" && String(lv027) === "0") return { label: "Đang thực hiện", cls: "status-inprogress" };
  if (String(lv011) === "1" && String(lv027) === "1") return { label: "Đề xuất duyệt", cls: "status-pending" };
  if (String(lv011) === "1" && String(lv027) === "2") return { label: "Hoàn thành / đã khóa", cls: "status-done" };
  if (String(lv027) === "-1") return { label: "Trả lại xử lý", cls: "status-unknown" };
  return { label: "Chưa xác định", cls: "status-unknown" };
};

// ========== MAIN COMPONENT ==========
const NhapCongViec = () => {
  const { data: referenceSourceMasterData = [], isLoading: referenceSourcesLoading } = useMasterData(
    "ac_lv0030",
    "NguonThamChieu"
  );
  const referenceSources = useMemo(() => {
    const sources = Array.isArray(referenceSourceMasterData)
      ? referenceSourceMasterData
        .filter((item) => item?.lv001)
        .map((item) => ({ value: item.lv001, label: item.lv002 || item.lv001 }))
      : [];

    return sources.length > 0 ? sources : FALLBACK_REFERENCE_SOURCES;
  }, [referenceSourceMasterData]);
  const defaultReferenceSource = referenceSources[0]?.value || "CUS";
  // State
  const [activeTab, setActiveTab] = useState("0");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [totalCount, setTotalCount] = useState(0);

  // Filter
  const [filter, setFilter] = useState({
    lv004: "",
    lv006: "",
    lv027: "",
    lv049: "",
    lv005From: "",
    lv005To: "",
  });

  // Modal (Drawer) Mode / Selection
  const [modalMode, setModalMode] = useState(null); // 'add' | 'edit'
  const [editingRow, setEditingRow] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);

  // Lookups
  const [danhSachNV, setDanhSachNV] = useState([]);
  const [danhSachLoaiCV, setDanhSachLoaiCV] = useState([]);
  const [danhSachPhanLoai, setDanhSachPhanLoai] = useState([]);
  const [referenceLookups, setReferenceLookups] = useState({
    employees: [], departments: [], customers: [], suppliers: [], periods: [], subTasks: [],
  });
  const [selectedObjType, setSelectedObjType] = useState(defaultReferenceSource);

  // Tab counts
  const [tabCounts, setTabCounts] = useState({ "0": 0, "1": 0, "": 0 });

  const [form] = Form.useForm();

  // ---- Load lookups ----
  useEffect(() => {
    const loadLookups = async () => {
      try {
        const [nvRes, loaiCVRes] = await Promise.all([
          callApi("cr_lv0092", "loadNhanVien"),
          callApi("cr_lv0092", "loadLoaiCV"),
        ]);
        if (Array.isArray(nvRes)) setDanhSachNV(nvRes);
        if (Array.isArray(loaiCVRes)) setDanhSachLoaiCV(loaiCVRes);
      } catch (err) {
        console.warn("Không tải được lookups:", err.message);
      }
    };
    loadLookups();
  }, []);

  useEffect(() => {
    const loadReferenceLookups = async () => {
      try {
        const planId = new URLSearchParams(window.location.search).get("ID") || "";
        const response = await execCRUD("cr_lv0025_xemtongcv", "loadLookups", { planId });
        const result = typeof response === "string" ? JSON.parse(response.trim()) : response;
        if (!result?.success) return;
        const getOptions = (list) => Array.isArray(list) ? list : (list && typeof list === "object" ? Object.values(list) : []);
        setReferenceLookups({
          employees: getOptions(result.employees), departments: getOptions(result.departments),
          customers: getOptions(result.customers), suppliers: getOptions(result.suppliers), periods: getOptions(result.periods),
          subTasks: getOptions(result.subTasks),
        });
        setDanhSachPhanLoai(getOptions(result.categories));
      } catch (err) {
        console.warn("Không tải được danh sách tham chiếu:", err.message);
      }
    };
    loadReferenceLookups();
  }, []);

  const getReferenceOptions = useCallback((source) => {
    switch (source) {
      case "EMP": return referenceLookups.employees;
      case "DEP": return referenceLookups.departments;
      case "CUS": return referenceLookups.customers;
      case "SUP": return referenceLookups.suppliers;
      case "HR": return referenceLookups.periods;
      default: return [];
    }
  }, [referenceLookups]);

  const objectOptions = useMemo(() => getReferenceOptions(selectedObjType), [selectedObjType, getReferenceOptions]);
  const categoryOptions = useMemo(() => {
    const categories = danhSachPhanLoai
      .filter((item) => item?.value !== undefined && item?.value !== null)
      .map((item) => ({ value: String(item.value), label: item.label || item.value }));
    return categories.length > 0 ? categories : FALLBACK_CATEGORY_OPTIONS;
  }, [danhSachPhanLoai]);

  // ---- Load data ----
  const loadData = useCallback(async (tab = activeTab, page = currentPage, size = pageSize) => {
    setLoading(true);
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const urlPlanId = urlParams.get("ID") || "";

      const res = await callApi("cr_lv0092", "loadGrid", {
        trangthai: tab,
        page,
        pageSize: size,
        lv002: urlPlanId,
        lv004: filter.lv004,
        lv006: filter.lv006,
        lv027: filter.lv027,
        lv049: filter.lv049,
        lv005From: filter.lv005From,
        lv005To: filter.lv005To,
      });

      if (res && typeof res === "object" && !Array.isArray(res)) {
        const rowsWithKey = (Array.isArray(res.rows) ? res.rows : []).map((item) => ({
          ...item,
          key: item.lv001,
        }));
        setData(rowsWithKey);
        setTotalCount(res.total || 0);
        if (res.tabCounts) setTabCounts(res.tabCounts);
      } else if (Array.isArray(res)) {
        const rowsWithKey = res.map((item) => ({
          ...item,
          key: item.lv001,
        }));
        setData(rowsWithKey);
        setTotalCount(res.length);
      }
    } catch (err) {
      message.error("Không thể tải dữ liệu: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [activeTab, currentPage, pageSize, filter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ---- Tab change ----
  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    setCurrentPage(1);
    setSelectedIds([]);
  };

  // ---- Filter ----
  const handleFilterChange = (field, value) => {
    setFilter((prev) => ({ ...prev, [field]: value }));
  };

  const handleSearch = () => {
    setCurrentPage(1);
    loadData(activeTab, 1, pageSize);
  };

  const handleClearFilter = () => {
    setFilter({ lv004: "", lv006: "", lv027: "", lv049: "", lv005From: "", lv005To: "" });
    setCurrentPage(1);
  };

  // ---- CRUD Actions ----
  const handleAddClick = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlPlanId = urlParams.get("ID") || "";
    setEditingRow(null);
    setModalMode("add");
    setSelectedObjType(defaultReferenceSource);
    form.resetFields();
    form.setFieldsValue({
      lv002: urlPlanId,
      lv049: categoryOptions[0]?.value || "",
      lv005: dayjs(),
      lv003: "",
      lv004: "",
      lv006: "",
      lv007: "",
      lv008: "",
      lv501: "",
      lv013: defaultReferenceSource,
      lv014: "",
    });
  };

  const safeDate = (val) => {
    if (!val) return null;
    try {
      const d = dayjs(val);
      return d.isValid() ? d : null;
    } catch {
      return null;
    }
  };

  const handleEditClick = (row) => {
    setEditingRow(row);
    setModalMode("edit");
    setSelectedObjType(row.lv013 || defaultReferenceSource);
    form.resetFields();
    form.setFieldsValue({
      ...row,
      lv005: safeDate(row.lv005),
      lv012: safeDate(row.lv012),
    });
  };

  const handleSave = async (values) => {
    const formData = {
      ...values,
      lv002: editingRow ? editingRow.lv002 : (new URLSearchParams(window.location.search).get("ID") || ""),
      lv005: values.lv005 ? values.lv005.format("YYYY-MM-DD") : "",
    };

    setLoading(true);
    try {
      if (modalMode === "add") {
        const res = await callApi("cr_lv0092", "insert", formData);
        if (res?.success) {
          setModalMode(null);
          message.success("Thêm công việc thành công!");
          setSelectedIds([]);
          loadData();
        } else {
          message.error(res?.message || "Thêm thất bại!");
        }
      } else {
        const res = await callApi("cr_lv0092", "update", { ...formData, lv001: editingRow.lv001 });
        if (res?.success) {
          setModalMode(null);
          message.success("Cập nhật thành công!");
          setSelectedIds([]);
          loadData();
        } else {
          message.error(res?.message || "Cập nhật thất bại!");
        }
      }
    } catch (err) {
      message.error("Lỗi: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    try {
      const res = await callApi("cr_lv0092", "delete", { ids: selectedIds });
      if (res?.success) {
        message.success("Xóa thành công!");
        setSelectedIds([]);
        loadData();
      } else {
        message.error(res?.message || "Xóa thất bại!");
      }
    } catch (err) {
      message.error("Lỗi: " + err.message);
    }
  };

  const handleApprove = async (ids) => {
    try {
      const idStr = (Array.isArray(ids) ? ids : [ids]).map((id) => `'${id}'`).join(",");
      const res = await callApi("cr_lv0092", "approve", { ids: idStr });
      if (res?.success) {
        message.success("Duyệt thành công!");
        setSelectedIds([]);
        loadData();
      } else {
        message.error(res?.message || "Duyệt thất bại!");
      }
    } catch (err) {
      message.error("Lỗi duyệt: " + err.message);
    }
  };

  const handleUnApprove = async (ids) => {
    try {
      const idStr = (Array.isArray(ids) ? ids : [ids]).map((id) => `'${id}'`).join(",");
      const res = await callApi("cr_lv0092", "unapprove", { ids: idStr });
      if (res?.success) {
        message.success("Bỏ duyệt thành công!");
        setSelectedIds([]);
        loadData();
      } else {
        message.error(res?.message || "Bỏ duyệt thất bại!");
      }
    } catch (err) {
      message.error("Lỗi bỏ duyệt: " + err.message);
    }
  };

  const handleApproveQL = async (ids) => {
    try {
      const idStr = (Array.isArray(ids) ? ids : [ids]).map((id) => `'${id}'`).join(",");
      const res = await callApi("cr_lv0092", "approveQL", { ids: idStr });
      if (res?.success) {
        message.success("Duyệt QL thành công!");
        setSelectedIds([]);
        loadData();
      } else {
        message.error(res?.message || "Duyệt QL thất bại!");
      }
    } catch (err) {
      message.error("Lỗi duyệt QL: " + err.message);
    }
  };

  // ========== TABLE CONFIG ==========
  const columns = [
    {
      title: "STT",
      key: "stt",
      width: 60,
      align: "center",
      render: (_, __, index) => (currentPage - 1) * pageSize + index + 1,
    },
    {
      title: "Mã công việc",
      dataIndex: "lv001",
      key: "lv001",
      width: 120,
    },
    {
      title: "Loại CV",
      dataIndex: "lv003",
      key: "lv003",
      width: 140,
      render: (val) => {
        const found = danhSachLoaiCV.find(lc => lc.lv001 === val);
        return found ? found.lv002 : val || "—";
      }
    },
    {
      title: "Nội dung công việc",
      dataIndex: "lv004",
      key: "lv004",
      ellipsis: true,
      width: 300,
    },
    {
      title: "Hạn hoàn thành",
      dataIndex: "lv005",
      key: "lv005",
      width: 120,
      render: (val) => formatDate(val),
    },
    {
      title: "Thời điểm xử lý",
      dataIndex: "lv012",
      key: "lv012",
      width: 120,
      render: (val, record) => {
        if (!val || val === "1900-01-01 00:00:00" || val === "1900-01-01") return "—";
        const isOverdue = new Date(record.lv005) < new Date() && String(record.lv027) !== "2";
        return (
          <span style={{ color: isOverdue ? '#ef4444' : 'inherit', fontWeight: isOverdue ? 600 : 'normal' }}>
            {formatDate(val)}
            {isOverdue && <span style={{ fontSize: '11px', marginLeft: '4px' }}>(Quá hạn)</span>}
          </span>
        );
      }
    },
    {
      title: "NV thực hiện",
      dataIndex: "lv006",
      key: "lv006",
      width: 160,
      render: (val) => {
        const found = danhSachNV.find(nv => nv.lv001 === val);
        return found ? `${found.lv002} ${found.lv003}` : val || "—";
      }
    },
    {
      title: "Người duyệt",
      dataIndex: "lv008",
      key: "lv008",
      width: 160,
      render: (val) => {
        const found = danhSachNV.find(nv => nv.lv001 === val);
        return found ? `${found.lv002} ${found.lv003}` : val || "—";
      }
    },
    {
      title: "Ngày tạo",
      dataIndex: "lv010",
      key: "lv010",
      width: 120,
      render: (val) => formatDate(val),
    },
    {
      title: "Trạng thái",
      key: "trangthai",
      width: 140,
      align: "center",
      render: (_, record) => {
        const tt = getTrangThaiLabel(record.lv011, record.lv027);
        let color = "default";
        if (record.lv011 == 1 && record.lv027 == 2) color = "success";
        else if (record.lv011 == 1 && record.lv027 == 0) color = "processing";
        else if (record.lv011 == 1 && record.lv027 == 1) color = "warning";
        return <Tag color={color}>{tt.label}</Tag>;
      }
    }
  ];

  return (
    <div className={styles.khoContainer}>
      {/* BREADCRUMB */}
      <Breadcrumb className={styles.pageBreadcrumb}>
        <Breadcrumb.Item>Quản lý công việc</Breadcrumb.Item>
        <Breadcrumb.Item>Nhập công việc</Breadcrumb.Item>
      </Breadcrumb>

      {/* HEADER */}
      <div className={styles.khoHeader}>
        <div className={styles.khoTitle}>
          <Calendar size={28} />
          <div>
            <h2 className={styles.khoTitleText}>Nhập Công Việc</h2>
            <span style={{ fontSize: "13px", color: "#7f8c8d" }}>
              Quản lý & theo dõi tiến độ công việc
            </span>
          </div>
        </div>
        <div className={styles.khoActions}>
          <SearchInput
            placeholder="Tìm nội dung công việc..."
            allowClear
            className={styles.khoSearch}
            value={filter.lv004}
            onChange={(e) => handleFilterChange("lv004", e.target.value)}
            onSearch={handleSearch}
          />
          <Button type="primary" icon={<Plus size={16} />} onClick={handleAddClick}>
            Thêm công việc
          </Button>
        </div>
      </div>

      {/* PREMIUM TABS */}
      <div style={{ marginTop: "20px" }}>
        <Tabs activeKey={activeTab} onChange={handleTabChange} className={styles.premiumTabs}>
          <Tabs.TabPane
            tab={`CV bản thân ${tabCounts["0"] > 0 ? `(${tabCounts["0"]})` : ""}`}
            key="0"
          />
          <Tabs.TabPane
            tab={`CV giao việc ${tabCounts["1"] > 0 ? `(${tabCounts["1"]})` : ""}`}
            key="1"
          />
          <Tabs.TabPane
            tab={`Tất cả ${tabCounts[""] > 0 ? `(${tabCounts[""]})` : ""}`}
            key=""
          />
        </Tabs>
      </div>

      {/* BATCH ACTION BAR */}
      <div
        className={styles.batchActionBar}
        style={{
          opacity: selectedIds.length === 0 ? 0.6 : 1,
          transition: "opacity 0.3s"
        }}
      >
        <span style={{ fontWeight: 600, color: "#197dd3", marginRight: 8 }}>
          Thao tác hàng loạt:
        </span>
        <Button
          icon={<Edit size={16} />}
          disabled={selectedIds.length !== 1}
          onClick={() => {
            const selectedRecord = data.find((item) => item.lv001 === selectedIds[0]);
            if (selectedRecord) handleEditClick(selectedRecord);
          }}
          type="primary"
          ghost
        >
          Chỉnh sửa
        </Button>
        <Button
          icon={<CheckCircle size={16} />}
          onClick={() => handleApprove(selectedIds)}
          disabled={selectedIds.length === 0}
          type="primary"
          ghost
          style={{ color: "#10b981", borderColor: "#10b981" }}
        >
          Duyệt
        </Button>
        <Button
          icon={<ArrowLeftRight size={16} />}
          onClick={() => handleUnApprove(selectedIds)}
          disabled={selectedIds.length === 0}
          danger
          ghost
        >
          Bỏ duyệt
        </Button>
        <Button
          icon={<Lock size={16} />}
          onClick={() => handleApproveQL(selectedIds)}
          disabled={selectedIds.length === 0}
          style={{ color: "#6d28d9", borderColor: "#6d28d9" }}
          ghost
        >
          Duyệt QL
        </Button>
        <Popconfirm
          title="Xóa công việc"
          description={`Bạn có chắc muốn xóa ${selectedIds.length} công việc đã chọn?`}
          onConfirm={handleDeleteSelected}
          okText="Xóa"
          cancelText="Hủy"
          disabled={selectedIds.length === 0}
        >
          <Button danger icon={<Trash2 size={16} />} disabled={selectedIds.length === 0}>
            Xóa đã chọn
          </Button>
        </Popconfirm>
        <span style={{ marginLeft: "auto", color: "#8c8c8c" }}>
          Đã chọn <b>{selectedIds.length}</b> dòng
        </span>
      </div>

      {/* FILTERS & MAIN TABLE */}
      <Card className={styles.mainCard} style={{ marginTop: "16px" }}>
        <div className={styles.filterSection}>
          <Row gutter={[16, 16]} className={styles.filterBar}>
            <Col xs={24} sm={12} md={6}>
              <Form.Item label="Trạng thái">
                <Select
                  style={{ width: "100%" }}
                  placeholder="Lọc theo trạng thái"
                  value={filter.lv027}
                  onChange={(val) => handleFilterChange("lv027", val)}
                >
                  {TRANG_THAI_OPTIONS.map((o) => (
                    <Option key={o.value} value={o.value}>
                      {o.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item label="Mức độ ưu tiên">
                <Select
                  style={{ width: "100%" }}
                  placeholder="Lọc theo loại CV"
                  value={filter.lv049}
                  onChange={(val) => handleFilterChange("lv049", val)}
                >
                  {categoryOptions.map((o) => (
                    <Option key={o.value} value={o.value}>
                      {o.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item label="Từ ngày">
                <DatePicker
                  style={{ width: "100%" }}
                  format="DD/MM/YYYY"
                  placeholder="Chọn ngày giao"
                  value={filter.lv005From ? dayjs(filter.lv005From) : null}
                  onChange={(val) => handleFilterChange("lv005From", val ? val.format("YYYY-MM-DD") : "")}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item label="Đến ngày">
                <DatePicker
                  style={{ width: "100%" }}
                  format="DD/MM/YYYY"
                  placeholder="Chọn ngày giao"
                  value={filter.lv005To ? dayjs(filter.lv005To) : null}
                  onChange={(val) => handleFilterChange("lv005To", val ? val.format("YYYY-MM-DD") : "")}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={24} md={24} style={{ display: "flex", justifyContent: "flex-end", gap: "8px", paddingTop: "8px" }}>
              <Button type="dashed" icon={<ReloadOutlined />} onClick={handleClearFilter}>
                Xóa bộ lọc
              </Button>
              <Button type="primary" icon={<Search size={14} />} onClick={handleSearch}>
                Tìm kiếm
              </Button>
            </Col>
          </Row>
        </div>

        <Table
          rowSelection={{
            selectedRowKeys: selectedIds,
            onChange: (keys) => setSelectedIds(keys),
          }}
          columns={columns}
          dataSource={data}
          loading={loading}
          scroll={{ x: 1400 }}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: totalCount,
            onChange: (page) => setCurrentPage(page),
            showSizeChanger: true,
            pageSizeOptions: PAGE_SIZE_OPTIONS,
            onShowSizeChange: (current, size) => {
              setPageSize(size);
              setCurrentPage(1);
            },
            showTotal: (total) => `Tổng số: ${total} công việc`,
          }}
        />
      </Card>

      {/* ADD / EDIT DRAWER (SIDEBAR) */}
      <Drawer
        title={
          <Space>
            <FileText size={20} color="#197dd3" />
            <span>
              {modalMode === "add" ? "Thêm mới công việc" : "Cập nhật công việc"}
            </span>
          </Space>
        }
        placement="right"
        width={750}
        open={!!modalMode}
        forceRender={true}
        onClose={() => {
          setModalMode(null);
          setEditingRow(null);
          form.resetFields();
        }}
        className={styles.khoDrawer}
        footer={
          <Space style={{ display: "flex", justifyContent: "flex-end" }}>
            <Button
              onClick={() => {
                setModalMode(null);
                setEditingRow(null);
                form.resetFields();
              }}
            >
              Hủy
            </Button>
            <Button type="primary" onClick={() => form.submit()} loading={loading}>
              {modalMode === "add" ? "Thêm mới" : "Lưu thay đổi"}
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" onFinish={handleSave} className={styles.customForm}>
          <Divider className={styles.dividerSolid} orientation="left">
            Nội dung & Loại công việc
          </Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="lv003"
                label="Loại công việc"
                rules={[{ required: true, message: "Vui lòng chọn loại công việc!" }]}
              >
                <Select dropdownMatchSelectWidth={false} placeholder="Chọn loại công việc" showSearch optionFilterProp="children">
                  {danhSachLoaiCV.map((lc) => (
                    <Option key={lc.lv001} value={lc.lv001}>
                      {lc.lv002}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="lv049"
                label="Phân loại quy trình"
                rules={[{ required: true, message: "Vui lòng chọn phân loại!" }]}
              >
                <Select dropdownMatchSelectWidth={false} placeholder="Chọn phân loại">
                  {categoryOptions.map((item) => (
                    <Option key={item.value} value={item.value}>{item.label}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item name="lv501" label="Tác vụ / mục công việc">
                <Select
                  dropdownMatchSelectWidth={false}
                  placeholder="Chọn mục công việc từ Kanban"
                  allowClear
                  showSearch
                  optionFilterProp="children"
                >
                  {referenceLookups.subTasks.map((item) => (
                    <Option key={item.value} value={item.value}>{item.label}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="lv004"
            label="Nội dung công việc"
            rules={[{ required: true, message: "Vui lòng nhập nội dung công việc!" }]}
          >
            <Input.TextArea
              rows={4}
              placeholder="Nhập nội dung mô tả chi tiết công việc cần thực hiện..."
            />
          </Form.Item>

          <Divider className={styles.dividerSolid} orientation="left">
            Thời hạn thực hiện
          </Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="lv005"
                label="Ngày giao việc"
                rules={[{ required: true, message: "Vui lòng chọn ngày giao việc!" }]}
              >
                <DatePicker
                  style={{ width: "100%" }}
                  format="DD/MM/YYYY"
                  placeholder="Chọn ngày giao"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="lv012" label="Ngày hạn hoàn thành">
                <DatePicker
                  style={{ width: "100%" }}
                  format="DD/MM/YYYY"
                  placeholder="Chọn ngày hết hạn"
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider className={styles.dividerSolid} orientation="left">
            Nhân sự liên quan
          </Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="lv006"
                label="Nhân viên thực hiện chính"
                rules={[{ required: true, message: "Vui lòng chọn nhân viên thực hiện!" }]}
              >
                <SelectNhanVien placeholder="Chọn nhân viên thực hiện" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="lv007" label="Nhân viên thực hiện phụ">
                <SelectNhanVien placeholder="Không có" allowClear />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item name="lv008" label="Người duyệt công việc">
                <SelectNhanVien placeholder="Không có" allowClear />
              </Form.Item>
            </Col>
          </Row>

          <Divider className={styles.dividerSolid} orientation="left">
            Liên kết tham chiếu
          </Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="lv013" label="Nguồn tham chiếu">
                <Select
                  placeholder="Chọn nguồn tham chiếu"
                  loading={referenceSourcesLoading}
                  allowClear
                  onChange={(value) => {
                    setSelectedObjType(value);
                    form.setFieldsValue({ lv014: "" });
                  }}
                >
                  {referenceSources.map((source) => (
                    <Option key={source.value} value={source.value}>{source.label}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="lv014" label="Mã tham chiếu">
                <Select
                  dropdownMatchSelectWidth={false}
                  placeholder="Chọn mã tham chiếu"
                  showSearch
                  optionFilterProp="children"
                  allowClear
                  disabled={!selectedObjType}
                >
                  {objectOptions.map((option) => (
                    <Option key={option.value} value={option.value}>{option.label}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Drawer>
    </div>
  );
};

export default NhapCongViec;
