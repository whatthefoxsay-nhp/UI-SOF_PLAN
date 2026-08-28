import React from 'react';
import { Select } from 'antd';
import { useMasterData } from '../../hooks/useApiQueries';

const SelectCongTy = (props) => {
    const { data, isLoading, isError } = useMasterData('hr_lv0001', 'CongTy');

    return (
        <Select
            {...props}
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

export default SelectCongTy;
