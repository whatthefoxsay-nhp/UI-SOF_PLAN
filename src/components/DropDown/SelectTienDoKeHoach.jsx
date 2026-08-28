import React from 'react';
import { Select } from 'antd';
import { useMasterData } from '../../hooks/useApiQueries';

const SelectTienDoKeHoach = (props) => {
    const { data, isLoading, isError } = useMasterData('cr_lv0083', 'TienDoKeHoach');
    return (
        <Select {...props} loading={isLoading} showSearch optionFilterProp="children" status={isError ? 'error' : ''}>
            {data?.map((item) => <Select.Option key={item.lv001} value={item.lv001}>{item.lv002}</Select.Option>)}
        </Select>
    );
};

export default SelectTienDoKeHoach;
