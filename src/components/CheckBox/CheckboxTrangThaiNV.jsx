import { Checkbox, Col, Row } from 'antd';
import { useCallback, useEffect, useState } from 'react';

// Danh sách trạng thái nhân viên
const TRANG_THAI_NV_OPTIONS = [
    { lv001: '0', lv002: 'Nhân viên chính thức', color: '#52c41a' },
    { lv001: '1', lv002: 'Nhân viên thử việc', color: '#1890ff' },
    { lv001: '2', lv002: 'Nhân viên nghỉ việc', color: '#ff4d4f' },
    { lv001: '3', lv002: 'Công nhân nghỉ việc', color: '#ff4d4f' },
    { lv001: '4', lv002: 'Thử việc chưa tính lương', color: '#faad14' },
    { lv001: '5', lv002: 'Công nhân', color: '#13c2c2' },
    { lv001: '6', lv002: 'Nghỉ không lương', color: '#722ed1' },
    { lv001: '7', lv002: 'Nhân viên thực tập', color: '#eb2f96' },
    { lv001: '8', lv002: 'Thai sản', color: '#fa8c16' },
];

const EMPTY_ARRAY = [];

/**
 * Checkbox component for multi-select employee statuses with modern styling
 */
const CheckboxTrangThaiNV = ({ value = EMPTY_ARRAY, onChange }) => {
    const [selectedStatuses, setSelectedStatuses] = useState(value);

    useEffect(() => {
        setSelectedStatuses(value);
    }, [value]);

    const handleChange = useCallback(
        (checkedValues) => {
            setSelectedStatuses(checkedValues);
            onChange?.(checkedValues);
        },
        [onChange]
    );

    return (
        <Checkbox.Group value={selectedStatuses} onChange={handleChange} style={{ width: '100%' }}>
            <Row>
                {TRANG_THAI_NV_OPTIONS.map((item) => (
                    <Col span={24} key={item.lv001}>
                        <Checkbox value={item.lv001} style={{ padding: '4px 0' }}>
                            <span
                                style={{
                                    display: 'inline-block',
                                    width: 8,
                                    height: 8,
                                    borderRadius: '50%',
                                    backgroundColor: item.color,
                                    marginRight: 6,
                                }}
                            />
                            {item.lv002}
                        </Checkbox>
                    </Col>
                ))}
            </Row>
        </Checkbox.Group>
    );
};

export default CheckboxTrangThaiNV;
