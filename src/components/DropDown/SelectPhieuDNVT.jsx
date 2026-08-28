import React from 'react';
import { Select, Tooltip } from 'antd';
import { useMasterData } from '../../hooks/useApiQueries';

const SelectPhieuDNVT = (props) => {
    const { data, isLoading, isError } = useMasterData('cr_lv0150', 'PhieuDNVT');

    const selectedItem = data?.find(item => item.lv001 === props.value);
    const tooltipTitle = selectedItem ? `${selectedItem.lv001} - ${selectedItem.lv004}` : '';

    return (
        <Tooltip title={tooltipTitle} placement="topLeft" mouseEnterDelay={0.3}>
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
                    <Select.Option 
                        key={item.lv001} 
                        value={item.lv001}
                        title={`${item.lv001} - ${item.lv004}`}
                    >
                       {`${item.lv001} - ${item.lv004}`}
                    </Select.Option>
                ))}
            </Select>
        </Tooltip>
    );
};

export default SelectPhieuDNVT;
