import React from 'react';
import { Select } from 'antd';
import { useMasterData } from '../../hooks/useApiQueries';

const SelectDonVi = (props) => {
    const { data: units, isLoading, isError } = useMasterData('sl_lv0005_select_kttm', 'DonVi');

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
            {units?.map((item) => (
                <Select.Option key={item.lv001} value={item.lv001}>
                    {item.lv002 || item.lv001}
                </Select.Option>
            ))}
        </Select>
    );
};

export default SelectDonVi;
