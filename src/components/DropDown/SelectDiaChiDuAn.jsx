import React from 'react';
import { Select } from 'antd';
import { useMasterData } from '../../hooks/useApiQueries';

const SelectDiaChiDuAn = (props) => {
    // Legacy SQL: select lv001, lv002 from cr_lv0007
    const { data, isLoading, isError } = useMasterData('cr_lv0007', 'DiaChiDuAn');

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

export default SelectDiaChiDuAn;
