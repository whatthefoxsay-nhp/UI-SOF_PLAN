/**
 * VNPay Router Configuration
 * Thêm routes này vào file router chính của bạn
 */

import React from 'react';
import { Routes, Route } from 'react-router-dom';
import VNPayReturn from './pages/Payment/VNPayReturn';
import VNPaySuccess from './pages/Payment/VNPaySuccess';

// Thêm route này vào router config của bạn
const VNPayRoutes = () => (
  <>
    {/* Route xử lý kết quả thanh toán VNPay */}
    <Route path="/payment/vnpay-return" element={<VNPayReturn />} />
    <Route path="/payment/vnpay-success" element={<VNPaySuccess />} />
  </>
);

export default VNPayRoutes;

// ============================================
// EXAMPLE: Tích hợp vào App.js
// ============================================

/*
import VNPayReturn from './pages/Payment/VNPayReturn';

function App() {
  return (
    <Routes>
      {/* ... các routes khác ... *\/}
      
      {/* VNPay return route *\/}
      <Route path="/payment/vnpay-return" element={<VNPayReturn />} />
      
      {/* ... các routes khác ... *\/}
    </Routes>
  );
}
*/
