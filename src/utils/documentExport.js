import { saveAs } from 'file-saver';

/**
 * Generates and triggers download of an HTML document formatted for MS Word (.doc)
 * @param {string} filename - Output filename (e.g. 'MauHopDongLaoDong')
 * @param {string} htmlContent - HTML string of the document
 */
export const exportHtmlToWord = (filename = 'BieuMau', htmlContent = '') => {
  const safeTitle = filename.endsWith('.doc') ? filename : `${filename}.doc`;

  const wordTemplate = `
<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset="utf-8">
  <title>${filename}</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @page {
      size: A4 portrait;
      margin: 20mm 15mm 20mm 20mm;
    }
    body {
      font-family: "Times New Roman", Times, serif;
      font-size: 14pt;
      line-height: 1.5;
      color: #000000;
      background-color: #ffffff;
      margin: 0;
      padding: 0;
    }
    h1, h2, h3, h4, h5, h6 {
      font-family: "Times New Roman", Times, serif;
      color: #000000;
      margin-top: 12pt;
      margin-bottom: 6pt;
    }
    h1 { font-size: 18pt; font-weight: bold; text-align: center; }
    h2 { font-size: 16pt; font-weight: bold; }
    h3 { font-size: 14pt; font-weight: bold; }
    p {
      margin-top: 0;
      margin-bottom: 6pt;
      text-align: justify;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin-bottom: 12pt;
    }
    table, th, td {
      border: 1px solid #000000;
    }
    th, td {
      padding: 6pt 8pt;
      vertical-align: top;
      font-size: 13pt;
    }
    img {
      max-width: 100%;
      height: auto;
      display: block;
      margin: 6pt auto;
    }
    .resignation-letter {
      width: 100%;
    }
    .header {
      text-align: center;
      margin-bottom: 18pt;
    }
    .header-title {
      font-size: 13pt;
      font-weight: bold;
      margin-bottom: 2pt;
    }
    .header-subtitle {
      font-size: 13pt;
      font-weight: bold;
    }
    .title-section {
      text-align: center;
      margin-top: 18pt;
      margin-bottom: 18pt;
    }
    .title-section h1 {
      font-size: 18pt;
      font-weight: bold;
      text-transform: uppercase;
    }
    .info-row {
      margin-bottom: 6pt;
    }
    .info-row-triple {
      display: table;
      width: 100%;
      margin-bottom: 6pt;
    }
    .signature-section {
      margin-top: 24pt;
      width: 100%;
    }
    .signature-box {
      width: 33%;
      float: left;
      text-align: center;
    }
    .signature-title {
      font-weight: bold;
    }
    .signature-space {
      height: 60pt;
    }
  </style>
</head>
<body>
  <div class="WordSection1">
    ${htmlContent || '<p>Chưa có nội dung văn bản</p>'}
  </div>
</body>
</html>
  `;

  const blob = new Blob(['\ufeff', wordTemplate], {
    type: 'application/msword;charset=utf-8',
  });
  saveAs(blob, safeTitle);
};

/**
 * Triggers clean browser printing for an HTML document
 * @param {string} title - Document title for header
 * @param {string} htmlContent - HTML string to print
 */
export const printHtmlDocument = (title = 'Biểu mẫu', htmlContent = '') => {
  const printWindow = window.open('', '_blank', 'width=900,height=800');
  if (!printWindow) {
    alert('Vui lòng cho phép popup để thực hiện in văn bản!');
    return;
  }

  printWindow.document.write(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 20mm 15mm 20mm 20mm;
    }
    body {
      font-family: "Times New Roman", Times, serif;
      font-size: 14pt;
      line-height: 1.5;
      color: #000;
      background: #fff;
      margin: 0;
      padding: 10px;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin-bottom: 12px;
    }
    table, th, td {
      border: 1px solid #000;
    }
    th, td {
      padding: 6px 8px;
      vertical-align: top;
    }
    img {
      max-width: 100%;
      height: auto;
    }
    @media print {
      body {
        padding: 0;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  ${htmlContent}
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
        window.close();
      }, 300);
    };
  </script>
</body>
</html>
  `);
  printWindow.document.close();
};
