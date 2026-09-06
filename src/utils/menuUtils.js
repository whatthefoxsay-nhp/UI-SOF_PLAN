import React from 'react';
import * as Icons from 'lucide-react';

export const pathLabelMap = {
  "/quan-ly-ke-hoach": { label: "Quản lý kế hoạch", iconName: "Briefcase" },
  "/xem-ke-hoach": { label: "Xem kế hoạch", iconName: "Briefcase" },
  "/lap-ke-hoach/loai-doi-tuong": { label: "Loại đối tượng", iconName: "Briefcase" },
  "/lap-ke-hoach/loai-cong-viec": { label: "Loại công việc", iconName: "Briefcase" },
  "/lap-ke-hoach/muc-cong-viec-phai-lam": { label: "Mục công việc phải làm", iconName: "Briefcase" },
  "/lap-ke-hoach/diem-kpi": { label: "Điểm ± KPI", iconName: "Briefcase" },
  "/lap-ke-hoach/tien-do-du-an": { label: "Tiến độ dự án", iconName: "Briefcase" },
  "/lap-ke-hoach/trang-thai-du-an": { label: "Trạng thái dự án", iconName: "Briefcase" },
  "/lap-ke-hoach/thuong-hieu": { label: "Thương hiệu", iconName: "Briefcase" },
  "/nhap-cong-viec": { label: "Nhập công việc", iconName: "Briefcase" },
  "/cong-viec-phai-lam": { label: "Công việc phải làm", iconName: "Briefcase" },
  "/cong-viec-phai-lam-giao-viec": { label: "Công việc phải làm giao việc", iconName: "Briefcase" },
  "/cong-viec-doi-duyet": { label: "Công việc đợi duyệt", iconName: "Briefcase" },
  "/cong-viec-hoan-thanh": { label: "Công việc hoàn thành", iconName: "Briefcase" },
  "/cong-viec-khong-hoan-thanh": { label: "Công việc không hoàn thành", iconName: "Briefcase" },
  "/bao-cao-cong-viec-hang-ngay": { label: "Báo cáo công việc hàng ngày", iconName: "Briefcase" },
  "/bao-cao-du-an": { label: "Báo cáo dự án", iconName: "Briefcase" },
  "/luoc-do-ke-hoach": { label: "Lược đồ kế hoạch", iconName: "Briefcase" },
  "/cong-viec-hang-ngay": { label: "Công việc hàng ngày", iconName: "Briefcase" },
  "/cong-viec-chua-bao-cao": { label: "Công việc chưa báo cáo", iconName: "Briefcase" },
  "/canh-bao": { label: "Cảnh báo", iconName: "Bell" },
  "/xu-ly-canh-bao": { label: "Xử lý cảnh báo", iconName: "Bell" },
  "/bao-cao-canh-bao-hang-ngay": { label: "Báo cáo cảnh báo hàng ngày", iconName: "Bell" },
  "/lich-canh-bao-theo-thang": { label: "Lịch cảnh báo theo tháng", iconName: "CalendarDays" },
  "/trang-thai-don-xin-phep": { label: "Trạng thái Đơn xin phép", iconName: "Briefcase" },
  "/don-xin-phep": { label: "Tạo đơn xin phép", iconName: "Briefcase" },
  "/tao-don-xin-phep-theo-phong-ban": { label: "Tạo đơn xin phép theo phòng ban", iconName: "Briefcase" },
  "/bao-cao-don-xin-phep": { label: "Báo cáo đơn xin phép", iconName: "Briefcase" },
  "/bgd-duyet-don": { label: "BGĐ duyệt đơn", iconName: "Briefcase" },
  "/quan-ly-truc-tiep-duyet-don": { label: "Quản lý trực tiếp duyệt", iconName: "Briefcase" },
  "/cac-tieu-chi-kpi": { label: "Các tiêu chí KPI", iconName: "Briefcase" },
  "/thiet-lap-kpi": { label: "Thiết lập KPI theo công việc", iconName: "Briefcase" },
  "/chi-tiet-kpi": { label: "Chi tiết KPI", iconName: "Briefcase" },
  "/kpi-hang-thang": { label: "KPI Hàng Tháng", iconName: "Briefcase" },
  "/kpi-giam-doc": { label: "KPI Giám Đốc", iconName: "Briefcase" },
  "/kpi-nhan-su": { label: "KPI Nhân Sự", iconName: "Briefcase" },
  "/kpi-quan-ly": { label: "KPI Quản Lý", iconName: "Briefcase" },
  "/kpi-bao-cao": { label: "KPI Báo Cáo", iconName: "Briefcase" },
  "/quan-ly-quy-trinh-du-an": { label: "Quản lý quy trình dự án", iconName: "Workflow" },
};

const dynamicRoutePatterns = [
  { pattern: /^\/quan-ly-ke-hoach\/([^/]+)$/, parentPath: "/quan-ly-ke-hoach" },
  { pattern: /^\/quan-ly-du-an\/chi-tiet\/([^/]+)$/, parentPath: "/quan-ly-quy-trinh-du-an?tab=projects" },
];

export const getTabMetadata = (path, t = null) => {
  const fullPath = path || "";
  const pathWithoutQuery = fullPath.split("?")[0];
  const cleanPath = pathWithoutQuery.endsWith("/") && pathWithoutQuery.length > 1 ? pathWithoutQuery.slice(0, -1) : pathWithoutQuery;
  const tabParam = new URLSearchParams(fullPath.split("?")[1] || "").get("tab");

  // Custom labels for tab query parameters
  if (tabParam === "workflow") {
    return { label: "Mẫu Quy Trình (Workflow)", iconName: "Workflow", isClosable: true };
  }
  if (tabParam === "my-tasks") {
    return { label: "Công việc của tôi", iconName: "Workflow", isClosable: true };
  }
  if (tabParam === "projects") {
    return { label: "Danh Sách Dự Án", iconName: "Workflow", isClosable: true };
  }

  if (pathLabelMap[cleanPath]) {
    const base = pathLabelMap[cleanPath];
    let label = base.label;
    if (t) {
      const translated = t(base.label);
      if (translated && translated !== base.label) label = translated;
    }
    return { ...base, label, isClosable: cleanPath !== "/quan-ly-ke-hoach" };
  }

  for (const item of dynamicRoutePatterns) {
    const match = cleanPath.match(item.pattern);
    if (match) {
      const id = match[1];
      const parentMeta = getTabMetadata(item.parentPath, t);
      return {
        label: parentMeta.label + ": ID " + id,
        iconName: parentMeta.iconName || "FileText",
        isClosable: true,
      };
    }
  }

  const segments = cleanPath.split("/").filter(Boolean);
  if (segments.length > 0) {
    const lastSegment = segments[segments.length - 1];
    const rawLabel = lastSegment
      .replace(/[-_]/g, " ")
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
    const label = t ? t(rawLabel) : rawLabel;
    return { label: label || "Trang chi tiết", iconName: "FileText", isClosable: true };
  }

  return { label: t ? t("Trang mới") : "Trang mới", iconName: "FileText", isClosable: true };
};

const WORKFLOW_ROUTE = "/quan-ly-quy-trinh-du-an";
const WORKFLOW_TABS = new Set(["dashboard", "my-tasks", "projects", "workflow"]);

export const getMenuSelectedKey = (pathname = "", search = "") => {
  if (
    pathname === WORKFLOW_ROUTE ||
    pathname === "/quan-ly-du-an/workflow-templates" ||
    pathname === "/quan-ly-du-an/danh-sach" ||
    /^\/quan-ly-du-an\/chi-tiet\/[^/]+$/.test(pathname)
  ) {
    const requestedTab = new URLSearchParams(search).get("tab");
    const tab = WORKFLOW_TABS.has(requestedTab)
      ? requestedTab
      : pathname === "/quan-ly-du-an/workflow-templates"
        ? "workflow"
        : "projects";
    return `${WORKFLOW_ROUTE}?tab=${tab}`;
  }

  return `${pathname}${search}` || "/";
};

export const IconRenderer = ({ name, size = 16, className, style }) => {
  const IconComponent = Icons[name] || Icons.FileText;
  return <IconComponent size={size} className={className} style={style} />;
};
