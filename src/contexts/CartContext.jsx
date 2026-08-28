import React, { createContext, useContext, useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart phải được sử dụng trong CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [discount, setDiscount] = useState(0);

  // Tính tổng tiền
  const total = cartItems.reduce((sum, item) => {
    return sum + (item.gia * item.soLuong);
  }, 0);

  // Tính tiền sau giảm giá
  const finalTotal = total - (total * discount / 100);

  // Thêm món vào giỏ hàng
  const addToCart = (product) => {
    const existingItem = cartItems.find(item => item.id === product.id);
    
    if (existingItem) {
      setCartItems(cartItems.map(item =>
        item.id === product.id
          ? { ...item, soLuong: item.soLuong + 1 }
          : item
      ));
    } else {
      setCartItems([...cartItems, { 
        ...product, 
        soLuong: 1,
        cartId: uuidv4()
      }]);
    }
  };

  // Cập nhật số lượng
  const updateQuantity = (cartId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(cartId);
      return;
    }
    
    setCartItems(cartItems.map(item =>
      item.cartId === cartId
        ? { ...item, soLuong: newQuantity }
        : item
    ));
  };

  // Xóa món khỏi giỏ hàng
  const removeFromCart = (cartId) => {
    setCartItems(cartItems.filter(item => item.cartId !== cartId));
  };

  // Xóa toàn bộ giỏ hàng
  const clearCart = () => {
    setCartItems([]);
    setSelectedTable(null);
    setCustomer(null);
    setDiscount(0);
  };

  // Lưu đơn hàng
  const saveOrder = async () => {
    if (cartItems.length === 0) {
      throw new Error('Giỏ hàng trống');
    }

    const order = {
      id: uuidv4(),
      items: cartItems,
      ban: selectedTable,
      khachHang: customer,
      giamGia: discount,
      tongTien: total,
      thanhTien: finalTotal,
      thoiGian: new Date().toISOString(),
      trangThai: 'pending'
    };

    // Lưu vào localStorage (thực tế sẽ gửi lên server)
    const savedOrders = JSON.parse(localStorage.getItem('pmbh_orders') || '[]');
    savedOrders.push(order);
    localStorage.setItem('pmbh_orders', JSON.stringify(savedOrders));

    clearCart();
    return order;
  };

  const value = {
    cartItems,
    selectedTable,
    customer,
    discount,
    total,
    finalTotal,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    setSelectedTable,
    setCustomer,
    setDiscount,
    saveOrder
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};
