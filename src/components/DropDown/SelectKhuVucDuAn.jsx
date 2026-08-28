import React from 'react';
import { Select } from 'antd';
import { useMasterData } from '../../hooks/useApiQueries';

const SelectKhuVucDuAn = (props) => {
    const { data, isLoading, isError } = useMasterData('cr_lv0008', 'KhuVucDuAn');
    return (
        <Select {...props} loading={isLoading} showSearch optionFilterProp="children" status={isError ? 'error' : ''}>
            {data?.map((item) => <Select.Option key={item.lv001} value={item.lv001}>{item.lv002}</Select.Option>)}
        </Select>
    );
};

export default SelectKhuVucDuAn;
