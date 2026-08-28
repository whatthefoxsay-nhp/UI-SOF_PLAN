import React, { useMemo, useState } from 'react';
import { Popover, Checkbox, Button, Input, InputNumber, Space, Divider, Select } from 'antd';
import { ArrowDown, ArrowUp, Settings, Search } from 'lucide-react';
import styles from './ColumnSelector.module.css';

const getColumnKey = (col) => col.key || col.dataIndex;

export function ColumnSelector({
    allColumns,
    toggleableColumns,
    hiddenKeys,
    showSort = false,
    sortOrder,
    sortFieldOrder = [],
    sortFieldOptions = [],
    columnOrder = [],
    columnOrderValues = {},
    showColumnOrder = false,
    applySettings,
    defaultCount = 7,
    maxRows = 10,
    buttonProps = {},
    popoverProps = {},
}) {
    const [popoverOpen, setPopoverOpen] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [tempHiddenKeys, setTempHiddenKeys] = useState([]);
    const [tempSortOrder, setTempSortOrder] = useState(null);
    const [tempSortFieldOrder, setTempSortFieldOrder] = useState([]);
    const [tempColumnOrder, setTempColumnOrder] = useState([]);
    const [tempColumnOrderValues, setTempColumnOrderValues] = useState({});
    const [tempMaxRows, setTempMaxRows] = useState(maxRows);

    const toggleableKeys = useMemo(() => toggleableColumns.map(getColumnKey).filter(Boolean), [toggleableColumns]);

    const toggleableColumnMap = useMemo(() => new Map(toggleableColumns.map(col => [getColumnKey(col), col])), [toggleableColumns]);

    const normalizeOrder = (sourceOrder = tempColumnOrder) => {
        const nextOrder = [];
        const seen = new Set();
        const addKey = (key) => {
            if (!key || seen.has(key) || !toggleableKeys.includes(key)) return;
            seen.add(key);
            nextOrder.push(key);
        };

        if (Array.isArray(sourceOrder)) {
            sourceOrder.forEach(addKey);
        }
        toggleableKeys.forEach(addKey);
        return nextOrder;
    };

    const normalizedColumnOrder = normalizeOrder(columnOrder);
    const sortOptions = [
        { value: 'asc', label: 'Tăng dần' },
        { value: 'desc', label: 'Giảm dần' },
    ];

    const handleOpenChange = (visible) => {
        setPopoverOpen(visible);
        if (visible) {
            setTempHiddenKeys([...hiddenKeys]);
            setTempSortOrder(sortOrder);
            setTempSortFieldOrder([...sortFieldOrder]);
            setTempColumnOrder(normalizedColumnOrder);
            setTempMaxRows(maxRows);

            const initialValues = {};
            normalizedColumnOrder.forEach((key, index) => {
                initialValues[key] = columnOrderValues && columnOrderValues[key] !== undefined
                    ? columnOrderValues[key]
                    : index + 1;
            });
            setTempColumnOrderValues(initialValues);
            setSearchText('');
        }
    };

    const handleTempDefault = () => {
        const hidden = [];
        allColumns.forEach((col, index) => {
            const key = col.key || col.dataIndex;
            if (!key) return;
            const isEssential = col.toggleable === false || ['stt', 'action', 'actions', 'operation'].includes(key);
            if (index >= defaultCount && !isEssential) {
                hidden.push(key);
            }
        });
        setTempHiddenKeys(hidden);
        setTempColumnOrder(toggleableKeys);

        const defaultValues = {};
        toggleableKeys.forEach((key, index) => {
            defaultValues[key] = index + 1;
        });
        setTempColumnOrderValues(defaultValues);
        setTempSortFieldOrder([]);
    };

    const handleTempAll = () => {
        setTempHiddenKeys([]);
    };

    const toggleTempColumn = (key) => {
        setTempHiddenKeys(prev => (prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]));
    };

    const moveTempColumn = (key, direction) => {
        setTempColumnOrder(prev => {
            const nextOrder = normalizeOrder(prev);
            const currentIndex = nextOrder.indexOf(key);
            const nextIndex = currentIndex + direction;
            if (currentIndex < 0 || nextIndex < 0 || nextIndex >= nextOrder.length) {
                return nextOrder;
            }

            const [movedKey] = nextOrder.splice(currentIndex, 1);
            nextOrder.splice(nextIndex, 0, movedKey);

            setTempColumnOrderValues(prevValues => {
                const nextValues = { ...prevValues };
                nextOrder.forEach((k, index) => {
                    nextValues[k] = index + 1;
                });
                return nextValues;
            });

            return nextOrder;
        });
    };

    const setTempColumnPosition = (key, position) => {
        const numericPosition = Number(position);
        if (!Number.isFinite(numericPosition)) return;
        setTempColumnOrderValues(prev => ({ ...prev, [key]: numericPosition }));
    };

    const handleUpdate = () => {
        const sortedOrder = [...normalizeOrder()].sort((a, b) => {
            const valA = tempColumnOrderValues[a] !== undefined ? tempColumnOrderValues[a] : 999;
            const valB = tempColumnOrderValues[b] !== undefined ? tempColumnOrderValues[b] : 999;
            return valA - valB;
        });
        applySettings(tempHiddenKeys, tempSortOrder, sortedOrder, tempColumnOrderValues, tempSortFieldOrder, tempMaxRows);
        setPopoverOpen(false);
    };

    const draftColumnOrder = normalizeOrder();
    const orderedToggleableColumns = draftColumnOrder.map(key => toggleableColumnMap.get(key)).filter(Boolean);

    const filteredCols = orderedToggleableColumns.filter(col => {
        let label = '';
        if (col.titleText) {
            label = col.titleText;
        } else if (typeof col.title === 'string') {
            label = col.title;
        } else if (React.isValidElement(col.title)) {
            const children = col.title.props?.children;
            if (typeof children === 'string') {
                label = children;
            } else if (Array.isArray(children)) {
                label = children.filter(c => typeof c === 'string').join('');
            }
        }

        const colKey = col.key || col.dataIndex || '';
        return label.toLowerCase().includes(searchText.toLowerCase()) || colKey.toLowerCase().includes(searchText.toLowerCase());
    });

    const content = (
        <div className={styles.container}>
            {showSort && (
                <>
                    <div className={styles.sortSection}>
                        <span className={styles.sectionTitle}>Sắp xếp dữ liệu</span>
                        <div className={styles.sortControls}>
                            <Select
                                placeholder="Chọn kiểu sắp xếp..."
                                value={tempSortOrder || undefined}
                                onChange={value => setTempSortOrder(value)}
                                className={styles.sortSelect}
                                allowClear
                                size="small"
                                options={sortOptions}
                            />
                        </div>
                        {sortFieldOptions.length > 0 && (
                            <div className={styles.sortFields}>
                                <Select
                                    mode="multiple"
                                    placeholder="Chọn lần lượt các cột muốn sắp xếp..."
                                    value={tempSortFieldOrder}
                                    onChange={setTempSortFieldOrder}
                                    className={styles.sortSelect}
                                    allowClear
                                    size="small"
                                    options={sortFieldOptions}
                                />
                            </div>
                        )}
                    </div>
                    <Divider className={styles.divider} />
                </>
            )}

            <div className={styles.sortSection}>
                <span className={styles.sectionTitle}>Số dòng hiển thị</span>
                <Select
                    value={tempMaxRows}
                    onChange={value => setTempMaxRows(value)}
                    className={styles.sortSelect}
                    size="small"
                    options={[
                        { value: 10, label: '10 dòng' },
                        { value: 20, label: '20 dòng' },
                        { value: 50, label: '50 dòng' },
                        { value: 100, label: '100 dòng' },
                    ]}
                />
            </div>
            <Divider className={styles.divider} />

            <div className={styles.header}>
                <span className={styles.sectionTitle}>Cột hiển thị</span>
                <Space size={8}>
                    <Button type="default" size="small" onClick={handleTempDefault} className={styles.actionBtn}>
                        Mặc định
                    </Button>
                    <Button type="primary" size="small" onClick={handleTempAll} className={styles.actionBtn} ghost>
                        Tất cả
                    </Button>
                </Space>
            </div>

            <div className={styles.searchBox}>
                <Input
                    placeholder="Tìm tên cột..."
                    prefix={<Search size={14} style={{ color: '#bfbfbf' }} />}
                    value={searchText}
                    onChange={e => setSearchText(e.target.value)}
                    size="small"
                    allowClear
                />
            </div>

            <div className={styles.list}>
                {filteredCols.length === 0 ? (
                    <div className={styles.empty}>Không tìm thấy cột</div>
                ) : (
                    filteredCols.map(col => {
                        const key = col.key || col.dataIndex;
                        const isChecked = !tempHiddenKeys.includes(key);
                        const orderIndex = draftColumnOrder.indexOf(key);
                        let resolvedLabel = col.titleText || col.title;

                        if (typeof resolvedLabel === 'object' && resolvedLabel !== null) {
                            resolvedLabel = <span className={styles.reactLabel}>{resolvedLabel}</span>;
                        }

                        return (
                            <div key={key} className={styles.item} onClick={() => toggleTempColumn(key)}>
                                <Checkbox checked={isChecked} onChange={() => toggleTempColumn(key)} onClick={e => e.stopPropagation()} />
                                <span className={styles.label}>{resolvedLabel}</span>
                                {showColumnOrder && (
                                    <div className={styles.orderTools} onClick={e => e.stopPropagation()}>
                                        <InputNumber
                                            min={0}
                                            value={tempColumnOrderValues[key] ?? (orderIndex + 1)}
                                            onChange={value => setTempColumnPosition(key, value)}
                                            size="small"
                                            controls={false}
                                            className={styles.orderInput}
                                        />
                                        <div className={styles.moveButtons}>
                                            <Button
                                                type="text"
                                                size="small"
                                                title="Lên"
                                                icon={<ArrowUp size={12} />}
                                                disabled={orderIndex <= 0}
                                                onClick={() => moveTempColumn(key, -1)}
                                            />
                                            <Button
                                                type="text"
                                                size="small"
                                                title="Xuống"
                                                icon={<ArrowDown size={12} />}
                                                disabled={orderIndex === draftColumnOrder.length - 1}
                                                onClick={() => moveTempColumn(key, 1)}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            <Divider className={styles.divider} />

            <div className={styles.footer}>
                <Button size="small" onClick={() => setPopoverOpen(false)} className={styles.footerBtn}>
                    Hủy
                </Button>
                <Button type="primary" size="small" onClick={handleUpdate} className={styles.footerBtn}>
                    Cập nhật
                </Button>
            </div>
        </div>
    );

    return (
        <Popover
            content={content}
            trigger="click"
            open={popoverOpen}
            onOpenChange={handleOpenChange}
            placement="bottomRight"
            arrow={{ pointAtCenter: true }}
            {...popoverProps}
        >
            <Button icon={<Settings size={16} />} className={styles.triggerButton} {...buttonProps}>
                Hiển thị
            </Button>
        </Popover>
    );
}

export default ColumnSelector;
