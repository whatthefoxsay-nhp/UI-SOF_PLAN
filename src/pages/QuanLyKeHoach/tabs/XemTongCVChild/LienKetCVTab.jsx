import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Descriptions, Space, Table, Tag, Typography } from 'antd';
import { RefreshCw } from 'lucide-react';
import styles from '../../QuanLyKeHoach.module.css';
import { loadChildData, rowKey } from './childApi';

const { Text } = Typography;

const LienKetCVTab = ({ task, planId, stageId }) => {
    const [rows, setRows] = useState([]);
    const [linkInfo, setLinkInfo] = useState(null);
    const [loading, setLoading] = useState(false);
    const loadData = useCallback(async () => {
        if (!task?.lv001) return;
        setLoading(true);
        try { const data = await loadChildData('xem_tong_cv_lien_ket', { workId: task.lv001, planId, stageId }); setRows(data.rows); setLinkInfo(data.raw); }
        finally { setLoading(false); }
    }, [task?.lv001, planId, stageId]);
    useEffect(() => { loadData(); }, [loadData]);
    const columns = [
        { title: 'Mã phiếu', dataIndex: 'lv001', width: 140, render: (value) => <Text strong>{value}</Text> },
        { title: 'Số chứng từ', dataIndex: 'lv002', width: 160, render: (value) => value || <Text type="secondary">-</Text> },
        { title: 'Tên dự án', dataIndex: 'lv115', render: (value) => value || <Text type="secondary">-</Text> },
        { title: 'Ngày', dataIndex: 'lv005', width: 160, render: (value) => value || <Text type="secondary">-</Text> },
        { title: 'Trạng thái', dataIndex: 'lv006', width: 140, render: (value) => value || <Text type="secondary">-</Text> }
    ];
    const isLinked = linkInfo?.linkedType === 'BHPBH' && !!linkInfo?.refId;
    return <Space direction="vertical" size={12} style={{ width: '100%' }}><div className={styles.toolbarRow}><Button icon={<RefreshCw size={16} />} onClick={loadData} loading={loading}>Tải lại</Button><Tag color={isLinked ? 'processing' : 'default'}>{linkInfo?.linkedType || task?.lv003 || 'Chưa xác định'}</Tag></div><Descriptions size="small" bordered column={2}><Descriptions.Item label="Mã công việc">{task?.lv001 || '-'}</Descriptions.Item><Descriptions.Item label="Loại liên kết">{linkInfo?.linkedType || task?.lv003 || '-'}</Descriptions.Item><Descriptions.Item label="Mã tham chiếu">{linkInfo?.refId || task?.lv014 || '-'}</Descriptions.Item><Descriptions.Item label="Tên loại công việc">{linkInfo?.work?.ten_loai_cong_viec || task?.ten_loai_cong_viec || '-'}</Descriptions.Item></Descriptions>{!isLinked && <Alert type="info" showIcon message={linkInfo?.message || 'Chưa liên kết'} />}<div className={styles.mainTable}><Table rowKey={(record) => rowKey(record, 'LK')} columns={columns} dataSource={rows} loading={loading} size="small" bordered pagination={{ pageSize: 8, showSizeChanger: true }} scroll={{ x: 760 }} /></div></Space>;
};

export default LienKetCVTab;
