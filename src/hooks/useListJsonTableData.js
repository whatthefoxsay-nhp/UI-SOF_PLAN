import { useCallback, useEffect, useRef, useState } from 'react';
import { cmsActivePaginationCache, getCmsListJsonMeta, lv_LoadDataAPI, setCmsActivePagination } from '../services/apiServices';
import { mapRowsWithKey, normalizeListJsonRows } from '../utils/listJsonTableHelpers';

const DEFAULT_PAGE_SIZE = 20;
const EXPORT_PAGE_SIZE = 200000;

const getCmsMetaKey = (tableName, prefTable) => `${tableName}::${prefTable || tableName}`;

export default function useListJsonTableData({
    tableName,
    prefTable = tableName,
    extraPayload = {},
    onLoaded,
    defaultPageSize = DEFAULT_PAGE_SIZE,
    hasQuickRow = true,
}) {
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(defaultPageSize);
    const [totalRows, setTotalRows] = useState(0);
    const [backendColumns, setBackendColumns] = useState([]);
    const [backendSortNum, setBackendSortNum] = useState(0);
    const [backendOrderList, setBackendOrderList] = useState('');
    const payloadRef = useRef(extraPayload);
    const onLoadedRef = useRef(onLoaded);
    const currentPageRef = useRef(1);
    const pageSizeRef = useRef(defaultPageSize);

    useEffect(() => {
        payloadRef.current = extraPayload;
    }, [extraPayload]);

    useEffect(() => {
        onLoadedRef.current = onLoaded;
    }, [onLoaded]);

    const loadData = useCallback(async (page, size) => {
        setLoading(true);
        try {
            const prefKey = prefTable || tableName;
            const activePagination = cmsActivePaginationCache.get(getCmsMetaKey(tableName, prefKey));
            const meta = getCmsListJsonMeta(tableName, prefKey);
            const requestedPage = page || activePagination?.curPage || meta?.curPage || currentPageRef.current;
            const requestedSize = size || activePagination?.maxRows || meta?.maxRows || pageSizeRef.current;
            const requestPayload = {
                lv003: prefTable,
                prefTable,
                ...payloadRef.current,
            };
            if (requestedPage) requestPayload.curPage = requestedPage;
            if (requestedSize) requestPayload.maxRows = requestedSize;
            const response = await lv_LoadDataAPI(tableName, 'listJSON', requestPayload);
            const responseMeta = Array.isArray(response) ? {} : response;
            const rows = mapRowsWithKey(normalizeListJsonRows(response), responseMeta?.columns || []);
            const resolvedPage = Number(responseMeta?.curPage) || requestedPage;
            const resolvedSize = Number(responseMeta?.maxRows) || requestedSize || pageSizeRef.current;

            currentPageRef.current = resolvedPage;
            pageSizeRef.current = resolvedSize;
            setCurrentPage(resolvedPage);
            setPageSize(resolvedSize);
            setTotalRows(Number(responseMeta?.total) || rows.length || 0);
            setBackendColumns(Array.isArray(responseMeta?.columns) ? responseMeta.columns : []);
            setBackendSortNum(Number(responseMeta?.sortNum) || 0);
            setBackendOrderList(responseMeta?.orderList || '');
            onLoadedRef.current?.(rows, response);
            return { rows, response };
        } finally {
            setLoading(false);
        }
    }, [prefTable, tableName]);

    const savePreferences = useCallback(async (preferencePayload, nextMaxRows = pageSizeRef.current) => {
        const resolvedMaxRows = Number(nextMaxRows) || pageSizeRef.current || defaultPageSize;
        const resolvedPage = resolvedMaxRows !== pageSizeRef.current ? 1 : currentPageRef.current;
        const prefKey = prefTable || tableName;
        const response = await lv_LoadDataAPI(tableName, 'savePrefs', {
            lv003: prefTable,
            prefTable,
            curPage: resolvedPage,
            maxRows: resolvedMaxRows,
            ...preferencePayload,
        });
        if (response?.success === false) {
            throw new Error(response?.message || 'Không thể lưu cấu hình hiển thị');
        }
        currentPageRef.current = resolvedPage;
        pageSizeRef.current = resolvedMaxRows;
        setCurrentPage(resolvedPage);
        setPageSize(resolvedMaxRows);
        setCmsActivePagination(tableName, prefKey, { curPage: resolvedPage, maxRows: resolvedMaxRows });
        await loadData(resolvedPage, resolvedMaxRows);
        return response;
    }, [defaultPageSize, loadData, prefTable, tableName]);

    const loadAllRows = useCallback(async () => {
        const response = await lv_LoadDataAPI(tableName, 'listJSON', {
            lv003: prefTable,
            curPage: 1,
            maxRows: EXPORT_PAGE_SIZE,
            ...payloadRef.current,
        });
        return mapRowsWithKey(normalizeListJsonRows(response), response?.columns || []);
    }, [prefTable, tableName]);

    const resolveDataPageSize = useCallback((size) => {
        const incomingSize = Number(size || pageSizeRef.current);
        if (!hasQuickRow) return incomingSize;
        const renderedPageSize = pageSizeRef.current + 1;
        return incomingSize === renderedPageSize ? pageSizeRef.current : incomingSize;
    }, [hasQuickRow]);

    const handlePageChange = useCallback((page, size) => {
        const adjustedSize = resolveDataPageSize(size);
        const nextPage = adjustedSize !== pageSizeRef.current ? 1 : page;
        return loadData(nextPage, adjustedSize);
    }, [loadData, resolveDataPageSize]);

    const actualPageSize = pageSize || defaultPageSize;
    const totalPages = Math.ceil((totalRows || 0) / actualPageSize);
    const paginationProps = {
        current: currentPage,
        pageSize: hasQuickRow ? actualPageSize + 1 : actualPageSize,
        total: hasQuickRow ? (totalRows || 0) + totalPages : (totalRows || 0),
        onChange: handlePageChange,
    };

    return {
        loading,
        currentPage,
        pageSize,
        totalRows,
        backendColumns,
        backendSortNum,
        backendOrderList,
        loadData,
        loadAllRows,
        savePreferences,
        handlePageChange,
        paginationProps,
    };
}
