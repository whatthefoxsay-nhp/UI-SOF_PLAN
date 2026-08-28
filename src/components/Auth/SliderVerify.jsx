import React, { useRef, useEffect, useState } from "react";
import { RefreshCw, ArrowRight } from "lucide-react";
import "./SliderVerify.css";
import bg1 from "../../assets/Img/Captcha/bg1.jpeg";
import bg2 from "../../assets/Img/Captcha/bg2.jpeg";
import bg3 from "../../assets/Img/Captcha/bg3.jpg";
import bg4 from "../../assets/Img/Captcha/bg4.jpg";
import bg5 from "../../assets/Img/Captcha/bg5.jpg";
import bg6 from "../../assets/Img/Captcha/bg6.jpg";

const CAPTCHA_IMAGES = {
  1: bg1,
  2: bg2,
  3: bg3,
  4: bg4,
  5: bg5,
  6: bg6
};

/**
 * SliderVerify Component
 * @param {string} v - Tọa độ X mục tiêu (mã hóa)
 * @param {string} k - Tọa độ Y của mảnh ghép (mã hóa)
 * @param {string} i - Chỉ số hình nền (mã hóa)
 * @param {function} onSuccess - Callback khi trượt xong (trả về tọa độ X)
 * @param {function} onRefresh - Callback khi nhấn làm mới
 */
const SliderVerify = ({ v, k, i, onSuccess, onRefresh }) => {
  const canvasRef = useRef(null);
  const fragmentRef = useRef(null);
  const [sliderLeft, setSliderLeft] = useState(0);
  const sliderLeftRef = useRef(0); // Sử dụng Ref để tránh closure bug
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);

  // Helper giải mã (Base64 -> Value)
  const decode = (token) => {
    if (!token) return 0;
    try {
      const decoded = window.atob(token);
      const searchStr = "SOFVinh|";
      const index = decoded.indexOf(searchStr);

      if (index !== -1) {
        // Lấy đoạn sau "SOFVinh|"
        const dataPart = decoded.substring(index + searchStr.length);
        const parts = dataPart.split("|");
        return parseInt(parts[0]); // Giá trị thực (X, Y hoặc Index)
      }
      return 0;
    } catch (e) {
      return 0;
    }
  };

  const targetX = decode(v) || 150;
  const targetY = decode(k) || 50;
  const imgIndex = decode(i) || 1;

  const L = 42; // Cạnh mảnh vuông
  const r = 9;  // Bán kính hình tròn lồi/lõm
  const PI = Math.PI;

  const drawPuzzlePath = (ctx, x, y) => {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + L / 2 - r, y);
    ctx.arc(x + L / 2, y - r + 2, r, 0.72 * PI, 2.28 * PI);
    ctx.lineTo(x + L, y);
    ctx.lineTo(x + L, y + L / 2 - r);
    ctx.arc(x + L + r - 2, y + L / 2, r, 1.22 * PI, 2.78 * PI);
    ctx.lineTo(x + L, y + L);
    ctx.lineTo(x, y + L);
    ctx.lineTo(x, y + L / 2 + r);
    ctx.arc(x + r - 2, y + L / 2, r, 0.72 * PI, 2.28 * PI, true);
    ctx.lineTo(x, y);
    ctx.lineWidth = 1;
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
    ctx.stroke();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const fragment = fragmentRef.current;
    if (!canvas || !fragment) return;

    const ctx = canvas.getContext("2d");
    const fragmentCtx = fragment.getContext("2d");

    // Reset slider
    setSliderLeft(0);
    sliderLeftRef.current = 0;

    // Xóa cũ
    ctx.clearRect(0, 0, 310, 155);
    fragmentCtx.clearRect(0, 0, 310, 155);

    const img = new Image();
    img.src = CAPTCHA_IMAGES[imgIndex] || bg4;
    img.onload = () => {
      // Vẽ background
      ctx.drawImage(img, 0, 0, 310, 155);

      const x = targetX;
      const y = targetY;

      // Vẽ mảnh ghép (fragment)
      fragment.width = 310;
      fragment.height = 155;

      fragmentCtx.save();
      drawPuzzlePath(fragmentCtx, 0, y);
      fragmentCtx.clip();
      fragmentCtx.drawImage(img, -x, 0, 310, 155);
      fragmentCtx.restore();

      // Vẽ "lỗ hổng" bôi đen trên main canvas
      ctx.save();
      drawPuzzlePath(ctx, x, y);
      ctx.fillStyle = "rgba(0, 0, 0, 0.9)"; // Làm cho lỗ hổng đen đậm hơn
      ctx.fill();
      ctx.restore();
    };
  }, [targetX, targetY, imgIndex]);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setStartX(e.clientX || (e.touches && e.touches[0].clientX) || 0);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const currentX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
    let moveX = currentX - startX;
    if (moveX < 0) moveX = 0;
    if (moveX > 270) moveX = 270; // 310 - 40

    setSliderLeft(moveX);
    sliderLeftRef.current = moveX;
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (onSuccess) onSuccess(Math.round(sliderLeftRef.current));
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("touchmove", handleMouseMove);
      window.addEventListener("touchend", handleMouseUp);
    } else {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleMouseMove);
      window.removeEventListener("touchend", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleMouseMove);
      window.removeEventListener("touchend", handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div className="slider-verify-container">
      <div className="slider-verify-canvas-area">
        <canvas ref={canvasRef} width="310" height="155" className="slider-verify-bg" />
        <canvas
          ref={fragmentRef}
          width="310"
          height="155"
          className="slider-verify-fragment"
          style={{ left: `${sliderLeft}px` }}
        />
        <div className="slider-verify-refresh" onClick={onRefresh}>
          <RefreshCw size={16} />
        </div>
      </div>

      <div className="slider-verify-control">
        <div className="slider-verify-control-text">Trượt để xác minh</div>
        <div className="slider-verify-bar" style={{ width: `${sliderLeft + 20}px` }} />
        <div
          className="slider-verify-handle"
          style={{ left: `${sliderLeft}px` }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleMouseDown}
        >
          <ArrowRight size={20} />
        </div>
      </div>
    </div>
  );
};

export default SliderVerify;
