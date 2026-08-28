import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Col, DatePicker, Form, Row, Select, Space, Table, Tag, message } from "antd";
import { Search } from "lucide-react";
import { callApi } from "../../../../services/apiServices";
import styles from "../CongViecHangNgay/styles.module.css";
import ColumnSelector from "../../../../components/common/ColumnSelector/ColumnSelector";
import useSavedTablePreferences, { sortRowsByPreference } from "../../../../hooks/useSavedTablePreferences";

const DEFAULT_FIELDS = "lv199,lv003,lv049,lv002,lv004,lv005,lv006,lv007,lv013,lv014,lv001,lv010,lv009,lv008,lv027,lv089,lv026,lv016,lv015";

const toOptions = (items) =>
  (Array.isArray(items) ? items : []).map((item) => ({
    value: item.id ?? item.lv001,
    label: item.name ?? item.lv002 ?? item.lv003 ?? item.id,
  }));

const BaoCaoCongViecPhaiLamQuaHan = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [lookups, setLookups] = useState({});
  const [rows, setRows] = useState([]);
  const [columnsMeta, setColumnsMeta] = useState([]);

  const buildPayload = useCallback(() => {
    const values = form.getFieldsValue();
    return {
      txtDateFrom: values.dateRange?.[0] ? values.dateRange[0].format("DD/MM/YYYY") : "",
      txtDateTo: values.dateRange?.[1] ? values.dateRange[1].format("DD/MM/YYYY") : "",
      txtlv008: values.employeeId || "",
      txtDepID: values.departmentId || "",
      txtlv027: values.status ?? "",
      txtDayExpire: values.dayExpire ?? "",
      txtcheckall: 1,
      fieldList: DEFAULT_FIELDS,
      maxRows: 300,
    };
  }, [form]);

  const loadLookups = useCallback(async () => {
    const data = await callApi("cr_lv0085_overdue", "loadLookups", {});
    if (data?.success !== false) setLookups(data || {});
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await callApi("cr_lv0085_overdue", "loadDataView", buildPayload());
      if (data?.success === false) {
        message.error(data.message || "Không thể tải BC CV phải làm quá hạn.");
        setRows([]);
        return;
      }
      const nextRows = data?.rows || data?.data || [];
      setRows(nextRows.map((row, index) => ({ ...row, key: row.key || row._raw?.lv001 || index })));
      setColumnsMeta(data?.columns || []);
    } catch (error) {
      console.error("Failed to load overdue todo report:", error);
      message.error("Không thể tải BC CV phải làm quá hạn.");
    } finally {
      setLoading(false);
    }
  }, [buildPayload]);

  useEffect(() => {
    loadLookups();
  }, [loadLookups]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const columns = useMemo(() => {
    const source = columnsMeta.length ? columnsMeta : DEFAULT_FIELDS.split(",").map((field) => ({ key: field, dataIndex: field, title: field }));
    return [
      {
        title: "Quá hạn",
        dataIndex: "overdueDays",
        key: "overdueDays",
        width: 105,
        fixed: "left",
        render: (value) => <Tag color="red">{value || 0} ngày</Tag>,
      },
      ...source
        .filter((col) => (col.key || col.dataIndex) !== "lv199")
        .map((col) => ({
          ...col,
          width: ["lv004", "lv014"].includes(col.key || col.dataIndex) ? 260 : 145,
          ellipsis: true,
          render: (value, record) => {
            const key = col.key || col.dataIndex;
            if (key === "lv005") {
              return <span style={{ color: "#dc2626", fontWeight: 600 }}>{value}</span>;
            }
            if (key === "lv027") {
              const status = `${record._raw?.lv027 ?? ""}`;
              if (status === "1") return <Tag color="warning">Đợi duyệt</Tag>;
              return <Tag color="processing">Đang thực hiện</Tag>;
            }
            if (key === "lv016") {
              return record._raw?.lv016 === "1" || record._raw?.lv016 === 1 ? <Tag color="green">Hoàn tất</Tag> : <Tag>Chưa</Tag>;
            }
            return value;
          },
        })),
    ];
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
    tableName: "cr_lv0085_overdue",
    allColumns: columns,
    requiredKeys: ["overdueDays", "lv003", "lv004", "lv005"],
    defaultFieldList: "overdueDays,lv003,lv049,lv002,lv004,lv005,lv006,lv007,lv013,lv014,lv001,lv010,lv009,lv008,lv027,lv089,lv026,lv016,lv015",
    currentPage: 1,
    pageSize: 300,
  });

  const displayRows = useMemo(() => sortRowsByPreference(rows, sortOrder, sortFieldOrder), [rows, sortOrder, sortFieldOrder]);

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
              <Form.Item label="Trạng thái" name="status">
                <Select dropdownMatchSelectWidth={false} allowClear options={toOptions(lookups.statuses)} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} lg={4}>
              <Form.Item label="Số ngày quá hạn" name="dayExpire">
                <Select dropdownMatchSelectWidth={false} allowClear options={toOptions(lookups.dayExpires)} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
        <Space>
          <Button type="primary" icon={<Search size={16} />} onClick={loadData} loading={loading}>
            Tìm kiếm
          </Button>
          <ColumnSelector
            allColumns={columns}
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
      <Table
        className={styles.dataTable}
        columns={displayColumns}
        dataSource={displayRows}
        loading={loading}
        size="small"
        scroll={{ x: 2200 }}
        pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (total) => `${total} dòng` }}
      />
    </div>
  );
};

export default BaoCaoCongViecPhaiLamQuaHan;
