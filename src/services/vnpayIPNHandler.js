/**
 * VNPay IPN (Instant Payment Notification) Handler
 * Xử lý webhook từ VNPay khi có giao dịch thành công
 * 
 * Đây là backend service cần chạy để nhận IPN từ VNPay
 * Trong môi trường Electron, có thể dùng Express server hoặc tích hợp vào proxy-server.js
 */

const express = require('express');
const crypto = require('crypto');
const qs = require('qs');

// Import VNPay config (cần chuyển sang CommonJS hoặc dùng import động)
const vnpayConfig = {
  vnp_TmnCode: 'HF0KUL29',
  vnp_HashSecret: 'DQQ45HXFYTQ3N90OM4QIQC8B1PNZUEVE',
};

/**
 * Tạo chữ ký HMAC SHA512
 */
const createHmacSHA512 = (secretKey, data) => {
  return crypto
    .createHmac('sha512', secretKey)
    .update(Buffer.from(data, 'utf-8'))
    .digest('hex');
};

/**
 * Sắp xếp object theo key A-Z
 */
const sortObject = (obj) => {
  const sorted = {};
  const keys = Object.keys(obj).sort();
  keys.forEach((key) => {
    sorted[key] = obj[key];
  });
  return sorted;
};

/**
 * Loại bỏ giá trị rỗng
 */
const sanitizeParams = (obj) => {
  const sanitized = {};
  Object.keys(obj).forEach((key) => {
    const value = obj[key];
    if (value !== null && value !== undefined && value !== '') {
      sanitized[key] = value;
    }
  });
  return sanitized;
};

/**
 * Tạo query string theo chuẩn VNPay
 * Sử dụng RFC1738 để space = + (tương thích VNPay PHP)
 */
const buildQueryString = (obj) =>
  qs.stringify(obj, {
    encode: true,
    format: 'RFC1738', // ✅ Space = + (tương thích VNPay PHP)
    encodeValuesOnly: true,
  });

/**
 * Xác thực IPN từ VNPay
 */
const verifyVNPayIPN = (queryParams) => {
  try {
    const vnp_SecureHash = queryParams.vnp_SecureHash;
    
    // Loại bỏ các tham số không cần thiết
    const paramsToVerify = { ...queryParams };
    delete paramsToVerify.vnp_SecureHash;
    delete paramsToVerify.vnp_SecureHashType;

    // Sắp xếp theo thứ tự A-Z
  const sortedParams = sortObject(paramsToVerify);
  const sanitizedParams = sanitizeParams(sortedParams);

  // Tạo chuỗi dữ liệu
  const signData = buildQueryString(sanitizedParams);

    // Tạo chữ ký để so sánh
    const secureHash = createHmacSHA512(vnpayConfig.vnp_HashSecret, signData);

    // So sánh chữ ký
    const isValid = secureHash === vnp_SecureHash;

    return {
      isValid,
      signData,
      secureHash,
      receivedHash: vnp_SecureHash,
    };
  } catch (error) {
    console.error('Error verifying VNPay IPN:', error);
    return {
      isValid: false,
      error: error.message,
    };
  }
};

/**
 * Xử lý IPN từ VNPay
 */
const handleVNPayIPN = async (req, res) => {
  try {
    const queryParams = req.query;

    console.log('=== VNPay IPN Received ===');
    console.log('Query Params:', JSON.stringify(queryParams, null, 2));

    // Bước 1: Xác thực chữ ký
    const verification = verifyVNPayIPN(queryParams);

    if (!verification.isValid) {
      console.error('IPN verification failed:', verification);
      return res.status(200).json({ RspCode: '97', Message: 'Invalid signature' });
    }

    console.log('IPN signature verified successfully');

    // Bước 2: Lấy thông tin giao dịch
    const {
      vnp_TxnRef,
      vnp_Amount,
      vnp_OrderInfo,
      vnp_ResponseCode,
      vnp_TransactionNo,
      vnp_BankCode,
      vnp_BankTranNo,
      vnp_CardType,
      vnp_PayDate,
      vnp_TransactionStatus,
    } = queryParams;

    const amount = parseInt(vnp_Amount) / 100;
    const isSuccess = vnp_ResponseCode === '00' && vnp_TransactionStatus === '00';

    console.log('Transaction Info:', {
      txnRef: vnp_TxnRef,
      amount,
      isSuccess,
      responseCode: vnp_ResponseCode,
      transactionStatus: vnp_TransactionStatus,
    });

    // Bước 3: Kiểm tra TxnRef đã tồn tại trong database chưa
    // TODO: Implement database check
    // const existingTransaction = await checkTransactionExists(vnp_TxnRef);
    // if (existingTransaction) {
    //   console.log('Transaction already processed');
    //   return res.status(200).json({ RspCode: '02', Message: 'Order already confirmed' });
    // }

    // Bước 4: Kiểm tra số tiền có khớp với database không
    // TODO: Implement amount verification
    // const expectedAmount = await getExpectedAmount(vnp_TxnRef);
    // if (amount !== expectedAmount) {
    //   console.error('Amount mismatch:', { expected: expectedAmount, received: amount });
    //   return res.status(200).json({ RspCode: '04', Message: 'Invalid amount' });
    // }

    // Bước 5: Kiểm tra trạng thái hóa đơn
    // TODO: Implement invoice status check
    // const invoice = await getInvoiceByTxnRef(vnp_TxnRef);
    // if (!invoice) {
    //   console.error('Invoice not found:', vnp_TxnRef);
    //   return res.status(200).json({ RspCode: '01', Message: 'Order not found' });
    // }
    // if (invoice.status === 'paid') {
    //   console.log('Invoice already paid');
    //   return res.status(200).json({ RspCode: '02', Message: 'Order already confirmed' });
    // }

    // Bước 6: Cập nhật trạng thái thanh toán nếu thành công
    if (isSuccess) {
      const paymentData = {
        txnRef: vnp_TxnRef,
        amount,
        responseCode: vnp_ResponseCode,
        transactionNo: vnp_TransactionNo,
        bankCode: vnp_BankCode,
        bankTranNo: vnp_BankTranNo,
        cardType: vnp_CardType,
        payDate: vnp_PayDate,
        transactionStatus: vnp_TransactionStatus,
        orderInfo: vnp_OrderInfo,
        paymentMethod: 'VNPay',
        timestamp: new Date().toISOString(),
      };

      // TODO: Cập nhật database
      // await updateInvoicePaymentStatus(vnp_TxnRef, paymentData);
      // await logPaymentTransaction(paymentData);

      console.log('Payment confirmed successfully:', paymentData);

      // Trả về mã thành công cho VNPay
      return res.status(200).json({ RspCode: '00', Message: 'Success' });
    } else {
      // Giao dịch thất bại
      console.log('Transaction failed:', vnp_ResponseCode);

      // TODO: Log giao dịch thất bại
      // await logFailedTransaction(vnp_TxnRef, queryParams);

      return res.status(200).json({ RspCode: '00', Message: 'Success' });
    }
  } catch (error) {
    console.error('Error handling VNPay IPN:', error);
    return res.status(200).json({ RspCode: '99', Message: 'Unknown error' });
  }
};

/**
 * API Route để check trạng thái thanh toán (cho QR Modal)
 */
const checkPaymentStatus = async (req, res) => {
  try {
    const { txnRef } = req.params;

    console.log('Checking payment status for:', txnRef);

    // TODO: Query database để lấy trạng thái
    // const payment = await getPaymentByTxnRef(txnRef);
    
    // if (payment && payment.status === 'success') {
    //   return res.json({
    //     success: true,
    //     status: 'success',
    //     payment,
    //   });
    // }

    // Tạm thời trả về pending
    return res.json({
      success: true,
      status: 'pending',
      message: 'Payment is being processed',
    });
  } catch (error) {
    console.error('Error checking payment status:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Setup Express routes
 */
const setupVNPayRoutes = (app) => {
  // IPN endpoint
  app.get('/api/vnpay/ipn', handleVNPayIPN);

  // Check payment status endpoint
  app.get('/api/vnpay/check-status/:txnRef', checkPaymentStatus);

  console.log('VNPay routes registered:');
  console.log('  - GET /api/vnpay/ipn');
  console.log('  - GET /api/vnpay/check-status/:txnRef');
};

// Nếu chạy standalone
if (require.main === module) {
  const app = express();
  const PORT = process.env.PORT || 3001;

  setupVNPayRoutes(app);

  app.listen(PORT, () => {
    console.log(`VNPay IPN server running on port ${PORT}`);
  });
}

module.exports = {
  handleVNPayIPN,
  checkPaymentStatus,
  setupVNPayRoutes,
  verifyVNPayIPN,
};
