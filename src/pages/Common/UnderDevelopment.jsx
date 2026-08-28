import React from 'react';
import { Result, Button, Typography } from 'antd';
import { ToolOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Text } = Typography;

const UnderDevelopment = () => {
    const navigate = useNavigate();

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 'calc(100vh - 120px)',
            background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e9f2 100%)',
            padding: 24
        }}>
            <Result
                icon={<ToolOutlined style={{ color: '#1890ff', fontSize: 72 }} />}
                title={
                    <span style={{ fontSize: 24, fontWeight: 700, color: '#262626' }}>
                        Chức năng đang phát triển
                    </span>
                }
                subTitle={
                    <Text style={{ fontSize: 15, color: '#8c8c8c' }}>
                        Tính năng này hiện đang được xây dựng và sẽ sớm được cập nhật.
                        <br />Vui lòng quay lại sau hoặc liên hệ quản trị viên để biết thêm chi tiết.
                    </Text>
                }
                extra={
                    <Button
                        type="primary"
                        size="large"
                        onClick={() => navigate(-1)}
                        style={{
                            borderRadius: 8,
                            height: 44,
                            paddingInline: 32,
                            fontWeight: 600,
                            background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
                            border: 'none',
                        }}
                    >
                        Quay lại
                    </Button>
                }
                style={{
                    background: '#fff',
                    borderRadius: 16,
                    padding: '48px 40px',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
                    maxWidth: 560,
                    width: '100%',
                }}
            />
        </div>
    );
};

export default UnderDevelopment;
