import React from 'react';
import { Select } from 'antd';
import { useMasterData } from '../../hooks/useApiQueries';

const SelectPBH = (props) => {
    const { data, isLoading, isError } = useMasterData('sl_lv0013_select_kttm', 'PBH');

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

export default SelectPBH;
