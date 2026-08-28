import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Col,
  DatePicker,
  Drawer,
  Form,
  Input,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from "antd";
import dayjs from "dayjs";
import { CheckCircle, Edit, Plus, RefreshCw, RotateCcw, Search, Trash2 } from "lucide-react";
import { callApi } from "../../../../services/apiServices";
import ColumnSelector from "../../../../components/common/ColumnSelector/ColumnSelector";
import useSavedTablePreferences, { sortRowsByPreference } from "../../../../hooks/useSavedTablePreferences";
import BaoCaoCongViecChuaHoanThanh from "../BaoCaoCongViecChuaHoanThanh/BaoCaoCongViecChuaHoanThanh";
import BaoCaoCongViecPhaiLamQuaHan from "../BaoCaoCongViecPhaiLamQuaHan/BaoCaoCongViecPhaiLamQuaHan";
import CongViecPhaiLamGiaoViec from "../CongViecPhaiLamGiaoViec/CongViecPhaiLamGiaoViec";
import styles from "./styles.module.css";

const { Text } = Typography;

const DEFAULT_FIELDS = [
  "lv015",
  "lv008",
  "lv499",
  "lv005",
  "lv016",
  "lv902",
  "lv909",
  "lv014",
  "lv117",
  "lv003",
  "lv004",
  "lv011",
  "lv012",
  "lv013",
  "lv006",
  "lv009",
];

const toOptions = (items) =>
  (Array.isArray(items) ? items : []).map((item) => ({
    value: item.id ?? item.lv001,
    label: item.name ?? item.lv002 ?? item.lv003 ?? item.id,
  }));

const DailyWorkReport = () => {
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [lookups, setLookups] = useState({});
  const [rows, setRows] = useState([]);
  const [columnsMeta, setColumnsMeta] = useState([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [editingRecord, setEditingRecord] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const loadLookups = useCallback(async () => {
    const data = await callApi("cr_lv0158", "loadLookups", {});
    if (data?.success !== false) setLookups(data || {});
  }, []);

  const buildPayload = useCallback(() => {
    const values = form.getFieldsValue();
    return {
      txtDateFrom: values.dateRange?.[0] ? values.dateRange[0].format("DD/MM/YYYY") : "",
      txtDateTo: values.dateRange?.[1] ? values.dateRange[1].format("DD/MM/YYYY") : "",
      txtlv008: values.employeeId || "",
      txtDepID: values.departmentId || "",
      txtlv013: values.completeStatus ?? "",
      txtlv009: values.warningStatus ?? "",
      fieldList: DEFAULT_FIELDS.join(","),
    };
  }, [form]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await callApi("cr_lv0158", "loadDataView", buildPayload());
      if (data?.success === false) {
        message.error(data.message || "Không thể tải báo cáo công việc hàng ngày.");
        setRows([]);
        return;
      }
      const nextRows = data?.rows || data?.data || [];
      setRows(nextRows.map((row, index) => ({ ...row, key: row._raw?.lv001 || row.lv001 || index })));
      setColumnsMeta(data?.columns || []);
    } catch (error) {
      console.error("Failed to load daily work report:", error);
      message.error("Không thể tải báo cáo công việc hàng ngày.");
    } finally {
      setLoading(false);
    }
  }, [buildPayload]);

  useEffect(() => {
    form.setFieldsValue({
      dateRange: [dayjs().subtract(1, "day"), dayjs()],
    });
    loadLookups();
  }, [form, loadLookups]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedIds = useMemo(
    () => selectedRowKeys.map((key) => rows.find((row) => row.key === key)?._raw?.lv001 || key).filter(Boolean),
    [rows, selectedRowKeys],
  );

  const runAction = async (func, successMessage) => {
    if (selectedIds.length === 0) {
      message.warning("Chọn ít nhất một dòng trước khi thao tác.");
      return;
    }
    setLoading(true);
    try {
      const data = await callApi("cr_lv0158", func, { ids: selectedIds });
      if (data?.success) {
        message.success(successMessage || data.message);
        setSelectedRowKeys([]);
        loadData();
      } else {
        message.error(data?.message || "Thao tác không thành công.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingRecord(null);
    editForm.resetFields();
    editForm.setFieldsValue({ lv013: "0", lv005: dayjs() });
    setDrawerOpen(true);
  };

  const handleEdit = useCallback((record) => {
    const raw = record._raw || {};
    setEditingRecord(record);
    editForm.setFieldsValue({
      lv001: raw.lv001,
      lv002: raw.lv002,
      lv003: raw.lv003,
      lv004: raw.lv004,
      lv005: raw.lv005 ? dayjs(raw.lv005) : null,
      lv006: raw.lv006,
      lv011: raw.lv011,
      lv012: raw.lv012,
      lv013: raw.lv013 ?? "0",
      lv014: raw.lv014,
      lv016: raw.lv016,
    });
    setDrawerOpen(true);
  }, [editForm]);

  const handleSave = async () => {
    const values = await editForm.validateFields();
    const payload = {
      ...values,
      lv005: values.lv005 ? values.lv005.format("DD/MM/YYYY HH:mm:ss") : "",
    };
    const data = await callApi("cr_lv0158", editingRecord ? "update" : "insert", payload);
    if (data?.success) {
      message.success(data.message || "Đã lưu báo cáo công việc.");
      setEditingRecord(null);
      setDrawerOpen(false);
      editForm.resetFields();
      loadData();
    } else {
      message.error(data?.message || "Không thể lưu báo cáo công việc.");
    }
  };

  const selectedRecord = useMemo(
    () => rows.find((row) => row.key === selectedRowKeys[0]),
    [rows, selectedRowKeys],
  );

  const tableColumns = useMemo(() => {
    const cols = (columnsMeta.length ? columnsMeta : DEFAULT_FIELDS.map((key) => ({ key, dataIndex: `${key}_text`, title: key }))).map((col) => ({
      ...col,
      width: col.key === "lv016" || col.key === "lv004" || col.key === "lv012" ? 220 : 130,
      ellipsis: true,
      render: (value, record) => {
        if (col.key === "lv013") {
          return record._raw?.lv013 === "1" || record._raw?.lv013 === 1 ? <Tag color="green">Hoàn thành</Tag> : <Tag color="orange">Chưa hoàn thành</Tag>;
        }
        if (col.key === "lv009") {
          const status = `${record._raw?.lv009 ?? ""}`;
          if (status === "2") return <Tag color="red">Đã khóa cảnh báo</Tag>;
          if (status === "1") return <Tag color="blue">Đã cảnh báo</Tag>;
          return <Tag>Chưa cảnh báo</Tag>;
        }
        return value;
      },
    }));
    return cols;
  }, [columnsMeta]);

  const {
    displayColumns,
    hiddenKeys,
    toggleableColumns,
    columnOrder,
    columnOrderValues,
    sortOrder,
    sortFieldOrder,
    sortFieldOptions,
    applyColumnSettings,
  } = useSavedTablePreferences({
    tableName: "cr_lv0158",
    allColumns: tableColumns,
    requiredKeys: ["lv003", "lv004", "lv005", "lv008", "lv013", "lv016"],
    defaultFieldList: DEFAULT_FIELDS.join(","),
  });

  const displayRows = useMemo(() => {
    return sortRowsByPreference(rows, sortOrder, sortFieldOrder);
  }, [rows, sortFieldOrder, sortOrder]);

  return (
    <div className={styles.tabContent}>
      <div className={styles.filterSection}>
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col xs={24} lg={7}>
              <Form.Item label="Từ ngày - Đến ngày" name="dateRange">
                <DatePicker.RangePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} lg={5}>
              <Form.Item label="Nhân viên" name="employeeId">
                <Select dropdownMatchSelectWidth={false} allowClear showSearch optionFilterProp="label" options={toOptions(lookups.employees)} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} lg={5}>
              <Form.Item label="Phòng ban" name="departmentId">
                <Select dropdownMatchSelectWidth={false} allowClear showSearch optionFilterProp="label" options={toOptions(lookups.departments)} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} lg={3}>
              <Form.Item label="Trạng thái" name="completeStatus">
                <Select dropdownMatchSelectWidth={false} allowClear options={toOptions(lookups.completeStatuses)} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} lg={4}>
              <Form.Item label="Cảnh báo" name="warningStatus">
                <Select dropdownMatchSelectWidth={false} allowClear options={toOptions(lookups.warningStatuses)} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
        <Space wrap className={styles.actionBar}>
          <Button type="primary" icon={<Search size={16} />} onClick={loadData} loading={loading}>Tìm kiếm</Button>
          <Button type="primary" ghost icon={<Plus size={16} />} onClick={handleAdd}>Thêm</Button>
          <Button icon={<RefreshCw size={16} />} onClick={() => { form.resetFields(); form.setFieldsValue({ dateRange: [dayjs().subtract(1, "day"), dayjs()] }); loadData(); }}>Làm mới</Button>
          <ColumnSelector
            allColumns={tableColumns}
            toggleableColumns={toggleableColumns}
            hiddenKeys={hiddenKeys}
            showSort
            sortOrder={sortOrder}
            sortFieldOrder={sortFieldOrder}
            sortFieldOptions={sortFieldOptions}
            columnOrder={columnOrder}
            columnOrderValues={columnOrderValues}
            showColumnOrder
            applySettings={async (...args) => {
              try {
                await applyColumnSettings(...args);
                message.success("Da cap nhat cau hinh hien thi");
              } catch (error) {
                console.error("Error saving column preferences:", error);
                message.error(error.message || "Khong the luu cau hinh hien thi");
              }
            }}
          />
        </Space>
      </div>

      <div className={styles.batchActionBar}>
        <span className={styles.batchActionTitle}>Thao tác hàng loạt:</span>
        <Button
          type="primary"
          ghost
          icon={<Edit size={16} />}
          disabled={selectedRowKeys.length !== 1}
          onClick={() => {
            if (selectedRecord) handleEdit(selectedRecord);
          }}
        >
          Chỉnh sửa
        </Button>
        <Button
          icon={<CheckCircle size={16} />}
          disabled={selectedRowKeys.length === 0}
          onClick={() => runAction("approve", "Đã duyệt báo cáo đã chọn.")}
        >
          Duyệt
        </Button>
        <Button
          icon={<RotateCcw size={16} />}
          disabled={selectedRowKeys.length === 0}
          onClick={() => runAction("unapprove", "Đã bỏ duyệt báo cáo đã chọn.")}
        >
          Bỏ duyệt
        </Button>
        <Popconfirm
          title="Xóa báo cáo đã chọn?"
          onConfirm={() => runAction("delete", "Đã xóa báo cáo đã chọn.")}
          disabled={selectedRowKeys.length === 0}
        >
          <Button danger icon={<Trash2 size={16} />} disabled={selectedRowKeys.length === 0}>
            Xóa đã chọn
          </Button>
        </Popconfirm>
        <span className={styles.selectedCount}>Đã chọn <b>{selectedRowKeys.length}</b> dòng</span>
      </div>

      <Table
        className={styles.dataTable}
        loading={loading}
        rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
        columns={displayColumns}
        dataSource={displayRows}
        scroll={{ x: 1900 }}
        size="small"
        pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (total) => `${total} dòng` }}
      />

      <Drawer
        title={editingRecord ? "Sửa báo cáo công việc" : "Thêm báo cáo công việc"}
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setEditingRecord(null); }}
        width={780}
        className={styles.khoDrawer}
        footer={
          <Space className={styles.drawerFooterActions}>
            <Button onClick={() => { setDrawerOpen(false); setEditingRecord(null); }}>Hủy</Button>
            <Button type="primary" onClick={handleSave}>Lưu</Button>
          </Space>
        }
      >
        <Form form={editForm} layout="vertical">
          <Row gutter={12}>
            <Col span={12}><Form.Item label="Mã công việc kế hoạch" name="lv002" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col span={12}><Form.Item label="Thời gian" name="lv005"><DatePicker showTime format="DD/MM/YYYY HH:mm:ss" style={{ width: "100%" }} /></Form.Item></Col>
            <Col span={12}><Form.Item label="Công việc" name="lv003"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item label="Khách hàng" name="lv014"><Input /></Form.Item></Col>
            <Col span={24}><Form.Item label="Nội dung công việc" name="lv016"><Input.TextArea rows={3} /></Form.Item></Col>
            <Col span={24}><Form.Item label="Ghi chú" name="lv004"><Input.TextArea rows={2} /></Form.Item></Col>
            <Col span={12}><Form.Item label="Kết quả" name="lv011"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item label="Trạng thái" name="lv013"><Select dropdownMatchSelectWidth={false} options={[{ value: "0", label: "Chưa hoàn thành" }, { value: "1", label: "Hoàn thành" }]} /></Form.Item></Col>
            <Col span={24}><Form.Item label="Ghi chú kết quả" name="lv012"><Input.TextArea rows={2} /></Form.Item></Col>
            <Col span={24}><Form.Item label="Ghi chú cảnh báo" name="lv006"><Input /></Form.Item></Col>
          </Row>
        </Form>
      </Drawer>
    </div>
  );
};

const MissingEmployeesReport = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [lookups, setLookups] = useState({});
  const [rows, setRows] = useState([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const values = form.getFieldsValue();
      const payload = {
        txtDateFrom: values.dateRange?.[0] ? values.dateRange[0].format("DD/MM/YYYY") : "",
        txtDateTo: values.dateRange?.[1] ? values.dateRange[1].format("DD/MM/YYYY") : "",
        txtlv008: values.employeeId || "",
        txtDepID: values.departmentId || "",
        txtlv013: values.status ?? "0",
      };
      const data = await callApi("cr_lv0211", "loadDataView", payload);
      if (data?.success === false) {
        message.error(data.message || "Không thể tải danh sách nhân viên chưa báo cáo.");
        setRows([]);
        return;
      }
      setRows(data?.rows || data?.data || []);
    } finally {
      setLoading(false);
    }
  }, [form]);

  useEffect(() => {
    form.setFieldsValue({ dateRange: [dayjs().subtract(1, "day"), dayjs()], status: "0" });
    callApi("cr_lv0158", "loadLookups", {}).then((data) => {
      if (data?.success !== false) setLookups(data || {});
    });
  }, [form]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const columns = [
    { title: "STT", dataIndex: "stt", width: 70 },
    { title: "Ngày báo cáo", dataIndex: "date", width: 130 },
    { title: "Phòng ban", dataIndex: "departmentName", width: 160 },
    { title: "Tên", dataIndex: "employeeName", width: 180 },
    {
      title: "Kết quả",
      dataIndex: "statusText",
      width: 140,
      render: (value, record) => record.hasReport ? <Tag color="green">{value}</Tag> : <Tag color="red">{value}</Tag>,
    },
    { title: "Nội dung báo cáo", dataIndex: "note", ellipsis: true },
  ];

  return (
    <div className={styles.tabContent}>
      <div className={styles.filterSection}>
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col xs={24} lg={7}>
              <Form.Item label="Từ ngày - Đến ngày" name="dateRange">
                <DatePicker.RangePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} lg={5}>
              <Form.Item label="Nhân viên" name="employeeId">
                <Select dropdownMatchSelectWidth={false} allowClear showSearch optionFilterProp="label" options={toOptions(lookups.employees)} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} lg={5}>
              <Form.Item label="Phòng ban" name="departmentId">
                <Select dropdownMatchSelectWidth={false} allowClear showSearch optionFilterProp="label" options={toOptions(lookups.departments)} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} lg={4}>
              <Form.Item label="Kết quả" name="status">
                <Select
                  options={[
                    { value: "0", label: "Chưa báo cáo" },
                    { value: "1", label: "Đã báo cáo" },
                    { value: "", label: "Tất cả" },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} lg={3}>
              <Form.Item label=" ">
                <Button type="primary" icon={<Search size={16} />} onClick={loadData} loading={loading}>Tìm kiếm</Button>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </div>
      <Table
        className={styles.dataTable}
        rowKey="key"
        columns={columns}
        dataSource={rows}
        loading={loading}
        size="small"
        pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (total) => `${total} dòng` }}
      />
    </div>
  );
};

const CongViecHangNgay = () => {
  const items = [
    { key: "daily", label: "Báo cáo công việc hàng ngày", children: <DailyWorkReport /> },
    { key: "unfinished", label: "BCCV chưa hoàn thành", children: <BaoCaoCongViecChuaHoanThanh /> },
    { key: "missing", label: "Nhân viên chưa báo cáo", children: <MissingEmployeesReport /> },
    { key: "assignedOverdue", label: "BC giao việc quá hạn", children: <CongViecPhaiLamGiaoViec /> },
    { key: "todoOverdue", label: "BC CV phải làm quá hạn", children: <BaoCaoCongViecPhaiLamQuaHan /> },
  ];

  return (
    <div className={styles.khoContainer}>
      <Card className={styles.mainCard}>
        <div className={styles.khoHeader}>
          <div>
            <Typography.Title level={3} className={styles.khoTitleText}>
              Công việc hàng ngày
            </Typography.Title>
            <Text type="secondary">Trang tổng hợp kế thừa các tab chính từ cr_lv0158.php.</Text>
          </div>
        </div>
        <Tabs className={styles.premiumTabs} items={items} destroyInactiveTabPane={false} />
      </Card>
    </div>
  );
};

export default CongViecHangNgay;
