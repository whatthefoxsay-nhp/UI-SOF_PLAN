import { Alert, Button, Drawer, Space, Statistic, Table, Tag } from "antd";
import { DownloadOutlined } from "@ant-design/icons";

const toErrorText = (value) => {
  if (Array.isArray(value)) return value.join("; ");
  if (value === null || value === undefined) return "";
  return String(value);
};

const getMainName = (row = {}, schema) => {
  const preferred = ["lv005", "lv002", schema?.primaryKey, "lv001"].filter(Boolean);
  for (const field of preferred) {
    if (row[field] !== undefined && row[field] !== null && String(row[field]).trim() !== "") {
      return row[field];
    }
  }
  return "";
};

const normalizeRows = (result, schema) => {
  const errors = (result?.errors || []).map((item, index) => ({
    key: `error-${index}`,
    type: "error",
    excelRow: item.excel_row || item.row?.__excelRow || "",
    mainName: getMainName(item.row, schema),
    detail: toErrorText(item.errors || item.message),
  }));

  const warnings = (result?.warnings || []).map((item, index) => ({
    key: `warning-${index}`,
    type: "warning",
    excelRow: item.excel_row || item.row?.__excelRow || "",
    mainName: getMainName(item.row, schema),
    detail: toErrorText(item.warnings || item.message),
  }));

  const chunkErrors = (result?.chunk_errors || []).map((item, index) => ({
    key: `chunk-${index}`,
    type: "chunk",
    excelRow: item.chunk_index ? `Chunk ${item.chunk_index}` : "",
    mainName: item.fields ? item.fields.join(", ") : "",
    detail: toErrorText(item.message || item.error),
  }));

  return [...errors, ...warnings, ...chunkErrors];
};

const columns = [
  {
    title: "Dong Excel",
    dataIndex: "excelRow",
    key: "excelRow",
    width: 120,
  },
  {
    title: "Loai",
    dataIndex: "type",
    key: "type",
    width: 120,
    render: (value) => {
      if (value === "error") return <Tag color="red">Loi</Tag>;
      if (value === "warning") return <Tag color="gold">Canh bao</Tag>;
      return <Tag color="volcano">Chunk</Tag>;
    },
  },
  {
    title: "Du lieu chinh",
    dataIndex: "mainName",
    key: "mainName",
    width: 220,
    ellipsis: true,
  },
  {
    title: "Chi tiet",
    dataIndex: "detail",
    key: "detail",
  },
];

const ExcelImportResultViewer = ({
  open,
  onClose,
  result,
  schema,
  onExportErrors,
  title = "Ket qua import Excel",
}) => {
  const rows = normalizeRows(result, schema);
  const totalProcessed = result?.total_processed || 0;
  const totalSuccess = result?.total_success || 0;
  const totalFailed = result?.total_failed || 0;
  const totalWarning = result?.total_warning || result?.warnings?.length || 0;
  const hasErrors = totalFailed > 0 || (result?.chunk_errors || []).length > 0;
  const hasWarnings = totalWarning > 0;

  return (
    <Drawer
      title={title}
      open={open}
      onClose={onClose}
      width={920}
      destroyOnClose
      extra={
        <Button
          icon={<DownloadOutlined />}
          onClick={onExportErrors}
          disabled={!result || !(result.errors || []).length}
        >
          Xuat file loi
        </Button>
      }
    >
      <Space size={16} wrap style={{ marginBottom: 16 }}>
        <Statistic title="Da xu ly" value={totalProcessed} />
        <Statistic title="Thanh cong" value={totalSuccess} valueStyle={{ color: "#3f8600" }} />
        <Statistic title="Loi du lieu" value={totalFailed} valueStyle={{ color: "#cf1322" }} />
        <Statistic title="Canh bao" value={totalWarning} valueStyle={{ color: "#d48806" }} />
      </Space>

      <Alert
        type={hasErrors ? "warning" : hasWarnings ? "info" : "success"}
        showIcon
        style={{ marginBottom: 16 }}
        message={
          hasErrors
            ? `Da nhap thanh cong ${totalSuccess} dong. Bo qua ${totalFailed} dong do loi du lieu.`
            : `Da nhap thanh cong ${totalSuccess} dong.`
        }
        description={
          hasWarnings
            ? "Mot so dong co canh bao, vi du thieu anh. Du lieu van duoc import neu khong co loi chan."
            : undefined
        }
      />

      <Table
        size="small"
        rowKey="key"
        columns={columns}
        dataSource={rows}
        pagination={{ pageSize: 20, showSizeChanger: true }}
        scroll={{ x: 900 }}
      />
    </Drawer>
  );
};

export default ExcelImportResultViewer;
