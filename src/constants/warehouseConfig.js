// Cấu hình kho mặc định cho hệ thống 1 cửa hàng - 1 kho
// Đây là cấu hình để chuyển từ hệ thống đa kho sang đơn kho

// Không còn hardcode mã kho mặc định - người dùng phải chọn kho trong Cài đặt
// Nếu không có kho trong database, hệ thống sẽ yêu cầu tạo kho trước

// Storage key để lưu cài đặt kho
export const WAREHOUSE_STORAGE_KEY = "pmbh_default_warehouse";

// Hàm kiểm tra xem đã có kho mặc định được cấu hình hay chưa
export const isWarehouseConfigured = () => {
  try {
    const savedWarehouse = localStorage.getItem(WAREHOUSE_STORAGE_KEY);
    if (savedWarehouse) {
      const parsed = JSON.parse(savedWarehouse);
      return !!(parsed && parsed.maKho && parsed.maKho.trim() !== "");
    }
  } catch (error) {
    console.warn("Lỗi khi kiểm tra cấu hình kho:", error);
  }
  return false;
};

// Hàm lấy mã kho mặc định - trả về null nếu chưa cấu hình
export const getDefaultWarehouseCode = () => {
  try {
    const savedWarehouse = localStorage.getItem(WAREHOUSE_STORAGE_KEY);
    if (savedWarehouse) {
      const parsed = JSON.parse(savedWarehouse);
      if (parsed && parsed.maKho && parsed.maKho.trim() !== "") {
        return parsed.maKho;
      }
    }
  } catch (error) {
    console.warn("Lỗi khi lấy mã kho mặc định:", error);
  }
  return null; // Trả về null thay vì hardcoded value
};

// Hàm lấy thông tin kho mặc định - trả về null nếu chưa cấu hình
export const getDefaultWarehouse = () => {
  try {
    const savedWarehouse = localStorage.getItem(WAREHOUSE_STORAGE_KEY);
    if (savedWarehouse) {
      const parsed = JSON.parse(savedWarehouse);
      if (parsed && parsed.maKho && parsed.maKho.trim() !== "") {
        return parsed;
      }
    }
  } catch (error) {
    console.warn("Lỗi khi lấy thông tin kho mặc định:", error);
  }
  return null; // Trả về null thay vì hardcoded object
};

// Hàm lưu kho mặc định
export const setDefaultWarehouse = (warehouse) => {
  try {
    if (warehouse && warehouse.maKho) {
      localStorage.setItem(WAREHOUSE_STORAGE_KEY, JSON.stringify(warehouse));
      return true;
    } else {
      // Nếu warehouse không hợp lệ, xóa khỏi localStorage
      localStorage.removeItem(WAREHOUSE_STORAGE_KEY);
      return false;
    }
  } catch (error) {
    console.warn("Lỗi khi lưu kho mặc định:", error);
    return false;
  }
};

// Hàm xóa cấu hình kho mặc định
export const clearDefaultWarehouse = () => {
  try {
    localStorage.removeItem(WAREHOUSE_STORAGE_KEY);
    return true;
  } catch (error) {
    console.warn("Lỗi khi xóa cấu hình kho:", error);
    return false;
  }
};

// Cài đặt check tồn kho khi bán hàng
export const INVENTORY_CHECK_STORAGE_KEY = "pmbh_inventory_check_enabled";

// Hàm kiểm tra cài đặt check tồn kho
export const isInventoryCheckEnabled = () => {
  try {
    const savedSetting = localStorage.getItem(INVENTORY_CHECK_STORAGE_KEY);
    return savedSetting === "true";
  } catch (error) {
    console.warn("Lỗi khi lấy cài đặt check tồn kho:", error);
    return false; // Mặc định không check tồn kho
  }
};

// Hàm bật/tắt check tồn kho
export const setInventoryCheckEnabled = (enabled) => {
  try {
    localStorage.setItem(
      INVENTORY_CHECK_STORAGE_KEY,
      enabled ? "true" : "false",
    );
    return true;
  } catch (error) {
    console.warn("Lỗi khi lưu cài đặt check tồn kho:", error);
    return false;
  }
};

// Thông báo yêu cầu chọn kho
export const WAREHOUSE_NOT_CONFIGURED_MESSAGE =
  "Vui lòng chọn kho mặc định trong phần Cài đặt > Cài đặt kho & tồn kho";

export default {
  WAREHOUSE_STORAGE_KEY,
  INVENTORY_CHECK_STORAGE_KEY,
  WAREHOUSE_NOT_CONFIGURED_MESSAGE,
  isWarehouseConfigured,
  getDefaultWarehouseCode,
  getDefaultWarehouse,
  setDefaultWarehouse,
  clearDefaultWarehouse,
  isInventoryCheckEnabled,
  setInventoryCheckEnabled,
};
