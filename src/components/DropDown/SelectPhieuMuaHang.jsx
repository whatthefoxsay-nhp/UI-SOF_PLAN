import React from 'react';
import { Select, Button, Space, Tooltip } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { useMasterData } from '../../hooks/useApiQueries';

const SelectPhieuMuaHang = (props) => {
    const { data, isLoading, isError, refetch, isFetching } = useMasterData('Mb_PhieuMuaHang_select', 'PhieuMuaHang', {
        staleTime: 5000 // Refetch if data is older than 5 seconds when component mounts
    });

    return (
        <Space.Compact style={{ width: '100%' }}>
            <Select
                {...props}
                loading={isLoading || isFetching}
                showSearch
                style={{ flex: 1 }}
                optionFilterProp="children"
                status={isError ? 'error' : ''}
                filterOption={(input, option) =>
                    (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                }
            >
                {data?.map((item) => {
                    const code = item?.maPMH || item?.lv001 || item?.id || '';
                    const supplier = item?.nhaCungCap || item?.lv002 || item?.lv008 || '';
                    const displayText = supplier ? `${code} - ${supplier}` : code;
                    
                    return (
                        <Select.Option key={code} value={code}>
                            {displayText}
                        </Select.Option>
                    );
                })}
            </Select>
            <Tooltip title="Làm mới danh sách">
                <Button 
                    icon={<ReloadOutlined spin={isFetching} />} 
                    onClick={() => refetch()} 
                    loading={isFetching}
                />
            </Tooltip>
        </Space.Compact>
    );
};


export default SelectPhieuMuaHang;

