import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Drawer, Table, Tabs, Descriptions, Tag, Typography, Empty, Space, Button, message } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { execCRUD } from '../../../../services/apiServices';
import styles from './QuanLyKeHoach.module.css';

const { Text } = Typography;

const toArray = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.items)) return value.items;
  return [];
};

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const formatMoney = (value) => toNumber(value).toLocaleString('vi-VN', { maximumFractionDigits: 2 });

const formatDate = (value) => {
  if (!value || value === '0000-00-00' || value === '0000-00-00 00:00:00') return '';
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format('DD/MM/YYYY') : String(value);
};

const statusTag = (value) => {
  const status = String(value ?? '0');
  if (status === '1') return <Tag color='success'>Đã duyệt</Tag>;
  if (status === '-1') return <Tag color='error'>Từ chối</Tag>;
  return <Tag color='warning'>Chờ duyệt</Tag>;
};

const detailColumns = [
  { title: 'STT', width: 56, align: 'center', render: (_, __, index) => index + 1 },
  { title: 'Nội dung', dataIndex: 'lv007', key: 'lv007' },
  { title: 'TK No', dataIndex: 'lv005', key: 'lv005', width: 120 },
  { title: 'Ten TK No', dataIndex: 'ten_tk_no', key: 'ten_tk_no', width: 220 },
  { title: 'TK Co', dataIndex: 'lv006', key: 'lv006', width: 120 },
  {
    title: 'Tiền nguyên tệ',
    dataIndex: 'lv003',
    key: 'lv003',
    width: 150,
    align: 'right',
    render: formatMoney,
  },
  {
    title: 'Tiền quy đổi',
    dataIndex: 'lv004',
    key: 'lv004',
    width: 150,
    align: 'right',
    render: formatMoney,
  },
];

const voucherColumns = [
  { title: 'Mã phiếu', dataIndex: 'lv001', key: 'lv001', width: 180 },
  { title: 'Ngày CT', dataIndex: 'lv009', key: 'lv009', width: 120, render: formatDate },
  { title: 'Ngày TT', dataIndex: 'lv014', key: 'lv014', width: 120, render: formatDate },
  { title: 'Tài khoản quỹ', dataIndex: 'lv010', key: 'lv010', width: 130 },
  { title: 'Tổng tiền', dataIndex: 'lv069', key: 'lv069', width: 150, align: 'right', render: formatMoney },
  { title: 'Trạng thái', dataIndex: 'lv016', key: 'lv016', width: 120, render: statusTag },
];

const voucherDetailColumns = [
  { title: 'STT', width: 56, align: 'center', render: (_, __, index) => index + 1 },
  { title: 'Nội dung', dataIndex: 'lv007', key: 'lv007' },
  { title: 'TK No', dataIndex: 'lv005', key: 'lv005', width: 120 },
  { title: 'TK Co', dataIndex: 'lv006', key: 'lv006', width: 120 },
  { title: 'Tiền', dataIndex: 'lv003', key: 'lv003', width: 140, align: 'right', render: formatMoney },
  { title: 'Quy đổi', dataIndex: 'lv004', key: 'lv004', width: 140, align: 'right', render: formatMoney },
];

const DeNghiChiTienDetailDrawer = ({ open, onClose, request }) => {
  const [loading, setLoading] = useState(false);
  const [detailRows, setDetailRows] = useState([]);
  const [paymentVouchers, setPaymentVouchers] = useState([]);
  const [receiptVouchers, setReceiptVouchers] = useState([]);
  const [voucherDetails, setVoucherDetails] = useState({});

  const requestId = request?.lv001;

  const loadData = useCallback(async () => {
    if (!requestId) return;
    setLoading(true);
    try {
      const res = await execCRUD('cr_lv0202', 'loadPaymentRequestChildren', { lv001: requestId });
      if (res?.success) {
        setDetailRows(toArray(res.details));
        setPaymentVouchers(toArray(res.paymentVouchers));
        setReceiptVouchers(toArray(res.receiptVouchers));
      } else {
        const [details, payments, receipts] = await Promise.all([
          execCRUD('cr_lv0203', 'loadId', { lv002: requestId }),
          execCRUD('ac_lv0019', 'loadByPaymentRequest', { lv119: requestId, lv002: 1 }),
          execCRUD('ac_lv0019', 'loadByPaymentRequest', { lv119: requestId, lv002: 0 }),
        ]);
        setDetailRows(toArray(details));
        setPaymentVouchers(toArray(payments));
        setReceiptVouchers(toArray(receipts));
      }
    } catch (error) {
      message.error('Không thể tải chi tiết đề nghị chi tiền.');
      setDetailRows([]);
      setPaymentVouchers([]);
      setReceiptVouchers([]);
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    if (open && requestId) loadData();
  }, [open, requestId, loadData]);

  const loadVoucherDetails = async (voucherId) => {
    if (!voucherId || voucherDetails[voucherId]) return;
    try {
      const rows = await execCRUD('ac_lv0005', 'data', { lv002: voucherId });
      setVoucherDetails((prev) => ({ ...prev, [voucherId]: toArray(rows) }));
    } catch {
      setVoucherDetails((prev) => ({ ...prev, [voucherId]: [] }));
    }
  };

  const totals = useMemo(
    () => detailRows.reduce(
      (sum, row) => ({
        lv003: sum.lv003 + toNumber(row.lv003),
        lv004: sum.lv004 + toNumber(row.lv004),
      }),
      { lv003: 0, lv004: 0 },
    ),
    [detailRows],
  );

  const renderVoucherTable = (rows) => (
    <Table
      size='small'
      rowKey='lv001'
      loading={loading}
      columns={voucherColumns}
      dataSource={rows}
      pagination={{ pageSize: 6 }}
      expandable={{
        onExpand: (expanded, row) => {
          if (expanded) loadVoucherDetails(row.lv001);
        },
        expandedRowRender: (row) => (
          <Table
            size='small'
            rowKey={(item) => item.lv001 || `${row.lv001}-${item.lv005}-${item.lv007}`}
            columns={voucherDetailColumns}
            dataSource={voucherDetails[row.lv001] || []}
            pagination={false}
          />
        ),
      }}
    />
  );

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width='min(1180px, 96vw)'
      title={`Chi tiet de nghi chi tien ${requestId || ''}`}
      extra={
        <Button icon={<ReloadOutlined />} onClick={loadData} loading={loading}>
          Nạp lại
        </Button>
      }
      destroyOnClose
    >
      {request ? (
        <>
          <Descriptions size='small' column={3} bordered style={{ marginBottom: 16 }}>
            <Descriptions.Item label='Mã phiếu'>{request.lv001}</Descriptions.Item>
            <Descriptions.Item label='Ngày đề nghị'>{formatDate(request.lv009)}</Descriptions.Item>
            <Descriptions.Item label='Trạng thái'>{statusTag(request.lv016)}</Descriptions.Item>
            <Descriptions.Item label='Người đề nghị'>{request.ten_nguoi_de_nghi || request.lv005}</Descriptions.Item>
            <Descriptions.Item label='Phòng ban'>{request.lv006}</Descriptions.Item>
            <Descriptions.Item label='Tiền tệ / tỷ giá'>
              {request.lv011 || ''} {request.lv012 ? `/ ${request.lv012}` : ''}
            </Descriptions.Item>
            <Descriptions.Item label='Tài khoản quỹ'>{request.lv010}</Descriptions.Item>
            <Descriptions.Item label='Hình thức TT'>{request.lv095}</Descriptions.Item>
            <Descriptions.Item label='Mã kỳ lương'>{request.lv121}</Descriptions.Item>
            <Descriptions.Item label='Nội dung' span={3}>{request.lv007}</Descriptions.Item>
          </Descriptions>

          <Tabs
            items={[
              {
                key: 'details',
                label: 'Chi tiet chi tien',
                children: (
                  <>
                    <Table
                      size='small'
                      rowKey='lv001'
                      loading={loading}
                      columns={detailColumns}
                      dataSource={detailRows}
                      pagination={{ pageSize: 8 }}
                      scroll={{ x: 1100 }}
                      summary={() => (
                        <Table.Summary>
                          <Table.Summary.Row>
                            <Table.Summary.Cell index={0} colSpan={5}>
                              <Text strong>Tổng cộng</Text>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={5} align='right'>
                              <Text strong>{formatMoney(totals.lv003)}</Text>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={6} align='right'>
                              <Text strong>{formatMoney(totals.lv004)}</Text>
                            </Table.Summary.Cell>
                          </Table.Summary.Row>
                        </Table.Summary>
                      )}
                    />
                  </>
                ),
              },
              { key: 'payments', label: 'Phiếu chi', children: renderVoucherTable(paymentVouchers) },
              { key: 'receipts', label: 'Phiếu thu', children: renderVoucherTable(receiptVouchers) },
              {
                key: 'documents',
                label: 'Tài liệu',
                children: (
                  <Empty description='Chưa cấu hình API tài liệu TƯ/TT, HU, KTQ cho màn hình mới.' />
                ),
              },
            ]}
          />
        </>
      ) : (
        <Space direction='vertical' style={{ width: '100%', alignItems: 'center' }}>
          <Empty description='Chưa chọn phiếu đề nghị chi tiền' />
        </Space>
      )}
    </Drawer>
  );
};

export default DeNghiChiTienDetailDrawer;

