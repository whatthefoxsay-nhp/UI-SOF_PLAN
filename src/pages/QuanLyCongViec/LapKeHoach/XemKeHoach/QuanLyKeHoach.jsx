import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import {
    Table,
    Input,
    Button,
    Modal,
    Space,
    Tag,
    DatePicker,
    Select,
    message,
    Tooltip,
    Spin,
    Breadcrumb,
    Drawer,
    Tabs,
    Form,
    Row,
    Col,
    InputNumber,
    Divider,
    Empty,
    Typography
} from 'antd';
import {
    Home,
    Plus,
    RefreshCw,
    Edit,
    Copy,
    CheckCircle,
    StopCircle,
    Trash2,
    FolderKanban,
    ListTodo,
    PlusSquare,
    Briefcase,
    Calendar,
    Coins,
    Users
} from 'lucide-react';
import dayjs from 'dayjs';
import { execCRUD } from '../../../../services/apiServices';
import TaoDeNGhiChiTienModal from './TaoDeNGhiChiTienModal';
import DanhSachDeNghiModal from './DanhSachDeNghiModal';
import KeHoachDetailDrawer from './KeHoachDetailDrawer';
import styles from './QuanLyKeHoach.module.css';
import ColumnSelector from '../../../../components/common/ColumnSelector/ColumnSelector';
import useSavedTablePreferences, { sortRowsByPreference } from '../../../../hooks/useSavedTablePreferences';

const { Text } = Typography;
const { Option } = Select;

// Lazy load DropDown components to avoid initialization issues
const SelectDuAn = React.lazy(() => import('../../../../components/DropDown/SelectDuAn'));
const SelectLoaiHinhDuAn = React.lazy(() => import('../../../../components/DropDown/SelectLoaiHinhDuAn'));
const SelectNhanVien = React.lazy(() => import('../../../../components/DropDown/SelectNhanVien'));

const QuanLyKeHoach = () => {
    const [form] = Form.useForm();
    const [data, setData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    // Search and filter states
    const [searchText, setSearchText] = useState('');
    const [projectFilter, setProjectFilter] = useState(null);
    const [statusFilter, setStatusFilter] = useState(null);

    // Selection state
    const [selectedRowKeys, setSelectedRowKeys] = useState([]);

    // Modals & drawers states
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);
    const [detailDrawerVisible, setDetailDrawerVisible] = useState(false);
    const [isDNCTModalOpen, setIsDNCTModalOpen] = useState(false);
    const [isListDNModalOpen, setIsListDNModalOpen] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState(null);

    // Quick Insert state
    const [newItem, setNewItem] = useState({
        lv002: '', // Tên kế hoạch
        lv069: '', // Loại kế hoạch
        lv501: '', // Dự án
        lv076: 0,  // Dự toán
        lv077: dayjs().format('YYYY-MM-DD'), // Ngày bắt đầu
        lv078: dayjs().add(1, 'month').format('YYYY-MM-DD'), // Ngày kết thúc
        lv007: 'PRIVATE', // Quyền
        lv072: 0, // % trúng thầu
        lv083: '', // Thương hiệu
        lv084: '', // Địa chỉ dự án
        lv085: '', // Loại hình dự án
        lv097: '', // Người phối hợp
        lv079: '', // Sale
        lv080: '', // P.TTT
        lv081: '', // AD
        lv082: '', // AD (2)
        lv101: '', // Trạng thái dự án
        lv102: '', // TG Hoàn thành
    });

    const formatDate = (dateStr) => {
        if (!dateStr || dateStr === '0000-00-00' || dateStr === '1900-01-01' || dateStr === '1900-01-01 00:00:00' || dateStr === '0000-00-00 00:00:00') {
            return '';
        }
        return dayjs(dateStr).format('DD/MM/YYYY');
    };

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const result = await execCRUD('cr_lv0094', 'load');
            let mapped = [];
            let parsedResult = result;
            if (typeof result === 'string') {
                try {
                    parsedResult = JSON.parse(result.trim());
                } catch (e) {
                    console.error('Lỗi phân tích JSON từ chuỗi kết quả:', e);
                }
            }
            if (Array.isArray(parsedResult)) {
                mapped = parsedResult;
            } else if (parsedResult && typeof parsedResult === 'object') {
                mapped = Object.values(parsedResult);
            }
            setData(mapped);
            setFilteredData(mapped);
        } catch (error) {
            console.error(error);
            message.error('Không thể tải dữ liệu kế hoạch');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSearch = useCallback(
        (term, project, status) => {
            const keyword = String(term || '').trim().toLowerCase();
            const next = data.filter((item) => {
                const passProject = !project || String(item.lv501) === String(project);
                const passStatus = !status || String(item.lv007) === String(status);
                const joined = [
                    item.lv001,
                    item.lv002,
                    item.ten_du_an,
                    item.lv069,
                    item.lv085,
                    item.lv084,
                ]
                    .map((x) => String(x || '').toLowerCase())
                    .join(' ');
                return passProject && passStatus && joined.includes(keyword);
            });
            setFilteredData(next);
        },
        [data],
    );

    useEffect(() => {
        const timer = setTimeout(() => handleSearch(searchText, projectFilter, statusFilter), 250);
        return () => clearTimeout(timer);
    }, [handleSearch, searchText, projectFilter, statusFilter]);

    // Inline quick add handler
    const handleQuickAdd = useCallback(async () => {
        if (!newItem.lv002 || !newItem.lv501) {
            message.warning('Vui lòng nhập Tên kế hoạch và chọn Dự án');
            return;
        }
        setLoading(true);
        try {
            const result = await execCRUD('cr_lv0094_detail', 'insertPlanFull', newItem);
            if (result && result.success !== false && !result.error) {
                message.success('Thêm kế hoạch nhanh thành công');
                setNewItem({
                    ...newItem,
                    lv002: '',
                    lv069: '',
                    lv501: '',
                    lv083: '',
                    lv084: '',
                    lv085: '',
                    lv097: '',
                    lv079: '',
                    lv080: '',
                    lv081: '',
                    lv082: '',
                    lv101: '',
                    lv102: '',
                });
                fetchData();
            } else {
                message.error(result?.message || 'Thêm kế hoạch nhanh thất bại');
            }
        } catch (error) {
            message.error('Lỗi kết nối máy chủ khi thêm nhanh');
        } finally {
            setLoading(false);
        }
    }, [newItem, fetchData]);

    const handleBatchAction = (action, messages) => {
        if (selectedRowKeys.length === 0) {
            message.warning('Vui lòng chọn ít nhất một bản ghi.');
            return;
        }
        Modal.confirm({
            title: messages.confirm_title,
            content: messages.confirm_content,
            okText: 'Xác nhận',
            cancelText: 'Hủy',
            onOk: async () => {
                setActionLoading(true);
                try {
                    if (action === 'delete' || action === 'copy') {
                        let successCount = 0;
                        let failedCount = 0;
                        let lastErrorMessage = '';
                        for (const key of selectedRowKeys) {
                            try {
                                const result = await execCRUD('cr_lv0094_detail', action === 'copy' ? 'copyPlanFull' : 'deletePlanSafe', { lv001: key });
                                if (result && result.success !== false && !result.error) {
                                    successCount++;
                                } else {
                                    failedCount++;
                                    lastErrorMessage = result?.message || lastErrorMessage || (action === 'copy' ? 'Sao chép thất bại' : 'Xóa thất bại');
                                }
                            } catch (err) {
                                failedCount++;
                                console.error(err);
                            }
                        }
                        if (failedCount === 0) {
                            message.success(messages.success);
                            setSelectedRowKeys([]);
                            fetchData();
                        } else if (successCount > 0) {
                            message.warning(`Đã xử lý thành công ${successCount} kế hoạch, thất bại ${failedCount} kế hoạch.${lastErrorMessage ? ` Lỗi: ${lastErrorMessage}` : ''}`);
                            setSelectedRowKeys([]);
                            fetchData();
                        } else {
                            message.error(lastErrorMessage || (action === 'copy' ? 'Sao chép thất bại' : 'Xóa thất bại'));
                        }
                    } else {
                        const payload = { lv001: selectedRowKeys.join(',') };
                        const actionMap = { copy: 'copyPlanFull', approve: 'closePlan', unapprove: 'openPlan' };
                        const result = await execCRUD('cr_lv0094_detail', actionMap[action] || action, payload);
                        if (result && result.success !== false && !result.error) {
                            message.success(messages.success);
                            setSelectedRowKeys([]);
                            fetchData();
                        } else {
                            message.error(result?.message || 'Thao tác thất bại');
                        }
                    }
                } catch (error) {
                    console.error(error);
                    message.error('Lỗi kết nối máy chủ');
                } finally {
                    setActionLoading(false);
                }
            },
        });
    };

    const openChildPage = (record) => {
        setSelectedRecord(record);
        setDetailDrawerVisible(true);
    };

    const openCreateDrawer = () => {
        setEditingRecord(null);
        form.resetFields();
        form.setFieldsValue({
            lv002: '',
            lv069: '',
            lv501: '',
            lv076: 0,
            lv077: dayjs(),
            lv078: dayjs().add(1, 'month'),
            lv007: 'PRIVATE',
            lv072: 0,
            lv083: '',
            lv084: '',
            lv085: '',
            lv097: [],
            lv079: '',
            lv080: '',
            lv081: '',
            lv082: '',
            lv101: '',
            lv102: null,
        });
        setDrawerVisible(true);
    };

    const openEditDrawer = (record) => {
        setEditingRecord(record);
        form.resetFields();
        form.setFieldsValue({
            lv001: record.lv001,
            lv002: record.lv002 || '',
            lv069: record.lv069 || '',
            lv501: record.lv501 || '',
            lv076: record.lv076 ? Number(record.lv076) : 0,
            lv077: record.lv077 && record.lv077 !== '0000-00-00' ? dayjs(record.lv077) : null,
            lv078: record.lv078 && record.lv078 !== '0000-00-00' ? dayjs(record.lv078) : null,
            lv007: record.lv007 || 'PRIVATE',
            lv072: record.lv072 ? Number(record.lv072) : 0,
            lv083: record.lv083 || '',
            lv084: record.lv084 || '',
            lv085: record.lv085 || '',
            lv097: record.lv097 ? record.lv097.split(',') : [],
            lv079: record.lv079 || '',
            lv080: record.lv080 || '',
            lv081: record.lv081 || '',
            lv082: record.lv082 || '',
            lv101: record.lv101 || '',
            lv102: record.lv102 && record.lv102 !== '0000-00-00' ? dayjs(record.lv102) : null,
        });
        setDrawerVisible(true);
    };

    const handleEditSelected = () => {
        if (selectedRowKeys.length !== 1) {
            message.warning('Vui lòng chọn đúng 1 bản ghi để sửa');
            return;
        }
        const record = data.find((r) => r.lv001 === selectedRowKeys[0]);
        if (record) openEditDrawer(record);
    };

    const handleSubmit = async (values) => {
        setLoading(true);
        try {
            const payload = {
                ...values,
                lv076: values.lv076 || 0,
                lv072: values.lv072 || 0,
                lv077: values.lv077 ? dayjs(values.lv077).format('YYYY-MM-DD') : '',
                lv078: values.lv078 ? dayjs(values.lv078).format('YYYY-MM-DD') : '',
                lv102: values.lv102 ? dayjs(values.lv102).format('YYYY-MM-DD') : '',
                lv097: Array.isArray(values.lv097) ? values.lv097.join(',') : (values.lv097 || ''),
            };

            const isEditing = !!editingRecord;
            const action = isEditing ? 'updatePlanFull' : 'insertPlanFull';

            if (isEditing) {
                payload.lv001 = editingRecord.lv001;
            }

            const result = await execCRUD('cr_lv0094_detail', action, payload);
            if (result && result.success !== false && !result.error) {
                message.success(isEditing ? 'Cập nhật kế hoạch thành công' : 'Thêm kế hoạch thành công');
                setDrawerVisible(false);
                setEditingRecord(null);
                form.resetFields();
                setSelectedRowKeys([]);
                fetchData();
            } else {
                message.error(result?.message || (isEditing ? 'Cập nhật thất bại' : 'Thêm thất bại'));
            }
        } catch (error) {
            console.error(error);
            message.error('Lỗi kết nối máy chủ');
        } finally {
            setLoading(false);
        }
    };

    const columns = useMemo(() => [
        {
            title: 'Mã kế hoạch',
            dataIndex: 'lv001',
            key: 'lv001',
            fixed: 'left',
            width: 140,
            sorter: (a, b) => (a.lv001 || '').localeCompare(b.lv001 || ''),
            render: (text, record) => {
                if (record.isEntry) {
                    return (
                        <Tooltip title="Lưu nhanh (hoặc nhấn Enter ở các ô nhập)">
                            <Button
                                type="primary"
                                icon={<Plus size={14} />}
                                onClick={handleQuickAdd}
                                size="small"
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}
                            />
                        </Tooltip>
                    );
                }
                return text;
            }
        },
        {
            title: 'Tên kế hoạch',
            dataIndex: 'lv002',
            key: 'lv002',
            width: 250,
            ellipsis: true,
            render: (text, record) => {
                if (record.isEntry) {
                    return (
                        <Input
                            value={newItem.lv002}
                            onChange={e => setNewItem({ ...newItem, lv002: e.target.value })}
                            placeholder="Tên kế hoạch..."
                            size="small"
                            onPressEnter={handleQuickAdd}
                        />
                    );
                }
                return (
                    <span className={styles.detailLink} onClick={() => openChildPage(record)}>
                        {text || record.lv001}
                    </span>
                );
            }
        },
        {
            title: 'Loại kế hoạch',
            dataIndex: 'lv069',
            key: 'lv069',
            width: 150,
            render: (text, record) => record.isEntry ? (
                <Input
                    value={newItem.lv069}
                    onChange={e => setNewItem({ ...newItem, lv069: e.target.value })}
                    placeholder="Loại..."
                    size="small"
                    onPressEnter={handleQuickAdd}
                />
            ) : text
        },
        {
            title: 'Dự án',
            dataIndex: 'ten_du_an',
            key: 'ten_du_an',
            width: 200,
            render: (text, record) => record.isEntry ? (
                <Suspense fallback={<Spin size="small" />}>
                    <SelectDuAn
                        style={{ width: '100%' }}
                        value={newItem.lv501}
                        onChange={val => setNewItem({ ...newItem, lv501: val })}
                        placeholder="Chọn dự án..."
                        size="small"
                    />
                </Suspense>
            ) : (
                <Tooltip title={record.lv501}>
                    <span>{text || record.lv501}</span>
                </Tooltip>
            )
        },
        {
            title: 'Quyền',
            dataIndex: 'lv007',
            key: 'lv007',
            width: 120,
            render: (text, record) => record.isEntry ? (
                <Select dropdownMatchSelectWidth={false}
                    style={{ width: '100%' }}
                    value={newItem.lv007}
                    onChange={val => setNewItem({ ...newItem, lv007: val })}
                    size="small"
                >
                    <Option value="PRIVATE">PRIVATE</Option>
                    <Option value="PUBLIC">PUBLIC</Option>
                </Select>
            ) : (
                <Tag color={text === 'PUBLIC' ? 'cyan' : 'blue'}>{text}</Tag>
            )
        },
        {
            title: 'Loại hình dự án',
            dataIndex: 'lv085',
            key: 'lv085',
            width: 180,
            render: (text, record) => record.isEntry ? (
                <Suspense fallback={<Spin size="small" />}>
                    <SelectLoaiHinhDuAn
                        style={{ width: '100%' }}
                        value={newItem.lv085}
                        onChange={val => setNewItem({ ...newItem, lv085: val })}
                        size="small"
                    />
                </Suspense>
            ) : text
        },
        {
            title: 'Địa chỉ dự án',
            dataIndex: 'lv084',
            key: 'lv084',
            width: 200,
            ellipsis: true,
            render: (text, record) => record.isEntry ? (
                <Input
                    value={newItem.lv084}
                    onChange={e => setNewItem({ ...newItem, lv084: e.target.value })}
                    placeholder="Địa chỉ..."
                    size="small"
                    onPressEnter={handleQuickAdd}
                />
            ) : text
        },
        {
            title: 'Ngày lập',
            dataIndex: 'lv009',
            key: 'lv009',
            width: 150,
            render: (text, record) => record.isEntry ? <Tag color="orange">Tự động</Tag> : formatDate(text)
        },
        {
            title: 'Tổng giá dự toán',
            dataIndex: 'lv076',
            key: 'lv076',
            width: 150,
            align: 'right',
            render: (val, record) => record.isEntry ? (
                <Input
                    type="number"
                    value={newItem.lv076}
                    onChange={e => setNewItem({ ...newItem, lv076: e.target.value })}
                    size="small"
                    onPressEnter={handleQuickAdd}
                />
            ) : (val && val !== '0.00' ? Number(val).toLocaleString() : 0)
        },
        {
            title: '% Trúng thầu',
            dataIndex: 'lv072',
            key: 'lv072',
            width: 120,
            align: 'right',
            render: (val, record) => record.isEntry ? (
                <Input
                    type="number"
                    value={newItem.lv072}
                    onChange={e => setNewItem({ ...newItem, lv072: e.target.value })}
                    size="small"
                    onPressEnter={handleQuickAdd}
                />
            ) : (val ? `${val}%` : '0%')
        },
        {
            title: 'Người phối hợp',
            dataIndex: 'lv097',
            key: 'lv097',
            width: 200,
            render: (text, record) => record.isEntry ? (
                <Suspense fallback={<Spin size="small" />}>
                    <SelectNhanVien
                        mode="multiple"
                        style={{ width: '100%' }}
                        value={newItem.lv097 ? newItem.lv097.split(',') : []}
                        onChange={vals => setNewItem({ ...newItem, lv097: vals.join(',') })}
                        size="small"
                    />
                </Suspense>
            ) : text
        },
        {
            title: 'Sale',
            dataIndex: 'lv079',
            key: 'lv079',
            width: 150,
            render: (text, record) => record.isEntry ? (
                <Suspense fallback={<Spin size="small" />}>
                    <SelectNhanVien
                        style={{ width: '100%' }}
                        value={newItem.lv079}
                        onChange={val => setNewItem({ ...newItem, lv079: val })}
                        size="small"
                    />
                </Suspense>
            ) : text
        },
        {
            title: 'P.TTT',
            dataIndex: 'lv080',
            key: 'lv080',
            width: 150,
            render: (text, record) => record.isEntry ? (
                <Suspense fallback={<Spin size="small" />}>
                    <SelectNhanVien
                        style={{ width: '100%' }}
                        value={newItem.lv080}
                        onChange={val => setNewItem({ ...newItem, lv080: val })}
                        size="small"
                    />
                </Suspense>
            ) : text
        },
        {
            title: 'AD',
            dataIndex: 'lv081',
            key: 'lv081',
            width: 150,
            render: (text, record) => record.isEntry ? (
                <Suspense fallback={<Spin size="small" />}>
                    <SelectNhanVien
                        style={{ width: '100%' }}
                        value={newItem.lv081}
                        onChange={val => setNewItem({ ...newItem, lv081: val })}
                        size="small"
                    />
                </Suspense>
            ) : text
        },
        {
            title: 'Thương hiệu',
            dataIndex: 'lv083',
            key: 'lv083',
            width: 150,
            render: (text, record) => record.isEntry ? (
                <Input
                    value={newItem.lv083}
                    onChange={e => setNewItem({ ...newItem, lv083: e.target.value })}
                    size="small"
                    onPressEnter={handleQuickAdd}
                />
            ) : text
        },
        {
            title: 'AD (2)',
            dataIndex: 'lv082',
            key: 'lv082',
            width: 150,
            render: (text, record) => record.isEntry ? (
                <Suspense fallback={<Spin size="small" />}>
                    <SelectNhanVien
                        style={{ width: '100%' }}
                        value={newItem.lv082}
                        onChange={val => setNewItem({ ...newItem, lv082: val })}
                        size="small"
                    />
                </Suspense>
            ) : text
        },
        {
            title: 'Trạng thái dự án',
            dataIndex: 'lv101',
            key: 'lv101',
            width: 150,
            render: (text, record) => record.isEntry ? (
                <Input
                    value={newItem.lv101}
                    onChange={e => setNewItem({ ...newItem, lv101: e.target.value })}
                    size="small"
                    onPressEnter={handleQuickAdd}
                />
            ) : text
        },
        {
            title: 'TG hoàn thành dự án',
            dataIndex: 'lv102',
            key: 'lv102',
            width: 150,
            render: (text, record) => record.isEntry ? (
                <DatePicker
                    style={{ width: '100%' }}
                    value={newItem.lv102 ? dayjs(newItem.lv102) : null}
                    onChange={(date, dateString) => setNewItem({ ...newItem, lv102: dateString })}
                    size="small"
                />
            ) : formatDate(text)
        },
        {
            title: 'Trạng thái',
            dataIndex: 'lv098',
            key: 'lv098',
            width: 130,
            render: (val, record) => {
                if (record.isEntry) return null;
                const status = parseInt(val);
                return status >= 1 ? <Tag color="green">Đã đóng</Tag> : <Tag color="blue">Đang mở</Tag>;
            }
        },
        {
            title: 'Người lập',
            dataIndex: 'ten_nguoi_tao',
            key: 'ten_nguoi_tao',
            width: 150,
            render: (text, record) => record.isEntry ? '' : text
        },
        {
            title: 'Thời gian thực hiện',
            key: 'duration',
            width: 300,
            render: (_, record) => record.isEntry ? (
                <Space>
                    <DatePicker
                        placeholder="Bắt đầu"
                        value={newItem.lv077 ? dayjs(newItem.lv077) : null}
                        onChange={(date, dateString) => setNewItem({ ...newItem, lv077: dateString })}
                        size="small"
                    />
                    <DatePicker
                        placeholder="Kết thúc"
                        value={newItem.lv078 ? dayjs(newItem.lv078) : null}
                        onChange={(date, dateString) => setNewItem({ ...newItem, lv078: dateString })}
                        size="small"
                    />
                </Space>
            ) : (
                <span>
                    {formatDate(record.lv077)} - {formatDate(record.lv078)}
                </span>
            )
        }
    ], [newItem, handleQuickAdd]);

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
        tableName: 'cr_lv0094',
        allColumns: columns,
        requiredKeys: ['lv001', 'lv002', 'ten_du_an'],
        defaultFieldList: 'lv001,lv002,lv069,ten_du_an,lv007,lv085,lv084,lv009,lv076,lv072,lv097,lv079,lv080,lv081,lv083,lv082,lv101,lv102,lv098,ten_nguoi_tao,duration',
        currentPage: 1,
        pageSize: 15,
    });

    const sortedRows = useMemo(() => sortRowsByPreference(filteredData, sortOrder, sortFieldOrder), [filteredData, sortOrder, sortFieldOrder]);

    const dataSource = useMemo(() => {
        return [
            { isEntry: true, lv001: 'new', key: 'new-row' },
            ...sortedRows.map((item) => ({ ...item, key: item.lv001 }))
        ];
    }, [filteredData]);

    const formTabs = useMemo(() => {
        return [
            {
                key: 'tabGeneral',
                label: (
                    <Space>
                        <Briefcase size={16} />
                        1. Thông tin chung & Dự án
                    </Space>
                ),
                children: (
                    <Row gutter={[16, 0]}>
                        {editingRecord && (
                            <Col span={12}>
                                <Form.Item name="lv001" label="Mã kế hoạch">
                                    <Input disabled />
                                </Form.Item>
                            </Col>
                        )}
                        <Col span={editingRecord ? 12 : 24}>
                            <Form.Item name="lv002" label="Tên kế hoạch" rules={[{ required: true, message: 'Vui lòng nhập tên kế hoạch!' }]}>
                                <Input placeholder="Nhập tên kế hoạch..." />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="lv501" label="Dự án" rules={[{ required: true, message: 'Vui lòng chọn dự án!' }]}>
                                <Suspense fallback={<Spin size="small" />}>
                                    <SelectDuAn style={{ width: '100%' }} placeholder="Chọn dự án..." />
                                </Suspense>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="lv069" label="Loại kế hoạch">
                                <Input placeholder="Nhập loại kế hoạch..." />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="lv085" label="Loại hình dự án">
                                <Suspense fallback={<Spin size="small" />}>
                                    <SelectLoaiHinhDuAn style={{ width: '100%' }} />
                                </Suspense>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="lv083" label="Thương hiệu">
                                <Input placeholder="Nhập thương hiệu..." />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="lv084" label="Địa chỉ dự án">
                                <Input placeholder="Nhập địa chỉ dự án..." />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="lv007" label="Quyền hạn">
                                <Select dropdownMatchSelectWidth={false} placeholder="Chọn quyền hạn...">
                                    <Option value="PRIVATE">PRIVATE</Option>
                                    <Option value="PUBLIC">PUBLIC</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>
                )
            },
            {
                key: 'tabFinance',
                label: (
                    <Space>
                        <Coins size={16} />
                        2. Tài chính & Tiến độ
                    </Space>
                ),
                children: (
                    <Row gutter={[16, 0]}>
                        <Col span={12}>
                            <Form.Item name="lv076" label="Tổng giá dự toán">
                                <InputNumber
                                    style={{ width: '100%' }}
                                    min={0}
                                    formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                    parser={v => v.replace(/\$\s?|(,*)/g, '')}
                                    placeholder="Nhập tổng giá dự toán..."
                                />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="lv072" label="% Trúng thầu">
                                <InputNumber
                                    style={{ width: '100%' }}
                                    min={0}
                                    max={100}
                                    formatter={v => v ? `${v}%` : ''}
                                    parser={v => v.replace('%', '')}
                                    placeholder="Nhập phần trăm..."
                                />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="lv077" label="Ngày bắt đầu">
                                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Chọn ngày bắt đầu..." />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="lv078" label="Ngày kết thúc">
                                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Chọn ngày kết thúc..." />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="lv102" label="Thời gian hoàn thành dự án">
                                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Chọn thời gian hoàn thành..." />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="lv101" label="Trạng thái dự án">
                                <Input placeholder="Nhập trạng thái..." />
                            </Form.Item>
                        </Col>
                    </Row>
                )
            },
            {
                key: 'tabPeople',
                label: (
                    <Space>
                        <Users size={16} />
                        3. Nhân sự phụ trách
                    </Space>
                ),
                children: (
                    <Row gutter={[16, 0]}>
                        <Col span={12}>
                            <Form.Item name="lv079" label="Sale phụ trách">
                                <Suspense fallback={<Spin size="small" />}>
                                    <SelectNhanVien style={{ width: '100%' }} placeholder="Chọn nhân viên sale..." />
                                </Suspense>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="lv080" label="P.TTT phụ trách">
                                <Suspense fallback={<Spin size="small" />}>
                                    <SelectNhanVien style={{ width: '100%' }} placeholder="Chọn P.TTT..." />
                                </Suspense>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="lv081" label="AD phụ trách">
                                <Suspense fallback={<Spin size="small" />}>
                                    <SelectNhanVien style={{ width: '100%' }} placeholder="Chọn AD..." />
                                </Suspense>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="lv082" label="AD (2) phụ trách">
                                <Suspense fallback={<Spin size="small" />}>
                                    <SelectNhanVien style={{ width: '100%' }} placeholder="Chọn AD (2)..." />
                                </Suspense>
                            </Form.Item>
                        </Col>
                        <Col span={24}>
                            <Form.Item name="lv097" label="Người phối hợp">
                                <Suspense fallback={<Spin size="small" />}>
                                    <SelectNhanVien mode="multiple" style={{ width: '100%' }} placeholder="Chọn người phối hợp..." />
                                </Suspense>
                            </Form.Item>
                        </Col>
                    </Row>
                )
            }
        ];
    }, [editingRecord]);

    return (
        <div className={styles.container}>
            {/* Premium Breadcrumb */}
            <Breadcrumb
                style={{
                    marginBottom: '16px',
                    fontSize: '14px',
                    padding: '12px 16px',
                    borderRadius: '4px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                    userSelect: 'none',
                    background: '#ffffff'
                }}
            >
                <Breadcrumb.Item>
                    <Home size={14} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                    Trang chủ</Breadcrumb.Item>
                <Breadcrumb.Item>Xem kế hoạch</Breadcrumb.Item>
            </Breadcrumb>

            <div className={styles.pageTitle}>
                <FolderKanban size={20} />
                Xem Kế Hoạch Dự Án
            </div>

            <div className={styles.pageWrapper}>
                {/* Search & Filter Toolbar */}
                <Row justify="space-between" align="middle" className={styles.toolbarRow} style={{ flexWrap: 'wrap', gap: 8 }}>
                    <Col>
                        <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 500 }}>
                            Danh sách kế hoạch dự án
                        </span>
                    </Col>
                    <Col>
                        <Space size="small" wrap>
                            <Suspense fallback={<Spin size="small" />}>
                                <SelectDuAn
                                    allowClear
                                    placeholder="Lọc theo dự án..."
                                    value={projectFilter}
                                    onChange={setProjectFilter}
                                    style={{ width: 220 }}
                                />
                            </Suspense>
                            <Select
                                allowClear
                                placeholder="Lọc theo quyền..."
                                value={statusFilter}
                                onChange={setStatusFilter}
                                style={{ width: 150 }}
                            >
                                <Option value="PUBLIC">PUBLIC</Option>
                                <Option value="PRIVATE">PRIVATE</Option>
                            </Select>
                            <Input.Search
                                allowClear
                                value={searchText}
                                placeholder="Tìm kế hoạch, dự án..."
                                onChange={(e) => setSearchText(e.target.value || '')}
                                style={{ width: 220 }}
                            />
                            <Button icon={<RefreshCw size={16} />} onClick={fetchData} loading={loading}>
                                Làm mới
                            </Button>
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
                                        message.success('Đã cập nhật cấu hình hiển thị');
                                    } catch (error) {
                                        console.error('Error saving column preferences:', error);
                                        message.error(error.message || 'Không thể lưu cấu hình hiển thị');
                                    }
                                }}
                            />
                            <Button type="primary" icon={<Plus size={16} />} onClick={openCreateDrawer}>
                                Thêm mới
                            </Button>
                        </Space>
                    </Col>
                </Row>

                {/* Floating Batch Action Bar */}
                <div className={`${styles.batchActionBar} ${selectedRowKeys.length === 0 ? styles.batchActionBarDisabled : ''}`}>
                    <span style={{ fontWeight: 600, color: '#197dd3', marginRight: 8 }}>Thao tác hàng loạt:</span>
                    <Button
                        icon={<Edit size={15} />}
                        disabled={selectedRowKeys.length !== 1}
                        onClick={handleEditSelected}
                    >
                        Sửa bản ghi
                    </Button>

                    <Button
                        icon={<Copy size={15} />}
                        disabled={selectedRowKeys.length === 0}
                        loading={actionLoading}
                        onClick={() => handleBatchAction('copy', {
                            success: 'Sao chép kế hoạch thành công.',
                            confirm_title: 'Xác nhận sao chép',
                            confirm_content: `Bạn có chắc muốn sao chép ${selectedRowKeys.length} kế hoạch đã chọn?`,
                        })}
                    >
                        Sao chép
                    </Button>

                    <Button
                        icon={<CheckCircle size={15} />}
                        disabled={selectedRowKeys.length === 0}
                        loading={actionLoading}
                        style={{ color: 'green' }}
                        onClick={() => handleBatchAction('approve', {
                            success: 'Đóng kế hoạch thành công.',
                            confirm_title: 'Xác nhận đóng',
                            confirm_content: `Bạn có chắc muốn đóng ${selectedRowKeys.length} kế hoạch đã chọn?`,
                        })}
                    >
                        Đóng kế hoạch
                    </Button>

                    <Button
                        icon={<StopCircle size={15} />}
                        disabled={selectedRowKeys.length === 0}
                        loading={actionLoading}
                        style={{ color: 'orange' }}
                        onClick={() => handleBatchAction('unapprove', {
                            success: 'Mở lại kế hoạch thành công.',
                            confirm_title: 'Xác nhận mở',
                            confirm_content: `Bạn có chắc muốn mở lại ${selectedRowKeys.length} kế hoạch đã chọn?`,
                        })}
                    >
                        Mở lại
                    </Button>

                    <Button
                        icon={<PlusSquare size={15} />}
                        disabled={selectedRowKeys.length !== 1}
                        onClick={() => {
                            const record = data.find(item => item.lv001 === selectedRowKeys[0]);
                            if (record) {
                                setSelectedRecord(record);
                                setIsDNCTModalOpen(true);
                            }
                        }}
                        style={{ color: '#faad14', borderColor: '#faad14' }}
                    >
                        Tạo ĐNCT
                    </Button>

                    <Button
                        icon={<ListTodo size={15} />}
                        disabled={selectedRowKeys.length !== 1}
                        onClick={() => {
                            const record = data.find(item => item.lv001 === selectedRowKeys[0]);
                            if (record) {
                                setSelectedRecord(record);
                                setIsListDNModalOpen(true);
                            }
                        }}
                        style={{ color: '#1890ff', borderColor: '#1890ff' }}
                    >
                        Danh sách ĐNCT
                    </Button>

                    <Button
                        danger
                        icon={<Trash2 size={15} />}
                        disabled={selectedRowKeys.length === 0}
                        loading={actionLoading}
                        onClick={() => handleBatchAction('delete', {
                            success: 'Xóa kế hoạch thành công.',
                            confirm_title: 'Xác nhận xóa',
                            confirm_content: `Bạn có chắc muốn xóa ${selectedRowKeys.length} kế hoạch đã chọn?`,
                        })}
                    >
                        Xóa đã chọn
                    </Button>

                    <span style={{ marginLeft: 'auto', color: '#8c8c8c' }}>
                        Đã chọn <b>{selectedRowKeys.length}</b> dòng
                        {selectedRowKeys.length > 1 && <span style={{ color: '#faad14', marginLeft: 8 }}>(Chọn đúng 1 dòng để sửa/tạo ĐNCT)</span>}
                    </span>
                </div>

                {/* Table */}
                <Table
                    columns={displayColumns}
                    dataSource={dataSource}
                    loading={loading}
                    rowKey={(record) => record.isEntry ? 'new-row' : record.lv001}
                    rowSelection={{
                        selectedRowKeys,
                        onChange: setSelectedRowKeys,
                        getCheckboxProps: (record) => ({
                            disabled: record.isEntry,
                        }),
                    }}
                    pagination={{
                        pageSize: 15,
                        showSizeChanger: true,
                        pageSizeOptions: ['15', '30', '50', '100']
                    }}
                    scroll={{ x: 2000, y: 'calc(100vh - 280px)' }}
                    bordered
                    size="middle"
                    className={styles.mainTable}
                    rowClassName={(record) => record.isEntry ? styles.quickRow : styles.clickableRow}
                    onRow={(record) => ({
                        onClick: (event) => {
                            const target = event.target;
                            if (record.isEntry || target.closest('button, input, textarea, .ant-select, .ant-picker, .ant-checkbox-wrapper, a')) return;
                            openChildPage(record);
                        },
                    })}
                    locale={{ emptyText: <Empty description="Không tìm thấy kế hoạch dự án" /> }}
                />

                {/* Inline Quick Add triggers */}
                {newItem.lv002 && newItem.lv501 && (
                    <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button type="primary" icon={<Plus size={14} />} onClick={handleQuickAdd} loading={loading}>
                            Lưu kế hoạch nhanh
                        </Button>
                    </div>
                )}
            </div>

            {/* Slide Drawer for Add/Edit plan details */}
            <Drawer
                title={
                    <Space>
                        {editingRecord ? <Edit size={18} /> : <Plus size={18} />}
                        {editingRecord ? 'Cập nhật kế hoạch dự án' : 'Thêm mới kế hoạch dự án'}
                    </Space>
                }
                placement="right"
                width="62vw"
                open={drawerVisible}
                onClose={() => { setDrawerVisible(false); form.resetFields(); }}
                className={styles.khoDrawer}
                destroyOnClose
                footer={
                    <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Button onClick={() => { setDrawerVisible(false); form.resetFields(); }}>Hủy</Button>
                        <Button type="primary" onClick={() => form.submit()} loading={loading}>
                            {editingRecord ? 'Cập nhật' : 'Thêm mới'}
                        </Button>
                    </Space>
                }
            >
                <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
                    Nhập chi tiết kế hoạch dự án theo từng nhóm thông tin.
                </Text>

                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSubmit}
                    className={styles.customForm}
                >
                    <Tabs
                        defaultActiveKey="tabGeneral"
                        className={styles.customTabs}
                        items={formTabs.map((tab) => ({
                            key: tab.key,
                            label: tab.label,
                            children: tab.children,
                        }))}
                    />
                </Form>
            </Drawer>

            <KeHoachDetailDrawer
                visible={detailDrawerVisible}
                record={selectedRecord}
                onClose={() => setDetailDrawerVisible(false)}
                onRefresh={fetchData}
                onCreateDNCT={(plan) => {
                    setSelectedRecord(plan);
                    setIsDNCTModalOpen(true);
                }}
                onListDNCT={(plan) => {
                    setSelectedRecord(plan);
                    setIsListDNModalOpen(true);
                }}
            />

            {/* Creation Modal for Payment Requests (ĐNCT) */}
            <TaoDeNGhiChiTienModal
                visible={isDNCTModalOpen}
                onCancel={() => setIsDNCTModalOpen(false)}
                record={selectedRecord}
                onSuccess={() => {
                    message.success('Đề nghị đã được lưu');
                    setIsDNCTModalOpen(false);
                    fetchData();
                }}
            />

            {/* Listing Modal for Payment Requests */}
            <DanhSachDeNghiModal
                visible={isListDNModalOpen}
                onCancel={() => setIsListDNModalOpen(false)}
                planRecord={selectedRecord}
                onEditRequest={(request) => {
                    console.log('Edit request:', request);
                }}
            />
        </div>
    );
};

export default QuanLyKeHoach;




