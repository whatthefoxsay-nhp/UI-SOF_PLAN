import { useCallback, useEffect, useMemo, useState } from 'react';
import { lv_LoadDataAPI } from '../services/apiServices';

const PREF_API_TABLE = 'hr_lv0001';
const SYSTEM_COLUMN_KEYS = ['stt', 'index', 'action', 'actions', 'operation'];

const getColumnKey = (col) => col?.key || col?.dataIndex;

const resolveTitleText = (title, fallback = '') => {
    if (typeof title === 'string') return title;
    if (typeof title === 'number') return String(title);
    if (title && typeof title === 'object') {
        const children = title.props?.children;
        if (typeof children === 'string') return children;
        if (Array.isArray(children)) {
            return children.filter((item) => typeof item === 'string' || typeof item === 'number').join(' ');
        }
    }
    return fallback;
};

const splitList = (value) => String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const flattenColumns = (columns = [], parentTitles = []) => {
    return columns.flatMap((col) => {
        const key = getColumnKey(col);
        const titleText = resolveTitleText(col.title, key || '');
        const nextParents = titleText ? [...parentTitles, titleText] : parentTitles;

        if (Array.isArray(col.children) && col.children.length > 0) {
            return flattenColumns(col.children, nextParents);
        }

        if (!key) return [];

        return [{
            ...col,
            key,
            dataIndex: col.dataIndex || key,
            titleText: parentTitles.length > 0 ? nextParents.join(' / ') : titleText,
        }];
    });
};

const normalizeOrder = (sourceOrder = [], leafKeys = []) => {
    const result = [];
    const seen = new Set();
    const addKey = (key) => {
        if (!key || seen.has(key) || !leafKeys.includes(key)) return;
        seen.add(key);
        result.push(key);
    };

    if (Array.isArray(sourceOrder)) {
        sourceOrder.forEach(addKey);
    }
    leafKeys.forEach(addKey);

    return result;
};

const orderFromList = (orderList, leafKeys) => {
    const orderValues = splitList(orderList).map((value, index) => {
        const parsed = Number.parseFloat(value);
        return Number.isFinite(parsed) ? parsed : index + 1;
    });

    return leafKeys
        .map((key, index) => ({ key, index, order: orderValues[index] ?? index + 1 }))
        .sort((a, b) => (a.order === b.order ? a.index - b.index : a.order - b.order))
        .map((item) => item.key);
};

const buildOrderList = (sourceOrder, leafKeys) => {
    const normalized = normalizeOrder(sourceOrder, leafKeys);
    const position = new Map(normalized.map((key, index) => [key, index + 1]));
    return leafKeys.map((key, index) => String(position.get(key) ?? index + 1)).join(',');
};

const sortByOrder = (items, orderMap) => {
    return [...items].sort((a, b) => {
        const aOrder = a.__columnOrder ?? Number.MAX_SAFE_INTEGER;
        const bOrder = b.__columnOrder ?? Number.MAX_SAFE_INTEGER;
        return aOrder === bOrder ? a.__originalIndex - b.__originalIndex : aOrder - bOrder;
    });
};

const applyVisibility = (columns, visibleKeys, orderMap) => {
    const mapped = [];

    columns.forEach((col, originalIndex) => {
        const key = getColumnKey(col);
        if (Array.isArray(col.children) && col.children.length > 0) {
            const children = applyVisibility(col.children, visibleKeys, orderMap);
            if (children.length === 0) return;

            const minChildOrder = Math.min(...children.map((child) => child.__columnOrder ?? Number.MAX_SAFE_INTEGER));
            mapped.push({
                ...col,
                children: children.map(({ __columnOrder, __originalIndex, ...child }) => child),
                __columnOrder: minChildOrder,
                __originalIndex: originalIndex,
            });
            return;
        }

        if (!key || !visibleKeys.has(key)) return;
        mapped.push({
            ...col,
            key,
            dataIndex: col.dataIndex || key,
            __columnOrder: orderMap.get(key) ?? Number.MAX_SAFE_INTEGER,
            __originalIndex: originalIndex,
        });
    });

    return sortByOrder(mapped, orderMap).map(({ __columnOrder, __originalIndex, ...col }) => col);
};

export default function useColumnPreferences({
    preferenceKey,
    columns = [],
    requiredKeys = [],
    defaultCount,
    enabled = true,
}) {
    const [prefs, setPrefs] = useState({ fieldList: '', orderList: '', sortNum: 0 });
    const [loadingPrefs, setLoadingPrefs] = useState(false);

    const leafColumns = useMemo(() => flattenColumns(columns), [columns]);
    const leafKeys = useMemo(() => leafColumns.map((col) => col.key).filter(Boolean), [leafColumns]);
    const requiredSet = useMemo(() => new Set([...SYSTEM_COLUMN_KEYS, ...requiredKeys]), [requiredKeys]);

    useEffect(() => {
        let mounted = true;
        if (!enabled || !preferenceKey || leafKeys.length === 0) return undefined;

        const loadPrefs = async () => {
            setLoadingPrefs(true);
            try {
                const response = await lv_LoadDataAPI(PREF_API_TABLE, 'loadPrefs', { lv003: preferenceKey });
                if (!mounted) return;
                setPrefs({
                    fieldList: response?.fieldList || '',
                    orderList: response?.orderList || '',
                    sortNum: Number(response?.sortNum || 0),
                });
            } catch (error) {
                if (mounted) {
                    console.error(`Failed to load column prefs for ${preferenceKey}`, error);
                }
            } finally {
                if (mounted) setLoadingPrefs(false);
            }
        };

        loadPrefs();
        return () => {
            mounted = false;
        };
    }, [enabled, preferenceKey, leafKeys.length]);

    const visibleKeys = useMemo(() => {
        const savedKeys = splitList(prefs.fieldList).filter((key) => leafKeys.includes(key));
        const baseKeys = savedKeys.length > 0 ? savedKeys : leafKeys;
        const visible = new Set(baseKeys);
        requiredSet.forEach((key) => {
            if (leafKeys.includes(key)) visible.add(key);
        });
        return visible;
    }, [prefs.fieldList, leafKeys, requiredSet]);

    const columnOrder = useMemo(() => orderFromList(prefs.orderList, leafKeys), [prefs.orderList, leafKeys]);
    
    const columnOrderValues = useMemo(() => {
        const mapping = {};
        const orderValues = splitList(prefs.orderList).map((value, index) => {
            const parsed = Number.parseFloat(value);
            return Number.isFinite(parsed) ? parsed : index + 1;
        });
        leafKeys.forEach((key, index) => {
            mapping[key] = orderValues[index] ?? (index + 1);
        });
        return mapping;
    }, [prefs.orderList, leafKeys]);

    const orderMap = useMemo(() => new Map(columnOrder.map((key, index) => [key, index + 1])), [columnOrder]);

    const displayColumns = useMemo(() => applyVisibility(columns, visibleKeys, orderMap), [columns, visibleKeys, orderMap]);

    const hiddenKeys = useMemo(() => {
        return leafKeys.filter((key) => !visibleKeys.has(key) && !requiredSet.has(key));
    }, [leafKeys, visibleKeys, requiredSet]);

    const toggleableColumns = useMemo(() => {
        return leafColumns
            .filter((col) => !requiredSet.has(col.key) && col.toggleable !== false)
            .map((col) => ({ ...col, title: col.titleText || col.title }));
    }, [leafColumns, requiredSet]);

    const selectorColumns = useMemo(() => {
        return leafColumns.map((col) => ({
            ...col,
            title: col.titleText || col.title,
            toggleable: requiredSet.has(col.key) ? false : col.toggleable,
        }));
    }, [leafColumns, requiredSet]);

    const applySettings = useCallback(async (newHiddenKeys = [], newSortOrder = null, nextColumnOrder = columnOrder, nextColumnOrderValues = columnOrderValues) => {
        const hidden = new Set(newHiddenKeys.filter((key) => !requiredSet.has(key)));
        const nextVisibleKeys = leafKeys.filter((key) => requiredSet.has(key) || !hidden.has(key));
        
        const nextOrderList = leafKeys.map((key, index) => {
            if (nextColumnOrderValues && nextColumnOrderValues[key] !== undefined) {
                return String(nextColumnOrderValues[key]);
            }
            const position = new Map(
                normalizeOrder(nextColumnOrder, leafKeys).map((k, idx) => [k, idx + 1])
            );
            return String(position.get(key) ?? index + 1);
        }).join(',');

        const nextSortNum = newSortOrder === 'asc' ? 1 : (newSortOrder === 'desc' ? 2 : 0);
        const nextFieldList = nextVisibleKeys.join(',');

        setPrefs({ fieldList: nextFieldList, orderList: nextOrderList, sortNum: nextSortNum });

        if (!preferenceKey) return { success: true };
        return lv_LoadDataAPI(PREF_API_TABLE, 'savePrefs', {
            lv003: preferenceKey,
            fieldList: nextFieldList,
            orderList: nextOrderList,
            sortNum: nextSortNum,
            maxRows: defaultCount || 0,
            curPage: 1,
        });
    }, [columnOrder, columnOrderValues, defaultCount, leafKeys, preferenceKey, requiredSet]);

    return {
        columns: displayColumns,
        selectorColumns,
        hiddenKeys,
        toggleableColumns,
        columnOrder,
        columnOrderValues,
        sortOrder: prefs.sortNum === 1 ? 'asc' : (prefs.sortNum === 2 ? 'desc' : null),
        loadingPrefs,
        applySettings,
    };
}