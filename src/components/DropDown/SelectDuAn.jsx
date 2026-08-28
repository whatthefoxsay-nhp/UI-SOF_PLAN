import React from 'react';
import { Select } from 'antd';
import { useMasterData } from '../../hooks/useApiQueries';

const SelectDuAn = (props) => {
    // Legacy SQL: select lv001, lv002 from da_lh0002 where parent_id is null
    const { data, isLoading, isError } = useMasterData('da_lh0002', 'DuAn');

    return (
        <Select
            popupMatchSelectWidth={false}
            dropdownMatchSelectWidth={false}
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
                    {`${item.lv001}-${item.lv002}`}
                </Select.Option>
            ))}
        </Select>
    );
};

export default SelectDuAn;
