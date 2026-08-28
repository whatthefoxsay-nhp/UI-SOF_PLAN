import { FileExcelOutlined, FileWordOutlined, IeOutlined, ReloadOutlined, SettingOutlined } from '@ant-design/icons';
import {
    Breadcrumb,
    Button,
    Card,
    Col,
    DatePicker,
    Divider,
    Drawer,
    Form,
    Input,
    message,
    Modal,
    Popconfirm,
    Row,
    Select,
    Space,
    Table,
    Tag,
    Tooltip,
    Checkbox,
    Dropdown,
} from 'antd';
import dayjs from 'dayjs';
import { Calendar, Edit, FileText, Lock, Plus, Search, Trash2, Unlock, AlertCircle, ArrowLeftRight, CheckSquare } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { execCRUD, lv_LoadDataAPI } from '../../../../services/apiServices';
import styles from './styles.module.css';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import ColumnSelector from '../../../../components/common/ColumnSelector/ColumnSelector';
import useSavedTablePreferences, { sortRowsByPreference } from '../../../../hooks/useSavedTablePreferences';

const { Search: SearchInput } = Input;
const { Option } = Select;

const CongViecPhaiLamGiaoViec = () => {
    const [tasksList, setTasksList] = useState([]);
    const [filteredList, setFilteredList] = useState([]);
    const [searchText, setSearchText] = useState('');
    const [loading, setLoading] = useState(false);
    const [selectedRowKeys, setSelectedRowKeys] = useState([]);

    // Filters State
    const [fromDate, setFromDate] = useState(null);
    const [toDate, setToDate] = useState(null);
    const [selectedEmployee, setSelectedEmployee] = useState('');
    const [selectedDepartment, setSelectedDepartment] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('');
    const [dayExpire, setDayExpire] = useState('');
    const [isAll, setIsAll] = useState(false);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [totalTasks, setTotalTasks] = useState(0);
    const pageSize = 10;

    // Modals State
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [form] = Form.useForm();

    // Dropdown options
    const [nhanVienList, setNhanVienList] = useState([]);
    const [phongBanList, setPhongBanList] = useState([]);
    const [keHoachList, setKeHoachList] = useState([]);

    // Category / Object options for quick inputs
    const [objectList, setObjectList] = useState([]);
    const [fetchingObjects, setFetchingObjects] = useState(false);

    const vclass = 'cr_lv0216';

    // === FETCH FUNCTIONS ===
    const loadData = useCallback(async () => {
        setLoading(true);
        setSelectedRowKeys([]);
        const params = {
            fromDate: fromDate ? fromDate.format('YYYY-MM-DD') : '',
            toDate: toDate ? toDate.format('YYYY-MM-DD') : '',
            employeeId: selectedEmployee,
            departmentId: selectedDepartment,
            status: selectedStatus,
            dayExpire: dayExpire,
            isAll: isAll ? 1 : 0,
            page: currentPage,
            limit: pageSize
        };
        try {
            const res = await lv_LoadDataAPI(vclass, 'loadGrid', params);
            if (res && res.success) {
                const mapped = (res.data || []).map((item) => ({
                    ...item,
                    key: item.lv001,
                }));
                setTasksList(mapped);
                setFilteredList(mapped);
                setTotalTasks(res.total || 0);
            } else {
                setTasksList([]);
                setFilteredList([]);
                setTotalTasks(0);
            }
        } catch (error) {
            console.error('Error loading tasks:', error);
            message.error('Không thể tải danh sách công việc giao việc');
        } finally {
            setLoading(false);
        }
    }, [fromDate, toDate, selectedEmployee, selectedDepartment, selectedStatus, dayExpire, isAll, currentPage]);

    // Load dropdown options
    const loadDropdowns = useCallback(async () => {
        try {
            // Load Employees
            const empData = await lv_LoadDataAPI('hr_lv0020', 'loadNhanVien');
            if (empData && Array.isArray(empData)) {
                setNhanVienList(empData);
            }

            // Load Departments
            const deptData = await lv_LoadDataAPI('hr_lv0002', 'loadPhongBan');
            if (deptData && Array.isArray(deptData)) {
                setPhongBanList(deptData);
            }

            // Load Plans
            const planData = await lv_LoadDataAPI('cr_lv0004', 'loadDataView');
            if (planData && Array.isArray(planData)) {
                setKeHoachList(planData);
            }
        } catch (error) {
            console.error('Error loading dropdown lists:', error);
        }
    }, []);

    useEffect(() => {
        loadDropdowns();
    }, [loadDropdowns]);

    useEffect(() => {
        loadData();
    }, [loadData, currentPage]);

    // Handle Local Client Search
    const handleSearch = useCallback(
        (s1) => {
            const filtered = tasksList.filter((item) => {
                return (
                    (item.lv004?.toLowerCase() || '').includes(s1.toLowerCase()) ||
                    (item.assignee_name?.toLowerCase() || '').includes(s1.toLowerCase()) ||
                    (item.plan_name?.toLowerCase() || '').includes(s1.toLowerCase()) ||
                    (item.lv001?.toLowerCase() || '').includes(s1.toLowerCase())
                );
            });
            setFilteredList(filtered);
        },
        [tasksList],
    );

    useEffect(() => {
        handleSearch(searchText);
    }, [searchText, handleSearch]);

    // Load category object lists when category type changes in add/edit form
    const handleCategoryTypeChange = async (value) => {
        form.setFieldsValue({ lv014: '' });
        if (!value) {
            setObjectList([]);
            return;
        }
        setFetchingObjects(true);
        try {
            let res = [];
            switch (value) {
                case 'EMP':
                    res = await lv_LoadDataAPI('hr_lv0020', 'loadNhanVien');
                    break;
                case 'SUP':
                    // WH Supplier
                    res = await lv_LoadDataAPI('wh_lv0003', 'load');
                    break;
                case 'CUS':
                    // SL Customer
                    res = await lv_LoadDataAPI('sl_lv0001', 'load');
                    break;
                case 'DEP':
                    res = await lv_LoadDataAPI('hr_lv0002', 'loadPhongBan');
                    break;
                case 'HR':
                    // Period ID
                    res = await lv_LoadDataAPI('tc_lv0013', 'load');
                    break;
            }
            if (res && Array.isArray(res)) {
                setObjectList(res.map(item => ({
                    label: item.lv002 || item.ten || item.name || item.lv001,
                    value: item.lv001
                })));
            } else {
                setObjectList([]);
            }
        } catch (error) {
            console.error('Error fetching objects by type:', error);
            setObjectList([]);
        } finally {
            setFetchingObjects(false);
        }
    };

    // Add and Edit actions
    const handleAddTask = () => {
        setEditingTask(null);
        form.resetFields();
        form.setFieldsValue({
            lv003: 'QUOT',
            ngayHoanThanh: dayjs(),
            gioHoanThanh: '17:00:00',
            lv011: 1, // active
            lv027: 0, // draft status
            lv013: 'CUS'
        });
        setObjectList([]);
        setIsModalVisible(true);
    };

    const handleEditTask = async (record) => {
        setEditingTask(record);
        form.setFieldsValue({
            ...record,
            ngayHoanThanh: record.ngayHoanThanh ? dayjs(record.ngayHoanThanh) : null,
        });
        await handleCategoryTypeChange(record.lv013);
        form.setFieldsValue({ lv014: record.lv014 });
        setIsModalVisible(true);
    };

    const handleSaveTask = async (values) => {
        try {
            const dateStr = values.ngayHoanThanh ? values.ngayHoanThanh.format('YYYY-MM-DD') : '';
            const fullDeadline = dateStr ? `${dateStr} ${values.gioHoanThanh || '17:00:00'}` : '';

            const payload = {
                ...values,
                lv005: fullDeadline,
                lv011: 1, // active
            };
            delete payload.ngayHoanThanh;
            delete payload.gioHoanThanh;

            let res;
            if (editingTask) {
                res = await execCRUD(vclass, 'update', { ...payload, lv001: editingTask.lv001 });
            } else {
                res = await execCRUD(vclass, 'add', payload);
            }

            if (res.success) {
                message.success(res.message || 'Lưu công việc thành công!');
                setIsModalVisible(false);
                loadData();
            } else {
                message.error(res.message || 'Lưu công việc thất bại.');
            }
        } catch (error) {
            console.error('Error saving task:', error);
            message.error('Đã xảy ra lỗi khi lưu công việc.');
        }
    };

    const handleDeleteTask = async (ids) => {
        try {
            const res = await execCRUD(vclass, 'delete', { ids: Array.isArray(ids) ? ids : [ids] });
            if (res.success) {
                message.success(res.message);
                setSelectedRowKeys([]);
                loadData();
            } else {
                message.error(res.message);
            }
        } catch (error) {
            console.error('Error deleting task:', error);
            message.error('Lỗi khi xóa công việc.');
        }
    };

    // Status Transitions
    const handleProposeApproval = async (ids) => {
        try {
            const res = await execCRUD(vclass, 'apr', { ids: Array.isArray(ids) ? ids : [ids] });
            if (res.success) {
                message.success(res.message || 'Đề xuất duyệt thành công!');
                setSelectedRowKeys([]);
                loadData();
            } else {
                message.error(res.message || 'Đề xuất duyệt thất bại.');
            }
        } catch (error) {
            console.error('Error proposing task approval:', error);
            message.error('Đã xảy ra lỗi.');
        }
    };

    const handleCompleteTask = async (ids) => {
        try {
            const res = await execCRUD(vclass, 'apr_khoa', { ids: Array.isArray(ids) ? ids : [ids] });
            if (res.success) {
                message.success(res.message || 'Khóa/Hoàn thành công việc thành công!');
                setSelectedRowKeys([]);
                loadData();
            } else {
                message.error(res.message || 'Hoàn thành công việc thất bại.');
            }
        } catch (error) {
            console.error('Error completing task:', error);
            message.error('Đã xảy ra lỗi.');
        }
    };

    const handleReturnTask = async (ids) => {
        try {
            const res = await execCRUD(vclass, 'unapr', { ids: Array.isArray(ids) ? ids : [ids] });
            if (res.success) {
                message.success(res.message || 'Đã trả lại công việc!');
                setSelectedRowKeys([]);
                loadData();
            } else {
                message.error(res.message || 'Trả lại công việc thất bại.');
            }
        } catch (error) {
            console.error('Error returning task:', error);
            message.error('Đã xảy ra lỗi.');
        }
    };

    // === EXPORT FUNCTIONS ===
    const getDataForExport = () => {
        if (!filteredList || filteredList.length === 0) return [];
        return filteredList.map((item, index) => ({
            STT: index + 1,
            'Mã tự động': item.lv001 || '',
            'Tên kế hoạch': item.plan_name || '',
            'Nội dung công việc': item.lv004 || '',
            'Thời hạn hoàn thành': item.lv005 || '',
            'Người thực hiện': item.assignee_name || '',
            'Người kiểm tra': item.lv007 || '',
            'Người giao việc': item.assigner_name || '',
            'Ngày giao': item.ngayGiao || '',
            'Mã công văn': item.lv089 || '',
            'Trạng thái': item.lv027 === '1' ? 'Đợi duyệt' : (item.lv027 === '2' ? 'Hoàn thành' : 'Đang thực hiện')
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
        XLSX.writeFile(workbook, `CongViecPhaiLamGiaoViec.xlsx`);
        message.success('Đã xuất Excel thành công!');
    };

    const exportToWord = () => {
        const data = getDataForExport();
        if (data.length === 0) {
            message.warning('Không có dữ liệu để xuất!');
            return;
        }
        const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset='utf-8'><title>Công Việc Phải Làm Giao Việc</title></head>
        <body>${createHTMLTable(data, 'CÔNG VIỆC PHẢI LÀM GIAO VIỆC')}</body></html>`;
        const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
        saveAs(blob, `CongViecPhaiLamGiaoViec.doc`);
        message.success('Đã xuất Word thành công!');
    };

    const exportToWeb = () => {
        const data = getDataForExport();
        if (data.length === 0) {
            message.warning('Không có dữ liệu để xuất!');
            return;
        }
        const html = `<html><head><meta charset='utf-8'><title>Công Việc Phải Làm Giao Việc</title>
        <style>body{font-family:Arial,sans-serif;padding:20px}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border:1px solid #ddd;padding:8px;text-align:center}th{background-color:#1890ff;color:white}tr:nth-child(even){background-color:#f2f2f2}tr:hover{background-color:#e6f7ff}</style>
        </head><body>${createHTMLTable(data, 'CÔNG VIỆC PHẢI LÀM GIAO VIỆC')}</body></html>`;
        const blob = new Blob(['\ufeff', html], { type: 'text/html' });
        saveAs(blob, `CongViecPhaiLamGiaoViec.html`);
        message.success('Đã xuất file Web thành công!');
    };

    const menuItems = [
        { key: '1', label: 'Tạo tập tin Excel', icon: <FileExcelOutlined />, onClick: exportToExcel },
        { key: '2', label: 'Tạo tập tin Word', icon: <FileWordOutlined />, onClick: exportToWord },
        { key: '3', label: 'Tạo tập tin Web', icon: <IeOutlined />, onClick: exportToWeb },
    ];

    // Table Column Configurations
    const columns = [
        {
            title: 'STT',
            key: 'stt',
            width: 60,
            align: 'center',
            render: (_, __, index) => (currentPage - 1) * pageSize + index + 1,
        },
        {
            title: 'Mã tự động',
            dataIndex: 'lv001',
            key: 'lv001',
            width: 110,
        },
        {
            title: 'Tên kế hoạch',
            dataIndex: 'plan_name',
            key: 'plan_name',
            ellipsis: true,
            width: 180,
        },
        {
            title: 'Nội dung công việc',
            dataIndex: 'lv004',
            key: 'lv004',
            ellipsis: true,
            width: 250,
        },
        {
            title: 'Thời hạn hoàn thành',
            key: 'lv005',
            width: 170,
            render: (_, record) => {
                const isOverdue = dayjs().isAfter(dayjs(record.lv005)) && record.lv027 !== '2';
                return (
                    <span style={{ color: isOverdue ? '#e74c3c' : 'inherit', fontWeight: isOverdue ? 600 : 'normal' }}>
                        {record.lv005 ? dayjs(record.lv005).format('DD/MM/YYYY HH:mm:ss') : ''}
                        {isOverdue && <span style={{ fontSize: '11px', marginLeft: '4px' }}>(Quá hạn)</span>}
                    </span>
                );
            }
        },
        {
            title: 'Người thực hiện',
            dataIndex: 'assignee_name',
            key: 'assignee_name',
            width: 200,
        },
        {
            title: 'Người kiểm tra',
            dataIndex: 'lv007',
            key: 'lv007',
            width: 200,
            render: (val) => nhanVienList.find(e => e.lv001 === val)?.lv002 || val || ''
        },
        {
            title: 'Người giao việc',
            dataIndex: 'assigner_name',
            key: 'assigner_name',
            width: 200,
        },
        {
            title: 'Ngày giao',
            dataIndex: 'ngayGiao',
            key: 'ngayGiao',
            width: 120,
            render: (val) => val ? dayjs(val).format('DD/MM/YYYY') : ''
        },
        {
            title: 'Mã công văn',
            dataIndex: 'lv089',
            key: 'lv089',
            width: 120,
        },
        {
            title: 'Trạng thái',
            dataIndex: 'lv027',
            key: 'lv027',
            width: 130,
            align: 'center',
            render: (status) => {
                if (status === '1') {
                    return <Tag color="warning" icon={<AlertCircle size={12} style={{ marginRight: 4 }} />}>Đợi duyệt</Tag>;
                } else if (status === '2') {
                    return <Tag color="success" icon={<Lock size={12} style={{ marginRight: 4 }} />}>Hoàn thành</Tag>;
                } else {
                    return <Tag color="processing" icon={<Unlock size={12} style={{ marginRight: 4 }} />}>Đang tiến hành</Tag>;
                }
            }
        }
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
        tableName: vclass,
        allColumns: columns,
        requiredKeys: ['stt', 'lv001', 'plan_name', 'lv004', 'lv005', 'assignee_name', 'lv027'],
        defaultFieldList: 'lv001,plan_name,lv004,lv005,assignee_name,lv007,assigner_name,ngayGiao,lv089,lv027',
        currentPage,
        pageSize,
    });

    const displayRows = useMemo(() => sortRowsByPreference(filteredList, sortOrder, sortFieldOrder), [filteredList, sortOrder, sortFieldOrder]);

    return (
        <div className={styles.khoContainer}>
            <Breadcrumb className={styles.pageBreadcrumb}>
                <Breadcrumb.Item>Quản lý công việc</Breadcrumb.Item>
                <Breadcrumb.Item>Công việc phải làm giao việc</Breadcrumb.Item>
            </Breadcrumb>

            <div className={styles.khoHeader}>
                <div className={styles.khoTitle}>
                    <Calendar size={28} />
                    <div>
                        <h2 className={styles.khoTitleText}>Công Việc Phải Làm Giao Việc</h2>
                    </div>
                </div>

                <div className={styles.khoActions}>
                    <SearchInput
                        placeholder="Tìm kiếm công việc, nhân viên..."
                        allowClear
                        enterButton={<Search size={14} />}
                        className={styles.khoSearch}
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                    />

                    <Dropdown menu={{ items: menuItems }} trigger={['click']}>
                        <Button icon={<SettingOutlined />}>Tải tệp tin</Button>
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

                    <Button type="primary" icon={<Plus size={16} />} onClick={handleAddTask}>
                        Thêm công việc
                    </Button>
                </div>
            </div>

            <Divider style={{ margin: '16px 0' }} />

            <div className={styles.batchActionBar}>
                <span style={{ fontWeight: 600, color: '#197dd3', marginRight: 8 }}>
                    Thao tác hàng loạt:
                </span>
                <Button
                    icon={<Edit size={16} />}
                    disabled={selectedRowKeys.length !== 1 || tasksList.find(item => item.key === selectedRowKeys[0])?.lv027 === '2'}
                    onClick={() => {
                        const selectedRecord = tasksList.find(item => item.key === selectedRowKeys[0]);
                        if (selectedRecord) handleEditTask(selectedRecord);
                    }}
                    type="primary"
                    ghost
                >
                    Chỉnh sửa
                </Button>
                <Button
                    icon={<CheckSquare size={16} />}
                    disabled={selectedRowKeys.length === 0 || selectedRowKeys.some(key => {
                        const task = tasksList.find(item => item.key === key);
                        return task?.lv027 !== '0' && task?.lv027 !== '3';
                    })}
                    onClick={() => handleProposeApproval(selectedRowKeys)}
                    type="primary"
                >
                    Đề xuất duyệt
                </Button>
                <Button
                    icon={<Lock size={16} />}
                    disabled={selectedRowKeys.length === 0 || selectedRowKeys.some(key => {
                        const task = tasksList.find(item => item.key === key);
                        return task?.lv027 !== '1';
                    })}
                    onClick={() => handleCompleteTask(selectedRowKeys)}
                    style={{ background: '#2ecc71', borderColor: '#2ecc71', color: '#fff' }}
                >
                    Hoàn thành
                </Button>
                <Button
                    danger
                    icon={<ArrowLeftRight size={16} />}
                    disabled={selectedRowKeys.length === 0 || selectedRowKeys.some(key => {
                        const task = tasksList.find(item => item.key === key);
                        return task?.lv027 !== '0';
                    })}
                    onClick={() => handleReturnTask(selectedRowKeys)}
                >
                    Trả lại
                </Button>
                <Popconfirm
                    title="Xóa công việc"
                    description={`Bạn có chắc chắn muốn xóa ${selectedRowKeys.length} công việc đã chọn?`}
                    onConfirm={() => handleDeleteTask(selectedRowKeys)}
                    okText="Có"
                    cancelText="Không"
                    disabled={selectedRowKeys.length === 0 || selectedRowKeys.some(key => {
                        const task = tasksList.find(item => item.key === key);
                        return task?.lv027 === '2';
                    })}
                >
                    <Button
                        danger
                        icon={<Trash2 size={16} />}
                        disabled={selectedRowKeys.length === 0 || selectedRowKeys.some(key => {
                            const task = tasksList.find(item => item.key === key);
                            return task?.lv027 === '2';
                        })}
                    >
                        Xóa đã chọn
                    </Button>
                </Popconfirm>
                <span style={{ marginLeft: 'auto', color: '#8c8c8c' }}>
                    Đã chọn <b>{selectedRowKeys.length}</b> dòng
                </span>
            </div>

            <Card className={styles.mainCard}>
                <div className={styles.filterSection}>
                    <Row gutter={[16, 16]} className={styles.filterBar}>
                        <Col xs={24} sm={12} md={6}>
                            <Form.Item label="Từ ngày">
                                <DatePicker
                                    style={{ width: '100%' }}
                                    format="DD/MM/YYYY"
                                    value={fromDate}
                                    onChange={(val) => { setFromDate(val); setCurrentPage(1); }}
                                    placeholder="Chọn ngày bắt đầu"
                                />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12} md={6}>
                            <Form.Item label="Đến ngày">
                                <DatePicker
                                    style={{ width: '100%' }}
                                    format="DD/MM/YYYY"
                                    value={toDate}
                                    onChange={(val) => { setToDate(val); setCurrentPage(1); }}
                                    placeholder="Chọn ngày kết thúc"
                                />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12} md={6}>
                            <Form.Item label="Nhân viên">
                                <Select
                                    showSearch
                                    style={{ width: '100%' }}
                                    placeholder="Chọn nhân viên"
                                    value={selectedEmployee}
                                    onChange={(val) => { setSelectedEmployee(val); setCurrentPage(1); }}
                                    optionFilterProp="children"
                                    allowClear
                                >
                                    {nhanVienList.map((emp) => (
                                        <Option key={emp.lv001} value={emp.lv001}>
                                            {emp.lv002} ({emp.lv001})
                                        </Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12} md={6}>
                            <Form.Item label="Phòng ban">
                                <Select
                                    style={{ width: '100%' }}
                                    placeholder="Chọn phòng ban"
                                    value={selectedDepartment}
                                    onChange={(val) => { setSelectedDepartment(val); setCurrentPage(1); }}
                                    allowClear
                                >
                                    {phongBanList.map((pb) => (
                                        <Option key={pb.lv001} value={pb.lv001}>
                                            {pb.lv002}
                                        </Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12} md={6}>
                            <Form.Item label="Trạng thái">
                                <Select
                                    style={{ width: '100%' }}
                                    placeholder="Chọn trạng thái"
                                    value={selectedStatus}
                                    onChange={(val) => { setSelectedStatus(val); setCurrentPage(1); }}
                                    allowClear
                                >
                                    <Option value="">Tất cả</Option>
                                    <Option value="0">Đang thực hiện</Option>
                                    <Option value="1">Đợi duyệt</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12} md={6}>
                            <Form.Item label="Số ngày quá hạn">
                                <Select
                                    style={{ width: '100%' }}
                                    placeholder="Lọc ngày quá hạn"
                                    value={dayExpire}
                                    onChange={(val) => { setDayExpire(val); setCurrentPage(1); }}
                                    allowClear
                                >
                                    <Option value="">Không chọn</Option>
                                    <Option value="1">1 ngày</Option>
                                    <Option value="2">2 ngày</Option>
                                    <Option value="3">3 ngày</Option>
                                    <Option value="4">4 ngày</Option>
                                    <Option value="5">5 ngày</Option>
                                    <Option value="6">6 ngày</Option>
                                    <Option value="7">7 ngày</Option>
                                    <Option value="8">&gt; 7 ngày</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12} md={4} style={{ paddingBottom: '8px' }}>
                            <Checkbox checked={isAll} onChange={(e) => { setIsAll(e.target.checked); setCurrentPage(1); }}>
                                Hiển thị tất cả CV
                            </Checkbox>
                        </Col>
                        <Col xs={24} sm={12} md={2} style={{ paddingBottom: '8px' }}>
                            <Button type="dashed" icon={<ReloadOutlined />} onClick={() => {
                                setFromDate(null);
                                setToDate(null);
                                setSelectedEmployee('');
                                setSelectedDepartment('');
                                setSelectedStatus('');
                                setDayExpire('');
                                setIsAll(false);
                                setCurrentPage(1);
                                loadData();
                            }}>
                                Reset
                            </Button>
                        </Col>
                    </Row>
                </div>

                <Table
                    rowSelection={{
                        selectedRowKeys,
                        onChange: (keys) => setSelectedRowKeys(keys),
                    }}
                    columns={displayColumns}
                    dataSource={displayRows}
                    loading={loading}
                    pagination={{
                        current: currentPage,
                        pageSize: pageSize,
                        total: totalTasks,
                        onChange: (page) => setCurrentPage(page),
                        showSizeChanger: false,
                        showTotal: (total) => `Tổng số: ${total} công việc`
                    }}
                    scroll={{ x: 1300 }}
                />
            </Card>

            {/* ADD / EDIT DRAWER */}
            <Drawer
                title={
                    <Space>
                        <FileText size={20} color="#197dd3" />
                        <span>{editingTask ? "Chỉnh sửa công việc giao việc" : "Thêm mới công việc giao việc"}</span>
                    </Space>
                }
                placement="right"
                width={800}
                open={isModalVisible}
                forceRender={true}
                onClose={() => {
                    setIsModalVisible(false);
                    form.resetFields();
                }}
                className={styles.khoDrawer}
                footer={
                    <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Button onClick={() => {
                            setIsModalVisible(false);
                            form.resetFields();
                        }}>Huỷ</Button>
                        <Button type="primary" onClick={() => form.submit()}>
                            {editingTask ? "Cập nhật" : "Lưu công việc"}
                        </Button>
                    </Space>
                }
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSaveTask}
                    className={styles.customForm}
                >
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                name="lv002"
                                label="Kế hoạch công việc"
                                rules={[{ required: true, message: 'Vui lòng chọn kế hoạch!' }]}
                            >
                                <Select dropdownMatchSelectWidth={false} placeholder="Chọn kế hoạch" showSearch optionFilterProp="children">
                                    {keHoachList.map(plan => (
                                        <Option key={plan.lv001} value={plan.lv001}>{plan.lv002} ({plan.lv001})</Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                name="lv003"
                                label="Loại công việc"
                                rules={[{ required: true, message: 'Vui lòng chọn loại công việc!' }]}
                            >
                                <Select dropdownMatchSelectWidth={false} placeholder="Chọn loại công việc">
                                    <Option value="QUOT">Báo giá / Dự án</Option>
                                    <Option value="GEN">Nhiệm vụ chung</Option>
                                    <Option value="SPT">Hỗ trợ kỹ thuật</Option>
                                    <Option value="OTH">Khác</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item
                        name="lv004"
                        label="Nội dung công việc phải làm"
                        rules={[{ required: true, message: 'Vui lòng nhập nội dung công việc!' }]}
                    >
                        <Input.TextArea rows={3} placeholder="Mô tả cụ thể nhiệm vụ..." />
                    </Form.Item>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                name="ngayHoanThanh"
                                label="Hạn hoàn thành (Ngày)"
                                rules={[{ required: true, message: 'Vui lòng chọn ngày hạn hoàn thành!' }]}
                            >
                                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Chọn ngày hạn" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                name="gioHoanThanh"
                                label="Hạn hoàn thành (Giờ)"
                                rules={[{ required: true, message: 'Vui lòng chọn giờ hoàn thành!' }]}
                            >
                                <Select dropdownMatchSelectWidth={false} placeholder="Chọn giờ">
                                    <Option value="08:00:00">08:00:00</Option>
                                    <Option value="09:00:00">09:00:00</Option>
                                    <Option value="10:00:00">10:00:00</Option>
                                    <Option value="11:00:00">11:00:00</Option>
                                    <Option value="12:00:00">12:00:00</Option>
                                    <Option value="13:00:00">13:00:00</Option>
                                    <Option value="14:00:00">14:00:00</Option>
                                    <Option value="15:00:00">15:00:00</Option>
                                    <Option value="16:00:00">16:00:00</Option>
                                    <Option value="17:00:00">17:00:00</Option>
                                    <Option value="18:00:00">18:00:00</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={8}>
                            <Form.Item
                                name="lv006"
                                label="Người thực hiện"
                                rules={[{ required: true, message: 'Vui lòng chọn người thực hiện!' }]}
                            >
                                <Select dropdownMatchSelectWidth={false} placeholder="Chọn nhân viên" showSearch optionFilterProp="children">
                                    {nhanVienList.map(emp => (
                                        <Option key={emp.lv001} value={emp.lv001}>{emp.lv002} ({emp.lv001})</Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item
                                name="lv007"
                                label="Người kiểm tra"
                                rules={[{ required: true, message: 'Vui lòng chọn người kiểm tra!' }]}
                            >
                                <Select dropdownMatchSelectWidth={false} placeholder="Chọn nhân viên" showSearch optionFilterProp="children">
                                    {nhanVienList.map(emp => (
                                        <Option key={emp.lv001} value={emp.lv001}>{emp.lv002} ({emp.lv001})</Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item
                                name="lv008"
                                label="Người quản lý / Theo dõi"
                                rules={[{ required: true, message: 'Vui lòng chọn người theo dõi!' }]}
                            >
                                <Select dropdownMatchSelectWidth={false} placeholder="Chọn nhân viên" showSearch optionFilterProp="children">
                                    {nhanVienList.map(emp => (
                                        <Option key={emp.lv001} value={emp.lv001}>{emp.lv002} ({emp.lv001})</Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Divider style={{ margin: '12px 0' }} />

                    <Row gutter={16}>
                        <Col span={8}>
                            <Form.Item name="lv013" label="Phân loại đối tượng liên kết">
                                <Select dropdownMatchSelectWidth={false} placeholder="Chọn loại liên kết" onChange={handleCategoryTypeChange}>
                                    <Option value="EMP">Nhân viên (EMP)</Option>
                                    <Option value="SUP">Nhà cung cấp (SUP)</Option>
                                    <Option value="CUS">Khách hàng (CUS)</Option>
                                    <Option value="DEP">Phòng ban (DEP)</Option>
                                    <Option value="HR">Kỳ tính công (HR)</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={16}>
                            <Form.Item name="lv014" label="Đối tượng liên kết">
                                <Select
                                    placeholder="Chọn đối tượng tương ứng"
                                    showSearch
                                    optionFilterProp="children"
                                    loading={fetchingObjects}
                                    disabled={fetchingObjects}
                                >
                                    {objectList.map(obj => (
                                        <Option key={obj.value} value={obj.value}>{obj.label} ({obj.value})</Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="lv050" label="Loại công việc nghiệp vụ (Cấp 2)">
                                <Input placeholder="Nhập nhóm loại công việc..." />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="lv089" label="Mã số công văn">
                                <Input placeholder="Nhập số ký hiệu công văn (nếu có)..." />
                            </Form.Item>
                        </Col>
                    </Row>
                </Form>
            </Drawer>
        </div>
    );
};

export default CongViecPhaiLamGiaoViec;
