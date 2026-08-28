import React from 'react';
import { Select } from 'antd';
import { useMasterData } from '../../hooks/useApiQueries';

const SelectTieuChiKPI = ({ excludeCode, ...props }) => {
    // Use useMasterData to fetch ki_lv0002 using the specialized 'select' endpoint
    // 'ki_lv0002_select' is the table/case in index.php
    const { data, isLoading, isError } = useMasterData('ki_lv0002_select', 'TieuChiKPI');

    // Filter out the excluded code (e.g., the item being edited)
    const filteredData = React.useMemo(() => {
        if (!data) return [];
        if (!excludeCode) return data;
        return data.filter(item => item.lv001 !== excludeCode);
    }, [data, excludeCode]);

    return (
        <Select
            placeholder="Chọn tiêu chí cha"
            allowClear
            showSearch
            loading={isLoading}
            status={isError ? 'error' : ''}
            filterOption={(input, option) =>
                (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
            }
            {...props}
        >
            {filteredData.map((item) => (
                <Select.Option key={item.lv001} value={item.lv001}>
                    {`${item.lv002} (${item.lv001})`}
                </Select.Option>
            ))}
        </Select>
    );
};

export default SelectTieuChiKPI;
