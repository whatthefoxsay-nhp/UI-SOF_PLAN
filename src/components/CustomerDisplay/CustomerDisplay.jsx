import React, { useState, useEffect } from "react";
import { Typography, Divider, Empty } from "antd";
import { ShoppingCart, Coffee } from "lucide-react";
import "./CustomerDisplay.css";

const { Title, Text } = Typography;

const CustomerDisplay = () => {
  const [orderData, setOrderData] = useState({
    items: [],
    tableName: null,
    subtotal: 0,
    discount: 0,
    total: 0,
  });

  useEffect(() => {
    // Listen for order updates from main window
    if (window.electronAPI && window.electronAPI.onCustomerDisplayUpdate) {
      window.electronAPI.onCustomerDisplayUpdate((data) => {
        setOrderData(data);
      });
    }

    // Request initial data
    if (window.electronAPI && window.electronAPI.requestCustomerDisplayData) {
      window.electronAPI.requestCustomerDisplayData();
    }
  }, []);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  return (
    <div className="customer-display-container">
      {/* Header */}
      <div className="customer-display-header">
        <div className="header-logo">
          <Coffee size={48} />
        </div>
        <Title level={1} className="header-title">
          HỆ THỐNG BÁN HÀNG
        </Title>
        <Text className="header-subtitle">Cảm ơn quý khách đã ghé thăm</Text>
      </div>

      {/* Main Content */}
      <div className="customer-display-content">
        {orderData.tableName && (
          <div className="table-info-banner">
            <Text className="table-info-label">Bàn:</Text>
            <Text className="table-info-value">{orderData.tableName}</Text>
          </div>
        )}

        {/* Order Items */}
        <div className="order-section">
          <div className="section-header">
            <ShoppingCart size={24} />
            <Title level={3} className="section-title">
              Đơn hàng của bạn
            </Title>
          </div>

          {orderData.items.length === 0 ? (
            <Empty
              className="empty-order"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <span className="empty-text">Chưa có món nào được chọn</span>
              }
            />
          ) : (
            <div className="items-list">
              {orderData.items.map((item, index) => (
                <div key={item.cartId || index} className="order-item-card">
                  <div className="item-main">
                    <div className="item-name-section">
                      <Text className="item-name">
                        {item.ten || item.tenSp}
                      </Text>
                      <Text className="item-quantity">
                        x{item.soLuong || item.sl || 1}
                      </Text>
                    </div>
                    <Text className="item-price">
                      {formatCurrency(
                        (item.gia || item.donGia || 0) *
                          (item.soLuong || item.sl || 1)
                      )}
                    </Text>
                  </div>
                  {item.ghiChu && (
                    <Text className="item-note">Ghi chú: {item.ghiChu}</Text>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Total Section */}
        {orderData.items.length > 0 && (
          <div className="total-section">
            <div className="total-row subtotal">
              <Text className="total-label">Tạm tính:</Text>
              <Text className="total-value">
                {formatCurrency(orderData.subtotal)}
              </Text>
            </div>

            {orderData.discount > 0 && (
              <div className="total-row discount">
                <Text className="total-label">Giảm giá:</Text>
                <Text className="total-value discount-value">
                  -{formatCurrency(orderData.discount)}
                </Text>
              </div>
            )}

            <Divider className="total-divider" />

            <div className="total-row grand-total">
              <Text className="total-label">Tổng cộng:</Text>
              <Text className="total-value grand-total-value">
                {formatCurrency(orderData.total)}
              </Text>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="customer-display-footer">
        <div className="footer-wave"></div>
        <Text className="footer-text">Chúc quý khách ngon miệng!</Text>
      </div>
    </div>
  );
};

export default CustomerDisplay;
