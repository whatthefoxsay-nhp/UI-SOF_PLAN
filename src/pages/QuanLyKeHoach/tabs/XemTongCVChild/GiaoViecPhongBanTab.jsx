import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Input, Popconfirm, Select, Space, Table, Tooltip, Typography } from 'antd';
import { Check, CheckCircle, Edit, Plus, RefreshCw, Trash2, Undo2, X } from 'lucide-react';
import styles from '../../QuanLyKeHoach.module.css';
import { loadChildData, mutateChildData, rowKey, withQuickRow } from './childApi';

const { Text } = Typography;
const { Option } = Select;
const VTABLE = 'xem_tong_cv_giao_phong_ban';

const GiaoViecPhongBanTab = ({ task, planId, stageId, lookups }) => {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editingId, setEditingId] = useState('');
    const [editRow, setEditRow] = useState({});
    const [quickRow, setQuickRow] = useState({ lv002: [], lv005: '', lv009: '0' });
    const departments = lookups?.departments || [];
    const departmentMap = useMemo(() => { const map = new Map(); departments.forEach((item) => map.set(String(item.value), item.label)); return map; }, [departments]);
    const renderDepartments = useCallback((value) => { const ids = String(value || '').split(',').map((item) => item.trim()).filter(Boolean); if (!ids.length) return <Text type="secondary">-</Text>; return ids.map((id) => departmentMap.get(id) || id).join(', '); }, [departmentMap]);
    const loadData = useCallback(async () => {
        if (!task?.lv001 || !planId || !stageId) return;
        setLoading(true);
        try { const data = await loadChildData(VTABLE, { lv018: planId, lv004: task.lv001, lv003: stageId, workId: task.lv001, planId, stageId }); setRows(data.rows); }
        finally { setLoading(false); }
    }, [task?.lv001, planId, stageId]);
    useEffect(() => { loadData(); }, [loadData]);
    const runAction = async (vfunc, payload) => {
        setLoading(true);
        try { const res = await mutateChildData(VTABLE, vfunc, payload); if (res?.success) { setEditingId(''); await loadData(); } }
        finally { setLoading(false); }
    };
    const normalize = (data) => ({ ...data, lv002: Array.isArray(data.lv002) ? data.lv002 : String(data.lv002 || '').split(',').filter(Boolean), lv003: stageId, lv004: task.lv001, lv018: planId });
    const handleInsert = () => runAction('insert', { lv018: planId, lv004: task.lv001, lv003: stageId, planId, workId: task.lv001, stageId, data: normalize(quickRow) }).then(() => setQuickRow({ lv002: [], lv005: '', lv009: '0' }));
    const startEdit = (record) => { setEditingId(record.lv001); setEditRow({ ...record, lv002: String(record.lv002 || '').split(',').filter(Boolean) }); };
    const saveEdit = () => runAction('update', { lv018: planId, lv004: task.lv001, lv003: stageId, planId, workId: task.lv001, stageId, data: normalize(editRow) });
    const renderDeptSelect = () => {
        const source = editingId ? editRow : quickRow;
        const setter = editingId ? setEditRow : setQuickRow;
        return <Select dropdownMatchSelectWidth={false} mode="multiple" size="small" placeholder="Chọn phòng ban" value={source.lv002 || []} onChange={(value) => setter({ ...source, lv002: value })} style={{ width: '100%' }} showSearch optionFilterProp="children">{departments.map((department) => <Option key={department.value} value={department.value}>{department.label}</Option>)}</Select>;
    };
    const renderInput = (field, placeholder) => {
        const source = editingId ? editRow : quickRow;
        const setter = editingId ? setEditRow : setQuickRow;
        return <Input size="small" placeholder={placeholder} value={source[field]} onChange={(event) => setter({ ...source, [field]: event.target.value })} />;
    };
    const columns = [
        { title: 'STT', width: 70, align: 'center', render: (_, record, index) => record.isQuickRow ? <Tooltip title="Thêm nhanh giao việc"><Button type="primary" size="small" shape="circle" icon={<Plus size={14} />} onClick={handleInsert} disabled={!quickRow.lv002?.length} /></Tooltip> : index },
        { title: 'Mã giao việc', dataIndex: 'lv001', width: 130, render: (value, record) => record.isQuickRow ? <Text type="secondary">Tự động</Text> : <Text strong>{value}</Text> },
        { title: 'Phòng ban', dataIndex: 'lv002', render: (value, record) => record.isQuickRow || editingId === record.lv001 ? renderDeptSelect() : (record.ten_phong_ban_chinh || renderDepartments(value)) },
        { title: 'Giai đoạn', dataIndex: 'lv003', width: 150, render: (value, record) => record.isQuickRow ? <Text type="secondary">{stageId || '-'}</Text> : (value || <Text type="secondary">-</Text>) },
        { title: 'Ghi chú', dataIndex: 'lv005', render: (value, record) => record.isQuickRow ? renderInput('lv005', 'Ghi chú giao việc...') : editingId === record.lv001 ? renderInput('lv005', 'Ghi chú giao việc...') : (value || <Text type="secondary">-</Text>) },
        { title: 'Trạng thái', dataIndex: 'lv006', width: 120, align: 'center', render: (value, record) => record.isQuickRow ? <Text type="secondary">Tự động</Text> : (String(value || '') === '1' ? 'Đã duyệt' : 'Chưa duyệt') },
        { title: 'Thao tác', width: 180, fixed: 'right', align: 'center', render: (_, record) => record.isQuickRow ? null : editingId === record.lv001 ? <Space size={4}><Button size="small" type="primary" icon={<Check size={14} />} onClick={saveEdit} /><Button size="small" icon={<X size={14} />} onClick={() => setEditingId('')} /></Space> : <Space size={4}><Tooltip title="Sửa"><Button size="small" icon={<Edit size={14} />} onClick={() => startEdit(record)} /></Tooltip><Tooltip title="Duyệt"><Button size="small" icon={<CheckCircle size={14} />} onClick={() => runAction('approve', { lv001: record.lv001 })} /></Tooltip><Tooltip title="Hủy duyệt"><Button size="small" icon={<Undo2 size={14} />} onClick={() => runAction('unapprove', { lv001: record.lv001 })} /></Tooltip><Popconfirm title="Xóa giao việc?" onConfirm={() => runAction('delete', { lv001: record.lv001 })}><Button size="small" danger icon={<Trash2 size={14} />} /></Popconfirm></Space> }
    ];
    return <Space direction="vertical" size={12} style={{ width: '100%' }}><div className={styles.toolbarRow}><Button icon={<RefreshCw size={16} />} onClick={loadData} loading={loading}>Tải lại</Button><Text type="secondary">Lọc theo lv018 + lv004 + lv003</Text></div><div className={styles.mainTable}><Table rowKey={(record) => rowKey(record, 'PB')} rowClassName={(record) => record.isQuickRow ? styles.quickRow : ''} columns={columns} dataSource={withQuickRow(rows)} loading={loading} size="small" bordered pagination={{ pageSize: 8, showSizeChanger: true }} scroll={{ x: 1080 }} /></div></Space>;
};
export default GiaoViecPhongBanTab;
