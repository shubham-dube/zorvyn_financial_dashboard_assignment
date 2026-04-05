export const CONSTANTS = {
  // JWT
  JWT: {
    ACCESS_TOKEN_EXPIRES_IN: '15m',
    REFRESH_TOKEN_EXPIRES_IN: '7d',
    ACCESS_TOKEN_EXPIRES_IN_SECONDS: 15 * 60, // 15 minutes
    REFRESH_TOKEN_EXPIRES_IN_SECONDS: 7 * 24 * 60 * 60, // 7 days
  },

  // Argon2
  ARGON2: {
    MEMORY_COST: 65536,
    TIME_COST: 3,
    PARALLELISM: 1,
  },

  // Cache TTL (in seconds)
  CACHE_PREFIX: {
    CATEGORY_LIST: 'categories:list',
    DASHBOARD: 'dashboard',
  },

  CACHE_TTL: {
    CATEGORIES: 60 * 60, // 1 hour
    CATEGORY_LIST: 60 * 60, // 1 hour (compat alias)
    DASHBOARD: 5 * 60, // 5 minutes
  },

  // Rate Limiting
  RATE_LIMIT: {
    AUTH_REGISTER: { max: 3, window: 60 * 60 }, // 3 per hour
    AUTH_LOGIN: { max: 5, window: 15 * 60 }, // 5 per 15 minutes
    AUTH_REFRESH: { max: 10, window: 15 * 60 }, // 10 per 15 minutes
    DEFAULT: { max: 1000, window: 15 * 60 }, // 1000 per 15 minutes
  },

  // Legacy alias used by route modules
  RATE_LIMITS: {
    AUTH_REGISTER: { max: 3, window: 60 * 60 },
    AUTH_LOGIN: { max: 5, window: 15 * 60 },
    AUTH_REFRESH: { max: 10, window: 15 * 60 },
    DEFAULT: { max: 1000, window: 15 * 60 },
  },

  // Pagination
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
  },

  // Business Rules
  BUSINESS_RULES: {
    MAX_FUTURE_DAYS: 365, // Records can't be more than 1 year in future
    MIN_AMOUNT: 0.01,
    MAX_AMOUNT: 999999999.99,
    PASSWORD_MIN_LENGTH: 8,
    NOTES_MAX_LENGTH: 1000,
  },

  // Backward-compatible flat keys used by existing schemas/services
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  MAX_USER_NAME_LENGTH: 100,
  MAX_CATEGORY_NAME_LENGTH: 100,
  MIN_PASSWORD_LENGTH: 8,
  MAX_PASSWORD_LENGTH: 128,
  MAX_AMOUNT: 999999999.99,
  MAX_FUTURE_DAYS: 365,
  MAX_NOTES_LENGTH: 1000,

  // Redis token key prefixes
  REFRESH_TOKEN_PREFIX: 'auth:refresh',
  BLOCKLIST_PREFIX: 'auth:blocklist',

  // Audit Actions
  AUDIT_ACTIONS: {
    // Auth
    USER_REGISTERED: 'user.registered',
    USER_LOGGED_IN: 'user.logged_in',
    USER_LOGGED_OUT: 'user.logged_out',
    USER_LOGIN: 'user.logged_in',
    USER_LOGOUT: 'user.logged_out',
    USER_LOGIN_FAILED: 'user.login_failed',
    TOKEN_REFRESHED: 'token.refreshed',

    // User Management
    USER_UPDATED: 'user.updated',
    USER_ROLE_CHANGED: 'user.role_changed',
    USER_DEACTIVATED: 'user.deactivated',
    USER_STATUS_CHANGED: 'user.status_changed',
    USER_PASSWORD_CHANGED: 'user.password_changed',

    // Categories
    CATEGORY_CREATED: 'category.created',
    CATEGORY_UPDATED: 'category.updated',
    CATEGORY_DELETED: 'category.deleted',

    // Financial Records
    RECORD_CREATED: 'record.created',
    RECORD_UPDATED: 'record.updated',
    RECORD_DELETED: 'record.deleted',
    RECORD_RESTORED: 'record.restored',
  },
} as const;
