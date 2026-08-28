import { message } from 'antd';
import { execCRUD } from '../../../../services/apiServices';

export const loadChildData = async (vtable, payload) => {
    const res = await execCRUD(vtable, 'load', { vtable, vfunc: 'load', ...payload });
    if (!res?.success) {
        message.error(res?.message || 'Không thể tải dữ liệu');
        return { rows: [], total: 0, raw: res };
    }
    const rows = Array.isArray(res.rows) ? res.rows : (Array.isArray(res.data) ? res.data : []);
    return { rows, total: Number(res.total || rows.length || 0), raw: res };
};

export const mutateChildData = async (vtable, vfunc, payload) => {
    const res = await execCRUD(vtable, vfunc, { vtable, vfunc, ...payload });
    if (res?.success) message.success(res.message || 'Thao tác thành công');
    else message.error(res?.message || 'Thao tác thất bại');
    return res;
};

export const withQuickRow = (rows) => [{ isQuickRow: true, lv001: 'QUICK', key: 'QUICK' }, ...rows];
export const rowKey = (record, prefix) => record.isQuickRow ? prefix + '_QUICK' : (record.lv001 || record.key);
