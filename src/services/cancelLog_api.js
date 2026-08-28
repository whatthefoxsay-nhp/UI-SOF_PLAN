import dayjs from 'dayjs';
import { callApi } from './apiServices';
import { CANCEL_REASON_MAP } from '../constants/cancelReasons';

const DEFAULT_PAGE_SIZE = 10;
const MIN_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;
const DEFAULT_RANGE_DAYS = 7;

const INVOICE_STATUS_LABELS = {
	'0': 'Chờ phục vụ',
	'1': 'Đang phục vụ',
	'2': 'Chờ thanh toán',
	'3': 'Hoàn tất',
	'4': 'Đã hủy',
	default: 'Không xác định'
};

export const DEFAULT_CANCEL_LOG_FILTERS = Object.freeze({
	page: 1,
	pageSize: DEFAULT_PAGE_SIZE,
	keyword: '',
	user: '',
	reasonCode: '',
	fromDate: null,
	toDate: null
});

const clamp = (value, min, max) => {
	const numeric = Number(value);
	if (Number.isNaN(numeric)) {
		return min;
	}
	if (numeric < min) {
		return min;
	}
	if (numeric > max) {
		return max;
	}
	return numeric;
};

const sanitizeString = (value, fallback = '') => {
	if (value === null || value === undefined) {
		return fallback;
	}
	const str = String(value).trim();
	return str || fallback;
};

const normalizeDate = (value, boundary = 'start') => {
	if (!value) {
		return null;
	}
	const instance = dayjs(value);
	if (!instance.isValid()) {
		return null;
	}
	const normalized = boundary === 'end' ? instance.endOf('second') : instance.startOf('second');
	return normalized.format('YYYY-MM-DD HH:mm:ss');
};

export const buildDefaultDateRange = () => {
	const end = dayjs();
	const start = end.subtract(DEFAULT_RANGE_DAYS, 'day');
	return [start.startOf('day'), end.endOf('day')];
};

export const normalizeCancelLogFilters = (filters = {}) => {
	const normalized = {
		...DEFAULT_CANCEL_LOG_FILTERS,
		...(filters || {})
	};

	normalized.page = clamp(normalized.page, 1, Number.MAX_SAFE_INTEGER);
	normalized.pageSize = clamp(normalized.pageSize, MIN_PAGE_SIZE, MAX_PAGE_SIZE);
	normalized.keyword = sanitizeString(filters.keyword ?? normalized.keyword);
	normalized.user = sanitizeString(filters.user ?? normalized.user);
	normalized.reasonCode = sanitizeString(filters.reasonCode ?? normalized.reasonCode);

	const rangeSource = Array.isArray(filters.dateRange)
		? filters.dateRange
		: [filters.fromDate ?? normalized.fromDate, filters.toDate ?? normalized.toDate];

	let fromDate = normalizeDate(rangeSource[0], 'start');
	let toDate = normalizeDate(rangeSource[1], 'end');

	if (!fromDate && !toDate) {
		const [defaultStart, defaultEnd] = buildDefaultDateRange();
		fromDate = normalizeDate(defaultStart, 'start');
		toDate = normalizeDate(defaultEnd, 'end');
	}

	if (fromDate && toDate && dayjs(fromDate).isAfter(dayjs(toDate))) {
		const tmp = fromDate;
		fromDate = toDate;
		toDate = tmp;
	}

	normalized.fromDate = fromDate;
	normalized.toDate = toDate;

	return normalized;
};

const mapStatusLabel = (status) => {
	const key = status === undefined || status === null ? '' : String(status);
	return INVOICE_STATUS_LABELS[key] || INVOICE_STATUS_LABELS.default;
};

export const normalizeCancelLogEntry = (entry = {}) => {
	const reasonMeta = entry.cancelReasonCode ? CANCEL_REASON_MAP[entry.cancelReasonCode] : null;
	return {
		id: Number(entry.id) || 0,
		invoiceId: entry.invoiceId || '',
		tableId: entry.tableId || '',
		customerName: entry.customerName || '',
		userId: entry.userId || '',
		timestamp: entry.timestamp || null,
		previousStatus: entry.previousStatus ?? '',
		previousStatusLabel: mapStatusLabel(entry.previousStatus),
		cancelReasonCode: entry.cancelReasonCode || '',
		cancelReasonLabel: entry.cancelReasonLabel || reasonMeta?.label || '',
		cancelReasonNote: entry.cancelReasonNote || '',
		cancelReasonGroup: reasonMeta?.groupTitle || null,
		cancelReasonColor: reasonMeta?.groupColor || 'default',
		rawDetails: entry.rawDetails || ''
	};
};

export const normalizeCancelLogResponse = (response = {}, fallbackFilters = DEFAULT_CANCEL_LOG_FILTERS) => {
	const normalizedData = Array.isArray(response.data)
		? response.data.map(normalizeCancelLogEntry)
		: [];

	return {
		success: Boolean(response.success),
		data: normalizedData,
		pagination: {
			page: Number(response.pagination?.page ?? fallbackFilters.page) || 1,
			pageSize: Number(response.pagination?.pageSize ?? fallbackFilters.pageSize) || DEFAULT_PAGE_SIZE,
			total: Number(response.pagination?.total ?? 0) || 0,
			totalPages: Number(response.pagination?.totalPages ?? 0) || 0
		},
		summary: {
			reasonBreakdown: response.summary?.reasonBreakdown || [],
			userBreakdown: response.summary?.userBreakdown || []
		},
		filters: response.filters || fallbackFilters,
		availableReasons: response.availableReasons || [],
		availableUsers: response.availableUsers || [],
		fetchedAt: dayjs().toISOString()
	};
};

export const fetchCancelLogs = async (filters = {}) => {
	const normalizedFilters = normalizeCancelLogFilters(filters);
	const payload = {
		page: normalizedFilters.page,
		pageSize: normalizedFilters.pageSize,
		keyword: normalizedFilters.keyword,
		user: normalizedFilters.user,
		reasonCode: normalizedFilters.reasonCode,
		fromDate: normalizedFilters.fromDate,
		toDate: normalizedFilters.toDate
	};

	const response = await callApi('CancelLogs', 'list', payload);
	return normalizeCancelLogResponse(response, normalizedFilters);
};
