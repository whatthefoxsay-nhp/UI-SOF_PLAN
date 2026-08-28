import React from 'react';
import { Select } from 'antd';
import { useMasterData } from '../../hooks/useApiQueries';

const SelectCongViec = (props) => {
    const { data, isLoading, isError } = useMasterData('cr_lv0005_select_kttm', 'CongViec');
    // console.log(data);

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
                    {`${item.lv001}-${item.lv002}`}
                </Select.Option>
            ))}
        </Select>
    );
};

export default SelectCongViec;
