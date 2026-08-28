import React, { useEffect, useMemo, useState } from 'react';
import { Select } from 'antd';
import { lv_LoadDataAPI } from '../../services/apiServices';

const SelectLoaiSanPham = ({ exclude, mode, value, onChange, ...props }) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isError, setIsError] = useState(false);

    useEffect(() => {
        let mounted = true;
        setLoading(true);
        setIsError(false);

        lv_LoadDataAPI('wb_lv0018', 'loadWebsiteData', { exclude: exclude || '' })
            .then((response) => {
                if (!mounted) return;
                const list = Array.isArray(response) ? response : response?.data || response?.rows || [];
                setData(list.map((item) => ({ ...item, key: item.lv001 })));
            })
            .catch(() => {
                if (mounted) setIsError(true);
            })
            .finally(() => {
                if (mounted) setLoading(false);
            });

        return () => {
            mounted = false;
        };
    }, [exclude]);

    const normalizedValue = useMemo(() => {
        if (mode === 'multiple' && typeof value === 'string') {
            return value.split(',').map((item) => item.trim()).filter(Boolean);
        }
        return value;
    }, [mode, value]);

    const handleChange = (nextValue, option) => {
        if (mode === 'multiple') {
            onChange?.(Array.isArray(nextValue) ? nextValue.join(',') : '', option);
            return;
        }
        onChange?.(nextValue, option);
    };

    return (
        <Select
            {...props}
            mode={mode}
            value={normalizedValue}
            onChange={handleChange}
            loading={loading}
            showSearch
            allowClear
            optionFilterProp="children"
            status={isError ? 'error' : props.status}
            filterOption={(input, option) =>
                (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
            }
        >
            {data.map((item) => (
                <Select.Option key={item.lv001} value={item.lv001} item={item}>
                    {`${item.lv002}`}
                </Select.Option>
            ))}
        </Select>
    );
};

export default SelectLoaiSanPham;
