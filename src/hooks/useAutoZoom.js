import { useEffect } from 'react';

/**
 * Hook tự động co giãn giao diện tối ưu cho màn hình Desktop.
 * Chỉ thực hiện thu nhỏ (Scale Down) khi cửa sổ nhỏ hơn độ phân giải chuẩn.
 * Giữ nguyên tỷ lệ 100% (zoom = 1) khi ở kích thước mặc định/phóng to màn hình lớn.
 *
 * Dùng CSS transform: scale() thay vì document.body.style.zoom để tránh xung đột
 * với zoom native của Electron (Ctrl+/-/Cmd+/-), vốn gây sai kích thước header/sidebar fixed.
 *
 * @param {number} designWidth - Chiều rộng thiết kế chuẩn (mặc định 1920px)
 */
export const useAutoZoom = (designWidth = 1920) => {
  useEffect(() => {
    const root = document.getElementById('root');

    const handleResize = () => {
      const currentWidth = window.innerWidth;

      let scale = 1;

      // Chỉ kích hoạt co giãn (thu nhỏ) nếu chiều rộng hiện tại nhỏ hơn chiều rộng thiết kế chuẩn
      if (currentWidth < designWidth) {
        scale = currentWidth / designWidth;

        // Khống chế tỷ lệ zoom tối thiểu để giao diện không bị thu quá nhỏ khó đọc (mức tối thiểu 65%)
        scale = Math.max(0.65, scale);
      }

      // Ghi tỷ lệ khuyến nghị vào CSS variable để tham chiếu nếu cần
      document.documentElement.style.setProperty('--app-recommended-scale', scale);
      document.documentElement.dataset.appRecommendedScale = scale;
    };

    // Đăng ký sự kiện thay đổi kích thước
    window.addEventListener('resize', handleResize);

    // Khởi chạy ngay lần đầu tiên
    handleResize();

    // Dọn dẹp sự kiện khi component unmount
    return () => {
      window.removeEventListener('resize', handleResize);
      document.documentElement.style.removeProperty('--app-recommended-scale');
      delete document.documentElement.dataset.appRecommendedScale;
    };
  }, [designWidth]);
};

export default useAutoZoom;
