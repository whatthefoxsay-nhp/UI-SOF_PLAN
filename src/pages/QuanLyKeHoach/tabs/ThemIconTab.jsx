import React from 'react';
import { Card, Empty, Space, Typography } from 'antd';

const { Text } = Typography;

// Thêm icon — placeholder, tính năng sắp phát triển
// Legacy: soft/da_lh0006/da_lh0006.php (level3lst=23)
const TAB_LABEL = 'Thêm icon';
const TAB_MODULE = 'da_lh0006/da_lh0006.php';

const ThemIconTab = () => (
    <Card size="small">
        <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={(
                <Space direction="vertical" size={4}>
                    <Text>{TAB_LABEL}</Text>
                    <Text type="secondary">{TAB_MODULE}</Text>
                    <Text type="secondary">Tính năng sắp phát triển</Text>
                </Space>
            )}
        />
    </Card>
);

export default ThemIconTab;
