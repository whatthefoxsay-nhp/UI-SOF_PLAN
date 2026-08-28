import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  loadBan,
  loadKhuVuc,
  getAllSanPham,
  getLoaiSanPham,
  //loadDsHoaDon,
  getChiTietHoaDonTheoMaHD,
  lv_LoadDataAPI
} from '../services/apiServices';

// Query keys
export const QUERY_KEYS = {
  TABLES: ['tables'],
  AREAS: ['areas'],
  PRODUCTS: ['products'],
  PRODUCT_CATEGORIES: ['productCategories'],
  INVOICES: ['invoices'],
  INVOICE_DETAILS: (invoiceId) => ['invoiceDetails', invoiceId],
};

// Tables
export function useTables() {
  return useQuery({
    queryKey: QUERY_KEYS.TABLES,
    queryFn: loadBan,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Areas
export function useAreas() {
  return useQuery({
    queryKey: QUERY_KEYS.AREAS,
    queryFn: loadKhuVuc,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Products - lazy loaded
export function useProducts() {
  return useQuery({
    queryKey: QUERY_KEYS.PRODUCTS,
    queryFn: getAllSanPham,
    staleTime: 5 * 60 * 1000,
    enabled: false, // Only load when explicitly enabled
  });
}

// Product categories
export function useProductCategories() {
  return useQuery({
    queryKey: QUERY_KEYS.PRODUCT_CATEGORIES,
    queryFn: getLoaiSanPham,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Invoices
// export function useInvoices() {
//   return useQuery({
//     queryKey: QUERY_KEYS.INVOICES,
//     queryFn: loadDsHoaDon,
//     staleTime: 1 * 60 * 1000, // 1 minute
//   });
// }

// Invoice details
export function useInvoiceDetails(invoiceId) {
  return useQuery({
    queryKey: QUERY_KEYS.INVOICE_DETAILS(invoiceId),
    queryFn: () => getChiTietHoaDonTheoMaHD(invoiceId),
    enabled: !!invoiceId,
    staleTime: 2 * 60 * 1000,
  });
}

// Mutations for updating data
export function useInvalidateTables() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TABLES });
  };
}

export function useInvalidateMasterData() {
  const queryClient = useQueryClient();

  return (dataName) => {
    if (dataName) {
      queryClient.invalidateQueries({ queryKey: ["masterData", dataName] });
    } else {
      queryClient.invalidateQueries({ queryKey: ["masterData"] });
    }
  };
}

export const useMasterData = (tableName, dataName, options = {}) => {
  return useQuery({
    // Query Key: Là định danh duy nhất cho dữ liệu này trong Cache.
    // Nếu key giống nhau, React Query sẽ trả về data từ cache ngay lập tức.
    queryKey: ["masterData", dataName],

    // Hàm gọi API thực tế
    queryFn: async () => {
      const response = await lv_LoadDataAPI(tableName, "loadDataView");
      let list = [];
      if (Array.isArray(response)) {
        list = response;
      } else if (response && Array.isArray(response.data)) {
        list = response.data;
      } else if (response && Array.isArray(response.rows)) {
        list = response.rows;
      }
      // Map dữ liệu để thêm key (nếu cần cho Antd Table/Select)
      return list?.map((item) => ({ ...item, key: item.lv001 })) || [];
    },

    // QUAN TRỌNG: Cấu hình Cache
    // Mặc định là Infinity: Dữ liệu coi là luôn mới
    staleTime: Infinity,

    // Giữ trong cache 24 giờ kể cả khi không dùng (garbage collection time)
    gcTime: 1000 * 60 * 60 * 24,

    ...options,
  });
};