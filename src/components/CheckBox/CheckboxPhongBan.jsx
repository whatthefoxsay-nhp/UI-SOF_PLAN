import { Checkbox, Col, Row, Spin } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { useMasterData } from '../../hooks/useApiQueries';

const EMPTY_ARRAY = [];

/**
 * Checkbox component for multi-select departments
 * Displays hierarchical list of departments with modern styling
 */
const CheckboxPhongBan = ({ value = EMPTY_ARRAY, onChange }) => {
    const { data, isLoading } = useMasterData('hr_lv0002_select', 'PhongBan');
    const [selectedDepts, setSelectedDepts] = useState(value);

    useEffect(() => {
        setSelectedDepts(value);
    }, [value]);

    const handleChange = useCallback(
        (checkedValues) => {
            setSelectedDepts(checkedValues);
            onChange?.(checkedValues);
        },
        [onChange]
    );

    if (isLoading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}>
                <Spin size='small' />
            </div>
        );
    }

    return (
        <Checkbox.Group value={selectedDepts} onChange={handleChange} style={{ width: '100%' }}>
            <Row>
                {data?.map((item) => (
                    <Col span={24} key={item.lv001}>
                        <Checkbox value={item.lv001} style={{ padding: '4px 0' }}>
                            {item.lv002 !== 'MINHPHUONG' && item.lv002 ? (
                                <span style={{ color: 'var(--color-primary, #197dd3)' }}>└─</span>
                            ) : null}{' '}
                            {item.lv003}
                            <span style={{ color: '#999', marginLeft: 4, fontSize: 11 }}>({item.lv001})</span>
                        </Checkbox>
                    </Col>
                ))}
            </Row>
        </Checkbox.Group>
    );
};

export default CheckboxPhongBan;
