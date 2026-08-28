import { useCallback, useEffect, useMemo, useState } from 'react';
import { lv_LoadDataAPI } from '../services/apiServices';
import useBackendColumnManager, { buildDisplayColumnsFromBackend } from './useBackendColumnManager';

const SYSTEM_KEYS = new Set(['stt', 'index', 'action', 'actions', 'operation']);

const splitList = (value) => String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const getColumnKey = (column) => column?.key || column?.dataIndex;

const getColumnTitle = (column) => {
    if (column?.titleText) return column.titleText;
    if (typeof column?.title === 'string') return column.title;
    return getColumnKey(column) || 'Cột';
};

const createBackendColumns = (allColumns, fieldList, requiredKeys = []) => {
    const fieldKeys = splitList(fieldList);
    const visibleKeys = fieldKeys.length > 0
        ? new Set([...fieldKeys, ...requiredKeys])
        : new Set(allColumns.map(getColumnKey).filter((key) => key && !SYSTEM_KEYS.has(key)));
    return allColumns
        .filter((column) => visibleKeys.has(getColumnKey(column)) && !SYSTEM_KEYS.has(getColumnKey(column)))
        .map((column) => ({
            key: getColumnKey(column),
            dataIndex: getColumnKey(column),
            title: getColumnTitle(column),
        }));
};

const normalizeValue = (record, field) => {
    const value = record?._raw?.[field] ?? record?.[field];
    if (value === undefined || value === null) return '';
    if (typeof value === 'boolean') return value ? 1 : 0;

    const trimmed = String(value).trim();
    if (trimmed === '') return '';

    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
        return Number(trimmed);
    }

    const timestamp = Date.parse(trimmed);
    if (!Number.isNaN(timestamp) && /[-/:\s]/.test(trimmed)) {
        return timestamp;
    }

    return trimmed.toLowerCase();
};

export const sortRowsByPreference = (rows = [], sortOrder, sortFieldOrder = []) => {
    if (!sortOrder || !Array.isArray(sortFieldOrder) || sortFieldOrder.length === 0) {
        return rows;
    }

    const direction = sortOrder === 'desc' ? -1 : 1;

    return [...rows].sort((rowA, rowB) => {
        for (const field of sortFieldOrder) {
            const valueA = normalizeValue(rowA, field);
            const valueB = normalizeValue(rowB, field);

            if (valueA === valueB) continue;
            if (valueA === '') return -1 * direction;
            if (valueB === '') return 1 * direction;

            if (valueA > valueB) return 1 * direction;
            if (valueA < valueB) return -1 * direction;
        }
        return 0;
    });
};

export default function useSavedTablePreferences({
    tableName,
    prefTable = tableName,
    allColumns = [],
    requiredKeys = [],
    defaultFieldList = '',
    currentPage = 1,
    pageSize = 20,
}) {
    const fallbackFieldList = useMemo(() => {
        if (defaultFieldList) return defaultFieldList;
        return allColumns
            .map(getColumnKey)
            .filter((key) => key && !SYSTEM_KEYS.has(key))
            .join(',');
    }, [allColumns, defaultFieldList]);

    const [prefs, setPrefs] = useState({
        fieldList: '',
        orderList: '',
        sortNum: 0,
        loaded: false,
    });

    const backendColumns = useMemo(() => {
        const resolvedFieldList = prefs.loaded ? prefs.fieldList : fallbackFieldList;
        return createBackendColumns(allColumns, resolvedFieldList, requiredKeys);
    }, [allColumns, prefs.loaded, prefs.fieldList, fallbackFieldList, requiredKeys]);

    const backendSortNum = prefs.sortNum;
    const backendOrderList = prefs.orderList;
    const preferencesLoaded = prefs.loaded;

    const reloadPreferences = useCallback(async () => {
        try {
            const response = await lv_LoadDataAPI(tableName, 'loadPrefs', {
                lv003: prefTable,
                prefTable,
            });
            setPrefs({
                fieldList: response?.fieldList || '',
                orderList: response?.orderList || '',
                sortNum: Number(response?.sortNum || 0),
                loaded: true,
            });
            return response;
        } catch (error) {
            setPrefs({
                fieldList: fallbackFieldList,
                orderList: '',
                sortNum: 0,
                loaded: true,
            });
            return null;
        }
    }, [fallbackFieldList, prefTable, tableName]);

    useEffect(() => {
        reloadPreferences();
    }, [tableName, prefTable, reloadPreferences]);

    const {
        hiddenKeys,
        toggleableColumns,
        columnOrder,
        columnOrderValues,
        sortOrder,
        sortFieldOrder,
        sortFieldOptions,
        createPreferencePayload,
    } = useBackendColumnManager({
        allColumns: allColumns.filter((column) => !SYSTEM_KEYS.has(getColumnKey(column))),
        backendColumns,
        backendOrderList,
        backendSortNum,
        requiredKeys,
    });

    const displayColumns = useMemo(() => {
        const systemColumns = allColumns.filter((column) => SYSTEM_KEYS.has(getColumnKey(column)));
        const dataColumns = allColumns.filter((column) => !SYSTEM_KEYS.has(getColumnKey(column)));
        return [...systemColumns, ...buildDisplayColumnsFromBackend(backendColumns, dataColumns, requiredKeys)];
    }, [allColumns, backendColumns, requiredKeys]);

    const applyColumnSettings = useCallback(async (
        newHiddenKeys,
        newSortOrder,
        nextColumnOrder,
        nextColumnOrderValues,
        nextSortFieldOrder,
    ) => {
        const payload = createPreferencePayload(
            newHiddenKeys,
            newSortOrder,
            nextColumnOrder,
            nextColumnOrderValues,
            nextSortFieldOrder,
        );

        const response = await lv_LoadDataAPI(tableName, 'savePrefs', {
            lv003: prefTable,
            prefTable,
            curPage: currentPage,
            maxRows: pageSize,
            ...payload,
        });

        if (response?.success === false) {
            throw new Error(response?.message || 'Không thể lưu cấu hình hiển thị');
        }

        await reloadPreferences();
        return response;
    }, [createPreferencePayload, currentPage, pageSize, prefTable, reloadPreferences, tableName]);

    return {
        preferencesLoaded,
        displayColumns,
        hiddenKeys,
        toggleableColumns,
        columnOrder,
        columnOrderValues,
        sortOrder,
        sortFieldOrder,
        sortFieldOptions,
        applyColumnSettings,
        reloadPreferences,
    };
}
