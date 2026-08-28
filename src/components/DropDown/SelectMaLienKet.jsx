import React from 'react';
import { AutoComplete } from 'antd';
import { useMasterData } from '../../hooks/useApiQueries';

const SelectMaLienKet = (props) => {
    const { data, isLoading, isError } = useMasterData('ac_lv0004_select_kttm', 'SelectMaLienKet');

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

export default SelectMaLienKet;
