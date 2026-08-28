import dayjs from 'dayjs';
import { callApi } from './apiServices';

const DATE_FORMAT = 'YYYY-MM-DD HH:mm:ss';
const DEFAULT_PAGE_SIZE = 50;
const MIN_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 200;
const DEFAULT_RANGE_DAYS = 7;

const VERB_COLOR_MAP = {
	delete: 'error',
	remove: 'error',
	huy: 'error',
	cancel: 'error',
	insert: 'success',
	add: 'success',
	update: 'processing',
	edit: 'processing',
	apr: 'gold',
	unapr: 'warning',
	approve: 'gold',
	deny: 'warning',
	login: 'geekblue',
	logout: 'purple',
	default: 'default'
};

const VERB_LABEL_MAP = {
	delete: 'Xoa du lieu',
	remove: 'Xoa du lieu',
	huy: 'Huy thao tac',
	cancel: 'Huy thao tac',
	insert: 'Them du lieu',
	add: 'Them du lieu',
	update: 'Cap nhat',
	edit: 'Cap nhat',
	apr: 'Duyet',
	unapr: 'Huy duyet',
	approve: 'Duyet',
	deny: 'Tu choi',
	login: 'Dang nhap',
	logout: 'Dang xuat',
	default: 'Hoat dong khac'
};

export const DEFAULT_LOG_FILTERS = Object.freeze({
	page: 1,
	pageSize: DEFAULT_PAGE_SIZE,
	keyword: '',
	action: '',
	user: '',
	fromDate: null,
	toDate: null
});

export const LOG_DATE_FORMAT = DATE_FORMAT;

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
	return normalized.format(DATE_FORMAT);
};

export const buildDefaultDateRange = () => {
	const end = dayjs();
	const start = end.subtract(DEFAULT_RANGE_DAYS, 'day');
	return [start.startOf('day'), end.endOf('day')];
};

export const normalizeLogFilters = (filters = {}) => {
	const normalized = {
		...DEFAULT_LOG_FILTERS,
		...(filters || {})
	};

	normalized.page = clamp(normalized.page, 1, Number.MAX_SAFE_INTEGER);
	normalized.pageSize = clamp(normalized.pageSize, MIN_PAGE_SIZE, MAX_PAGE_SIZE);
	normalized.keyword = sanitizeString(normalized.keyword);
	normalized.action = sanitizeString(normalized.action);
	normalized.user = sanitizeString(normalized.user);

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
		const temp = fromDate;
		fromDate = toDate;
		toDate = temp;
	}

	normalized.fromDate = fromDate;
	normalized.toDate = toDate;

	return normalized;
};

const mapVerbFromAction = (actionKey) => {
	if (!actionKey) {
		return '';
	}
	const parts = String(actionKey).split('.');
	if (parts.length <= 1) {
		return parts[0].toLowerCase();
	}
	return parts.pop().toLowerCase();
};

export const getVerbMeta = (verb) => {
	const key = (verb || '').toLowerCase();
	return {
		color: VERB_COLOR_MAP[key] || VERB_COLOR_MAP.default,
		label: VERB_LABEL_MAP[key] || VERB_LABEL_MAP.default
	};
};

export const normalizeSystemLogEntry = (entry = {}) => {
	const actionKey = entry.actionKey || entry.lv004 || '';
	const resource = entry.resource || (() => {
		const parts = actionKey.split('.');
		if (parts.length <= 1) {
			return actionKey;
		}
		parts.pop();
		return parts.join('.');
	})();
	const verb = entry.verb || mapVerbFromAction(actionKey);
	const details = entry.details ?? entry.lv005 ?? '';
	const previewSource = entry.detailsPreview ?? details ?? '';
	const detailsPreview = previewSource.length > 0 ? previewSource : details;

	return {
		id: Number(entry.id ?? entry.lv001) || 0,
		userId: entry.userId || entry.lv002 || '',
		timestamp: entry.timestamp || entry.lv003 || null,
		actionKey,
		resource,
		verb,
		details,
		detailsPreview,
		ip: entry.ip || entry.lv006 || '',
		device: entry.device || entry.lv007 || ''
	};
};

const uniqueList = (items = []) => Array.from(new Set(items.filter(Boolean)));

export const normalizeSystemLogResponse = (response = {}, fallbackFilters = DEFAULT_LOG_FILTERS) => {
	if (!response || typeof response !== 'object') {
		return {
			success: false,
			data: [],
			pagination: { ...fallbackFilters, total: 0, totalPages: 0 },
			summary: { actionBreakdown: [], userBreakdown: [], verbBreakdown: [] },
			filters: fallbackFilters,
			availableActions: [],
			availableUsers: []
		};
	}

	const normalizedData = Array.isArray(response.data)
		? response.data.map(normalizeSystemLogEntry)
		: [];

	const summary = {
		actionBreakdown: Array.isArray(response.summary?.actionBreakdown) ? response.summary.actionBreakdown : [],
		userBreakdown: Array.isArray(response.summary?.userBreakdown) ? response.summary.userBreakdown : [],
		verbBreakdown: Array.isArray(response.summary?.verbBreakdown) ? response.summary.verbBreakdown : []
	};

	const availableActions = uniqueList(summary.actionBreakdown.map((item) => item?.actionKey));
	const availableUsers = uniqueList(summary.userBreakdown.map((item) => item?.userId));

	return {
		success: Boolean(response.success),
		data: normalizedData,
		pagination: {
			page: Number(response.pagination?.page ?? fallbackFilters.page) || 1,
			pageSize: Number(response.pagination?.pageSize ?? fallbackFilters.pageSize) || DEFAULT_PAGE_SIZE,
			total: Number(response.pagination?.total ?? 0) || 0,
			totalPages: Number(response.pagination?.totalPages ?? 0) || 0
		},
		summary,
		filters: response.filters || fallbackFilters,
		availableActions,
		availableUsers,
		fetchedAt: dayjs().toISOString()
	};
};

export const fetchSystemLogs = async (filters = {}) => {
	const normalizedFilters = normalizeLogFilters(filters);
	const payload = {
		page: normalizedFilters.page,
		pageSize: normalizedFilters.pageSize,
		keyword: normalizedFilters.keyword,
		action: normalizedFilters.action,
		user: normalizedFilters.user,
		fromDate: normalizedFilters.fromDate,
		toDate: normalizedFilters.toDate
	};

	try {
		const response = await callApi('SystemLogs', 'list', payload);
		return normalizeSystemLogResponse(response, normalizedFilters);
	} catch (error) {
		console.error('[systemlog_api] Failed to fetch logs', error);
		throw error;
	}
};

export const buildLogExportPayload = (filters = {}) => {
	const normalized = normalizeLogFilters(filters);
	return {
		keyword: normalized.keyword,
		action: normalized.action,
		user: normalized.user,
		fromDate: normalized.fromDate,
		toDate: normalized.toDate
	};
};
