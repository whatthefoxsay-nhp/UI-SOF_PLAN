import axios from "axios";
import {
  url_api_services,
  url_chart_api,
  url_image_base,
  url_api,
  getServicesUrl,
} from "./url";
import {
  uploadImageFile as sofUploadImage,
  getImageUrl as sofGetImageUrl,
  validateImageFile,
  isImageToken,
} from "./imageService";
import {
  getAuthHeaders,
  refreshAuthToken,
  clearAuthCache,
  setSessionConflictHandler,
} from "./apiLogin";

const urlApi = url_api_services;
const defaultGhtkEndpoint = `${(url_api || "").replace(
  /\/$/,
  "",
)}/delivery/ghtk/ghtk_create_order.php`;
const ghtkEndpoint = process.env.REACT_APP_GHTK_ENDPOINT || defaultGhtkEndpoint;

// --- CẤU HÌNH IMAGE SERVER THEO TÀI LIỆU (từ QLNS) ---
const getProxyUploadUrl = () => {
  return url_api_services.replace(/\/index\.php$/, '/proxy.php');
};

const URL_IMAGE_READ_INTERNAL = process.env.REACT_APP_IMAGE_READ_INTERNAL || 'http://localhost/no-image/';
const URL_IMAGE_READ_PUBLIC = process.env.REACT_APP_IMAGE_READ_PUBLIC || 'http://localhost/no-image/';
const HEADER_KEY = 'SOF-User-Token';
const HEADER_VALUE = process.env.REACT_APP_SERVICES_AUTH_TOKEN || '8c4f2b9a71d6e3c9f0ab42d5e8c1f7a39b6d0e4f1a2c8b7d5e9f3a1c6b4d2e8';

// ======================= UPLOAD HÌNH ẢNH (từ QLNS) ==========================

export const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64String = reader.result.split(',')[1];
      resolve(base64String);
    };
    reader.onerror = (error) => reject(error);
  });
};

export async function uploadImageFormData(file, currentToken = '') {
  try {
    const proxyUrl = getProxyUploadUrl();
    const formData = new FormData();
    formData.append('ImgSOF', file);
    if (currentToken) {
      formData.append('TokenSOF', currentToken);
    }
    const authHeaders = await getAuthHeaders();
    delete authHeaders['Content-Type'];
    const response = await axios.post(proxyUrl, formData, {
      headers: { ...authHeaders, [HEADER_KEY]: HEADER_VALUE },
      timeout: 15000,
    });
    const data = response.data;
    if (data && (data.success === true || data.Status === 'success')) {
      return { success: true, token: data.TokenSOF };
    }
    return { success: false, message: data?.Message || 'Lỗi không xác định (form-data)' };
  } catch (error) {
    console.error('Lỗi upload form-data:', error);
    return { success: false, message: 'Không thể kết nối server ảnh (form-data)' };
  }
}

export async function uploadImageJSON(file, currentToken = '') {
  try {
    const proxyUrl = getProxyUploadUrl();
    const base64Img = await fileToBase64(file);
    const payload = { ImgSOF: base64Img };
    if (currentToken) { payload.TokenSOF = currentToken; }
    const authHeaders = await getAuthHeaders();
    const response = await axios.post(proxyUrl, payload, {
      headers: { ...authHeaders, [HEADER_KEY]: HEADER_VALUE, 'Content-Type': 'application/json' },
      timeout: 15000,
    });
    const data = response.data;
    if (data && (data.success === true || data.Status === 'success')) {
      return { success: true, token: data.TokenSOF };
    }
    return { success: false, message: data?.Message || 'Lỗi không xác định (JSON)' };
  } catch (error) {
    console.error('Lỗi upload JSON:', error);
    return { success: false, message: 'Không thể kết nối server ảnh (JSON)' };
  }
}

export async function uploadImageToTokenSystem(file, currentToken = '', method = 'auto') {
  if (!file) return { success: false, message: 'Không có file ảnh' };
  const isImage = file.type && file.type.startsWith('image/');
  if (!isImage) return { success: false, message: 'File không phải định dạng ảnh' };
  const isLt1M = file.size / 1024 / 1024 < 1.5;
  if (!isLt1M) return { success: false, message: 'Ảnh phải nhỏ hơn 1.5MB' };
  if (method === 'json') return await uploadImageJSON(file, currentToken);
  if (method === 'formdata') return await uploadImageFormData(file, currentToken);
  const result = await uploadImageFormData(file, currentToken);
  if (result.success) return result;
  console.warn('Form-data upload thất bại, thử lại bằng JSON...');
  return await uploadImageJSON(file, currentToken);
}

export function getImageUrlFromToken(token, usePublic = false) {
  if (!token) return null;
  const base = usePublic ? URL_IMAGE_READ_PUBLIC : URL_IMAGE_READ_INTERNAL;
  return `${base}${token}`;
}



export async function loadProductImageBlob(productId) {
  try {
    if (!productId) return { success: false };
    const baseUrl = url_api_services.split('/services.sof.vn/')[0];
    const getImageUrl = `${baseUrl}/services.sof.vn/get-image.php?id=${encodeURIComponent(productId)}`;
    const headers = await getAuthHeaders();
    const res = await axios.get(getImageUrl, { headers });
    if (res.data && res.data.status === 2002 && res.data.image) {
      return { success: true, imageUrl: `data:image/jpeg;base64,${res.data.image}` };
    }
    return { success: false, data: res.data };
  } catch (error) {
    console.error('Error loading product image:', error);
    return { success: false, error: error.message };
  }
}

// -------------------- API Functions --------------------
const getUrlApi = () => {
  const dynamicUrl = getServicesUrl();
  return dynamicUrl || url_api_services;
};

const SESSION_CONFLICT_CODE = "session_conflict";

// Biến lưu handler cho session conflict (được set từ AuthContext)
let localSessionConflictHandler = null;

// Hàm để set handler từ bên ngoài
export const setApiSessionConflictHandler = (handler) => {
  localSessionConflictHandler = typeof handler === "function" ? handler : null;
};

const notifySessionConflict = (message) => {
  if (typeof localSessionConflictHandler === "function") {
    try {
      localSessionConflictHandler(message);
    } catch (notifyError) {
      console.error("Session conflict handler failed:", notifyError);
    }
  }
};

const isSessionConflictResponse = (data) => {
  if (!data) {
    return false;
  }
  const message =
    typeof data === "string"
      ? data
      : data.message || data.error || data.statusMessage;
  if (!message) {
    return false;
  }
  return String(message).toLowerCase() === SESSION_CONFLICT_CODE;
};

const isInvalidAuthResponse = (data) => {
  if (data === null || data === undefined) {
    return false;
  }

  if (typeof data === "string") {
    return (
      data.toLowerCase() === "invalid" ||
      data.toLowerCase().includes("invalid token")
    );
  }

  const message = data.message || data.error || data.statusMessage;
  if (!message) {
    return false;
  }

  const normalized = String(message).toLowerCase();
  return normalized === "invalid" || normalized.includes("invalid token");
};

export async function callApi(
  table,
  func,
  additionalData = {},
  retryCount = 0,
) {
  try {
    
    const headers = await getAuthHeaders(retryCount > 0); // Force refresh on retry
    const payload = {
      table,
      func,
      ...additionalData,
    };     

    const res = await axios.post(urlApi, payload, { headers });
    const data = res.data;

    // Kiểm tra session conflict trước - nếu bị kick thì thông báo và logout
    if (isSessionConflictResponse(data)) {
      clearAuthCache();
      notifySessionConflict(
        "Tài khoản được đăng nhập ở nơi khác. Vui lòng đăng nhập lại.",
      );
      const conflictError = new Error(SESSION_CONFLICT_CODE);
      conflictError.code = SESSION_CONFLICT_CODE;
      throw conflictError;
    }

    if (isInvalidAuthResponse(data)) {
      if (retryCount === 0) {
        // Redundant refreshAuthToken() removed - getAuthHeaders(true) does it.
        return callApi(table, func, additionalData, 1);
      }
      console.warn(
        `API returned invalid auth response after retry for ${table}.${func}`,
      );
      return [];
    }

    // Log response d? debug

    if (data === null || data === undefined) {
      console.warn(`API returned null/undefined for ${table}.${func}`);
      return [];
    }

    return data;
  } catch (error) {
    // If we get 401 or auth error and haven't retried yet, retry with fresh token
    if (
      (error.response?.status === 401 || error.message.includes("token")) &&
      retryCount === 0
    ) {
      return callApi(table, func, additionalData, 1);
    }

    // console.error(`API call failed for table: ${table}, func: ${func}`, error);
    throw error;
  }
}

/**
 * Load user permissions from the backend
 * @returns {Promise<{success: boolean, permissions: object, package: string}>}
 */
export async function loadUserPermissions() {
  try {
    return await callApi("user_permissions", "load");
  } catch (error) {
    console.error("Failed to load user permissions:", error);
    throw error;
  }
}

/**
 * Test connection to service server after login
 * Makes a lightweight API call to verify database exists and is accessible
 * @returns {Promise<{success: boolean, message?: string}>}
 */
export async function testServiceConnection() {
  try {
    const urlApi = getUrlApi();
    const headers = await getAuthHeaders();

    // Use a real lightweight query that should exist in any database
    const payload = {
      table: "Mb_loaiSanPham",
      func: "data",
    };

    const response = await axios.post(urlApi, payload, {
      headers,
      timeout: 8000, // 8 second timeout
    });

    // If we get any successful response, service is reachable
    if (response.status === 200) {
      // Even if data is empty or null, connection is OK
      return { success: true };
    }

    return {
      success: false,
      message: "Dịch vụ không phản hồi đúng cách",
    };
  } catch (error) {
    console.error("Service connection test failed:", error);

    // 404 means endpoint/database not found or user not configured for this service
    if (error.response?.status === 404) {
      return {
        success: false,
        message:
          "Tài khoản không được phép truy cập dịch vụ này hoặc database không tồn tại.",
      };
    }

    // Network/connection errors
    if (
      error.code === "ECONNREFUSED" ||
      error.code === "ENOTFOUND" ||
      error.code === "ETIMEDOUT"
    ) {
      return {
        success: false,
        message:
          "Không thể kết nối đến máy chủ dịch vụ. Vui lòng kiểm tra kết nối mạng.",
      };
    }

    // Database not found or service errors
    if (error.response?.status === 500) {
      return {
        success: false,
        message: "Máy chủ dịch vụ không khả dụng hoặc database không tồn tại.",
      };
    }

    // Timeout
    if (error.code === "ECONNABORTED") {
      return {
        success: false,
        message: "Kết nối đến máy chủ dịch vụ bị timeout.",
      };
    }

    // Generic error
    return {
      success: false,
      message: error.message || "Không thể kết nối đến máy chủ dịch vụ",
    };
  }
}

// -------------------- Functions from index_HNhan.php --------------------

// Lấy loại sản phẩm
export async function getLoaiSanPham() {
  return await callApi("Mb_loaiSanPham", "data");
}

// Thêm loại sản phẩm
export async function themLoaiSanPham(loaiSanPhamData) {
  const { lv001, lv002, lv003, lv004, lv005 } = loaiSanPhamData;
  return await callApi("Mb_loaiSanPham", "add", {
    lv001,
    lv002,
    lv003,
    lv004,
    lv005,
  });
}

// Sửa loại sản phẩm
export async function suaLoaiSanPham(loaiSanPhamData) {
  const { lv001, lv002, lv003, lv004, lv005 } = loaiSanPhamData;
  return await callApi("Mb_loaiSanPham", "edit", {
    lv001,
    lv002,
    lv003,
    lv004,
    lv005,
  });
}

// Xóa loại sản phẩm
export async function xoaLoaiSanPham(lv001) {
  return await callApi("Mb_loaiSanPham", "delete", { lv001 });
}

// Lấy sản phẩm theo ID loại
export async function getSanPhamTheoIdLoai(findID) {
  return await callApi("Mb_sanPham", "laySanTheoIdLoai", { findID });
}

// Lấy tất cả sản phẩm
export async function getAllSanPham() {
  return await callApi("Mb_sanPham", "data");
}

// Lấy cấu trúc BOM của sản phẩm
export async function getProductBom(productId, bomType = "BOM") {
  const normalizedId =
    productId !== undefined && productId !== null
      ? productId.toString().trim()
      : "";
  return await callApi("Mb_BOM", "list", { productId: normalizedId, bomType });
}

// Lưu cấu trúc BOM của sản phẩm
export async function saveProductBom(productId, components = [], bomType = "BOM") {
  const normalizedId =
    productId !== undefined && productId !== null
      ? productId.toString().trim()
      : "";
  return await callApi("Mb_BOM", "save", {
    productId: normalizedId,
    components,
  });
}

// Load hình ảnh sản phẩm từ database hoặc token
export async function loadProductImage(productId, imageToken = null) {
  try {
    if (!productId && !imageToken) {
      return { success: false };
    }

    // If we have a token, return the URL directly
    if (imageToken && isImageToken(imageToken)) {
      const imageUrl = sofGetImageUrl(imageToken);
      return { success: true, imageUrl, isTokenBased: true };
    }

    // Old BLOB-based loading via get-image.php is disabled as it causes errors
    // Use token-based loading instead
    return { success: false, message: "Legacy loading disabled" };
  } catch (error) {
    console.error("Error loading product image:", error);
    return { success: false, error: error.message };
  }
}

// Lấy URL hình ảnh sản phẩm đầy đủ
export function getFullImageUrl(imagePath) {
  if (!imagePath) return null;

  // Nếu đã là URL đầy đủ (http/https)
  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
    return imagePath;
  }

  // Nếu là đường dẫn tương đối, tạo URL đầy đủ
  const baseUrl = url_image_base;

  // Xử lý đường dẫn bắt đầu bằng /
  if (imagePath.startsWith("/")) {
    return `${baseUrl}${imagePath}`;
  }

  // Xử lý đường dẫn tương đối - nếu không bắt đầu bằng images/, giả sử là trong thư mục products
  if (!imagePath.startsWith("images/")) {
    return `${baseUrl}/images/products/${imagePath}`;
  }

  // Xử lý đường dẫn tương đối
  return `${baseUrl}/${imagePath}`;
}

// Thêm chi tiết hóa đơn
export async function themChiTietHoaDon(mahd, masp, soluong) {
  return await callApi("Mb_Cthd", "themCtHd", { mahd, masp, soluong });
}

// Thanh toán hóa đơn
// maKho: mã kho để tạo phiếu xuất kho khi thanh toán (lấy từ Cài đặt kho & tồn kho)
export async function thanhToanHoaDon(
  mahd,
  maKho = "",
  phuongThuc = "tienmat",
  tongTien = 0,
) {
  return await callApi("Mb_thanhtoan", "thanhToan_contract", {
    mahd,
    maKho,
    phuongThuc,
    tongTien,
  });
}

// Cập nhật sản phẩm
export async function updateSanPham(productData) {
  return await callApi("Mb_sanPham", "edit", productData);
}

// Upload ảnh sản phẩm
export async function uploadProductImage(productId, imageFile) {
  try {
    const formData = new FormData();
    formData.append("table", "Mb_sanPham");
    formData.append("func", "uploadImage");
    formData.append("maSp", productId);
    formData.append("imageFile", imageFile);

    const headers = await getAuthHeaders();
    const res = await axios.post(url_api_services, formData, {
      headers: {
        ...headers,
        "Content-Type": "multipart/form-data",
      },
    });

    return { success: res.data === true || res.data === 1 || res.data === "1" };
  } catch (error) {
    console.error("Error uploading image:", error);
    return { success: false, error: error.message };
  }
}

// Cập nhật URL ảnh sản phẩm
export async function updateProductImageUrl(productId, imageUrl) {
  try {
    const result = await callApi("Mb_sanPham", "updateImageUrl", {
      maSp: productId,
      imageUrl,
    });
    return { success: result === true || result === 1 || result === "1" };
  } catch (error) {
    console.error("Error updating product image URL:", error);
    return { success: false, error: error.message };
  }
}

// Upload ảnh sản phẩm via SOF Image Service (NEW)
export async function uploadImageBlob(
  productId,
  imageFile,
  existingToken = "",
) {
  try {
    // Use new SOF Image Service
    const result = await sofUploadImage(imageFile, existingToken, productId);

    if (result.success && result.token) {
      // Update product's lv005 field with the new token
      await updateProductImageToken(productId, result.token);
      return { success: true, token: result.token };
    }

    return result;
  } catch (error) {
    console.error("Error uploading image blob:", error);
    return { success: false, error: error.message };
  }
}

// Update product image token in database
export async function updateProductImageToken(productId, imageToken) {
  try {
    const result = await callApi("Mb_sanPham", "updateImageToken", {
      maSp: productId,
      imageToken,
    });
    return { success: result === true || result === 1 || result === "1" };
  } catch (error) {
    console.error("Error updating product image token:", error);
    return { success: false, error: error.message };
  }
}

// Load ảnh sản phẩm từ database (BLOB)

// -------------------- Functions from index_Cong.php --------------------

export async function getDanhSachCongTy() {
  const data = await callApi("hr_lv0001", "data");
  if (!Array.isArray(data)) {
    return [];
  }

  return data.map((item) => ({
    maCongTy: item?.maCongTy ?? item?.lv001 ?? "",
    tenCongTy: item?.tenCongTy ?? item?.lv002 ?? "",
    diaChi: item?.diaChi ?? item?.lv003 ?? "",
    giamDoc: item?.giamDoc ?? item?.lv004 ?? "",
    dienThoai: item?.dienThoai ?? item?.lv005 ?? "",
    fax: item?.fax ?? item?.lv006 ?? "",
    website: item?.website ?? item?.lv007 ?? "",
    maSoThue: item?.maSoThue ?? item?.lv008 ?? "",
    logo: item?.logo ?? item?.lv009 ?? "",
    maCongTyCha: item?.maCongTyCha ?? item?.lv010 ?? "",
    capBac: item?.capBac ?? item?.lv011 ?? "",
    maTinh: item?.maTinh ?? item?.lv012 ?? "",
    maQuocGia: item?.maQuocGia ?? item?.lv013 ?? "",
    trangThai: item?.trangThai ?? item?.lv099 ?? "",
  }));
}

// Thêm nhân sự
export async function themNhanSu(nhanSuData) {
  return await callApi("hr_NhanSu", "add", nhanSuData);
}

// Sửa nhân sự
export async function suaNhanSu(nhanSuData) {
  return await callApi("hr_NhanSu", "edit", nhanSuData);
}

// Xóa nhân sự
export async function xoaNhanSu(lv001) {
  return await callApi("hr_NhanSu", "delete", { lv001 });
}

// Lấy danh sách nhân sự
export async function getDanhSachNhanSu() {
  return await callApi("hr_NhanSu", "data");
}

// -------------------- Functions from index_KBao.php --------------------

// Thêm kho
export async function themKho(khoData) {
  return await callApi("Mb_Kho", "add", khoData);
}

// Sửa kho
export async function suaKho(khoData) {
  return await callApi("Mb_Kho", "edit", khoData);
}

// Xóa kho
export async function xoaKho(lv001) {
  return await callApi("Mb_Kho", "delete", { lv001 });
}

// Lấy danh sách kho
export async function getDanhSachKho() {
  return await callApi("Mb_Kho", "data");
}

// Lấy nguyên vật liệu theo mã kho
export async function getNguyenVatLieuTheoMaKho(maKho) {
  return await callApi("Mb_Kho", "LayNvlTheoMaKho_Hieu", { maKho });
}

// Lấy số lượng tồn kho
export async function getSoLuongTonKho(maSP, maKho) {
  return await callApi("Mb_Kho", "LaySoLuongTonKho", { maSP, maKho });
}

// Lấy số lượng tồn kho nhiều sản phẩm
export async function getSoLuongTonKhoNhieuSP(maSP, maKho) {
  return await callApi("Mb_Kho", "LaySoLuongTonKhoNhieuSP", { maSP, maKho });
}

// Thêm sản phẩm vào kho
export async function themSPVaoKho(data) {
  const { maSp, maKho, maDv, gia, dvGia } = data;
  return await callApi("Mb_Kho", "themSPVaoKho", {
    maSp,
    maKho,
    maDv,
    gia: Number(gia || 0),
    dvGia: dvGia || "VND",
  });
}

// Bao cao kho theo dieu kien
export async function baoCaoKhoTheoDieuKien(params = {}) {
  return await callApi("Mb_BaoCaoKho", "baoCaoDieuKien", params);
}

// Bao cao xuat nhap ton
export async function baoCaoXuatNhapTon(params = {}) {
  return await callApi("Mb_BaoCaoKho", "baoCaoXuatNhapTon", params);
}

// Phiếu nhập kho
export async function listPhieuNhap(params = {}) {
  return await callApi("Mb_PhieuNhap", "data", params);
}

export async function createPhieuNhap(phieuNhapData = {}) {
  const {
    maKho,
    maNguoiDung,
    ghiChu,
    loaiPhieu,
    maThamChieu,
    trangThai,
    tongTien,
    ngayNhap,
    details = [],
  } = phieuNhapData;

  return await callApi("Mb_PhieuNhap", "add", {
    lv002: maKho ?? phieuNhapData.lv002 ?? "",
    lv003: maNguoiDung ?? phieuNhapData.lv003 ?? "",
    lv004: ghiChu ?? phieuNhapData.lv004 ?? "",
    lv005: loaiPhieu ?? phieuNhapData.lv005 ?? "",
    lv006: maThamChieu ?? phieuNhapData.lv006 ?? "",
    lv007: trangThai ?? phieuNhapData.lv007 ?? "",
    lv008: tongTien ?? phieuNhapData.lv008 ?? 0,
    lv009: ngayNhap ?? phieuNhapData.lv009 ?? "",
    details,
  });
}

export async function updatePhieuNhap(phieuNhapData = {}) {
  const {
    maPhieuNhap,
    maPhieu,
    maKho,
    maNguoiDung,
    ghiChu,
    loaiPhieu,
    maThamChieu,
    trangThai,
    tongTien,
    ngayNhap,
    details = [],
  } = phieuNhapData;

  return await callApi("Mb_PhieuNhap", "edit", {
    lv001: maPhieuNhap ?? maPhieu ?? phieuNhapData.lv001 ?? "",
    lv002: maKho ?? phieuNhapData.lv002 ?? "",
    lv003: maNguoiDung ?? phieuNhapData.lv003 ?? "",
    lv004: ghiChu ?? phieuNhapData.lv004 ?? "",
    lv005: loaiPhieu ?? phieuNhapData.lv005 ?? "",
    lv006: maThamChieu ?? phieuNhapData.lv006 ?? "",
    lv007: trangThai ?? phieuNhapData.lv007 ?? "",
    lv008: tongTien ?? phieuNhapData.lv008 ?? 0,
    lv009: ngayNhap ?? phieuNhapData.lv009 ?? "",
    details,
  });
}

//=================== Hàm CRUD cho các file JSX ================
export async function execCRUD(vclass, func, addData = {}) {
  //console.log("data js: ", addData);

  return await callApi(vclass, func, addData);
}

/**
 * Lấy danh sách đề nghị chi tiền theo ID kế hoạch
 */
export async function getDeNghiByPlanId(planId) {
  return await callApi("cr_lv0202", "loadByCondition", { condition: `lv004 = '${planId}'` });
}

/**
 * Duyệt đề nghị chi tiền
 */
export async function approveDeNghi(id) {
  return await callApi("cr_lv0202", "approve", { lv001: id });
}

/**
 * Bỏ duyệt/Từ chối đề nghị chi tiền
 */
export async function unapproveDeNghi(id) {
  return await callApi("cr_lv0202", "unapprove", { lv001: id });
}


export async function getCurrentUser() {
  return await callApi("getCurrentUser", "info");
}


export async function listPhieuChi(additionalData = {}) {
  try {
    const response = await callApi("ac_lv0075", "loadDataView", additionalData);
    return Array.isArray(response) ? response : response?.data || [];
  } catch (error) {
    console.error("Lỗi khi load danh sách phiếu chi:", error);
    throw error;
  }
}
export async function lv_LoadDataAPI(table, func, Data = {}) {
  return await callApi(table, func, Data);
}
export async function loadTienTe() {
  return await callApi("hr_lv0018", "loadTienTe");
}

export async function deletePhieuChi(lv001) {
  try {
    const payload = { lv001 };
    const response = await callApi("ac_lv0075", "delete", payload);
    return response;
  } catch (error) {
    console.error(`Lỗi khi xóa phiếu chi ${lv001}:`, error);
    throw error;
  }
}

export async function approvePhieuNhap(maPhieuList = []) {
  const payload = Array.isArray(maPhieuList)
    ? maPhieuList.filter(Boolean)
    : [maPhieuList].filter(Boolean);

  if (payload.length === 0) {
    return [];
  }

  return await callApi("Mb_PhieuNhap", "apr", payload);
}

export async function unapprovePhieuNhap(maPhieuList = []) {
  const payload = Array.isArray(maPhieuList)
    ? maPhieuList.filter(Boolean)
    : [maPhieuList].filter(Boolean);

  if (payload.length === 0) {
    return [];
  }

  return await callApi("Mb_PhieuNhap", "unapr", payload);
}

export async function deletePhieuNhap(maPhieu) {
  return await callApi("Mb_PhieuNhap", "delete", { maPhieu });
}

export async function getPhieuNhapById(maPhieu) {
  return await callApi("Mb_PhieuNhap", "LoadPhieuNhap_ByID", { maPhieu });
}

export async function listChiTietPhieuNhap(maPhieu) {
  return await callApi("Mb_ChiTietPhieuNhap", "data", { maPhieu });
}

// Phiếu xuất kho
export async function listPhieuXuat(params = {}) {
  return await callApi("Mb_PhieuXuat", "data", params);
}

export async function createPhieuXuat(phieuXuatData = {}) {
  const {
    maKho,
    maNguoiDung,
    chuDe,
    nguonXuat,
    maThamChieu,
    trangThai,
    ghiChu,
    ngayXuat,
    hinhThucXuat,
    nguoiNhanKho,
    details = [],
  } = phieuXuatData;

  return await callApi("Mb_PhieuXuat", "add", {
    lv002: maKho ?? phieuXuatData.lv002 ?? "",
    lv003: maNguoiDung ?? phieuXuatData.lv003 ?? "",
    lv004: chuDe ?? phieuXuatData.lv004 ?? "",
    lv005: nguonXuat ?? phieuXuatData.lv005 ?? "",
    lv006: maThamChieu ?? phieuXuatData.lv006 ?? "",
    lv007: trangThai ?? phieuXuatData.lv007 ?? "",
    lv008: ghiChu ?? phieuXuatData.lv008 ?? "",
    lv009: ngayXuat ?? phieuXuatData.lv009 ?? "",
    lv010: hinhThucXuat ?? phieuXuatData.lv010 ?? "",
    lv011: nguoiNhanKho ?? phieuXuatData.lv011 ?? "",
    details,
  });
}

export async function updatePhieuXuat(phieuXuatData = {}) {
  const {
    maPhieuXuat,
    maPhieu,
    maKho,
    maNguoiDung,
    chuDe,
    nguonXuat,
    maThamChieu,
    trangThai,
    ghiChu,
    ngayXuat,
    hinhThucXuat,
    nguoiNhanKho,
    details = [],
  } = phieuXuatData;

  return await callApi("Mb_PhieuXuat", "edit", {
    lv001: maPhieuXuat ?? maPhieu ?? phieuXuatData.lv001 ?? "",
    lv002: maKho ?? phieuXuatData.lv002 ?? "",
    lv003: maNguoiDung ?? phieuXuatData.lv003 ?? "",
    lv004: chuDe ?? phieuXuatData.lv004 ?? "",
    lv005: nguonXuat ?? phieuXuatData.lv005 ?? "",
    lv006: maThamChieu ?? phieuXuatData.lv006 ?? "",
    lv007: trangThai ?? phieuXuatData.lv007 ?? "",
    lv008: ghiChu ?? phieuXuatData.lv008 ?? "",
    lv009: ngayXuat ?? phieuXuatData.lv009 ?? "",
    lv010: hinhThucXuat ?? phieuXuatData.lv010 ?? "",
    lv011: nguoiNhanKho ?? phieuXuatData.lv011 ?? "",
    details,
  });
}

export async function approvePhieuXuat(maPhieuList = []) {
  const payload = Array.isArray(maPhieuList)
    ? maPhieuList.filter(Boolean)
    : [maPhieuList].filter(Boolean);

  if (payload.length === 0) {
    return [];
  }

  return await callApi("Mb_PhieuXuat", "apr", payload);
}

export async function unapprovePhieuXuat(maPhieuList = []) {
  const payload = Array.isArray(maPhieuList)
    ? maPhieuList.filter(Boolean)
    : [maPhieuList].filter(Boolean);

  if (payload.length === 0) {
    return [];
  }

  return await callApi("Mb_PhieuXuat", "unapr", payload);
}

export async function deletePhieuXuat(maPhieu) {
  return await callApi("Mb_PhieuXuat", "delete", { maPhieu });
}

export async function getPhieuXuatById(maPhieu) {
  return await callApi("Mb_PhieuXuat", "LoadPhieuXuat_ByID", { maPhieu });
}

export async function listChiTietPhieuXuat(maPhieu) {
  return await callApi("Mb_ChiTietPhieuXuat", "data", { maPhieu });
}

// Kiểm kho
export async function listPhieuKiemKho(params = {}) {
  return await callApi("Mb_KiemKho", "data", params);
}

export async function createPhieuKiemKho(payload = {}) {
  const { maKho, maNguoiDung, chuDe, ghiNhan, trangThai, ngayKiem } = payload;

  return await callApi("Mb_KiemKho", "add", {
    lv002: maKho ?? payload.lv002 ?? "",
    lv003: maNguoiDung ?? payload.lv003 ?? "",
    lv004: chuDe ?? payload.lv004 ?? "",
    lv005: ngayKiem ?? payload.lv005 ?? "",
    lv006: ghiNhan ?? payload.lv006 ?? "",
    lv007: trangThai ?? payload.lv007 ?? "",
  });
}

export async function createPhieuKiemKhoAuto(payload = {}) {
  const { maKho, maNguoiDung, chuDe, ghiNhan, trangThai, ngayKiem } = payload;

  return await callApi("Mb_KiemKho", "add-auto", {
    lv002: maKho ?? payload.lv002 ?? "",
    lv003: maNguoiDung ?? payload.lv003 ?? "",
    lv004: chuDe ?? payload.lv004 ?? "",
    lv005: ngayKiem ?? payload.lv005 ?? "",
    lv006: ghiNhan ?? payload.lv006 ?? "",
    lv007: trangThai ?? payload.lv007 ?? "",
  });
}

export async function deletePhieuKiemKho(maPhieuKiem) {
  return await callApi("Mb_KiemKho", "delete", { maPhieuKiem });
}

export async function getPhieuKiemKhoByKho(maKho) {
  return await callApi("Mb_KiemKho", "layDanhSachPhieuKiemTheoKho", {
    lv002: maKho,
  });
}

export async function updateTrangThaiPhieuKiem(dsMaPK = []) {
  return await callApi("Mb_KiemKho", "chinhSuaTrangThai_PK", { dsMaPK });
}

export async function getPhieuKiemKhoById(maPK) {
  return await callApi("Mb_KiemKho", "layThongTinPhieuKiemByID", { maPK });
}

export async function listChiTietPhieuKiem(maPK) {
  return await callApi("Mb_ChiTietPK", "data", { maPK });
}

export async function addChiTietPhieuKiem(chiTiet = {}) {
  const { maKiemKho, maSanPham, slPM, donViKiem, soLuongThucTe, donViTT } =
    chiTiet;

  return await callApi("Mb_ChiTietPK", "add", {
    maKiemKho,
    maSanPham,
    slPM,
    donViKiem,
    soLuongThucTe,
    donViTT,
  });
}

export async function updateChiTietPhieuKiem(chiTiet = {}) {
  const { maKiemKho, maSanPham, soLuongThucTe, donViTT } = chiTiet;

  return await callApi("Mb_ChiTietPK", "edit", {
    maKiemKho,
    maSanPham,
    soLuongThucTe,
    donViTT,
  });
}

export async function deleteChiTietPhieuKiem(maKiemKho, maSanPham) {
  return await callApi("Mb_ChiTietPK", "delete", { maKiemKho, maSanPham });
}

// Nguyên liệu
export async function listTatCaNguyenLieu() {
  return await callApi("Mb_NguyenLieu", "layAllNguyenLieu_Hieu");
}

// Nhà cung cấp
export async function listNhaCungCap() {
  return await callApi("Mb_NhaCungCap", "data");
}

export async function listSanPhamTheoNCC(maNCC) {
  return await callApi("Mb_NhaCungCap", "LayDanhSachSP_MaNCC", { maNCC });
}

// Phiếu mua hàng
export async function listPhieuMuaHang(params = {}) {
  return await callApi("Mb_PhieuMuaHang", "data", params);
}

export async function createPhieuMuaHang(phieuMuaHangData = {}) {
  const {
    phieuDNVT,
    maNhomDonHang,
    maPMH,
    pbhSo,
    nguoiMuaHang,
    tenDuAn,
    nhaCungCap,
    ngayMua,
    ghiChu,
    trangThai,
    tongTien,
    details = [],
  } = phieuMuaHangData;

  return await callApi("Mb_PhieuMuaHang", "add", {
    lv002: nhaCungCap ?? phieuMuaHangData.lv008 ?? "",
    lv087: maNhomDonHang ?? phieuMuaHangData.lv090 ?? "",
    lv004: ngayMua ?? phieuMuaHangData.lv009 ?? "",
    lv089: pbhSo ?? phieuMuaHangData.lv089 ?? "",
    lv006: maPMH ?? phieuMuaHangData.lv004 ?? "",
    lv007: tenDuAn ?? phieuMuaHangData.lv007 ?? "",
    lv088: phieuDNVT ?? phieuMuaHangData.lv088 ?? "",
    lv009: ghiChu ?? phieuMuaHangData.lv009 ?? "",
    lv010: nguoiMuaHang ?? phieuMuaHangData.lv006 ?? "",
    details,
  });
}

export async function updatePhieuMuaHang(phieuMuaHangData = {}) {
  const {
    maPhieuMuaHang,
    maPMH,
    phieuDNVT,
    maNhomDonHang,
    pbhSo,
    nguoiMuaHang,
    tenDuAn,
    nhaCungCap,
    ngayMua,
    ghiChu,
    trangThai,
    tongTien,
    details = [],
  } = phieuMuaHangData;

  return await callApi("Mb_PhieuMuaHang", "edit", {
    lv001: maPhieuMuaHang ?? maPMH ?? phieuMuaHangData.lv001 ?? "",
    lv002: phieuDNVT ?? phieuMuaHangData.lv002 ?? "",
    lv003: maNhomDonHang ?? phieuMuaHangData.lv003 ?? "",
    lv004: maPMH ?? phieuMuaHangData.lv004 ?? "",
    lv005: pbhSo ?? phieuMuaHangData.lv005 ?? "",
    lv006: nguoiMuaHang ?? phieuMuaHangData.lv006 ?? "",
    lv007: tenDuAn ?? phieuMuaHangData.lv007 ?? "",
    lv008: nhaCungCap ?? phieuMuaHangData.lv008 ?? "",
    lv009: ngayMua ?? phieuMuaHangData.lv009 ?? "",
    lv010: ghiChu ?? phieuMuaHangData.lv010 ?? "",
    lv011: trangThai ?? phieuMuaHangData.lv011 ?? "",
    lv012: tongTien ?? phieuMuaHangData.lv012 ?? 0,
    details,
  });
}

export async function approvePhieuMuaHang(maPhieuList = []) {
  const payload = Array.isArray(maPhieuList)
    ? maPhieuList.filter(Boolean)
    : [maPhieuList].filter(Boolean);

  if (payload.length === 0) {
    return [];
  }

  return await callApi("Mb_PhieuMuaHang", "apr", payload);
}

export async function unapprovePhieuMuaHang(maPhieuList = []) {
  const payload = Array.isArray(maPhieuList)
    ? maPhieuList.filter(Boolean)
    : [maPhieuList].filter(Boolean);

  if (payload.length === 0) {
    return [];
  }

  return await callApi("Mb_PhieuMuaHang", "unapr", payload);
}

export async function deletePhieuMuaHang(maPhieu) {
  return await callApi("Mb_PhieuMuaHang", "delete", { maPhieu });
}

export async function getPhieuMuaHangById(maPhieu) {
  return await callApi("Mb_PhieuMuaHang", "LoadPhieuMuaHang_ByID", { maPhieu });
}

export async function listChiTietPhieuMuaHang(maPhieu) {
  return await callApi("Mb_ChiTietPhieuMuaHang", "data", { maPhieu });
}

// -------------------- Functions from index_long.php --------------------

// Lấy danh sách bàn
export async function getDanhSachBan() {
  return await callApi("Mb_LayDsBan", "data");
}

// Lấy tổng chi tiết hóa đơn - hóa đơn có món - chưa thanh toán và thanh toán rồi
export async function getTongChiTietHoaDon() {
  return await callApi("Mb_TongCthd", "data");
}
// Lấy chi tiết hóa đơn - kể cả hóa đơn rỗng
export async function getChiTietHoaDonRong() {
  return await callApi("Mb_TongCthdRong", "data");
}

// Lấy chi tiết hóa đơn theo mã hóa đơn
export async function getChiTietHoaDonTheoMaHD(maHd) {
  return await callApi("Mb_LayCthd_", "layCtHd", { maHd });
}

// Gộp bàn
export async function gopBan(idDonHang, idBanGop) {
  return await callApi("m_GopBan", "add", { idDonHang, idBanGop });
}

// Load bàn
export async function loadBan() {
  return await callApi("Mb_LayDsBan", "data");
}

// Load khu vực
export async function loadKhuVuc() {
  return await callApi("sl_lv0008", "loadKhuVuc");
}

// Thêm khu vực / tầng
export async function themKhuVuc(khuVucData) {
  const { lv001, lv002 } = khuVucData;
  return await callApi("sl_lv0008", "themKhuVuc", { lv001, lv002 });
}

// Sửa khu vực / tầng
export async function suaKhuVuc(khuVucData = {}) {
  const { lv001, lv002, maKhuVuc, tenKhuVuc, ...rest } = khuVucData;

  // API expects lv001 and lv002 as parameter names
  return await callApi("sl_lv0008", "suaKhuVuc", {
    lv001: maKhuVuc ?? lv001,
    lv002: tenKhuVuc ?? lv002,
    ...rest,
  });
}

// Xóa khu vực / tầng
export async function xoaKhuVuc(khuVuc) {
  const maKhuVuc =
    typeof khuVuc === "string" ? khuVuc : (khuVuc?.maKhuVuc ?? khuVuc?.lv001);

  // API expects lv001 as parameter name
  return await callApi("sl_lv0008", "xoaKhuVuc", { lv001: maKhuVuc });
}

// Load đơn vị
export async function loadDonVi() {
  return await callApi("sl_lv0005", "loadDonVi");
}

// Thêm đơn vị
export async function themDonVi(donViData) {
  const { lv001, lv002, lv003 } = donViData;
  return await callApi("sl_lv0005", "themDonVi", { lv001, lv002, lv003 });
}

// Sửa đơn vị
export async function suaDonVi(donViData) {
  const { lv001, lv002, lv003 } = donViData;
  return await callApi("sl_lv0005", "suaDonVi", { lv001, lv002, lv003 });
}

// Xóa đơn vị
export async function xoaDonVi(lv001) {
  return await callApi("sl_lv0005", "xoaDonVi", { lv001 });
}

// Tạo đơn hàng
export async function taoDonHang(idBan) {
  return await callApi("Mb_TaoDonHang", "add", { idBan });
}

// -------------------- Functions from index_NChung.php --------------------

//Lấy mã hóa, tên bàn, vị trí, trạng thái từ bàn đang bán
export async function getMaHoaDonTuBanDangBan(banId) {
  return await callApi("m_loadBan", "load", { banId });
}

export async function getMaHoaDonTuBanDangBan_IdBan(banId) {
  return await callApi("m_loadBan_Hieu", "load", { banId });
}

// Lấy danh sách món đang chờ order
export async function getDsMonDangChoOrder() {
  return await callApi("Mb_Oder", "layDsMonDangChoOder");
}

// Lấy món ăn từ bàn đang bán
export async function getMonAnTuBanDangBan() {
  return await callApi("Mb_Oder", "layMonAnTuBanDangBan");
}

// Lấy món nước từ bàn đang bán
export async function getMonNuocTuBanDangBan() {
  return await callApi("Mb_Oder", "layMonNuocTuBanDangBan");
}

// Lấy danh sách món đã xong
export async function getDsMonDaXong() {
  return await callApi("Mb_Oder", "layDsMonDaXong");
}

// Lấy thông tin đơn hàng theo bàn
export async function getThongTinDonHang(banid) {
  return await callApi("m_CheckTrangThai", "layThongTinDonHang", { banid });
}

// Thêm nhân sự
export async function addNhanSu(data) {
  return await callApi("hr_NhanSu", "add", data);
}

// Sửa nhân sự
export async function editNhanSu(data) {
  return await callApi("hr_NhanSu", "edit", data);
}

// Xóa nhân sự
export async function deleteNhanSu(lv001) {
  return await callApi("hr_NhanSu", "delete", { lv001 });
}

// -------------------- Functions from index_KBao.php --------------------

// Lấy dữ liệu kho
export async function getKhoData() {
  return await callApi("Mb_Kho", "data");
}

// Thêm kho
export async function addKho(data) {
  return await callApi("Mb_Kho", "add", data);
}

// Sửa kho
export async function editKho(data) {
  return await callApi("Mb_Kho", "edit", data);
}

// Xóa kho
export async function deleteKho(lv001) {
  return await callApi("Mb_Kho", "delete", { lv001 });
}

// Lấy NVL theo mã kho
export async function getNvlTheoMaKho(maKho) {
  return await callApi("Mb_Kho", "LayNvlTheoMaKho", { maKho });
}

// Lấy số lượng tồn kho nhiều SP (version 2)
export async function getSoLuongTonKhoNhieuSPv2(maSPArr, maKho) {
  return await callApi("Mb_Kho", "LaySoLuongTonKhoNhieuSP", {
    maSP: maSPArr,
    maKho,
  });
}

// -------------------- GMAC API Integration - Real Implementation --------------------
// Tích hợp với GMAC API thực tế để lấy dữ liệu khu vực và bàn

const GMAC_BASE_URL = process.env.REACT_APP_GMAC_BASE_URL || "http://localhost/gmac"; // URL của GMAC server

// API thực tế lấy danh sách khu vực từ GMAC hr_lv0004
export async function getGmacKhuVucList() {
  try {
    // Thử gọi API thực tế GMAC hr_lv0004
    const response = await fetch(
      `${GMAC_BASE_URL}/soft/hr_lv0004/hr_lv0004.php?func=list&lang=vn`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );

    if (response.ok) {
      const htmlData = await response.text();
      return parseGmacHrData(htmlData);
    } else {
      throw new Error("GMAC API không khả dụng");
    }
  } catch (error) {
    console.error("GMAC API không khả dụng:", error);
    throw error;
  }
}

// API thực tế lấy danh sách bàn từ GMAC sl_lv0008 theo khu vực
export async function getGmacBanListByKhuVuc(khuVucId) {
  try {
    // Thử gọi API thực tế GMAC sl_lv0008
    const response = await fetch(
      `${GMAC_BASE_URL}/soft/sl_lv0008/sl_lv0008.php?func=list&khuVuc=${khuVucId}&lang=vn`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );

    if (response.ok) {
      const htmlData = await response.text();
      return parseGmacBanData(htmlData, khuVucId);
    } else {
      throw new Error("GMAC API không khả dụng");
    }
  } catch (error) {
    console.error("GMAC API không khả dụng:", error);
    throw error;
  }
}

// API để tạo đơn hàng thực qua GMAC sl_lv0201
export async function createGmacOrder(orderData) {
  try {
    const params = new URLSearchParams({
      ajaxitemsend: "ajaxcheck",
      ContractID: orderData.contractId || "",
      BangID: orderData.banId,
      ItemID: orderData.itemId,
      Order: orderData.order || 1,
      CusID: orderData.customerId || "",
      AddState: orderData.addState || 1,
      trahang: orderData.traHang || 0,
      progid: orderData.programId || "",
      lang: "vn",
    });

    const response = await fetch(
      `${GMAC_BASE_URL}/soft/sl_lv0201/sl_lv0201.php`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params,
      },
    );

    if (response.ok) {
      const data = await response.text();
      return parseGmacOrderResult(data);
    } else {
      throw new Error("Không thể tạo đơn hàng qua GMAC");
    }
  } catch (error) {
    console.error("Error creating GMAC order:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Parse d? li?u khu v?c t? GMAC hr_lv0004 response
function parseGmacHrData(htmlData) {
  try {
    // TODO: Implement actual HTML parsing t? GMAC hr_lv0004
    console.warn("parseGmacHrData chua du?c implement");
    throw new Error("parseGmacHrData chua du?c implement");
  } catch (error) {
    console.error("L?i parse d? li?u khu v?c GMAC:", error);
    throw error;
  }
}

// Parse dữ liệu bàn từ GMAC sl_lv0008 response
function parseGmacBanData(htmlData, khuVucId) {
  try {
    // TODO: Implement actual HTML parsing từ GMAC sl_lv0008
    console.warn("parseGmacBanData chưa được implement");
    throw new Error("parseGmacBanData chưa được implement");
  } catch (error) {
    console.error("Lỗi parse dữ liệu bàn GMAC:", error);
    throw error;
  }
}

// Parse kết quả tạo đơn hàng từ GMAC sl_lv0201
function parseGmacOrderResult(rawData) {
  // Parse response từ GMAC sl_lv0201.php
  // Tìm [CHECKHOPDONG] và [CHECKORDER] patterns như trong source code
  try {
    const contractMatch = rawData.match(
      /\[CHECKHOPDONG\](.*?)\[ENDCHECKHOPDONG\]/,
    );
    const orderMatch = rawData.match(/\[CHECKORDER\](.*?)\[ENDCHECKORDER\]/);
    const blockMatch = rawData.match(/\[CHECKBLOCK\](.*?)\[ENDCHECKBLOCK\]/);

    if (contractMatch && orderMatch) {
      return {
        success: true,
        contractId: contractMatch[1],
        orderId: orderMatch[1],
        isBlocked: blockMatch ? parseInt(blockMatch[1]) : 0,
      };
    } else {
      return {
        success: false,
        error: "Invalid response format",
      };
    }
  } catch (error) {
    return {
      success: false,
      error: "Parse error: " + error.message,
    };
  }
}

// -------------------- Functions from features/quan-ly --------------------

// Lấy số lượng tồn kho
export async function laySoLuongTonKho(maSP, maKho) {
  return await callApi("Mb_Kho", "LaySoLuongTonKho", { maSP, maKho });
}

// Lấy số lượng tồn kho nhiều sản phẩm
export async function laySoLuongTonKhoNhieuSP(maSP, maKho) {
  return await callApi("Mb_Kho", "LaySoLuongTonKhoNhieuSP", { maSP, maKho });
}

// Load kho từ features
export async function loadKhoFeatures(data = {}) {
  return await callApi("wh_lv0001", "loadKho", data);
}

// Thêm kho
export async function themKhoFeatures(khoData) {
  const { lv001, lv002, lv003, lv004, lv005, lv006, lv007, lv008 } = khoData;
  return await callApi("wh_lv0001", "themKho", {
    lv001,
    lv002,
    lv003,
    lv004,
    lv005,
    lv006,
    lv007,
    lv008,
  });
}

// Cập nhật kho
export async function capNhatKhoFeatures(khoData) {
  const { lv001, lv002, lv003, lv004, lv005, lv006, lv007, lv008 } = khoData;
  return await callApi("wh_lv0001", "capNhatKho", {
    lv001,
    lv002,
    lv003,
    lv004,
    lv005,
    lv006,
    lv007,
    lv008,
  });
}

// Xóa kho
export async function xoaKhoFeatures(lv001) {
  return await callApi("wh_lv0001", "xoaKho", { lv001 });
}

// Load sản phẩm theo ID kho
export async function loadSanPhamTheoIdKho(idKho) {
  return await callApi("sl_lv0007", "loadSanPhamTheoIdKho", { idKho });
}

// Load phiếu nhập
export async function loadPhieuNhap(data = {}) {
  return await callApi("wh_lv0002", "loadPhieuNhap", data);
}

// Xóa phiếu nhập
export async function xoaPhieuNhap(maPhieu) {
  return await callApi("wh_lv0002", "xoaPhieuNhap", { maPhieu });
}

// Thêm phiếu nhập chi tiết
export async function ThemPhieuNhapChiTietPn(phieuNhapData) {
  const { maPhieu, maSP, soLuong, donGia, ghiChu, maKho } = phieuNhapData;
  return await callApi("wh_lv0003", "ThemPhieuNhapChiTietPn", {
    maPhieu,
    maSP,
    soLuong,
    donGia,
    ghiChu,
    maKho,
  });
}

// Fetch all nguyên liệu kho
export async function fetchAllNguyenLieuKho() {
  return await callApi("wh_lv0004", "fetchAllNguyenLieuKho");
}

// Lấy phiếu nhập by ID
export async function layPhieuNhapById(maPhieu) {
  return await callApi("wh_lv0002", "layPhieuNhapById", { maPhieu });
}

// Lấy chi tiết phiếu nhập
export async function layCtPhieuNhap(maPhieu) {
  return await callApi("wh_lv0003", "layCtPhieuNhap", { maPhieu });
}

// Lấy xuất kho
export async function layXuatKho() {
  return await callApi("wh_lv0005", "layXuatKho");
}

// Lấy phiếu xuất by ID
export async function layPhieuXuatById(maPhieu) {
  return await callApi("wh_lv0005", "layPhieuXuatById", { maPhieu });
}

// Thêm phiếu xuất chi tiết
export async function themPhieuXuatChiTietPX(phieuXuatData) {
  const { maPhieu, maSP, soLuong, donGia, ghiChu, maKho } = phieuXuatData;
  return await callApi("wh_lv0006", "themPhieuXuatChiTietPX", {
    maPhieu,
    maSP,
    soLuong,
    donGia,
    ghiChu,
    maKho,
  });
}

// Xóa phiếu xuất
export async function xoaPhieuXuat(maPhieu) {
  return await callApi("wh_lv0005", "xoaPhieuXuat", { maPhieu });
}

// Lấy chi tiết phiếu xuất
export async function layCtPhieuXuat(maPhieu) {
  return await callApi("wh_lv0006", "layCtPhieuXuat", { maPhieu });
}

// Lấy tất cả loại nguyên vật liệu
export async function layAll_LoaiNVL() {
  return await callApi("Mb_NguyenLieu", "get_DS_LoaiNVL");
}

// Lấy tất cả danh mục sản phẩm (corrected table)
export async function layAllDanhMucSPCorrected() {
  return await callApi("Mb_LoaiNguyenLieu", "data");
}

// Thêm loại nguyên liệu (corrected parameters)
export async function themLoaiNguyenLieuCorrected(loaiData) {
  const { maLoai, moTa, maLoaiCha, trangThai } = loaiData;
  return await callApi("Mb_LoaiNguyenLieu", "add", {
    maLoai,
    moTa,
    maLoaiCha,
    trangThai,
  });
}

// Thêm nguyên liệu (corrected with more params)
export async function themNguyenLieuCorrected(nguyenLieuData) {
  const {
    maSanPham,
    tenSanPham,
    maLoai,
    maDonVi,
    donViTinhQuyDoi,
    giaTriQuyDoi,
    gia,
    donViGia,
    maKho,
  } = nguyenLieuData;
  return await callApi("Mb_NguyenLieu", "add", {
    maSanPham,
    tenSanPham,
    maLoai,
    donViTinh: maDonVi,
    donViQuyDoi: donViTinhQuyDoi,
    giaTriQuyDoi,
    gia,
    donViGia,
    trangThai_HienThiSP: 0,
    maKho,
  });
}

// Thêm sản phẩm (corrected function)
export async function themSanPhamCorrected(sanPhamData) {
  const {
    maSanPham,
    tenSanPham,
    maLoai,
    maDonVi,
    donViTinhQuyDoi,
    giaTriQuyDoi,
    gia,
    donViGia,
    maKho,
  } = sanPhamData;
  return await callApi("Mb_NguyenLieu", "add_SP", {
    maSanPham,
    tenSanPham,
    maLoai,
    donViTinh: maDonVi,
    donViQuyDoi: donViTinhQuyDoi,
    giaTriQuyDoi,
    gia,
    donViGia,
    trangThai_HienThiSP: 1,
    maKho,
  });
}

// Lấy tất cả danh mục sản phẩm
export async function layAllDanhMucSP() {
  return await callApi("Mb_loaiSanPham", "data");
}

// Lấy danh sách nguyên vật liệu
export async function layDS_NVL() {
  return await callApi("wh_lv0008", "layDS_NVL");
}

// Lấy danh sách nguyên vật liệu (version 2 - from features)
export async function layDSNguyenLieu() {
  return await callApi("Mb_NguyenLieu", "get_dsNVL");
}

// Thêm nguyên liệu
export async function themNguyenLieu(nguyenLieuData) {
  const {
    lv001,
    lv002,
    lv003,
    lv004,
    lv005,
    lv006,
    lv007,
    lv008,
    lv009,
    lv010,
    lv011,
    lv012,
    lv013,
    lv014,
    lv015,
    lv016,
    lv017,
    lv018,
    lv019,
    lv020,
  } = nguyenLieuData;
  return await callApi("wh_lv0008", "themNguyenLieu", {
    lv001,
    lv002,
    lv003,
    lv004,
    lv005,
    lv006,
    lv007,
    lv008,
    lv009,
    lv010,
    lv011,
    lv012,
    lv013,
    lv014,
    lv015,
    lv016,
    lv017,
    lv018,
    lv019,
    lv020,
  });
}

// Cập nhật nguyên liệu
export async function capNhatNguyenLieu(nguyenLieuData) {
  const {
    lv001,
    lv002,
    lv003,
    lv004,
    lv005,
    lv006,
    lv007,
    lv008,
    lv009,
    lv010,
    lv011,
    lv012,
    lv013,
    lv014,
    lv015,
    lv016,
    lv017,
    lv018,
    lv019,
    lv020,
  } = nguyenLieuData;
  return await callApi("wh_lv0008", "capNhatNguyenLieu", {
    lv001,
    lv002,
    lv003,
    lv004,
    lv005,
    lv006,
    lv007,
    lv008,
    lv009,
    lv010,
    lv011,
    lv012,
    lv013,
    lv014,
    lv015,
    lv016,
    lv017,
    lv018,
    lv019,
    lv020,
  });
}

// Xóa nguyên liệu
export async function xoaNguyenLieu(lv001) {
  return await callApi("wh_lv0008", "xoaNguyenLieu", { lv001 });
}

// Thêm loại nguyên vật liệu
export async function themLoaiNguyenLieu(loaiData) {
  const { lv001, lv002, lv003, lv004, lv005, lv006, lv007, lv008 } = loaiData;
  return await callApi("wh_lv0007", "themLoaiNguyenLieu", {
    lv001,
    lv002,
    lv003,
    lv004,
    lv005,
    lv006,
    lv007,
    lv008,
  });
}

// Cập nhật loại nguyên vật liệu
export async function capNhatLoaiNVL(loaiData) {
  const { lv001, lv002, lv003, lv004, lv005, lv006, lv007, lv008 } = loaiData;
  return await callApi("wh_lv0007", "capNhatLoaiNVL", {
    lv001,
    lv002,
    lv003,
    lv004,
    lv005,
    lv006,
    lv007,
    lv008,
  });
}

// Xóa loại nguyên vật liệu
export async function xoaLoaiNVL(lv001) {
  return await callApi("wh_lv0007", "xoaLoaiNVL", { lv001 });
}

const DEFAULT_SANPHAM_CURRENCY = "VND";
const DEFAULT_SANPHAM_CONVERSION = 1;

const hasLvStructure = (data) =>
  data &&
  (Object.prototype.hasOwnProperty.call(data, "lv001") ||
    Object.prototype.hasOwnProperty.call(data, "lv002") ||
    Object.prototype.hasOwnProperty.call(data, "lv003"));

const toTrimmedString = (value, fallback = "") => {
  if (value === null || value === undefined) {
    return fallback;
  }
  return value.toString().trim();
};

const toNumber = (value, fallback = 0) => {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  if (typeof value === "number") {
    return Number.isNaN(value) ? fallback : value;
  }

  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9.-]/g, "");
    const parsed = Number(cleaned);
    return Number.isNaN(parsed) ? fallback : parsed;
  }

  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }

  if (typeof value === "object" && value !== null && "value" in value) {
    return toNumber(value.value, fallback);
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const SANPHAM_LV_FIELDS = [
  "lv001",
  "lv002",
  "lv003",
  "lv004",
  "lv005",
  "lv006",
  "lv007",
  "lv008",
  "lv009",
  "lv010",
  "lv011",
  "lv012",
  "lv013",
  "lv014",
  "lv015",
  "lv016",
  "lv017",
  "lv018",
  "lv019",
  "lv020",
  "lv021",
  "lv022",
  "lv023",
  "lv036",
  "lv098",
  "lv099",
  "lv199",
  "lv299",
];

const buildSanPhamPayload = (data, { includeImage = false } = {}) => {
  if (!data || typeof data !== "object") {
    return {};
  }

  if (hasLvStructure(data)) {
    const payload = {};
    SANPHAM_LV_FIELDS.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(data, field)) {
        payload[field] = data[field];
      }
    });

    payload.lv001 = toTrimmedString(payload.lv001 ?? "");
    payload.lv002 = toTrimmedString(payload.lv002 ?? "");
    payload.lv003 = toTrimmedString(payload.lv003 ?? "");
    payload.lv004 = toTrimmedString(payload.lv004 ?? "");
    payload.lv005 = toTrimmedString(payload.lv005 ?? payload.lv004 ?? "");
    payload.lv006 = toTrimmedString(payload.lv006 ?? DEFAULT_SANPHAM_CONVERSION);
    payload.lv007 = toNumber(payload.lv007 ?? 0, 0);
    payload.lv008 = toTrimmedString(
      payload.lv008 ?? DEFAULT_SANPHAM_CURRENCY,
      DEFAULT_SANPHAM_CURRENCY,
    );
    payload.lv009 = toTrimmedString(payload.lv009 ?? "");
    payload.lv010 = toTrimmedString(payload.lv010 ?? "");
    payload.lv011 = toNumber(payload.lv011 ?? 0, 0);
    payload.lv012 = toTrimmedString(payload.lv012 ?? "");
    payload.lv013 = toTrimmedString(payload.lv013 ?? "");
    payload.lv015 = toTrimmedString(payload.lv015 ?? 0);
    payload.lv016 = toTrimmedString(payload.lv016 ?? "");
    payload.lv017 = toTrimmedString(payload.lv017 ?? "");
    payload.lv018 = toTrimmedString(payload.lv018 ?? "");
    payload.lv019 = toTrimmedString(payload.lv019 ?? "");
    payload.lv036 = toTrimmedString(payload.lv036 ?? 0);
    payload.lv098 = toTrimmedString(payload.lv098 ?? 0);
    payload.lv099 = toTrimmedString(payload.lv099 ?? "");
    payload.lv299 = toTrimmedString(payload.lv299 ?? 0);

    if (includeImage || Object.prototype.hasOwnProperty.call(data, "lv014")) {
      payload.lv014 = toTrimmedString(data.lv014 ?? "");
    }

    return payload;
  }

  const payload = {
    lv001: toTrimmedString(
      data.maSanPham ?? data.id ?? data.maSp ?? data.maSP ?? "",
    ),
    lv002: toTrimmedString(
      data.tenSanPham ?? data.ten ?? data.tenSp ?? data.tenSP ?? "",
    ),
    lv003: toTrimmedString(data.maLoai ?? data.danhMuc ?? data.idLoai ?? ""),
    lv004: toTrimmedString(data.donViTinh ?? data.donVi ?? data.dvt ?? ""),
    lv005: toTrimmedString(data.donViQuyDoi ?? data.lv005 ?? data.donViTinh ?? ""),
    lv006: toTrimmedString(data.giaTriQuyDoi ?? data.heSoQuyDoi ?? data.lv006 ?? DEFAULT_SANPHAM_CONVERSION),
    lv007: toNumber(
      data.giaBan ?? data.gia ?? data.donGia ?? data.price ?? 0,
      0,
    ),
    lv008: toTrimmedString(
      data.donViGia ?? data.currency ?? DEFAULT_SANPHAM_CURRENCY,
      DEFAULT_SANPHAM_CURRENCY,
    ),
    lv009: toTrimmedString(data.moTaMuaHang ?? data.nhaCungCap ?? data.lv009 ?? ""),
    lv010: toTrimmedString(data.ghiChu ?? data.moTa ?? data.memo ?? data.lv010 ?? ""),
    lv011: toNumber(
      data.giaVon ?? data.giaBQ ?? data.giaBinhQuan ?? data.lv011 ?? 0,
      0,
    ),
    lv012: toTrimmedString(data.phuongPhapTon ?? data.lv012 ?? ""),
    lv013: toTrimmedString(data.khoMacDinh ?? data.maKho ?? data.lv013 ?? ""),
    lv015: toTrimmedString(data.trangThai ?? data.status ?? data.lv015 ?? 0),
    lv016: toTrimmedString(data.khoQuanLy ?? data.maKhoQuanLy ?? data.lv016 ?? ""),
    lv017: toTrimmedString(data.maBarcode ?? data.barcode ?? data.lv017 ?? ""),
    lv018: toTrimmedString(data.quyCach ?? data.lv018 ?? ""),
    lv019: toTrimmedString(data.mau ?? data.mauSac ?? data.lv019 ?? ""),
    lv036: toTrimmedString(data.hienThiWeb ?? data.lv036 ?? 0),
    lv098: toTrimmedString(data.khongCanTon ?? data.lv098 ?? 0),
    lv099: toTrimmedString(data.maBarcodeTimKiem ?? data.lv099 ?? ""),
    lv299: toTrimmedString(data.coBom ?? data.lv299 ?? 0),
  };

  if (
    includeImage ||
    data.imageToken !== undefined ||
    data.lv014 !== undefined ||
    data.imageUrl !== undefined ||
    data.hinhAnh !== undefined
  ) {
    payload.lv014 = toTrimmedString(
      data.imageToken ?? data.lv014 ?? data.imageUrl ?? data.hinhAnh ?? "",
    );
  }

  return payload;
};

export async function getProductChildData(childKey, productId) {
  return await callApi("Mb_sanPham", "childList", { childKey, productId });
}

export async function saveProductChildData(childKey, productId, rows = []) {
  return await callApi("Mb_sanPham", "childSave", {
    childKey,
    productId,
    rows,
  });
}
// Thêm sản phẩm
export async function themSanPham(sanPhamData) {
  const payload = buildSanPhamPayload(sanPhamData, { includeImage: true });
  return await callApi("Mb_sanPham", "add", payload);
}

// Cập nhật sản phẩm
export async function capNhatSanPham(sanPhamData) {
  const includeImage =
    sanPhamData &&
    (sanPhamData.imageUrl !== undefined || sanPhamData.lv014 !== undefined);
  const payload = buildSanPhamPayload(sanPhamData, { includeImage });
  return await callApi("Mb_sanPham", "edit", payload);
}

// Xóa sản phẩm
export async function xoaSanPham(lv001) {
  return await callApi("Mb_sanPham", "delete", { lv001 });
}

// -------------------- Functions from features/banhang --------------------

// Load bàn từ banhang
export async function loadBanBanhang(data = {}) {
  return await callApi("sl_lv0009", "loadBan", data);
}

// Lấy bàn mặc định theo người dùng
export async function getUserDefaultTable(userId) {
  if (!userId) {
    throw new Error("Thiếu userId để lấy bàn mặc định");
  }

  return await callApi("sl_lv0009", "layBanTheoNguoiDung", { userId });
}

// Load khu vực từ banhang
export async function loadKhuVucBanhang(data = {}) {
  return await callApi("sl_lv0008", "loadKhuVuc", data);
}

// Gộp bàn
export async function gopBanBanhang(maHoaDon, idBanGop) {
  return await callApi("sl_lv0013", "gopBan", { maHoaDon, idBanGop });
}

// Tách bàn
export async function tachBan(maHoaDon) {
  return await callApi("sl_lv0013", "tachBan", { maHoaDon });
}

// Load sản phẩm từ banhang
export async function loadSanPhamBanhang(data = {}) {
  return await callApi("sl_lv0007", "loadSanPham", data);
}

// -------------------- Additional Functions from features/quan-ly --------------------

// Lấy danh sách nguyên vật liệu theo loại
export async function layDanhSachNVL_TheoLoai(maLoai) {
  return await callApi("Mb_NguyenLieu", "layNVLTheoMaLoai", { idLoai: maLoai });
}

// Cập nhật nguyên liệu (version corrected)
export async function capNhatNguyenLieuFixed(nguyenLieuData) {
  const {
    lv001,
    lv002,
    lv003,
    lv004,
    lv005,
    lv006,
    lv007,
    lv008,
    lv009,
    lv010,
    lv011,
    lv012,
    lv013,
    lv014,
    lv015,
    lv016,
    lv017,
    lv018,
    lv019,
    lv020,
  } = nguyenLieuData;
  return await callApi("Mb_NguyenLieu", "edit", {
    lv001,
    lv002,
    lv003,
    lv004,
    lv005,
    lv006,
    lv007,
    lv008,
    lv009,
    lv010,
    lv011,
    lv012,
    lv013,
    lv014,
    lv015,
    lv016,
    lv017,
    lv018,
    lv019,
    lv020,
  });
}

// Xóa nguyên liệu (corrected)
export async function xoaNguyenLieuFixed(maNguyenLieu) {
  return await callApi("Mb_NguyenLieu", "delete", { maNguyenLieu });
}

// -------------------- Phiếu kiểm kho --------------------

// Lấy danh sách phiếu kiểm kho theo mã kho
export async function layDanhSachPhieuKiemKho(maKho) {
  return await callApi("Mb_KiemKho", "layDanhSachPhieuKiemTheoKho", { maKho });
}

// Lấy chi tiết phiếu kiểm
export async function layChiTietPhieuKiem(maPK) {
  return await callApi("Mb_ChiTietPK", "data", { maPK });
}

// Tạo phiếu kiểm kho
export async function taoPhieuKiemKho(phieuKiemData) {
  const { maKho, maNhanVien, chuDe, ghiNhan, trangThai } = phieuKiemData;
  return await callApi("Mb_KiemKho", "add", {
    maKho,
    maNhanVien,
    chuDe,
    ghiNhan,
    trangThai,
  });
}

// Tạo chi tiết phiếu kiểm kho
export async function taoChiTietPhieuKiemKho(chiTietData) {
  const { maKiemKho, maSanPham, slPM, donViKiem, soLuongThucTe, donViTT } =
    chiTietData;
  return await callApi("Mb_ChiTietPK", "add", {
    maKiemKho,
    maSanPham,
    slPM,
    donViKiem,
    soLuongThucTe,
    donViTT,
  });
}

// Cập nhật chi tiết phiếu kiểm kho
export async function updateChiTietPhieuKiemKho(updateData) {
  const { maKiemKho, maSanPham, soLuongThucTe, donViTT } = updateData;
  return await callApi("Mb_ChiTietPK", "edit", {
    maKiemKho,
    maSanPham,
    soLuongThucTe,
    donViTT,
  });
}

// Xóa chi tiết phiếu kiểm kho
export async function xoaChiTietPhieuKiemKho(deleteData) {
  const { maKiemKho, maSanPham } = deleteData;
  return await callApi("Mb_ChiTietPK", "delete", { maKiemKho, maSanPham });
}

// Chỉnh sửa trạng thái phiếu kiểm kho
export async function chinhSuaTrangThaiPK(dsMaPK) {
  return await callApi("Mb_KiemKho", "chinhSuaTrangThai_PK", { dsMaPK });
}

// Lấy thông tin phiếu kiểm by ID
export async function layThongTinPhieuKiemByID(maPK) {
  return await callApi("Mb_KiemKho", "layThongTinPhieuKiemByID", { maPK });
}

// -------------------- Additional Functions from features/banhang --------------------

// Tạo hóa đơn - hỗ trợ cả maBan (quầy) và userId (người tạo)
export async function taoHoaDon(maBan, userId = null) {
  return await callApi("sl_lv0013", "taoHoaDon", { maBan, userId });
}

// Lấy hóa đơn đang mở theo userId (khi user chưa được gán quầy)
export async function layHoaDonTheoUserId(userId) {
  return await callApi("sl_lv0013", "layHoaDonTheoUserId", { userId });
}

// Tạo chi tiết hóa đơn
export async function taoCthd(maHd, maSp, soLuong) {
  const result = await callApi("sl_lv0014", "taoCtHd", { maHd, maSp, soLuong });
  return result;
}

// Load danh sách chi tiết hóa đơn
export async function loadDsCthd(maHd) {
  console.log('thực hiện lấy thông tin hd theo mã: ');

  return await callApi("sl_lv0014", "loadCtHd", { maHd });
}

// Load danh sách chi tiết hóa đơn V2
export async function loadDsCthdV2(maHd) {
  return await callApi("sl_lv0014", "loadCtHdV2", { maHd });
}

// Xóa chi tiết hóa đơn
export async function xoaCtHd(data) {
  // Support both direct maCt parameter and object parameter
  const maCt = typeof data === "object" && data.maCt ? data.maCt : data;

  // FIXED: Use correct function name from mobile logic pattern
  const result = await callApi("sl_lv0014", "xoaCthd", { maCt });

  return result;
}

// Chuyển bàn (corrected parameters)
export async function chuyenBanCorrected(chuyenBanData) {
  const { maHoaDonBanCanChuyen, maHoaDonBanChuyen, maBanChuyen } =
    chuyenBanData;
  return await callApi("sl_lv0013", "chuyenBan", {
    maHoaDonBanCanChuyen,
    maHoaDonBanChuyen,
    maBanChuyen,
  });
}

// Load hóa đơn theo bàn
export async function loadHoaDonTheoBan(maBan) {
  return await callApi("sl_lv0013", "loadHoaDonTheoBan", { maBan });
}

// Load hóa đơn
export async function loadHoaDon() {
  return await callApi("sl_lv0013", "data");
}

// -------------------- Additional missing functions from banhang --------------------

// Cập nhật hóa đơn (thanh toán contract)
// Tham số tongTien sẽ được lưu vào cột lv336 trong bảng sl_lv0013
export async function capNhatHoaDon(
  mahd,
  phuongThuc = "tienmat",
  maKho = "",
  tongTien = 0,
) {
  return await callApi("Mb_thanhtoan", "thanhToan_contract", {
    mahd,
    phuongThuc,
    maKho,
    tongTien,
  });
}

// Cập nhật hóa đơn 2
export async function capNhatHoaDon2(maHd, trangThai) {
  return await callApi("sl_lv0013", "capNhatHoaDon2", { maHd, trangThai });
}

// Cập nhật hóa đơn trạng thái 4
export async function capNhatHoaDonTT4(maHd, trangThai) {
  return await callApi("sl_lv0013", "capNhatHoaDonTT4", { maHd, trangThai });
}

// Chuyển món
export async function chuyenMon(dsChiTietMonAn, maBanChuyen) {
  return await callApi("sl_lv0013", "chuyenMonAn", {
    dsChiTietMonAn,
    maBanChuyen,
  });
}

// Lấy tất cả sản phẩm (alias)
export async function layALLSanPham() {
  return await callApi("Mb_sanPham", "data");
}

// -------------------- Additional  functions from commented code in quan-ly --------------------

// Lấy danh sách nguyên liệu (uncommented from quan-ly/index.js)
export async function layDSNguyenLieuQuanLy() {
  return await callApi("Mb_NguyenLieu", "get_dsNVL");
}

// ==================== ENHANCED PAYMENT SYSTEM ====================

// Thanh toán hóa đơn với phương thức chi tiết - Enhanced payment processing
export async function thanhToanHoaDonChiTiet(paymentData) {
  const {
    maHd,
    tongTien,
    tienKhachDua,
    tienThua,
    phuongThucThanhToan,
    ghiChu,
    ngayThanhToan,
  } = paymentData;

  return await callApi("sl_lv0013", "thanhToanHoaDonChiTiet", {
    maHd,
    tongTien,
    tienKhachDua,
    tienThua,
    phuongThucThanhToan,
    ghiChu,
    ngayThanhToan,
  });
}

// Lưu mã tra cứu hóa đơn điện tử
export async function capNhatMaTraCuuHoaDon({
  maHd,
  maTraCuu,
  taxResponse,
} = {}) {
  if (!maHd) {
    throw new Error("Thiếu mã hóa đơn để lưu mã tra cứu.");
  }

  const lookupCode = typeof maTraCuu === "string" ? maTraCuu.trim() : "";

  return await callApi("sl_lv0013", "capNhatMaTraCuuHoaDon", {
    maHd,
    maTraCuu: lookupCode,
    taxResponse: taxResponse ?? null,
  });
}

// Lấy lịch sử thanh toán - Get payment history
export async function layLichSuThanhToan(maHd) {
  return await callApi("sl_lv0013", "layLichSuThanhToan", { maHd });
}

// ưu thông tin thanh toán - Save payment information
export async function luuThongTinThanhToan(paymentInfo) {
  return await callApi("sl_lv0013", "luuThongTinThanhToan", paymentInfo);
}

// In hóa đơn thanh toán - Print payment receipt
export async function inHoaDonThanhToan(maHd, paymentDetails) {
  return await callApi("sl_lv0013", "inHoaDonThanhToan", {
    maHd,
    paymentDetails,
  });
}

// Thanh toán hỗn hợp - Mixed payment
export async function thanhToanHonHop(paymentData) {
  const {
    maHd,
    tongTien,
    finalTotal,
    discount,
    mixedPayments,
    ghiChu,
    ngayThanhToan,
  } = paymentData;

  return await callApi("sl_lv0013", "thanhToanHonHop", {
    maHd,
    tongTien,
    finalTotal,
    discount,
    mixedPayments: JSON.stringify(mixedPayments),
    ghiChu,
    ngayThanhToan,
  });
}

// lưu chi tiết thanh toán hỗn hợp - Save mixed payment details
export async function luuChiTietThanhToanHonHop(maHd, mixedPayments) {
  return await callApi("sl_lv0013", "luuChiTietThanhToanHonHop", {
    maHd,
    mixedPayments: JSON.stringify(mixedPayments),
  });
}

// Lấy lịch sử thanh toán hỗn hợp - Get mixed payment history
export async function layLichSuThanhToanHonHop(maHd) {
  return await callApi("sl_lv0013", "layLichSuThanhToanHonHop", { maHd });
}

// Hủy thanh toán (nếu cần) - Cancel payment
export async function huyThanhToan(maHd, reason) {
  return await callApi("sl_lv0013", "huyThanhToan", {
    maHd,
    reason,
  });
}

// ==================== LEGACY PAYMENT FUNCTION ====================

// Thanh toán hóa đơn bán hàng - Process payment for sales invoice (Legacy)
export async function thanhToanHoaDonBanhang(paymentData) {
  const { maHd, tongTien, tienKhachDua, tienThua } = paymentData;
  return await callApi("sl_lv0013", "thanhToanHoaDon", {
    maHd,
    tongTien,
    tienKhachDua,
    tienThua,
  });
}

// Tra tiền (hoàn tất thanh toán) - Final payment completion
// Tương ứng với function tratien(donhangid, bangid, opt) trong sl_lv0201.php
export async function tratien(donhangid, bangid, trangthai, cusid = "") {
  return await callApi("sl_lv0201", "ajaxaproval", {
    donhangid, // Mã hóa đơn
    bangid, // ID bàn
    trangthai: 2, // 1=chờ thanh toán, 2=thanh toán hoàn tất, 3=kích hoạt chờ thanh toán, 4=hủy bill, 5=báo bill
    cusid, // Mã khách hàng (optional)
  });
}

// Check trạng thái bàn sau thanh toán - Check table status after payment
export async function checkBangStatus(bangid) {
  return await callApi("sl_lv0201", "ajaxbangid", {
    bangid, // ID bàn cần check
  });
}

// Cập nhật hóa đơn - Update invoice status (backend function capNhatHd)
export async function capNhatHd(idHd) {
  return await callApi("sl_lv0013", "capNhatHd", { idHd });
}

// Cập nhật hóa đơn V2 - Update invoice status with flexible state
export async function capNhatHdV2(idHd, trangThai) {
  return await callApi("sl_lv0013", "capNhatHdV2", { idHd, trangThai });
}

// Check và refresh trạng thái bàn - Check and refresh table status (CRITICAL for clearing invoices)
export async function ajaxBangId(bangid) {
  return await callApi("sl_lv0201", "ajaxbangid", {
    bangid,
    ajaxbangid: "ajaxcheck",
  });
}

// Chuyển xuống bếp - Send order to kitchen
export async function chuyenXuongBep(maHd) {
  return await callApi("sl_lv0013", "chuyenXuongBep", { maHd });
}

// ==================== ORDER PROCESSING SYSTEM COMPLETION ====================

// Xác nhận đơn hàng - Confirm order
export async function xacNhanDonHang(maHd, nguoiXacNhan) {
  return await callApi("sl_lv0013", "xacNhanDonHang", {
    maHd,
    nguoiXacNhan,
    thoiGianXacNhan: new Date().toISOString(),
  });
}

// Bắt đầu chuẩn bị - Start preparation
export async function batDauChuanBi(maHd, maNhanVienBep) {
  return await callApi("sl_lv0013", "batDauChuanBi", {
    maHd,
    maNhanVienBep,
    thoiGianBatDau: new Date().toISOString(),
  });
}

// Hoàn thành chuẩn bị - Complete preparation
export async function hoanThanhChuanBi(maHd, danhSachMon) {
  return await callApi("sl_lv0013", "hoanThanhChuanBi", {
    maHd,
    danhSachMon,
    thoiGianHoanThanh: new Date().toISOString(),
  });
}

// Thông báo món sẵn sàng - Notify order ready
export async function thongBaoMonSanSang(maHd, maBan) {
  return await callApi("sl_lv0013", "thongBaoMonSanSang", {
    maHd,
    maBan,
    thoiGianSanSang: new Date().toISOString(),
  });
}

// Giao món cho khách - Deliver order to customer
export async function giaoMonChoKhach(maHd, maBan, nhanVienGiao) {
  return await callApi("sl_lv0013", "giaoMonChoKhach", {
    maHd,
    maBan,
    nhanVienGiao,
    thoiGianGiao: new Date().toISOString(),
  });
}

export async function layTrangThaiDonHangRealtime(maHd) {
  return await callApi("sl_lv0013", "layTrangThaiRealtime", { maHd });
}

export async function capNhatTrangThaiMon(idCthd, trangThaiMoi, ghiChu) {
  return await callApi("sl_lv0014", "capNhatTrangThaiMon", {
    idCthd,
    trangThaiMoi,
    ghiChu,
    thoiGianCapNhat: new Date().toISOString(),
  });
}

export async function capNhatCtHd(updateData) {
  const { maCt, soLuong, maHd } = updateData;

  const result = await callApi("sl_lv0014", "capNhatCtHd", {
    maCt,
    soLuong,
    maHd,
  });

  return result;
}

export async function capNhatChietKhauMon(updateData) {
  const { maCt, chietKhau, maHd } = updateData;

  const result = await callApi("sl_lv0014", "capNhatChietKhauMon", {
    maCt,
    chietKhau,
    maHd,
  });

  return result;
}

export async function loadTrangThaiBanTheoHoaDon(data = {}) {
  return await callApi("sl_lv0013", "loadTrangThaiBanTheoHoaDon", data);
}

export async function loadDanhMucSp(data = {}) {
  return await callApi("sl_lv0006", "loadDanhMucSp", data);
}

export async function loadSanPhamTheoMaDanhMucSp(maDm) {
  return await callApi("sl_lv0007", "loadSanPhamTheoDmSp", { maDm });
}

export async function themBan(banData = {}) {
  const { maBan, tenBan, maKhuVuc } = banData;
  const payload = {
    lv001: maBan,
    lv002: tenBan,
    lv004: maKhuVuc,
  };
  console.log("themBan API called with:", payload);
  const result = await callApi("sl_lv0009", "themBan", payload);
  console.log("themBan API result:", result);
  return result;
}

export async function xoaBan(maBan) {
  console.log("xoaBan API called with maBan:", maBan);
  const result = await callApi("sl_lv0009", "xoaBan", { maBan });
  console.log("xoaBan API result:", result);
  return result;
}

export async function suaBan(banData) {
  const { maBan, tenBan, maKhuVuc } = banData;
  console.log("suaBan API called with:", { maBan, tenBan, maKhuVuc });
  const result = await callApi("sl_lv0009", "suaBan", {
    maBan,
    tenBan,
    maKhuVuc,
  });
  console.log("suaBan API result:", result);
  return result;
}

export async function huyHoaDon(maHd, cancelReasonPayload = {}) {
  const payload = { maHd };
  if (cancelReasonPayload && typeof cancelReasonPayload === "object") {
    const { cancelReasonCode, cancelReasonLabel, cancelReasonNote } =
      cancelReasonPayload;
    if (cancelReasonCode) {
      payload.cancelReasonCode = cancelReasonCode;
    }
    if (cancelReasonLabel) {
      payload.cancelReasonLabel = cancelReasonLabel;
    }
    if (cancelReasonNote !== undefined) {
      payload.cancelReasonNote = cancelReasonNote;
    }
  }
  return await callApi("sl_lv0013", "huyHoaDon", payload);
}

export async function loadDsCthdV3(maHd) {
  return await callApi("sl_lv0014", "loadCtHdV3", { maHd });
}

export async function capNhatTrangThaiDonHang(maHd, trangThai) {
  return await callApi("sl_lv0013", "capNhatTrangThai", { maHd, trangThai });
}

export async function layLichSuHoaDonTheoBan(maBan, fromDate, toDate) {
  return await callApi("sl_lv0013", "layLichSuHoaDon", {
    maBan,
    fromDate,
    toDate,
  });
}

export async function taoHoaDonTam(maBan) {
  return await callApi("sl_lv0013", "taoHoaDonTam", { maBan });
}

export async function chuyenHoaDonTamThanhChinhThuc(maHd) {
  return await callApi("sl_lv0013", "chuyenHdTamThanhChinhThuc", { maHd });
}

export async function saoChepHoaDon(maHdGoc, maBanMoi) {
  return await callApi("sl_lv0013", "saoChepHoaDon", { maHdGoc, maBanMoi });
}

export async function tinhTongTienHoaDon(maHd) {
  return await callApi("sl_lv0013", "tinhTongTien", { maHd });
}

export async function loadThongTinChiTietBan(maBan) {
  return await callApi("sl_lv0009", "loadThongTinChiTiet", { maBan });
}

export async function datBanTruoc(banData) {
  const { maBan, tenKhach, soDienThoai, thoiGianDat, ghiChu } = banData;
  return await callApi("sl_lv0009", "datBanTruoc", {
    maBan,
    tenKhach,
    soDienThoai,
    thoiGianDat,
    ghiChu,
  });
}

export async function huyDatBan(maBan) {
  return await callApi("sl_lv0009", "huyDatBan", { maBan });
}

// -------------------- Kitchen Order System APIs --------------------

export async function layDsMonCho() {
  return await callApi("Mb_Oder", "layDsMonDangChoOder");
}

export async function layDsMonNuoc() {
  return await callApi("Mb_Oder", "layMonNuocTuBanDangBan");
}

export async function layDsMonAn() {
  return await callApi("Mb_Oder", "layMonAnTuBanDangBan");
}

export async function updateTrangThaiMon(itemId) {
  return await callApi("m_updateTrangThaiMon", "updateTrangThaiMon", {
    itemId,
  });
}

export async function layDsMonTheoTrangThai(trangThai) {
  return await callApi("Mb_Oder", "layDsMonTheoTrangThai", { trangThai });
}

export async function layDsMonDaXong() {
  return await callApi("Mb_Oder", "layDsMonDaXong");
}

// -------------------- Enhanced Table Management APIs --------------------

// G?p b�n - Enhanced merge table function
export async function gopBanEnhanced(maHoaDonBanChinh, maBanGop, bangId) {
  try {
    console.log("gopBanEnhanced params:", {
      maHoaDonBanChinh,
      maBanGop,
      bangId,
    });

    const params = new URLSearchParams({
      class: "sl_lv0013",
      action: "gopBan",
      idDonHang: maHoaDonBanChinh,
      idBanGop: maBanGop,
      bangid: bangId,
      donhangid: maHoaDonBanChinh,
    });

    const response = await fetch(
      `${GMAC_BASE_URL}/services.sof.vn/index_NChung.php?${params}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseText = await response.text();
    console.log("gopBanEnhanced response text:", responseText);

    if (responseText.includes("<br />") || responseText.includes("<b>")) {
      throw new Error(
        "Backend tr? v? l?i HTML: " + responseText.substring(0, 200),
      );
    }

    try {
      const result = JSON.parse(responseText);
      console.log("gopBanEnhanced result:", result);
      return result;
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      throw new Error(
        "Response kh�ng ph?i JSON h?p l?: " + responseText.substring(0, 100),
      );
    }
  } catch (error) {
    console.error("Error in gopBanEnhanced:", error);
    throw error;
  }
}

export async function chuyenBanEnhanced(maHoaDonBanCanChuyen, maBanChuyen) {
  try {
    const result = await callApi("sl_lv0013", "chuyenBan", {
      maHoaDonBanCanChuyen: maHoaDonBanCanChuyen,
      maHoaDonBanChuyen: "",
      maBanChuyen: maBanChuyen,
    });
    return result;
  } catch (error) {
    console.error("Error in chuyenBanEnhanced:", error);
    throw error;
  }
}

export async function tachBanEnhanced(maHoaDon) {
  try {
    console.log("tachBanEnhanced params:", { maHoaDon });

    const params = new URLSearchParams({
      class: "sl_lv0013",
      action: "tachBan",
      maHoaDon: maHoaDon,
    });

    const response = await fetch(
      `${GMAC_BASE_URL}/services.sof.vn/index_NChung.php?${params}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseText = await response.text();
    console.log("tachBanEnhanced response text:", responseText);

    if (responseText.includes("<br />") || responseText.includes("<b>")) {
      throw new Error(
        "Backend tr? v? l?i HTML: " + responseText.substring(0, 200),
      );
    }

    try {
      const result = JSON.parse(responseText);
      console.log("tachBanEnhanced result:", result);
      return result;
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      throw new Error(
        "Response kh�ng ph?i JSON h?p l?: " + responseText.substring(0, 100),
      );
    }
  } catch (error) {
    console.error("Error in tachBanEnhanced:", error);
    throw error;
  }
}

/**
 * @param {string} ngayBatDau
 * @param {string} ngayKetThuc
 * @param {string} plang
 * @param {array} vArrLang
 * @param {number} vOpt
 * @returns {Promise<Object>}
 */
export async function layBaoCaoBanHangChiTiet(


  ngayBatDau,
  ngayKetThuc,
  plang = "vi",
  vArrLang = [],
  vOpt = 0,
) {
  console.log('vào luồng bcct! ');

  return await callApi("BaoCaoBanHang", "layBaoCaoBanHangChiTiet", {
    ngayBatDau,
    ngayKetThuc,
    plang,
    vArrLang,
    vOpt,
  });
}

/**
 * @param {Object} params
 * @param {string} params.startDate
 * @param {string} params.endDate
 * @param {string} params.language
 * @returns {Promise<Object>}
 */
export async function xuatBaoCaoBanHang({
  startDate,
  endDate,
  language = "vi",
}) {
  return await layBaoCaoBanHangChiTiet(startDate, endDate, language);
}

/**
 * @param {number} month
 * @param {number} year
 * @returns {Promise<Object>}
 */
export async function layBaoCaoBanHangTheoThang(month, year) {
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(
    lastDay,
  ).padStart(2, "0")}`;

  return await layBaoCaoBanHangChiTiet(startDate, endDate);
}

/**
 * @returns {Promise<Object>}
 */
export async function layBaoCaoBanHangHomNay(a) {
  const today = new Date().toISOString().split("T")[0];
  return await layBaoCaoBanHangChiTiet(a, a);
  // return await layBaoCaoBanHangChiTiet(today, today);
}

/**
 * @returns {Promise<Object>}
 */
export async function layBaoCaoBanHangTuanNay() {
  const today = new Date();
  const firstDayOfWeek = new Date(
    today.setDate(today.getDate() - today.getDay() + 1),
  );
  const lastDayOfWeek = new Date(
    today.setDate(today.getDate() - today.getDay() + 7),
  );

  const startDate = firstDayOfWeek.toISOString().split("T")[0];
  const endDate = lastDayOfWeek.toISOString().split("T")[0];

  return await layBaoCaoBanHangChiTiet(startDate, endDate);
}

// ==================== CHART API ====================

/**
 * @param {Array} chartData
 * @returns {Promise<Object>}
 */
export async function taoChartDoanhThu(chartData) {
  try {
    // Lấy thông tin xác thực từ auth headers
    const authHeaders = await getAuthHeaders();

    const response = await axios.post(url_chart_api, chartData, {
      headers: {
        "Content-Type": "application/json",
        // Headers yêu cầu bởi API biểu đồ
        "X-User": authHeaders["X-USER-CODE"] || "admin",
        "X-Token": authHeaders["X-USER-TOKEN"] || "",
      },
    });

    if (response.data) {
      return {
        success: true,
        chartHtml: response.data,
        message: "Tạo biểu đồ thành công1111",
      };
    } else {
      return {
        success: false,
        chartHtml: null,
        message: "Không nhận được dữ liệu biểu đồ",
      };
    }
  } catch (error) {
    console.error("Error creating chart:", error);
    return {
      success: false,
      chartHtml: null,
      message: error.message || "Có lỗi xảy ra khi tạo biểu đồ",
    };
  }
}

// -------------------- USER MANAGEMENT & PERMISSIONS --------------------

/**
 * Lấy danh sách tất cả người dùng
 */
export async function getAllUsers() {
  return await callApi("Mb_Users", "getAll");
}

/**
 * Lấy thông tin người dùng theo ID
 */
export async function getUserById(userId) {
  return await callApi("Mb_Users", "getById", { userId });
}

/**
 * Thêm người dùng mới
 */
export async function addUser(userData) {
  return await callApi("Mb_Users", "add", userData);
}

/**
 * Cập nhật thông tin người dùng
 */
export async function updateUser(userData) {
  return await callApi("Mb_Users", "edit", userData);
}

/**
 * Xóa người dùng
 */
export async function deleteUser(userId) {
  return await callApi("Mb_Users", "delete", { userId });
}

/**
 * Khóa/Mở khóa người dùng
 */
export async function toggleUserStatus(userId, status) {
  return await callApi("Mb_Users", "toggleStatus", { userId, status });
}

/**
 * Đổi mật khẩu người dùng
 */
export async function changeUserPassword(userId, newPassword) {
  return await callApi("Mb_Users", "changePassword", { userId, newPassword });
}

/**
 * Lấy danh sách quyền của người dùng
 */
export async function getUserRights(userId) {
  return await callApi("Mb_UserRights", "getUserRights", { userId });
}

/**
 * Lấy chi tiết quyền
 */
export async function getRightDetails(rightId) {
  return await callApi("Mb_UserRights", "getRightDetails", { rightId });
}

/**
 * Thêm quyền cho người dùng
 */
export async function addUserRight(userId, rightId) {
  return await callApi("Mb_UserRights", "addRight", { userId, rightId });
}

/**
 * Cập nhật quyền của người dùng
 */
export async function updateUserRight(id, enabled) {
  return await callApi("Mb_UserRights", "updateRight", { id, enabled });
}

/**
 * Xóa quyền của người dùng
 */
export async function deleteUserRight(id) {
  return await callApi("Mb_UserRights", "deleteRight", { id });
}

/**
 * Cập nhật quyền chi tiết
 */
export async function updateDetailRight(id, enabled) {
  return await callApi("Mb_UserRights", "updateDetailRight", { id, enabled });
}

/**
 * Lấy danh sách tất cả các loại quyền
 */
export async function getAllPermissions() {
  return await callApi("Mb_Permissions", "getAll");
}

/**
 * L?y danh s�ch nh�m ngu?i d�ng cho dropdown
 */
export async function getUserGroups() {
  return await callApi("Mb_UserFormData", "getUserGroups");
}

/**
 * L?y danh s�ch nh�n vi�n cho dropdown
 */
export async function getEmployees() {
  return await callApi("Mb_UserFormData", "getEmployees");
}

/**
 * L?y danh s�ch chi nh�nh cho dropdown
 */
export async function getBranches() {
  return await callApi("Mb_UserFormData", "getBranches");
}

/**
 * L?y danh s�ch themes cho dropdown
 */
export async function getThemes() {
  return await callApi("Mb_UserFormData", "getThemes");
}

/**
 * L?y danh s�ch quy?n c� th? g�n cho ngu?i d�ng
 */
export async function getAvailableRights() {
  return await callApi("Mb_UserFormData", "getAvailableRights");
}

// -------------------- Sales Program Management --------------------

export async function listSalesPrograms(params = {}) {
  return await callApi("Mb_SalesPrograms", "list", params);
}

export async function getSalesProgram(programId) {
  return await callApi("Mb_SalesPrograms", "get", { programId });
}

export async function createSalesProgram(programData) {
  return await callApi("Mb_SalesPrograms", "create", programData);
}

export async function updateSalesProgram(programData) {
  return await callApi("Mb_SalesPrograms", "update", programData);
}

export async function deleteSalesProgram(programId) {
  return await callApi("Mb_SalesPrograms", "delete", { programId });
}

export async function toggleSalesProgramStatus(programId, active) {
  return await callApi("Mb_SalesPrograms", "toggleStatus", {
    programId,
    active: active ? 1 : 0,
  });
}

export async function listCustomerGroups() {
  return await callApi("Mb_SalesPrograms", "listCustomerGroups", {});
}

// -------------------- Loyalty / Customer Points --------------------

export async function listLoyaltyCustomers(params = {}) {
  return await callApi("Mb_Loyalty", "listCustomers", params);
}

export async function searchLoyaltyCustomers(keyword, limit = 20) {
  return await callApi("Mb_Loyalty", "searchCustomers", { keyword, limit });
}

export async function registerLoyaltyCustomer(customerData) {
  return await callApi("Mb_Loyalty", "registerCustomer", customerData);
}

export async function getLoyaltySummary(customerId) {
  return await callApi("Mb_Loyalty", "getCustomerSummary", { customerId });
}

export async function addLoyaltyPoints(payload) {
  return await callApi("Mb_Loyalty", "addPoints", payload);
}

export async function redeemLoyaltyPoints(payload) {
  return await callApi("Mb_Loyalty", "redeemPoints", payload);
}

export async function getLoyaltyHistory(customerId, params = {}) {
  return await callApi("Mb_Loyalty", "history", { customerId, ...params });
}


// -------------------- Hàm chung sử dụng cho CRUD --------------------

// export async function execCRUD(tab,func,data={}) {
//   return await callApi(tab, func, data);
// }
// -------------------- GHTK Shipping --------------------

/**
 * Tạo đơn GHTK với payload thô từ FE (không chỉnh sửa format BE).
 * @param {Object} payload - CreateGhtkOrderPayload
 * @param {Object} options - { endpoint?: string }
 */
export async function createGhtkOrder(payload = {}, options = {}) {
  const endpoint = (options.endpoint || ghtkEndpoint || "").trim();
  if (!endpoint) {
    throw new Error(
      "GHTK endpoint is not configured. Set REACT_APP_GHTK_ENDPOINT or ensure url_api is defined.",
    );
  }

  const headers = await getAuthHeaders();
  const res = await axios.post(endpoint, payload, {
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
  });
  return res.data;
}

// ==================== NHÂN VIÊN (từ QLNS) ====================
export async function lv_LoadNhanVien(lv001) {
  return lv001 ? await callApi('hr_lv0020', 'loadNhanVienId', { lv001 }) : await callApi('hr_lv0020', 'loadNhanVien');
}

export async function themNhanVien(nhanVienData) {
  const { ...data } = nhanVienData;
  return await callApi('hr_lv0020', 'themNhanVien', { ...data });
}

export async function loadNhanVien() {
  return await callApi('hr_lv0020', 'loadNhanVien');
}

export async function suaNhanVien(nhanVienData) {
  const { ...data } = nhanVienData;
  return await callApi('hr_lv0020', 'suaNhanVien', { ...data });
}

export async function xoaNhanVien(lv001) {
  return await callApi('hr_lv0020', 'xoaNhanVien', { lv001 });
}

export async function loadNhanVienChiTietKhac(func, employeeID) {
  return await callApi('nhanvien_chitiet_khac', func, { employeeID });
}

// ==================== Công Ty (từ QLNS) ====================
export async function loadCongTy() {
  return await callApi('hr_lv0001', 'loadCongTy');
}

export async function loadPhongBan() {
  return await callApi('hr_lv0002', 'loadPhongBan');
}

export async function themPhongBan(phongBanData) {
  const { lv001, lv002, lv003, lv004, lv005, lv006, lv007, lv008, lv009, lv010, lv011, lv099, lv100, lv101, lv102, lv103, lv198, lv199, lv200, lv300 } = phongBanData;
  return await callApi('hr_lv0002', 'themPhongBan', { lv001, lv002, lv003, lv004, lv005, lv006, lv007, lv008, lv009, lv010, lv011, lv099, lv100, lv101, lv102, lv103, lv198, lv199, lv200, lv300 });
}

export async function suaPhongBan(phongBanData) {
  const { lv001, lv002, lv003, lv004, lv005, lv006, lv007, lv008, lv009, lv010, lv011, lv099, lv100, lv101, lv102, lv103, lv198, lv199, lv200, lv300 } = phongBanData;
  return await callApi('hr_lv0002', 'suaPhongBan', { lv001, lv002, lv003, lv004, lv005, lv006, lv007, lv008, lv009, lv010, lv011, lv099, lv100, lv101, lv102, lv103, lv198, lv199, lv200, lv300 });
}

export async function xoaPhongBan(lv001) {
  return await callApi('hr_lv0002', 'xoaPhongBan', { lv001 });
}

export async function loadKPI() {
  return await callApi('hr_lv0020', 'loadKPI');
}

// ==================== Cấu hình chung hệ thống (từ QLNS) ====================
export async function loadCauHinhHeThong() {
  return await callApi('jo_lv0016', 'loadCauHinhHeThong');
}

export async function suaCauHinhHeThong(cauHinhHeThongData) {
  const { lv001, lv002, lv003, lv004, lv005, lv006, lv007, lv008, lv009, lv010, lv011, lv012, lv013, lv014, lv015, lv016, lv017, lv026, lv027, lv028, lv029, lv337, lv338, lv339, lv340, lv341, lv342, lv343, lv344, lv345, lv346, lv347, lv348, lv349, lv350, lv351, lv361, lv362, lv363, lv400 } = cauHinhHeThongData;
  return await callApi('jo_lv0016', 'suaCauHinhHeThong', { lv001, lv002, lv003, lv004, lv005, lv006, lv007, lv008, lv009, lv010, lv011, lv012, lv013, lv014, lv015, lv016, lv017, lv026, lv027, lv028, lv029, lv337, lv338, lv339, lv340, lv341, lv342, lv343, lv344, lv345, lv346, lv347, lv348, lv349, lv350, lv351, lv361, lv362, lv363, lv400 });
}

export async function loadBieuMauHopDong() {
  return await callApi('hr_lv0043', 'loadMau');
}

// ================== Thông tin vòng đánh giá (từ QLNS) =============
export async function loadVongDanhGia() {
  return await callApi('hr_lv0003', 'loadVongDanhGia');
}
export async function themVongDanhGia(vongDanhGiaData) {
  const { lv001, lv002, lv003, lv004 } = vongDanhGiaData;
  return await callApi('hr_lv0003', 'themVongDanhGia', { lv001, lv002, lv003, lv004 });
}
export async function suaVongDanhGia(vongDanhGiaData) {
  const { lv001, lv002, lv003, lv004 } = vongDanhGiaData;
  return await callApi('hr_lv0003', 'suaVongDanhGia', { lv001, lv002, lv003, lv004 });
}
export async function xoaVongDanhGia(lv001) {
  return await callApi('hr_lv0003', 'xoaVongDanhGia', { lv001 });
}

// ================== Kết quả đánh giá (từ QLNS) =============
export async function loadKetQuaDanhGia() {
  return await callApi('hr_lv0035', 'loadKetQuaDanhGia');
}
export async function themKetQuaDanhGia(KetQuaDanhGiaData) {
  const { lv001, lv002, lv003, lv004, lv005, lv006 } = KetQuaDanhGiaData;
  return await callApi('hr_lv0035', 'themKetQuaDanhGia', { lv001, lv002, lv003, lv004, lv005, lv006 });
}
export async function suaKetQuaDanhGia(KetQuaDanhGiaData) {
  return await callApi('hr_lv0035', 'suaKetQuaDanhGia', KetQuaDanhGiaData);
}
export async function xoaKetQuaDanhGia(lv001) {
  return await callApi('hr_lv0035', 'xoaKetQuaDanhGia', { lv001 });
}

//=================== Hàm CRUD generic cho DataView (từ QLNS) ================
export async function loadDataView(vclass, vname, where = '') {
  return await callApi(vclass, 'list', { name: vname, where });
}
export async function themDataView(vclass, vname, where = '', data = {}) {
  return await callApi(vclass, 'add', { name: vname, where, data });
}
export async function suaDataView(vclass, vname, where = '', data = {}) {
  return await callApi(vclass, 'edit', { name: vname, where, data });
}
export async function xoaDataView(vclass, vname, where = '') {
  return await callApi(vclass, 'delete', { name: vname, where });
}

// ==================== Báo cáo lương (từ QLNS) ====================
export async function loadBaoCaoLuong(params) {
  return await callApi('rp_lv0002', 'loadBaoCao', params);
}
export async function loadThangTinhLuong() {
  return await callApi('rp_lv0002', 'loadThangTinhLuong');
}
export async function loadKyLuong() {
  return await callApi('tc_lv0013', 'load');
}



