import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Table,
    Tag,
    Button,
    Input,
    DatePicker,
    Select,
    Space,
    Card,
    Drawer,
    Form,
    Popconfirm,
    message,
    Tooltip,
    Row,
    Col,
    Divider,
    Dropdown,
    Badge,
    Typography
} from 'antd';
import dayjs from 'dayjs';
import {
    Plus,
    Edit,
    Trash2,
    CheckCircle,
    Clock,
    Lock,
    Unlock,
    FileText,
    Download,
    RefreshCw,
    Send,
    CheckSquare,
    Sparkles,
    X,
    Check,
    FileSpreadsheet,
    Grid,
    Search,
    Settings
} from 'lucide-react';
import { FileExcelOutlined, FileWordOutlined, IeOutlined, ReloadOutlined, SettingOutlined } from '@ant-design/icons';
import { execCRUD } from '../../../services/apiServices';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import styles from '../QuanLyKeHoach.module.css';
import XemTongCVChildDrawer from './XemTongCVChild/XemTongCVChildDrawer';

const { Text } = Typography;
const { Option } = Select;

const OBJECT_TYPES = [
    { value: 'CUS', label: 'Khách hàng (CUS)' },
    { value: 'EMP', label: 'Nhân viên (EMP)' },
    { value: 'SUP', label: 'Nhà cung cấp (SUP)' },
    { value: 'DEP', label: 'Phòng ban (DEP)' },
    { value: 'HR', label: 'Nghiệp vụ (HR)' },
    { value: 'OTH', label: 'Khác (OTH)' }
];

const NhapCongViecTab = ({ detailData, onRefresh, prefillTask, onPrefillTaskConsumed }) => {
    const planId = detailData?.plan?.lv001;

    // Core state
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [permissions, setPermissions] = useState({
        add: 0,
        edit: 0,
        delete: 0,
        approve: 0,
        unapprove: 0,
        isBanThanDXD: 0
    });
    const [currentUserId, setCurrentUserId] = useState('');
    const [selectedRowKeys, setSelectedRowKeys] = useState([]);

    // Lookups
    const [lookups, setLookups] = useState({
        types: [],
        categories: [],
        subTasks: [],
        projects: [],
        employees: [],
        departments: [],
        customers: [],
        suppliers: [],
        periods: []
    });

    // Filters
    const [searchText, setSearchText] = useState('');
    const [filterType, setFilterType] = useState('');
    const [filterExecutor, setFilterExecutor] = useState('');
    const [filterStatus, setFilterStatus] = useState(''); // lv011
    const [filterManagerStatus, setFilterManagerStatus] = useState(''); // lv027

    // Quick Add state (Inline row editor values)
    const [quickRowData, setQuickRowData] = useState({
        lv003: '',
        lv049: '',
        lv501: '',
        lv004: '',
        lv005: dayjs(),
        lv005_time: '17:00:00',
        lv006: '',
        lv007: '',
        lv008: '',
        lv013: 'CUS',
        lv014: '',
        lv111: ''
    });

    // Edit Drawer Form
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);
    const [drawerForm] = Form.useForm();
    const [selectedObjType, setSelectedObjType] = useState('CUS');
    const [taskDetailVisible, setTaskDetailVisible] = useState(false);
    const [taskDetailRecord, setTaskDetailRecord] = useState(null);

    // Auto prepopulate quickRowData defaults
    useEffect(() => {
        if (lookups.types.length > 0 && !quickRowData.lv003) {
            setQuickRowData(prev => ({
                ...prev,
                lv003: lookups.types[0].value
            }));
        }
    }, [lookups, quickRowData.lv003]);

    useEffect(() => {
        if (lookups.categories.length > 0 && !quickRowData.lv049) {
            setQuickRowData(prev => ({
                ...prev,
                lv049: lookups.categories[0].value
            }));
        }
    }, [lookups, quickRowData.lv049]);

    useEffect(() => {
        if (lookups.subTasks.length > 0 && !quickRowData.lv501) {
            setQuickRowData(prev => ({
                ...prev,
                lv501: lookups.subTasks[0].value
            }));
        }
    }, [lookups, quickRowData.lv501]);

    useEffect(() => {
        if (currentUserId && !quickRowData.lv008) {
            setQuickRowData(prev => ({
                ...prev,
                lv008: currentUserId,
                lv006: currentUserId
            }));
        }
    }, [currentUserId, quickRowData.lv008]);

    useEffect(() => {
        if (!prefillTask) return;
        setEditingRecord(null);
        setSelectedObjType(prefillTask.lv013 || 'CUS');
        drawerForm.resetFields();
        drawerForm.setFieldsValue({
            lv003: prefillTask.lv003 || 'BBG',
            lv049: prefillTask.lv049 || lookups.categories[0]?.value,
            lv501: prefillTask.lv501 || lookups.subTasks[0]?.value,
            lv004: prefillTask.lv004 || 'Báo giá',
            lv005: prefillTask.lv005 ? dayjs(prefillTask.lv005) : dayjs(),
            lv005_time: prefillTask.lv005_time || '17:00:00',
            lv006: prefillTask.lv006 || currentUserId || 'admin',
            lv007: prefillTask.lv007 || '',
            lv008: prefillTask.lv008 || currentUserId || 'admin',
            lv013: prefillTask.lv013 || 'CUS',
            lv014: prefillTask.lv014 || '',
            lv111: prefillTask.lv111 || 'Tạo tự động từ luồng thêm báo giá'
        });
        setDrawerVisible(true);
        onPrefillTaskConsumed?.();
    }, [prefillTask, drawerForm, currentUserId, lookups.categories, lookups.subTasks, onPrefillTaskConsumed]);

    // === FETCH FUNCTIONS ===

    const loadLookups = useCallback(async () => {
        try {
            const res = await execCRUD('cr_lv0025_xemtongcv', 'loadLookups', { planId });
            let parsedRes = res;
            if (typeof res === 'string') {
                try {
                    parsedRes = JSON.parse(res.trim());
                } catch (e) {
                    console.error('Lỗi phân tích JSON từ chuỗi kết quả:', e);
                }
            }
            if (parsedRes && parsedRes.success) {
                const getOptions = (list) => {
                    if (Array.isArray(list)) return list;
                    if (list && typeof list === 'object') return Object.values(list);
                    return [];
                };
                setLookups({
                    types: getOptions(parsedRes.types),
                    categories: getOptions(parsedRes.categories),
                    subTasks: getOptions(parsedRes.subTasks),
                    projects: getOptions(parsedRes.projects),
                    employees: getOptions(parsedRes.employees),
                    departments: getOptions(parsedRes.departments),
                    customers: getOptions(parsedRes.customers),
                    suppliers: getOptions(parsedRes.suppliers),
                    periods: getOptions(parsedRes.periods)
                });
            }
        } catch (error) {
            console.error('Lỗi khi tải lookup dữ liệu:', error);
        }
    }, [planId]);

    const loadData = useCallback(async () => {
        if (!planId) return;
        setLoading(true);
        setSelectedRowKeys([]);
        try {
            const res = await execCRUD('cr_lv0094_detail', 'loadPlanDetail', { lv001: planId });
            let parsedRes = res;
            if (typeof res === 'string') {
                try {
                    parsedRes = JSON.parse(res.trim());
                } catch (e) {
                    console.error('Lỗi phân tích JSON:', e);
                }
            }

            let legacyRes = null;
            try {
                legacyRes = await execCRUD('cr_lv0025_xemtongcv', 'load', { planId });
                if (typeof legacyRes === 'string') {
                    legacyRes = JSON.parse(legacyRes.trim());
                }
            } catch (err) {
                console.error('Lỗi tải permissions/currentUserId từ api phụ:', err);
            }

            if (parsedRes && parsedRes.success) {
                let rows = [];
                const tasksData = parsedRes?.tabs?.tasks;
                if (Array.isArray(tasksData)) {
                    rows = tasksData;
                } else if (tasksData && typeof tasksData === 'object') {
                    rows = Object.values(tasksData);
                }

                const mappedRows = rows.map(item => ({
                    ...item,
                    ten_loai_cong_viec: item.ten_loai_cong_viec || item.lv003_text || item.lv003,
                    lv005_formatted: item.lv005_formatted || item.lv005,
                    ten_nguoi_tao: item.ten_nguoi_tao || item.lv008_text || item.lv008,
                    lv011: item.lv011 || '0',
                }));
                setTasks(mappedRows);

                const permSource = parsedRes.permissions || legacyRes?.permissions;
                if (permSource) {
                    setPermissions(permSource);
                }
                const userIdSource = parsedRes.currentUserId || legacyRes?.currentUserId;
                if (userIdSource) {
                    setCurrentUserId(userIdSource);
                }
            } else {
                setTasks([]);
                message.error(parsedRes?.message || 'Không thể tải danh sách công việc');
            }
        } catch (error) {
            console.error('Lỗi tải danh sách công việc:', error);
            message.error('Lỗi kết nối máy chủ');
        } finally {
            setLoading(false);
        }
    }, [planId]);

    useEffect(() => {
        loadLookups();
    }, [loadLookups]);

    useEffect(() => {
        loadData();
    }, [planId, loadData]);

    const handleRefresh = async () => {
        setLoading(true);
        setSelectedRowKeys([]);
        await loadLookups();
        await loadData();
        if (onRefresh) {
            await onRefresh();
        }
        setLoading(false);
    };

    // === FILTERING ===

    const filteredTasks = useMemo(() => {
        return tasks.filter(task => {
            const matchesSearch = !searchText ||
                (task.lv004 && task.lv004.toLowerCase().includes(searchText.toLowerCase())) ||
                (task.lv001 && task.lv001.toLowerCase().includes(searchText.toLowerCase()));

            const matchesType = !filterType || task.lv003 === filterType;
            const matchesExecutor = !filterExecutor || task.lv006 === filterExecutor;

            const matchesStatus = filterStatus === '' || task.lv011 === String(filterStatus);
            const matchesManagerStatus = filterManagerStatus === '' || task.lv027 === String(filterManagerStatus);

            return matchesSearch && matchesType && matchesExecutor && matchesStatus && matchesManagerStatus;
        });
    }, [tasks, searchText, filterType, filterExecutor, filterStatus, filterManagerStatus]);

    // === ACTION HANDLERS ===
    const handleQuickSubmit = async () => {
        if (!quickRowData.lv004) {
            message.warning('Vui lòng nhập nội dung công việc để thêm nhanh!');
            return;
        }
        try {
            setLoading(true);
            const dateStr = quickRowData.lv005 ? quickRowData.lv005.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD');
            const timeStr = quickRowData.lv005_time || '17:00:00';

            const payload = {
                planId,
                data: {
                    lv003: quickRowData.lv003 || lookups.types[0]?.value,
                    lv049: quickRowData.lv049 || lookups.categories[0]?.value,
                    lv501: quickRowData.lv501 || lookups.subTasks[0]?.value,
                    lv004: quickRowData.lv004,
                    lv005: dateStr,
                    lv005_time: timeStr,
                    lv006: quickRowData.lv006 || currentUserId || 'admin',
                    lv007: quickRowData.lv007 || '',
                    lv008: quickRowData.lv008 || currentUserId || 'admin',
                    lv013: quickRowData.lv013 || 'CUS',
                    lv014: quickRowData.lv014 || '',
                    lv111: quickRowData.lv111 || ''
                }
            };

            const res = await execCRUD('cr_lv0025_xemtongcv', 'insert', payload);
            if (res && res.success) {
                message.success('Thêm nhanh công việc thành công!');
                setQuickRowData({
                    lv003: lookups.types[0]?.value || '',
                    lv049: lookups.categories[0]?.value || '',
                    lv501: lookups.subTasks[0]?.value || '',
                    lv004: '',
                    lv005: dayjs(),
                    lv005_time: '17:00:00',
                    lv006: currentUserId || 'admin',
                    lv007: '',
                    lv008: currentUserId || 'admin',
                    lv013: 'CUS',
                    lv014: '',
                    lv111: ''
                });
                await loadData();
                if (onRefresh) onRefresh();
            } else {
                message.error(res?.message || 'Lỗi thêm công việc');
            }
        } catch (error) {
            console.error(error);
            message.error('Lỗi khi thêm công việc');
        } finally {
            setLoading(false);
        }
    };

    const openTaskDetail = (record) => {
        if (!record || record.isQuickRow) return;
        setTaskDetailRecord(record);
        setTaskDetailVisible(true);
    };

    // Open Edit/Add Drawer (Sidebar Drawer)
    const openEditDrawer = (record = null) => {
        if (record) {
            setEditingRecord(record);
            setSelectedObjType(record.lv013 || 'CUS');
            drawerForm.setFieldsValue({
                lv003: record.lv003,
                lv049: record.lv049,
                lv501: record.lv501,
                lv004: record.lv004,
                lv005: record.lv005 && record.lv005 !== '1900-01-01 00:00:00' ? dayjs(record.lv005) : null,
                lv005_time: record.lv005 && record.lv005 !== '1900-01-01 00:00:00' ? dayjs(record.lv005).format('HH:mm:ss') : '17:00:00',
                lv006: record.lv006,
                lv007: record.lv007,
                lv008: record.lv008,
                lv013: record.lv013 || 'CUS',
                lv014: record.lv014,
                lv111: record.lv111
            });
        } else {
            setEditingRecord(null);
            setSelectedObjType('CUS');
            drawerForm.resetFields();
            drawerForm.setFieldsValue({
                lv003: lookups.types[0]?.value,
                lv049: lookups.categories[0]?.value,
                lv501: lookups.subTasks[0]?.value,
                lv005: dayjs(),
                lv005_time: '17:00:00',
                lv013: 'CUS',
                lv008: currentUserId || 'admin',
                lv006: currentUserId || 'admin'
            });
        }
        setDrawerVisible(true);
    };

    // Save Drawer Form
    const handleDrawerSave = async () => {
        try {
            const values = await drawerForm.validateFields();
            const dateStr = values.lv005 ? values.lv005.format('YYYY-MM-DD') : '';

            const payload = {
                planId,
                data: {
                    lv001: editingRecord?.lv001,
                    lv003: values.lv003,
                    lv049: values.lv049,
                    lv501: values.lv501,
                    lv004: values.lv004,
                    lv005: dateStr,
                    lv005_time: values.lv005_time || '17:00:00',
                    lv006: values.lv006,
                    lv007: values.lv007,
                    lv008: values.lv008,
                    lv013: values.lv013,
                    lv014: values.lv014,
                    lv111: values.lv111
                }
            };

            const action = editingRecord ? 'update' : 'insert';
            const res = await execCRUD('cr_lv0025_xemtongcv', action, payload);
            if (res && res.success) {
                message.success(editingRecord ? 'Cập nhật công việc thành công!' : 'Thêm mới công việc thành công!');
                setDrawerVisible(false);
                await loadData();
                if (onRefresh) onRefresh();
            } else {
                message.error(res?.message || 'Thao tác thất bại');
            }
        } catch (error) {
            console.error('Drawer validation failed:', error);
        }
    };

    // Delete single or batch
    const handleDelete = async (ids) => {
        try {
            const listIds = Array.isArray(ids) ? ids : [ids];
            let successCount = 0;

            for (const id of listIds) {
                const res = await execCRUD('cr_lv0025_xemtongcv', 'delete', { childId: id });
                if (res && res.success) {
                    successCount++;
                } else {
                    message.error(`Không thể xóa CV ${id}: ${res?.message || 'Không đủ quyền'}`);
                }
            }

            if (successCount > 0) {
                message.success(`Đã xóa thành công ${successCount} công việc`);
                await loadData();
                if (onRefresh) onRefresh();
            }
        } catch (error) {
            console.error(error);
            message.error('Lỗi khi xóa công việc');
        }
    };

    // State Transitions
    const handleTransition = async (action, ids, label) => {
        try {
            const listIds = Array.isArray(ids) ? ids : [ids];
            let successCount = 0;

            for (const id of listIds) {
                const res = await execCRUD('cr_lv0025_xemtongcv', action, { childId: id });
                if (res && res.success) {
                    successCount++;
                } else {
                    message.error(`Lỗi thực hiện với CV ${id}: ${res?.message || 'Thao tác thất bại'}`);
                }
            }

            if (successCount > 0) {
                message.success(`Đã thực hiện: "${label}" cho ${successCount} công việc`);
                await loadData();
                if (onRefresh) onRefresh();
            }
        } catch (error) {
            console.error(error);
            message.error('Lỗi thực hiện phê duyệt');
        }
    };

    // Close Drawer Reset Form
    const handleDrawerClose = () => {
        drawerForm.resetFields();
        setEditingRecord(null);
        setDrawerVisible(false);
    };

    // Batch Action Transitions (Client-side validation - only startTask is supported here)
    const handleBatchTransition = async (action, label) => {
        if (selectedRowKeys.length === 0) return;

        const invalidTasks = [];

        for (const key of selectedRowKeys) {
            const task = tasks.find(t => t.lv001 === key);
            if (!task) continue;

            const isExecutor = task.lv006 === currentUserId;
            const canApprove = permissions.approve === 1;

            if (action === 'startTask') {
                if (task.lv011 !== '0') {
                    invalidTasks.push(`CV ${task.lv001}: đã bắt đầu thực hiện hoặc đã duyệt.`);
                } else if (!isExecutor && !canApprove) {
                    invalidTasks.push(`CV ${task.lv001}: bạn không phải người thực hiện và không có quyền duyệt.`);
                }
            }
        }

        if (invalidTasks.length > 0) {
            message.error(
                <div>
                    <strong>Thao tác hàng loạt không hợp lệ do {invalidTasks.length} dòng lỗi:</strong>
                    <ul style={{ paddingLeft: 16, marginTop: 8, textAlign: 'left' }}>
                        {invalidTasks.map((msg, i) => <li key={i}>{msg}</li>)}
                    </ul>
                </div>,
                6
            );
            return;
        }

        await handleTransition(action, selectedRowKeys, label);
        setSelectedRowKeys([]);
    };

    // Batch Action Delete (Client-side validation)
    const handleBatchDelete = async () => {
        if (selectedRowKeys.length === 0) return;

        const invalidTasks = [];

        for (const key of selectedRowKeys) {
            const task = tasks.find(t => t.lv001 === key);
            if (!task) continue;

            if (permissions.delete !== 1) {
                invalidTasks.push(`CV ${task.lv001}: bạn không có quyền xóa.`);
            } else if (task.lv011 !== '0') {
                invalidTasks.push(`CV ${task.lv001}: đã thực hiện hoặc đã duyệt, không thể xóa.`);
            }
        }

        if (invalidTasks.length > 0) {
            message.error(
                <div>
                    <strong>Không thể xóa do {invalidTasks.length} dòng không hợp lệ:</strong>
                    <ul style={{ paddingLeft: 16, marginTop: 8, textAlign: 'left' }}>
                        {invalidTasks.map((msg, i) => <li key={i}>{msg}</li>)}
                    </ul>
                </div>,
                6
            );
            return;
        }

        await handleDelete(selectedRowKeys);
        setSelectedRowKeys([]);
    };

    // Dynamic Select Options for Object Reference
    const objectOptions = useMemo(() => {
        switch (selectedObjType) {
            case 'EMP': return lookups.employees;
            case 'DEP': return lookups.departments;
            case 'CUS': return lookups.customers;
            case 'SUP': return lookups.suppliers;
            case 'HR': return lookups.periods;
            default: return [];
        }
    }, [selectedObjType, lookups]);

    // === EXPORT UTILITIES ===
    const getDataForExport = () => {
        return filteredTasks.map((item, index) => {
            let statusText = 'Chưa thực hiện';
            if (item.lv011 === '1') statusText = 'Đang thực hiện';
            if (item.lv011 === '2') statusText = 'Đã duyệt';

            let mngStatusText = 'Chưa duyệt';
            if (item.lv027 === '1') mngStatusText = 'Đề xuất duyệt';
            if (item.lv027 === '2') mngStatusText = 'Quản lý đã duyệt';

            return {
                'STT': index + 1,
                'Mã CV': item.lv001 || '',
                'Loại công việc': item.ten_loai_cong_viec || item.lv003 || '',
                'Nội dung công việc': item.lv004 || '',
                'Hạn hoàn thành': item.lv005_formatted ? dayjs(item.lv005_formatted).format('DD/MM/YYYY HH:mm') : '',
                'Người thực hiện': item.ten_nguoi_thuc_hien || item.lv006 || '',
                'Người phối hợp': item.ten_nguoi_phoi_hop || item.lv007 || '',
                'Trạng thái': statusText,
                'QL duyệt': mngStatusText,
                'Kế toán duyệt': item.lv016 === '1' ? 'Đã duyệt' : 'Chưa duyệt',
                'Người tạo': item.ten_nguoi_tao || item.lv008 || '',
                'Ngày tạo': item.lv010_formatted ? dayjs(item.lv010_formatted).format('DD/MM/YYYY') : '',
                'Thông tin bổ sung': item.lv111 || ''
            };
        });
    };

    const getHtmlTable = (data, title) => {
        if (data.length === 0) return '';
        const headers = Object.keys(data[0]);
        let html = `
        <h2 style="text-align: center; font-family: Arial, sans-serif;">${title}</h2>
        <table border="1" style="border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; font-size: 12px; margin-top: 15px;">
            <thead>
                <tr style="background-color: #2c3e50; color: white; text-align: center; font-weight: bold;">
                    ${headers.map(h => `<th style="padding: 10px; border: 1px solid #bdc3c7;">${h}</th>`).join('')}
                </tr>
            </thead>
            <tbody>`;
        data.forEach(row => {
            html += '<tr>';
            headers.forEach(h => {
                html += `<td style="padding: 8px; border: 1px solid #bdc3c7; text-align: ${typeof row[h] === 'number' ? 'right' : 'left'}">${row[h] ?? ''}</td>`;
            });
            html += '</tr>';
        });
        html += '</tbody></table>';
        return html;
    };

    const exportToExcel = () => {
        const data = getDataForExport();
        if (data.length === 0) {
            message.warning('Không có dữ liệu để xuất');
            return;
        }
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "NhapCongViec");
        XLSX.writeFile(wb, `NhapCongViec_KeHoach_${planId}.xlsx`);
        message.success('Đã xuất Excel thành công');
    };

    const exportToWord = () => {
        const data = getDataForExport();
        if (data.length === 0) {
            message.warning('Không có dữ liệu để xuất');
            return;
        }
        const htmlContent = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset='utf-8'><title>Nhập Công Việc</title></head>
        <body>
            ${getHtmlTable(data, `DANH SÁCH NHẬP CÔNG VIỆC KẾ HOẠCH - ${planId}`)}
        </body>
        </html>`;
        const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
        saveAs(blob, `NhapCongViec_KeHoach_${planId}.doc`);
        message.success('Đã xuất Word thành công');
    };

    const exportToWeb = () => {
        const data = getDataForExport();
        if (data.length === 0) {
            message.warning('Không có dữ liệu để xuất');
            return;
        }
        const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Nhập Công Việc</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; background-color: #f5f6fa; }
                .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                h1 { text-align: center; color: #2c3e50; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #dcdde1; padding: 10px; text-align: left; }
                th { background-color: #2f3640; color: white; }
                tr:nth-child(even) { background-color: #f8f9fa; }
                tr:hover { background-color: #f1f2f6; }
            </style>
        </head>
        <body>
            <div class="container">
                ${getHtmlTable(data, `DANH SÁCH NHẬP CÔNG VIỆC KẾ HOẠCH - ${planId}`)}
            </div>
        </body>
        </html>`;
        const blob = new Blob(['\ufeff', htmlContent], { type: 'text/html' });
        saveAs(blob, `NhapCongViec_KeHoach_${planId}.html`);
        message.success('Đã xuất file Web thành công');
    };

    const exportMenu = [
        { key: 'excel', label: 'Tạo tập tin Excel', icon: <FileExcelOutlined />, onClick: exportToExcel },
        { key: 'word', label: 'Tạo tập tin Word', icon: <FileWordOutlined />, onClick: exportToWord },
        { key: 'web', label: 'Tạo tập tin Web', icon: <IeOutlined />, onClick: exportToWeb }
    ];

    // === TABLE COLUMNS CONFIG ===
    const columns = [
        {
            title: 'STT',
            key: 'stt',
            width: 70,
            align: 'center',
            render: (_, record, index) => {
                if (record.isQuickRow) return (
                    <Button
                        type='primary'
                        size='small'
                        shape='circle'
                        icon={<Plus size={14} />}
                        onClick={handleQuickSubmit}
                        title='Thêm nhanh (Enter)'
                    />
                );
                return index;
            }
        },
        {
            title: 'Mã tự động',
            dataIndex: 'lv001',
            key: 'lv001',
            width: 100,
            render: (val, record) => {
                if (record.isQuickRow) return <span style={{ color: '#8c8c8c' }}>Tự động</span>;
                return <Text strong style={{ color: '#1677ff' }}>{val}</Text>;
            }
        },
        {
            title: 'Mã công việc',
            dataIndex: 'ten_loai_cong_viec',
            key: 'ten_loai_cong_viec',
            width: 250,
            render: (val, record) => {
                if (record.isQuickRow) {
                    return (
                        <Select
                            size='small'
                            placeholder='Loại CV'
                            value={quickRowData.lv003}
                            onChange={(val) => setQuickRowData({ ...quickRowData, lv003: val })}
                            style={{ width: '100%' }}
                            showSearch
                            optionFilterProp='children'
                        >
                            {lookups.types.map(t => (
                                <Option key={t.value} value={t.value}>{t.label}</Option>
                            ))}
                        </Select>
                    );
                }
                return val || record.lv003 || <Text type="secondary">-</Text>;
            }
        },
        // {
        //     title: 'Tác vụ',
        //     dataIndex: 'ten_tac_vu',
        //     key: 'ten_tac_vu',
        //     width: 220,
        //     render: (val, record) => {
        //         if (record.isQuickRow) {
        //             return (
        //                 <Select
        //                     size='small'
        //                     placeholder='Tác vụ'
        //                     value={quickRowData.lv501}
        //                     onChange={(val) => setQuickRowData({ ...quickRowData, lv501: val })}
        //                     style={{ width: '100%' }}
        //                     showSearch
        //                     optionFilterProp='children'
        //                     allowClear
        //                 >
        //                     {lookups.subTasks.map(st => (
        //                         <Option key={st.value} value={st.value}>{st.label}</Option>
        //                     ))}
        //                 </Select>
        //             );
        //         }
        //         return val || record.lv501 || <Text type="secondary">-</Text>;
        //     }
        // },
        // {
        //     title: 'Loại CV',
        //     dataIndex: 'ten_loai_cv',
        //     key: 'ten_loai_cv',
        //     width: 180,
        //     render: (val, record) => {
        //         if (record.isQuickRow) {
        //             return (
        //                 <Select
        //                     size='small'
        //                     placeholder='Phân loại'
        //                     value={quickRowData.lv049}
        //                     onChange={(val) => setQuickRowData({ ...quickRowData, lv049: val })}
        //                     style={{ width: '100%' }}
        //                     showSearch
        //                     optionFilterProp='children'
        //                 >
        //                     {lookups.categories.map(c => (
        //                         <Option key={c.value} value={c.value}>{c.label}</Option>
        //                     ))}
        //                 </Select>
        //             );
        //         }
        //         return val || record.lv049 || <Text type="secondary">-</Text>;
        //     }
        // },
        {
            title: 'Nội dung công việc',
            dataIndex: 'lv004',
            key: 'lv004',
            ellipsis: true,
            width: 200,
            render: (val, record) => {
                if (record.isQuickRow) {
                    return (
                        <Input
                            size='small'
                            placeholder='Nhập nội dung...'
                            value={quickRowData.lv004}
                            onChange={(e) => setQuickRowData({ ...quickRowData, lv004: e.target.value })}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleQuickSubmit();
                            }}
                            style={{ borderRadius: '4px' }}
                        />
                    );
                }
                return (
                    <Tooltip title={val}>
                        <span style={{ fontWeight: 500 }}>{val}</span>
                    </Tooltip>
                );
            }
        },
        {
            title: 'Người duyệt',
            dataIndex: 'lv008_text',
            key: 'lv008_text',
            width: 150,
            render: (val, record) => {
                if (record.isQuickRow) {
                    return (
                        <Select
                            size='small'
                            placeholder='Chọn NV'
                            value={quickRowData.lv006}
                            onChange={(val) => setQuickRowData({ ...quickRowData, lv006: val })}
                            style={{ width: '100%' }}
                            showSearch
                            optionFilterProp='children'
                        >
                            {lookups.employees.map(emp => (
                                <Option key={emp.value} value={emp.value}>{emp.label}</Option>
                            ))}
                        </Select>
                    );
                }
                return val || record.lv006 || <Text type="secondary">-</Text>;
            }
        },

        {
            title: 'Hạn hoàn thành',
            dataIndex: 'lv005_formatted',
            key: 'lv005_date',
            width: 140,
            render: (val, record) => {
                if (record.isQuickRow) {
                    return (
                        <DatePicker
                            size='small'
                            format='DD/MM/YYYY'
                            value={quickRowData.lv005}
                            onChange={(val) => setQuickRowData({ ...quickRowData, lv005: val })}
                            style={{ width: '100%' }}
                        />
                    );
                }
                return val && val !== '1900-01-01 00:00:00' ? dayjs(val).format('DD/MM/YYYY') : <Text type="secondary">-</Text>;
            }
        },
        {
            title: 'Giờ hoàn thành',
            dataIndex: 'lv005_formatted',
            key: 'lv005_time',
            width: 110,
            render: (val, record) => {
                if (record.isQuickRow) {
                    return (
                        <Select
                            size='small'
                            placeholder='Giờ'
                            value={quickRowData.lv005_time}
                            onChange={(val) => setQuickRowData({ ...quickRowData, lv005_time: val })}
                            style={{ width: '100%' }}
                        >
                            <Option value="08:00:00">08:00:00</Option>
                            <Option value="09:00:00">09:00:00</Option>
                            <Option value="10:00:00">10:00:00</Option>
                            <Option value="12:00:00">12:00:00</Option>
                            <Option value="14:00:00">14:00:00</Option>
                            <Option value="15:00:00">15:00:00</Option>
                            <Option value="17:00:00">17:00:00</Option>
                            <Option value="18:00:00">18:00:00</Option>
                        </Select>
                    );
                }
                return val && val !== '1900-01-01 00:00:00' ? dayjs(val).format('HH:mm') : <Text type="secondary">-</Text>;
            }
        },
        {
            title: 'Thực hiện (lv011)',
            dataIndex: 'lv011',
            key: 'lv011',
            width: 130,
            align: 'center',
            render: (val, record) => {
                if (record.isQuickRow) return <div style={{ color: '#8c8c8c', fontSize: '12px' }}>Tự động</div>;
                if (val === '2') return <Tag color="success" icon={<CheckCircle size={12} style={{ marginRight: 4 }} />}>Đã duyệt</Tag>;
                if (val === '1') return <Tag color="processing" icon={<Clock size={12} style={{ marginRight: 4 }} />}>Thực hiện</Tag>;
                return <Tag color="default">Chưa duyệt</Tag>;
            }
        },
        {
            title: 'Quản lý duyệt (lv027)',
            dataIndex: 'lv027',
            key: 'lv027',
            width: 140,
            align: 'center',
            render: (val, record) => {
                if (record.isQuickRow) return <div style={{ color: '#8c8c8c', fontSize: '12px' }}>Tự động</div>;
                if (val === '2') return <Tag color="success">QL duyệt</Tag>;
                if (val === '1') return <Tag color="warning">Đề xuất duyệt</Tag>;
                return <Tag color="default">Chưa duyệt</Tag>;
            }
        },
        {
            title: 'Kế toán duyệt (lv016)',
            dataIndex: 'lv016',
            key: 'lv016',
            width: 120,
            align: 'center',
            render: (val, record) => {
                if (record.isQuickRow) return <div style={{ color: '#8c8c8c', fontSize: '12px' }}>Tự động</div>;
                return val === '1' ? <Badge status="success" text="Đã duyệt" /> : <Badge status="default" text="Chưa duyệt" />;
            }
        },
        {
            title: 'Thao tác nhanh',
            key: 'quickActions',
            width: 170,
            fixed: 'right',
            align: 'center',
            render: (_, record) => {
                if (record.isQuickRow) return null;

                const isExecutor = record.lv006 === currentUserId;
                const canApprove = permissions.approve === 1;
                const canEdit = String(record.lv011) === '0';
                const canDelete = permissions.delete === 1 && String(record.lv011) === '0';
                const showStart = record.lv011 === '0' && (isExecutor || canApprove);

                return (
                    <Space size={4}>
                        {canEdit && (
                            <Tooltip title="Sửa thông tin công việc">
                                <Button
                                    size="small"
                                    icon={<Edit size={14} />}
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        openEditDrawer(record);
                                    }}
                                />
                            </Tooltip>
                        )}
                        {showStart && (
                            <Tooltip title="Thực hiện công việc">
                                <Button
                                    type="primary"
                                    size="small"
                                    ghost
                                    icon={<Send size={14} />}
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        handleTransition('startTask', record.lv001, 'Thực hiện CV');
                                    }}
                                />
                            </Tooltip>
                        )}
                        {canDelete && (
                            <Popconfirm
                                title="Xóa công việc?"
                                description="Thao tác này không thể hoàn tác."
                                onConfirm={() => handleDelete(record.lv001)}
                            >
                                <Tooltip title="Xóa công việc">
                                    <Button
                                        size="small"
                                        danger
                                        icon={<Trash2 size={14} />}
                                        onClick={(event) => event.stopPropagation()}
                                    />
                                </Tooltip>
                            </Popconfirm>
                        )}
                        {!canEdit && !showStart && !canDelete && (
                            <span style={{ color: '#8c8c8c', fontSize: '12px' }}>-</span>
                        )}
                    </Space>
                );
            }
        }
    ];

    return (
        <Space direction="vertical" size={14} style={{ width: '100%' }}>

            {/* Action Toolbar & Filters */}
            <div className={styles.toolbarRow}>
                <Row gutter={[12, 12]} align="middle">
                    <Col xs={24} sm={12} md={5}>
                        <Input
                            placeholder="Tìm nội dung, mã..."
                            value={searchText}
                            onChange={e => setSearchText(e.target.value)}
                            allowClear
                            prefix={<Search size={18} style={{ color: '#8c8c8c' }} />}
                        />
                    </Col>
                    <Col xs={24} sm={12} md={4}>
                        <Select dropdownMatchSelectWidth={false}
                            placeholder="Loại công việc"
                            style={{ width: '100%' }}
                            value={filterType}
                            onChange={setFilterType}
                            allowClear
                        >
                            {lookups.types.map(t => (
                                <Option key={t.value} value={t.value}>{t.label}</Option>
                            ))}
                        </Select>
                    </Col>
                    <Col xs={24} sm={12} md={4}>
                        <Select dropdownMatchSelectWidth={false}
                            placeholder="Người thực hiện"
                            style={{ width: '100%' }}
                            value={filterExecutor}
                            onChange={setFilterExecutor}
                            showSearch
                            optionFilterProp="children"
                            allowClear
                        >
                            {lookups.employees.map(emp => (
                                <Option key={emp.value} value={emp.value}>{emp.label}</Option>
                            ))}
                        </Select>
                    </Col>
                    <Col xs={24} sm={12} md={3}>
                        <Select dropdownMatchSelectWidth={false}
                            placeholder="Thực hiện"
                            style={{ width: '100%' }}
                            value={filterStatus}
                            onChange={setFilterStatus}
                            allowClear
                        >
                            <Option value="">Tất cả trạng thái</Option>
                            <Option value="0">Chưa duyệt</Option>
                            <Option value="1">Thực hiện</Option>
                            <Option value="2">Đã duyệt</Option>
                        </Select>
                    </Col>
                    <Col xs={24} sm={12} md={4}>
                        <Select dropdownMatchSelectWidth={false}
                            placeholder="Quản lý duyệt"
                            style={{ width: '100%' }}
                            value={filterManagerStatus}
                            onChange={setFilterManagerStatus}
                            allowClear
                        >
                            <Option value="">Tất cả QL duyệt</Option>
                            <Option value="0">QL Chưa duyệt</Option>
                            <Option value="1">Đề xuất duyệt</Option>
                            <Option value="2">QL Đã duyệt</Option>
                        </Select>
                    </Col>
                    <Col xs={24} md={4} style={{ textAlign: 'right' }}>
                        <Space>
                            <Tooltip title="Tải lại dữ liệu">
                                <Button
                                    icon={<ReloadOutlined />}
                                    onClick={handleRefresh}
                                    loading={loading}
                                />
                            </Tooltip>
                            <Dropdown menu={{ items: exportMenu }} trigger={['click']} placement="bottomRight">
                                <Button icon={<SettingOutlined />} />
                            </Dropdown>
                            <Button
                                type="primary"
                                icon={<Plus size={16} />}
                                onClick={() => openEditDrawer()}
                            >
                                Thêm mới
                            </Button>
                        </Space>
                    </Col>
                </Row>
            </div>

            {/* Batch Action Bar */}
            <div className={`${styles.batchActionBar} ${selectedRowKeys.length === 0 ? styles.batchActionBarDisabled : ''}`}>
                <span style={{ fontWeight: 600, color: '#197dd3', marginRight: 8 }}>
                    Thao tác hàng loạt ({selectedRowKeys.length} dòng):
                </span>
                <Button
                    icon={<Send size={16} />}
                    onClick={() => handleBatchTransition('startTask', 'Thực hiện CV')}
                    type="primary"
                    ghost
                    disabled={selectedRowKeys.length === 0}
                >
                    Thực hiện CV
                </Button>
                {permissions.delete === 1 && (
                    <Popconfirm
                        title="Xóa công việc hàng loạt"
                        description={`Bạn có chắc chắn muốn xóa ${selectedRowKeys.length} công việc đã chọn?`}
                        onConfirm={handleBatchDelete}
                        disabled={selectedRowKeys.length === 0}
                    >
                        <Button danger icon={<Trash2 size={16} />} disabled={selectedRowKeys.length === 0}>
                            Xóa
                        </Button>
                    </Popconfirm>
                )}
                <span style={{ marginLeft: 'auto', color: '#8c8c8c' }}>
                    Đã chọn <b>{selectedRowKeys.length}</b> dòng
                </span>
            </div>

            {/* Main Table */}
            <div className={styles.mainTable}>
                <Table
                    rowSelection={{
                        selectedRowKeys,
                        onChange: setSelectedRowKeys,
                        getCheckboxProps: (record) => ({
                            disabled: record.isQuickRow,
                        }),
                    }}
                    rowKey={(record) => record.isQuickRow ? 'QUICK' : record.lv001}
                    rowClassName={(record) => record.isQuickRow ? styles.quickRow : ''}
                    columns={columns}
                    dataSource={[{ isQuickRow: true, lv001: 'QUICK', key: 'QUICK' }, ...filteredTasks]}
                    loading={loading}
                    size="small"
                    bordered
                    pagination={{ pageSize: 15, showSizeChanger: true }}
                    scroll={{ x: 2150 }}
                    style={{ borderRadius: 8, overflow: 'hidden' }}
                    onRow={(record) => {
                        return {
                            style: { cursor: record.isQuickRow ? 'default' : 'pointer' },
                            onClick: (event) => {
                                if (record.isQuickRow) return;

                                const target = event.target;
                                if (
                                    target.closest('.ant-table-selection-column') ||
                                    target.closest('.ant-space') ||
                                    target.closest('.ant-btn') ||
                                    target.closest('.ant-select') ||
                                    target.closest('.ant-input') ||
                                    target.closest('.ant-picker') ||
                                    target.tagName.toLowerCase() === 'input' ||
                                    target.tagName.toLowerCase() === 'button'
                                ) {
                                    return;
                                }

                                openTaskDetail(record);
                            }
                        };
                    }}
                />
            </div>

            {/* ADD / EDIT DRAWER (SIDEBAR DRAWER) */}
            <Drawer
                title={
                    <Space>
                        <FileText size={20} color="#197dd3" />
                        <span>{editingRecord ? `Chỉnh sửa công việc: ${editingRecord.lv001}` : "Tạo mới công việc"}</span>
                    </Space>
                }
                placement="right"
                width={800}
                open={drawerVisible}
                onClose={handleDrawerClose}
                className={styles.khoDrawer}
                footer={
                    <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Button onClick={handleDrawerClose}>Hủy</Button>
                        <Button type="primary" onClick={handleDrawerSave} loading={loading}>
                            {editingRecord ? "Cập nhật" : "Thêm mới"}
                        </Button>
                    </Space>
                }
            >
                <Form form={drawerForm} layout="vertical" className={styles.customForm}>
                    <Divider className={styles.dividerSolid} orientation="left">Thông tin công việc</Divider>

                    <Row gutter={16}>
                        <Col span={8}>
                            <Form.Item name="lv003" label="Mã công việc" rules={[{ required: true, message: 'Vui lòng chọn mã!' }]}>
                                <Select dropdownMatchSelectWidth={false} placeholder="Chọn mã công việc" showSearch optionFilterProp="children">
                                    {lookups.types.map(t => (
                                        <Option key={t.value} value={t.value}>{t.label}</Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="lv501" label="Tác vụ">
                                <Select dropdownMatchSelectWidth={false} placeholder="Chọn tác vụ" allowClear showSearch optionFilterProp="children">
                                    {lookups.subTasks.map(st => (
                                        <Option key={st.value} value={st.value}>{st.label}</Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="lv049" label="Loại CV" rules={[{ required: true, message: 'Vui lòng chọn loại!' }]}>
                                <Select dropdownMatchSelectWidth={false} placeholder="Chọn phân loại" showSearch optionFilterProp="children">
                                    {lookups.categories.map(c => (
                                        <Option key={c.value} value={c.value}>{c.label}</Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item name="lv004" label="Nội dung công việc" rules={[{ required: true, message: 'Nhập nội dung!' }]}>
                        <Input.TextArea rows={4} placeholder="Mô tả cụ thể nội dung công việc cần thực hiện..." />
                    </Form.Item>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="lv005" label="Ngày hạn hoàn thành">
                                <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="lv005_time" label="Giờ hạn hoàn thành">
                                <Select dropdownMatchSelectWidth={false} placeholder="Chọn giờ">
                                    <Option value="08:00:00">08:00:00</Option>
                                    <Option value="09:00:00">09:00:00</Option>
                                    <Option value="10:00:00">10:00:00</Option>
                                    <Option value="12:00:00">12:00:00</Option>
                                    <Option value="14:00:00">14:00:00</Option>
                                    <Option value="15:00:00">15:00:00</Option>
                                    <Option value="17:00:00">17:00:00</Option>
                                    <Option value="18:00:00">18:00:00</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>



                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="lv008" label="Người duyệt" rules={[{ required: true }]}>
                                <Select dropdownMatchSelectWidth={false} placeholder="Chọn nhân viên duyệt" showSearch optionFilterProp="children">
                                    {lookups.employees.map(emp => (
                                        <Option key={emp.value} value={emp.value}>{emp.label}</Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="lv111" label="Thông tin bổ sung">
                                <Input placeholder="Thông tin ghi chú thêm..." />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Divider className={styles.dividerSolid} orientation="left">Đối tượng & Tham chiếu liên kết</Divider>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="lv013" label="Loại đối tượng liên kết">
                                <Select dropdownMatchSelectWidth={false}
                                    placeholder="Chọn loại đối tượng"
                                    onChange={(val) => {
                                        setSelectedObjType(val);
                                        drawerForm.setFieldsValue({ lv014: '' });
                                    }}
                                >
                                    {OBJECT_TYPES.map(ot => (
                                        <Option key={ot.value} value={ot.value}>{ot.label}</Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="lv014" label="Mã đối tượng cụ thể">
                                <Select dropdownMatchSelectWidth={false} placeholder="Chọn đối tượng chi tiết" showSearch optionFilterProp="children" allowClear>
                                    {objectOptions.map(opt => (
                                        <Option key={opt.value} value={opt.value}>{opt.label}</Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>
                </Form>
            </Drawer>

            <XemTongCVChildDrawer
                open={taskDetailVisible}
                onClose={() => { setTaskDetailVisible(false); setTaskDetailRecord(null); }}
                task={taskDetailRecord}
                planId={planId}
                lookups={lookups}
            />
        </Space>
    );
};

export default NhapCongViecTab;
