import React, { useRef } from 'react';
import { Modal, Button, Space } from 'antd';
import { PrinterOutlined, DownloadOutlined, FileWordOutlined } from '@ant-design/icons';
import { generateReportHTML, exportPayrollToWord, exportPayrollToExcel } from '../../utils/payrollReportExporter';

const BaoCaoLuongPrintModal = ({
    open,
    onClose,
    dataSource = [],
    periodInfo = {},
    templateTitle = 'BÁO CÁO LƯƠNG THÁNG',
}) => {
    const iframeRef = useRef(null);
    const safePeriodInfo = periodInfo || {};

    const htmlContent = open
        ? generateReportHTML({
              dataSource,
              periodInfo: safePeriodInfo,
              templateTitle,
          })
        : '';

    const handlePrint = () => {
        if (iframeRef.current) {
            const contentWindow = iframeRef.current.contentWindow;
            contentWindow.focus();
            contentWindow.print();
        }
    };

    const handleExportWord = () => {
        exportPayrollToWord({ dataSource, periodInfo: safePeriodInfo, templateTitle });
    };

    const handleExportExcel = () => {
        exportPayrollToExcel({ dataSource, periodInfo: safePeriodInfo, templateTitle });
    };

    return (
        <Modal
            title={`Xem & In Báo Cáo - ${templateTitle}`}
            open={open}
            onCancel={onClose}
            width={1200}
            style={{ top: 20 }}
            footer={[
                <Button key="close" onClick={onClose}>
                    Đóng
                </Button>,
                <Button key="word" icon={<FileWordOutlined />} onClick={handleExportWord}>
                    Xuất Word
                </Button>,
                <Button key="excel" type="default" icon={<DownloadOutlined />} onClick={handleExportExcel}>
                    Xuất Excel
                </Button>,
                <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={handlePrint}>
                    In Báo Cáo
                </Button>,
            ]}
        >
            <div style={{ height: '70vh', border: '1px solid #e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                <iframe
                    ref={iframeRef}
                    title="BaoCaoLuongPreview"
                    srcDoc={htmlContent}
                    style={{ width: '100%', height: '100%', border: 'none' }}
                />
            </div>
        </Modal>
    );
};

export default BaoCaoLuongPrintModal;
