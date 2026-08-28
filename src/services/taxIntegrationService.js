import axios from 'axios';

const TAX_CONFIG_KEY = 'pmbh_tax_config_v1';
const TAX_TOKEN_CACHE_KEY = 'pmbh_tax_token_cache_v1';

const DEFAULT_INVOICE_DEFAULTS = Object.freeze({
  init_invoice: 'HDBHMTT',
  action: 'create',
  invoice_type: 0,
  name: 'HÓA ĐƠN BÁN HÀNG MÁY TÍNH TIỀN',
  serial: '2C25MPA',
  date_export: '',
  statement_no: '',
  statement_date: '',
  payment_type: 1,
  discount: 0,
  discount_amount: 0,
  currency: 'VND',
  vat_rate: 0,
  vat_amount: 0,
  autoSign: 0,
  returnXml: 0
});

const DEFAULT_CUSTOMER_DEFAULTS = Object.freeze({
  cus_name: 'CÔNG TY TNHH SOF',
  cus_buyer: 'CÔNG TY TNHH SOF',
  cus_tax_code: '0310690184',
  cus_budget_code: '',
  cus_address: '69/9 Đường D9, Phường Tây Thạnh, TP. Hồ Chí Minh',
  cus_phone: '09335439469',
  cus_citizen_identity: '',
  cus_passport: '',
  cus_email: 'vinhlq@sof.vn',
  cus_email_cc: '',
  cus_email_bcc: '',
  cus_bank_no: '01020304050607',
  cus_bank_name: 'TPBank Tân Bình'
});

const DEFAULT_TOKEN_BODY = Object.freeze({
  grant_type: 'client_credentials',
  scope: 'create-invoice',
  client_id: '',
  client_secret: ''
});

const DEFAULT_LOOKUP_CODE_PATHS = Object.freeze([
  'data.lookup_code',
  'data.lookupCode',
  'data.ma_tra_cuu',
  'data.maTraCuu',
  'result.lookup_code',
  'result.lookupCode',
  'result.ma_tra_cuu',
  'result.maTraCuu',
  'invoice.lookup_code',
  'invoice.lookupCode',
  'lookup_code',
  'lookupCode',
  'ma_tra_cuu',
  'maTraCuu',
  'reference.lookup_code',
  'reference.lookupCode'
]);

const LOOKUP_KEYWORDS = Object.freeze([
  'lookupcode',
  'lookup',
  'matracuu',
  'ma_tra_cuu',
  'tracuu',
  'searchcode',
  'referencecode'
]);

const DEFAULT_CONFIG = Object.freeze({
  enabled: false,
  apiBaseUrl: '',
  tokenEndpoint: '',
  invoiceEndpoint: '',
  createAction: 'create',
  updateAction: 'update',
  lookupCodeResponsePath: '',
  tokenBody: DEFAULT_TOKEN_BODY,
  tokenResponseAccessPath: 'access_token',
  tokenResponseExpiresPath: 'expires_in',
  tokenExpiresBufferSeconds: 30,
  invoiceDefaults: DEFAULT_INVOICE_DEFAULTS,
  customerDefaults: DEFAULT_CUSTOMER_DEFAULTS,
  sendAfterPayment: true,
  allowManualRetry: true,
  debugLogging: false
});

const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

function sanitizeString(value, fallback = '') {
  if (value === null || value === undefined) {
    return fallback;
  }
  const str = String(value).trim();
  return str ? str.replace(/\s+/g, ' ') : fallback;
}

function parseNumber(value, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }

  if (typeof value === 'string') {
    const normalized = value.replace(/[^0-9\-+.]/g, '');
    if (!normalized) {
      return fallback;
    }
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  if (value === null || value === undefined) {
    return fallback;
  }

  const coerced = Number(value);
  return Number.isFinite(coerced) ? coerced : fallback;
}

function parseInteger(value, fallback = 0) {
  const parsed = parseNumber(value, fallback);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  const rounded = Math.round(parsed);
  return Number.isFinite(rounded) ? rounded : fallback;
}

function formatDateInput(input) {
  const date = input ? new Date(input) : new Date();
  if (Number.isNaN(date.getTime())) {
    return formatDateInput(new Date());
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getFirstNonEmptyString(source, keys = [], fallback = '') {
  if (!source || typeof source !== 'object') {
    return fallback;
  }

  for (const candidate of keys) {
    const value = resolvePath(source, candidate);
    if (value === undefined || value === null) {
      continue;
    }
    const sanitized = sanitizeString(value, '');
    if (sanitized) {
      return sanitized;
    }
  }

  return fallback;
}

function clampNumber(value, min = 0) {
  const parsed = parseNumber(value, min);
  if (!Number.isFinite(parsed)) {
    return min;
  }
  return parsed < min ? min : parsed;
}

function deepMerge(target, source) {
  const output = { ...target };

  Object.keys(source || {}).forEach((key) => {
    const sourceValue = source[key];
    const targetValue = target[key];

    if (Array.isArray(sourceValue)) {
      output[key] = Array.isArray(targetValue) ? sourceValue.slice() : sourceValue.slice();
    } else if (sourceValue && typeof sourceValue === 'object') {
      output[key] = deepMerge(
        typeof targetValue === 'object' && targetValue !== null ? targetValue : {},
        sourceValue
      );
    } else {
      output[key] = sourceValue;
    }
  });

  return output;
}

export function getDefaultTaxConfig() {
  return deepMerge({}, DEFAULT_CONFIG);
}

export function loadTaxConfig() {
  if (!isBrowser) {
    return getDefaultTaxConfig();
  }

  try {
    const raw = window.localStorage.getItem(TAX_CONFIG_KEY);
    if (!raw) {
      return getDefaultTaxConfig();
    }

    const parsed = JSON.parse(raw);
    return normalizeTaxConfig(parsed);
  } catch (error) {
    console.error('[taxIntegration] Failed to load tax config:', error);
    return getDefaultTaxConfig();
  }
}

export function saveTaxConfig(config) {
  if (!isBrowser) {
    return normalizeTaxConfig(config);
  }

  try {
    const normalized = normalizeTaxConfig(config);
    window.localStorage.setItem(TAX_CONFIG_KEY, JSON.stringify(normalized));

    // Clear cached token if integration disabled or base endpoints changed
    if (!normalized.enabled) {
      clearCachedTaxToken();
    }

    return normalized;
  } catch (error) {
    console.error('[taxIntegration] Failed to save tax config:', error);
    throw error;
  }
}

export function normalizeTaxConfig(config) {
  const merged = deepMerge(getDefaultTaxConfig(), config || {});
  merged.invoiceDefaults = deepMerge(DEFAULT_INVOICE_DEFAULTS, config?.invoiceDefaults || {});
  merged.customerDefaults = deepMerge(DEFAULT_CUSTOMER_DEFAULTS, config?.customerDefaults || {});
  const userTokenBody = typeof config?.tokenBody === 'object' && config?.tokenBody !== null
    ? { ...config.tokenBody }
    : {};
  merged.tokenBody = { ...DEFAULT_TOKEN_BODY, ...userTokenBody };

  return merged;
}

export function clearTaxIntegrationConfig() {
  if (!isBrowser) {
    return;
  }

  window.localStorage.removeItem(TAX_CONFIG_KEY);
  clearCachedTaxToken();
}

export function buildEndpoint(apiBaseUrl, endpoint) {
  if (!endpoint) {
    return '';
  }

  const trimmedEndpoint = endpoint.trim();
  if (/^https?:\/\//i.test(trimmedEndpoint)) {
    return trimmedEndpoint;
  }

  const base = (apiBaseUrl || '').trim().replace(/\/+$/, '');
  const path = trimmedEndpoint.replace(/^\/+/, '');
  if (!base) {
    return `/${path}`;
  }

  return `${base}/${path}`;
}

export function getCachedTaxToken() {
  if (!isBrowser) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(TAX_TOKEN_CACHE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (!parsed?.accessToken) {
      return null;
    }

    if (parsed.expiresAt && Date.now() >= parsed.expiresAt) {
      clearCachedTaxToken();
      return null;
    }

    return parsed;
  } catch (error) {
    console.error('[taxIntegration] Failed to parse cached token:', error);
    return null;
  }
}

export function cacheTaxToken(tokenData, config) {
  if (!isBrowser) {
    return;
  }

  try {
    const bufferSeconds = Number(config?.tokenExpiresBufferSeconds) || DEFAULT_CONFIG.tokenExpiresBufferSeconds;
    const expiresIn = Number(tokenData.expires_in || tokenData.expiresIn || 0);
    const expiresAt = expiresIn > 0 ? Date.now() + (expiresIn - bufferSeconds) * 1000 : null;

    const payload = {
      accessToken: tokenData.access_token || tokenData.accessToken || tokenData.token,
      raw: tokenData,
      expiresAt
    };

    window.localStorage.setItem(TAX_TOKEN_CACHE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.error('[taxIntegration] Failed to cache token:', error);
  }
}

export function clearCachedTaxToken() {
  if (!isBrowser) {
    return;
  }
  window.localStorage.removeItem(TAX_TOKEN_CACHE_KEY);
}

function resolvePath(obj, path) {
  if (!path) {
    return undefined;
  }

  return path.split('.').reduce((acc, key) => {
    if (acc && typeof acc === 'object') {
      return acc[key];
    }
    return undefined;
  }, obj);
}

export async function requestTaxAccessToken(config) {
  const normalized = normalizeTaxConfig(config);
  if (!normalized.enabled) {
    throw new Error('Tax integration is not enabled.');
  }

  const endpoint = buildEndpoint(normalized.apiBaseUrl, normalized.tokenEndpoint);
  if (!endpoint) {
    throw new Error('Token endpoint is not configured.');
  }

  const params = new URLSearchParams();
  const tokenBodyEntries = Object.entries(normalized.tokenBody || {});

  const getTrimmedValue = (value) => {
    if (value === undefined || value === null) {
      return '';
    }
    const str = String(value).trim();
    return str;
  };

  tokenBodyEntries.forEach(([key, value]) => {
    const trimmed = getTrimmedValue(value);
    if (trimmed !== '') {
      params.append(key, trimmed);
    }
  });

  const requiredOauthFields = ['client_id', 'client_secret'];
  requiredOauthFields.forEach((field) => {
    const current = getTrimmedValue(normalized.tokenBody?.[field]);
    if (!current) {
      throw new Error(`Missing required token field: ${field}`);
    }
  });

  if (!params.has('grant_type')) {
    params.append('grant_type', DEFAULT_TOKEN_BODY.grant_type);
  }

  if (!params.has('scope') && DEFAULT_TOKEN_BODY.scope) {
    params.append('scope', DEFAULT_TOKEN_BODY.scope);
  }

  const response = await axios.post(endpoint, params.toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });

  const accessToken = resolvePath(response.data, normalized.tokenResponseAccessPath);
  if (!accessToken) {
    throw new Error('Token response does not contain an access token.');
  }

  const expiresIn = resolvePath(response.data, normalized.tokenResponseExpiresPath);
  const tokenData = {
    access_token: accessToken,
    expires_in: expiresIn,
    raw: response.data
  };

  cacheTaxToken(tokenData, normalized);
  return tokenData;
}

export async function ensureTaxAccessToken(config, forceRefresh = false) {
  if (!forceRefresh) {
    const cached = getCachedTaxToken();
    if (cached?.accessToken) {
      return cached.accessToken;
    }
  }

  const tokenData = await requestTaxAccessToken(config);
  return tokenData.access_token || tokenData.accessToken || tokenData.token;
}

function coerceLookupValue(value) {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return sanitizeString(String(value), '');
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const candidate = coerceLookupValue(item);
      if (candidate) {
        return candidate;
      }
    }
  }
  return '';
}

function findLookupCodeDeep(source, depth = 0, maxDepth = 6) {
  if (!source || typeof source !== 'object' || depth > maxDepth) {
    return '';
  }

  for (const [key, value] of Object.entries(source)) {
    const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    const isLookupKey = LOOKUP_KEYWORDS.some((keyword) => normalizedKey.includes(keyword));

    if (isLookupKey) {
      const candidate = coerceLookupValue(value);
      if (candidate) {
        return candidate;
      }
    }

    if (value && typeof value === 'object') {
      const nested = findLookupCodeDeep(value, depth + 1, maxDepth);
      if (nested) {
        return nested;
      }
    }
  }

  return '';
}

export async function submitInvoiceToTaxPortal(invoicePayload, config, mode = 'create') {
  const normalized = normalizeTaxConfig(config);
  if (!normalized.enabled) {
    return {
      success: false,
      skipped: true,
      reason: 'Integration disabled'
    };
  }

  const endpoint = buildEndpoint(normalized.apiBaseUrl, normalized.invoiceEndpoint);
  if (!endpoint) {
    throw new Error('Invoice endpoint is not configured.');
  }

  const action = mode === 'update' ? normalized.updateAction : normalized.createAction;
  const payload = {
    ...normalized.invoiceDefaults,
    ...(invoicePayload || {}),
    action
  };

  const token = await ensureTaxAccessToken(normalized);
  if (!token) {
    throw new Error('Unable to obtain access token for tax API.');
  }

  const response = await axios.post(endpoint, payload, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  return {
    success: true,
    data: response.data
  };
}

export function extractTaxLookupCode(responseData, config) {
  if (!responseData) {
    return '';
  }

  const normalized = normalizeTaxConfig(config || loadTaxConfig());
  const candidatePaths = [];

  if (normalized.lookupCodeResponsePath) {
    candidatePaths.push(normalized.lookupCodeResponsePath);
  }
  candidatePaths.push(...DEFAULT_LOOKUP_CODE_PATHS);

  for (const path of candidatePaths) {
    const value = resolvePath(responseData, path);
    const candidate = coerceLookupValue(value);
    if (candidate) {
      return candidate;
    }
  }

  if (Array.isArray(responseData)) {
    for (const item of responseData) {
      const nestedCandidate = extractTaxLookupCode(item, normalized);
      if (nestedCandidate) {
        return nestedCandidate;
      }
    }
    return '';
  }

  if (typeof responseData === 'object') {
    const deepCandidate = findLookupCodeDeep(responseData);
    if (deepCandidate) {
      return deepCandidate;
    }
  }

  return coerceLookupValue(responseData);
}

export function prepareInvoicePayload(context = {}, config) {
  const normalizedConfig = normalizeTaxConfig(config || loadTaxConfig());
  const invoice = context?.invoice || {};
  const rawItems = Array.isArray(context?.invoiceDetails) ? context.invoiceDetails : [];

  const processedItems = rawItems
    .map((item, index) => {
      const quantity = Math.max(
        parseInteger(item?.sl ?? item?.soLuong ?? item?.quantity ?? item?.qty, 0),
        0
      );
      const unitPrice = clampNumber(
        item?.gia ??
        item?.giaBan ??
        item?.donGia ??
        item?.price ??
        item?.giaBanLe ??
        item?.unitPrice,
        0
      );

      const subtotal = quantity * unitPrice;
      if (quantity <= 0 || unitPrice <= 0 || subtotal <= 0) {
        return null;
      }

      const code = getFirstNonEmptyString(
        item,
        [
          'maSp',
          'maSP',
          'ma_sp',
          'maHang',
          'maHangHoa',
          'ma',
          'id',
          'idSp',
          'productId',
          'code',
          'maCt',
          'lv001'
        ],
        `ITEM_${index + 1}`
      );

      const name = getFirstNonEmptyString(
        item,
        ['tenSp', 'ten', 'tensp', 'name', 'productName', 'lv002'],
        `Mặt hàng ${index + 1}`
      );

      const unit = getFirstNonEmptyString(
        item,
        ['donVi', 'dvt', 'dvTinh', 'donViTinh', 'unit', 'unitName', 'measure'],
        'cai'
      );

      return {
        code,
        name,
        unit,
        quantity,
        unitPrice,
        rawSubtotal: subtotal,
        index: index + 1
      };
    })
    .filter(Boolean);

  if (processedItems.length === 0) {
    return null;
  }

  const subtotal = processedItems.reduce((sum, item) => sum + item.rawSubtotal, 0);
  if (subtotal <= 0) {
    return null;
  }

  let recordedTax = clampNumber(context?.invoiceSummary?.tax ?? 0, 0);
  let finalAmount = clampNumber(
    context?.paymentData?.finalTotal ??
    context?.invoiceSummary?.total ??
    subtotal,
    0
  );

  if (finalAmount <= 0) {
    finalAmount = subtotal;
  }

  if (recordedTax > finalAmount) {
    recordedTax = 0;
  }

  let baseAfterDiscount = Math.max(finalAmount - recordedTax, 0);
  if (baseAfterDiscount > subtotal) {
    baseAfterDiscount = subtotal;
    recordedTax = Math.max(finalAmount - baseAfterDiscount, 0);
  }

  const discountTotal = Math.max(subtotal - baseAfterDiscount, 0);
  const taxRate = baseAfterDiscount > 0 ? recordedTax / baseAfterDiscount : 0;

  let accumulatedBase = 0;
  let accumulatedTax = 0;
  let accumulatedDiscount = 0;

  const vatSumTarget = Math.round(recordedTax);
  const baseSumTarget = Math.round(baseAfterDiscount);
  const discountSumTarget = Math.round(discountTotal);

  const details = processedItems.map((item, index) => {
    const proportion = item.rawSubtotal / subtotal;
    const discountShare = discountTotal * proportion;
    const baseValue = Math.max(item.rawSubtotal - discountShare, 0);
    const taxValue = taxRate > 0 ? baseValue * taxRate : 0;

    let roundedBase = Math.round(baseValue);
    let roundedTax = Math.round(taxValue);
    let roundedDiscount = Math.round(discountShare);

    if (index === processedItems.length - 1) {
      roundedBase += baseSumTarget - (accumulatedBase + roundedBase);
      roundedTax += vatSumTarget - (accumulatedTax + roundedTax);
      roundedDiscount += discountSumTarget - (accumulatedDiscount + roundedDiscount);
    }

    if (roundedBase < 0) {
      roundedBase = 0;
    }
    if (roundedTax < 0) {
      roundedTax = 0;
    }
    if (roundedDiscount < 0) {
      roundedDiscount = 0;
    }

    accumulatedBase += roundedBase;
    accumulatedTax += roundedTax;
    accumulatedDiscount += roundedDiscount;

    const discountPercent = item.rawSubtotal > 0
      ? Number(((roundedDiscount / item.rawSubtotal) * 100).toFixed(2))
      : 0;

    let detailVatRate = Math.round(taxRate * 100);
    const supportedVatRates = [0, 5, 8, 10];
    if (!supportedVatRates.includes(detailVatRate)) {
      const fallbackRate = parseInteger(normalizedConfig.invoiceDefaults?.vat_rate, 0);
      const initialRate = supportedVatRates.includes(fallbackRate) ? fallbackRate : supportedVatRates[0];
      detailVatRate = supportedVatRates.reduce((closest, candidate) => {
        return Math.abs(candidate - detailVatRate) < Math.abs(closest - detailVatRate) ? candidate : closest;
      }, initialRate);
    }

    const detailAmount = Math.max(roundedBase + roundedTax, 0);

    return {
      num: item.index,
      code: item.code,
      name: item.name,
      unit: item.unit,
      quantity: item.quantity,
      price: Math.round(item.unitPrice),
      detailTotal: roundedBase,
      detailVatRate: detailVatRate,
      detailVatAmount: roundedTax,
      detailAmount,
      detailDiscount: discountPercent,
      detailDiscountAmount: roundedDiscount,
      feature: 1,
      featureDetail: []
    };
  });

  const paymentDate = context?.paymentData?.ngayThanhToan || new Date();
  const statementNo = sanitizeString(
    invoice?.maHd ??
    context?.paymentData?.maHd ??
    invoice?.invoiceNumber ??
    ''
  );

  const customerDefaults = normalizedConfig.customerDefaults || DEFAULT_CUSTOMER_DEFAULTS;
  const loyalty = context?.loyaltyCustomer || {};
  const loyaltyRaw = loyalty?.raw || {};

  const customerPayload = {
    ...customerDefaults
  };

  const loyaltyName = sanitizeString(loyalty?.name || loyaltyRaw?.name || loyaltyRaw?.fullName || '', '');
  if (loyaltyName) {
    customerPayload.cus_name = loyaltyName;
    customerPayload.cus_buyer = loyaltyName;
  }

  const loyaltyPhone = sanitizeString(loyalty?.phone || getFirstNonEmptyString(loyaltyRaw, ['phone', 'soDienThoai', 'sdt', 'dienThoai', 'tel'], ''), '');
  if (loyaltyPhone) {
    customerPayload.cus_phone = loyaltyPhone;
  }

  const loyaltyEmail = getFirstNonEmptyString(loyaltyRaw, ['email', 'mail'], '');
  if (loyaltyEmail) {
    customerPayload.cus_email = loyaltyEmail;
  }

  const loyaltyTaxCode = getFirstNonEmptyString(loyaltyRaw, ['taxCode', 'maSoThue', 'mst', 'tax_code'], '');
  if (loyaltyTaxCode) {
    customerPayload.cus_tax_code = loyaltyTaxCode;
  }

  const loyaltyAddress = getFirstNonEmptyString(
    loyaltyRaw,
    ['address', 'diaChi', 'diachi', 'diaChiKhach', 'diaChiGiaoHang'],
    ''
  );
  if (loyaltyAddress) {
    customerPayload.cus_address = loyaltyAddress;
  }

  const vatRateTop = details.length > 0 ? details[0].detailVatRate : parseInteger(normalizedConfig.invoiceDefaults?.vat_rate, 0);
  const finalVatAmount = Math.max(vatSumTarget, 0);
  const finalBaseAmount = Math.max(baseSumTarget, 0);
  const finalDiscountAmount = Math.max(discountSumTarget, 0);
  const finalTotalAmount = Math.max(finalBaseAmount + finalVatAmount, 0);
  const currency = sanitizeString(normalizedConfig.invoiceDefaults?.currency, 'VND') || 'VND';
  const hasDiscount = finalDiscountAmount > 0 ? 1 : 0;

  return {
    date_export: formatDateInput(paymentDate),
    statement_no: statementNo || undefined,
    statement_date: formatDateInput(paymentDate),
    discount: hasDiscount,
    discount_amount: finalDiscountAmount,
    vat_rate: vatRateTop,
    vat_amount: finalVatAmount,
    total: finalBaseAmount,
    amount: finalTotalAmount,
    currency,
    amount_in_words: '',
    detail: details,
    customer: customerPayload
  };
}

export function mapFormValuesToConfig(values) {
  const {
    tokenFields = [],
    customerDefaults = {},
    invoiceDefaults = {},
    ...rest
  } = values || {};

  const tokenBody = Array.isArray(tokenFields)
    ? tokenFields.reduce((acc, item) => {
        if (item && item.key) {
          acc[item.key] = item.value ?? '';
        }
        return acc;
      }, {})
    : {};

  return normalizeTaxConfig({
    ...rest,
    tokenBody,
    customerDefaults,
    invoiceDefaults
  });
}

export function mapConfigToFormValues(config) {
  const normalized = normalizeTaxConfig(config);
  const tokenFields = Object.entries(normalized.tokenBody || {}).map(([key, value]) => ({
    key,
    value
  }));

  return {
    ...normalized,
    tokenFields,
    invoiceDefaults: normalized.invoiceDefaults,
    customerDefaults: normalized.customerDefaults
  };
}

export function shouldSendInvoice(config) {
  if (!config?.enabled) {
    return false;
  }
  return config.sendAfterPayment !== false;
}

