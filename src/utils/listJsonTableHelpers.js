import { lv_LoadDataAPI } from '../services/apiServices';
import { mapListJsonRowsAliases } from './listJsonAliasHelpers';

export const normalizeListJsonRows = (response) => {
    if (Array.isArray(response)) {
        return response;
    }
    if (Array.isArray(response?.rows)) {
        return response.rows;
    }
    return [];
};

export const mapRowsWithKey = (rows = [], columns = []) => {
    const keyedRows = rows.map((item, index) => ({
        ...item,
        key: item?.key || item?.lv001 || `row-${index}`,
    }));
    return mapListJsonRowsAliases(keyedRows, columns);
};

export const loadAllListJsonRows = async (tableName, prefTable, extraPayload = {}, maxRows = 200000) => {
    const response = await lv_LoadDataAPI(tableName, 'listJSON', {
        lv003: prefTable || tableName,
        curPage: 1,
        maxRows,
        ...extraPayload,
    });

    return mapRowsWithKey(normalizeListJsonRows(response), response?.columns || []);
};
