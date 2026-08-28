import {
  DownloadOutlined,
  EditOutlined,
  FileExcelOutlined,
  FileWordOutlined,
  IeOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  SortAscendingOutlined,
  SortDescendingOutlined,
} from '@ant-design/icons';
import {
  Breadcrumb,
  Button,
  Card,
  Col,
  Divider,
  Drawer,
  Dropdown,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Tooltip,
  message,
} from 'antd';
import { Eye, FileText, Layers, Trash2, Plus, Search, Edit } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import dayjs from 'dayjs';
import useCmsTableColumns from '../../../hooks/useCmsTableColumns';
import { lv_LoadDataAPI } from '../../../services/apiServices';
import styles from '../../NhanVien/styles.module.css';

const DEFAULT_PAGE_SIZE = 20;
const QUICK_ROW_KEY = '__quick_insert__';

const FIELD_LABELS = {
  lv001: 'Mã dự án',
  lv002: 'Tên dự án',
  lv003: 'Giai đoạn',
  lv004: 'Mã công việc',
  lv005: 'Người tạo',
  lv006: 'Thời gian tạo',
  lv007: 'Loại công việc',
  lv008: 'Thứ tự',
  lv009: 'Thứ tự',
  lv011: 'Trạng thái',
  lv012: 'Ưu tiên',
  lv013: 'Ngày bắt đầu',
  lv014: 'Người duyệt',
  lv015: 'KPI',
  lv016: 'Giai đoạn',
  lv017: 'Ghi chú',
  lv018: 'Mã dự án',
  lv019: 'Ngày hoàn thành',
  parent_id: 'Mã dự án gốc',
  parent_name: 'Dự án gốc',
  employee_name: 'Người tạo',
};

const MODULES = {
  projects: {
    table: 'da_lh0002',
    title: 'Dự án mẫu',
    routeTitle: 'Quản lý dự án',
    searchPlaceholder: 'Tìm mã, tên dự án, ghi chú...',
    formTitle: 'dự án',
    quickFields: ['lv001', 'lv002', 'parent_id', 'lv003', 'lv004'],
    fields: [
      { name: 'lv001', label: 'Mã dự án' },
      { name: 'lv002', label: 'Tên dự án', required: true },
      { name: 'parent_id', label: 'Dự án gốc', type: 'parentProjectSelect' },
      { name: 'lv003', label: 'Hoạt động', type: 'switch' },
      { name: 'lv004', label: 'Ghi chú', type: 'textarea' },
    ],
  },
  stages: {
    table: 'da_lh0004',
    title: 'Danh mục giai đoạn',
    routeTitle: 'Quản lý dự án',
    searchPlaceholder: 'Tìm mã hoặc tên giai đoạn...',
    formTitle: 'giai đoạn',
    quickFields: ['lv001', 'lv002', 'lv003', 'lv004'],
    fields: [
      { name: 'lv001', label: 'Mã giai đoạn', required: true },
      { name: 'lv002', label: 'Giai đoạn', required: true },
      { name: 'lv003', label: 'Hoạt động', type: 'switch' },
      { name: 'lv004', label: 'Thứ tự giai đoạn', type: 'number' },
    ],
  },
  tasks: {
    table: 'da_lh0003',
    title: 'Công việc của giai đoạn',
    searchPlaceholder: 'Tìm giai đoạn, mã hoặc tên công việc...',
    formTitle: 'công việc giai đoạn',
    quickFields: ['lv003', 'lv004', 'lv005', 'lv006', 'lv007', 'lv008', 'lv011', 'lv012', 'lv013', 'lv019'],
    fields: [
      { name: 'lv001', label: 'ID', hiddenOnCreate: true, readonly: true },
      { name: 'lv018', label: 'Mã dự án', readonly: true },
      { name: 'lv003', label: 'Giai đoạn', type: 'stageSelect' },
      { name: 'lv004', label: 'Mã công việc', required: true },
      { name: 'lv005', label: 'Tên công việc', required: true },
      { name: 'lv006', label: 'Mô tả', type: 'textarea', required: true },
      { name: 'lv007', label: 'Loại công việc', type: 'switch' },
      { name: 'lv008', label: 'Thứ tự', type: 'number' },
      { name: 'lv011', label: 'Trạng thái', type: 'switch' },
      { name: 'lv012', label: 'Ưu tiên' },
      { name: 'lv013', label: 'Ngày bắt đầu' },
      { name: 'lv019', label: 'Ngày hoàn thành' },
    ],
  },
  icons: {
    table: 'da_lh0006',
    title: 'Icon dự án',
    searchPlaceholder: 'Tìm tên icon hoặc mã màu...',
    formTitle: 'icon dự án',
    quickFields: ['lv005', 'lv006', 'lv007'],
    fields: [
      { name: 'lv001', label: 'ID', hiddenOnCreate: true, readonly: true },
      { name: 'lv018', label: 'Mã dự án', readonly: true },
      { name: 'lv005', label: 'Tên icon', required: true },
      { name: 'lv006', label: 'Tên icon Font Awesome', required: true },
      { name: 'lv007', label: 'Màu icon' },
    ],
  },
  taskStages: {
    table: 'da_lh0007',
    title: 'Giai đoạn cho công việc',
    searchPlaceholder: 'Tìm phòng ban hoặc giai đoạn...',
    formTitle: 'giai đoạn công việc',
    quickFields: ['lv002', 'lv003', 'lv005', 'lv009'],
    fields: [
      { name: 'lv001', label: 'ID', hiddenOnCreate: true, readonly: true },
      { name: 'lv018', label: 'Mã dự án', readonly: true },
      { name: 'lv004', label: 'Mã công việc', readonly: true },
      { name: 'lv002', label: 'Phòng ban', type: 'departmentSelect', required: true },
      { name: 'lv003', label: 'Giai đoạn', type: 'stageSelect', required: true },
      { name: 'lv005', label: 'Tên giai đoạn công việc' },
      { name: 'lv009', label: 'Thứ tự', type: 'number' },
    ],
  },
};

const normalizeRows = (res) => (Array.isArray(res?.rows) ? res.rows : Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []);
const boolValue = (value) => value === true || value === 1 || value === '1';

function ProjectCrudTable({ moduleKey, parentProject, taskRecord, lookups, onOpenDetail, compact = false }) {
  const config = MODULES[moduleKey];
  const [rows, setRows] = useState([]);
  const [apiColumns, setApiColumns] = useState([]);
  const [permissions, setPermissions] = useState({ add: true, edit: true, delete: true });
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [sortOrder, setSortOrder] = useState(moduleKey === 'projects' ? 'DESC' : 'ASC');
  
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [quickRowData, setQuickRowData] = useState({});
  const [quickSaving, setQuickSaving] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [form] = Form.useForm();

  const fieldMap = useMemo(() => new Map(config.fields.map((field) => [field.name, field])), [config.fields]);

  const parentPayload = useMemo(() => {
    const payload = {};
    if (parentProject?.lv001) payload.projectId = parentProject.lv001;
    if (parentProject?.lv001) payload.lv018 = parentProject.lv001;
    if (taskRecord?.lv004) payload.taskId = taskRecord.lv004;
    if (taskRecord?.lv004) payload.lv004 = taskRecord.lv004;
    return payload;
  }, [parentProject, taskRecord]);

  const buildDefaults = useCallback(() => {
    const defaults = {};
    if (parentProject?.lv001) defaults.lv018 = parentProject.lv001;
    if (taskRecord?.lv004) defaults.lv004 = taskRecord.lv004;
    config.fields.forEach((field) => {
      if (field.type === 'switch') defaults[field.name] = false;
    });
    return defaults;
  }, [config.fields, parentProject, taskRecord]);

  const loadData = useCallback(async (page, size) => {
    setLoading(true);
    const curPage = page ?? currentPage;
    const maxRows = size ?? pageSize;
    try {
      const res = await lv_LoadDataAPI(config.table, 'loadDataView', {
        page: curPage,
        pageSize: maxRows,
        keyword,
        sortOrder,
        ...parentPayload,
        prefTable: config.table,
      });
      const list = normalizeRows(res).map((item) => ({ ...item, key: item.lv001 }));
      setRows(list);
      setApiColumns(Array.isArray(res?.columns) ? res.columns : []);
      setPermissions(res?.permissions || { add: true, edit: true, delete: true });
      setSelectedRowKeys([]);
    } catch (error) {
      console.error(error);
      message.error(`Không thể tải dữ liệu ${config.title.toLowerCase()}`);
    } finally {
      setLoading(false);
    }
  }, [config.table, config.title, keyword, parentPayload, sortOrder, currentPage, pageSize]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setQuickRowData(buildDefaults());
  }, [buildDefaults]);

  const normalizePayload = (values) => {
    const payload = { ...values };
    config.fields.forEach((field) => {
      if (field.type === 'switch') payload[field.name] = values[field.name] ? '1' : '0';
      if (field.type === 'departmentSelect') payload[field.name] = Array.isArray(values[field.name]) ? values[field.name].join(',') : values[field.name];
    });
    if (parentProject?.lv001) payload.lv018 = parentProject.lv001;
    if (taskRecord?.lv004) payload.lv004 = taskRecord.lv004;
    return payload;
  };

  const openCreate = () => {
    setEditing(null);
    form.setFieldsValue(buildDefaults());
    setDrawerOpen(true);
  };

  const openEdit = (record) => {
    setEditing(record);
    const values = { ...record };
    config.fields.forEach((field) => {
      if (field.type === 'switch') values[field.name] = boolValue(values[field.name]);
      if (field.type === 'number' && values[field.name] !== undefined && values[field.name] !== '') values[field.name] = Number(values[field.name]);
      if (field.type === 'departmentSelect') values[field.name] = String(values[field.name] || '').split(',').filter(Boolean);
    });
    form.setFieldsValue(values);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditing(null);
    form.resetFields();
  };

  const save = async () => {
    const values = await form.validateFields();
    const payload = normalizePayload(values);
    if (editing?.lv001) payload.lv001 = editing.lv001;

    const res = await lv_LoadDataAPI(config.table, editing ? 'update' : 'insert', payload);
    if (res?.success === false) {
      message.error(res.message || 'Thao tác thất bại');
      return;
    }
    message.success(res?.message || 'Thao tác thành công');
    closeDrawer();
    loadData(currentPage, pageSize);
  };

  const quickInsert = async () => {
    const missingField = (config.quickFields || []).find((name) => fieldMap.get(name)?.required && !quickRowData[name]);
    if (missingField) {
      message.warning(`Vui lòng nhập ${fieldMap.get(missingField)?.label.toLowerCase()}`);
      return;
    }

    const values = {};
    (config.quickFields || []).forEach((name) => {
      values[name] = quickRowData[name];
    });
    const payload = normalizePayload(values);
    setQuickSaving(true);
    try {
      const res = await lv_LoadDataAPI(config.table, 'insert', payload);
      if (res?.success === false) {
        message.error(res.message || 'Thêm nhanh thất bại');
        return;
      }
      message.success(res?.message || 'Thêm nhanh thành công');
      setQuickRowData(buildDefaults());
      loadData(1, pageSize);
    } catch (e) {
      console.error(e);
      message.error('Lỗi khi thêm nhanh');
    } finally {
      setQuickSaving(false);
    }
  };

  const remove = async (record) => {
    const res = await lv_LoadDataAPI(config.table, 'delete', { lv001: record.lv001 });
    if (res?.success === false) {
      message.error(res.message || 'Xóa thất bại');
      return;
    }
    message.success(res?.message || 'Xóa thành công');
    loadData(currentPage, pageSize);
  };

  const handleDelete = async (keys) => {
    const idList = Array.isArray(keys) ? keys : [keys];
    setLoading(true);
    try {
      let successCount = 0;
      for (const key of idList) {
        const res = await lv_LoadDataAPI(config.table, 'delete', { lv001: key });
        if (res?.success !== false) {
          successCount++;
        }
      }
      if (successCount > 0) {
        message.success(`Đã xóa ${successCount} bản ghi thành công`);
      }
      setSelectedRowKeys([]);
      await loadData(currentPage, pageSize);
    } catch (error) {
      console.error('Delete error:', error);
      message.error('Không thể xóa dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const updateBoolean = async (record, field, checked) => {
    const res = await lv_LoadDataAPI(config.table, 'updateInline', { lv001: record.lv001, field, value: checked ? '1' : '0' });
    if (res?.success === false) {
      message.error(res.message || 'Cập nhật thất bại');
      return;
    }
    setRows((prev) => prev.map((row) => (row.lv001 === record.lv001 ? { ...row, [field]: checked ? '1' : '0' } : row)));
  };

  const renderControl = (field, value, onChange, size) => {
    const commonProps = {
      size,
      disabled: field.readonly,
      onKeyDown: (event) => {
        if (size === 'small' && event.key === 'Enter') quickInsert();
      },
    };

    if (field.type === 'number') {
      return <InputNumber {...commonProps} value={value} onChange={onChange} style={{ width: '100%' }} />;
    }

    if (field.type === 'switch') {
      return <Switch size={size} checked={boolValue(value)} disabled={field.readonly} onChange={onChange} />;
    }

    if (field.type === 'textarea') {
      return <Input {...commonProps} value={value} onChange={(event) => onChange(event.target.value)} placeholder={field.label} />;
    }

    if (field.type === 'stageSelect') {
      return (
        <Select
          size={size}
          allowClear
          showSearch
          optionFilterProp="label"
          popupMatchSelectWidth={false}
          dropdownMatchSelectWidth={false}
          value={value}
          onChange={onChange}
          style={{ width: '100%' }}
          options={(lookups.stages || []).map((item) => ({ value: item.lv001, label: `${item.lv001} - ${item.lv002 || item.lv004 || ''}` }))}
        />
      );
    }

    if (field.type === 'departmentSelect') {
      return (
        <Select
          size={size}
          mode="multiple"
          allowClear
          showSearch
          optionFilterProp="label"
          popupMatchSelectWidth={false}
          dropdownMatchSelectWidth={false}
          value={Array.isArray(value) ? value : String(value || '').split(',').filter(Boolean)}
          onChange={onChange}
          style={{ width: '100%' }}
          options={(lookups.departments || []).map((item) => ({ value: item.lv001, label: `${item.lv001} - ${item.lv003 || item.lv002 || ''}` }))}
        />
      );
    }

    if (field.type === 'employeeSelect') {
      return (
        <Select
          size={size}
          allowClear
          showSearch
          optionFilterProp="label"
          popupMatchSelectWidth={false}
          dropdownMatchSelectWidth={false}
          value={value}
          onChange={onChange}
          style={{ width: '100%' }}
          placeholder={field.label}
          options={(lookups.employees || []).map((item) => ({ value: item.lv001, label: `${item.lv001} - ${item.lv002 || ''}` }))}
        />
      );
    }

    if (field.type === 'parentProjectSelect') {
      return (
        <Select
          size={size}
          allowClear
          showSearch
          optionFilterProp="label"
          popupMatchSelectWidth={false}
          dropdownMatchSelectWidth={false}
          value={value}
          onChange={onChange}
          style={{ width: '100%' }}
          placeholder={field.label}
          options={(lookups.projects || []).map((item) => ({ value: item.lv001, label: `${item.lv001} - ${item.lv002 || ''}` }))}
        />
      );
    }

    return <Input {...commonProps} value={value} onChange={(event) => onChange(event.target.value)} placeholder={field.label} />;
  };

  const renderQuickCell = (columnKey) => {
    let targetKey = columnKey;
    if (columnKey === 'parent_name') targetKey = 'parent_id';
    if (columnKey === 'employee_name') targetKey = 'lv005';

    const field = fieldMap.get(targetKey);
    if (!field || !(config.quickFields || []).includes(targetKey)) return null;

    return renderControl(field, quickRowData[targetKey], (value) => {
      setQuickRowData((prev) => ({ ...prev, [targetKey]: value }));
    }, 'small');
  };

  const renderFormField = (field) => {
    if (!editing && field.hiddenOnCreate) return null;
    if (field.name === 'lv018' && !parentProject) return null;
    if (field.name === 'lv004' && moduleKey === 'taskStages') return null;
    const rules = field.required ? [{ required: true, message: `Vui lòng nhập ${field.label.toLowerCase()}` }] : [];
    const disabled = field.readonly || (editing && field.name === 'lv001');

    let input = <Input disabled={disabled} placeholder={field.label} />;
    if (field.type === 'textarea') input = <Input.TextArea rows={4} disabled={disabled} placeholder={field.label} />;
    if (field.type === 'number') input = <InputNumber style={{ width: '100%' }} disabled={disabled} />;
    if (field.type === 'switch') input = <Switch disabled={disabled} />;
    if (field.type === 'stageSelect') {
      input = (
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          popupMatchSelectWidth={false}
          dropdownMatchSelectWidth={false}
          disabled={disabled}
          placeholder={field.label}
          options={(lookups.stages || []).map((item) => ({ value: item.lv001, label: `${item.lv001} - ${item.lv002 || item.lv004 || ''}` }))}
        />
      );
    }
    if (field.type === 'departmentSelect') {
      input = (
        <Select
          mode="multiple"
          allowClear
          showSearch
          optionFilterProp="label"
          popupMatchSelectWidth={false}
          dropdownMatchSelectWidth={false}
          disabled={disabled}
          placeholder={field.label}
          options={(lookups.departments || []).map((item) => ({ value: item.lv001, label: `${item.lv001} - ${item.lv003 || item.lv002 || ''}` }))}
        />
      );
    }
    if (field.type === 'employeeSelect') {
      input = (
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          popupMatchSelectWidth={false}
          dropdownMatchSelectWidth={false}
          disabled={disabled}
          placeholder={field.label}
          options={(lookups.employees || []).map((item) => ({ value: item.lv001, label: `${item.lv001} - ${item.lv002 || ''}` }))}
        />
      );
    }
    if (field.type === 'parentProjectSelect') {
      input = (
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          popupMatchSelectWidth={false}
          dropdownMatchSelectWidth={false}
          disabled={disabled}
          placeholder={field.label}
          options={(lookups.projects || []).map((item) => ({ value: item.lv001, label: `${item.lv001} - ${item.lv002 || ''}` }))}
        />
      );
    }

    return (
      <Col key={field.name} span={field.type === 'textarea' ? 24 : 12}>
        <Form.Item name={field.name} label={field.label} valuePropName={field.type === 'switch' ? 'checked' : 'value'} rules={rules}>
          {input}
        </Form.Item>
      </Col>
    );
  };

  // Define static columns
  const columns = useMemo(() => {
    const sttCol = {
      title: <div style={{ textAlign: 'center' }}>STT</div>,
      key: 'stt',
      width: 68,
      fixed: 'left',
      preserveTitle: true,
      render: (_value, record, index) => record.isQuickRow
        ? <Button
            type="primary"
            size="small"
            shape="circle"
            icon={<Plus size={14} />}
            loading={quickSaving}
            onClick={quickInsert}
            title="Thêm nhanh"
            disabled={!permissions.add}
          />
        : <div style={{ textAlign: 'center' }}>{currentPage === 1 ? index : (currentPage - 1) * pageSize + index}</div>,
    };

    const sourceColumns = apiColumns.length ? apiColumns : config.fields.map((field) => ({ key: field.name, title: field.label }));
    const dataCols = sourceColumns.map((column) => ({
      title: column.title || FIELD_LABELS[column.key] || column.key,
      dataIndex: column.key,
      key: column.key,
      width: column.width || (column.key === 'lv004' || column.key === 'lv006' ? 260 : 160),
      ellipsis: true,
      sorter: (a, b) => {
        const valA = a[column.key];
        const valB = b[column.key];
        if (typeof valA === 'number' && typeof valB === 'number') {
          return valA - valB;
        }
        return String(valA || '').localeCompare(String(valB || ''));
      },
      render: (value, record) => {
        if (record.isQuickRow) return renderQuickCell(column.key);
        if (column.type === 'boolean' || fieldMap.get(column.key)?.type === 'switch') {
          return <Switch size="small" checked={boolValue(value)} disabled={!permissions.edit} onChange={(checked) => updateBoolean(record, column.key, checked)} />;
        }
        if (column.key === 'lv007' && moduleKey === 'icons') return value ? <Tag color={value}>{value}</Tag> : '';
        return value ?? '';
      },
    }));

    return [sttCol, ...dataCols];
  }, [apiColumns, config.fields, moduleKey, currentPage, pageSize, quickSaving, permissions.add, permissions.edit, quickRowData]);

  const cmsTableColumns = useCmsTableColumns({
    tableName: config.table,
    prefTable: config.table,
    columns,
    requiredKeys: [],
    onReload: loadData,
    pageSize,
    currentPage,
    hasQuickRow: permissions.add,
  });

  useEffect(() => {
    if (cmsTableColumns.meta?.maxRows) {
      setPageSize(cmsTableColumns.meta.maxRows);
    }
    if (cmsTableColumns.meta?.curPage) {
      setCurrentPage(cmsTableColumns.meta.curPage);
    }
  }, [cmsTableColumns.meta?.maxRows, cmsTableColumns.meta?.curPage]);

  const dataSource = permissions.add ? [{ isQuickRow: true, lv001: QUICK_ROW_KEY, key: QUICK_ROW_KEY }, ...rows] : rows;
  const selectedRecord = rows.find((item) => item.lv001 === selectedRowKeys[0]);

  // ==================== EXPORT FUNCTIONS ====================
  const getDataForExport = useCallback(async () => {
    try {
      const res = await lv_LoadDataAPI(config.table, 'loadDataView', {
        page: 1,
        pageSize: 9999,
        keyword,
        sortOrder,
        ...parentPayload,
      });
      const list = normalizeRows(res);
      const exportList = list.length > 0 ? list : rows;
      
      return exportList.map((item, index) => {
        const rowData = { STT: index + 1 };
        config.fields.forEach((field) => {
          let val = item[field.name];
          if (field.type === 'switch') {
            val = boolValue(val) ? 'Có' : 'Không';
          }
          rowData[field.label] = val ?? '';
        });
        return rowData;
      });
    } catch (e) {
      return rows.map((item, index) => {
        const rowData = { STT: index + 1 };
        config.fields.forEach((field) => {
          let val = item[field.name];
          if (field.type === 'switch') {
            val = boolValue(val) ? 'Có' : 'Không';
          }
          rowData[field.label] = val ?? '';
        });
        return rowData;
      });
    }
  }, [rows, keyword, sortOrder, parentPayload, config.table, config.fields]);

  const createHTMLTable = useCallback((exportData, title) => {
    if (!exportData || exportData.length === 0) return '';
    const headers = Object.keys(exportData[0]);
    let tableHTML = `
      <h2 style="text-align: center; color: #197dd3; margin-bottom: 20px;">${title}</h2>
      <table border="1" style="border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; font-size: 13px;">
        <thead>
          <tr style="background-color: #197dd3; color: white; font-weight: bold; text-align: center;">
            ${headers.map((h) => `<th style="padding: 10px; border: 1px solid #c1d9f3;">${h}</th>`).join('')}
          </tr>
        </thead>
        <tbody>`;
    exportData.forEach((row, idx) => {
      const bgColor = idx % 2 === 0 ? '#ffffff' : '#f4f8fc';
      tableHTML += `<tr style="background-color: ${bgColor};">`;
      headers.forEach((header) => {
        const align = header === 'STT' ? 'center' : 'left';
        tableHTML += `<td style="padding: 8px 10px; border: 1px solid #ddd; text-align: ${align};">${row[header] ?? ''}</td>`;
      });
      tableHTML += '</tr>';
    });
    tableHTML += '</tbody></table>';
    return tableHTML;
  }, []);

  const exportToExcel = useCallback(async () => {
    const exportData = await getDataForExport();
    if (exportData.length === 0) { message.warning('Không có dữ liệu để xuất!'); return; }
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const keys = Object.keys(exportData[0]);
    worksheet['!cols'] = keys.map((key) => ({
      wch: Math.max(key.length, ...exportData.map((row) => (row[key] ? row[key].toString().length : 0))) + 4,
    }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, config.title.replace(/\s+/g, ''));
    XLSX.writeFile(workbook, `DanhSach_${config.title.replace(/\s+/g, '')}.xlsx`);
    message.success('Đã xuất file Excel thành công!');
  }, [getDataForExport, config.title]);

  const exportToWord = useCallback(async () => {
    const exportData = await getDataForExport();
    if (exportData.length === 0) { message.warning('Không có dữ liệu để xuất!'); return; }
    const tableContent = createHTMLTable(exportData, `DANH SÁCH ${config.title.toUpperCase()}`);
    const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>Danh Sách ${config.title}</title></head>
      <body>${tableContent}</body></html>`;
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    saveAs(blob, `DanhSach_${config.title.replace(/\s+/g, '')}.doc`);
    message.success('Đã xuất file Word thành công!');
  }, [createHTMLTable, getDataForExport, config.title]);

  const exportToWeb = useCallback(async () => {
    const exportData = await getDataForExport();
    if (exportData.length === 0) { message.warning('Không có dữ liệu để xuất!'); return; }
    const tableContent = createHTMLTable(exportData, `DANH SÁCH ${config.title.toUpperCase()}`);
    const html = `<!DOCTYPE html><html><head><meta charset='utf-8'><title>Danh Sách ${config.title}</title>
      <style>body{font-family:Arial,sans-serif;padding:24px;background:#f5f7fa;}table{width:100%;border-collapse:collapse;margin-top:20px;background:#fff;}
      th,td{border:1px solid #c1d9f3;padding:10px;text-align:left;}th{background-color:#197dd3;color:white;}
      tr:nth-child(even){background-color:#f8fafc;}tr:hover{background-color:#e6f7ff;}</style>
      </head><body>${tableContent}</body></html>`;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      message.success('Đã mở báo cáo trên trang web mới!');
    } else {
      message.error('Trình duyệt đã chặn mở cửa sổ mới. Vui lòng cho phép popup!');
    }
  }, [createHTMLTable, getDataForExport, config.title]);

  const exportMenuItems = useMemo(() => [
    { key: 'excel', label: 'Tạo tập tin Excel', icon: <FileExcelOutlined />, onClick: exportToExcel },
    { key: 'word', label: 'Tạo tập tin Word', icon: <FileWordOutlined />, onClick: exportToWord },
    { key: 'html', label: 'Xem dạng Web (Tab mới)', icon: <IeOutlined />, onClick: exportToWeb },
  ], [exportToExcel, exportToWord, exportToWeb]);

  return (
    <div>
      {/* 1. COMPACT TOOLBAR */}
      <div className={styles.compactToolbar}>
        <div className={styles.toolbarTitle}>
          <FileText size={15} />
          <span>{config.title}</span>
        </div>

        <div className={styles.toolbarDivider} />

        <span style={{ fontSize: 12, color: '#197dd3', fontWeight: 600, whiteSpace: 'nowrap', marginRight: 4 }}>
          Thao tác:
        </span>

        <Button
          size="small"
          type="primary"
          icon={<Plus size={13} />}
          disabled={!permissions.add}
          onClick={openCreate}
        >
          Thêm
        </Button>

        <Button
          size="small"
          icon={<Edit size={13} />}
          disabled={selectedRowKeys.length !== 1 || !permissions.edit}
          onClick={() => selectedRecord && openEdit(selectedRecord)}
          type="primary"
        >
          Sửa
        </Button>

        {(moduleKey === 'projects' || moduleKey === 'tasks') && onOpenDetail && (
          <Button
            size="small"
            icon={<Eye size={13} />}
            disabled={selectedRowKeys.length !== 1}
            onClick={() => selectedRecord && onOpenDetail(selectedRecord)}
          >
            Chi tiết
          </Button>
        )}

        <Popconfirm
          title={`Xóa ${config.formTitle}`}
          description={`Xóa ${selectedRowKeys.length} bản ghi đã chọn?`}
          disabled={selectedRowKeys.length === 0 || !permissions.delete}
          onConfirm={() => handleDelete(selectedRowKeys)}
        >
          <Button
            size="small"
            danger
            icon={<Trash2 size={13} />}
            disabled={selectedRowKeys.length === 0 || !permissions.delete}
          >
            Xóa
          </Button>
        </Popconfirm>

        <Tooltip title="Làm mới dữ liệu">
          <Button
            size="small"
            icon={<ReloadOutlined style={{ fontSize: 12 }} />}
            onClick={() => loadData(currentPage, pageSize)}
            loading={loading}
          >
            Làm mới
          </Button>
        </Tooltip>

        <Tooltip title={sortOrder === 'ASC' ? 'Sắp xếp: Mới trước' : 'Sắp xếp: Cũ trước'}>
          <Button
            size="small"
            icon={sortOrder === 'ASC' ? <SortAscendingOutlined style={{ fontSize: 12 }} /> : <SortDescendingOutlined style={{ fontSize: 12 }} />}
            onClick={() => setSortOrder((value) => (value === 'ASC' ? 'DESC' : 'ASC'))}
          />
        </Tooltip>

        <Tooltip title="Xuất dữ liệu">
          <Dropdown menu={{ items: exportMenuItems }} trigger={['click']} placement="bottomRight">
            <Button
              size="small"
              icon={<DownloadOutlined style={{ fontSize: 12 }} />}
            >
              Xuất file
            </Button>
          </Dropdown>
        </Tooltip>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {selectedRowKeys.length > 0 && (
            <span style={{ fontSize: 12, color: '#8c8c8c' }}>
              Đã chọn <b>{selectedRowKeys.length}</b> dòng
            </span>
          )}
          {cmsTableColumns.selector}
        </div>
      </div>

      {/* 2. CARD CHỨA BẢNG DỮ LIỆU VÀ BỘ LỌC */}
      <Card className={styles.mainCard}>
        <div className={styles.filterSection}>
          <Input
            placeholder={config.searchPlaceholder}
            allowClear
            prefix={<Search size={14} />}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value || '')}
            style={{ width: compact ? 220 : 320 }}
          />
        </div>

        <Table
          rowKey={(record) => record.lv001 ?? record.key}
          size="small"
          loading={loading}
          columns={cmsTableColumns.displayColumns}
          dataSource={dataSource}
          scroll={{ x: 'max-content', y: 'calc(100vh - 420px)' }}
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys,
            getCheckboxProps: (record) => ({ disabled: record.isQuickRow }),
          }}
          pagination={{
            ...cmsTableColumns.paginationProps,
            showSizeChanger: true,
            showQuickJumper: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: () => `Tổng số: ${cmsTableColumns.totalRows} bản ghi`,
          }}
          onRow={(record) => ({
            onClick: (event) => {
              if (record.isQuickRow) return;
              const target = event.target;
              if (
                target.closest('.ant-table-selection-column') ||
                target.closest('.ant-checkbox-wrapper') ||
                target.closest('.ant-btn') ||
                target.closest('.ant-switch')
              ) {
                return;
              }
              if ((moduleKey === 'projects' || moduleKey === 'tasks') && onOpenDetail) {
                onOpenDetail(record);
              }
            },
            onDoubleClick: () => {
              if (!record.isQuickRow && permissions.edit) {
                openEdit(record);
              }
            },
            style: {
              cursor: (moduleKey === 'projects' || moduleKey === 'tasks') && !record.isQuickRow ? 'pointer' : 'default',
            },
          })}
        />
      </Card>

      <Drawer
        title={(
          <Space>
            <FileText size={20} color="#197dd3" />
            <span>{editing ? `Cập nhật ${config.formTitle}` : `Thêm mới ${config.formTitle}`}</span>
          </Space>
        )}
        placement="right"
        width={compact ? 760 : 920}
        open={drawerOpen}
        forceRender
        onClose={closeDrawer}
        className={styles.khoDrawer}
        footer={(
          <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={closeDrawer}>Hủy</Button>
            <Button type="primary" onClick={save} loading={loading}>
              {editing ? 'Cập nhật' : 'Thêm mới'}
            </Button>
          </Space>
        )}
      >
        <Form layout="vertical" form={form} preserve={false} className={styles.customForm}>
          <Divider className={styles.dividerSolid} orientation="left">Thông tin chung</Divider>
          <Row gutter={16}>
            {config.fields.map(renderFormField)}
          </Row>
        </Form>
      </Drawer>
    </div>
  );
}

function PageShell({ title, description, children }) {
  return (
    <div className={styles.khoContainer}>
      <Breadcrumb className={styles.pageBreadcrumb}>
        <Breadcrumb.Item>Quản lý dự án</Breadcrumb.Item>
        <Breadcrumb.Item>{title}</Breadcrumb.Item>
      </Breadcrumb>

      <div className={styles.khoHeader} style={{ marginBottom: 16 }}>
        <div className={styles.khoTitle}>
          <FileText size={28} />
          <div>
            <h2 className={styles.khoTitleText}>{title}</h2>
            <span>{description}</span>
          </div>
        </div>
      </div>

      {children}
    </div>
  );
}

function DuAnMau() {
  const [detailProject, setDetailProject] = useState(null);
  const [taskDetail, setTaskDetail] = useState(null);
  const [lookups, setLookups] = useState({ departments: [], stages: [], employees: [], projects: [] });

  useEffect(() => {
    lv_LoadDataAPI('da_lh0002', 'loadLookups').then((res) => {
      if (res?.success !== false) {
        setLookups({
          departments: res?.departments || [],
          stages: res?.stages || [],
          employees: res?.employees || [],
          projects: res?.projects || [],
        });
      }
    });
  }, []);

  return (
    <PageShell title="Dự án mẫu" description="Quản lý danh sách dự án mẫu và các cấu hình chi tiết kế thừa từ hệ thống cũ.">
      <ProjectCrudTable moduleKey="projects" lookups={lookups} onOpenDetail={setDetailProject} />

      <Drawer
        title={(
          <Space>
            <FileText size={20} color="#197dd3" />
            <span>{detailProject ? `Chi tiết dự án ${detailProject.lv001}` : 'Chi tiết dự án'}</span>
          </Space>
        )}
        open={!!detailProject}
        onClose={() => {
          setDetailProject(null);
          setTaskDetail(null);
        }}
        width="86vw"
        destroyOnClose
        className={styles.khoDrawer}
      >
        {detailProject && (
          <Tabs
            items={[
              {
                key: 'tasks',
                label: (
                  <span>
                    <Layers size={16} style={{ marginRight: 8 }} />
                    Công việc giai đoạn
                  </span>
                ),
                children: <ProjectCrudTable moduleKey="tasks" parentProject={detailProject} lookups={lookups} onOpenDetail={setTaskDetail} compact />,
              },
              {
                key: 'icons',
                label: 'Icon dự án',
                children: <ProjectCrudTable moduleKey="icons" parentProject={detailProject} lookups={lookups} compact />,
              },
            ]}
          />
        )}
      </Drawer>

      <Drawer
        title={(
          <Space>
            <Layers size={20} color="#197dd3" />
            <span>{taskDetail ? `Giai đoạn công việc ${taskDetail.lv004}` : 'Giai đoạn công việc'}</span>
          </Space>
        )}
        open={!!taskDetail}
        onClose={() => setTaskDetail(null)}
        width="78vw"
        destroyOnClose
        className={styles.khoDrawer}
      >
        {detailProject && taskDetail && <ProjectCrudTable moduleKey="taskStages" parentProject={detailProject} taskRecord={taskDetail} lookups={lookups} compact />}
      </Drawer>
    </PageShell>
  );
}

function DanhMucGiaiDoan() {
  const [lookups, setLookups] = useState({ departments: [], stages: [] });

  useEffect(() => {
    lv_LoadDataAPI('da_lh0004', 'loadLookups').then((res) => {
      if (res?.success !== false) setLookups({ departments: res?.departments || [], stages: res?.stages || [] });
    });
  }, []);

  return (
    <PageShell title="Danh mục giai đoạn" description="Quản lý mã giai đoạn, trạng thái hoạt động và thứ tự hiển thị.">
      <ProjectCrudTable moduleKey="stages" lookups={lookups} />
    </PageShell>
  );
}

export { DanhMucGiaiDoan, DuAnMau };
export default DuAnMau;
