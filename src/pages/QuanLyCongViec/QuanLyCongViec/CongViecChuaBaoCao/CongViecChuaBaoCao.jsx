import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Breadcrumb,
    Button,
    Card,
    Col,
    DatePicker,
    Divider,
    Drawer,
    Dropdown,
    Form,
    Input,
    message,
    Popconfirm,
    Row,
    Select,
    Space,
    Table,
    Tag,
    Tooltip,
    Typography,
} from 'antd';
import {
    FileExcelOutlined,
    FileWordOutlined,
    IeOutlined,
    ReloadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { Calendar, CheckCircle, Edit, Plus, RotateCcw, Search, Trash2 } from 'lucide-react';
import { callApi } from '../../../../services/apiServices';
import styles from './styles.module.css';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import ColumnSelector from '../../../../components/common/ColumnSelector/ColumnSelector';
import useSavedTablePreferences, { sortRowsByPreference } from '../../../../hooks/useSavedTablePreferences';

const { Text } = Typography;

const toOptions = (items) =>
    (Array.isArray(items) ? items : []).map((item) => ({
        value: item.id ?? item.lv001,
        label: item.name ?? item.lv002 ?? item.lv003 ?? item.id,
    }));

const CongViecChuaBaoCao = () => {
    const [form] = Form.useForm();
    const [editForm] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [lookups, setLookups] = useState({});
    const [rows, setRows] = useState([]);
    const [filteredList, setFilteredList] = useState([]);
    const [searchText, setSearchText] = useState('');
    const [selectedRowKeys, setSelectedRowKeys] = useState([]);

    // CRUD Drawer & editing states (Ready to use when uncommented)
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);

    const pageTitle = 'Công việc chưa báo cáo';

    // === FETCH LOOKUPS ===
    // Reusing cr_lv0158 lookups for optimal resource usage
    const loadLookups = useCallback(async () => {
        try {
            const data = await callApi('cr_lv0158', 'loadLookups', {});
            if (data?.success !== false) {
                setLookups(data || {});
            }
        } catch (error) {
            console.error('Error loading lookups:', error);
            message.error('Không thể tải danh mục cấu hình.');
        }
    }, []);

    // === BUILD PAYLOAD ===
    const buildPayload = useCallback(() => {
        const values = form.getFieldsValue();
        return {
            txtDateFrom: values.dateRange?.[0] ? values.dateRange[0].format('DD/MM/YYYY') : '',
            txtDateTo: values.dateRange?.[1] ? values.dateRange[1].format('DD/MM/YYYY') : '',
            txtlv008: values.employeeId || '',
            txtDepID: values.departmentId || '',
            txtlv013: values.status ?? '0', // Default: '0' (Chưa báo cáo)
            txtlv009: values.warningStatus ?? '',
        };
    }, [form]);

    // === LOAD DATA ===
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const payload = buildPayload();
            const data = await callApi('cr_lv0211', 'loadDataView', payload);
            if (data?.success === false) {
                message.error(data.message || 'Không thể tải danh sách.');
                setRows([]);
                setFilteredList([]);
                return;
            }
            const nextRows = data?.rows || data?.data || [];
            // Map row keys for Table component
            const mappedRows = nextRows.map((row, index) => ({
                ...row,
                key: row.key || row.employeeId + '_' + row.date + '_' + index,
            }));
            setRows(mappedRows);
            setFilteredList(mappedRows);
        } catch (error) {
            console.error('Failed to load unreported works:', error);
            message.error('Không thể kết nối đến máy chủ.');
        } finally {
            setLoading(false);
        }
    }, [buildPayload]);

    useEffect(() => {
        // Default date range: yesterday to today
        form.setFieldsValue({
            dateRange: [dayjs().subtract(1, 'day'), dayjs()],
            status: '0',
        });
        loadLookups();
    }, [form, loadLookups]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // === LOCAL SEARCH ===
    useEffect(() => {
        if (!searchText) {
            setFilteredList(rows);
            return;
        }
        const filtered = rows.filter((item) =>
            (item.employeeName || '').toLowerCase().includes(searchText.toLowerCase()) ||
            (item.departmentName || '').toLowerCase().includes(searchText.toLowerCase())
        );
        setFilteredList(filtered);
    }, [searchText, rows]);

    // === EXPORT FUNCTIONS (Inherited from HDLDKeToan.jsx) ===
    const getDataForExport = () => {
        if (!filteredList || filteredList.length === 0) return [];
        return filteredList.map((item, index) => ({
            STT: index + 1,
            'Ngày báo cáo': item.date ? dayjs(item.date).format('DD/MM/YYYY') : '',
            'Phòng ban': item.departmentName || '',
            'Tên nhân viên': item.employeeName || '',
            'Kết quả': item.statusText || '',
            'Nội dung báo cáo': item.note || '',
        }));
    };

    const createHTMLTable = (data, title) => {
        if (data.length === 0) return '';
        const headers = Object.keys(data[0]);
        let tableHTML = `
        <h2 style="text-align: center;">${title}</h2>
        <table border="1" style="border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; font-size: 12px;">
            <thead>
                <tr style="background-color: #1890ff; color: white; font-weight: bold; text-align: center;">
                    ${headers.map((h) => `<th style="padding: 8px;">${h}</th>`).join('')}
                </tr>
            </thead>
            <tbody>`;
        data.forEach((row) => {
            tableHTML += '<tr>';
            headers.forEach((header) => {
                tableHTML += `<td style="padding: 8px; text-align: center;">${row[header] !== undefined ? row[header] : ''}</td>`;
            });
            tableHTML += '</tr>';
        });
        tableHTML += '</tbody></table>';
        return tableHTML;
    };

    const exportToExcel = () => {
        const data = getDataForExport();
        if (data.length === 0) {
            message.warning('Không có dữ liệu để xuất!');
            return;
        }
        const worksheet = XLSX.utils.json_to_sheet(data);
        const fitToColumn = (d) =>
            Object.keys(d[0]).map((key) => ({
                wch: Math.max(key.length, ...d.map((row) => (row[key] ? row[key].toString().length : 0))) + 2,
            }));
        worksheet['!cols'] = fitToColumn(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
        XLSX.writeFile(workbook, `${pageTitle}.xlsx`);
        message.success('Xuất tập tin file Excel thành công!');
    };

    const exportToWord = () => {
        const data = getDataForExport();
        if (data.length === 0) {
            message.warning('Không có dữ liệu để xuất!');
            return;
        }
        const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset='utf-8'><title>${pageTitle}</title></head>
        <body>${createHTMLTable(data, pageTitle.toUpperCase())}</body></html>`;
        const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
        saveAs(blob, `${pageTitle}.doc`);
        message.success('Xuất tập tin file Word thành công!');
    };

    const exportToWeb = () => {
        const data = getDataForExport();
        if (data.length === 0) {
            message.warning('Không có dữ liệu để xuất!');
            return;
        }
        const html = `<html><head><meta charset='utf-8'><title>${pageTitle}</title>
        <style>body{font-family:Arial,sans-serif;padding:20px}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border:1px solid #ddd;padding:8px;text-align:center}th{background-color:#1890ff;color:white}tr:nth-child(even){background-color:#f2f2f2}tr:hover{background-color:#e6f7ff}</style>
        </head><body>${createHTMLTable(data, pageTitle.toUpperCase())}</body></html>`;
        const blob = new Blob(['\ufeff', html], { type: 'text/html' });
        saveAs(blob, `${pageTitle}.html`);
        message.success('Xuất tập tin file Web thành công!');
    };

    const exportMenuItems = [
        { key: 'excel', label: 'Tạo tập tin Excel', icon: <FileExcelOutlined />, onClick: exportToExcel },
        { key: 'word', label: 'Tạo tập tin Word', icon: <FileWordOutlined />, onClick: exportToWord },
        { key: 'web', label: 'Tạo tập tin Web', icon: <IeOutlined />, onClick: exportToWeb },
    ];

    // === CRUD IMPLEMENTATION (Fully built, commented out in JSX for future use) ===
    const selectedIds = useMemo(() => {
        return selectedRowKeys.map((key) => {
            const row = rows.find((r) => r.key === key);
            return row?.employeeId; // Or specific report ID if mapped
        }).filter(Boolean);
    }, [rows, selectedRowKeys]);

    const runBatchAction = async (func, successMessage) => {
        if (selectedRowKeys.length === 0) {
            message.warning('Chọn ít nhất một dòng trước khi thao tác.');
            return;
        }
        setLoading(true);
        try {
            const data = await callApi('cr_lv0211', func, { ids: selectedRowKeys });
            if (data?.success) {
                message.success(successMessage || data.message);
                setSelectedRowKeys([]);
                loadData();
            } else {
                message.error(data?.message || 'Thao tác không thành công.');
            }
        } catch (error) {
            console.error('Error running batch action:', error);
            message.error('Lỗi khi thực hiện thao tác.');
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = () => {
        setEditingRecord(null);
        editForm.resetFields();
        editForm.setFieldsValue({
            lv013: '0',
            lv005: dayjs(),
        });
        setDrawerOpen(true);
    };

    const handleEdit = (record) => {
        setEditingRecord(record);
        editForm.setFieldsValue({
            lv001: record.key,
            lv008: record.employeeId,
            lv005: record.date ? dayjs(record.date) : null,
            lv011: record.statusText,
            lv012: record.note,
            lv013: String(record.hasReport),
        });
        setDrawerOpen(true);
    };

    const handleSave = async () => {
        try {
            const values = await editForm.validateFields();
            const payload = {
                ...values,
                lv005: values.lv005 ? values.lv005.format('DD/MM/YYYY HH:mm:ss') : '',
            };
            const method = editingRecord ? 'update' : 'insert';
            const data = await callApi('cr_lv0211', method, payload);
            if (data?.success) {
                message.success(data.message || 'Lưu thành công.');
                setEditingRecord(null);
                setDrawerOpen(false);
                editForm.resetFields();
                loadData();
            } else {
                message.error(data?.message || 'Lưu thất bại.');
            }
        } catch (error) {
            console.error('Validation error:', error);
        }
    };

    // === TABLE COLUMNS ===
    const columns = [
        {
            title: 'STT',
            dataIndex: 'stt',
            key: 'stt',
            width: 80,
            align: 'center',
            render: (_, __, index) => index + 1,
        },
        {
            title: 'Ngày báo cáo',
            dataIndex: 'date',
            key: 'date',
            width: 140,
            align: 'center',
            render: (date) => (date ? dayjs(date).format('DD/MM/YYYY') : ''),
        },
        {
            title: 'Phòng ban',
            dataIndex: 'departmentName',
            key: 'departmentName',
            width: 200,
        },
        {
            title: 'Tên nhân viên',
            dataIndex: 'employeeName',
            key: 'employeeName',
            width: 220,
        },
        {
            title: 'Kết quả',
            dataIndex: 'statusText',
            key: 'statusText',
            width: 160,
            align: 'center',
            render: (value, record) =>
                record.hasReport === 1 || record.hasReport === true ? (
                    <Tag color="green">{value || 'Đã báo cáo'}</Tag>
                ) : (
                    <Tag color="red">{value || 'Chưa báo cáo'}</Tag>
                ),
        },
        {
            title: 'Nội dung báo cáo',
            dataIndex: 'note',
            key: 'note',
            ellipsis: true,
        },
    ];

    const {
        displayColumns,
        hiddenKeys,
        toggleableColumns,
        columnOrder,
        columnOrderValues,
        sortOrder,
        sortFieldOrder,
        sortFieldOptions,
        applyColumnSettings,
    } = useSavedTablePreferences({
        tableName: 'cr_lv0211',
        allColumns: columns,
        requiredKeys: ['stt', 'date', 'employeeName', 'statusText'],
        defaultFieldList: 'date,departmentName,employeeName,statusText,note',
        currentPage: 1,
        pageSize: 20,
    });

    const displayRows = useMemo(() => sortRowsByPreference(filteredList, sortOrder, sortFieldOrder), [filteredList, sortOrder, sortFieldOrder]);

    return (
        <div className={styles.khoContainer}>
            {/* Breadcrumb Section */}
            <div className={styles.pageBreadcrumb}>
                <Breadcrumb
                    items={[
                        { title: 'Quản lý công việc' },
                        { title: 'Công việc chưa báo cáo' },
                    ]}
                />
            </div>

            {/* Main Content Card */}
            <Card className={styles.mainCard}>
                {/* Header Block */}
                <div className={styles.khoHeader}>
                    <div className={styles.khoTitle}>
                        <Calendar size={24} />
                        <Typography.Title level={3} className={styles.khoTitleText}>
                            Công việc chưa báo cáo
                        </Typography.Title>
                    </div>
                    <div className={styles.khoActions}>
                        {/* Local quick search input */}
                        <Input
                            placeholder="Tìm nhanh..."
                            prefix={<Search size={16} />}
                            className={styles.khoSearch}
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            allowClear
                        />
                        <Dropdown menu={{ items: exportMenuItems }} trigger={['click']}>
                            <Button type="primary" className={styles.exportBtn}>
                                Xuất tập tin
                            </Button>
                        </Dropdown>
                        <ColumnSelector
                            allColumns={columns}
                            toggleableColumns={toggleableColumns}
                            hiddenKeys={hiddenKeys}
                            showSort
                            sortOrder={sortOrder}
                            sortFieldOrder={sortFieldOrder}
                            sortFieldOptions={sortFieldOptions}
                            columnOrder={columnOrder}
                            columnOrderValues={columnOrderValues}
                            showColumnOrder
                            applySettings={async (...args) => {
                                try {
                                    await applyColumnSettings(...args);
                                    message.success('Da cap nhat cau hinh hien thi');
                                } catch (error) {
                                    console.error('Error saving column preferences:', error);
                                    message.error(error.message || 'Khong the luu cau hinh hien thi');
                                }
                            }}
                        />
                    </div>
                </div>

                {/* Filter Section */}
                <div className={styles.filterSection}>
                    <Form form={form} layout="vertical">
                        <Row gutter={16}>
                            <Col xs={24} lg={6}>
                                <Form.Item label="Từ ngày - Đến ngày" name="dateRange">
                                    <DatePicker.RangePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12} lg={5}>
                                <Form.Item label="Nhân viên" name="employeeId">
                                    <Select
                                        allowClear
                                        showSearch
                                        placeholder="Chọn nhân viên"
                                        optionFilterProp="label"
                                        options={toOptions(lookups.employees)}
                                    />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12} lg={5}>
                                <Form.Item label="Phòng ban" name="departmentId">
                                    <Select
                                        allowClear
                                        showSearch
                                        placeholder="Chọn phòng ban"
                                        optionFilterProp="label"
                                        options={toOptions(lookups.departments)}
                                    />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12} lg={4}>
                                <Form.Item label="Kết quả" name="status">
                                    <Select
                                        placeholder="Chọn trạng thái"
                                        options={[
                                            { value: '0', label: 'Chưa báo cáo' },
                                            { value: '1', label: 'Đã báo cáo' },
                                            { value: '', label: 'Tất cả' },
                                        ]}
                                    />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12} lg={4}>
                                <Form.Item label="Trạng thái cảnh báo" name="warningStatus">
                                    <Select
                                        allowClear
                                        placeholder="Tất cả"
                                        options={toOptions(lookups.warningStatuses)}
                                    />
                                </Form.Item>
                            </Col>
                        </Row>
                        <Row justify="end" style={{ marginTop: 8 }}>
                            <Col>
                                <Space>
                                    <Button
                                        type="primary"
                                        icon={<Search size={16} />}
                                        onClick={loadData}
                                        loading={loading}
                                    >
                                        Tìm kiếm
                                    </Button>
                                    <Button
                                        icon={<ReloadOutlined />}
                                        onClick={() => {
                                            form.resetFields();
                                            form.setFieldsValue({
                                                dateRange: [dayjs().subtract(1, 'day'), dayjs()],
                                                status: '0',
                                            });
                                            setSearchText('');
                                            loadData();
                                        }}
                                    >
                                        Làm mới
                                    </Button>
                                </Space>
                            </Col>
                        </Row>
                    </Form>
                </div>

                {/* Batch Action Bar - COMMENTED OUT AS REQUESTED, UNCOMMENT TO ENABLE */}
                {/* 
                <div className={styles.batchActionBar}>
                    <span className={styles.batchActionTitle}>Thao tác hàng loạt:</span>
                    <Button type="primary" ghost icon={<Plus size={16} />} onClick={handleAdd}>
                        Thêm mới
                    </Button>
                    <Button
                        type="primary"
                        ghost
                        icon={<Edit size={16} />}
                        disabled={selectedRowKeys.length !== 1}
                        onClick={() => {
                            const record = rows.find((r) => r.key === selectedRowKeys[0]);
                            if (record) handleEdit(record);
                        }}
                    >
                        Chỉnh sửa
                    </Button>
                    <Button
                        icon={<CheckCircle size={16} />}
                        disabled={selectedRowKeys.length === 0}
                        onClick={() => runBatchAction('approve', 'Đã duyệt báo cáo thành công.')}
                    >
                        Duyệt
                    </Button>
                    <Button
                        icon={<RotateCcw size={16} />}
                        disabled={selectedRowKeys.length === 0}
                        onClick={() => runBatchAction('unapprove', 'Đã bỏ duyệt báo cáo.')}
                    >
                        Bỏ duyệt
                    </Button>
                    <Popconfirm
                        title="Bạn có chắc muốn xóa báo cáo đã chọn?"
                        onConfirm={() => runBatchAction('delete', 'Đã xóa báo cáo thành công.')}
                        disabled={selectedRowKeys.length === 0}
                    >
                        <Button danger icon={<Trash2 size={16} />} disabled={selectedRowKeys.length === 0}>
                            Xóa đã chọn
                        </Button>
                    </Popconfirm>
                    <span className={styles.selectedCount}>
                        Đã chọn <b>{selectedRowKeys.length}</b> dòng
                    </span>
                </div>
                */}

                {/* Data Table */}
                <Table
                    className={styles.dataTable}
                    loading={loading}
                    // rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }} // COMMENTED OUT FOR READ-ONLY VIEW
                    columns={displayColumns}
                    dataSource={displayRows}
                    size="small"
                    pagination={{
                        pageSize: 20,
                        showSizeChanger: true,
                        showTotal: (total) => `${total} dòng`,
                    }}
                />
            </Card>

            {/* CRUD Drawer - COMMENTED OUT AS REQUESTED, UNCOMMENT TO ENABLE */}
            {/* 
            <Drawer
                title={editingRecord ? 'Chỉnh sửa báo cáo công việc' : 'Thêm báo cáo công việc'}
                open={drawerOpen}
                onClose={() => {
                    setDrawerOpen(false);
                    setEditingRecord(null);
                }}
                width={720}
                className={styles.khoDrawer}
                footer={
                    <Space className={styles.drawerFooterActions} style={{ float: 'right' }}>
                        <Button
                            onClick={() => {
                                setDrawerOpen(false);
                                setEditingRecord(null);
                            }}
                        >
                            Hủy
                        </Button>
                        <Button type="primary" onClick={handleSave}>
                            Lưu
                        </Button>
                    </Space>
                }
            >
                <Form form={editForm} layout="vertical">
                    <Row gutter={12}>
                        <Col span={12}>
                            <Form.Item label="Nhân viên" name="lv008" rules={[{ required: true, message: 'Vui lòng chọn nhân viên' }]}>
                                <Select dropdownMatchSelectWidth={false}showSearch optionFilterProp="label" options={toOptions(lookups.employees)} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label="Thời gian" name="lv005" rules={[{ required: true, message: 'Vui lòng chọn thời gian' }]}>
                                <DatePicker showTime format="DD/MM/YYYY HH:mm:ss" style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                        <Col span={24}>
                            <Form.Item label="Nội dung công việc" name="lv012" rules={[{ required: true, message: 'Vui lòng nhập nội dung công việc' }]}>
                                <Input.TextArea rows={4} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label="Kết quả" name="lv011">
                                <Input />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label="Trạng thái" name="lv013" rules={[{ required: true }]}>
                                <Select
                                    options={[
                                        { value: '0', label: 'Chưa báo cáo' },
                                        { value: '1', label: 'Đã báo cáo' },
                                    ]}
                                />
                            </Form.Item>
                        </Col>
                    </Row>
                </Form>
            </Drawer>
            */}
        </div>
    );
};

export default CongViecChuaBaoCao;
