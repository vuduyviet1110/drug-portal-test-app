/** Logger interface for SDK structured logging */
interface Logger {
    debug(message: string, meta?: Record<string, unknown>): void;
    info(message: string, meta?: Record<string, unknown>): void;
    warn(message: string, meta?: Record<string, unknown>): void;
    error(message: string, meta?: Record<string, unknown>): void;
}
/** Built-in structured logger that outputs JSON lines */
declare class StructuredLogger implements Logger {
    private readonly prefix;
    private readonly delegate?;
    constructor(prefix: string, delegate?: Logger);
    debug(message: string, meta?: Record<string, unknown>): void;
    info(message: string, meta?: Record<string, unknown>): void;
    warn(message: string, meta?: Record<string, unknown>): void;
    error(message: string, meta?: Record<string, unknown>): void;
    private write;
}

/** Retry configuration options */
interface RetryOptions {
    /** Maximum number of retry attempts (default: 3) */
    maxRetries?: number;
    /** Base delay in milliseconds between retries (default: 5000) */
    baseDelayMs?: number;
    /** Maximum delay cap in milliseconds (default: 30000) */
    maxDelayMs?: number;
    /** HTTP timeout in milliseconds (default: 30000) */
    timeoutMs?: number;
}

/**
 * Authentication provider interface.
 * Each portal (CSDL Dược, QĐ 228) implements this to inject its own auth headers.
 */
interface AuthProvider {
    /** Return headers to inject into every request */
    getAuthHeaders(traceId?: string): Promise<Record<string, string>>;
    /** Called after receiving a 401 — may clear cached token. Returns true if retry allowed. */
    onUnauthorized(traceId?: string): Promise<boolean>;
}
/** SDK-wide error type */
declare class DrugPortalError extends Error {
    readonly status?: number;
    readonly traceId: string;
    readonly responseBody?: string;
    readonly data?: unknown;
    constructor(message: string, opts: {
        status?: number;
        traceId: string;
        responseBody?: string;
        data?: unknown;
    });
}
interface HttpClientOptions {
    baseUrl: string;
    logger: Logger;
    retry?: RetryOptions;
    /** Static headers injected on every request (e.g. app-name/app-key) */
    defaultHeaders?: Record<string, string>;
    /** Optional proxy server URL */
    proxyUrl?: string;
}
interface RequestInit {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    body?: unknown;
    headers?: Record<string, string>;
    queryParams?: Record<string, string | number | undefined>;
    contentType?: 'json' | 'form';
    traceId?: string;
}
/**
 * Core HTTP client with retry/backoff, structured logging, and trace ID.
 * Ported from Python `_http()` / `_request()` in csdlduoc_service.py.
 */
declare class HttpClient {
    private readonly baseUrl;
    private readonly logger;
    private readonly retryOpts?;
    private readonly defaultHeaders;
    private readonly proxyAgent?;
    private auth?;
    constructor(opts: HttpClientOptions, auth?: AuthProvider);
    setAuth(auth: AuthProvider): void;
    request<T = unknown>(path: string, init?: RequestInit): Promise<T>;
    get<T = unknown>(path: string, opts?: {
        headers?: Record<string, string>;
        queryParams?: Record<string, string | number | undefined>;
        traceId?: string;
    }): Promise<T>;
    post<T = unknown>(path: string, body: unknown, opts?: {
        headers?: Record<string, string>;
        contentType?: 'json' | 'form';
        traceId?: string;
    }): Promise<T>;
    private buildUrl;
    private logRequest;
    private logResponse;
}

type Environment = 'sandbox' | 'production';

/** Credentials for CSDL Dược (QĐ 522) */
interface CsdlDuocConfig {
    username: string;
    password: string;
    /** Optional: store_id for transaction payloads */
    storeId?: string;
    /** Optional: warehouse code for transaction payloads */
    warehouseCode?: string;
}
/** Credentials for Cổng Đơn Thuốc (QĐ 228) */
interface Qd228Config {
    appName: string;
    appKey: string;
}
/** Top-level SDK configuration */
interface SDKConfig {
    /** 'sandbox' or 'production' — determines API base URLs */
    environment: Environment;
    /** CSDL Dược (QĐ 522) credentials */
    csdlDuoc?: CsdlDuocConfig;
    /** Cổng Đơn Thuốc (QĐ 228) credentials */
    qd228?: Qd228Config;
    /** Override CSDL Dược base URL (takes priority over environment) */
    csdlDuocBaseUrl?: string;
    /** Override QĐ 228 base URL */
    nationalRxBaseUrl?: string;
    /** Retry behaviour for all HTTP calls */
    retry?: RetryOptions;
    /** Custom logger — defaults to built-in StructuredLogger */
    logger?: Logger;
    /** Token TTL in hours — default 23h */
    tokenTtlHours?: number;
    /**
     * Callback invoked when the CSDL Dược auth token changes.
     * Use this to persist tokens externally (e.g. to a database).
     */
    onTokenChange?: (token: string, expiresAt: Date) => void;
    /**
     * Provide a previously-cached token to skip the initial login.
     */
    cachedToken?: string;
    /**
     * Expiry timestamp for the cached token.
     */
    cachedTokenExpiresAt?: Date;
    /**
     * Optional: Proxy server URL (e.g. 'http://username:password@vietnam-proxy-ip:port')
     * to bypass firewall restrictions when deployed in cloud environments.
     */
    proxyUrl?: string;
}
/** Resolve the CSDL Dược base URL from config */
declare function resolveCsdlDuocBaseUrl(config: SDKConfig): string;
/** Resolve the POS portal base URL (strips /v2 suffix) */
declare function resolvePortalApiRoot(baseUrl: string): string;
/** Resolve the QĐ 228 base URL from config */
declare function resolveNationalRxBaseUrl(config: SDKConfig): string;

/** Token state for CSDL Dược auth */
interface AuthState {
    accessToken: string;
    expiresAt: Date;
}
/** Raw login response from CSDL Dược */
interface AuthLoginResponse {
    access_token?: string;
    token?: string;
    expires_in?: number;
    [key: string]: unknown;
}

/**
 * CSDL Dược (QĐ 522) authentication manager.
 *
 * Ported from Python `CsdlDuocService.login()` in csdlduoc_service.py:139-191.
 *
 * - POST /auth/login with x-www-form-urlencoded, password base64-encoded
 * - Caches token in memory
 * - Auto-refreshes when token expires within TOKEN_REFRESH_MINUTES (5 min)
 * - On 401: clears token, re-login, retry once
 */
declare class CsdlDuocAuth implements AuthProvider {
    private readonly config;
    private readonly baseUrl;
    private readonly logger;
    private readonly tokenTtlHours;
    private readonly onTokenChange?;
    private readonly proxyAgent?;
    private state;
    private loginPromise;
    constructor(opts: {
        config: CsdlDuocConfig;
        baseUrl: string;
        logger: Logger;
        tokenTtlHours?: number;
        onTokenChange?: (token: string, expiresAt: Date) => void;
        proxyUrl?: string;
    });
    getAuthHeaders(traceId?: string): Promise<Record<string, string>>;
    onUnauthorized(traceId?: string): Promise<boolean>;
    /** Provide a pre-cached token (e.g. from database) to skip initial login */
    setCachedToken(token: string, expiresAt: Date): void;
    /** Returns current token state (for external persistence) */
    getState(): AuthState | null;
    private login;
    private isTokenValid;
}

/**
 * QĐ 228 (Cổng Đơn Thuốc Quốc Gia) authentication provider.
 *
 * Ported from Python `NationalRxService._headers()` in national_rx_service.py:44.
 *
 * - Static app-name / app-key headers — no OAuth, no refresh.
 * - app-key is masked in logs.
 */
declare class Qd228Auth implements AuthProvider {
    private readonly config;
    private readonly logger;
    constructor(config: Qd228Config, logger: Logger);
    getAuthHeaders(_traceId?: string): Promise<Record<string, string>>;
    /** QĐ 228 has no refresh — always returns false (no retry allowed) */
    onUnauthorized(traceId?: string): Promise<boolean>;
}

/** Paginated API response wrapper */
interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page?: number;
    pageSize?: number;
}
/** Generic API response shape */
interface ApiResponse<T = unknown> {
    status: number;
    data: T;
    headers?: Record<string, string>;
}
/** Transaction status returned by CSDL Dược async endpoints */
interface TransactionStatus {
    status: string;
    transactionId?: string;
    messages?: string[];
    [key: string]: unknown;
}
/** Pagination options */
interface PaginationOptions {
    page?: number;
    pageSize?: number;
}
/** General request options for all SDK methods */
interface RequestOptions {
    /** Optional trace ID to correlate logs. If not provided, a random UUID will be generated. */
    traceId?: string;
}

interface DrugSearchItem {
    /** National drug ID (ma_thuoc_qg) */
    id: string;
    /** Drug name (ten_thuoc) */
    name: string;
    /** Registration number (so_dang_ky) */
    registrationNumber?: string;
    /** Base unit name (don_vi_co_ban) */
    baseUnit?: string;
    /** Source: 'pos' | 'master' */
    source: 'pos' | 'master';
    /** Raw API response data */
    raw?: Record<string, unknown>;
}
interface DrugSearchOptions extends PaginationOptions {
    /** Source preference — default 'auto' (POS first, fallback master) */
    source?: 'auto' | 'pos' | 'master';
}
interface DrugPackaging {
    id?: string;
    isBasicUnit?: boolean;
    unitName?: string;
    quantity?: number;
    conversionRateToBase?: number;
    gtin?: string;
    [key: string]: unknown;
}
interface DrugManufacturer {
    id?: string;
    name?: string;
    address?: string;
    country?: string;
    [key: string]: unknown;
}
interface DrugActiveIngredient {
    id?: string;
    name?: string;
    concentration?: string;
    isMainActiveIngredient?: boolean;
    type?: number;
    [key: string]: unknown;
}
interface DrugRoute {
    id?: string;
    name?: string;
    [key: string]: unknown;
}
interface DrugDetail {
    /** Drug ID */
    id: string;
    /** National drug code (ma_thuoc_qg) */
    maThuocQg?: string;
    /** Drug name */
    name: string;
    /** Registration number */
    registrationNumber?: string;
    /** Strength */
    strength?: string;
    /** Drug group */
    drugGroupId?: string;
    /** Prescription status: '0' = OTC, '1' = prescription */
    prescriptionStatus?: string;
    /** Special control type */
    specialControlType?: number;
    /** Dosage form (dang_bao_che) */
    dosageForm?: string;
    /** GTIN */
    gtin?: string;
    /** Brand name */
    brandName?: string;
    /** Approval date */
    approvalDate?: string;
    /** Expiry date info */
    expiryDate?: string;
    /** Is prescription drug */
    isPrescriptionDrug?: boolean;
    /** Route of administration */
    route?: DrugRoute;
    /** Manufacturer */
    manufacturer?: DrugManufacturer;
    /** Active ingredients */
    activeIngredients?: DrugActiveIngredient[];
    /** Active pharmaceutical ingredient text */
    activePharmaceuticalIngredient?: string;
    /** Packagings */
    packagings?: DrugPackaging[];
    /** Basic packaging unit ID */
    basicUnitId?: string;
    /** Basic packaging unit name */
    basicUnitName?: string;
    /** Retail packaging unit ID */
    retailUnitId?: string;
    /** Retail packaging unit name */
    retailUnitName?: string;
    /** Conversion rate: basic → retail */
    conversionRate?: number;
    /** Country of manufacture */
    countryOfManufacture?: string;
    /** Raw API response */
    raw?: Record<string, unknown>;
}
interface MasterUnit {
    id: string;
    name: string;
    [key: string]: unknown;
}
interface MasterRoute {
    id: string;
    name: string;
    [key: string]: unknown;
}
interface MasterCountry {
    id: string;
    name: string;
    [key: string]: unknown;
}
interface MasterDrugGroup {
    id: string;
    name: string;
    [key: string]: unknown;
}
interface MasterManufacturer {
    id: string;
    name: string;
    [key: string]: unknown;
}
interface MasterActiveIngredient {
    id: string;
    name: string;
    [key: string]: unknown;
}
type DrugSearchResult = PaginatedResponse<DrugSearchItem>;

/**
 * Drug catalog and search operations.
 *
 * Ported from Python `CsdlDuocService.search_master_drugs()`, `get_master_drug()`,
 * `search_pos_products()`, `search_drugs_for_wizard()` +
 * `MasterDataMapper.normalize_drug_list_item()`, `parse_pos_search_response()`.
 */
declare class DrugClient {
    private readonly http;
    private readonly portalHttp;
    private readonly logger;
    constructor(http: HttpClient, portalHttp: HttpClient, logger: Logger);
    /**
     * Unified drug search — POS portal first, fallback to master catalog.
     * Ported from `CsdlDuocService.search_drugs_for_wizard()`.
     */
    search(keyword: string, opts?: DrugSearchOptions, apiOpts?: RequestOptions): Promise<DrugSearchResult>;
    searchPos(keyword: string, opts?: {
        page?: number;
        pageSize?: number;
    }, apiOpts?: RequestOptions): Promise<DrugSearchResult>;
    searchMaster(keyword: string, opts?: {
        page?: number;
        pageSize?: number;
    }, apiOpts?: RequestOptions): Promise<DrugSearchResult>;
    getDetail(drugId: string, apiOpts?: RequestOptions): Promise<DrugDetail>;
}

/**
 * Master data lookups for CSDL Dược.
 *
 * Ported from Python `CsdlDuocService.search_master_units()`, `search_master_routes()` etc.
 */
declare class MasterDataClient {
    private readonly http;
    constructor(http: HttpClient);
    getUnits(keyword?: string, opts?: {
        page?: number;
        pageSize?: number;
    }): Promise<MasterUnit[]>;
    getRoutes(keyword?: string, opts?: {
        page?: number;
        pageSize?: number;
    }): Promise<MasterRoute[]>;
    getCountries(keyword?: string, opts?: {
        page?: number;
        pageSize?: number;
    }): Promise<MasterCountry[]>;
    getDrugGroups(keyword?: string, opts?: {
        page?: number;
        pageSize?: number;
    }): Promise<MasterDrugGroup[]>;
    getManufacturers(keyword?: string, opts?: {
        page?: number;
        pageSize?: number;
    }): Promise<MasterManufacturer[]>;
    getActiveIngredients(keyword?: string, opts?: {
        page?: number;
        pageSize?: number;
    }): Promise<MasterActiveIngredient[]>;
    private fetchList;
}

interface ManufacturerInfo {
    id?: string;
    name?: string;
}
interface StockItem {
    drugId: string;
    unitId: string;
    quantity: number;
    batchNo?: string;
    expiryDate?: string;
    price?: number;
    manufacturer?: ManufacturerInfo;
    gtin?: string;
}
type StockInReason = 'supplier' | 'return' | 'transfer-in' | 'manufactured' | 'opening-balance' | 'imported';
interface StockInOptions {
    items: StockItem[];
    reason: StockInReason;
    referenceNumber?: string;
    transactionDate?: string;
    note?: string;
    /** Required when reason = 'supplier' */
    supplierId?: string;
    /** Required when reason = 'transfer-in' */
    sourceStoreId?: string;
    sourceWarehouseId?: string;
    targetStoreId?: string;
    targetWarehouseId?: string;
}
type StockOutReason = 'sale-retail' | 'return' | 'transfer-out' | 'destroy' | 'other';
interface StockOutOptions {
    items: StockItem[];
    reason: StockOutReason;
    referenceNumber?: string;
    transactionDate?: string;
    note?: string;
    /** Required when reason = 'return' */
    supplierId?: string;
    /** Required when reason = 'transfer-out' */
    sourceStoreId?: string;
    sourceWarehouseId?: string;
    targetStoreId?: string;
    targetWarehouseId?: string;
}
interface StockTakingItem {
    drugId: string;
    unitId: string;
    quantity: number;
    batchNo?: string;
    expiryDate?: string;
    price?: number;
    systemQuantity?: number;
    actualQuantity?: number;
    manufacturer?: ManufacturerInfo;
}
interface StockTakingOptions {
    items: StockTakingItem[];
    transactionDate?: string;
    note?: string;
}
interface TransactionResult {
    transactionId: string;
    status?: string;
    /** Number of poll attempts made */
    attempts: number;
    /** True if polling timed out before reaching terminal status */
    timedOut: boolean;
    raw?: Record<string, unknown>;
}
interface PollResult {
    status: string;
    transactionId: string;
    attempts: number;
    timedOut: boolean;
    messages?: string[];
    raw?: Record<string, unknown>;
}

/** Transaction type used in polling */
type TransactionType = 'stock-in' | 'stock-out' | 'stock-taking';
/**
 * Inventory operations for CSDL Dược.
 *
 * Ported from Python:
 * - `CsdlDuocPayloadBuilder` (helpers/csdlduoc_payload.py)
 * - `StockReasonMapper` (helpers/stock_reason.py)
 * - `poll_until_terminal()` (helpers/async_polling.py)
 * - `CsdlDuocService.sync_stock_in/out/taking()`, `_sync_picking()`, `_poll_transaction_status()`
 */
declare class InventoryClient {
    private readonly http;
    private readonly logger;
    private readonly storeId?;
    private readonly warehouseCode?;
    constructor(http: HttpClient, logger: Logger, opts?: {
        storeId?: string;
        warehouseCode?: string;
    });
    /**
     * Submit stock-in transaction (nhập kho).
     *
     * POST /transactions/stock-in → returns transaction_id → auto-polls until terminal.
     */
    stockIn(opts: StockInOptions, apiOpts?: RequestOptions): Promise<TransactionResult>;
    /**
     * Submit stock-out transaction (xuất kho).
     *
     * POST /transactions/stock-out → returns transaction_id → auto-polls until terminal.
     */
    stockOut(opts: StockOutOptions, apiOpts?: RequestOptions): Promise<TransactionResult>;
    /**
     * Submit stock-taking transaction (kiểm kho).
     *
     * POST /transactions/stock-taking → returns transaction_id → auto-polls until terminal.
     */
    stockTaking(opts: StockTakingOptions, apiOpts?: RequestOptions): Promise<TransactionResult>;
    pollTransaction(type: TransactionType, transactionId: string, apiOpts?: RequestOptions): Promise<TransactionResult>;
    private postTransaction;
    private buildPayload;
}

interface CsdlDuocClientOptions {
    baseUrl?: string;
    storeId?: string;
    warehouseCode?: string;
}
/**
 * Aggregated CSDL Dược (QĐ 522) client.
 *
 * Groups drugs, masterData, and inventory sub-clients.
 * Uses two HTTP clients:
 * - Main HTTP client: uses base URL with /v2 suffix (for auth, master data, inventory)
 * - Portal HTTP client: strips /v2 suffix (for POS portal API)
 */
declare class CsdlDuocClient {
    readonly drugs: DrugClient;
    readonly masterData: MasterDataClient;
    readonly inventory: InventoryClient;
    constructor(http: HttpClient, portalHttp: HttpClient, logger: Logger, _auth: unknown, opts?: CsdlDuocClientOptions);
}

interface PrescriptionDrugItem {
    /** Drug code (ma_thuoc) */
    drugCode?: string;
    /** Drug name */
    drugName?: string;
    /** Unit name */
    unitName?: string;
    /** Prescribed quantity */
    prescribedQuantity?: number;
    /** Usage instruction */
    usageInstruction?: string;
    /** Price */
    price?: number;
    /** Raw item data */
    raw?: Record<string, unknown>;
}
interface Prescription {
    /** Prescription code (ma_don_thuoc) */
    maDonThuoc: string;
    /** Patient birth date */
    patientBirthDate?: string;
    /** Patient name (ho_ten_benh_nhan) */
    patientName?: string;
    /** Patient health ID (ma_dinh_danh_y_te) */
    patientHealthId?: string;
    /** Diagnosis (chan_doan) */
    diagnosis?: string;
    /** Doctor name (ten_bac_si) */
    doctorName?: string;
    /** Facility name (ten_co_so_kham) */
    facilityName?: string;
    /** Drug items in the prescription */
    items: PrescriptionDrugItem[];
    /** Raw API response */
    raw?: Record<string, unknown>;
}
interface PrescriptionSaleItem {
    drugId?: string;
    drugName?: string;
    unitName?: string;
    prescribedQuantity?: number;
    soldQuantity: number;
    usageInstruction?: string;
}
interface PrescriptionUpdateOptions {
    maDonThuoc: string;
    items: PrescriptionSaleItem[];
    /** Pharmacy identifier / name */
    pharmacyName?: string;
    /** Pharmacy phone */
    pharmacyPhone?: string;
    /** Pharmacy address */
    pharmacyAddress?: string;
    /** Invoice number */
    invoiceNumber?: string;
}
interface PrescriptionUpdateResult {
    success: boolean;
    status: number;
    data?: Record<string, unknown>;
    error?: string;
}

/**
 * QĐ 228 (Cổng Đơn Thuốc Quốc Gia) prescription operations.
 *
 * Ported from Python:
 * - `NationalRxService.lookup_prescription()` (qd228-service.py:122)
 * - `NationalRxService.update_prescription_sale_qty()` (qd228-service.py:350-477)
 *
 * Auth: static app-name/app-key headers (no OAuth).
 * Retry: max 2 retries with 30s delay for updatePrescriptionSaleQty.
 */
declare class PrescriptionClient {
    private readonly http;
    private readonly logger;
    constructor(http: HttpClient, logger: Logger);
    /**
     * Look up a prescription by code.
     *
     * GET /api/v1/thong-tin-don-thuoc/{maDonThuoc}
     */
    get(maDonThuoc: string): Promise<Prescription>;
    /**
     * Update prescription sale quantity (UC05).
     *
     * POST /api/v1/cap-nhat-don-thuoc
     *
     * Retries up to QD228_MAX_RETRIES (2) times with QD228_RETRY_DELAY_MS (30s) delay.
     * Ported from `NationalRxService.update_prescription_sale_qty()` lines 411-477.
     */
    updateSaleQty(opts: PrescriptionUpdateOptions): Promise<PrescriptionUpdateResult>;
}

/**
 * Aggregated QĐ 228 (Cổng Đơn Thuốc Quốc Gia) client.
 *
 * Currently groups only prescriptions sub-client.
 * Extensible for future UCs (e.g. inventory reports via QĐ 228).
 */
declare class Qd228Client {
    readonly prescriptions: PrescriptionClient;
    constructor(http: HttpClient, logger: Logger);
}

/**
 * Main SDK entry point — DrugPortalClient
 *
 * ```typescript
 * import { DrugPortalClient } from '@icare1/drug-portal-sdk';
 *
 * const client = new DrugPortalClient({
 *   environment: 'sandbox',
 *   csdlDuoc: { username: '...', password: '...' },
 *   qd228: { appName: '...', appKey: '...' },
 * });
 *
 * // CSDL Dược (QĐ 522)
 * const drugs = await client.csdlDuoc.drugs.search('paracetamol');
 * const txId = await client.csdlDuoc.inventory.stockIn({ items, reason: 'supplier' });
 *
 * // Cổng Đơn Thuốc (QĐ 228)
 * const rx = await client.qd228.prescriptions.get('DH001');
 * ```
 */
declare class DrugPortalClient {
    /** CSDL Dược (QĐ 522) sub-client */
    readonly csdlDuoc: CsdlDuocClient;
    /** Cổng Đơn Thuốc (QĐ 228) sub-client — undefined if no qd228 config provided */
    readonly qd228?: Qd228Client;
    private readonly logger;
    constructor(config: SDKConfig);
}

/**
 * Mock Client for DrugPortalClient.
 * Use this in your unit/integration tests to simulate API responses.
 */
declare class MockDrugPortalClient extends DrugPortalClient {
    constructor();
    mockDrugs: DrugSearchItem[];
    mockPrescriptions: Record<string, Prescription>;
    private mockSearchDrugs;
    private mockGetDrugDetail;
    private mockStockIn;
    private mockStockOut;
    private mockGetPrescription;
}

/**
 * Interface for token persistence.
 * Implement this interface to store CSDL Dược authentication tokens in Redis, database, etc.
 */
interface TokenStore {
    /** Retrieve a token from the store */
    get(key: string): Promise<AuthState | null>;
    /** Save a token to the store */
    set(key: string, state: AuthState): Promise<void>;
    /** Clear a token from the store */
    clear(key: string): Promise<void>;
}
/**
 * In-Memory token storage.
 * Useful for development and testing.
 */
declare class MemoryTokenStore implements TokenStore {
    private cache;
    get(key: string): Promise<AuthState | null>;
    set(key: string, state: AuthState): Promise<void>;
    clear(key: string): Promise<void>;
}
/**
 * File-system token storage.
 * Automatically saves token to a JSON file on disk.
 */
declare class FileTokenStore implements TokenStore {
    private filePath;
    constructor(filePath?: string);
    private readCache;
    private writeCache;
    get(key: string): Promise<AuthState | null>;
    set(key: string, state: AuthState): Promise<void>;
    clear(key: string): Promise<void>;
}
/**
 * Generic Redis Token Store compatible with standard redis/ioredis client signatures.
 */
interface GenericRedisClient {
    get(key: string): Promise<string | null> | string | null;
    set(key: string, value: string, mode?: string, duration?: number): Promise<unknown> | unknown;
    del(key: string): Promise<unknown> | unknown;
}
declare class RedisTokenStore implements TokenStore {
    private client;
    private prefix;
    constructor(client: GenericRedisClient, prefix?: string);
    get(key: string): Promise<AuthState | null>;
    set(key: string, state: AuthState): Promise<void>;
    clear(key: string): Promise<void>;
}

export { type ApiResponse, type AuthLoginResponse, type AuthState, CsdlDuocAuth, CsdlDuocClient, type CsdlDuocConfig, type DrugActiveIngredient, type DrugDetail, type DrugManufacturer, type DrugPackaging, DrugPortalClient, DrugPortalError, type DrugRoute, type DrugSearchItem, type DrugSearchOptions, type DrugSearchResult, FileTokenStore, type GenericRedisClient, type ManufacturerInfo, type MasterActiveIngredient, type MasterCountry, type MasterDrugGroup, type MasterManufacturer, type MasterRoute, type MasterUnit, MemoryTokenStore, MockDrugPortalClient, type PaginatedResponse, type PaginationOptions, type PollResult, type Prescription, type PrescriptionDrugItem, type PrescriptionSaleItem, type PrescriptionUpdateOptions, type PrescriptionUpdateResult, Qd228Auth, Qd228Client, type Qd228Config, RedisTokenStore, type RequestOptions, type SDKConfig, type StockInOptions, type StockInReason, type StockItem, type StockOutOptions, type StockOutReason, type StockTakingItem, type StockTakingOptions, StructuredLogger, type TokenStore, type TransactionResult, type TransactionStatus, DrugPortalClient as default, resolveCsdlDuocBaseUrl, resolveNationalRxBaseUrl, resolvePortalApiRoot };
