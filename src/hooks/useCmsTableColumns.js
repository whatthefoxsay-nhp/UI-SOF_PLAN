import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { message } from 'antd';
import { ColumnSelector } from '../components/common';
import { getCmsListJsonMeta, lv_LoadDataAPI, subscribeCmsListJsonMeta, setCmsActivePagination } from '../services/apiServices';
import useBackendColumnManager, { buildDisplayColumnsFromBackend } from './useBackendColumnManager';

const getColumnKey = (column) => column?.key || column?.dataIndex;

export default function useCmsTableColumns({
    tableName,
    prefTable,
    columns,
    requiredKeys = ['lv001'],
    onReload,
    pageSize = 20,
    currentPage = 1,
    userID,
    hasQuickRow = true,
    backendFieldList = null,
    reloadUseListJson = !String(tableName || '').startsWith('wb_'),
}) {
    const [meta, setMeta] = useState(() => getCmsListJsonMeta(tableName, prefTable || tableName));

    const [localPageSize, setLocalPageSize] = useState(pageSize);
    const [localCurrentPage, setLocalCurrentPage] = useState(currentPage);
    const requestedPaginationRef = useRef(null);

    useEffect(() => {
        const curPage = meta?.curPage || currentPage || 1;
        const maxRows = meta?.maxRows || pageSize || 20;
        const requested = requestedPaginationRef.current;
        if (
            requested &&
            (Number(requested.curPage) !== Number(curPage) || Number(requested.maxRows) !== Number(maxRows))
        ) {
            return;
        }
        requestedPaginationRef.current = null;
        setLocalCurrentPage(curPage);
        setLocalPageSize(maxRows);
        setCmsActivePagination(tableName, prefTable || tableName, { curPage, maxRows });
    }, [meta, tableName, prefTable, currentPage, pageSize]);

    useEffect(() => {
        const refreshMeta = () => {
            setMeta(getCmsListJsonMeta(tableName, prefTable || tableName));
        };

        refreshMeta();
        return subscribeCmsListJsonMeta(refreshMeta);
    }, [prefTable, tableName]);

    const normalizedColumns = useMemo(
        () => columns.map((column, index) => ({ ...column, __sourceIndex: index })),
        [columns],
    );

    const sttColumn = useMemo(
        () => normalizedColumns.find((column) => getColumnKey(column) === 'stt'),
        [normalizedColumns],
    );

    const dataColumns = useMemo(
        () => normalizedColumns.filter((column) => getColumnKey(column) !== 'stt'),
        [normalizedColumns],
    );

    const activeFieldList = useMemo(() => {
        if (backendFieldList) return backendFieldList;
        return meta?.fieldList ? meta.fieldList.split(',').map((item) => item.trim()) : null;
    }, [backendFieldList, meta?.fieldList]);

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
        allColumns: dataColumns,
        backendColumns: meta?.columns || [],
        backendOrderList: meta?.orderList || '',
        backendSortNum: meta?.sortNum || 0,
        requiredKeys,
        backendFieldList: activeFieldList,
    });

    const displayColumns = useMemo(() => {
        const backendColumns = meta?.columns?.length
            ? meta.columns
            : dataColumns.map((column) => ({
                key: getColumnKey(column),
                dataIndex: column.dataIndex || getColumnKey(column),
                title: column.title,
            }));
        const mappedColumns = buildDisplayColumnsFromBackend(backendColumns, dataColumns, requiredKeys);

        if (Array.isArray(columnOrder) && columnOrder.length > 0) {
            const orderMap = new Map(columnOrder.map((k, i) => [k, i]));
            mappedColumns.sort((a, b) => {
                const keyA = getColumnKey(a);
                const keyB = getColumnKey(b);
                const idxA = orderMap.has(keyA) ? orderMap.get(keyA) : 999;
                const idxB = orderMap.has(keyB) ? orderMap.get(keyB) : 999;
                return idxA - idxB;
            });
        }

        return sttColumn ? [sttColumn, ...mappedColumns] : mappedColumns;
    }, [dataColumns, meta, requiredKeys, sttColumn, columnOrder]);

    const applySettings = useCallback(async (
        newHiddenKeys,
        newSortOrder,
        nextColumnOrder = columnOrder,
        nextColumnOrderValues = columnOrderValues,
        nextSortFieldOrder = sortFieldOrder,
        nextMaxRows = localPageSize,
    ) => {
        try {
            const payload = createPreferencePayload(
                newHiddenKeys,
                newSortOrder,
                nextColumnOrder,
                nextColumnOrderValues,
                nextSortFieldOrder,
            );

            const result = await lv_LoadDataAPI(tableName, 'savePrefs', {
                lv003: prefTable || tableName,
                ...payload,
                maxRows: nextMaxRows,
                curPage: localCurrentPage,
                ...(userID ? { userID } : {}),
            });

            if (result?.success !== false) {
                message.success('Đã lưu cấu hình hiển thị cột');
                setLocalPageSize(nextMaxRows);
                setCmsActivePagination(tableName, prefTable || tableName, { curPage: localCurrentPage, maxRows: nextMaxRows });
                if (typeof onReload === 'function') {
                    await onReload(localCurrentPage, nextMaxRows, { useListJson: reloadUseListJson });
                }
            } else {
                message.error(result?.message || 'Không thể lưu cấu hình hiển thị cột');
            }
        } catch (error) {
            console.error('Cannot save CMS column preferences:', error);
            message.error('Không thể lưu cấu hình hiển thị cột');
        }
    }, [
        columnOrder,
        columnOrderValues,
        createPreferencePayload,
        localCurrentPage,
        onReload,
        localPageSize,
        prefTable,
        sortFieldOrder,
        tableName,
        userID,
        reloadUseListJson,
    ]);

    const selector = (
        <ColumnSelector
            allColumns={dataColumns}
            toggleableColumns={toggleableColumns}
            hiddenKeys={hiddenKeys}
            showSort
            sortOrder={sortOrder}
            sortFieldOrder={sortFieldOrder}
            sortFieldOptions={sortFieldOptions}
            columnOrder={columnOrder}
            columnOrderValues={columnOrderValues}
            showColumnOrder
            maxRows={localPageSize}
            applySettings={applySettings}
        />
    );

    const paginationProps = useMemo(() => {
        const actualTotal = meta?.total || 0;
        const actualPageSize = localPageSize || 20;
        const totalPages = Math.ceil(actualTotal / actualPageSize);
        return {
            current: localCurrentPage,
            pageSize: hasQuickRow ? actualPageSize + 1 : actualPageSize,
            total: hasQuickRow ? actualTotal + totalPages : actualTotal,
            onChange: (page, size) => {
                const incomingSize = Number(size || actualPageSize);
                const renderedPageSize = hasQuickRow ? actualPageSize + 1 : actualPageSize;
                const adjustedSize = hasQuickRow && incomingSize === renderedPageSize ? actualPageSize : incomingSize;
                const nextPage = adjustedSize !== actualPageSize ? 1 : page;
                setLocalCurrentPage(nextPage);
                setLocalPageSize(adjustedSize);
                requestedPaginationRef.current = { curPage: nextPage, maxRows: adjustedSize };
                setCmsActivePagination(tableName, prefTable || tableName, { curPage: nextPage, maxRows: adjustedSize });
                if (typeof onReload === 'function') {
                    onReload(nextPage, adjustedSize);
                }
            },
        };
    }, [localCurrentPage, localPageSize, meta?.total, tableName, prefTable, onReload, hasQuickRow]);

    return {
        displayColumns,
        selector,
        totalRows: meta?.total || 0,
        meta,
        paginationProps,
    };
}
