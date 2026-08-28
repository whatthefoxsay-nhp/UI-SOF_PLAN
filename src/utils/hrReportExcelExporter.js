import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

const HEADER_BLUE = "FF2F75B5";
const IMAGE_COLUMN_WIDTH = 16;
const IMAGE_ROW_HEIGHT = 102;

export const reportHtmlHasImages = (html = "") =>
  /<img\b[^>]*(name=["']imgView["']|alt=["']Image["']|data-sof-image-token=|images\/employees)/i.test(html);

const normalizeFileName = (fileName = "bao-cao.xlsx") =>
  fileName.replace(/\.[^.]+$/, "") + ".xlsx";

const resolveImageUrl = (src, baseHref) => {
  if (!src) return "";
  try {
    return new URL(src, baseHref || window.location.href).href;
  } catch {
    return src;
  }
};

const getHrReportPublicImageUrl = (token) =>
  token ? `http://localhost/no-image/${encodeURIComponent(token)}` : "";

const getImageSource = (img, baseHref) => {
  const token = img.getAttribute("data-sof-image-token");
  if (token) {
    return getHrReportPublicImageUrl(token);
  }
  return resolveImageUrl(img.getAttribute("src") || "", baseHref);
};

const normalizeLegacyExcelText = (value) => {
  const text = String(value || "").trim();
  const quotedTextMatch = text.match(/^'?\s*=\s*"([^"]*)"\s*$/);
  if (quotedTextMatch) {
    return quotedTextMatch[1];
  }
  return text;
};

const getText = (cell) =>
  normalizeLegacyExcelText(
    Array.from(cell.childNodes)
      .filter((node) => node.nodeName !== "IMG")
      .map((node) => node.textContent || "")
      .join(" ")
      .replace(/\s+/g, " "),
  );

const isHeaderCell = (cell, row) =>
  cell.classList.contains("tdhprint") ||
  cell.classList.contains("lvhtable") ||
  row.classList.contains("lvhtable") ||
  /^CCC?_Title/i.test(row.id || "");

const getCellAlign = (cell) => {
  const align = (cell.getAttribute("align") || cell.style.textAlign || "").toLowerCase();
  if (["center", "right", "left"].includes(align)) return align;
  return "left";
};

const nextFreeColumn = (occupied, rowNumber, startColumn) => {
  let column = startColumn;
  while (occupied.has(`${rowNumber}:${column}`)) {
    column += 1;
  }
  return column;
};

const markOccupied = (occupied, rowNumber, columnNumber, rowSpan, colSpan) => {
  for (let rowOffset = 0; rowOffset < rowSpan; rowOffset += 1) {
    for (let colOffset = 0; colOffset < colSpan; colOffset += 1) {
      occupied.add(`${rowNumber + rowOffset}:${columnNumber + colOffset}`);
    }
  }
};

const styleWorksheetCell = (worksheetCell, sourceCell, sourceRow) => {
  worksheetCell.font = {
    name: "Times New Roman",
    size: 13,
    bold: isHeaderCell(sourceCell, sourceRow),
    color: isHeaderCell(sourceCell, sourceRow) ? { argb: "FFFFFFFF" } : { argb: "FF000000" },
  };
  worksheetCell.alignment = {
    horizontal: getCellAlign(sourceCell),
    vertical: "middle",
    wrapText: true,
  };
  worksheetCell.border = {
    top: { style: "thin", color: { argb: "FFBFBFBF" } },
    left: { style: "thin", color: { argb: "FFBFBFBF" } },
    bottom: { style: "thin", color: { argb: "FFBFBFBF" } },
    right: { style: "thin", color: { argb: "FFBFBFBF" } },
  };
  if (isHeaderCell(sourceCell, sourceRow)) {
    worksheetCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: HEADER_BLUE },
    };
  }
};

const escapeFormulaText = (value) => String(value || "").replace(/"/g, '""');

const setInCellImage = (worksheet, img, rowNumber, columnNumber, baseHref) => {
  const src = getImageSource(img, baseHref);
  if (!src) return;
  worksheet.getColumn(columnNumber).width = Math.max(worksheet.getColumn(columnNumber).width || 0, IMAGE_COLUMN_WIDTH);
  worksheet.getRow(rowNumber).height = Math.max(worksheet.getRow(rowNumber).height || 0, IMAGE_ROW_HEIGHT);
  worksheet.getCell(rowNumber, columnNumber).value = {
    formula: `IMAGE("${escapeFormulaText(src)}","",0)`,
    result: "",
  };
};

export async function exportHrReportExcelWithImages(html, fileName) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const baseHref = doc.querySelector("base")?.href || window.location.href;
  const tables = Array.from(doc.querySelectorAll("table")).filter((table) => table.querySelector("tr"));

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Bao cao", {
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1 },
    properties: { defaultRowHeight: 22 },
  });
  worksheet.views = [{ state: "frozen", ySplit: 0 }];

  let rowNumber = 1;

  tables.forEach((table, tableIndex) => {
    const occupied = new Set();
    Array.from(table.rows).forEach((sourceRow) => {
      let columnNumber = 1;
      Array.from(sourceRow.cells).forEach((sourceCell) => {
        columnNumber = nextFreeColumn(occupied, rowNumber, columnNumber);
        const rowSpan = Math.max(Number(sourceCell.getAttribute("rowspan")) || 1, 1);
        const colSpan = Math.max(Number(sourceCell.getAttribute("colspan")) || 1, 1);
        const worksheetCell = worksheet.getCell(rowNumber, columnNumber);

        worksheetCell.value = getText(sourceCell);
        styleWorksheetCell(worksheetCell, sourceCell, sourceRow);

        if (rowSpan > 1 || colSpan > 1) {
          worksheet.mergeCells(rowNumber, columnNumber, rowNumber + rowSpan - 1, columnNumber + colSpan - 1);
        }

        const image = sourceCell.querySelector("img");
        if (image) {
          setInCellImage(worksheet, image, rowNumber, columnNumber, baseHref);
        }

        markOccupied(occupied, rowNumber, columnNumber, rowSpan, colSpan);
        columnNumber += colSpan;
      });
      rowNumber += 1;
    });
    if (tableIndex < tables.length - 1) rowNumber += 1;
  });

  worksheet.columns.forEach((column) => {
    if (!column.width) column.width = 14;
    column.width = Math.min(Math.max(column.width, 10), 30);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(blob, normalizeFileName(fileName));
  return true;
}
