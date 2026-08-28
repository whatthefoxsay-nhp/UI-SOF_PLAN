import {
    Breadcrumb,
    Button,
    Card,
    Checkbox,
    DatePicker,
    Form,
    Input,
    Modal,
    Popconfirm,
    Select,
    Space,
    Table,
    Tabs,
    message,
} from 'antd';
import dayjs from 'dayjs';
import { CheckCircle, Edit, FileText, Plus, RefreshCw, RotateCcw, Search, Send, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { lv_LoadDataAPI } from '../../../../services/apiServices';
import styles from '../../../NhanVien/styles.module.css';

const { Search: SearchInput } = Input;
const vclass = 'cr_lv0085';
const defaultFieldList = 'lv199,lv003,lv049,lv002,lv004,lv005,lv006,lv007,lv013,lv014,lv001,lv010,lv009,lv008,lv027,lv089,lv026,lv016,lv015';
const pageTitle = 'Công việc phải làm';

const dateFields = new Set(['lv005', 'lv010', 'lv012', 'lv024', 'lv094']);
const textAreaFields = new Set(['lv004', 'lv014']);
const selectFields = new Set(['lv002', 'lv003', 'lv006', 'lv007', 'lv008', 'lv013', 'lv015', 'lv027', 'lv049']);

const fieldLabels = {
    lv001: 'Mã',
    lv002: 'Kế hoạch',
    lv003: 'Loại công việc',
    lv004: 'Nội dung',
    lv005: 'Ngày đến hạn',
    lv006: 'Người yêu cầu',
    lv007: 'Người thực hiện',
    lv008: 'Người báo cáo',
    lv009: 'Người tạo',
    lv010: 'Ngày tạo',
    lv011: 'Trạng thái',
    lv012: 'Ngày duyệt',
    lv013: 'Tài khoản',
    lv014: 'Tham chiếu',
    lv015: 'Loại',
    lv016: 'Hoàn tất',
    lv027: 'Duyệt',
    lv049: 'Trạng thái báo cáo',
    lv199: 'Chức năng',
};

const normalizeRows = (rows = []) => rows.map((item) => ({ ...item, key: item.lv001 }));

const toDayjs = (value) => {
    if (!value) return null;
    const parsed = dayjs(value);
    return parsed.isValid() ? parsed : null;
};

const formatDateView = (value) => {
    if (!value) return '';
    const parsed = dayjs(value);
    return parsed.isValid() ? parsed.format('DD/MM/YYYY') : value;
};

const formatDateSubmit = (value) => {
    if (!value) return '';
    return dayjs.isDayjs(value) ? value.format('YYYY-MM-DD HH:mm:ss') : value;
};

const lookupOptions = (lookups, field) => {
    const map = {
        lv002: 'plans',
        lv003: 'jobTypes',
        lv006: 'employees',
        lv007: 'employees',
        lv008: 'employees',
        lv013: 'accounts',
        lv015: 'categories',
        lv027: 'states',
        lv049: 'reportStates',
    };
    return (lookups[map[field]] || []).map((item) => ({
        value: item.lv001,
        label: item.lv009 ? `${item.lv009} (${item.lv001})` : item.lv002,
    }));
};

const CongViecPhaiLam = () => {
    const [activeTab, setActiveTab] = useState('0');
    const [rows, setRows] = useState([]);
    const [searchText, setSearchText] = useState('');
    const [columnsMeta, setColumnsMeta] = useState([]);
    const [tabs, setTabs] = useState([
        { key: '0', label: 'CV duyệt', count: 0 },
        { key: '1', label: 'CV báo cáo', count: 0 },
        { key: 'all', label: 'Tất cả', count: 0 },
    ]);
    const [lookups, setLookups] = useState({});
    const [loading, setLoading] = useState(false);
    const [selectedRowKeys, setSelectedRowKeys] = useState([]);
    const [editingRecord, setEditingRecord] = useState(null);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [form] = Form.useForm();

    const loadLookups = useCallback(async () => {
        const data = await lv_LoadDataAPI(vclass, 'loadLookups');
        setLookups(data || {});
    }, []);

    const loadData = useCallback(async (trangthai = activeTab) => {
        setLoading(true);
        try {
            const legacyTrangThai = trangthai === 'all' ? '' : trangthai;
            const res = await lv_LoadDataAPI(vclass, 'loadCongViecPhaiLam', {
                trangthai: legacyTrangThai,
                fieldList: defaultFieldList,
                maxRows: 100,
            });
            setRows(normalizeRows(res?.data || []));
            setColumnsMeta(res?.columns || []);
            if (Array.isArray(res?.tabs)) setTabs(res.tabs);
        } catch (error) {
            console.error('Error loading công việc phải làm:', error);
            message.error('Không thể tải danh sách công việc.');
        } finally {
            setLoading(false);
        }
    }, [activeTab]);

    useEffect(() => {
        loadLookups();
    }, [loadLookups]);

    useEffect(() => {
        loadData(activeTab);
        setSelectedRowKeys([]);
    }, [activeTab, loadData]);

    const openAddModal = () => {
        setEditingRecord(null);
        form.resetFields();
        form.setFieldsValue({
            lv011: '1',
            lv016: false,
            lv005: dayjs().hour(17).minute(0).second(0),
        });
        setIsModalVisible(true);
    };

    const openEditModal = (record) => {
        const raw = record?._raw || record;
        setEditingRecord(record);
        form.resetFields();
        form.setFieldsValue({
            ...raw,
            lv005: toDayjs(raw.lv005),
            lv012: toDayjs(raw.lv012),
            lv016: Number(raw.lv016) === 1,
        });
        setIsModalVisible(true);
    };

    const submitForm = async (values) => {
        const payload = {
            ...values,
            lv001: editingRecord?._raw?.lv001 || values.lv001,
            lv005: formatDateSubmit(values.lv005),
            lv012: formatDateSubmit(values.lv012),
            lv016: values.lv016 ? '1' : '0',
        };
        try {
            setLoading(true);
            const res = await lv_LoadDataAPI(vclass, editingRecord ? 'suaCongViecPhaiLam' : 'themCongViecPhaiLam', payload);
            if (res?.success === false) {
                message.error(res.message || 'Thao tác không thành công.');
                return;
            }
            message.success(res?.message || (editingRecord ? 'Cập nhật công việc thành công.' : 'Thêm công việc thành công.'));
            setIsModalVisible(false);
            await loadData(activeTab);
        } catch (error) {
            console.error('Error saving công việc:', error);
            message.error('Không thể lưu công việc.');
        } finally {
            setLoading(false);
        }
    };

    const runAction = async (func, ids, successText) => {
        const idList = Array.isArray(ids) ? ids : [ids];
        if (idList.length === 0) return;
        try {
            setLoading(true);
            const res = await lv_LoadDataAPI(vclass, func, { ids: idList });
            if (res?.success === false) {
                message.error(res.message || 'Thao tác không thành công.');
                return;
            }
            message.success(res?.message || successText);
            setSelectedRowKeys([]);
            await loadData(activeTab);
        } catch (error) {
            console.error(`Error running ${func}:`, error);
            message.error('Không thể thực hiện thao tác.');
        } finally {
            setLoading(false);
        }
    };

    const selectedRecord = useMemo(
        () => rows.find((item) => item.key === selectedRowKeys[0]),
        [rows, selectedRowKeys],
    );

    const filteredRows = useMemo(() => {
        const keyword = searchText.trim().toLowerCase();
        if (!keyword) return rows;

        const searchableFields = [
            'lv001',
            'lv002',
            'lv003',
            'lv004',
            'lv006',
            'lv007',
            'lv008',
            'lv009',
            'lv013',
            'lv014',
            'lv015',
            'lv027',
            'lv049',
        ];

        return rows.filter((item) =>
            searchableFields.some((field) => String(item?.[field] ?? '').toLowerCase().includes(keyword)),
        );
    }, [rows, searchText]);

    const renderCell = (value, record, field) => {
        if (field === 'lv199') {
            return (
                <Space size={4}>
                    {record?._canComplete ? (
                        <Button
                            size="small"
                            type="primary"
                            icon={<CheckCircle size={14} />}
                            onClick={() => runAction('hoanThanhCongViec', record.lv001, 'Hoàn thành công việc thành công.')}
                        >
                            Hoàn thành CV
                        </Button>
                    ) : (
                        <Button
                            size="small"
                            icon={<Send size={14} />}
                            onClick={() => runAction('deXuatDuyet', record.lv001, 'Đề xuất duyệt công việc thành công.')}
                        >
                            Đề xuất duyệt
                        </Button>
                    )}
                    <Button
                        size="small"
                        icon={<RotateCcw size={14} />}
                        onClick={() => runAction('traCongViec', record.lv001, 'Trả công việc thành công.')}
                    >
                        Trả lại
                    </Button>
                </Space>
            );
        }
        if (field === 'lv016') return <Checkbox checked={Number(value) === 1} disabled />;
        if (dateFields.has(field)) return formatDateView(value);
        if (typeof value === 'string' && value.includes('<br/>')) {
            return value.split('<br/>').map((line, index) => <div key={`${field}-${index}`}>{line}</div>);
        }
        return value;
    };

    const tableColumns = useMemo(() => {
        const source = columnsMeta.length
            ? columnsMeta
            : defaultFieldList.split(',').map((field) => ({ key: field, dataIndex: field, title: fieldLabels[field] || field }));
        return [
            {
                title: 'STT',
                key: 'stt',
                width: 64,
                align: 'center',
                render: (_, __, index) => index + 1,
                fixed: 'left',
            },
            ...source.map((col) => ({
                title: col.title || fieldLabels[col.dataIndex] || col.dataIndex,
                dataIndex: col.dataIndex,
                key: col.key || col.dataIndex,
                width: col.dataIndex === 'lv199' ? 250 : (textAreaFields.has(col.dataIndex) ? 260 : 150),
                render: (value, record) => renderCell(value, record, col.dataIndex),
            })),
        ];
    }, [columnsMeta]);

    const renderFormControl = (field) => {
        if (field === 'lv016') return <Checkbox>Hoàn tất</Checkbox>;
        if (dateFields.has(field)) return <DatePicker showTime format="DD/MM/YYYY HH:mm:ss" style={{ width: '100%' }} />;
        if (selectFields.has(field)) {
            return (
                <Select
                    showSearch
                    allowClear
                    optionFilterProp="label"
                    options={lookupOptions(lookups, field)}
                    placeholder={`Chọn ${fieldLabels[field] || field}`}
                />
            );
        }
        if (textAreaFields.has(field)) return <Input.TextArea rows={3} />;
        return <Input />;
    };

    const formFields = ['lv002', 'lv003', 'lv004', 'lv005', 'lv006', 'lv007', 'lv008', 'lv013', 'lv014', 'lv015', 'lv016'];

    return (
        <div className={styles.khoContainer}>
            <Breadcrumb className={styles.pageBreadcrumb}>
                <Breadcrumb.Item href="">Quản lý công việc</Breadcrumb.Item>
                <Breadcrumb.Item>{pageTitle}</Breadcrumb.Item>
            </Breadcrumb>

            <div className={styles.khoHeader}>
                <div className={styles.khoTitle}>
                    <FileText size={28} />
                    <h2 className={styles.khoTitleText}>{pageTitle}</h2>
                </div>
                <div className={styles.khoActions}>
                    <SearchInput
                        placeholder="Tìm công việc"
                        className={styles.khoSearch}
                        allowClear
                        prefix={<Search size={18} />}
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value || '')}
                    />
                    <Button icon={<RefreshCw size={16} />} onClick={() => loadData(activeTab)} loading={loading}>
                        Làm mới
                    </Button>
                    <Button type="primary" icon={<Plus size={16} />} onClick={openAddModal}>
                        Thêm mới
                    </Button>
                </div>
            </div>

            <div className={styles.batchActionBar}>
                <span style={{ fontWeight: 600, color: '#197dd3', marginRight: 8 }}>
                    Thao tác hàng loạt:
                </span>
                <Button
                    icon={<Edit size={16} />}
                    disabled={selectedRowKeys.length !== 1}
                    onClick={() => selectedRecord && openEditModal(selectedRecord)}
                    type="primary"
                    ghost
                >
                    Chỉnh sửa
                </Button>
                <Button
                    icon={<CheckCircle size={16} />}
                    disabled={selectedRowKeys.length === 0}
                    onClick={() => runAction('hoanThanhCongViec', selectedRowKeys, 'Hoàn thành công việc thành công.')}
                >
                    Hoàn thành CV
                </Button>
                <Button
                    icon={<Send size={16} />}
                    disabled={selectedRowKeys.length === 0}
                    onClick={() => runAction('deXuatDuyet', selectedRowKeys, 'Đề xuất duyệt công việc thành công.')}
                >
                    Đề xuất duyệt
                </Button>
                <Button
                    icon={<RotateCcw size={16} />}
                    disabled={selectedRowKeys.length === 0}
                    onClick={() => runAction('traCongViec', selectedRowKeys, 'Trả công việc thành công.')}
                >
                    Trả công việc
                </Button>
                <Popconfirm
                    title="Xóa công việc"
                    description={`Xóa ${selectedRowKeys.length} công việc đã chọn?`}
                    disabled={selectedRowKeys.length === 0}
                    onConfirm={() => runAction('xoaCongViecPhaiLam', selectedRowKeys, 'Xóa công việc thành công.')}
                    okText="Xóa"
                    cancelText="Hủy"
                >
                    <Button danger icon={<Trash2 size={16} />} disabled={selectedRowKeys.length === 0}>
                        Xóa
                    </Button>
                </Popconfirm>
                <span style={{ marginLeft: 'auto', color: '#8c8c8c' }}>
                    Đã chọn <b>{selectedRowKeys.length}</b> dòng
                </span>
            </div>

            <Card className={styles.mainCard}>
                <div style={{ padding: '0 16px' }}>
                    <Tabs
                        activeKey={activeTab}
                        onChange={setActiveTab}
                        items={tabs.map((tab) => ({
                            key: tab.key === '' ? 'all' : tab.key,
                            label: `${tab.label}${tab.count > 0 ? ` (${tab.count})` : ''}`,
                        }))}
                    />
                </div>
                <Table
                    rowSelection={{
                        selectedRowKeys,
                        onChange: setSelectedRowKeys,
                    }}
                    columns={tableColumns}
                    dataSource={filteredRows}
                    rowKey="lv001"
                    loading={loading}
                    scroll={{ x: 'max-content' }}
                    rowClassName={(record) => record._className || ''}
                    pagination={{
                        pageSize: 50,
                        showSizeChanger: true,
                        showTotal: (total) => `Tổng số: ${total} bản ghi`,
                    }}
                />
            </Card>

            <Modal
                title={editingRecord ? 'Cập nhật công việc' : 'Thêm công việc'}
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                onOk={() => form.submit()}
                confirmLoading={loading}
                width={900}
                className={styles.khoModal}
                okText="Lưu"
                cancelText="Hủy"
            >
                <Form form={form} layout="vertical" onFinish={submitForm} className={styles.customForm}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
                        {editingRecord && (
                            <Form.Item name="lv001" label={fieldLabels.lv001}>
                                <Input disabled />
                            </Form.Item>
                        )}
                        {formFields.map((field) => (
                            <Form.Item
                                key={field}
                                name={field}
                                label={fieldLabels[field] || field}
                                valuePropName={field === 'lv016' ? 'checked' : 'value'}
                                rules={['lv003', 'lv004', 'lv005', 'lv006', 'lv007'].includes(field) ? [{ required: true, message: 'Bắt buộc nhập' }] : []}
                            >
                                {renderFormControl(field)}
                            </Form.Item>
                        ))}
                    </div>
                </Form>
            </Modal>
        </div>
    );
};

export default CongViecPhaiLam;
