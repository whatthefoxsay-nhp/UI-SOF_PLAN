import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Button, Drawer, Empty, Popconfirm, Space, Table, Tag, Tooltip, Typography, message, Input,
} from 'antd';
import dayjs from 'dayjs';
import { Edit, Plus, RefreshCw, Trash2, Search, FileText } from 'lucide-react';
import { lv_LoadDataAPI } from '../../../services/apiServices';
import NhapPhieuChiNhanh from '../../KeToanTienMat/PhieuChi/NhapPhieuChiNhanh';
import styles from '../QuanLyKeHoach.module.css';

const { Text } = Typography;
const { Search: SearchInput } = Input;

// ── CONSTANTS ──────────────────────────────────────────────────────────────
const TAB_LABEL  = 'Chi tiền';

// Column definitions (Kế thừa hoàn toàn cấu trúc từ PhieuChi.jsx)
const baseColumns = [
  {
    title: "Chi nhánh",
    dataIndex: "lv115",
    key: "lv115",
    width: 150,
    fixed: "left",
  },
  {
    title: "Mã Phiếu",
    dataIndex: "lv001",
    key: "lv001",
    width: 150,
    fixed: "left",
  },
  { title: "Mã phiếu chi", dataIndex: "lv120", key: "lv120", width: 150 },
  { title: "Loại phiếu", dataIndex: "lv022", key: "lv022", width: 100 },
  { title: "Mã ĐNPC", dataIndex: "lv119", key: "lv119", width: 150 },
  {
    title: "Tên kế hoạch",
    dataIndex: "tenkehoach",
    key: "tenkehoach",
    width: 200,
  },
  { title: "Tên dự án", dataIndex: "tenduan", key: "tenduan", width: 200 },
  { title: "Tên", dataIndex: "lv005", key: "lv005", width: 200 },
  { title: "Địa chỉ", dataIndex: "lv006", key: "lv006", width: 300 },
  { title: "Lý do", dataIndex: "lv007", key: "lv007", width: 250 },
  { title: "Mã nhân viên", dataIndex: "lv008", key: "lv008", width: 120 },
  {
    title: "Ngày đề nghị chi",
    dataIndex: "lv009",
    key: "lv009",
    width: 120,
    render: (v) => (v ? dayjs(v).format("DD/MM/YYYY") : ""),
  },
  { title: "Cho phép khoá", dataIndex: "lv129", key: "lv129", width: 120 },
  {
    title: "Ngày chi",
    dataIndex: "lv014",
    key: "lv014",
    width: 120,
    render: (v) => (v ? dayjs(v).format("DD/MM/YYYY") : ""),
  },
  {
    title: "Ngày hoàn ứng",
    dataIndex: "lv019",
    key: "lv019",
    width: 120,
    render: (v) =>
      v && !v.startsWith("1900-01-01") && !v.startsWith("0000-00-00")
        ? dayjs(v).format("DD/MM/YYYY")
        : " - ",
  },
  { title: "Tài khoản quỹ", dataIndex: "lv010", key: "lv010", width: 120 },
  { title: "Mã tiền tệ", dataIndex: "lv011", key: "lv011", width: 80 },
  {
    title: "Tỷ giá quy đổi",
    dataIndex: "lv012",
    key: "lv012",
    width: 120,
    render: (v) => (v ? Number(v).toLocaleString("vi-VN") : "0"),
  },
  { title: "Mã PMH", dataIndex: "lv013", key: "lv013", width: 150 },
  { title: "NCC/KH", dataIndex: "lv098", key: "lv098", width: 150 },
  { title: "Số hoá đơn", dataIndex: "lv015", key: "lv015", width: 100 },
  {
    title: "Khóa",
    dataIndex: "lv016",
    key: "lv016",
    width: 80,
    render: (v) =>
      v === "1" ? <Tag color="red">Locked</Tag> : <Tag color="green">Open</Tag>,
  },
  { title: "Trạng thái phiếu", dataIndex: "lv027", key: "lv027", width: 120 },
  {
    title: "Tổng tiền",
    dataIndex: "lv069",
    key: "lv069",
    width: 120,
    render: (v) => (v ? Number(v).toLocaleString("vi-VN") : "0"),
  },
  { title: "Số đợt", dataIndex: "lv018", key: "lv018", width: 80 },
  { title: "Nhân viên tạo", dataIndex: "lv096", key: "lv096", width: 150 },
  {
    title: "Ngày tạo",
    dataIndex: "lv097",
    key: "lv097",
    width: 150,
    render: (v) => (v ? dayjs(v).format("DD/MM/YYYY HH:mm") : ""),
  },
  { title: "Nguồn phiếu", dataIndex: "lv003", key: "lv003", width: 120 },
  { title: "Mã tham chiếu", dataIndex: "lv004", key: "lv004", width: 150 },
  { title: "Người nhận", dataIndex: "lv118", key: "lv118", width: 150 },
];

// ── MAIN COMPONENT ──────────────────────────────────────────────────────────
const ChiTienTab = ({ detailData, onRefresh }) => {
    const planId = detailData?.plan?.lv001;

    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);

    // Nạp dữ liệu phiếu chi trực tiếp từ API ac_lv0019 (DataView) và lọc theo planId
    const loadPaymentsData = useCallback(async () => {
        if (!planId) return;
        setLoading(true);
        try {
            const data = await lv_LoadDataAPI('ac_lv0019', 'loadDataView');
            if (data && Array.isArray(data)) {
                // Lọc ở client: Mã tham chiếu (lv004) = planId
                const filtered = data.filter(item => String(item.lv004 || '').trim() === String(planId).trim());
                setRows(filtered.map((r, i) => ({ ...r, key: r.lv001 ?? i })));
            } else {
                setRows([]);
            }
        } catch (error) {
            console.error("Lỗi khi load danh sách phiếu chi:", error);
            message.error("Không thể tải danh sách phiếu chi");
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, [planId]);

    useEffect(() => {
        loadPaymentsData();
    }, [loadPaymentsData]);

    const filteredRows = useMemo(() => {
        const kw = searchText.trim().toLowerCase();
        if (!kw) return rows;
        return rows.filter((r) =>
            baseColumns.some((col) =>
                String(r[col.dataIndex] || '').toLowerCase().includes(kw)
            )
        );
    }, [rows, searchText]);

    const openCreate = () => {
        setEditingRecord(null);
        setDrawerOpen(true);
    };

    // Load đầy đủ thông tin chi tiết của phiếu chi từ API ac_lv0019 trước khi mở form sửa
    const openEdit = async (record) => {
        setLoading(true);
        try {
            let data = await lv_LoadDataAPI('ac_lv0019', 'loadDataView', { lv001: record.lv001 });
            let fullRecord = null;
            if (data && Array.isArray(data)) {
                if (data.length === 1 && data[0].lv001 === record.lv001) {
                    fullRecord = data[0];
                } else {
                    fullRecord = data.find(item => item.lv001 === record.lv001);
                }
            }
            
            if (!fullRecord) {
                const allData = await lv_LoadDataAPI('ac_lv0019', 'loadDataView');
                if (allData && Array.isArray(allData)) {
                    fullRecord = allData.find(item => item.lv001 === record.lv001);
                }
            }

            if (fullRecord) {
                setEditingRecord(fullRecord);
                setDrawerOpen(true);
            } else {
                message.error("Không tìm thấy thông tin chi tiết của phiếu chi");
            }
        } catch (e) {
            console.error("Lỗi khi tải chi tiết phiếu chi:", e);
            message.error("Lỗi tải chi tiết: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (record) => {
        setLoading(true);
        try {
            await lv_LoadDataAPI('ac_lv0019', 'delete', { lv001: record.lv001 });
            message.success("Xóa phiếu chi thành công");
            loadPaymentsData();
            if (onRefresh) onRefresh();
        } catch (error) {
            console.error("Lỗi khi xóa phiếu chi:", error);
            message.error("Không thể xóa phiếu chi");
        } finally {
            setLoading(false);
        }
    };

    // ── COLUMNS ────────────────────────────────────────────────────────────
    const columns = [
        ...baseColumns,
        {
            title: "Thao tác",
            key: "action",
            width: 120,
            fixed: "right",
            render: (_, record) => (
                <Space>
                    <Tooltip title="Sửa">
                        <Button
                            type="text"
                            icon={<Edit size={16} color="#faad14" />}
                            onClick={() => openEdit(record)}
                        />
                    </Tooltip>
                    <Popconfirm title="Xóa phiếu?" onConfirm={() => handleDelete(record)}>
                        <Tooltip title="Xóa">
                            <Button type="text" danger icon={<Trash2 size={16} />} />
                        </Tooltip>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <div className={styles.toolbarRow}>
                <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}>
                    <Space wrap>
                        <Text strong>{TAB_LABEL}</Text>
                        <Text type="secondary">{filteredRows.length} dòng</Text>
                    </Space>
                    <Space wrap>
                        <SearchInput
                            allowClear
                            placeholder="Lọc dữ liệu..."
                            onSearch={setSearchText}
                            style={{ width: 260 }}
                        />
                        <Button icon={<RefreshCw size={16} />} onClick={loadPaymentsData} loading={loading}>Tải lại</Button>
                        {!!planId && <Button type="primary" icon={<Plus size={16} />} onClick={openCreate}>Thêm mới</Button>}
                    </Space>
                </Space>
            </div>
            <Table
                className={styles.mainTable}
                rowKey="lv001"
                columns={columns}
                dataSource={filteredRows}
                loading={loading}
                size="small"
                bordered
                pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `Tổng: ${t} dòng` }}
                scroll={{ x: "max-content" }}
                locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={`Không có dữ liệu ${TAB_LABEL}`} /> }}
                onRow={(record) => ({ onDoubleClick: () => { if (planId) openEdit(record); } })}
            />
            <Drawer
                title={editingRecord ? `Chỉnh sửa phiếu chi` : `Thêm phiếu chi mới`}
                open={drawerOpen}
                width={800}
                onClose={() => setDrawerOpen(false)}
                destroyOnClose
            >
                <NhapPhieuChiNhanh
                    editingRecord={editingRecord}
                    onSuccess={() => {
                        setDrawerOpen(false);
                        loadPaymentsData();
                        if (onRefresh) onRefresh();
                    }}
                    initialData={{
                        lv804: planId, // Tự động điền Mã tham chiếu là mã kế hoạch
                        lv807: detailData?.plan?.lv002 || '', // Tự động điền Lý do chi là tên kế hoạch
                        lv022: detailData?.plan?.lv115 || undefined // Tự động điền chi nhánh của kế hoạch (nếu có)
                    }}
                />
            </Drawer>
        </Space>
    );
};

export default ChiTienTab;
