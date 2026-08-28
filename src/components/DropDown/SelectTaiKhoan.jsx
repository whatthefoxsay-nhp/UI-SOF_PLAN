import React from 'react';
import { Select } from 'antd';
import { useMasterData } from '../../hooks/useApiQueries';

const SelectTaiKhoan = (props) => {
    const { data, isLoading, isError } = useMasterData('ac_lv0002_select_kttm', 'TaiKhoan');

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
            placeholder="Chọn tài khoản..."
        >
            {data?.map((item) => (
                <Select.Option key={item.lv001} value={item.lv001}>
                    {`${item.lv001} - ${item.lv002}`}
                </Select.Option>
            ))}
        </Select>
    );
};

export default SelectTaiKhoan;
