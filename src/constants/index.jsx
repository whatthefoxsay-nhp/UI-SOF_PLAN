// Constants cho ứng dụng PMBH Cafe POS

// API endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    PROFILE: '/auth/profile',
  },
  PRODUCTS: {
    LIST: '/products',
    CREATE: '/products',
    UPDATE: '/products',
    DELETE: '/products',
    CATEGORIES: '/products/categories',
  },
  TABLES: {
    LIST: '/tables',
    CREATE: '/tables',
    UPDATE: '/tables',
    DELETE: '/tables',
    STATUS: '/tables/status',
  },
  ORDERS: {
    LIST: '/orders',
    CREATE: '/orders',
    UPDATE: '/orders',
    DELETE: '/orders',
    DETAIL: '/orders',
  },
  CUSTOMERS: {
    LIST: '/customers',
    CREATE: '/customers',
    UPDATE: '/customers',
    DELETE: '/customers',
  },
  EMPLOYEES: {
    LIST: '/employees',
    CREATE: '/employees',
    UPDATE: '/employees',
    DELETE: '/employees',
  },
  REPORTS: {
    REVENUE: '/reports/revenue',
    SALES: '/reports/sales',
    PRODUCTS: '/reports/products',
    CUSTOMERS: '/reports/customers',
  },
};

// Trạng thái bàn
export const TABLE_STATUS = {
  AVAILABLE: 'available',
  OCCUPIED: 'occupied',
  RESERVED: 'reserved',
  MAINTENANCE: 'maintenance',
};

export const TABLE_STATUS_LABELS = {
  [TABLE_STATUS.AVAILABLE]: 'Trống',
  [TABLE_STATUS.OCCUPIED]: 'Có khách',
  [TABLE_STATUS.RESERVED]: 'Đã đặt',
  [TABLE_STATUS.MAINTENANCE]: 'Bảo trì',
};

export const TABLE_STATUS_COLORS = {
  [TABLE_STATUS.AVAILABLE]: 'success',
  [TABLE_STATUS.OCCUPIED]: 'error',
  [TABLE_STATUS.RESERVED]: 'warning',
  [TABLE_STATUS.MAINTENANCE]: 'default',
};

// Trạng thái đơn hàng
export const ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PREPARING: 'preparing',
  READY: 'ready',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

export const ORDER_STATUS_LABELS = {
  [ORDER_STATUS.PENDING]: 'Chờ xác nhận',
  [ORDER_STATUS.CONFIRMED]: 'Đã xác nhận',
  [ORDER_STATUS.PREPARING]: 'Đang chuẩn bị',
  [ORDER_STATUS.READY]: 'Sẵn sàng',
  [ORDER_STATUS.COMPLETED]: 'Hoàn thành',
  [ORDER_STATUS.CANCELLED]: 'Đã hủy',
};

export const ORDER_STATUS_COLORS = {
  [ORDER_STATUS.PENDING]: 'default',
  [ORDER_STATUS.CONFIRMED]: 'processing',
  [ORDER_STATUS.PREPARING]: 'warning',
  [ORDER_STATUS.READY]: 'success',
  [ORDER_STATUS.COMPLETED]: 'success',
  [ORDER_STATUS.CANCELLED]: 'error',
};

// Phương thức thanh toán
export const PAYMENT_METHODS = {
  CASH: 'cash',
  CARD: 'card',
  TRANSFER: 'transfer',
  EWALLET: 'ewallet',
};

export const PAYMENT_METHOD_LABELS = {
  [PAYMENT_METHODS.CASH]: 'Tiền mặt',
  [PAYMENT_METHODS.CARD]: 'Thẻ',
  [PAYMENT_METHODS.TRANSFER]: 'Chuyển khoản',
  [PAYMENT_METHODS.EWALLET]: 'Ví điện tử',
};

// Danh mục sản phẩm
export const PRODUCT_CATEGORIES = {
  COFFEE: 'coffee',
  TEA: 'tea',
  JUICE: 'juice',
  CAKE: 'cake',
  SNACK: 'snack',
  OTHER: 'other',
};

export const PRODUCT_CATEGORY_LABELS = {
  [PRODUCT_CATEGORIES.COFFEE]: 'Cà phê',
  [PRODUCT_CATEGORIES.TEA]: 'Trà',
  [PRODUCT_CATEGORIES.JUICE]: 'Nước ép',
  [PRODUCT_CATEGORIES.CAKE]: 'Bánh ngọt',
  [PRODUCT_CATEGORIES.SNACK]: 'Đồ ăn nhẹ',
  [PRODUCT_CATEGORIES.OTHER]: 'Khác',
};

// Vai trò người dùng
export const USER_ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  CASHIER: 'cashier',
  WAITER: 'waiter',
  KITCHEN: 'kitchen',
};

export const USER_ROLE_LABELS = {
  [USER_ROLES.ADMIN]: 'Quản trị viên',
  [USER_ROLES.MANAGER]: 'Quản lý',
  [USER_ROLES.CASHIER]: 'Thu ngân',
  [USER_ROLES.WAITER]: 'Phục vụ',
  [USER_ROLES.KITCHEN]: 'Bếp',
};

// Khu vực bàn
export const TABLE_AREAS = [
  { value: 'tang-1', label: 'Tầng 1' },
  { value: 'tang-2', label: 'Tầng 2' },
  { value: 'san-vuon', label: 'Sân vườn' },
  { value: 'vip', label: 'Phòng VIP' },
  { value: 'ngoai-troi', label: 'Ngoài trời' },
];

// Số ghế bàn
export const TABLE_SEAT_OPTIONS = [
  { value: 2, label: '2 ghế' },
  { value: 4, label: '4 ghế' },
  { value: 6, label: '6 ghế' },
  { value: 8, label: '8 ghế' },
  { value: 10, label: '10 ghế' },
  { value: 12, label: '12 ghế' },
];

// Đường dẫn hình ảnh mặc định
export const DEFAULT_IMAGES = {
  PRODUCT: '../assets/Img/cafe.png',
  USER_AVATAR: '/images/default-avatar.png',
  CATEGORY: '/images/default-category.jpg',
  NO_IMAGE: '/images/no-image.svg'
};

// Placeholder cấu hình
export const PLACEHOLDER_CONFIG = {
  PRODUCT_IMAGE: {
    SIZE: {
      SMALL: 40,
      MEDIUM: 60,
      LARGE: 80,
      XLARGE: 120
    },
    SHAPE: {
      CIRCLE: 'circle',
      SQUARE: 'square',
      ROUNDED: 'rounded'
    },
    VARIANT: {
      GRADIENT: 'gradient',
      SOLID: 'solid',
      OUTLINED: 'outlined'
    }
  }
};

// Đơn vị tiền tệ
export const CURRENCY = 'VND';
export const CURRENCY_SYMBOL = 'đ';

// Pagination mặc định
export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = ['10', '20', '50', '100'];

// Thời gian timeout
export const REQUEST_TIMEOUT = 30000; // 30 seconds
export const TOKEN_REFRESH_THRESHOLD = 300000; // 5 minutes

// Local storage keys
export const STORAGE_KEYS = {
  USER: 'pmbh_user',
  TOKEN: 'pmbh_token',
  REFRESH_TOKEN: 'pmbh_refresh_token',
  CART: 'pmbh_cart',
  SELECTED_TABLE: 'pmbh_selected_table',
  ORDERS: 'pmbh_orders',
  SETTINGS: 'pmbh_settings',
  THEME: 'pmbh_theme',
};

// Regex patterns
export const PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^(\+84|84|0[3|5|7|8|9])[0-9]{8}$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
  NUMBER_ONLY: /^\d+$/,
  VIETNAMESE_NAME: /^[a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂÁÀẢẠÂẤẦẨẬĂẮẰẲẶÉÈẺẸÊẾỀỂỆÍÌỈỊÓÒỎỌÔỐỒỔỘƠỚỜỞỢÚÙỦỤƯỨỪỬỰÝỲỶỴÑñĐđ\s]+$/,
};

// Thông báo mặc định
export const MESSAGES = {
  SUCCESS: {
    SAVE: 'Lưu thành công!',
    UPDATE: 'Cập nhật thành công!',
    DELETE: 'Xóa thành công!',
    LOGIN: 'Đăng nhập thành công!',
    LOGOUT: 'Đăng xuất thành công!',
  },
  ERROR: {
    GENERAL: 'Đã xảy ra lỗi, vui lòng thử lại!',
    NETWORK: 'Lỗi kết nối mạng!',
    UNAUTHORIZED: 'Bạn không có quyền truy cập!',
    NOT_FOUND: 'Không tìm thấy dữ liệu!',
    VALIDATION: 'Dữ liệu không hợp lệ!',
  },
  CONFIRM: {
    DELETE: 'Bạn có chắc chắn muốn xóa?',
    LOGOUT: 'Bạn có chắc chắn muốn đăng xuất?',
    CANCEL_ORDER: 'Bạn có chắc chắn muốn hủy đơn hàng?',
  },
};

// Cấu hình biểu đồ
export const CHART_COLORS = [
  '#1890ff',
  '#52c41a',
  '#faad14',
  '#f5222d',
  '#722ed1',
  '#fa8c16',
  '#13c2c2',
  '#eb2f96',
  '#fa541c',
  '#a0d911',
];

// File upload
export const UPLOAD_CONFIG = {
  MAX_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
};

// Date formats
export const DATE_FORMATS = {
  DEFAULT: 'DD/MM/YYYY',
  WITH_TIME: 'DD/MM/YYYY HH:mm',
  WITH_SECONDS: 'DD/MM/YYYY HH:mm:ss',
  TIME_ONLY: 'HH:mm',
  TIME_WITH_SECONDS: 'HH:mm:ss',
  MONTH_YEAR: 'MM/YYYY',
  YEAR_ONLY: 'YYYY',
};

// Print settings
export const PRINT_SETTINGS = {
  RECEIPT_WIDTH: '80mm',
  FONT_SIZE: '12px',
  LINE_HEIGHT: '1.4',
  MARGIN: '10mm',
};
