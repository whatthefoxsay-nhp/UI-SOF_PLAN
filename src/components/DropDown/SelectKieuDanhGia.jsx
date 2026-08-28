import React from 'react';
import { Select } from 'antd';

import { useMasterData } from '../../hooks/useApiQueries';

const SelectKieuDanhGia = (props) => {
    // Fetch data from backend ki_lv0001
    const { data: options, isLoading, isError } = useMasterData('ki_lv0001_select', 'KieuDanhGia');

    return (
        <Select
            placeholder="Chọn kiểu đánh giá"
            allowClear
            showSearch
            loading={isLoading}
            status={isError ? 'error' : ''}
            filterOption={(input, option) =>
                (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
            }
            {...props}
        >
            {options?.map(opt => (
                <Select.Option key={opt.lv001} value={opt.lv001}>
                    {opt.lv002}
                </Select.Option>
            ))}
        </Select>
    );
};

export default SelectKieuDanhGia;
