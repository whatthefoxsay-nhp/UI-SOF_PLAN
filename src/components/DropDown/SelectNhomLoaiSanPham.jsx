import React, { useEffect, useState } from 'react';
import { Select } from 'antd';
import { lv_LoadDataAPI } from '../../services/apiServices';

const SelectNhomLoaiSanPham = (props) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isError, setIsError] = useState(false);

    useEffect(() => {
        let mounted = true;
        setLoading(true);
        setIsError(false);

        lv_LoadDataAPI('wb_lv0005', 'loadSelectNhomLoaiSanPham')
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
    }, []);

    return (
        <Select
            {...props}
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
                    {`${item.lv002} (${item.lv001})`}
                </Select.Option>
            ))}
        </Select>
    );
};

export default SelectNhomLoaiSanPham;
