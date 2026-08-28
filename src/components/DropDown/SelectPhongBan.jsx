import React from 'react';
import { Select } from 'antd';
import { useMasterData } from '../../hooks/useApiQueries';

const SelectPhongBan = (props) => {
    const { data, isLoading, isError } = useMasterData('hr_lv0002_select', 'PhongBan');

    return (
        <Select
            {...props} // Truyền tất cả props từ cha xuống (value, onChange, placeholder...)
            loading={isLoading} // Tự động hiển thị xoay xoay khi đang tải
            showSearch
            optionFilterProp="children"
            status={isError ? 'error' : ''} // Hiển thị viền đỏ nếu lỗi mạng
            filterOption={(input, option) =>
                (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
            }
            placeholder="Chọn phòng ban..."
        >
            {data?.map((item) => (
                <Select.Option key={item.lv001} value={item.lv001}>
                    {`${item.lv001} - ${item.lv002}`}
                </Select.Option>
            ))}
        </Select>
    );
};

export default SelectPhongBan;