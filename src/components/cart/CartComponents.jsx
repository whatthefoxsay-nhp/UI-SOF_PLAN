import React from 'react';
import { Badge, Card, Typography, Button, Space, InputNumber, Divider } from 'antd';
import { ShoppingCart, Plus, Minus, Trash2, X } from 'lucide-react';
import '../../styles/tables/TableGrid.css';

const { Text, Title } = Typography;

const CartSidebar = ({ 
  isOpen, 
  onClose, 
  cartItems, 
  selectedTable,
  customer,
  discount,
  total,
  finalTotal,
  onUpdateQuantity,
  onRemoveItem,
  onSaveOrder,
  onPrintOrder 
}) => {
  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 999
          }}
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={`cart-sidebar ${isOpen ? 'open' : ''}`}>
        <div className="cart-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={4} style={{ color: '#fff', margin: 0 }}>
              Giỏ hàng
            </Title>
            <Button 
              type="text" 
              icon={<X color="#fff" />} 
              onClick={onClose}
              style={{ color: '#fff' }}
            />
          </div>
          {selectedTable && (
            <Text style={{ color: '#77d4fb' }}>
              Bàn: {selectedTable.tenBan}
            </Text>
          )}
        </div>

        <div className="cart-content">
          {cartItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <ShoppingCart size={48} color="#bdbcc4" />
              <div style={{ marginTop: '16px' }}>
                <Text type="secondary">Giỏ hàng trống</Text>
              </div>
            </div>
          ) : (
            <Space direction="vertical" style={{ width: '100%' }}>
              {cartItems.map((item) => (
                <Card key={item.id} size="small" style={{ marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <Text strong>{item.ten}</Text>
                      <div>
                        <Text type="secondary">
                          {item.gia?.toLocaleString('vi-VN')}đ
                        </Text>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Button
                        size="small"
                        icon={<Minus size={12} />}
                        onClick={() => onUpdateQuantity(item.id, Math.max(0, item.quantity - 1))}
                      />
                      <InputNumber
                        size="small"
                        min={1}
                        value={item.quantity}
                        onChange={(value) => onUpdateQuantity(item.id, value || 1)}
                        style={{ width: '60px' }}
                      />
                      <Button
                        size="small"
                        icon={<Plus size={12} />}
                        onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                      />
                      <Button
                        size="small"
                        type="text"
                        danger
                        icon={<Trash2 size={12} />}
                        onClick={() => onRemoveItem(item.id)}
                      />
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', marginTop: '8px' }}>
                    <Text strong>
                      {((item.gia || 0) * item.quantity).toLocaleString('vi-VN')}đ
                    </Text>
                  </div>
                </Card>
              ))}
            </Space>
          )}
        </div>

        {cartItems.length > 0 && (
          <div className="cart-footer">
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>Tạm tính:</Text>
                  <Text>{total?.toLocaleString('vi-VN')}đ</Text>
                </div>
                {discount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text>Giảm giá:</Text>
                    <Text>-{discount?.toLocaleString('vi-VN')}đ</Text>
                  </div>
                )}
                <Divider style={{ margin: '8px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text strong>Tổng cộng:</Text>
                  <Text strong style={{ color: '#197dd3', fontSize: '18px' }}>
                    {finalTotal?.toLocaleString('vi-VN')}đ
                  </Text>
                </div>
              </div>
              
              <Space style={{ width: '100%' }} direction="vertical">
                <Button 
                  type="primary" 
                  block 
                  size="large"
                  onClick={onSaveOrder}
                  disabled={!selectedTable}
                  style={{ background: '#197dd3' }}
                >
                  Lưu đơn hàng
                </Button>
                <Button 
                  block 
                  size="large"
                  onClick={onPrintOrder}
                  disabled={cartItems.length === 0}
                >
                  In hóa đơn
                </Button>
              </Space>
            </Space>
          </div>
        )}
      </div>
    </>
  );
};

const FloatingCartButton = ({ cartItems, onClick }) => {
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <button className="floating-cart-button" onClick={onClick}>
      <ShoppingCart size={24} />
      {itemCount > 0 && (
        <div className="cart-badge">
          {itemCount}
        </div>
      )}
    </button>
  );
};

export { CartSidebar, FloatingCartButton };
