import React, { useCallback, useEffect, useState } from 'react';
import { Button, Checkbox, DatePicker, Input, Popconfirm, Select, Space, Table, Tag, Tooltip, Typography, message } from 'antd';
import { Check, CheckCircle, Edit, Lock, Plus, RefreshCw, Trash2, Undo2, X } from 'lucide-react';
import dayjs from 'dayjs';
import styles from '../../QuanLyKeHoach.module.css';
import { loadChildData, mutateChildData, rowKey, withQuickRow } from './childApi';

const { Text } = Typography;
const VTABLE = 'xem_tong_cv_phan_hoi';
const TIME_OPTIONS = ['00:00:00', '08:00:00', '09:00:00', '10:00:00', '11:00:00', '12:00:00', '13:00:00', '14:00:00', '15:00:00', '16:00:00', '17:00:00', '18:00:00'];

const createQuickRow = () => ({
    lv003: '',
    lv004: '',
    lv005: dayjs(),
    lv005_time: '08:00:00',
    lv006: '',
    lv007: null,
    lv007_time: '00:00:00',
    lv011: '',
    lv012: '',
    lv013: false,
    lv014: '',
    lv016: '18:00:00',
    lv017: '',
});

const cleanText = (value) => String(value ?? '').trim();
const isLocked = (record) => String(record?.lv009 || '0') === '1';
const isCompleted = (record) => String(record?.lv013 || '0') === '1';

const parseDateValue = (value) => {
    if (!value || String(value).startsWith('0000')) return null;
    const parsed = dayjs(value);
    return parsed.isValid() ? parsed : null;
};

const splitDateTime = (value, fallbackDate = null, fallbackTime = '00:00:00') => {
    const text = String(value || '');
    const timeMatch = text.match(/\d{2}:\d{2}:\d{2}/);
    return {
        date: parseDateValue(value) || fallbackDate,
        time: timeMatch ? timeMatch[0] : fallbackTime,
    };
};

const formatDateTime = (value) => {
    const parsed = parseDateValue(value);
    return parsed ? parsed.format('DD/MM/YYYY HH:mm:ss') : null;
};

const formatDateForApi = (dateValue, timeValue = '00:00:00') => {
    const parsed = dayjs(dateValue);
    return `${parsed.isValid() ? parsed.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD')} ${timeValue || '00:00:00'}`;
};

const formatTime = (value) => cleanText(value) || '-';
const lookupText = (...values) => values.find((value) => cleanText(value)) || '';

const PhanHoiCongViecTab = ({ task, planId, stageId }) => {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editingId, setEditingId] = useState('');
    const [editRow, setEditRow] = useState({});
    const [quickRow, setQuickRow] = useState(createQuickRow);
    const [selectedRowId, setSelectedRowId] = useState('');
    const selectedRow = rows.find((row) => String(row.lv001) === String(selectedRowId));
    const selectedLocked = selectedRow ? isLocked(selectedRow) : false;

    const loadData = useCallback(async () => {
        if (!task?.lv001) {
            setRows([]);
            return;
        }
        setLoading(true);
        try {
            const data = await loadChildData(VTABLE, { workId: task.lv001, planId, stageId });
            setRows(data.rows);
        } finally {
            setLoading(false);
        }
    }, [task?.lv001, planId, stageId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const runAction = async (vfunc, payload) => {
        setLoading(true);
        try {
            const res = await mutateChildData(VTABLE, vfunc, payload);
            if (res?.success) {
                setEditingId('');
                if (vfunc === 'delete') setSelectedRowId('');
                await loadData();
            }
            return res;
        } finally {
            setLoading(false);
        }
    };

    const buildPayload = (source) => ({
        lv001: source.lv001,
        lv002: task.lv001,
        lv003: cleanText(source.lv003),
        lv004: cleanText(source.lv004),
        lv005: formatDateForApi(source.lv005, source.lv005_time),
        lv006: cleanText(source.lv006),
        lv007: source.lv007 ? formatDateForApi(source.lv007, source.lv007_time) : '',
        lv011: cleanText(source.lv011),
        lv012: cleanText(source.lv012),
        lv013: source.lv013 ? '1' : '0',
        lv014: cleanText(source.lv014),
        lv016: source.lv016 || '',
        lv017: cleanText(source.lv017),
    });

    const handleInsert = async () => {
        if (!cleanText(quickRow.lv003)) {
            message.warning('Vui lòng nhập thông tin liên hệ / nội dung phản hồi.');
            return;
        }
        const res = await runAction('insert', {
            workId: task.lv001,
            planId,
            stageId,
            data: buildPayload(quickRow),
        });
        if (res?.success) setQuickRow(createQuickRow());
    };

    const startEdit = (record) => {
        if (isLocked(record)) return;
        const thucHien = splitDateTime(record.lv005, dayjs(), '08:00:00');
        const traLoi = splitDateTime(record.lv007, null, '00:00:00');
        setEditingId(record.lv001);
        setEditRow({
            ...record,
            lv005: thucHien.date,
            lv005_time: thucHien.time,
            lv007: traLoi.date,
            lv007_time: traLoi.time,
            lv013: isCompleted(record),
        });
    };

    const saveEdit = () => {
        if (!cleanText(editRow.lv003)) {
            message.warning('Vui lòng nhập thông tin liên hệ / nội dung phản hồi.');
            return;
        }
        runAction('update', {
            workId: task.lv001,
            planId,
            stageId,
            data: buildPayload(editRow),
        });
    };

    const setDraft = (field, value, isQuick = false) => {
        const setter = isQuick ? setQuickRow : setEditRow;
        setter((current) => ({ ...current, [field]: value }));
    };

    const renderInput = (field, placeholder, { textarea = false, isQuick = false } = {}) => {
        const source = isQuick ? quickRow : editRow;
        const props = {
            size: 'small',
            placeholder,
            value: source[field] ?? '',
            onChange: (event) => setDraft(field, event.target.value, isQuick),
        };
        return textarea ? <Input.TextArea {...props} autoSize={{ minRows: 2, maxRows: 5 }} /> : <Input {...props} />;
    };

    const renderDateTimeInput = (dateField, timeField, isQuick = false, allowClear = false) => {
        const source = isQuick ? quickRow : editRow;
        return (
            <Space.Compact size="small">
                <DatePicker
                    size="small"
                    format="DD/MM/YYYY"
                    allowClear={allowClear}
                    value={source[dateField] || null}
                    onChange={(value) => setDraft(dateField, value, isQuick)}
                    style={{ width: 124 }}
                />
                <Select
                    size="small"
                    value={source[timeField] || '00:00:00'}
                    options={TIME_OPTIONS.map((value) => ({ value, label: value.slice(0, 5) }))}
                    onChange={(value) => setDraft(timeField, value, isQuick)}
                    style={{ width: 88 }}
                />
            </Space.Compact>
        );
    };

    const renderTimeSelect = (field, isQuick = false) => {
        const source = isQuick ? quickRow : editRow;
        return (
            <Select
                size="small"
                value={source[field] || ''}
                options={TIME_OPTIONS.map((value) => ({ value, label: value.slice(0, 5) }))}
                onChange={(value) => setDraft(field, value, isQuick)}
                style={{ width: 92 }}
            />
        );
    };

    const renderCheckbox = (field, isQuick = false) => {
        const source = isQuick ? quickRow : editRow;
        return <Checkbox checked={Boolean(source[field])} onChange={(event) => setDraft(field, event.target.checked, isQuick)} />;
    };

    const renderContent = (value) => cleanText(value) ? <span style={{ whiteSpace: 'pre-wrap' }}>{value}</span> : <Text type="secondary">-</Text>;

    const columns = [
        {
            title: 'STT',
            width: 70,
            align: 'center',
            fixed: 'left',
            render: (_, record, index) => record.isQuickRow ? (
                <Tooltip title="Thêm phản hồi tiến độ">
                    <Button
                        type="primary"
                        size="small"
                        shape="circle"
                        icon={<Plus size={14} />}
                        onClick={handleInsert}
                        disabled={!cleanText(quickRow.lv003) || !task?.lv001}
                    />
                </Tooltip>
            ) : index,
        },
        {
            title: 'Mã phản hồi',
            dataIndex: 'lv001',
            width: 120,
            fixed: 'left',
            render: (value, record) => record.isQuickRow ? <Text type="secondary">Tự động</Text> : <Text strong>{value}</Text>,
        },
        {
            title: 'Ngày giờ thực hiện',
            dataIndex: 'lv005',
            width: 220,
            render: (value, record) => {
                if (record.isQuickRow) return renderDateTimeInput('lv005', 'lv005_time', true);
                if (editingId === record.lv001) return renderDateTimeInput('lv005', 'lv005_time');
                return formatDateTime(value) || <Text type="secondary">-</Text>;
            },
        },
        {
            title: 'Đến giờ',
            dataIndex: 'lv016',
            width: 110,
            align: 'center',
            render: (value, record) => {
                if (record.isQuickRow) return renderTimeSelect('lv016', true);
                if (editingId === record.lv001) return renderTimeSelect('lv016');
                return formatTime(value);
            },
        },
        {
            title: 'Công ty',
            dataIndex: 'lv014',
            width: 180,
            render: (value, record) => {
                if (record.isQuickRow) return renderInput('lv014', 'Mã công ty', { isQuick: true });
                if (editingId === record.lv001) return renderInput('lv014', 'Mã công ty');
                return renderContent(lookupText(record.ten_cong_ty, value));
            },
        },
        {
            title: 'Nhóm khách hàng',
            dataIndex: 'lv117',
            width: 155,
            render: (value, record) => record.isQuickRow ? <Text type="secondary">Theo công ty</Text> : renderContent(lookupText(record.ten_nhom_khach_hang, value)),
        },
        {
            title: 'Liên kết',
            dataIndex: 'lv017',
            width: 170,
            render: (value, record) => {
                if (record.isQuickRow) return renderInput('lv017', 'Mã liên kết', { isQuick: true });
                if (editingId === record.lv001) return renderInput('lv017', 'Mã liên kết');
                return renderContent(lookupText(record.ten_lien_ket, value));
            },
        },
        {
            title: 'Thông tin liên hệ',
            dataIndex: 'lv003',
            width: 240,
            render: (value, record) => {
                if (record.isQuickRow) return renderInput('lv003', 'Thông tin liên hệ / phản hồi...', { textarea: true, isQuick: true });
                if (editingId === record.lv001) return renderInput('lv003', 'Thông tin liên hệ / phản hồi...', { textarea: true });
                return renderContent(value);
            },
        },
        {
            title: 'Nội dung công việc',
            dataIndex: 'lv004',
            width: 260,
            render: (value, record) => {
                if (record.isQuickRow) return renderInput('lv004', 'Nội dung công việc...', { textarea: true, isQuick: true });
                if (editingId === record.lv001) return renderInput('lv004', 'Nội dung công việc...', { textarea: true });
                return renderContent(value);
            },
        },
        {
            title: 'Địa chỉ gặp',
            dataIndex: 'lv011',
            width: 190,
            render: (value, record) => {
                if (record.isQuickRow) return renderInput('lv011', 'Địa chỉ gặp', { isQuick: true });
                if (editingId === record.lv001) return renderInput('lv011', 'Địa chỉ gặp');
                return renderContent(value);
            },
        },
        {
            title: 'Kết quả',
            dataIndex: 'lv012',
            width: 250,
            render: (value, record) => {
                if (record.isQuickRow) return renderInput('lv012', 'Kết quả xử lý...', { textarea: true, isQuick: true });
                if (editingId === record.lv001) return renderInput('lv012', 'Kết quả xử lý...', { textarea: true });
                return renderContent(value);
            },
        },
        {
            title: 'Đã hoàn thành',
            dataIndex: 'lv013',
            width: 125,
            align: 'center',
            render: (value, record) => {
                if (record.isQuickRow) return renderCheckbox('lv013', true);
                if (editingId === record.lv001) return renderCheckbox('lv013');
                return isCompleted(record) ? <Tag color="green">Hoàn thành</Tag> : <Tag>Chưa hoàn thành</Tag>;
            },
        },
        {
            title: 'Ngày tạo',
            dataIndex: 'lv015',
            width: 170,
            render: (value, record) => record.isQuickRow ? <Text type="secondary">Tự động</Text> : (formatDateTime(value) || <Text type="secondary">-</Text>),
        },
        {
            title: 'Người phản hồi',
            dataIndex: 'ten_nguoi_phan_hoi',
            width: 165,
            render: (value, record) => record.isQuickRow ? <Text type="secondary">Tự động</Text> : renderContent(lookupText(value, record.lv008)),
        },
        {
            title: 'Phản hồi quản lý',
            dataIndex: 'lv006',
            width: 220,
            render: (value, record) => {
                if (record.isQuickRow) return <Text type="secondary">Quản lý cập nhật</Text>;
                if (editingId === record.lv001) return renderInput('lv006', 'Nội dung quản lý phản hồi...', { textarea: true });
                return renderContent(lookupText(record.ten_nguoi_tra_loi, value));
            },
        },
        {
            title: 'Ngày giờ trả lời',
            dataIndex: 'lv007',
            width: 220,
            render: (value, record) => {
                if (record.isQuickRow) return <Text type="secondary">Khi quản lý trả lời</Text>;
                if (editingId === record.lv001) return renderDateTimeInput('lv007', 'lv007_time', false, true);
                return formatDateTime(value) || <Text type="secondary">-</Text>;
            },
        },
        {
            title: 'Người khóa/mở',
            dataIndex: 'ten_nguoi_khoa',
            width: 155,
            render: (value, record) => record.isQuickRow ? <Text type="secondary">-</Text> : renderContent(lookupText(value, record.lv010)),
        },
        {
            title: 'Trạng thái',
            dataIndex: 'lv009',
            width: 125,
            align: 'center',
            render: (value, record) => {
                if (record.isQuickRow) return <Text type="secondary">Đang mở</Text>;
                return String(value || '0') === '1'
                    ? <Tag color="green" icon={<Lock size={12} />}>Đã khóa</Tag>
                    : <Tag color="blue">Đang mở</Tag>;
            },
        },
    ];

    return (
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <div className={styles.toolbarRow} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <Button icon={<RefreshCw size={16} />} onClick={loadData} loading={loading}>Tải lại</Button>
                <Space size={4}>
                    {editingId ? (
                        <>
                            <Tooltip title="Lưu thay đổi">
                                <Button size="small" type="primary" icon={<Check size={14} />} onClick={saveEdit} />
                            </Tooltip>
                            <Tooltip title="Hủy chỉnh sửa">
                                <Button size="small" icon={<X size={14} />} onClick={() => setEditingId('')} />
                            </Tooltip>
                        </>
                    ) : (
                        <>
                            <Tooltip title="Sửa phản hồi đã chọn">
                                <Button size="small" icon={<Edit size={14} />} onClick={() => selectedRow && startEdit(selectedRow)} disabled={!selectedRow || selectedLocked} />
                            </Tooltip>
                            <Tooltip title="Khóa phản hồi đã chọn">
                                <Button size="small" icon={<CheckCircle size={14} />} onClick={() => selectedRow && runAction('approve', { lv001: selectedRow.lv001 })} disabled={!selectedRow || selectedLocked} />
                            </Tooltip>
                            <Tooltip title="Mở khóa phản hồi đã chọn">
                                <Button size="small" icon={<Undo2 size={14} />} onClick={() => selectedRow && runAction('unapprove', { lv001: selectedRow.lv001 })} disabled={!selectedRow || !selectedLocked} />
                            </Tooltip>
                            <Popconfirm title="Xóa phản hồi đã chọn?" onConfirm={() => selectedRow && runAction('delete', { lv001: selectedRow.lv001 })} disabled={!selectedRow || selectedLocked}>
                                <Button size="small" danger icon={<Trash2 size={14} />} disabled={!selectedRow || selectedLocked} />
                            </Popconfirm>
                        </>
                    )}
                </Space>
                <Text type="secondary">{selectedRow ? ('Đã chọn phản hồi ' + selectedRow.lv001) : 'Chọn một dòng để thao tác'} · Công việc {task?.lv001 || '-'}</Text>
            </div>
            <div className={styles.mainTable}>
                <Table
                    rowKey={(record) => rowKey(record, 'PH')}
                    rowClassName={(record) => record.isQuickRow ? styles.quickRow : (String(record.lv001) === String(selectedRowId) ? 'ant-table-row-selected' : '')}
                    columns={columns}
                    dataSource={task?.lv001 ? withQuickRow(rows) : []}
                    loading={loading}
                    size="small"
                    bordered
                    pagination={{ pageSize: 8, showSizeChanger: true }}
                    scroll={{ x: 2760 }}
                    onRow={(record) => record.isQuickRow ? {} : ({
                        onClick: () => setSelectedRowId(record.lv001),
                        style: { cursor: 'pointer' },
                    })}
                />
            </div>
        </Space>
    );
};

export default PhanHoiCongViecTab;
