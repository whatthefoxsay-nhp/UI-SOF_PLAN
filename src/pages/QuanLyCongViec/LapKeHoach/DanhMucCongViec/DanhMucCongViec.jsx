import { Breadcrumb, Button, Card, Checkbox, Form, Input, Modal, Popconfirm, Space, Table, Tag, message } from 'antd';
import { Edit, Lock, Plus, RefreshCw, Search, Trash2, Unlock } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { callApi } from '../../../../services/apiServices';
import styles from './DanhMucCongViec.module.css';

const { Search: SearchInput } = Input;

const isActive = (value) => String(value) === '1';

export default function DanhMucCongViec({ config }) {
  const [form] = Form.useForm();
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ total: 0, curPage: 1, maxRows: 20 });
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [editingRecord, setEditingRecord] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const loadData = useCallback(async (page = meta.curPage, pageSize = meta.maxRows) => {
    setLoading(true);
    try {
      const result = await callApi(config.table, 'listJSON', { curPage: page, maxRows: pageSize, lang: 'VN' });
      if (result?.success === false) throw new Error(result.message);
      setRows((result?.rows || []).map((row) => ({ ...row, key: row.lv001 })));
      setMeta({ total: Number(result?.total || 0), curPage: Number(result?.curPage || page), maxRows: Number(result?.maxRows || pageSize) });
    } catch (error) {
      message.error(error?.message || 'Không thể tải danh mục.');
    } finally {
      setLoading(false);
    }
  }, [config.table, meta.curPage, meta.maxRows]);

  useEffect(() => { loadData(1, meta.maxRows); }, [config.table]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredRows = useMemo(() => {
    const term = searchText.trim().toLocaleLowerCase('vi');
    if (!term) return rows;
    return rows.filter((row) => config.fields.some(({ name }) => String(row[name] ?? '').toLocaleLowerCase('vi').includes(term)));
  }, [config.fields, rows, searchText]);

  const openAdd = () => {
    setEditingRecord(null);
    form.resetFields();
    if (config.fields.some((field) => field.type === 'active')) form.setFieldValue('lv003', true);
    setModalOpen(true);
  };

  const openEdit = (record) => {
    setEditingRecord(record);
    form.setFieldsValue({ ...record, lv003: isActive(record.lv003) });
    setModalOpen(true);
  };

  const save = async (values) => {
    const payload = { ...values };
    if (config.fields.some((field) => field.type === 'active')) payload.lv003 = values.lv003 ? '1' : '0';
    if (editingRecord) payload.lv001 = editingRecord.lv001;
    setLoading(true);
    try {
      const result = await callApi(config.table, editingRecord ? 'update' : 'insert', payload);
      if (result?.success === false) throw new Error(result.message);
      message.success(editingRecord ? 'Đã cập nhật.' : 'Đã thêm mới.');
      setModalOpen(false);
      await loadData(editingRecord ? meta.curPage : 1, meta.maxRows);
    } catch (error) {
      message.error(error?.message || 'Không thể lưu dữ liệu.');
    } finally { setLoading(false); }
  };

  const remove = async (ids) => {
    setLoading(true);
    try {
      for (const lv001 of ids) {
        const result = await callApi(config.table, 'delete', { lv001 });
        if (result?.success === false) throw new Error(result.message);
      }
      message.success('Đã xóa dữ liệu đã chọn.');
      setSelectedRowKeys([]);
      await loadData();
    } catch (error) {
      message.error(error?.message || 'Không thể xóa dữ liệu.');
    } finally { setLoading(false); }
  };

  const changeActive = async (record, checked) => {
    setLoading(true);
    try {
      const payload = { ...record, lv003: checked ? '1' : '0' };
      const result = await callApi(config.table, 'update', payload);
      if (result?.success === false) throw new Error(result.message);
      setRows((current) => current.map((item) => item.lv001 === record.lv001 ? { ...item, lv003: payload.lv003 } : item));
      message.success(checked ? 'Đã mở khóa.' : 'Đã khóa.');
    } catch (error) {
      message.error(error?.message || 'Không thể cập nhật trạng thái.');
    } finally { setLoading(false); }
  };

  const selectedRecord = rows.find((row) => row.lv001 === selectedRowKeys[0]);
  const tableColumns = [
    { title: 'STT', width: 64, align: 'center', render: (_, __, index) => ((meta.curPage - 1) * meta.maxRows) + index + 1 },
    ...config.fields.map((field) => ({
      title: field.label,
      dataIndex: field.name,
      key: field.name,
      width: field.type === 'textarea' ? 280 : 180,
      render: (value, record) => field.type === 'active'
        ? <Checkbox checked={isActive(value)} onChange={(event) => changeActive(record, event.target.checked)} aria-label={`Trạng thái ${record.lv001}`} />
        : (field.name === 'lv003' ? <Tag color={isActive(value) ? 'green' : 'default'}>{isActive(value) ? 'Hoạt động' : 'Không hoạt động'}</Tag> : value),
    })),
    {
      title: 'Thao tác', key: 'actions', fixed: 'right', width: 104,
      render: (_, record) => <Button size="small" icon={<Edit size={14} />} onClick={() => openEdit(record)}>Sửa</Button>,
    },
  ];

  return <div className={styles.container}>
    <Breadcrumb items={[{ title: 'Quản lý công việc' }, { title: 'Lập kế hoạch' }, { title: config.title }]} />
    <div className={styles.header}>
      <div><h2>{config.title}</h2><span>Quản lý danh mục kế thừa từ SOF PLAN</span></div>
      <Space wrap>
        <SearchInput allowClear prefix={<Search size={16} />} placeholder="Tìm theo mã, tên, ghi chú" value={searchText} onChange={(event) => setSearchText(event.target.value)} className={styles.search} />
        <Button icon={<RefreshCw size={16} />} onClick={() => loadData(1, meta.maxRows)}>Làm mới</Button>
        <Button type="primary" icon={<Plus size={16} />} onClick={openAdd}>Thêm mới</Button>
      </Space>
    </div>
    <Card className={styles.card}>
      <div className={styles.toolbar}>
        <Space wrap>
          <Button icon={<Edit size={16} />} disabled={!selectedRecord} onClick={() => openEdit(selectedRecord)}>Sửa</Button>
          {config.fields.some((field) => field.type === 'active') && <Button icon={<Unlock size={16} />} disabled={!selectedRecord || isActive(selectedRecord.lv003)} onClick={() => changeActive(selectedRecord, true)}>Mở khóa</Button>}
          {config.fields.some((field) => field.type === 'active') && <Button icon={<Lock size={16} />} disabled={!selectedRecord || !isActive(selectedRecord.lv003)} onClick={() => changeActive(selectedRecord, false)}>Khóa</Button>}
          <Popconfirm title="Xóa dữ liệu" description={`Xóa ${selectedRowKeys.length} bản ghi đã chọn?`} okText="Xóa" cancelText="Hủy" disabled={!selectedRowKeys.length} onConfirm={() => remove(selectedRowKeys)}>
            <Button danger icon={<Trash2 size={16} />} disabled={!selectedRowKeys.length}>Xóa</Button>
          </Popconfirm>
        </Space>
        <span>Đã chọn: <b>{selectedRowKeys.length}</b></span>
      </div>
      <Table rowKey="lv001" loading={loading} columns={tableColumns} dataSource={filteredRows} scroll={{ x: 'max-content' }} rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }} pagination={{ current: meta.curPage, pageSize: meta.maxRows, total: meta.total, showSizeChanger: true, showTotal: (total) => `Tổng số: ${total} bản ghi`, onChange: loadData }} />
    </Card>
    <Modal open={modalOpen} title={editingRecord ? `Sửa ${config.title}` : `Thêm ${config.title}`} onCancel={() => setModalOpen(false)} onOk={() => form.submit()} confirmLoading={loading} okText="Lưu" cancelText="Hủy" destroyOnClose>
      <Form form={form} layout="vertical" onFinish={save}>
        {config.fields.map((field) => <Form.Item key={field.name} name={field.name} label={field.label} valuePropName={field.type === 'active' ? 'checked' : 'value'} rules={field.required ? [{ required: true, message: `Vui lòng nhập ${field.label.toLocaleLowerCase('vi')}.` }] : []}>
          {field.type === 'active' ? <Checkbox>Hoạt động</Checkbox> : field.type === 'textarea' ? <Input.TextArea rows={3} maxLength={field.maxLength} showCount /> : <Input disabled={Boolean(editingRecord && field.name === 'lv001')} maxLength={field.maxLength} />}
        </Form.Item>)}
      </Form>
    </Modal>
  </div>;
}
