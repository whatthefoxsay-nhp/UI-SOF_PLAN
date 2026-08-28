/**
 * approvalEventBus.js
 * Event bus nhẹ để đồng bộ state giữa QuanLyDeNghiVatTu và DuyetDeNghiVatTu
 * mà không cần polling hay Redux.
 *
 * Events:
 *  - "proposed"     : NV vừa đề xuất phiếu → DuyetDNVT refresh tab QL
 *  - "ql_approved"  : QL vừa duyệt → DuyetDNVT refresh tab TL
 *  - "ql_rejected"  : QL trả lại  → reload tab QL
 *  - "tl_approved"  : TL vừa duyệt → DuyetDNVT refresh tab GĐ
 *  - "tl_rejected"  : TL trả lại
 *  - "gd_approved"  : GĐ vừa duyệt (hoàn tất)
 *  - "gd_rejected"  : GĐ trả lại
 */

const listeners = {};

const approvalEventBus = {
  /**
   * Đăng ký lắng nghe event
   * @param {string} event
   * @param {Function} callback
   * @returns {Function} unsubscribe function
   */
  subscribe(event, callback) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(callback);
    // Trả về hàm để unsubscribe dễ dàng trong useEffect cleanup
    return () => {
      listeners[event] = listeners[event].filter((cb) => cb !== callback);
    };
  },

  /**
   * Phát sự kiện
   * @param {string} event
   * @param {*} payload - data tùy chọn gửi kèm
   */
  publish(event, payload = null) {
    if (!listeners[event]) return;
    listeners[event].forEach((cb) => {
      try {
        cb(payload);
      } catch (e) {
        console.error(`[approvalEventBus] Error in listener for "${event}":`, e);
      }
    });
  },
};

export default approvalEventBus;
