import { useEffect, useCallback } from 'react';

/**
 * Hook to sync cart data with customer display window
 * Usage: useCustomerDisplaySync(cartItems, selectedTable, subtotal, discount, total)
 */
export const useCustomerDisplaySync = (cartItems, selectedTable, subtotal, discount, total) => {
  
  // Send cart data to customer display
  const sendToCustomerDisplay = useCallback(() => {
    if (!window.electronAPI || !window.electronAPI.sendToCustomerDisplay) {
      return;
    }

    const displayData = {
      items: cartItems || [],
      tableName: selectedTable?.tenBan || null,
      subtotal: subtotal || 0,
      discount: discount || 0,
      total: total || 0
    };

    window.electronAPI.sendToCustomerDisplay(displayData);
  }, [cartItems, selectedTable, subtotal, discount, total]);

  // Listen for request from customer display
  useEffect(() => {
    if (!window.electronAPI || !window.electronAPI.onRequestCartData) {
      return;
    }

    const handleRequest = () => {
      sendToCustomerDisplay();
    };

    window.electronAPI.onRequestCartData(handleRequest);

    // Cleanup
    return () => {
      if (window.electronAPI && window.electronAPI.removeAllListeners) {
        window.electronAPI.removeAllListeners('request-cart-data-for-display');
      }
    };
  }, [sendToCustomerDisplay]);

  // Auto sync when cart data changes
  useEffect(() => {
    sendToCustomerDisplay();
  }, [sendToCustomerDisplay]);

  // Listen for customer display closed event
  useEffect(() => {
    if (!window.electronAPI || !window.electronAPI.onCustomerDisplayClosed) {
      return;
    }

    const handleClosed = () => {
      // Update local storage to reflect closed state
      localStorage.setItem('pmbh_dual_screen_mode', 'false');
    };

    window.electronAPI.onCustomerDisplayClosed(handleClosed);

    // Cleanup
    return () => {
      if (window.electronAPI && window.electronAPI.removeAllListeners) {
        window.electronAPI.removeAllListeners('customer-display-closed');
      }
    };
  }, []);

  return { sendToCustomerDisplay };
};

export default useCustomerDisplaySync;
