import React from 'react';
import { Select } from 'antd';
import { useMasterData } from '../../hooks/useApiQueries';

const SelectLoaiDon = (props) => {
    const { data, isLoading, isError } = useMasterData('tc_lv0002_select', 'LoaiChamCong');

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
                    {`${item.lv002} - ${item.lv003}`}
                </Select.Option>
            ))}
        </Select>
    );
};

export default SelectLoaiDon;
