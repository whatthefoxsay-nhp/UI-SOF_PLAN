import React, { useEffect, useState } from 'react';
import { Select } from 'antd';
import { useMasterData } from '../../hooks/useApiQueries';
import { callApi } from '../../services/apiServices';

const SelectNhanVien = (props) => {
    const { data, isLoading, isError } = useMasterData('hr_lv0020_select_kttm', 'NhanVien');
    const [fallbackData, setFallbackData] = useState([]);
    const [fallbackLoading, setFallbackLoading] = useState(false);

    useEffect(() => {
        if (Array.isArray(data) && data.length > 0) return undefined;

        let cancelled = false;
        setFallbackLoading(true);
        callApi('hr_lv0020', 'loadNhanVien')
            .then((response) => {
                if (cancelled) return;
                const rows = Array.isArray(response)
                    ? response
                    : (Array.isArray(response?.data) ? response.data : response?.rows || []);
                setFallbackData(rows);
            })
            .catch(() => {
                if (!cancelled) setFallbackData([]);
            })
            .finally(() => {
                if (!cancelled) setFallbackLoading(false);
            });

        return () => { cancelled = true; };
    }, [data]);

    const employees = Array.isArray(data) && data.length > 0 ? data : fallbackData;

    return (
        <Select
            popupMatchSelectWidth={false}
            dropdownMatchSelectWidth={false}
            {...props}
            loading={isLoading || fallbackLoading}
            showSearch
            optionFilterProp="children"
            status={isError ? 'error' : ''}
            filterOption={(input, option) =>
                (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
            }
            placeholder="Chọn nhân viên..."
        >
            {employees.map((item) => (
                <Select.Option key={item.lv001} value={item.lv001}>
                    {`${item.lv001} - ${item.lv002}`}
                </Select.Option>
            ))}
        </Select>
    );
};

export default SelectNhanVien;
