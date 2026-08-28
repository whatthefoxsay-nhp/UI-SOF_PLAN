import axios from "axios";
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { url_api_services } from "./url";
import { getAuthHeaders } from "./apiLogin";
import { uploadImageToTokenSystem } from "./apiServices";

const DEFAULT_TEMPLATE_SHEET = "Nhap_Lieu";
const DEFAULT_LOOKUP_SHEET = "Danh_Muc_He_Thong";
const DEFAULT_ZIP_MAX_SIZE = 50 * 1024 * 1024;

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const normalizeText = (value) =>
  value === null || value === undefined ? "" : String(value).trim();

const normalizeFileName = (value) =>
  normalizeText(value).replace(/\\/g, "/").split("/").pop().toLowerCase();

const isLvField = (field) => /^lv\d{3}$/.test(normalizeText(field));

const flattenColumns = (columns = []) => {
  const output = [];
  columns.forEach((column) => {
    if (!column) return;
    if (Array.isArray(column.children) && column.children.length) {
      output.push(...flattenColumns(column.children));
      return;
    }
    output.push(column);
  });
  return output;
};

const getColumnField = (column) => {
  const dataIndex = Array.isArray(column?.dataIndex)
    ? column.dataIndex.join(".")
    : column?.dataIndex;
  return normalizeText(dataIndex || column?.key);
};

const getColumnTitle = (column, fallback) => {
  if (column?.importTitle) return normalizeText(column.importTitle);
  if (typeof column?.title === "string") return normalizeText(column.title);
  if (typeof column?.title === "number") return String(column.title);
  return fallback;
};

const getImportColumns = (columns = [], importConfig = {}) => {
  const exclude = new Set(importConfig.excludeFields || []);
  const include = new Set(importConfig.includeFields || []);
  const overrides = importConfig.fields || {};
  const seen = new Set();

  return flattenColumns(columns)
    .map((column) => {
      const field = getColumnField(column);
      const override = overrides[field] || {};
      const shouldIgnore =
        column.importIgnore === true ||
        column.importHidden === true ||
        override.importIgnore === true ||
        exclude.has(field);

      if (!field || shouldIgnore || seen.has(field)) return null;
      if (include.size && !include.has(field)) return null;
      if (!isLvField(field) && override.allowNonLvField !== true) return null;

      seen.add(field);
      const title = getColumnTitle(column, override.title || field);
      const rules = {
        ...(column.importRules || {}),
        ...(override.rules || {}),
      };

      return {
        title,
        field,
        type: override.type || rules.type || column.importType || "string",
        required:
          override.required ??
          rules.required ??
          (importConfig.requiredFields || []).includes(field) ??
          false,
        unique:
          override.unique ??
          rules.unique ??
          (importConfig.uniqueFields || []).includes(field) ??
          false,
        lookupKey:
          override.lookupKey ||
          rules.lookupKey ||
          importConfig.lookupFields?.[field]?.key ||
          importConfig.lookupFields?.[field],
        maxLength: override.maxLength ?? rules.maxLength,
        min: override.min ?? rules.min,
        max: override.max ?? rules.max,
        integer: override.integer ?? rules.integer,
        options: override.options || rules.options,
        defaultValue: override.defaultValue ?? rules.defaultValue,
        image: override.image ?? (importConfig.imageFields || []).includes(field),
      };
    })
    .filter(Boolean);
};

export const buildImportSchemaFromColumns = (columns = [], importConfig = {}) => {
  const importColumns = getImportColumns(columns, importConfig);
  const schema = {
    tableName: importConfig.tableName,
    rightCode: importConfig.rightCode,
    primaryKey: importConfig.primaryKey || "lv001",
    chunkSize: importConfig.chunkSize || 500,
    columns: importColumns,
    uniqueFields: importColumns.filter((item) => item.unique).map((item) => item.field),
    requiredFields: importColumns.filter((item) => item.required).map((item) => item.field),
    imageFields: importColumns.filter((item) => item.image).map((item) => item.field),
    lookupFields: importConfig.lookupFields || {},
    defaults: importConfig.defaults || {},
    headerRowIndex: importConfig.headerRowIndex ?? 0,
  };
  console.log("[ExcelImportService] Built schema:", schema);
  return schema;
};

export const getImportExcelEndpoint = (endpoint) => {
  if (endpoint) return endpoint;
  return url_api_services.replace(/index\.php(\?.*)?$/, "importExcel.php");
};

export const loadExcelImportLookups = async (schema, options = {}) => {
  console.log("[ExcelImportService] Loading lookups for schema tableName:", schema.tableName);
  const headers = await getAuthHeaders();
  const endpoint = getImportExcelEndpoint(options.endpoint);
  console.log("[ExcelImportService] Requesting lookups from endpoint:", endpoint);
  const response = await axios.post(
    endpoint,
    { func: "loadLookups", schema },
    { headers },
  );
  console.log("[ExcelImportService] Load lookups response:", response.data);
  return response.data;
};

const sheetColumnName = (index) => {
  let name = "";
  let current = index + 1;
  while (current > 0) {
    const mod = (current - 1) % 26;
    name = String.fromCharCode(65 + mod) + name;
    current = Math.floor((current - mod) / 26);
  }
  return name;
};

const applyColumnWidths = (worksheet, schema) => {
  worksheet["!cols"] = schema.columns.map((column) => ({
    wch: Math.max(14, Math.min(42, column.title.length + 6)),
  }));
};

const addLookupSheet = (workbook, schema, lookupPayload) => {
  const lookupEntries = Object.entries(schema.lookupFields || {});
  if (!lookupEntries.length) return {};

  const sheetRows = [];
  const ranges = {};
  const maxRows = Math.max(
    1,
    ...lookupEntries.map(([, config]) => {
      const key = isPlainObject(config) ? config.key : config;
      return lookupPayload?.lookups?.[key]?.length || 0;
    }),
  );

  sheetRows.push(lookupEntries.map(([field]) => field));
  for (let rowIndex = 0; rowIndex < maxRows; rowIndex += 1) {
    sheetRows.push(
      lookupEntries.map(([, config]) => {
        const key = isPlainObject(config) ? config.key : config;
        const item = lookupPayload?.lookups?.[key]?.[rowIndex];
        if (!item) return "";
        return `[${item.value}] ${item.label}`;
      }),
    );
  }

  const lookupSheet = XLSX.utils.aoa_to_sheet(sheetRows);
  lookupSheet["!cols"] = lookupEntries.map(() => ({ wch: 36 }));
  XLSX.utils.book_append_sheet(workbook, lookupSheet, DEFAULT_LOOKUP_SHEET);

  lookupEntries.forEach(([field], index) => {
    const columnName = sheetColumnName(index);
    const count = Math.max(1, maxRows);
    ranges[field] = `${DEFAULT_LOOKUP_SHEET}!$${columnName}$2:$${columnName}$${count + 1}`;
  });

  const sheetMeta = workbook.Workbook || {};
  sheetMeta.Sheets = sheetMeta.Sheets || [];
  sheetMeta.Sheets.push({ name: DEFAULT_LOOKUP_SHEET, Hidden: 1 });
  workbook.Workbook = sheetMeta;
  return ranges;
};

const addDataValidations = (worksheet, schema, lookupRanges, rowCount) => {
  worksheet["!dataValidation"] = [];
  schema.columns.forEach((column, index) => {
    const excelColumn = sheetColumnName(index);
    const sqref = `${excelColumn}2:${excelColumn}${rowCount + 1}`;

    if (column.lookupKey && lookupRanges[column.field]) {
      worksheet["!dataValidation"].push({
        sqref,
        type: "list",
        allowBlank: !column.required,
        formulas: [lookupRanges[column.field]],
      });
      return;
    }

    if (Array.isArray(column.options) && column.options.length) {
      worksheet["!dataValidation"].push({
        sqref,
        type: "list",
        allowBlank: !column.required,
        formulas: [`"${column.options.join(",")}"`],
      });
    }
  });
};

export const exportExcelTemplateFromColumns = async ({
  columns,
  importConfig = {},
  lookups,
  fileName,
  sampleRowCount = 200,
  endpoint,
}) => {
  console.log("[ExcelImportService] Starting exportExcelTemplateFromColumns with columns count:", columns.length, "fileName:", fileName, "endpoint: ",endpoint);
  const schema = buildImportSchemaFromColumns(columns, importConfig);
  const lookupPayload = lookups || (await loadExcelImportLookups(schema, { endpoint }));
  console.log("[ExcelImportService] Fetched lookupPayload:", lookupPayload);

  // Create ExcelJS workbook
  const workbook = new ExcelJS.Workbook();
  
  // 1. Create main sheet
  const worksheet = workbook.addWorksheet(DEFAULT_TEMPLATE_SHEET, {
    views: [{ showGridLines: true }]
  });

  // 2. Create lookup sheet and build ranges
  const lookupEntries = Object.entries(schema.lookupFields || {});
  const lookupRanges = {};
  let lookupWorksheet = null;
  let maxRows = 1;

  if (lookupEntries.length > 0) {
    lookupWorksheet = workbook.addWorksheet(DEFAULT_LOOKUP_SHEET);
    maxRows = Math.max(
      1,
      ...lookupEntries.map(([, config]) => {
        const key = isPlainObject(config) ? config.key : config;
        return lookupPayload?.lookups?.[key]?.length || 0;
      })
    );

    // Write lookup headers
    const lookupHeaders = lookupEntries.map(([field]) => field);
    lookupWorksheet.addRow(lookupHeaders);

    // Write lookup data
    for (let rowIndex = 0; rowIndex < maxRows; rowIndex++) {
      const rowData = lookupEntries.map(([, config]) => {
        const key = isPlainObject(config) ? config.key : config;
        const item = lookupPayload?.lookups?.[key]?.[rowIndex];
        if (!item) return "";
        return `[${item.value}] ${item.label}`;
      });
      lookupWorksheet.addRow(rowData);
    }

    // Hide lookup sheet
    lookupWorksheet.state = "hidden";

    // Build lookup ranges
    lookupEntries.forEach(([field], index) => {
      const columnName = sheetColumnName(index);
      const count = Math.max(1, maxRows);
      lookupRanges[field] = `${DEFAULT_LOOKUP_SHEET}!$${columnName}$2:$${columnName}$${count + 1}`;
    });
  }

  // 3. Write instruction banner on main sheet (Rows 1 to 4)
  const totalCols = schema.columns.length;
  const colLetterLimit = sheetColumnName(totalCols - 1);

  // Row 1: Merged Title
  worksheet.mergeCells(`A1:${colLetterLimit}1`);
  const titleRow = worksheet.getRow(1);
  titleRow.height = 35;
  const titleCell = titleRow.getCell(1);
  titleCell.value = "MẪU NHẬP LIỆU SẢN PHẨM WEBSITE - SOF PLAN";
  titleCell.font = { name: "Segoe UI", size: 14, bold: true, color: { argb: "FF1F4E78" } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  titleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFDDEBF7" }
  };

  // Row 2: Instruction line 1
  worksheet.mergeCells(`A2:${colLetterLimit}2`);
  const inst1Row = worksheet.getRow(2);
  inst1Row.height = 20;
  const inst1Cell = inst1Row.getCell(1);
  inst1Cell.value = "• Hướng dẫn nhập: Điền thông tin vào các cột dưới đây. Các cột có dấu (*) ở tiêu đề là BẮT BUỘC.";
  inst1Cell.font = { name: "Segoe UI", size: 10, italic: true, color: { argb: "FF595959" } };
  inst1Cell.alignment = { vertical: "middle" };

  // Row 3: Instruction line 2
  worksheet.mergeCells(`A3:${colLetterLimit}3`);
  const inst2Row = worksheet.getRow(3);
  inst2Row.height = 20;
  const inst2Cell = inst2Row.getCell(1);
  inst2Cell.value = "• Cột Danh mục (Nhà CC, Loại SP, Đơn vị tính, Tiền tệ): Click chọn từ Dropdown hoặc điền đúng cú pháp [Mã] Tên (ví dụ: [VND] VNĐ).";
  inst2Cell.font = { name: "Segoe UI", size: 10, italic: true, color: { argb: "FF595959" } };
  inst2Cell.alignment = { vertical: "middle" };

  // Row 4: Instruction line 3
  worksheet.mergeCells(`A4:${colLetterLimit}4`);
  const inst3Row = worksheet.getRow(4);
  inst3Row.height = 20;
  const inst3Cell = inst3Row.getCell(1);
  inst3Cell.value = "• Cột Hình ảnh (Hình nhỏ, Hình lớn): Điền tên file ảnh (ví dụ: sp1.png) và nén tất cả file ảnh thành 1 tệp ZIP để upload cùng Excel.";
  inst3Cell.font = { name: "Segoe UI", size: 10, italic: true, color: { argb: "FF595959" } };
  inst3Cell.alignment = { vertical: "middle" };

  // Row 5: Column Headers
  const headerRow = worksheet.getRow(5);
  headerRow.height = 28;
  schema.columns.forEach((column, index) => {
    const colNum = index + 1;
    const cell = headerRow.getCell(colNum);
    const isRequired = column.required;
    cell.value = isRequired ? `${column.title} (*)` : column.title;
    
    // Header styling
    cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1F4E78" } // Steel Navy Blue
    };
    cell.border = {
      top: { style: "thin", color: { argb: "FF000000" } },
      left: { style: "thin", color: { argb: "FF000000" } },
      bottom: { style: "medium", color: { argb: "FF000000" } },
      right: { style: "thin", color: { argb: "FF000000" } }
    };
  });

  // Helper for sample values
  const getSampleValue = (column, rowIndex, lookupPayload) => {
    const isSecondRow = rowIndex === 1;
    const lookupKey = column.lookupKey;
    if (lookupKey && lookupPayload?.lookups?.[lookupKey]) {
      const list = lookupPayload.lookups[lookupKey];
      if (list.length > 0) {
        const item = list[isSecondRow ? Math.min(1, list.length - 1) : 0];
        return `[${item.value}] ${item.label}`;
      }
    }

    switch (column.field) {
      case "lv001":
        return "";
      case "lv002":
        return isSecondRow ? "SP002" : "SP001";
      case "lv005":
        return isSecondRow ? "Giấy in bill nhiệt K80x45mm" : "Máy in hóa đơn nhiệt Xprinter Q80c";
      case "lv007":
        return isSecondRow ? "85000" : "1850000";
      case "lv018":
        return isSecondRow ? "50000" : "1500000";
      case "lv006":
        return isSecondRow ? "[cai] Cái" : "[bo] Bộ";
      case "lv008":
        return isSecondRow ? "200" : "50";
      case "lv010":
        return isSecondRow ? "giay_in_k80.jpg" : "may_in_xprinter.jpg";
      case "lv011":
        return isSecondRow ? "giay_in_k80_large.jpg" : "may_in_xprinter_large.jpg";
      case "lv012":
        return isSecondRow ? "Khong" : "Co";
      case "lv014":
        return "Mo";
      case "lv015":
        return isSecondRow ? "2" : "1";
      case "lv016":
        return "0";
      case "lv017":
        return "100";
      case "lv101":
        return "0";
      case "lv103":
        return "0";
      case "lv102":
        return "https://sof.vn";
      case "lv066":
        return "";
      default:
        if (column.type === "boolean") {
          return isSecondRow ? "Khong" : "Co";
        }
        if (column.type === "integer" || column.type === "number" || column.type === "currency") {
          return "0";
        }
        return "";
    }
  };

  // 4. Fill 2 sample rows (Rows 6 & 7)
  for (let rowIndex = 0; rowIndex < 2; rowIndex++) {
    const rowNum = 6 + rowIndex;
    const row = worksheet.getRow(rowNum);
    row.height = 20;

    schema.columns.forEach((column, colIndex) => {
      const cell = row.getCell(colIndex + 1);
      cell.value = getSampleValue(column, rowIndex, lookupPayload);
      
      // Sample row styling: light gray italic text so users know it's a sample
      cell.font = { name: "Segoe UI", size: 10, italic: true, color: { argb: "FF8C8C8C" } };
      cell.alignment = { vertical: "middle" };
      cell.border = {
        top: { style: "thin", color: { argb: "FFD3D3D3" } },
        left: { style: "thin", color: { argb: "FFD3D3D3" } },
        bottom: { style: "thin", color: { argb: "FFD3D3D3" } },
        right: { style: "thin", color: { argb: "FFD3D3D3" } }
      };
      
      // Keep as text (string) since user wants money as string in db, but format numbers nicely
      if (column.type === "integer" || column.type === "number") {
        cell.numFmt = "#,##0";
      } else {
        cell.numFmt = "@";
      }
    });
  }

  // 5. Format input rows (Rows 8 to sampleRowCount + 7)
  const dataStartRow = 8;
  const dataEndRow = sampleRowCount + 7;
  for (let rowNum = dataStartRow; rowNum <= dataEndRow; rowNum++) {
    const row = worksheet.getRow(rowNum);
    row.height = 20;
    schema.columns.forEach((column, colIndex) => {
      const cell = row.getCell(colIndex + 1);
      cell.font = { name: "Segoe UI", size: 10 };
      cell.alignment = { vertical: "middle" };
      cell.border = {
        top: { style: "thin", color: { argb: "FFE0E0E0" } },
        left: { style: "thin", color: { argb: "FFE0E0E0" } },
        bottom: { style: "thin", color: { argb: "FFE0E0E0" } },
        right: { style: "thin", color: { argb: "FFE0E0E0" } }
      };

      if (column.type === "integer" || column.type === "number") {
        cell.numFmt = "#,##0";
      } else {
        cell.numFmt = "@";
      }
    });
  }

  // 6. Set column widths
  schema.columns.forEach((column, index) => {
    const colObj = worksheet.getColumn(index + 1);
    const titleLength = column.title.length + 8;
    colObj.width = Math.max(16, Math.min(42, titleLength));
  });

  // 7. Add Data Validations
  for (let colIndex = 0; colIndex < schema.columns.length; colIndex++) {
    const column = schema.columns[colIndex];

    if (column.lookupKey && lookupRanges[column.field]) {
      console.log(`[ExcelImportService] Gán validation danh mục cho cột "${column.field}" từ:`, lookupRanges[column.field]);
      for (let r = 6; r <= dataEndRow; r++) {
        const cell = worksheet.getRow(r).getCell(colIndex + 1);
        cell.dataValidation = {
          type: "list",
          allowBlank: !column.required,
          formulae: [lookupRanges[column.field]],
          showErrorMessage: true,
          errorTitle: "Lỗi nhập liệu",
          error: "Vui lòng chọn một giá trị trong danh mục có sẵn."
        };
      }
    } else if (Array.isArray(column.options) && column.options.length > 0) {
      console.log(`[ExcelImportService] Gán validation options cho cột "${column.field}":`, column.options);
      for (let r = 6; r <= dataEndRow; r++) {
        const cell = worksheet.getRow(r).getCell(colIndex + 1);
        cell.dataValidation = {
          type: "list",
          allowBlank: !column.required,
          formulae: [`"${column.options.join(",")}"`],
          showErrorMessage: true,
          errorTitle: "Lỗi nhập liệu",
          error: `Vui lòng chọn một trong các giá trị: ${column.options.join(", ")}`
        };
      }
    }
  }

  // Save workbook to file using file-saver
  console.log("[ExcelImportService] Workbook generated. Downloading file...");
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  saveAs(blob, fileName || `${schema.tableName || "import"}_template.xlsx`);
  console.log("[ExcelImportService] Download triggered for file:", fileName);

  return schema;
};

export const parseExcelFileToRows = async (file, schema) => {
  console.log("[ExcelImportService] Starting parseExcelFileToRows for file:", file.name, "size:", file.size);
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const worksheet = workbook.Sheets[DEFAULT_TEMPLATE_SHEET] || workbook.Sheets[workbook.SheetNames[0]];
  if (!worksheet) {
    console.warn("[ExcelImportService] No worksheet found matching Name:", DEFAULT_TEMPLATE_SHEET);
    return [];
  }

  const startRow = schema.headerRowIndex ?? 0;
  const rows = XLSX.utils.sheet_to_json(worksheet, { range: startRow, defval: "", raw: false });
  console.log("[ExcelImportService] Raw parsed worksheet rows count:", rows.length);
  const titleFieldMap = new Map();

  schema.columns.forEach(column => {
    titleFieldMap.set(column.title, column.field);
    titleFieldMap.set(`${column.title} (*)`, column.field);
  });
  console.log("[ExcelImportService] Map titles to fields:", Array.from(titleFieldMap.entries()));

  const parsedRows = rows
    .map((row, index) => {
      const normalized = { __excelRow: startRow + index + 2 };
      Object.entries(row).forEach(([title, value]) => {
        const normalizedTitle = String(title).trim();
        const field = titleFieldMap.get(normalizedTitle);
        if (field) normalized[field] = value;
      });
      return normalized;
    })
    .filter((row) =>
      schema.columns.some((column) => normalizeText(row[column.field]) !== ""),
    );

  console.log("[ExcelImportService] Normalized and filtered rows count:", parsedRows.length, parsedRows);
  return parsedRows;
};

const loadJsZip = async () => {
  try {
    const module = await import("jszip");
    return module.default || module;
  } catch (error) {
    throw new Error("Chua cai dat thu vien jszip. Vui long cai dat jszip de xu ly file ZIP anh.");
  }
};

export const attachImageTokensFromZip = async ({
  rows,
  schema,
  zipFile,
  maxZipSize = DEFAULT_ZIP_MAX_SIZE,
  uploadMethod = "auto",
  onProgress,
}) => {
  if (!zipFile) return { rows, warnings: [] };
  console.log("[ExcelImportService] Starting attachImageTokensFromZip for file:", zipFile.name, "rows count:", rows.length);
  if (zipFile.size > maxZipSize) {
    throw new Error("File ZIP anh vuot qua 50MB.");
  }

  const JSZip = await loadJsZip();
  const zip = await JSZip.loadAsync(zipFile);
  const imageMap = new Map();

  Object.values(zip.files).forEach((entry) => {
    if (!entry.dir) imageMap.set(normalizeFileName(entry.name), entry);
  });
  console.log("[ExcelImportService] Files mapped from ZIP:", Array.from(imageMap.keys()));

  const warnings = [];
  const imageFields = schema.imageFields || [];
  let done = 0;
  const total = rows.length * imageFields.length;

  for (const row of rows) {
    row.__warnings = Array.isArray(row.__warnings) ? row.__warnings : [];
    for (const field of imageFields) {
      const declaredName = normalizeFileName(row[field]);
      if (!declaredName) continue;
      const entry = imageMap.get(declaredName);
      if (!entry) {
        const warning = {
          excel_row: row.__excelRow,
          field,
          message: `Khong tim thay anh ${row[field]} trong file ZIP. Du lieu van duoc import, vui long cap nhat anh sau.`,
        };
        console.warn(`[ExcelImportService] Row ${row.__excelRow}: warning - ${warning.message}`);
        row.__warnings.push(warning.message);
        warnings.push(warning);
        continue;
      }

      console.log(`[ExcelImportService] Row ${row.__excelRow}: Uploading image file "${declaredName}" for field "${field}"...`);
      const blob = await entry.async("blob");
      const file = new File([blob], declaredName, { type: blob.type || "image/*" });
      const result = await uploadImageToTokenSystem(file, "", uploadMethod);
      if (result?.success && result.token) {
        console.log(`[ExcelImportService] Row ${row.__excelRow}: Successfully uploaded image "${declaredName}" to token "${result.token}"`);
        row[field] = result.token;
      } else {
        const warning = {
          excel_row: row.__excelRow,
          field,
          message: result?.message || `Khong the upload anh ${declaredName}.`,
        };
        console.error(`[ExcelImportService] Row ${row.__excelRow}: error uploading image "${declaredName}" - ${warning.message}`);
        row.__warnings.push(warning.message);
        warnings.push(warning);
      }
      done += 1;
      if (typeof onProgress === "function") onProgress({ done, total, row, field });
    }
  }

  return { rows, warnings };
};

export const submitExcelImportRows = async ({ schema, rows, warnings = [], endpoint }) => {
  console.log("[ExcelImportService] Submitting rows to backend endpoint. Rows count:", rows.length, "warnings count:", warnings.length);
  console.log("[ExcelImportService] Submitting request payload:", { func: "importRows", schema, rows, warnings });
  const headers = await getAuthHeaders();
  const response = await axios.post(
    getImportExcelEndpoint(endpoint),
    { func: "importRows", schema, rows, warnings },
    { headers },
  );
  console.log("[ExcelImportService] Server submit response:", response.data);
  return response.data;
};

export const exportImportErrorWorkbook = async (result, schema, fileName) => {
  const errors = result?.errors || [];

  // Create ExcelJS workbook
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Loi_Import", {
    views: [{ showGridLines: true }]
  });

  const columns = [...schema.columns];
  const totalCols = columns.length + 2; // schema columns + Excel Row + Error Detail
  const colLetterLimit = sheetColumnName(totalCols - 1);

  // 1. Title Banner
  worksheet.mergeCells(`A1:${colLetterLimit}1`);
  const titleRow = worksheet.getRow(1);
  titleRow.height = 35;
  const titleCell = titleRow.getCell(1);
  titleCell.value = "BÁO CÁO LỖI NHẬP LIỆU SẢN PHẨM - SOF PLAN";
  titleCell.font = { name: "Segoe UI", size: 14, bold: true, color: { argb: "FFC00000" } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  titleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFCE4D6" } // Light orange background for errors
  };

  // 2. Instructions Row
  worksheet.mergeCells(`A2:${colLetterLimit}2`);
  const instRow = worksheet.getRow(2);
  instRow.height = 20;
  const instCell = instRow.getCell(1);
  instCell.value = "• Hướng dẫn sửa lỗi: Xem chi tiết lỗi ở cột cuối cùng, thực hiện điều chỉnh dữ liệu và import lại file này.";
  instCell.font = { name: "Segoe UI", size: 10, italic: true, color: { argb: "FF595959" } };
  instCell.alignment = { vertical: "middle" };

  // 3. Header Row (Row 4)
  const headerRow = worksheet.getRow(4);
  headerRow.height = 28;

  columns.forEach((column, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = column.title;
    cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1F4E78" } // Steel Navy
    };
    cell.border = {
      top: { style: "thin", color: { argb: "FF000000" } },
      left: { style: "thin", color: { argb: "FF000000" } },
      bottom: { style: "medium", color: { argb: "FF000000" } },
      right: { style: "thin", color: { argb: "FF000000" } }
    };
  });

  // Add Excel Row header
  const rowCell = headerRow.getCell(columns.length + 1);
  rowCell.value = "Dòng trên Excel";
  rowCell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
  rowCell.alignment = { horizontal: "center", vertical: "middle" };
  rowCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1F4E78" }
  };
  rowCell.border = {
    top: { style: "thin", color: { argb: "FF000000" } },
    left: { style: "thin", color: { argb: "FF000000" } },
    bottom: { style: "medium", color: { argb: "FF000000" } },
    right: { style: "thin", color: { argb: "FF000000" } }
  };

  // Add Error Detail header
  const errorCell = headerRow.getCell(columns.length + 2);
  errorCell.value = "Chi tiết lỗi";
  errorCell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
  errorCell.alignment = { horizontal: "center", vertical: "middle" };
  errorCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFC00000" }
  };
  errorCell.border = {
    top: { style: "thin", color: { argb: "FF000000" } },
    left: { style: "thin", color: { argb: "FF000000" } },
    bottom: { style: "medium", color: { argb: "FF000000" } },
    right: { style: "thin", color: { argb: "FF000000" } }
  };

  // 4. Data Rows (Row 5+)
  errors.forEach((item, rowIndex) => {
    const rowNum = 5 + rowIndex;
    const row = worksheet.getRow(rowNum);
    row.height = 20;
    const source = item.row || {};

    columns.forEach((column, colIndex) => {
      const cell = row.getCell(colIndex + 1);
      cell.value = source[column.field] ?? "";
      cell.font = { name: "Segoe UI", size: 10, color: { argb: "FF000000" } }; // Default black text color
      cell.alignment = { vertical: "middle" };
      cell.border = {
        top: { style: "thin", color: { argb: "FFE0E0E0" } },
        left: { style: "thin", color: { argb: "FFE0E0E0" } },
        bottom: { style: "thin", color: { argb: "FFE0E0E0" } },
        right: { style: "thin", color: { argb: "FFE0E0E0" } }
      };
    });

    const rowNumCell = row.getCell(columns.length + 1);
    rowNumCell.value = item.excel_row || source.__excelRow || "";
    rowNumCell.font = { name: "Segoe UI", size: 10, color: { argb: "FF000000" } };
    rowNumCell.alignment = { horizontal: "center", vertical: "middle" };
    rowNumCell.border = {
      top: { style: "thin", color: { argb: "FFE0E0E0" } },
      left: { style: "thin", color: { argb: "FFE0E0E0" } },
      bottom: { style: "thin", color: { argb: "FFE0E0E0" } },
      right: { style: "thin", color: { argb: "FFE0E0E0" } }
    };

    const errDetailCell = row.getCell(columns.length + 2);
    errDetailCell.value = Array.isArray(item.errors) ? item.errors.join("; ") : (item.message || "");
    errDetailCell.font = { name: "Segoe UI", size: 10, color: { argb: "FFC00000" }, bold: true };
    errDetailCell.alignment = { vertical: "middle" };
    errDetailCell.border = {
      top: { style: "thin", color: { argb: "FFE0E0E0" } },
      left: { style: "thin", color: { argb: "FFE0E0E0" } },
      bottom: { style: "thin", color: { argb: "FFE0E0E0" } },
      right: { style: "thin", color: { argb: "FFE0E0E0" } }
    };
  });

  // 5. Column Widths
  schema.columns.forEach((column, index) => {
    const colObj = worksheet.getColumn(index + 1);
    const titleLength = column.title.length + 8;
    colObj.width = Math.max(16, Math.min(42, titleLength));
  });
  worksheet.getColumn(columns.length + 1).width = 16;
  worksheet.getColumn(columns.length + 2).width = 50;

  // Save workbook to file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  saveAs(blob, fileName || `${schema.tableName || "import"}_errors.xlsx`);
};

export const createExcelImportWorkflow = ({ columns, importConfig, endpoint }) => {
  const schema = buildImportSchemaFromColumns(columns, importConfig);
  return {
    schema,
    exportTemplate: (options = {}) =>
      exportExcelTemplateFromColumns({ columns, importConfig, endpoint, ...options }),
    parseRows: (file) => parseExcelFileToRows(file, schema),
    attachImages: (params) => attachImageTokensFromZip({ schema, ...params }),
    submit: (rows, options = {}) =>
      submitExcelImportRows({ schema, rows, endpoint, ...options }),
    exportErrors: (result, fileName) => exportImportErrorWorkbook(result, schema, fileName),
  };
};

export default {
  buildImportSchemaFromColumns,
  createExcelImportWorkflow,
  exportExcelTemplateFromColumns,
  parseExcelFileToRows,
  attachImageTokensFromZip,
  submitExcelImportRows,
  exportImportErrorWorkbook,
};
