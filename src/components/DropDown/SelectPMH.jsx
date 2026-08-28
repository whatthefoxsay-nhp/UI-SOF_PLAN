import React from 'react';
import { AutoComplete } from 'antd';
import { useMasterData } from '../../hooks/useApiQueries';

const SelectPMH = (props) => {
    const { data, isLoading, isError } = useMasterData('wh_lv0021_select_kttm', 'SelectPMH');

    const options = data?.map((item) => ({
        label: `${item.lv001} - ${item.lv002}`,
        value: item.lv001,
    }));

    return (
        <AutoComplete
            {...props}
            options={options}
            status={isError ? 'error' : ''}
            filterOption={(inputValue, option) =>
                option.label.toLowerCase().includes(inputValue.toLowerCase())
            }
        />
    );
};

export default SelectPMH;
