import { Checkbox, Col, Row, Spin } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { useMasterData } from '../../hooks/useApiQueries';

// Danh sách mẫu báo cáo với icon/color
const MAU_BAO_CAO_OPTIONS = [
    { lv001: '0', lv002: 'Công' },
    { lv001: '1', lv002: 'Thai trên 7 tháng' },
    { lv001: '2', lv002: 'Con dưới 12 tháng' },
    { lv001: '3', lv002: 'Nghỉ thai sản' },
    { lv001: '4', lv002: 'Tăng ca sau giờ làm' },
    { lv001: '5', lv002: 'Tăng ca trưa' },
    { lv001: '6', lv002: 'Tăng ca CN' },
    { lv001: '7', lv002: 'Tăng ca từ ngày - ngày' },
    { lv001: '8', lv002: 'Tăng ca trước giờ' },
    { lv001: '9', lv002: 'Tăng ca ngày lễ' },
    { lv001: '13', lv002: 'Đi trễ về sớm' },
];

const EMPTY_ARRAY = [];

/**
 * Checkbox component for multi-select report templates with icons
 */
const CheckboxMauBaoCao = ({ value = EMPTY_ARRAY, onChange }) => {
    const { data, isLoading } = useMasterData('jo_lv0100_select', 'HinhThucDonXinPhep');
    const [selectedTemplates, setSelectedTemplates] = useState(value);

    useEffect(() => {
        setSelectedTemplates(value);
    }, [value]);

    const handleChange = useCallback(
        (checkedValues) => {
            setSelectedTemplates(checkedValues);
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

    const options = data?.length ? data : MAU_BAO_CAO_OPTIONS;

    return (
        <Checkbox.Group value={selectedTemplates} onChange={handleChange} style={{ width: '100%' }}>
            <Row>
                {options.map((item) => (
                    <Col span={24} key={item.lv001}>
                        <Checkbox value={item.lv001} style={{ padding: '4px 0' }}>
                            {item.lv002}
                        </Checkbox>
                    </Col>
                ))}
            </Row>
        </Checkbox.Group>
    );
};

export default CheckboxMauBaoCao;
