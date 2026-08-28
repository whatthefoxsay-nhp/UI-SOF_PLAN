import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert, Button, Card, Descriptions, Empty, Form, Input, InputNumber,
  Modal, Popconfirm, Space, Switch, Table, Tag, Typography, message,
} from "antd";
import { Edit, Lock, Plus, RefreshCw, Trash2, Unlock } from "lucide-react";
import { purchaseOrderChildApi } from "../../../../services/apiServices";

const money = (value) => Number(value || 0).toLocaleString("vi-VN");
const errorText = (result, fallback) => result?.error?.message || result?.message || fallback;

const PaymentScheduleTab = ({ purchaseOrderId }) => {
  const [rows, setRows] = useState([]);
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(false);
  const [includeGroup, setIncludeGroup] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const current = ++requestId.current;
    setLoading(true);
    try {
      const result = await purchaseOrderChildApi("payment", "list", purchaseOrderId, { includeGroup });
      if (current !== requestId.current) return;
      if (result?.success === false) throw new Error(errorText(result, "Không thể tải lần thanh toán"));
      setRows(result?.data || []);
      setPermissions(result?.permissions || {});
    } catch (error) {
      message.error(error.message);
    } finally {
      if (current === requestId.current) setLoading(false);
    }
  }, [includeGroup, purchaseOrderId]);

  useEffect(() => { load(); return () => { requestId.current += 1; }; }, [load]);

  const save = async (values) => {
    const action = editing?.lv001 ? "update" : "create";
    const result = await purchaseOrderChildApi("payment", action, purchaseOrderId, { ...editing, ...values });
    if (result?.success === false) return message.error(errorText(result, "Không thể lưu lần thanh toán"));
    message.success("Đã lưu lần thanh toán");
    setEditing(null);
    form.resetFields();
    load();
  };

  const columns = [
    { title: "Đợt", dataIndex: "lv004", width: 80 },
    { title: "% trước VAT", dataIndex: "lv003", width: 110 },
    { title: "% VAT", dataIndex: "lv011", width: 90 },
    { title: "Tiền trước VAT", dataIndex: "lv012", render: money },
    { title: "Tiền VAT", dataIndex: "lv013", render: money },
    { title: "Thành tiền", dataIndex: "calculated_amount", render: money },
    { title: "Từ ngày", dataIndex: "lv007" },
    { title: "Đến ngày", dataIndex: "lv008" },
    { title: "Số đề nghị", dataIndex: "lv009" },
    { title: "Hoàn thành", dataIndex: "lv010", render: (v) => <Tag color={Number(v) > 0 ? "green" : "default"}>{Number(v) > 0 ? "Có" : "Không"}</Tag> },
    {
      title: "Thao tác", fixed: "right", width: 110,
      render: (_, row) => <Space>
        <Button type="text" icon={<Edit size={15} />} disabled={!permissions.edit} onClick={() => { setEditing(row); form.setFieldsValue(row); }} />
        <Popconfirm title="Xóa lần thanh toán này?" onConfirm={async () => { const r = await purchaseOrderChildApi("payment", "delete", purchaseOrderId, { lv001: row.lv001 }); r?.success === false ? message.error(errorText(r, "Không thể xóa")) : load(); }}>
          <Button type="text" danger icon={<Trash2 size={15} />} disabled={!permissions.delete} />
        </Popconfirm>
      </Space>,
    },
  ];

  return <Card size="small" title="Lần thanh toán" extra={<Space><Typography.Text>Xem cùng nhóm đơn</Typography.Text><Switch checked={includeGroup} onChange={setIncludeGroup} /><Button icon={<RefreshCw size={15} />} onClick={load} /><Button type="primary" icon={<Plus size={15} />} disabled={!permissions.add} onClick={() => { setEditing({}); form.resetFields(); }}>Thêm</Button></Space>}>
    <Table rowKey="lv001" size="small" bordered loading={loading} columns={columns} dataSource={rows} scroll={{ x: 1200 }} pagination={{ pageSize: 10 }} />
    <Modal title={editing?.lv001 ? "Cập nhật lần thanh toán" : "Thêm lần thanh toán"} open={editing !== null} onCancel={() => setEditing(null)} onOk={() => form.submit()} destroyOnClose>
      <Form form={form} layout="vertical" onFinish={save}>
        <Space align="start" wrap>
          <Form.Item name="lv004" label="Đợt thanh toán" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="lv003" label="% trước VAT"><InputNumber min={0} max={100} /></Form.Item>
          <Form.Item name="lv011" label="% VAT"><InputNumber min={0} max={100} /></Form.Item>
          <Form.Item name="lv012" label="Tiền trước VAT cố định"><InputNumber min={0} /></Form.Item>
          <Form.Item name="lv013" label="VAT cố định"><InputNumber min={0} /></Form.Item>
          <Form.Item name="lv007" label="Từ ngày"><Input placeholder="dd/mm/yyyy" /></Form.Item>
          <Form.Item name="lv008" label="Đến ngày"><Input placeholder="dd/mm/yyyy" /></Form.Item>
          <Form.Item name="lv009" label="Số đề nghị thanh toán"><Input /></Form.Item>
          <Form.Item name="lv010" label="Hoàn thành"><InputNumber min={0} max={1} /></Form.Item>
        </Space>
      </Form>
    </Modal>
  </Card>;
};

const PurchaseQaTab = ({ purchaseOrderId }) => {
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [rows, setRows] = useState([]);
  const [permissions, setPermissions] = useState({});
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(false);
  const requestId = useRef(0);

  const loadItems = useCallback(async () => {
    setLoading(true);
    const result = await purchaseOrderChildApi("qa", "items", purchaseOrderId);
    setLoading(false);
    if (result?.success === false) return message.error(errorText(result, "Không thể tải dòng mua hàng"));
    const data = result?.data || [];
    setItems(data);
    setPermissions(result?.permissions || {});
    setSelectedItem((old) => old && data.some((x) => x.lv001 === old) ? old : data[0]?.lv001 || null);
  }, [purchaseOrderId]);

  const loadQa = useCallback(async () => {
    if (!selectedItem) return setRows([]);
    const current = ++requestId.current;
    setLoading(true);
    const result = await purchaseOrderChildApi("qa", "list", purchaseOrderId, { purchaseItemId: selectedItem });
    if (current === requestId.current) {
      setLoading(false);
      if (result?.success === false) return message.error(errorText(result, "Không thể tải QA"));
      setRows(result?.data || []);
      setMeta(result?.meta || {});
    }
  }, [purchaseOrderId, selectedItem]);

  useEffect(() => { loadItems(); }, [loadItems]);
  useEffect(() => { loadQa(); return () => { requestId.current += 1; }; }, [loadQa]);

  const itemColumns = [
    { title: "Mã dòng", dataIndex: "lv001" }, { title: "Sản phẩm", dataIndex: "item_name" },
    { title: "Mã SP", dataIndex: "lv003" }, { title: "Số lượng", dataIndex: "lv004" }, { title: "ĐVT", dataIndex: "lv005" },
  ];
  const qaColumns = useMemo(() => {
    const keys = rows[0] ? Object.keys(rows[0]).filter((k) => /^lv\d+$/.test(k)).slice(0, 18) : ["lv001","lv003","lv004","lv008","lv010","lv011"];
    return keys.map((key) => ({ title: key, dataIndex: key, width: 130, ellipsis: true }));
  }, [rows]);

  const run = async (action, row, extra = {}) => {
    const result = await purchaseOrderChildApi("qa", action, purchaseOrderId, { purchaseItemId: selectedItem, lv001: row.lv001, ...extra });
    if (result?.success === false) {
      message.error(errorText(result, "Thao tác QA thất bại"));
      return;
    }
    message.success("Thao tác QA thành công");
    loadQa();
  };

  return <Space direction="vertical" style={{ width: "100%" }} size={12}>
    {!meta.canViewPrice && <Alert type="info" showIcon message="Các trường giá và chi phí đã được loại khỏi dữ liệu theo quyền lv912." />}
    <Card size="small" title="Dòng sản phẩm của phiếu mua hàng">
      <Table rowKey="lv001" size="small" loading={loading} columns={itemColumns} dataSource={items} pagination={false} rowSelection={{ type: "radio", selectedRowKeys: selectedItem ? [selectedItem] : [], onChange: (keys) => setSelectedItem(keys[0]) }} />
    </Card>
    <Card size="small" title="Kết quả QA / PTH" extra={<Button icon={<RefreshCw size={15} />} onClick={loadQa} />}>
      <Table rowKey="lv001" size="small" bordered loading={loading} columns={[...qaColumns, { title: "Nghiệp vụ", fixed: "right", width: 310, render: (_, row) => <Space wrap><Button size="small" onClick={() => run("generateDescription", row)}>Sinh mô tả</Button><Button size="small" onClick={() => run("recalculatePricingFactor", row, { pricingFactor: 1 })}>Tính hệ số giá</Button><Button size="small" onClick={() => run("syncCatalogueImage", row)}>Đồng bộ ảnh</Button></Space> }]} dataSource={rows} scroll={{ x: 1400 }} />
      {!selectedItem && <Empty description="Chọn một dòng sản phẩm để xem QA" />}
    </Card>
  </Space>;
};

const ReceiptTab = ({ purchaseOrderId, module, title }) => {
  const [rows, setRows] = useState([]);
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await purchaseOrderChildApi(module, "list", purchaseOrderId);
    setLoading(false);
    if (result?.success === false) return message.error(errorText(result, `Không thể tải ${title}`));
    setRows(result?.data || []); setPermissions(result?.permissions || {});
  }, [module, purchaseOrderId, title]);
  useEffect(() => { load(); }, [load]);

  const action = async (name, row = {}) => {
    setLoading(true);
    const result = await purchaseOrderChildApi(module, name, purchaseOrderId, { lv001: row.lv001 });
    setLoading(false);
    if (result?.success === false) {
      const details = result?.error?.details;
      Modal.error({ title: errorText(result, "Thao tác thất bại"), width: 720, content: details ? <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(details, null, 2)}</pre> : null });
      return;
    }
    message.success("Thao tác thành công"); load();
  };

  const columns = [
    { title: "Mã phiếu", dataIndex: "lv001" }, { title: "Kho", dataIndex: "lv002" },
    { title: "Ngày", dataIndex: "lv009" }, { title: "Số dòng", dataIndex: "detail_count" },
    { title: "Trạng thái", dataIndex: "lv007", render: (v) => <Tag color={Number(v) > 0 ? "green" : "orange"}>{Number(v) > 0 ? "Đã khóa" : "Đang mở"}</Tag> },
    { title: "Thao tác", fixed: "right", width: 220, render: (_, row) => <Space><Button size="small" onClick={async () => { const r = await purchaseOrderChildApi(module, "load", purchaseOrderId, { lv001: row.lv001 }); r?.success === false ? message.error(errorText(r, "Không thể tải chi tiết")) : setDetail(r.data); }}>Xem</Button>{Number(row.lv007) > 0 ? <Button size="small" icon={<Unlock size={14} />} disabled={!permissions.unlock} onClick={() => action("unlock", row)}>Mở</Button> : <Button size="small" icon={<Lock size={14} />} disabled={!permissions.lock} onClick={() => action("lock", row)}>Khóa</Button>}<Popconfirm title="Xóa phiếu này?" onConfirm={() => action("delete", row)}><Button size="small" danger icon={<Trash2 size={14} />} disabled={!permissions.delete} /></Popconfirm></Space> },
  ];

  return <Card size="small" title={title} extra={<Space><Button icon={<RefreshCw size={15} />} onClick={load} /><Popconfirm title={`Tạo ${title} từ phiếu mua hàng này?`} onConfirm={() => action("createFromPurchase")}><Button type="primary" icon={<Plus size={15} />} disabled={!permissions.add}>Tạo từ PMH</Button></Popconfirm></Space>}>
    <Table rowKey="lv001" size="small" bordered loading={loading} columns={columns} dataSource={rows} scroll={{ x: 900 }} />
    <Modal title={`Chi tiết ${title}`} width={1100} open={!!detail} footer={null} onCancel={() => setDetail(null)}>
      {detail && <Space direction="vertical" style={{ width: "100%" }}><Descriptions bordered size="small" column={3}>{Object.entries(detail.header || {}).slice(0, 18).map(([key, value]) => <Descriptions.Item key={key} label={key}>{String(value ?? "")}</Descriptions.Item>)}</Descriptions><Table rowKey="lv001" size="small" bordered dataSource={detail.details || []} columns={detail.details?.[0] ? Object.keys(detail.details[0]).slice(0, 14).map((key) => ({ title: key, dataIndex: key, width: 120 })) : []} scroll={{ x: 1200 }} /></Space>}
    </Modal>
  </Card>;
};

export { PaymentScheduleTab, PurchaseQaTab };
export const WarehouseReceiptTab = (props) => <ReceiptTab {...props} module="warehouseReceipt" title="Nhập kho" />;
export const HrWarehouseReceiptTab = (props) => <ReceiptTab {...props} module="hrReceipt" title="NK - HCNS" />;
