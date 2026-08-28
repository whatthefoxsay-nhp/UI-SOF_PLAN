import React from 'react';
import { Segmented } from 'antd';
import { Columns, LayoutGrid } from 'lucide-react';
import styles from './ColumnViewSelector.module.css';

/**
 * ColumnViewSelector - A premium Segmented switcher for table column display.
 * Switches between "default" (7 columns) and "all" columns.
 *
 * @param {string} value - Current value ('default' or 'all').
 * @param {function} onChange - Change callback.
 */
export function ColumnViewSelector({ value, onChange }) {
    const options = [
        {
            label: (
                <div className={styles.optionLabel}>
                    <Columns size={15} />
                    <span>Mặc định (7 cột)</span>
                </div>
            ),
            value: 'default',
        },
        {
            label: (
                <div className={styles.optionLabel}>
                    <LayoutGrid size={15} />
                    <span>Tất cả các cột</span>
                </div>
            ),
            value: 'all',
        },
    ];

    return (
        <div className={styles.container}>
            <Segmented
                options={options}
                value={value}
                onChange={onChange}
                className={styles.segmented}
            />
        </div>
    );
}

export default ColumnViewSelector;
