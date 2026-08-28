import React from 'react';
import { Select } from 'antd';
import { useMasterData } from '../../hooks/useApiQueries';

const SelectKhachHang = ({ onSelectRecord, ...props }) => {
    const { data, isLoading, isError } = useMasterData('sl_lv0001', 'DataView');

    const handleChange = (value) => {
        if (props.onChange) props.onChange(value);
        if (onSelectRecord && data) {
            const selectedRecord = data.find(item => item.lv001 === value);
            if (selectedRecord) {
                onSelectRecord(selectedRecord);
            }
        }
    };

    return (
        <Select
            {...props}
            onChange={handleChange}
            loading={isLoading}
            showSearch
            optionFilterProp="children"
            status={isError ? 'error' : ''}
            filterOption={(input, option) =>
                (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
            }
        >
            {data?.map((item) => (
                <Select.Option key={item.lv001} value={item.lv001}>
                    {item.lv002}
                </Select.Option>
            ))}
        </Select>
    );
};

export default SelectKhachHang;
