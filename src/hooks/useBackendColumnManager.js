import { useCallback, useMemo } from 'react';
import { isInvalidColumnTitle, normalizeVietnameseColumnTitle } from '../utils/vietnameseColumnTitles';

const SYSTEM_COLUMN_KEYS = ['stt', 'index', 'actions', 'action', 'operation'];

const getColumnKey = (col) => col?.key || col?.dataIndex;

const splitList = (value) => String(value || '')
    .split(',')
    .map((item) => item.trim());

const parseOrderValue = (value, fallback) => {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const parseSortPriority = (value) => {
    const source = String(value || '').trim();
    if (!source.includes('.')) return null;
    const decimalPart = source.split('.')[1];
    if (decimalPart === '' || decimalPart === undefined) return null;
    const parsed = Number.parseInt(decimalPart, 10);
    return Number.isFinite(parsed) ? parsed : null;
};

const getLvFieldNumber = (key) => {
    const match = String(key || '').match(/^lv(\d+)$/);
    return match ? parseInt(match[1], 10) : null;
};

const getColumnOrderIndex = (key, allColumnKeys = []) => {
    const fieldNum = getLvFieldNumber(key);
    if (fieldNum !== null && fieldNum > 0) return fieldNum - 1;
    return Array.isArray(allColumnKeys) ? allColumnKeys.indexOf(key) : -1;
};

const getColumnTitleText = (column) => {
    if (!column) return '';
    if (column.titleText) return column.titleText;
    if (typeof column.title === 'string') return column.title;
    return getColumnKey(column) || '';
};

const mergeBackendColumnInfo = (column, backendColumn) => {
    if (!backendColumn) {
        return typeof column?.title === 'string'
            ? { ...column, title: normalizeVietnameseColumnTitle(column.title), titleText: normalizeVietnameseColumnTitle(column.titleText || column.title) }
            : column;
    }
    if (column?.preserveTitle) {
        return {
            ...column,
            title: typeof column.title === 'string' ? normalizeVietnameseColumnTitle(column.title) : column.title,
            titleText: typeof column.title === 'string' ? normalizeVietnameseColumnTitle(column.titleText || column.title) : getColumnKey(column),
        };
    }
    const key = getColumnKey(column);
    const backendTitle = normalizeVietnameseColumnTitle(backendColumn.title || backendColumn.titleText);
    if (!backendTitle || backendTitle === key || isInvalidColumnTitle(backendTitle)) {
        return typeof column?.title === 'string'
            ? { ...column, title: normalizeVietnameseColumnTitle(column.title), titleText: normalizeVietnameseColumnTitle(column.titleText || column.title) }
            : column;
    }
    return {
        ...column,
        title: backendTitle,
        titleText: backendTitle,
    };
};

export const buildDisplayColumnsFromBackend = (backendColumns = [], allColumns = [], requiredKeys = []) => {
    const backendSource = Array.isArray(backendColumns) && backendColumns.length > 0
        ? backendColumns
        : allColumns
            .filter((column) => {
                const key = getColumnKey(column);
                return key && !SYSTEM_COLUMN_KEYS.includes(key);
            })
            .map((column) => ({
                key: getColumnKey(column),
                dataIndex: column.dataIndex || getColumnKey(column),
                title: getColumnTitleText(column),
            }));
    const frontendColumnMap = new Map(allColumns.map((col) => [getColumnKey(col), col]));
    const requiredSet = new Set(requiredKeys);
    const usedKeys = new Set();
    const result = [];

    backendSource.forEach((backendColumn) => {
        const key = getColumnKey(backendColumn);
        const frontendColumn = frontendColumnMap.get(key);
        if (!key || !frontendColumn || usedKeys.has(key)) return;
        usedKeys.add(key);
        result.push(mergeBackendColumnInfo(frontendColumn, backendColumn));
    });

    allColumns.forEach((column) => {
        const key = getColumnKey(column);
        if (!key || usedKeys.has(key) || !requiredSet.has(key)) return;
        usedKeys.add(key);
        result.unshift(column);
    });

    if (result.length > 0) return result;

    return allColumns.filter((column) => {
        const key = getColumnKey(column);
        return key && requiredSet.has(key);
    });
};

export default function useBackendColumnManager({
    allColumns = [],
    backendColumns = [],
    backendOrderList = '',
    backendSortNum = 0,
    requiredKeys = [],
    backendFieldList = null,
}) {
    const allColumnKeys = useMemo(
        () => allColumns.map(getColumnKey).filter(Boolean),
        [allColumns],
    );

    const backendColumnMap = useMemo(() => {
        const result = new Map();
        backendColumns.forEach((column, index) => {
            const key = getColumnKey(column);
            if (!key) return;
            result.set(key, { ...column, __backendIndex: index });
        });
        return result;
    }, [backendColumns]);

    const backendVisibleKeys = useMemo(() => {
        return backendColumns
            .map(getColumnKey)
            .filter((key) => key && allColumnKeys.includes(key));
    }, [allColumnKeys, backendColumns]);

    const managedColumns = useMemo(() => {
        return allColumns.map((column) => mergeBackendColumnInfo(column, backendColumnMap.get(getColumnKey(column))));
    }, [allColumns, backendColumnMap]);

    const requiredSet = useMemo(
        () => new Set([...SYSTEM_COLUMN_KEYS, ...requiredKeys]),
        [requiredKeys],
    );

    const rawOrderValues = useMemo(() => splitList(backendOrderList), [backendOrderList]);

    const backendPositionValues = useMemo(() => {
        const result = {};
        backendVisibleKeys.forEach((key, index) => {
            result[key] = index + 1;
        });
        return result;
    }, [backendVisibleKeys]);

    const columnOrderValues = useMemo(() => {
        const result = {};
        allColumnKeys.forEach((key, index) => {
            const fallback = backendPositionValues[key] || index + 1;
            const idx = getColumnOrderIndex(key, allColumnKeys);
            if (idx !== -1 && rawOrderValues[idx] !== undefined && rawOrderValues[idx] !== '') {
                result[key] = parseOrderValue(rawOrderValues[idx], fallback);
            } else {
                result[key] = fallback;
            }
        });
        return result;
    }, [allColumnKeys, backendPositionValues, rawOrderValues]);

    const sortFieldOrder = useMemo(() => {
        const sortedFields = [];
        allColumnKeys.forEach((key) => {
            const idx = getColumnOrderIndex(key, allColumnKeys);
            if (idx !== -1 && rawOrderValues[idx] !== undefined && rawOrderValues[idx] !== '') {
                const priority = parseSortPriority(rawOrderValues[idx]);
                if (priority !== null) {
                    sortedFields.push({ key, priority });
                }
            }
        });
        return sortedFields.sort((a, b) => a.priority - b.priority).map(item => item.key);
    }, [allColumnKeys, rawOrderValues]);

    const columnOrder = useMemo(() => {
        const backendOrderedKeys = backendVisibleKeys.length > 0 ? backendVisibleKeys : [];
        const remainingKeys = allColumnKeys.filter((key) => !backendOrderedKeys.includes(key));
        const sourceKeys = backendOrderedKeys.length > 0 ? [...backendOrderedKeys, ...remainingKeys] : allColumnKeys;

        return [...sourceKeys].sort((a, b) => {
            const orderA = columnOrderValues[a] ?? Number.MAX_SAFE_INTEGER;
            const orderB = columnOrderValues[b] ?? Number.MAX_SAFE_INTEGER;
            return orderA === orderB
                ? sourceKeys.indexOf(a) - sourceKeys.indexOf(b)
                : orderA - orderB;
        });
    }, [allColumnKeys, backendVisibleKeys, columnOrderValues]);

    const hiddenKeys = useMemo(() => {
        const activeKeys = new Set(backendVisibleKeys);
        if (activeKeys.size === 0) return [];
        return allColumnKeys.filter((key) => !activeKeys.has(key) && !requiredSet.has(key));
    }, [allColumnKeys, backendVisibleKeys, requiredSet]);

    const toggleableColumns = useMemo(() => {
        return managedColumns.filter((col) => {
            const key = getColumnKey(col);
            return key && !requiredSet.has(key) && col.toggleable !== false;
        });
    }, [managedColumns, requiredSet]);

    const sortOrder = useMemo(() => {
        if (Number(backendSortNum) === 1) return 'asc';
        if (Number(backendSortNum) === 2) return 'desc';
        return null;
    }, [backendSortNum]);

    const sortFieldOptions = useMemo(() => {
        return managedColumns
            .filter((col) => getColumnKey(col))
            .map((col) => {
                const key = getColumnKey(col);
                return {
                    value: key,
                    label: getColumnTitleText(col) || key,
                };
            });
    }, [managedColumns]);

    const createPreferencePayload = useCallback((
        newHiddenKeys = [],
        newSortOrder = null,
        nextColumnOrder = columnOrder,
        nextColumnOrderValues = columnOrderValues,
        nextSortFieldOrder = sortFieldOrder,
    ) => {
        const hiddenSet = new Set(newHiddenKeys.filter((key) => !requiredSet.has(key)));
        const normalizedOrder = Array.isArray(nextColumnOrder) && nextColumnOrder.length > 0
            ? nextColumnOrder.filter((key) => allColumnKeys.includes(key))
            : columnOrder;
        const orderedVisibleKeys = normalizedOrder.filter((key) => requiredSet.has(key) || !hiddenSet.has(key));
        const visibleKeySet = new Set(orderedVisibleKeys);
        allColumnKeys.forEach((key) => {
            if (requiredSet.has(key) && !visibleKeySet.has(key)) {
                orderedVisibleKeys.unshift(key);
                visibleKeySet.add(key);
            }
        });

        const positionMap = new Map();
        normalizedOrder.forEach((key, index) => {
            const explicitValue = Number(nextColumnOrderValues?.[key]);
            const orderValue = Number.isFinite(explicitValue) ? explicitValue : (index + 1);
            positionMap.set(key, orderValue);
        });

        const sortPriorityMap = new Map();
        (Array.isArray(nextSortFieldOrder) ? nextSortFieldOrder : [])
            .filter((key) => visibleKeySet.has(key))
            .forEach((key, index) => {
                sortPriorityMap.set(key, index);
            });

        const lvFieldNumbers = allColumnKeys.map(getLvFieldNumber).filter(Number.isFinite);
        const maxFieldNumber = lvFieldNumbers.length ? Math.max(...lvFieldNumbers) : 0;
        const maxIndex = Math.max(maxFieldNumber, allColumnKeys.length);
        const orderValues = Array.from({ length: maxIndex }, () => '');

        allColumnKeys.forEach((key, index) => {
            const idx = getColumnOrderIndex(key, allColumnKeys);
            if (idx === -1) return;
            const integerPart = positionMap.get(key) ?? (index + 1);
            orderValues[idx] = sortPriorityMap.has(key)
                ? `${integerPart}.${sortPriorityMap.get(key)}`
                : String(integerPart);
        });

        const sortNum = newSortOrder === 'asc' ? 1 : (newSortOrder === 'desc' ? 2 : 0);

        return {
            fieldList: orderedVisibleKeys.join(','),
            orderList: orderValues.join(','),
            sortNum,
        };
    }, [allColumnKeys, columnOrder, columnOrderValues, requiredSet, sortFieldOrder]);

    return {
        hiddenKeys,
        toggleableColumns,
        columnOrder,
        columnOrderValues,
        sortOrder,
        sortFieldOrder,
        sortFieldOptions,
        createPreferencePayload,
    };
}
