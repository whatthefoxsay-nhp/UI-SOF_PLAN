import { useState, useEffect, useMemo } from 'react';

/**
 * Custom hook to control table column visibility and data sorting.
 * Allows drafting changes and applying them at once, saving the configuration in localStorage.
 *
 * @param {Array} allColumns - The full list of column definitions.
 * @param {Array} dataSource - The raw table data to be sorted.
 * @param {string} storageKey - Unique key to persist configuration in localStorage.
 * @param {number} defaultCount - The number of columns to display in default mode (defaults to 7).
 * @param {string} defaultSortField - The field key to sort by automatically (e.g. 'lv001' or 'maPhongBan').
 */
export function useTableColumns({ allColumns, dataSource = [], storageKey, defaultCount = 7, defaultSortField }) {
    // Determine which column keys are toggleable.
    const toggleableColumns = useMemo(() => {
        return allColumns.filter(col => {
            const key = col.key || col.dataIndex;
            if (!key) return false;
            if (col.toggleable === false) return false;
            if (['stt', 'action', 'actions', 'operation'].includes(key)) return false;
            return true;
        });
    }, [allColumns]);

    // 1. Initial hidden keys
    const [hiddenKeys, setHiddenKeys] = useState(() => {
        if (!storageKey) return [];
        try {
            const stored = localStorage.getItem(storageKey);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (e) {
            console.error('Failed to parse stored column visibility', e);
        }
        
        // Default mode: hide columns beyond defaultCount (index >= defaultCount) that aren't essential
        const initialHidden = [];
        allColumns.forEach((col, index) => {
            const key = col.key || col.dataIndex;
            if (!key) return;
            const isEssential = col.toggleable === false || ['stt', 'action', 'actions', 'operation'].includes(key);
            if (index >= defaultCount && !isEssential) {
                initialHidden.push(key);
            }
        });
        return initialHidden;
    });

    // 2. Initial sort order
    const [sortOrder, setSortOrder] = useState(() => {
        if (!storageKey) return null;
        try {
            return localStorage.getItem(`${storageKey}_sort_ord`) || null;
        } catch (e) {
            return null;
        }
    });

    // Sync state changes to localStorage
    useEffect(() => {
        if (!storageKey) return;
        try {
            localStorage.setItem(storageKey, JSON.stringify(hiddenKeys));
        } catch (e) {
            console.error('Failed to save hiddenKeys to localStorage', e);
        }
    }, [hiddenKeys, storageKey]);

    useEffect(() => {
        if (!storageKey) return;
        try {
            if (sortOrder) {
                localStorage.setItem(`${storageKey}_sort_ord`, sortOrder);
            } else {
                localStorage.removeItem(`${storageKey}_sort_ord`);
            }
        } catch (e) {
            console.error('Failed to save sortOrder to localStorage', e);
        }
    }, [sortOrder, storageKey]);

    // Filtered columns to pass to <Table>
    const columns = useMemo(() => {
        return allColumns.filter(col => {
            const key = col.key || col.dataIndex;
            if (!key) return true; // keep columns without keys
            return !hiddenKeys.includes(key);
        });
    }, [allColumns, hiddenKeys]);

    // Sorted data to pass to <Table>
    const sortedData = useMemo(() => {
        if (!dataSource || !Array.isArray(dataSource)) return [];
        if (!defaultSortField || !sortOrder) return dataSource;

        // Find the column definition to check for custom sorters
        const col = allColumns.find(c => (c.key || c.dataIndex) === defaultSortField);
        const dataIndex = defaultSortField;

        const sorted = [...dataSource];
        sorted.sort((a, b) => {
            // Respect custom column sorter logic if defined
            if (col?.sorter && typeof col.sorter === 'function') {
                const res = col.sorter(a, b);
                return sortOrder === 'asc' ? res : -res;
            }

            let valA = a[dataIndex];
            let valB = b[dataIndex];

            if (valA === undefined || valA === null) return sortOrder === 'asc' ? -1 : 1;
            if (valB === undefined || valB === null) return sortOrder === 'asc' ? 1 : -1;

            if (typeof valA === 'number' && typeof valB === 'number') {
                return sortOrder === 'asc' ? valA - valB : valB - valA;
            }

            // Fallback multilingual string comparison (Vietnamese locale)
            const strA = String(valA).toLowerCase();
            const strB = String(valB).toLowerCase();
            return sortOrder === 'asc' 
                ? strA.localeCompare(strB, 'vi') 
                : strB.localeCompare(strA, 'vi');
        });

        return sorted;
    }, [dataSource, defaultSortField, sortOrder, allColumns]);

    /**
     * Applies both column visibility and data sorting changes at once.
     */
    const applySettings = (newHiddenKeys, newSortOrder) => {
        setHiddenKeys(newHiddenKeys);
        setSortOrder(newSortOrder);
    };

    return {
        columns,
        hiddenKeys,
        toggleableColumns,
        sortedData,
        sortOrder,
        applySettings,
    };
}

export default useTableColumns;
