import React, { useState, useCallback, useMemo, useDeferredValue } from 'react';
import { Table, Button, Input, Tooltip, message, Breadcrumb, Card, Drawer, Select, Row, Col, Modal, Dropdown, Space, Form, Popconfirm } from 'antd';
import { HomeOutlined, DownloadOutlined } from '@ant-design/icons';
import { RotateCw, Sliders, FileText, Trash2, Lock, Unlock, Key, FileSpreadsheet, FileIcon, Globe } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { lv_LoadDataAPI } from '../../../services/apiServices';
import ChiTietKPI from '../ThietLapKPI/ChiTietKPI';
import SelectLanTinhLuong from '../../../components/DropDown/SelectLanTinhLuong';
import styles from '../../ChamCong&TienLuong/ThongTinCC/style.module.css';
import './KPIHangThang.css';

const { Option } = Select;

const KPIHangThang = () => {
    // --- State for Filters ---
    const [searchEmpCode, setSearchEmpCode] = useState('');
    const [searchEmpName, setSearchEmpName] = useState('');
    const [searchCMND, setSearchCMND] = useState('');
    const [searchDepartment, setSearchDepartment] = useState('');
    const [searchPeriod, setSearchPeriod] = useState('');

    // Defer text inputs for performance if typing fast
    const defSearchEmpCode = useDeferredValue(searchEmpCode);
    const defSearchEmpName = useDeferredValue(searchEmpName);

    const [selectedRowKeys, setSelectedRowKeys] = useState([]);
    const [detailVisible, setDetailVisible] = useState(false);
    const [detailRecord, setDetailRecord] = useState(null);
    const [reactivating, setReactivating] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    // API settings
    const table = 'ki_lv0005';
    const func = 'DataView';

    const { data: listData = [], isLoading: loading, refetch: loadData } = useQuery({
        queryKey: ['ki_lv0005', 'loadDataView'],
        queryFn: async () => {
            const data = await lv_LoadDataAPI(table, 'load' + func);
            if (data && Array.isArray(data)) {
                return data.map(item => ({
                    ...item,
                    key: item.lv001 || `temp_${Math.random()}`
                })).sort((a, b) => (a.lv001 || '').localeCompare(b.lv001 || ''));
            }
            return [];
        }
    });

    // --- Filter logic ---
    const filteredList = useMemo(() => {
        return listData.filter((item) => {
            const matchCode = defSearchEmpCode ? item.lv002?.toLowerCase().includes(defSearchEmpCode.toLowerCase()) : true;
            const matchName = defSearchEmpName ? item.lv099?.toLowerCase().includes(defSearchEmpName.toLowerCase()) : true;
            const matchCMND = searchCMND ? item.lv010?.includes(searchCMND) : true;
            const matchDept = searchDepartment ? item.lv029 === searchDepartment : true;
            const matchPeriod = searchPeriod ? item.lv003 === searchPeriod || item.lv003?.includes(searchPeriod) : true;

            return matchCode && matchName && matchCMND && matchDept && matchPeriod;
        });
    }, [listData, defSearchEmpCode, defSearchEmpName, searchCMND, searchDepartment, searchPeriod]);

    // --- Row Selection ---
    const rowSelection = {
        selectedRowKeys,
        onChange: (newSelectedRowKeys) => {
            setSelectedRowKeys(newSelectedRowKeys);
        },
    };

    // --- Actions ---
    const handleDetail = useCallback((record) => {
        setDetailRecord(record);
        setDetailVisible(true);
    }, []);

    const sanitizeRecord = useCallback((record) => {
        const { key, isQuickRow, ...rest } = record || {};
        return rest;
    }, []);

    const handleDeleteMulti = async () => {
        if (!selectedRowKeys.length) return message.warning('Vui lòng chọn dữ liệu cần xóa');
        Modal.confirm({
            title: 'Xóa dữ liệu KPI',
            content: `Bạn có chắc chắn muốn xóa ${selectedRowKeys.length} dòng dữ liệu đã chọn?`,
            okText: 'Xóa',
            cancelText: 'Hủy',
            okButtonProps: { danger: true },
            onOk: async () => {
                try {
                    setActionLoading(true);
                    await lv_LoadDataAPI(table, 'delete', { ids: selectedRowKeys });
                    message.success(`Đã xóa ${selectedRowKeys.length} dòng dữ liệu KPI`);
                    setSelectedRowKeys([]);
                    loadData();
                } catch (error) {
                    console.error('Xóa dữ liệu KPI failed:', error);
                    message.error('Không thể xóa dữ liệu KPI. Vui lòng thử lại.');
                } finally {
                    setActionLoading(false);
                }
            },
        });
    };

    const handleBatchAction = async (type, lockedValue) => {
        if (!selectedRowKeys.length) {
            message.warning(type === 'lock' ? 'Vui lòng chọn nhân viên cần khóa KPI' : 'Vui lòng chọn nhân viên cần mở khóa KPI');
            return;
        }
        try {
            setActionLoading(true);
            const selected = listData.filter((item) => selectedRowKeys.includes(item.key));
            for (const record of selected) {
                await lv_LoadDataAPI(table, 'update', { ...sanitizeRecord(record), lv007: lockedValue });
            }
            message.success(type === 'lock'
                ? `Đã khóa KPI cho ${selectedRowKeys.length} nhân viên`
                : `Đã mở khóa KPI cho ${selectedRowKeys.length} nhân viên`);
            setSelectedRowKeys([]);
            loadData();
        } catch (error) {
            console.error(`Thao tác ${type} KPI failed:`, error);
            message.error(type === 'lock' ? 'Không thể khóa KPI' : 'Không thể mở khóa KPI');
        } finally {
            setActionLoading(false);
        }
    };

    const handleLock = () => handleBatchAction('lock', '1');

    const handleUnlock = () => handleBatchAction('unlock', '0');

    const handleReactivateKPI = () => {
        if (!searchPeriod) {
            message.warning('Vui lòng chọn kỳ tính KPI trước khi kích hoạt');
            return;
        }

        Modal.confirm({
            title: 'Kích hoạt lại dữ liệu',
            content: 'Bạn muốn kích hoạt lại dữ liệu KPI?',
            okText: 'Kích hoạt',
            cancelText: 'Hủy',
            onOk: async () => {
                setReactivating(true);
                try {
                    const response = await lv_LoadDataAPI(table, 'calculateAuto', { lv003: searchPeriod });
                    if (response?.success === false) {
                        throw new Error(response?.message || 'Không thể kích hoạt KPI');
                    }

                    const inserted = Number(response?.inserted || 0);
                    const childInserted = Number(response?.childInserted || 0);
                    const successText = inserted > 0
                        ? `Đã kích hoạt KPI cho ${inserted} nhân viên, tạo ${childInserted} chỉ tiêu KPI`
                        : (response?.message || 'KPI của kỳ này đã được kích hoạt trước đó');
                    message.success(successText);
                    setSelectedRowKeys([]);
                    await loadData();
                } catch (error) {
                    message.error(error?.message || 'Kích hoạt KPI thất bại');
                    throw error;
                } finally {
                    setReactivating(false);
                }
            }
        });
    };
    // --- Exports ---
    const getDataForExport = () => {
        if (!filteredList || filteredList.length === 0) return [];
        return filteredList.map((item, index) => ({
            'STT': index + 1,
            'Mã tự động': item.lv001 || '',
            'Mã nhân viên': item.lv002 || '',
            'Tên nhân viên': item.lv099 || '',
            'Lần tính': item.lv003 || '',
            'Mã KPI': item.lv004 || '',
            'Ghi chú': item.lv005 || '',
            'Người khoá': item.lv006 || '',
            'Khóa': (item.lv007 === '1' || item.lv007 === 1 || item.lv007 === true) ? 1 : 0,
            'Tổng điểm trung bình': item.lv100 != null ? item.lv100 : 0,
        }));
    };

    const createHTMLTable = (data, title) => {
        if (data.length === 0) return '';
        const headers = Object.keys(data[0]);
        let tableHTML = `
        <h2 style="text-align: center;">${title}</h2>
        <table border="1" style="border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; font-size: 12px;">
            <thead>
                <tr style="background-color: #1890ff; color: white; font-weight: bold;">
                    ${headers.map(h => `<th style="padding: 5px;">${h}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
        `;
        data.forEach(row => {
            tableHTML += '<tr>';
            headers.forEach(header => {
                tableHTML += `<td style="padding: 5px;">${row[header] !== undefined ? row[header] : ''}</td>`;
            });
            tableHTML += '</tr>';
        });
        tableHTML += '</tbody></table>';
        return tableHTML;
    };

    const exportExcel = () => {
        const data = getDataForExport();
        if (data.length === 0) return message.warning("Không có dữ liệu để xuất!");
        const worksheet = XLSX.utils.json_to_sheet(data);
        const fitToColumn = (data) => {
            const columnWidths = [];
            const keys = Object.keys(data[0]);
            keys.forEach((key) => {
                columnWidths.push({ wch: Math.max(key.length, ...data.map(row => (row[key] ? row[key].toString().length : 0))) + 2 });
            });
            return columnWidths;
        };
        if (data.length > 0) worksheet['!cols'] = fitToColumn(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "DanhSachKPIHangThang");
        XLSX.writeFile(workbook, "DanhSachKPIHangThang.xlsx");
        message.success("Đã xuất file Excel thành công!");
    };

    const exportWord = () => {
        const data = getDataForExport();
        if (data.length === 0) return message.warning("Không có dữ liệu để xuất!");
        const tableContent = createHTMLTable(data, "DANH SÁCH KPI HÀNG THÁNG");
        const html = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset='utf-8'><title>Danh Sách KPI Hàng Tháng</title></head>
        <body>${tableContent}</body></html>
        `;
        const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
        saveAs(blob, 'DanhSachKPIHangThang.doc');
        message.success("Đã xuất file Word thành công!");
    };

    const exportWeb = () => {
        const data = getDataForExport();
        if (data.length === 0) return message.warning("Không có dữ liệu để xuất!");
        const tableContent = createHTMLTable(data, "DANH SÁCH KPI HÀNG THÁNG");
        const html = `
        <html><head><meta charset='utf-8'><title>Danh Sách KPI Hàng Tháng</title>
        <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #007bff; color: white; }
            tr:nth-child(even) { background-color: #f2f2f2; }
            tr:hover { background-color: #e6f7ff; }
        </style></head>
        <body>${tableContent}</body></html>
        `;
        const blob = new Blob(['\ufeff', html], { type: 'text/html' });
        saveAs(blob, 'DanhSachKPIHangThang.html');
        message.success("Đã xuất file Web thành công!");
    };

    const menuItems = useMemo(
        () => [
            { key: '1', label: 'Xuất tệp Excel', icon: <FileSpreadsheet size={16} />, onClick: exportExcel },
            { key: '2', label: 'Xuất tệp Word', icon: <FileIcon size={16} />, onClick: exportWord },
            { key: '3', label: 'Xuất tệp Web', icon: <Globe size={16} />, onClick: exportWeb },
        ],
        [exportExcel, exportWord, exportWeb],
    );

    // --- Columns ---
    const columns = useMemo(() => [
        {
            title: 'STT',
            dataIndex: 'stt',
            key: 'stt',
            width: 70,
            align: 'center',
            render: (text, record, index) => index + 1
        },
        {
            title: 'Mã tự động',
            dataIndex: 'lv001',
            key: 'lv001',
            width: 120,
        },
        {
            title: 'Mã nhân viên',
            dataIndex: 'lv002',
            key: 'lv002',
            width: 150,
        },
        {
            title: 'Tên nhân viên',
            dataIndex: 'lv099',
            key: 'lv099',
            width: 250,
        },
        {
            title: 'Lần tính',
            dataIndex: 'lv003',
            key: 'lv003',
            width: 250,
        },
        {
            title: 'Mã KPI',
            dataIndex: 'lv004',
            key: 'lv004',
            width: 180,
        },
        {
            title: 'Ghi chú',
            dataIndex: 'lv005',
            key: 'lv005',
            width: 200,
        },
        {
            title: 'Người khoá',
            dataIndex: 'lv006',
            key: 'lv006',
            width: 150,
        },
        {
            title: 'Khóa',
            dataIndex: 'lv007',
            key: 'lv007',
            width: 100,
            align: 'center',
            render: (val) => {
                if (val === '1' || val === 1 || val === true) {
                    return <Lock size={16} color="red" />;
                }
                return <Unlock size={16} color="green" />;
            }
        },
        {
            title: 'Tổng điểm trung bình',
            dataIndex: 'lv100',
            key: 'lv100',
            width: 180,
            align: 'right',
            render: (val) => <strong style={{ color: '#1890ff' }}>{val != null ? val : 0}</strong>
        },
       
    ], [handleDetail]);

    return (
        <div className={styles.khoContainer}>
            <Breadcrumb className={styles.pageBreadcrumb}>
                <Breadcrumb.Item>
                    <HomeOutlined style={{ marginRight: 8 }} />
                    Trang chủ
                </Breadcrumb.Item>
                <Breadcrumb.Item>Quản lý công việc</Breadcrumb.Item>
                <Breadcrumb.Item>Điều khiển KPI</Breadcrumb.Item>
                <Breadcrumb.Item>KPI Hàng Tháng</Breadcrumb.Item>
            </Breadcrumb>

            <div className={styles.khoHeader}>
                <div className={styles.khoTitle}>
                    <Sliders size={28} strokeWidth={1.5} />
                    <div>
                        <h2 className={styles.khoTitleText}>KPI Hàng Tháng</h2>
                    </div>
                </div>

                <div className={styles.khoActions}>
                    <Button icon={<Key size={16} />} onClick={handleReactivateKPI} type="primary" ghost loading={reactivating}>
                        Kích hoạt lại KPI
                    </Button>
                    <Button type="dashed" icon={<RotateCw size={16} />} onClick={() => loadData()} loading={loading}>
                        Nạp lại
                    </Button>
                    <Dropdown menu={{ items: menuItems }} trigger={['click']} placement='bottomRight'>
                        <Button icon={<DownloadOutlined />}>Xuất file</Button>
                    </Dropdown>
                </div>
            </div>

            <Card className={`${styles.cardShadow} ${styles.customForm}`} bordered={false}>
                <Row gutter={[16, 16]}>
                    <Col xs={24} sm={12} md={8} lg={6}>
                        <Form.Item label="Chọn thông số tính lương" style={{ marginBottom: 0 }}>
                            <SelectLanTinhLuong
                                style={{ width: '100%' }}
                                value={searchPeriod}
                                onChange={setSearchPeriod}
                                placeholder="Chọn kỳ tính lương/KPI"
                                allowClear
                            />
                        </Form.Item>
                    </Col>

                    <Col xs={24} sm={12} md={8} lg={4}>
                        <Form.Item label="Mã nhân viên" style={{ marginBottom: 0 }}>
                            <Input
                                placeholder="Nhập mã nv..."
                                value={searchEmpCode}
                                onChange={e => setSearchEmpCode(e.target.value)}
                                allowClear
                            />
                        </Form.Item>
                    </Col>
                    <Col xs={24} sm={12} md={8} lg={5}>
                        <Form.Item label="Tên nhân viên" style={{ marginBottom: 0 }}>
                            <Input
                                placeholder="Nhập tên nv..."
                                value={searchEmpName}
                                onChange={e => setSearchEmpName(e.target.value)}
                                allowClear
                            />
                        </Form.Item>
                    </Col>
                    <Col xs={24} sm={12} md={8} lg={4}>
                        <Form.Item label="CMND" style={{ marginBottom: 0 }}>
                            <Input
                                placeholder="Nhập CMND..."
                                value={searchCMND}
                                onChange={e => setSearchCMND(e.target.value)}
                                allowClear
                            />
                        </Form.Item>
                    </Col>
                    <Col xs={24} sm={12} md={8} lg={5}>
                        <Form.Item label="Phòng ban" style={{ marginBottom: 0 }}>
                            <Select
                                style={{ width: '100%' }}
                                placeholder="Chọn phòng ban"
                                value={searchDepartment || undefined}
                                onChange={setSearchDepartment}
                                allowClear
                            >
                                <Option value="ma">ma[SANXUAT]</Option>
                                <Option value="SANXUAT">Phòng Sản Xuất[SOF]</Option>
                                <Option value="SX1">Sản Xuất 1[SANXUAT]</Option>
                            </Select>
                        </Form.Item>
                    </Col>
                </Row>
            </Card>

            <div className={styles.batchActionBar}>
                <span style={{ fontWeight: 600, color: '#197dd3', marginRight: 8 }}>
                    Thao tác hàng loạt:
                </span>
                <Button
                    icon={<FileText size={16} />}
                    onClick={() => {
                        const record = listData.find((item) => item.key === selectedRowKeys[0]);
                        if (record) handleDetail(record);
                    }}
                    disabled={selectedRowKeys.length !== 1}
                    type="primary"
                    ghost
                >
                    Chi tiết
                </Button>
                <Button
                    type="primary"
                    ghost
                    icon={<Lock size={16} />}
                    onClick={handleLock}
                    disabled={selectedRowKeys.length === 0}
                >
                    Khóa
                </Button>
                <Button
                    icon={<Unlock size={16} />}
                    onClick={handleUnlock}
                    disabled={selectedRowKeys.length === 0}
                >
                    Mở khóa
                </Button>
                <Popconfirm
                    title="Xóa mục chọn"
                    description="Xóa các mục đã chọn?"
                    onConfirm={handleDeleteMulti}
                    disabled={selectedRowKeys.length === 0}
                    okText="Xóa"
                    cancelText="Hủy"
                >
                    <Button danger icon={<Trash2 size={16} />} disabled={selectedRowKeys.length === 0}>
                        Xóa mục chọn
                    </Button>
                </Popconfirm>
                {selectedRowKeys.length > 0 && <Button onClick={() => setSelectedRowKeys([])}>Hủy chọn</Button>}
                <span style={{ marginLeft: 'auto', color: '#8c8c8c' }}>
                    Đã chọn <b>{selectedRowKeys.length}</b> dòng
                </span>
            </div>

            <Card className={styles.mainCard} bordered={false}>
                <Table
                    rowSelection={rowSelection}
                    columns={columns}
                    scroll={{ x: 'max-content' }}
                    dataSource={filteredList}
                    loading={loading}
                    className={styles.customTable}
                    pagination={{
                        pageSize: 20,
                        showSizeChanger: true,
                        pageSizeOptions: ['10', '20', '50', '100'],
                        showTotal: (total) => `Tổng số: ${total}`
                    }}
                />
            </Card>

            <Drawer
                title={`Chi tiết KPI - ${detailRecord?.lv099 || ''} (${detailRecord?.lv002 || ''})`}
                width={800}
                onClose={() => setDetailVisible(false)}
                open={detailVisible}
                destroyOnClose
                className={styles.khoDrawer}
            >
                {detailRecord && <ChiTietKPI parentRecord={detailRecord} />}
            </Drawer>
        </div>
    );
};

export default KPIHangThang;
