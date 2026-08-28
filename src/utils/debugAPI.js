// Debug utility to test API functions
import { 
  thanhToanHoaDonChiTiet,
  thanhToanHoaDonBanhang,
  capNhatTrangThaiDonHang,
  xacNhanDonHang,
  layTrangThaiDonHangRealtime,
  inHoaDonThanhToan
} from '../services/apiServices';

export const debugAPIFunctions = () => {
  // Silent console
  return {
    thanhToanHoaDonChiTiet: typeof thanhToanHoaDonChiTiet === 'function',
    capNhatTrangThaiDonHang: typeof capNhatTrangThaiDonHang === 'function',
    xacNhanDonHang: typeof xacNhanDonHang === 'function',
    layTrangThaiDonHangRealtime: typeof layTrangThaiDonHangRealtime === 'function',
    inHoaDonThanhToan: typeof inHoaDonThanhToan === 'function'
  };
};

export const testPaymentAPI = async (testData) => {
  try {
    // Silent console
    
    // Test basic payment first
    const basicResult = await thanhToanHoaDonBanhang({
      maHd: testData.maHd,
      tongTien: testData.tongTien,
      tienKhachDua: testData.tienKhachDua,
      tienThua: testData.tienThua
    });
    
    // Silent console
    return basicResult;
    
  } catch (error) {
    // Silent console
    throw error;
  }
};