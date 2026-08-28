// Utility functions cho ứng dụng PMBH POS

import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
dayjs.extend(customParseFormat);

// Format tiền tệ
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
};

// Format số
export const formatNumber = (number) => {
  return new Intl.NumberFormat("vi-VN").format(number);
};

// Format ngày tháng
export const formatDate = (date, format = "dd/MM/yyyy") => {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const seconds = String(d.getSeconds()).padStart(2, "0");

  switch (format) {
    case "dd/MM/yyyy":
      return `${day}/${month}/${year}`;
    case "dd/MM/yyyy HH:mm":
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    case "dd/MM/yyyy HH:mm:ss":
      return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
    case "HH:mm":
      return `${hours}:${minutes}`;
    case "HH:mm:ss":
      return `${hours}:${minutes}:${seconds}`;
    default:
      return `${day}/${month}/${year}`;
  }
};

// Tạo ID duy nhất
export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Validate email
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate số điện thoại Việt Nam
export const isValidPhoneNumber = (phone) => {
  const phoneRegex = /^(\+84|84|0[3|5|7|8|9])[0-9]{8}$/;
  return phoneRegex.test(phone);
};

// Chuyển đổi chuỗi thành slug
export const slugify = (text) => {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .replace(/([^0-9a-z-\s])/g, "")
    .replace(/(\s+)/g, "-")
    .replace(/^-+/g, "")
    .replace(/-+$/g, "");
};

// Tính tổng tiền
export const calculateTotal = (items) => {
  return items.reduce((total, item) => {
    return total + item.gia * item.soLuong;
  }, 0);
};

// Áp dụng giảm giá
export const applyDiscount = (total, discountPercent) => {
  return total - (total * discountPercent) / 100;
};

// Lưu vào localStorage
export const saveToLocalStorage = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error("Lỗi khi lưu vào localStorage:", error);
    return false;
  }
};

// Đọc từ localStorage
export const getFromLocalStorage = (key, defaultValue = null) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error("Lỗi khi đọc từ localStorage:", error);
    return defaultValue;
  }
};

// Xóa khỏi localStorage
export const removeFromLocalStorage = (key) => {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error("Lỗi khi xóa từ localStorage:", error);
    return false;
  }
};

// Debounce function
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Throttle function
export const throttle = (func, limit) => {
  let inThrottle;
  return function () {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

// Copy to clipboard
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error("Lỗi khi copy:", error);
    return false;
  }
};

// Download file
export const downloadFile = (data, filename, type = "application/json") => {
  const blob = new Blob([data], { type });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};

// Validate required fields
export const validateRequired = (value, fieldName) => {
  if (!value || (typeof value === "string" && value.trim() === "")) {
    return `${fieldName} là bắt buộc`;
  }
  return null;
};

// Get time greeting
export const getTimeGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Chào buổi sáng";
  if (hour < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
};

// Calculate age
export const calculateAge = (birthDate) => {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age;
};

// Sort array by field
export const sortByField = (array, field, ascending = true) => {
  return [...array].sort((a, b) => {
    const aVal = a[field];
    const bVal = b[field];

    if (aVal < bVal) return ascending ? -1 : 1;
    if (aVal > bVal) return ascending ? 1 : -1;
    return 0;
  });
};

// Group array by field
export const groupByField = (array, field) => {
  return array.reduce((groups, item) => {
    const key = item[field];
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
    return groups;
  }, {});
};

export const toMySQLDate = (input, type = "date") => {
  if (!input) {
    return "";
  }

  const date = dayjs(
    input,
    [
      "HH:mm:ss DD/MM/YYYY",
      "HH:mm DD/MM/YYYY",
      "DD/MM/YYYY HH:mm:ss",
      "DD/MM/YYYY HH:mm",
      "DD/MM/YYYY",

      "DD-MM-YYYY HH:mm:ss",
      "DD-MM-YYYY HH:mm",
      "DD-MM-YYYY",

      "YYYY-MM-DD HH:mm:ss",
      "YYYY-MM-DD HH:mm",
      "YYYY-MM-DD",

      "YYYY-MM-DDTHH:mm:ss",
      "YYYY-MM-DDTHH:mm",
      "YYYY-MM-DDTHH:mm:ss.SSS",
      "YYYY-MM-DDTHH:mm:ssZ",
      "YYYY-MM-DDTHH:mm:ss.SSSZ",

      "HH:mm:ss",
      "HH:mm",
    ],
    true
  );

  if (!date.isValid()) {
    return "";
  }

  switch (type) {
    case "time":
      return date.format("HH:mm:ss");
    case "datetime":
      return date.format("YYYY-MM-DD HH:mm:ss");
    case "date":
    default:
      return date.format("YYYY-MM-DD");
  }
};
