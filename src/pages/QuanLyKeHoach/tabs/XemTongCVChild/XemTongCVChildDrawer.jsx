import React from 'react';
import { Drawer, Space, Tabs, Typography } from 'antd';
import { FileText } from 'lucide-react';
import styles from '../../QuanLyKeHoach.module.css';
import PhanHoiCongViecTab from './PhanHoiCongViecTab';
import TaiLieuTab from './TaiLieuTab';
import GiaoViecPhongBanTab from './GiaoViecPhongBanTab';
import LienKetCVTab from './LienKetCVTab';

const { Text } = Typography;

const XemTongCVChildDrawer = ({ open, onClose, task, planId, lookups }) => {
    const stageId = task?.lv003 || '';
    const tabItems = [
        { key: 'phan-hoi', label: 'Phản hồi công việc', children: <PhanHoiCongViecTab task={task} planId={planId} stageId={stageId} /> },
        { key: 'tai-lieu', label: 'Tài liệu', children: <TaiLieuTab task={task} planId={planId} stageId={stageId} /> },
        { key: 'giao-phong-ban', label: 'Giao việc phòng ban', children: <GiaoViecPhongBanTab task={task} planId={planId} stageId={stageId} lookups={lookups} /> },
        { key: 'lien-ket', label: 'CV Liên kết', children: <LienKetCVTab task={task} planId={planId} stageId={stageId} /> }
    ];
    return <Drawer title={<Space direction="vertical" size={2}><Space><FileText size={20} color="#197dd3" /><span>Chi tiết công việc</span></Space><Text type="secondary">{task?.lv001 ? task.lv001 + ' - ' + (task.lv004 || '') : 'Chưa chọn công việc'}</Text></Space>} placement="right" width={980} open={open} onClose={onClose} className={styles.khoDrawer} destroyOnClose><Tabs className={styles.customTabs} items={tabItems} destroyInactiveTabPane /></Drawer>;
};

export default XemTongCVChildDrawer;
