import React from "react";
import { Button, message } from "antd";
import { Printer } from "lucide-react";
import receiptLogoManager from "../../utils/receiptLogoManager";

const ReceiptPrinter = ({
  invoice,
  invoiceDetails,
  orderTotal,
  paymentDetails,
  paymentMethod = "Tiền mặt",
  currency = "VND",
  customerPaid = 0,
  discountAmount = 0,
  finalTotal = 0,
  includeVAT = false,
}) => {
  // Currency exchange rates
  const exchangeRates = {
    VND: 1,
    USD: 23725, // 1 USD = 23,725 VND
    THB: 5, // 1 THB = 5 VND
  };

  const convertToVND = (amount, fromCurrency) => {
    if (!amount) return 0;
    return amount * (exchangeRates[fromCurrency] || 1);
  };

  const convertFromVND = (amount, toCurrency) => {
    if (!amount) return 0;
    return amount / (exchangeRates[toCurrency] || 1);
  };

  const formatAmount = (amount, displayCurrency) => {
    const normalized = Number.isFinite(amount) ? amount : 0;
    if (displayCurrency === "VND") {
      return Math.round(normalized).toLocaleString("vi-VN");
    }
    return normalized.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatWithCurrency = (amount, displayCurrency) => {
    const label = displayCurrency === "VND" ? "VNĐ" : displayCurrency;
    return `${formatAmount(amount, displayCurrency)} ${label}`;
  };

  const generateReceiptContent = () => {
    const paidInVND = convertToVND(customerPaid, currency);
    const changeInVND = Math.max(0, paidInVND - finalTotal);
    const subtotalInCurrency = convertFromVND(orderTotal, currency);
    const discountInCurrency = convertFromVND(discountAmount, currency);
    const totalInCurrency = convertFromVND(finalTotal, currency);

    const receiptData = {
      header: {
        storeName: "HỆ THỐNG BÁN HÀNG",
        address: "Địa chỉ cửa hàng",
        phone: "0123-456-789",
        date: new Date().toLocaleDateString("vi-VN"),
        time: new Date().toLocaleTimeString("vi-VN"),
        invoiceNumber: invoice?.maHd || "N/A",
        tableName: invoice?.tenBan || "N/A",
      },
      items: invoiceDetails.map((item) => ({
        name: item.tenSp || item.tenMon || "Unknown",
        quantity: item.soLuong || item.sl || 1,
        price: parseFloat(item.gia || item.giaBan || item.donGia || 0),
        total:
          (item.soLuong || item.sl || 1) *
          parseFloat(item.gia || item.giaBan || item.donGia || 0),
      })),
      totals: {
        subtotalVND: orderTotal,
        vatVND: includeVAT ? orderTotal * 0.1 : 0,
        discountVND: discountAmount,
        totalVND: finalTotal,
        subtotalCurrency: subtotalInCurrency,
        vatCurrency: includeVAT ? subtotalInCurrency * 0.1 : 0,
        discountCurrency: discountInCurrency,
        totalCurrency: totalInCurrency,
        paidCurrency: customerPaid,
        changeCurrency: convertFromVND(changeInVND, currency),
        paidVND: paidInVND,
        changeVND: changeInVND,
      },
      payment: {
        method: paymentMethod,
        currency: currency,
      },
    };

    return receiptData;
  };

  const printReceipt = async () => {
    try {
      const receiptData = generateReceiptContent();

      const renderAmountLine = (
        label,
        valueInVND,
        valueInCurrency,
        options = {}
      ) => {
        const { highlight = false } = options;
        const showSecondary = currency !== "VND";
        return `
          <div class="amount-line${highlight ? " highlight" : ""}">
            <span class="label">${label}</span>
            <div class="value">
              <span class="primary">${formatWithCurrency(
                valueInVND,
                "VND"
              )}</span>
              ${
                showSecondary
                  ? `<span class="secondary">≈ ${formatWithCurrency(
                      valueInCurrency,
                      currency
                    )}</span>`
                  : ""
              }
            </div>
          </div>
        `;
      };

      // Create printable content
      const printContent = `
        <div class="receipt-root">
          ${receiptLogoManager.getLogoHTML()}
          <div class="receipt-header">
            <h2>${receiptData.header.storeName}</h2>
            <p>${receiptData.header.address}</p>
            <p>${receiptData.header.phone}</p>
            <p>${receiptData.header.date} ${receiptData.header.time}</p>
          </div>
          
          <div class="invoice-meta">
            <p><strong>Hóa đơn:</strong> ${receiptData.header.invoiceNumber}</p>
            <p><strong>Bàn:</strong> ${receiptData.header.tableName}</p>
          </div>
          
          <table class="items-table">
            <thead>
              <tr>
                <th class="item-name">Món</th>
                <th>SL x Giá</th>
                <th class="total">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              ${receiptData.items
                .map(
                  (item) => `
                <tr>
                  <td class="item-name">${item.name}</td>
                  <td class="qty">${item.quantity} x ${formatAmount(
                    item.price,
                    "VND"
                  )} VNĐ</td>
                  <td class="total">${formatAmount(item.total, "VND")} VNĐ</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
          
          <div class="totals-section">
            ${renderAmountLine(
              "Tạm tính",
              receiptData.totals.subtotalVND,
              receiptData.totals.subtotalCurrency
            )}
            ${
              receiptData.totals.vatVND > 0
                ? renderAmountLine(
                    "Thuế VAT (10%)",
                    receiptData.totals.vatVND,
                    receiptData.totals.vatCurrency
                  )
                : ""
            }
            ${
              receiptData.totals.discountVND > 0
                ? renderAmountLine(
                    "Giảm giá",
                    -receiptData.totals.discountVND,
                    -receiptData.totals.discountCurrency
                  )
                : ""
            }
            ${renderAmountLine(
              "Tổng cộng",
              receiptData.totals.totalVND,
              receiptData.totals.totalCurrency,
              { highlight: true }
            )}
            ${
              paymentMethod === "Tiền mặt"
                ? renderAmountLine(
                    "Tiền khách đưa",
                    receiptData.totals.paidVND,
                    receiptData.totals.paidCurrency
                  )
                : ""
            }
            ${
              paymentMethod === "Tiền mặt"
                ? renderAmountLine(
                    "Tiền thừa",
                    receiptData.totals.changeVND,
                    receiptData.totals.changeCurrency
                  )
                : ""
            }
            <div class="amount-line">
              <span class="label">Phương thức:</span>
              <div class="value">
                <span class="primary">${receiptData.payment.method}</span>
              </div>
            </div>
            ${
              currency !== "VND"
                ? `
              <div class="amount-line">
                <span class="label">Tỷ giá:</span>
                <div class="value">
                  <span class="primary">1 ${currency} = ${exchangeRates[
                    currency
                  ].toLocaleString("vi-VN")} VND</span>
                </div>
              </div>
            `
                : ""
            }
          </div>
          
          <div class="receipt-footer">
            <p>Cảm ơn quý khách!</p>
            <p>Hẹn gặp lại!</p>
          </div>
        </div>
      `;

      // Open print window
      const printWindow = window.open("", "_blank", "width=400,height=600");
      printWindow.document.write(`
        <html>
          <head>
            <title>Hóa đơn thanh toán</title>
            <style>
              body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
              .receipt-root { width: 300px; font-family: monospace; font-size: 12px; line-height: 1.4; }
              ${receiptLogoManager.getLogoCSS()}
              .receipt-header { text-align: center; margin-bottom: 20px; }
              .receipt-header h2 { margin: 0; font-size: 16px; }
              .receipt-header p { margin: 2px 0; }
              .invoice-meta { border-top: 1px dashed #000; padding-top: 10px; margin-bottom: 10px; }
              .invoice-meta p { margin: 2px 0; }
              .items-table { width: 100%; border-top: 1px dashed #000; margin-top: 10px; padding-top: 10px; border-collapse: collapse; }
              .items-table th, .items-table td { padding: 4px 0; font-family: monospace; font-size: 12px; }
              .items-table th { text-align: left; border-bottom: 1px dashed #000; }
              .items-table th.total, .items-table td.total { text-align: right; }
              .items-table td.item-name { text-align: left; }
              .items-table td.qty { text-align: right; color: #555; font-size: 11px; }
              .totals-section { border-top: 1px dashed #000; padding-top: 10px; margin-top: 10px; }
              .amount-line { display: flex; justify-content: space-between; margin: 4px 0; }
              .amount-line .value { display: flex; flex-direction: column; align-items: flex-end; text-align: right; }
              .amount-line .primary { font-weight: 500; }
              .amount-line.highlight .primary { font-weight: 700; }
              .amount-line .secondary { font-size: 11px; color: #555; }
              .receipt-footer { text-align: center; margin-top: 20px; border-top: 1px dashed #000; padding-top: 10px; }
              .no-print { display: block; }
              @media print {
                .no-print { display: none; }
                body { margin: 0; }
              }
            </style>
          </head>
          <body>
            ${printContent}
            <div class="no-print" style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px dashed #000;">
              <button onclick="window.print()" style="padding: 10px 20px; background: #197dd3; color: white; border: none; border-radius: 4px; cursor: pointer; margin: 5px;">In hóa đơn</button>
              <button onclick="window.close()" style="padding: 10px 20px; background: #ccc; color: black; border: none; border-radius: 4px; cursor: pointer; margin: 5px;">Đóng</button>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();

      message.success("Đã gửi lệnh in hóa đơn");
    } catch (error) {
      console.error("Print error:", error);
      message.error("Không thể in hóa đơn: " + error.message);
    }
  };

  const getPaymentMethodText = (method) => {
    const methods = {
      cash: "Tiền mặt",
      card: "Thẻ",
      transfer: "Chuyển khoản",
      ewallet: "Ví điện tử",
    };
    return methods[method] || method;
  };

  return (
    <Button icon={<Printer size={16} />} onClick={printReceipt} type="default">
      In hóa đơn
    </Button>
  );
};

export default ReceiptPrinter;
