import React, { useState, useEffect } from 'react';
import { Modal, Button, Typography, Spin, message, Space, Divider, Card, Alert } from 'antd';
import { QrCode, CheckCircle, XCircle, Clock, Copy, RefreshCw, ExternalLink } from 'lucide-react';
import { createVNPayPaymentUrl, logVNPayTransaction } from '../../services/vnpayService';
import './VNPayQRModal.css';

const { Text, Title } = Typography;

/**
 * VNPay QR Code Payment Modal
 * Hiển thị mã QR thanh toán VNPay và theo dõi trạng thái giao dịch
 */
const VNPayQRModal = ({
  visible,
  onCancel,
  onSuccess,
  invoice,
  amount,
  description,
}) => {
  const [paymentData, setPaymentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState('pending'); // pending, checking, success, failed
  const [countdown, setCountdown] = useState(900); // 15 phút = 900 giây
  const [checking, setChecking] = useState(false);
  const [hasOpenedGateway, setHasOpenedGateway] = useState(false);

  const launchVNPayWindow = (url) => {
    if (!url) return false;
    try {
      const openedWindow = window.open(url, '_blank');
      if (!openedWindow) {
        message.warning('Trình duyệt đã chặn cửa sổ mới. Vui lòng nhấn "Mở trang VNPay".');
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error opening VNPay window:', error);
      message.error('Không thể mở trang VNPay. Vui lòng thử lại.');
      return false;
    }
  };

  // Tạo URL thanh toán khi modal mở
  useEffect(() => {
    if (visible && invoice && amount) {
      generatePaymentQR();
    }
  }, [visible, invoice, amount]);

  useEffect(() => {
    if (!visible) {
      setHasOpenedGateway(false);
      setPaymentData(null);
      setPaymentStatus('pending');
      setCountdown(900);
    }
  }, [visible]);

  useEffect(() => {
    if (visible && paymentData?.paymentUrl && !hasOpenedGateway) {
      const opened = launchVNPayWindow(paymentData.paymentUrl);
      if (opened) {
        setHasOpenedGateway(true);
      }
    }
  }, [visible, paymentData, hasOpenedGateway]);

  // Countdown timer
  useEffect(() => {
    if (!visible || paymentStatus !== 'pending') return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          setPaymentStatus('failed');
          message.error('Hết thời gian thanh toán');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [visible, paymentStatus]);

  // Auto check payment status mỗi 5 giây
  useEffect(() => {
    if (!visible || paymentStatus !== 'pending') return;

    const checkInterval = setInterval(() => {
      checkPaymentStatus();
    }, 5000); // Check mỗi 5 giây

    return () => clearInterval(checkInterval);
  }, [visible, paymentStatus, paymentData]);

  /**
   * Tạo mã QR thanh toán
   */
  const generatePaymentQR = async () => {
    try {
      setLoading(true);

      const invoiceData = {
        maHd: invoice.maHd || invoice.invoice_number,
        tongTien: amount,
        moTa: description || `Thanh toán hóa đơn ${invoice.maHd || invoice.invoice_number}`,
      };

      const result = createVNPayPaymentUrl(invoiceData, true); // true = hiển thị QR trực tiếp

      if (result.success) {
        setPaymentData(result);
        setPaymentStatus('pending');
        setCountdown(900);

        // Log giao dịch
        logVNPayTransaction({
          action: 'CREATE_PAYMENT',
          txnRef: result.txnRef,
          amount: result.amount,
          invoiceCode: invoiceData.maHd,
          paymentUrl: result.paymentUrl,
        });

  message.success('Đã tạo yêu cầu thanh toán VNPay');
      } else {
        message.error('Không thể tạo mã QR: ' + result.error);
        setPaymentStatus('failed');
      }
    } catch (error) {
      console.error('Error generating QR:', error);
      message.error('Lỗi tạo mã QR thanh toán');
      setPaymentStatus('failed');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Kiểm tra trạng thái thanh toán
   * TODO: Cần implement API endpoint để check từ database
   */
  const checkPaymentStatus = async () => {
    if (!paymentData || checking) return;

    try {
      setChecking(true);

      // TODO: Gọi API để kiểm tra trạng thái thanh toán từ database
      // const response = await fetch(`/api/vnpay/check-status/${paymentData.txnRef}`);
      // const result = await response.json();
      
      // Tạm thời log để testing
      console.log('Checking payment status for:', paymentData.txnRef);

      // if (result.status === 'success') {
      //   handlePaymentSuccess(result);
      // }
    } catch (error) {
      console.error('Error checking payment status:', error);
    } finally {
      setChecking(false);
    }
  };

  /**
   * Xử lý khi thanh toán thành công
   */
  const handlePaymentSuccess = (paymentResult) => {
    setPaymentStatus('success');
    
    // Log giao dịch thành công
    logVNPayTransaction({
      action: 'PAYMENT_SUCCESS',
      txnRef: paymentData.txnRef,
      amount: paymentData.amount,
      ...paymentResult,
    });

    message.success('Thanh toán thành công!');

    // Gọi callback
    setTimeout(() => {
      onSuccess({
        txnRef: paymentData.txnRef,
        amount: paymentData.amount,
        paymentMethod: 'VNPay',
        ...paymentResult,
      });
    }, 1500);
  };

  /**
   * Copy payment URL
   */
  const handleCopyUrl = () => {
    if (paymentData?.paymentUrl) {
      navigator.clipboard.writeText(paymentData.paymentUrl);
      message.success('Đã copy link thanh toán');
    }
  };

  /**
   * Mở URL thanh toán trong trình duyệt
   */
  const handleOpenInBrowser = () => {
    if (!paymentData?.paymentUrl) return;
    const opened = launchVNPayWindow(paymentData.paymentUrl);
    if (opened) {
      setHasOpenedGateway(true);
      message.success('Đã mở trang thanh toán VNPay');
    }
  };

  /**
   * Format thời gian đếm ngược
   */
  const formatCountdown = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  /**
   * Render footer buttons
   */
  const renderFooter = () => {
    if (paymentStatus === 'success') {
      return [
        <Button key="close" type="primary" onClick={onCancel}>
          Đóng
        </Button>,
      ];
    }

    if (paymentStatus === 'failed') {
      return [
        <Button key="retry" type="primary" onClick={generatePaymentQR}>
          <RefreshCw size={16} /> Thử lại
        </Button>,
        <Button key="cancel" onClick={onCancel}>
          Hủy
        </Button>,
      ];
    }

    return [
      <Button 
        key="check" 
        type="primary" 
        loading={checking}
        onClick={checkPaymentStatus}
      >
        <RefreshCw size={16} /> Kiểm tra thanh toán
      </Button>,
      <Button key="cancel" onClick={onCancel}>
        Hủy
      </Button>,
    ];
  };

  return (
    <Modal
      title={
        <Space>
          <QrCode size={24} />
          <span>Thanh toán VNPay QR</span>
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      footer={renderFooter()}
      width={500}
      centered
      className="vnpay-qr-modal"
    >
      {loading ? (
        <div className="loading-container">
          <Spin size="large" tip="Đang tạo mã QR thanh toán..." />
        </div>
      ) : (
        <div className="vnpay-qr-content">
          {/* Thông tin giao dịch */}
          <Card className="transaction-info">
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              <div className="info-row">
                <Text type="secondary">Mã hóa đơn:</Text>
                <Text strong>{invoice?.maHd || invoice?.invoice_number}</Text>
              </div>
              <div className="info-row">
                <Text type="secondary">Số tiền:</Text>
                <Text strong className="amount-text">
                  {amount?.toLocaleString('vi-VN')} VNĐ
                </Text>
              </div>
              <div className="info-row">
                <Text type="secondary">Mã giao dịch:</Text>
                <Text code>{paymentData?.txnRef}</Text>
              </div>
            </Space>
          </Card>

          <Divider />

          {/* VNPay Gateway Launch */}
          {paymentStatus === 'pending' && paymentData?.paymentUrl && (
            <div className="gateway-launcher">
              <Space direction="vertical" size="middle" style={{ width: '100%', alignItems: 'center' }}>
                <Button 
                  type="primary"
                  icon={<ExternalLink size={18} />}
                  size="large"
                  onClick={handleOpenInBrowser}
                >
                  Mở trang thanh toán VNPay
                </Button>

                <Alert
                  type="info"
                  showIcon
                  message="Quét QR trên trang VNPay"
                  description="Trang thanh toán VNPay sẽ hiển thị mã QR chuẩn EMV. Vui lòng quét QR trên trang vừa mở để hoàn tất giao dịch."
                />

                <div className="countdown-timer">
                  <Clock size={16} />
                  <Text>Còn lại: {formatCountdown(countdown)}</Text>
                </div>

                <Space>
                  <Button 
                    icon={<Copy size={16} />} 
                    onClick={handleCopyUrl}
                    size="small"
                  >
                    Copy link
                  </Button>
                  <Button 
                    onClick={handleOpenInBrowser}
                    size="small"
                  >
                    Mở lại trang
                  </Button>
                </Space>
              </Space>
            </div>
          )}

          {/* Trạng thái thành công */}
          {paymentStatus === 'success' && (
            <div className="status-container success">
              <CheckCircle size={64} color="#52c41a" />
              <Title level={4} style={{ color: '#52c41a', marginTop: 16 }}>
                Thanh toán thành công!
              </Title>
              <Text type="secondary">Giao dịch đã được xác nhận</Text>
            </div>
          )}

          {/* Trạng thái thất bại */}
          {paymentStatus === 'failed' && (
            <div className="status-container failed">
              <XCircle size={64} color="#ff4d4f" />
              <Title level={4} style={{ color: '#ff4d4f', marginTop: 16 }}>
                Thanh toán thất bại
              </Title>
              <Text type="secondary">Vui lòng thử lại</Text>
            </div>
          )}

          {/* Lưu ý quan trọng */}
          <Card 
            className="notice-card" 
            size="small"
            style={{ marginTop: 16, background: '#fff7e6', border: '1px solid #ffd591' }}
          >
            <Space direction="vertical" size="small">
              <Text strong style={{ color: '#fa8c16' }}>⚠️ Lưu ý quan trọng:</Text>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                <li>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Chỉ quét mã QR một lần duy nhất
                  </Text>
                </li>
                <li>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Không đóng cửa sổ này cho đến khi thanh toán hoàn tất
                  </Text>
                </li>
                <li>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Hệ thống sẽ tự động kiểm tra trạng thái thanh toán
                  </Text>
                </li>
              </ul>
            </Space>
          </Card>
        </div>
      )}
    </Modal>
  );
};

export default VNPayQRModal;
