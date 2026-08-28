import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Col, DatePicker, Form, Row, Select, Space, Table, Tag, message } from "antd";
import dayjs from "dayjs";
import { Search } from "lucide-react";
import { callApi } from "../../../../services/apiServices";
import styles from "../CongViecHangNgay/styles.module.css";
import ColumnSelector from "../../../../components/common/ColumnSelector/ColumnSelector";
import useSavedTablePreferences, { sortRowsByPreference } from "../../../../hooks/useSavedTablePreferences";

const DEFAULT_FIELDS = "lv015,lv008,lv499,lv005,lv016,lv902,lv909,lv014,lv003,lv004,lv011,lv012,lv013,lv006,lv009";

const toOptions = (items) =>
  (Array.isArray(items) ? items : []).map((item) => ({
    value: item.id ?? item.lv001,
    label: item.name ?? item.lv002 ?? item.lv003 ?? item.id,
  }));

const BaoCaoCongViecChuaHoanThanh = () => {
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
      txtlv013: values.completeStatus ?? "",
      txtlv009: values.warningStatus ?? "",
      fieldList: DEFAULT_FIELDS,
      maxRows: 300,
    };
  }, [form]);

  const loadLookups = useCallback(async () => {
    const data = await callApi("cr_lv0158_unfinished", "loadLookups", {});
    if (data?.success !== false) setLookups(data || {});
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await callApi("cr_lv0158_unfinished", "loadDataView", buildPayload());
      if (data?.success === false) {
        message.error(data.message || "Không thể tải BCCV chưa hoàn thành.");
        setRows([]);
        return;
      }
      const nextRows = data?.rows || data?.data || [];
      setRows(nextRows.map((row, index) => ({ ...row, key: row.key || row._raw?.lv001 || index })));
      setColumnsMeta(data?.columns || []);
    } catch (error) {
      console.error("Failed to load unfinished daily report:", error);
      message.error("Không thể tải BCCV chưa hoàn thành.");
    } finally {
      setLoading(false);
    }
  }, [buildPayload]);

  useEffect(() => {
    form.setFieldsValue({ dateRange: [dayjs().subtract(9, "day"), dayjs()] });
    loadLookups();
  }, [form, loadLookups]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const columns = useMemo(
    () =>
      (columnsMeta.length ? columnsMeta : DEFAULT_FIELDS.split(",").map((field) => ({ key: field, dataIndex: field, title: field }))).map((col) => ({
        ...col,
        width: ["lv016", "lv004", "lv012"].includes(col.key || col.dataIndex) ? 240 : 140,
        ellipsis: true,
        render: (value, record) => {
          const key = col.key || col.dataIndex;
          if (key === "lv013") {
            return record._raw?.lv013 === "1" || record._raw?.lv013 === 1 ? <Tag color="green">Hoàn thành</Tag> : <Tag color="orange">Chưa hoàn thành</Tag>;
          }
          if (key === "lv009") {
            const status = `${record._raw?.lv009 ?? ""}`;
            if (status === "2") return <Tag color="red">Đã khóa cảnh báo</Tag>;
            if (status === "1") return <Tag color="blue">Đã cảnh báo</Tag>;
            return <Tag>Chưa cảnh báo</Tag>;
          }
          return value;
        },
      })),
    [columnsMeta],
  );

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
    tableName: "cr_lv0158_unfinished",
    allColumns: columns,
    requiredKeys: ["lv015", "lv008", "lv005", "lv016"],
    defaultFieldList: DEFAULT_FIELDS,
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
        scroll={{ x: 1900 }}
        pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (total) => `${total} dòng` }}
      />
    </div>
  );
};

export default BaoCaoCongViecChuaHoanThanh;
