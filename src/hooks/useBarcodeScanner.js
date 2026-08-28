/**
 * useBarcodeScanner Hook
 *
 * Custom hook để xử lý input từ máy quét mã vạch (barcode scanner).
 * Máy quét mã vạch hoạt động như bàn phím HID - khi quét sẽ "gõ" chuỗi mã vạch
 * và thường kết thúc bằng phím Enter.
 *
 * Hỗ trợ các loại máy quét:
 * - ICW 92108HS
 * - Các máy quét mã vạch USB HID khác
 *
 * @param {Function} onScan - Callback được gọi khi quét thành công
 * @param {Object} options - Cấu hình tùy chọn
 * @param {number} options.minLength - Độ dài tối thiểu của mã vạch (mặc định: 3)
 * @param {number} options.maxDelay - Thời gian tối đa giữa các ký tự (ms) (mặc định: 50)
 * @param {boolean} options.enabled - Bật/tắt hook (mặc định: true)
 * @param {Array} options.endKeys - Các phím kết thúc (mặc định: ['Enter'])
 */

import { useEffect, useRef, useCallback } from "react";

const useBarcodeScanner = (onScan, options = {}) => {
  const {
    minLength = 3,
    maxDelay = 50, // Thời gian tối đa giữa các ký tự (ms) - scanner gõ rất nhanh
    enabled = true,
    endKeys = ["Enter"],
    debug = false,
  } = options;

  const bufferRef = useRef("");
  const lastKeyTimeRef = useRef(0);
  const timeoutRef = useRef(null);
  const isProcessingRef = useRef(false);

  // Clear buffer
  const clearBuffer = useCallback(() => {
    bufferRef.current = "";
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Process barcode
  const processBarcode = useCallback(
    (barcode) => {
      if (isProcessingRef.current) return;

      const trimmedBarcode = barcode.trim();

      if (debug) {
        console.log("[BARCODE_SCANNER] Processing barcode:", trimmedBarcode);
      }

      if (trimmedBarcode.length >= minLength) {
        isProcessingRef.current = true;

        try {
          if (onScan && typeof onScan === "function") {
            onScan(trimmedBarcode);
          }
        } catch (error) {
          console.error("[BARCODE_SCANNER] Error in onScan callback:", error);
        } finally {
          // Reset processing flag after a short delay to prevent duplicate scans
          setTimeout(() => {
            isProcessingRef.current = false;
          }, 200);
        }
      } else if (debug) {
        console.log(
          "[BARCODE_SCANNER] Barcode too short, ignored:",
          trimmedBarcode,
        );
      }

      clearBuffer();
    },
    [onScan, minLength, clearBuffer, debug],
  );

  // Handle keydown event
  const handleKeyDown = useCallback(
    (event) => {
      if (!enabled) return;

      // Ignore if user is typing in an input field (except for barcode input scenarios)
      const activeElement = document.activeElement;
      const isInputElement =
        activeElement &&
        (activeElement.tagName === "INPUT" ||
          activeElement.tagName === "TEXTAREA" ||
          activeElement.isContentEditable);

      // Check if it's a search input - allow barcode scanning in search inputs
      const isSearchInput =
        activeElement &&
        (activeElement.classList.contains("barcode-input") ||
          activeElement.classList.contains("ant-input-search") ||
          activeElement.getAttribute("data-barcode-enabled") === "true");

      // Skip if typing in regular input (not barcode-enabled)
      if (isInputElement && !isSearchInput) {
        return;
      }

      const currentTime = Date.now();
      const timeSinceLastKey = currentTime - lastKeyTimeRef.current;

      // Check if this is an end key (Enter)
      if (endKeys.includes(event.key)) {
        event.preventDefault();

        if (bufferRef.current.length > 0) {
          processBarcode(bufferRef.current);
        }
        return;
      }

      // If too much time has passed, start fresh
      if (timeSinceLastKey > maxDelay && bufferRef.current.length > 0) {
        // This might be manual keyboard input, not scanner
        if (debug) {
          console.log("[BARCODE_SCANNER] Timeout exceeded, clearing buffer");
        }
        clearBuffer();
      }

      // Only capture printable characters
      if (
        event.key.length === 1 &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.metaKey
      ) {
        bufferRef.current += event.key;
        lastKeyTimeRef.current = currentTime;

        // Set a timeout to clear buffer if no more input
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
          // After timeout, if buffer has content but no Enter was pressed,
          // it might be partial input - clear it
          if (debug && bufferRef.current.length > 0) {
            console.log(
              "[BARCODE_SCANNER] Buffer timeout, content:",
              bufferRef.current,
            );
          }
          clearBuffer();
        }, 500); // Longer timeout to allow for scanner variations
      }
    },
    [enabled, endKeys, maxDelay, processBarcode, clearBuffer, debug],
  );

  // Set up event listener
  useEffect(() => {
    if (!enabled) return;

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      clearBuffer();
    };
  }, [enabled, handleKeyDown, clearBuffer]);

  // Return methods for external control
  return {
    clearBuffer,
    isEnabled: enabled,
  };
};

export default useBarcodeScanner;
