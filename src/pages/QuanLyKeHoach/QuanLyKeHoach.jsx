import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useTabs } from '../../contexts/TabContext';
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
    Form,
    Row,
    Col,
    InputNumber,
    Divider,
    Empty,
    Switch,
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
    Coins,
    Users,
    Lock,
    Unlock,
} from 'lucide-react';
import dayjs from 'dayjs';
import { execCRUD } from '../../services/apiServices';
import * as workflowApi from '../../services/workflowApi';
import TaoDeNGhiChiTienModal from './TaoDeNGhiChiTienModal';
import DanhSachDeNghiModal from './DanhSachDeNghiModal';
import styles from './QuanLyKeHoach.module.css';
import ColumnSelector from '../../components/common/ColumnSelector/ColumnSelector';
import useSavedTablePreferences, { sortRowsByPreference } from '../../hooks/useSavedTablePreferences';

const { Option } = Select;

// Lazy load DropDown components to avoid initialization issues
const SelectDuAn = React.lazy(() => import('../../components/DropDown/SelectDuAn'));
const SelectLoaiHinhDuAn = React.lazy(() => import('../../components/DropDown/SelectLoaiHinhDuAn'));
const SelectNhanVien = React.lazy(() => import('../../components/DropDown/SelectNhanVien'));
const SelectKhuVucDuAn = React.lazy(() => import('../../components/DropDown/SelectKhuVucDuAn'));
const SelectTienDoKeHoach = React.lazy(() => import('../../components/DropDown/SelectTienDoKeHoach'));
const SelectTrangThaiDuAn = React.lazy(() => import('../../components/DropDown/SelectTrangThaiDuAn'));
const SelectKeHoach = React.lazy(() => import('../../components/DropDown/SelectKeHoach'));

const QuanLyKeHoach = () => {
    const { addTab } = useTabs();
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
    const [isDNCTModalOpen, setIsDNCTModalOpen] = useState(false);
    const [isListDNModalOpen, setIsListDNModalOpen] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState(null);

    // Workflow projects (for linking a plan to a Workflow project)
    const [wfProjects, setWfProjects] = useState([]);

    // Quick Insert state
    const [newItem, setNewItem] = useState({
        lv002: '', // Tên kế hoạch
        lv069: '', // Loại kế hoạch
        lv501: '', // Dự án
        lv009: '', // Tên dự án
        lv073: 0, // % trúng thầu
        lv074: '', // Thời gian dự kiến cấp hàng
        lv075: 0, // Tổng giá dự toán
        lv076: '', // AD.TT
        lv077: '', // Ngày đóng hồ sơ thầu
        lv078: '', // Ngày đóng thầu
        lv007: 'PRIVATE', // Quyền
        lv072: 0, // % trúng thầu
        lv082: '', // Thương hiệu
        lv083: '', // Địa chỉ dự án
        lv084: '', // Loại hình dự án
        lv085: '', // Khu vực
        lv008: '', // Tiến độ
        lv097: '', // Người phối hợp
        lv079: '', // Sale
        lv080: '', // P.TTT
        lv081: '', // AD
        lv100: '', // Trạng thái dự án
        lv101: '', // Thời gian hoàn thành dự án
        lv102: 0, // Tổng giá bán dự kiến
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

    useEffect(() => {
        workflowApi.listProjects().then(setWfProjects).catch(() => setWfProjects([]));
    }, []);

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
            message.warning('Vui lòng nhập Tên kế hoạch và Chọn dự án');
            return;
        }
        setLoading(true);
        try {
            const result = await execCRUD('cr_lv0094', 'insert', newItem);
            if (result && result.success !== false && !result.error) {
                message.success('Thêm kế hoạch nhanh thành công');
                setNewItem({
                    ...newItem,
                    lv002: '',
                    lv069: '',
                    lv501: '',
                    lv009: '',
                    lv073: 0,
                    lv074: '',
                    lv075: 0,
                    lv076: '',
                    lv008: '',
                    lv100: '',
                    lv082: '',
                    lv083: '',
                    lv084: '',
                    lv085: '',
                    lv097: '',
                    lv079: '',
                    lv080: '',
                    lv081: '',
                    lv101: '',
                    lv102: 0,
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
                    const actionMap = {
                        copy: 'copyPlan',
                        approve: 'closePlan',
                        unapprove: 'openPlan',
                        delete: 'deletePlan',
                    };
                    const result = await execCRUD('cr_lv0094_detail', actionMap[action] || action, {
                        lv001: selectedRowKeys.join(','),
                    });
                    if (result && result.success !== false && !result.error) {
                        message.success(messages.success || result?.message || 'Thao tác thành công');
                        setSelectedRowKeys([]);
                        fetchData();
                    } else {
                        message.error(result?.message || 'Thao tác thất bại');
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

    const handleToggleStatus = useCallback((record) => {
        if (!record || !record.lv001) return;
        const isClosed = parseInt(record.lv098 || 0) >= 1;
        const actionText = isClosed ? 'mở lại' : 'đóng';

        Modal.confirm({
            title: `Xác nhận ${actionText} kế hoạch`,
            content: `Bạn có chắc chắn muốn ${actionText} kế hoạch "${record.lv002 || record.lv001}"?`,
            okText: 'Xác nhận',
            cancelText: 'Hủy',
            onOk: async () => {
                setActionLoading(true);
                try {
                    const action = isClosed ? 'openPlan' : 'closePlan';
                    const result = await execCRUD('cr_lv0094_detail', action, {
                        lv001: record.lv001,
                    });
                    if (result && result.success !== false && !result.error) {
                        message.success(isClosed ? 'Mở lại kế hoạch thành công.' : 'Đóng kế hoạch thành công.');
                        fetchData();
                    } else {
                        message.error(result?.message || 'Thao tác thất bại');
                    }
                } catch (error) {
                    console.error(error);
                    message.error('Lỗi kết nối máy chủ');
                } finally {
                    setActionLoading(false);
                }
            },
        });
    }, [fetchData]);

    const openChildPage = useCallback((record) => {
        if (!record?.lv001) return;
        addTab(`/quan-ly-ke-hoach/${encodeURIComponent(record.lv001)}`, null, { record });
    }, [addTab]);

    const openCreateDrawer = () => {
        setEditingRecord(null);
        form.resetFields();
        form.setFieldsValue({
            lv002: '',
            lv069: '',
            lv501: '',
            lv009: '',
            lv073: 0,
            lv074: null,
            lv075: 0,
            lv076: [],
            lv077: null,
            lv078: null,
            lv007: 'PRIVATE',
            lv072: 0,
            lv082: '',
            lv083: '',
            lv084: '',
            lv085: '',
            lv008: '',
            lv097: [],
            lv079: [],
            lv080: [],
            lv081: [],
            lv100: '',
            lv101: null,
            lv102: 0,
            wf_project_id: undefined,
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
            lv009: record.lv009 || '',
            lv073: record.lv073 ? Number(record.lv073) : 0,
            lv074: record.lv074 && record.lv074 !== '0000-00-00' ? dayjs(record.lv074) : null,
            lv075: record.lv075 ? Number(record.lv075) : 0,
            lv076: record.lv076 ? record.lv076.split(',') : [],
            lv077: record.lv077 && record.lv077 !== '0000-00-00' ? dayjs(record.lv077) : null,
            lv078: record.lv078 && record.lv078 !== '0000-00-00' ? dayjs(record.lv078) : null,
            lv007: record.lv007 || 'PRIVATE',
            lv072: record.lv072 ? Number(record.lv072) : 0,
            lv082: record.lv082 || '',
            lv083: record.lv083 || '',
            lv084: record.lv084 || '',
            lv085: record.lv085 || '',
            lv008: record.lv008 || '',
            lv097: record.lv097 ? record.lv097.split(',') : [],
            lv079: record.lv079 ? record.lv079.split(',') : [],
            lv080: record.lv080 ? record.lv080.split(',') : [],
            lv081: record.lv081 ? record.lv081.split(',') : [],
            lv100: record.lv100 || '',
            lv101: record.lv101 && record.lv101 !== '0000-00-00' ? dayjs(record.lv101) : null,
            lv102: record.lv102 ? Number(record.lv102) : 0,
            wf_project_id: record.wf_project_id ? Number(record.wf_project_id) : undefined,
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
                lv073: values.lv073 || 0,
                lv075: values.lv075 || 0,
                lv072: values.lv072 || 0,
                lv074: values.lv074 ? dayjs(values.lv074).format('YYYY-MM-DD') : '',
                lv077: values.lv077 ? dayjs(values.lv077).format('YYYY-MM-DD') : '',
                lv078: values.lv078 ? dayjs(values.lv078).format('YYYY-MM-DD') : '',
                lv101: values.lv101 ? dayjs(values.lv101).format('YYYY-MM-DD') : '',
                lv076: Array.isArray(values.lv076) ? values.lv076.join(',') : (values.lv076 || ''),
                lv079: Array.isArray(values.lv079) ? values.lv079.join(',') : (values.lv079 || ''),
                lv080: Array.isArray(values.lv080) ? values.lv080.join(',') : (values.lv080 || ''),
                lv081: Array.isArray(values.lv081) ? values.lv081.join(',') : (values.lv081 || ''),
                lv097: Array.isArray(values.lv097) ? values.lv097.join(',') : (values.lv097 || ''),
            };

            const isEditing = !!editingRecord;
            const action = isEditing ? 'update' : 'insert';

            if (isEditing) {
                payload.lv001 = editingRecord.lv001;
            }

            const result = await execCRUD('cr_lv0094', action, payload);
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
                        <Tooltip title="Lưu nhanh (hoặc ấn Enter ở các ô nhập)">
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
                return (
                    <Button
                        type="link"
                        size="small"
                        onClick={() => openChildPage(record)}
                        style={{ padding: 0, fontWeight: 600 }}
                    >
                        {text}
                    </Button>
                );
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
                return text;
            }
        },
        {
            title: 'Mã cha',
            dataIndex: 'lv069',
            key: 'lv069',
            width: 150,
            render: (text, record) => record.isEntry ? (
                <Suspense fallback={<Spin size="small" />}>
                    <SelectKeHoach
                        style={{ width: '100%' }}
                        value={newItem.lv069 || undefined}
                        onChange={val => setNewItem({ ...newItem, lv069: val })}
                        size="small"
                        allowClear
                        placeholder="Mã cha..."
                        popupMatchSelectWidth={false}
                    />
                </Suspense>
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
                        popupMatchSelectWidth={false}
                        dropdownMatchSelectWidth={false}
                    />
                </Suspense>
            ) : (
                <Tooltip title={record.lv501}>
                    <span>{text || record.lv501}</span>
                </Tooltip>
            )
        },
        {
            title: 'Tên dự án',
            dataIndex: 'lv009',
            key: 'lv009',
            width: 220,
            ellipsis: true,
            render: (text, record) => record.isEntry ? (
                <Input value={newItem.lv009 || ''} onChange={e => setNewItem({ ...newItem, lv009: e.target.value })} size="small" onPressEnter={handleQuickAdd} />
            ) : text
        },
        {
            title: 'Loại kế hoạch',
            dataIndex: 'lv007',
            key: 'lv007',
            width: 120,
            render: (text, record) => record.isEntry ? (
                <Select dropdownMatchSelectWidth={false}
                    style={{ width: '100%' }}
                    value={newItem.lv007}
                    onChange={val => setNewItem({ ...newItem, lv007: val })}
                    size="small"
                    popupMatchSelectWidth={false}
                    
                >
                    <Option value="PRIVATE">PRIVATE</Option>
                    <Option value="PUBLIC">PUBLIC</Option>
                </Select>
            ) : (
                <Tag color={text === 'PUBLIC' ? 'cyan' : 'blue'}>{record.ten_quyen || text}</Tag>
            )
        },
        {
            title: 'Loại hình dự án',
            dataIndex: 'ten_loai_hinh',
            key: 'ten_loai_hinh',
            width: 180,
            render: (text, record) => record.isEntry ? (
                <Suspense fallback={<Spin size="small" />}>
                    <SelectLoaiHinhDuAn
                        style={{ width: '100%' }}
                        value={newItem.lv084}
                        onChange={val => setNewItem({ ...newItem, lv084: val })}
                        size="small"
                        popupMatchSelectWidth={false}
                        dropdownMatchSelectWidth={false}
                    />
                </Suspense>
            ) : (text || record.lv084)
        },
        {
            title: 'Khu vực',
            dataIndex: 'ten_khu_vuc',
            key: 'ten_khu_vuc',
            width: 160,
            render: (text, record) => record.isEntry ? (
                <Suspense fallback={<Spin size="small" />}>
                    <SelectKhuVucDuAn style={{ width: '100%' }} value={newItem.lv085} onChange={val => setNewItem({ ...newItem, lv085: val })} size="small" />
                </Suspense>
            ) : (text || record.lv085)
        },
        {
            title: 'Tiến độ',
            dataIndex: 'ten_tien_do',
            key: 'ten_tien_do',
            width: 160,
            render: (text, record) => record.isEntry ? (
                <Suspense fallback={<Spin size="small" />}>
                    <SelectTienDoKeHoach style={{ width: '100%' }} value={newItem.lv008} onChange={val => setNewItem({ ...newItem, lv008: val })} size="small" />
                </Suspense>
            ) : (text || record.lv008)
        },
        {
            title: 'Địa chỉ dự án',
            dataIndex: 'lv083',
            key: 'lv083',
            width: 200,
            ellipsis: true,
            render: (text, record) => record.isEntry ? (
                <Input
                    value={newItem.lv083}
                    onChange={e => setNewItem({ ...newItem, lv083: e.target.value })}
                    placeholder="Địa chỉ..."
                    size="small"
                    onPressEnter={handleQuickAdd}
                />
            ) : text
        },
        {
            title: 'Tổng giá dự toán',
            dataIndex: 'lv075',
            key: 'lv075',
            width: 150,
            align: 'right',
            render: (val, record) => record.isEntry ? (
                <Input
                    type="number"
                    value={newItem.lv075}
                    onChange={e => setNewItem({ ...newItem, lv075: e.target.value })}
                    size="small"
                    onPressEnter={handleQuickAdd}
                />
            ) : (val && val !== '0.00' ? Number(val).toLocaleString() : 0)
        },
        {
            title: 'Tổng giá bán dự kiến',
            dataIndex: 'lv102',
            key: 'lv102',
            width: 170,
            align: 'right',
            render: (val, record) => record.isEntry ? (
                <Input type="number" value={newItem.lv102} onChange={e => setNewItem({ ...newItem, lv102: e.target.value })} size="small" onPressEnter={handleQuickAdd} />
            ) : (val && val !== '0.00' ? Number(val).toLocaleString() : 0)
        },
        {
            title: '% Trúng thầu',
            dataIndex: 'lv073',
            key: 'lv073',
            width: 120,
            align: 'right',
            render: (val, record) => record.isEntry ? (
                <Input
                    type="number"
                    value={newItem.lv073}
                    onChange={e => setNewItem({ ...newItem, lv073: e.target.value })}
                    size="small"
                    onPressEnter={handleQuickAdd}
                />
            ) : (val ? `${val}%` : '0%')
        },
        {
            title: 'Thời gian dự kiến cấp hàng',
            dataIndex: 'lv074',
            key: 'lv074',
            width: 170,
            render: (text, record) => record.isEntry ? (
                <DatePicker style={{ width: '100%' }} value={newItem.lv074 ? dayjs(newItem.lv074) : null} onChange={(_, value) => setNewItem({ ...newItem, lv074: value })} size="small" />
            ) : formatDate(text)
        },
        {
            title: 'Ngày đóng hồ sơ thầu',
            dataIndex: 'lv077',
            key: 'lv077',
            width: 160,
            render: (text, record) => record.isEntry ? (
                <DatePicker style={{ width: '100%' }} value={newItem.lv077 ? dayjs(newItem.lv077) : null} onChange={(_, value) => setNewItem({ ...newItem, lv077: value })} size="small" />
            ) : formatDate(text)
        },
        {
            title: 'Ngày đóng thầu',
            dataIndex: 'lv078',
            key: 'lv078',
            width: 160,
            render: (text, record) => record.isEntry ? (
                <DatePicker style={{ width: '100%' }} value={newItem.lv078 ? dayjs(newItem.lv078) : null} onChange={(_, value) => setNewItem({ ...newItem, lv078: value })} size="small" />
            ) : formatDate(text)
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
                        popupMatchSelectWidth={false}
                        dropdownMatchSelectWidth={false}
                    />
                </Suspense>
            ) : (record.ten_nguoi_phoi_hop || text)
        },
        {
            title: 'Sale',
            dataIndex: 'lv079',
            key: 'lv079',
            width: 150,
            render: (text, record) => record.isEntry ? (
                <Suspense fallback={<Spin size="small" />}>
                    <SelectNhanVien
                        mode="multiple"
                        style={{ width: '100%' }}
                        value={newItem.lv079 ? newItem.lv079.split(',') : []}
                        onChange={vals => setNewItem({ ...newItem, lv079: vals.join(',') })}
                        size="small"
                        popupMatchSelectWidth={false}
                        dropdownMatchSelectWidth={false}
                    />
                </Suspense>
            ) : (record.ten_sale || text)
        },
        {
            title: 'P.TTT',
            dataIndex: 'lv080',
            key: 'lv080',
            width: 150,
            render: (text, record) => record.isEntry ? (
                <Suspense fallback={<Spin size="small" />}>
                    <SelectNhanVien
                        mode="multiple"
                        style={{ width: '100%' }}
                        value={newItem.lv080 ? newItem.lv080.split(',') : []}
                        onChange={vals => setNewItem({ ...newItem, lv080: vals.join(',') })}
                        size="small"
                        popupMatchSelectWidth={false}
                        dropdownMatchSelectWidth={false}
                    />
                </Suspense>
            ) : (record.ten_pttt || text)
        },
        {
            title: 'AD',
            dataIndex: 'lv081',
            key: 'lv081',
            width: 150,
            render: (text, record) => record.isEntry ? (
                <Suspense fallback={<Spin size="small" />}>
                    <SelectNhanVien
                        mode="multiple"
                        style={{ width: '100%' }}
                        value={newItem.lv081 ? newItem.lv081.split(',') : []}
                        onChange={vals => setNewItem({ ...newItem, lv081: vals.join(',') })}
                        size="small"
                        popupMatchSelectWidth={false}
                        dropdownMatchSelectWidth={false}
                    />
                </Suspense>
            ) : (record.ten_ad || text)
        },
        {
            title: 'Thương hiệu',
            dataIndex: 'lv082',
            key: 'lv082',
            width: 150,
            render: (text, record) => record.isEntry ? (
                <Input
                    value={newItem.lv082}
                    onChange={e => setNewItem({ ...newItem, lv082: e.target.value })}
                    size="small"
                    onPressEnter={handleQuickAdd}
                />
            ) : (record.ten_thuong_hieu || text)
        },
        {
            title: 'AD.TT',
            dataIndex: 'lv076',
            key: 'lv076',
            width: 150,
            render: (text, record) => record.isEntry ? (
                <Suspense fallback={<Spin size="small" />}>
                    <SelectNhanVien
                        mode="multiple"
                        style={{ width: '100%' }}
                        value={newItem.lv076 ? newItem.lv076.split(',') : []}
                        onChange={vals => setNewItem({ ...newItem, lv076: vals.join(',') })}
                        size="small"
                        popupMatchSelectWidth={false}
                        dropdownMatchSelectWidth={false}
                    />
                </Suspense>
            ) : (record.ten_ad_tt || text)
        },
        {
            title: 'Trạng thái dự án',
            dataIndex: 'ten_trang_thai_du_an',
            key: 'ten_trang_thai_du_an',
            width: 150,
            render: (text, record) => record.isEntry ? (
                <Suspense fallback={<Spin size="small" />}>
                    <SelectTrangThaiDuAn style={{ width: '100%' }} value={newItem.lv100} onChange={val => setNewItem({ ...newItem, lv100: val })} size="small" />
                </Suspense>
            ) : (text || record.lv100)
        },
        {
            title: 'TG Hoàn thành dự án',
            dataIndex: 'lv101',
            key: 'lv101',
            width: 150,
            render: (text, record) => record.isEntry ? (
                <DatePicker
                    style={{ width: '100%' }}
                    value={newItem.lv101 ? dayjs(newItem.lv101) : null}
                    onChange={(date, dateString) => setNewItem({ ...newItem, lv101: dateString })}
                    size="small"
                />
            ) : formatDate(text)
        },
        {
            title: 'Người tạo',
            dataIndex: 'ten_nguoi_tao',
            key: 'ten_nguoi_tao',
            width: 150,
            render: (text, record) => record.isEntry ? '' : text
        },
        {
            title: 'Ngày tạo',
            dataIndex: 'lv003',
            key: 'lv003',
            width: 150,
            render: (text, record) => record.isEntry ? <Tag color="orange">Tự động</Tag> : formatDate(text)
        },
        {
            title: 'Người đóng',
            dataIndex: 'ten_nguoi_dong',
            key: 'ten_nguoi_dong',
            width: 160,
            render: (text, record) => record.isEntry ? '' : (text || record.lv088)
        },
        {
            title: 'Ngày đóng',
            dataIndex: 'lv089',
            key: 'lv089',
            width: 160,
            render: (text, record) => record.isEntry ? '' : formatDate(text)
        },
        {
            title: 'Trạng thái',
            dataIndex: 'lv098',
            key: 'lv098',
            width: 140,
            render: (val, record) => {
                if (record.isEntry) return null;
                const isClosed = parseInt(val || 0) >= 1;
                return (
                    <Space size={6}>
                        <Tooltip title={isClosed ? 'Click để mở lại kế hoạch' : 'Click để đóng kế hoạch'}>
                            <Switch
                                checked={isClosed}
                                checkedChildren={<Lock size={12} />}
                                unCheckedChildren={<Unlock size={12} />}
                                size="small"
                                onChange={() => handleToggleStatus(record)}
                            />
                        </Tooltip>
                        <Tag
                            color={isClosed ? 'green' : 'blue'}
                            style={{ margin: 0, cursor: 'pointer' }}
                            onClick={() => handleToggleStatus(record)}
                        >
                            {isClosed ? 'Đã đóng' : 'Đang mở'}
                        </Tag>
                    </Space>
                );
            }
        },
        {
            title: 'Mốc thầu',
            key: 'duration',
            width: 300,
            render: (_, record) => record.isEntry ? (
                <Space>
                    <DatePicker
                        placeholder="Đóng hồ sơ"
                        value={newItem.lv077 ? dayjs(newItem.lv077) : null}
                        onChange={(date, dateString) => setNewItem({ ...newItem, lv077: dateString })}
                        size="small"
                    />
                    <DatePicker
                        placeholder="Đóng thầu"
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
    ], [newItem, handleQuickAdd, openChildPage, handleToggleStatus]);

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
        defaultFieldList: 'lv001,lv069,lv002,lv007,ten_du_an,lv009,lv083,ten_loai_hinh,lv082,ten_tien_do,ten_trang_thai_du_an,lv077,lv078,lv073,lv074,lv101,lv075,lv102,ten_khu_vuc,lv097,lv079,lv080,lv081,lv076,ten_nguoi_tao,lv003,ten_nguoi_dong,lv089,lv098',
        currentPage: 1,
        pageSize: 15,
    });

    const sortedRows = useMemo(() => sortRowsByPreference(filteredData, sortOrder, sortFieldOrder), [filteredData, sortOrder, sortFieldOrder]);

    const dataSource = useMemo(() => {
        return [
            { isEntry: true, lv001: 'new', key: 'new-row' },
            ...sortedRows.map((item) => ({ ...item, key: item.lv001 }))
        ];
    }, [sortedRows]);



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
                    Trang chủ
                </Breadcrumb.Item>
                <Breadcrumb.Item>Quản lý dự án &amp; kế hoạch</Breadcrumb.Item>
                <Breadcrumb.Item>Quản lý kế hoạch dự án</Breadcrumb.Item>
            </Breadcrumb>

            <div className={styles.pageTitle}>
                <FolderKanban size={20} />
                Quản Lý Kế Hoạch Dự Án
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
                                    popupMatchSelectWidth={false}
                                    dropdownMatchSelectWidth={false}
                                />
                            </Suspense>
                            <Select
                                allowClear
                                placeholder="Lọc theo quyền..."
                                value={statusFilter}
                                onChange={setStatusFilter}
                                style={{ width: 150 }}
                                popupMatchSelectWidth={false}
                                dropdownMatchSelectWidth={false}
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
                        {selectedRowKeys.length > 1 && <span style={{ color: '#faad14', marginLeft: 8 }}>(✔ Chọn đúng 1 dòng để sửa/tạo ĐNCT)</span>}
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
                    rowClassName={(record) => record.isEntry ? styles.quickRow : ''}
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
                        <Button onClick={() => { setDrawerVisible(false); form.resetFields(); }}>Huỷ</Button>
                        <Button type="primary" onClick={() => form.submit()} loading={loading}>
                            {editingRecord ? 'Cập nhật' : 'Thêm mới'}
                        </Button>
                    </Space>
                }
            >

                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSubmit}
                    className={styles.customForm}
                    size="small"
                >
                    <Divider orientation="left" style={{ margin: '12px 0 20px 0', borderColor: '#1890ff' }}>
                        <Space style={{ color: '#1890ff' }}>
                            <Briefcase size={16} />
                            <span style={{ fontWeight: 600 }}>1. Thông tin chung & Dự án</span>
                        </Space>
                    </Divider>
                    <Row gutter={[16, 8]}>
                        {editingRecord && (
                            <Col span={8}>
                                <Form.Item name="lv001" label="Mã kế hoạch">
                                    <Input disabled size="small" />
                                </Form.Item>
                            </Col>
                        )}
                        <Col span={editingRecord ? 16 : 16}>
                            <Form.Item name="lv002" label="Tên kế hoạch" rules={[{ required: true, message: 'Vui lòng nhập tên kế hoạch!' }]}>
                                <Input placeholder="Nhập tên kế hoạch..." size="small" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Suspense fallback={<Spin size="small" />}>
                                <Form.Item name="lv501" label="Dự án" rules={[{ required: true, message: 'Vui lòng chọn dự án!' }]}>
                                    <SelectDuAn style={{ width: '100%' }} placeholder="Chọn dự án..." size="small" popupMatchSelectWidth={false} dropdownMatchSelectWidth={false} />
                                </Form.Item>
                            </Suspense>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="wf_project_id" label="Dự án Workflow (tùy chọn)">
                                <Select
                                    style={{ width: '100%' }}
                                    placeholder="Liên kết dự án Workflow..."
                                    size="small"
                                    allowClear
                                    showSearch
                                    optionFilterProp="label"
                                    options={wfProjects.map((p) => ({ value: p.id, label: `${p.code} — ${p.name}` }))}
                                />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Suspense fallback={<Spin size="small" />}>
                                <Form.Item name="lv069" label="Mã cha">
                                    <SelectKeHoach
                                        style={{ width: '100%' }}
                                        placeholder="Chọn kế hoạch cha..."
                                        size="small"
                                        allowClear
                                        popupMatchSelectWidth={false}
                                        dropdownMatchSelectWidth={false}
                                    />
                                </Form.Item>
                            </Suspense>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="lv009" label="Tên dự án">
                                <Input placeholder="Nhập tên dự án..." size="small" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Suspense fallback={<Spin size="small" />}>
                                <Form.Item name="lv084" label="Loại hình dự án">
                                    <SelectLoaiHinhDuAn style={{ width: '100%' }} size="small" popupMatchSelectWidth={false} dropdownMatchSelectWidth={false} />
                                </Form.Item>
                            </Suspense>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="lv082" label="Thương hiệu">
                                <Input placeholder="Nhập thương hiệu..." size="small" />
                            </Form.Item>
                        </Col>
                        <Col span={16}>
                            <Form.Item name="lv083" label="Địa chỉ dự án">
                                <Input placeholder="Nhập địa chỉ dự án..." size="small" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Suspense fallback={<Spin size="small" />}>
                                <Form.Item name="lv085" label="Khu vực">
                                    <SelectKhuVucDuAn style={{ width: '100%' }} size="small" />
                                </Form.Item>
                            </Suspense>
                        </Col>
                        <Col span={8}>
                            <Suspense fallback={<Spin size="small" />}>
                                <Form.Item name="lv008" label="Tiến độ">
                                    <SelectTienDoKeHoach style={{ width: '100%' }} size="small" />
                                </Form.Item>
                            </Suspense>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="lv007" label="Loại kế hoạch">
                                <Select dropdownMatchSelectWidth={false} placeholder="Chọn loại kế hoạch..." size="small" popupMatchSelectWidth={false} dropdownMatchSelectWidth={false}>
                                    <Option value="PRIVATE">PRIVATE</Option>
                                    <Option value="PUBLIC">PUBLIC</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Divider orientation="left" style={{ margin: '24px 0 20px 0', borderColor: '#1890ff' }}>
                        <Space style={{ color: '#1890ff' }}>
                            <Coins size={16} />
                            <span style={{ fontWeight: 600 }}>2. Tài chính & Tiến độ</span>
                        </Space>
                    </Divider>
                    <Row gutter={[16, 8]}>
                        <Col span={8}>
                            <Form.Item name="lv075" label="Tổng giá dự toán">
                                <InputNumber
                                    style={{ width: '100%' }}
                                    min={0}
                                    formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                    parser={v => v.replace(/\$\s?|(,*)/g, '')}
                                    placeholder="Nhập tổng giá dự toán..."
                                    size="small"
                                />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="lv073" label="% Trúng thầu">
                                <InputNumber
                                    style={{ width: '100%' }}
                                    min={0}
                                    max={100}
                                    formatter={v => v ? `${v}%` : ''}
                                    parser={v => v.replace('%', '')}
                                    placeholder="Nhập phần trăm..."
                                    size="small"
                                />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="lv074" label="Thời gian dự kiến cấp hàng">
                                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Chọn thời gian cấp hàng..." size="small" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="lv077" label="Ngày đóng hồ sơ thầu">
                                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Chọn ngày đóng hồ sơ..." size="small" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="lv078" label="Ngày đóng thầu">
                                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Chọn ngày đóng thầu..." size="small" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="lv101" label="Thời gian hoàn thành dự án">
                                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Chọn thời gian hoàn thành..." size="small" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="lv102" label="Tổng giá bán dự kiến">
                                <InputNumber style={{ width: '100%' }} min={0} size="small" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Suspense fallback={<Spin size="small" />}>
                                <Form.Item name="lv100" label="Trạng thái dự án">
                                    <SelectTrangThaiDuAn style={{ width: '100%' }} size="small" />
                                </Form.Item>
                            </Suspense>
                        </Col>
                    </Row>

                    <Divider orientation="left" style={{ margin: '24px 0 20px 0', borderColor: '#1890ff' }}>
                        <Space style={{ color: '#1890ff' }}>
                            <Users size={16} />
                            <span style={{ fontWeight: 600 }}>3. Nhân sự phụ trách</span>
                        </Space>
                    </Divider>
                    <Row gutter={[16, 8]}>
                        <Col span={8}>
                            <Suspense fallback={<Spin size="small" />}>
                                <Form.Item name="lv079" label="Sale phụ trách">
                                    <SelectNhanVien mode="multiple" style={{ width: '100%' }} placeholder="Chọn nhân viên sale..." size="small" popupMatchSelectWidth={false} dropdownMatchSelectWidth={false} />
                                </Form.Item>
                            </Suspense>
                        </Col>
                        <Col span={8}>
                            <Suspense fallback={<Spin size="small" />}>
                                <Form.Item name="lv080" label="P.TTT phụ trách">
                                    <SelectNhanVien mode="multiple" style={{ width: '100%' }} placeholder="Chọn P.TTT..." size="small" popupMatchSelectWidth={false} dropdownMatchSelectWidth={false} />
                                </Form.Item>
                            </Suspense>
                        </Col>
                        <Col span={8}>
                            <Suspense fallback={<Spin size="small" />}>
                                <Form.Item name="lv081" label="AD phụ trách">
                                    <SelectNhanVien mode="multiple" style={{ width: '100%' }} placeholder="Chọn AD..." size="small" popupMatchSelectWidth={false} dropdownMatchSelectWidth={false} />
                                </Form.Item>
                            </Suspense>
                        </Col>
                        <Col span={8}>
                            <Suspense fallback={<Spin size="small" />}>
                                <Form.Item name="lv076" label="AD.TT phụ trách">
                                    <SelectNhanVien mode="multiple" style={{ width: '100%' }} placeholder="Chọn AD.TT..." size="small" popupMatchSelectWidth={false} dropdownMatchSelectWidth={false} />
                                </Form.Item>
                            </Suspense>
                        </Col>
                        <Col span={16}>
                            <Suspense fallback={<Spin size="small" />}>
                                <Form.Item name="lv097" label="Người phối hợp">
                                    <SelectNhanVien mode="multiple" style={{ width: '100%' }} placeholder="Chọn người phối hợp..." size="small" popupMatchSelectWidth={false} dropdownMatchSelectWidth={false} />
                                </Form.Item>
                            </Suspense>
                        </Col>
                    </Row>
                </Form>
            </Drawer>

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
