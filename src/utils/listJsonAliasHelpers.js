const stripVietnamese = (value = '') => String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0111/g, 'd')
    .replace(/\u0110/g, 'D');

const toPascalCase = (value = '') => stripVietnamese(value)
    .replace(/\b(ma|id|code)\b/gi, ' ')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');

const getColumnKey = (column) => column?.key || column?.dataIndex;

export const createListJsonAliasMap = (columns = []) => {
    const aliasMap = {};
    columns.forEach((column) => {
        const key = getColumnKey(column);
        if (!key) return;
        const title = typeof column?.title === 'string' ? column.title : '';
        const pascalTitle = toPascalCase(title);
        if (pascalTitle) {
            aliasMap[`${key}_ten`] = `ten${pascalTitle}`;
        }
    });
    return aliasMap;
};

export const mapListJsonRowAliases = (row = {}, columns = []) => {
    const aliasMap = createListJsonAliasMap(columns);
    const mapped = { ...row };

    Object.keys(row).forEach((key) => {
        if (!key.endsWith('_ten')) return;
        const explicitAlias = aliasMap[key];
        if (explicitAlias && mapped[explicitAlias] === undefined) {
            mapped[explicitAlias] = row[key];
        }

        const sourceField = key.slice(0, -4);
        const camelSourceAlias = `${sourceField}Ten`;
        if (mapped[camelSourceAlias] === undefined) {
            mapped[camelSourceAlias] = row[key];
        }
    });

    return mapped;
};

export const mapListJsonRowsAliases = (rows = [], columns = []) => (
    rows.map((row) => mapListJsonRowAliases(row, columns))
);
