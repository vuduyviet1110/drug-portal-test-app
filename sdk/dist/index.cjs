"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  CsdlDuocAuth: () => CsdlDuocAuth,
  CsdlDuocClient: () => CsdlDuocClient,
  DrugPortalClient: () => DrugPortalClient,
  DrugPortalError: () => DrugPortalError,
  FileTokenStore: () => FileTokenStore,
  MemoryTokenStore: () => MemoryTokenStore,
  MockDrugPortalClient: () => MockDrugPortalClient,
  Qd228Auth: () => Qd228Auth,
  Qd228Client: () => Qd228Client,
  RedisTokenStore: () => RedisTokenStore,
  StructuredLogger: () => StructuredLogger,
  default: () => index_default
});
module.exports = __toCommonJS(index_exports);

// src/constants.ts
var CSDL_DUOC_ENDPOINTS = {
  AUTH_LOGIN: "/auth/login",
  // Master data
  MASTER_DRUGS: "/master/drugs",
  MASTER_UNITS: "/master/units",
  MASTER_ROUTES: "/master/routes",
  MASTER_COUNTRIES: "/master/countries",
  MASTER_DRUG_GROUPS: "/master/drug-groups",
  MASTER_ACTIVE_INGREDIENTS: "/master/active-ingredients",
  MASTER_MANUFACTURERS: "/master/manufactures",
  MASTER_PROVINCES: "/master/provinces",
  MASTER_COMMUNES: "/master/communes",
  // POS portal (different base URL — strips /v2)
  POS_PRODUCT_GET_PAGED: "/api/pos/product/get-paged",
  // Inventory transactions
  STOCK_IN: "/transactions/stock-in",
  STOCK_OUT: "/transactions/stock-out",
  STOCK_TAKING: "/transactions/stock-taking",
  // Inventory reports
  REPORT_MONTHLY: "/inventory-reports/monthly",
  REPORT_QUARTERLY: "/inventory-reports/quarterly",
  REPORT_YEARLY: "/inventory-reports/yearly",
  REPORT_PERIOD_STATUS: "/inventory-reports/period/status"
};
var NATIONAL_RX_ENDPOINTS = {
  PRESCRIPTION_INFO: "/api/v1/thong-tin-don-thuoc",
  UPDATE_PRESCRIPTION: "/api/v1/cap-nhat-don-thuoc"
};
var DEFAULT_TOKEN_TTL_HOURS = 23;
var TOKEN_REFRESH_MINUTES = 5;
var POLL_ACCEPTED_DELAY_MS = 5e3;
var POLL_PROCESSING_DELAY_MS = 1e4;
var POLL_ERROR_RETRY_DELAY_MS = 6e4;
var POLL_MAX_ERROR_RETRIES = 3;
var POLL_MAX_ATTEMPTS = 30;
var TERMINAL_STATUSES = ["completed", "rejected", "error"];
var SUCCESS_STATUS = "completed";
var QD228_MAX_RETRIES = 2;
var QD228_RETRY_DELAY_MS = 3e4;
var API_LOG_BODY_MAX = 1e4;

// src/auth/csdl-duoc-auth.ts
var import_undici = require("undici");
var CsdlDuocAuth = class {
  config;
  baseUrl;
  logger;
  tokenTtlHours;
  onTokenChange;
  proxyAgent;
  state = null;
  loginPromise = null;
  constructor(opts) {
    this.config = opts.config;
    this.baseUrl = opts.baseUrl;
    this.logger = opts.logger;
    this.tokenTtlHours = opts.tokenTtlHours ?? DEFAULT_TOKEN_TTL_HOURS;
    this.onTokenChange = opts.onTokenChange;
    this.proxyAgent = opts.proxyUrl ? new import_undici.ProxyAgent(opts.proxyUrl) : void 0;
  }
  async getAuthHeaders(traceId) {
    if (!this.isTokenValid()) {
      await this.login(false, traceId);
    }
    return { Authorization: `Bearer ${this.state.accessToken}` };
  }
  async onUnauthorized(traceId) {
    this.logger.warn("Token rejected (401) \u2014 clearing and re-logging in", { traceId });
    this.state = null;
    try {
      await this.login(true, traceId);
      return true;
    } catch (err) {
      this.logger.error("Re-login failed after 401", {
        error: err.message,
        traceId
      });
      return false;
    }
  }
  /** Provide a pre-cached token (e.g. from database) to skip initial login */
  setCachedToken(token, expiresAt) {
    this.state = { accessToken: token, expiresAt };
    this.logger.info("Token loaded from cache", { expiresAt: expiresAt.toISOString() });
  }
  /** Returns current token state (for external persistence) */
  getState() {
    return this.state;
  }
  async login(force = false, traceId) {
    if (!force && this.isTokenValid()) return;
    if (this.loginPromise) {
      return this.loginPromise;
    }
    this.loginPromise = (async () => {
      this.logger.info("Authenticating with CSDL D\u01B0\u1EE3c", { baseUrl: this.baseUrl, traceId });
      const passwordB64 = Buffer.from(this.config.password, "utf8").toString("base64");
      const body = {
        username: this.config.username,
        password: passwordB64
      };
      const url = `${this.baseUrl}${CSDL_DUOC_ENDPOINTS.AUTH_LOGIN}`;
      try {
        const resp = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams(body).toString(),
          ...this.proxyAgent ? { dispatcher: this.proxyAgent } : {}
        });
        if (!resp.ok) {
          const text = await resp.text();
          throw new Error(`CSDL D\u01B0\u1EE3c login failed: HTTP ${resp.status} \u2014 ${text.slice(0, 200)}`);
        }
        const data = await resp.json();
        const token = data.access_token ?? data.token;
        if (!token) {
          throw new Error("CSDL D\u01B0\u1EE3c login response missing access_token / token");
        }
        const expiresInHours = data.expires_in ? data.expires_in / 3600 : this.tokenTtlHours;
        const expiresAt = new Date(Date.now() + expiresInHours * 36e5);
        this.state = { accessToken: token, expiresAt };
        this.logger.info("CSDL D\u01B0\u1EE3c authenticated", { expiresAt: expiresAt.toISOString(), traceId });
        if (this.onTokenChange) {
          try {
            this.onTokenChange(token, expiresAt);
          } catch (callbackErr) {
            this.logger.warn("Error in onTokenChange callback", {
              error: callbackErr.message,
              traceId
            });
          }
        }
      } catch (err) {
        this.logger.error("CSDL D\u01B0\u1EE3c login error", { error: err.message, traceId });
        throw err;
      }
    })();
    try {
      await this.loginPromise;
    } finally {
      this.loginPromise = null;
    }
  }
  isTokenValid() {
    if (!this.state) return false;
    const bufferMs = TOKEN_REFRESH_MINUTES * 6e4;
    return this.state.expiresAt.getTime() - bufferMs > Date.now();
  }
};

// src/auth/qd228-auth.ts
var Qd228Auth = class {
  config;
  logger;
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
  }
  async getAuthHeaders(_traceId) {
    return {
      "app-name": this.config.appName,
      "app-key": this.config.appKey
    };
  }
  /** QĐ 228 has no refresh — always returns false (no retry allowed) */
  async onUnauthorized(traceId) {
    this.logger.error("Q\u0110 228 returned 401 \u2014 static credentials may be invalid", { traceId });
    return false;
  }
};

// src/http/logger.ts
var StructuredLogger = class {
  prefix;
  delegate;
  constructor(prefix, delegate) {
    this.prefix = prefix;
    this.delegate = delegate;
  }
  debug(message, meta) {
    this.write("DEBUG", message, meta);
  }
  info(message, meta) {
    this.write("INFO", message, meta);
  }
  warn(message, meta) {
    this.write("WARN", message, meta);
  }
  error(message, meta) {
    this.write("ERROR", message, meta);
  }
  write(level, message, meta) {
    if (this.delegate) {
      this.delegate[level.toLowerCase()]?.(message, meta);
      return;
    }
    const entry = {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      level,
      source: this.prefix,
      message,
      ...meta
    };
    console.log(JSON.stringify(entry));
  }
};
function generateTraceId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID().slice(0, 8);
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

// src/types/schemas.ts
var import_zod = require("zod");
var DrugPosItemSchema = import_zod.z.object({
  id: import_zod.z.string().or(import_zod.z.number()).transform((val) => String(val)),
  tenThuoc: import_zod.z.string().optional().nullable(),
  soDangKy: import_zod.z.string().optional().nullable()
}).passthrough();
var DrugMasterItemSchema = import_zod.z.object({
  id: import_zod.z.string().or(import_zod.z.number()).transform((val) => String(val)),
  tenThuoc: import_zod.z.string().optional().nullable(),
  soDangKy: import_zod.z.string().optional().nullable()
}).passthrough();
var DrugDetailSchema = import_zod.z.object({
  id: import_zod.z.string().or(import_zod.z.number()).transform((val) => String(val)),
  tenThuoc: import_zod.z.string().optional().nullable(),
  soDangKy: import_zod.z.string().optional().nullable(),
  hamLuong: import_zod.z.string().optional().nullable(),
  hangSanXuat: import_zod.z.string().optional().nullable(),
  nuocSanXuat: import_zod.z.string().optional().nullable(),
  quyCachDongGoi: import_zod.z.string().optional().nullable()
}).passthrough();
var PrescriptionItemSchema = import_zod.z.object({
  ma_thuoc: import_zod.z.string().or(import_zod.z.number()).optional().nullable().transform((val) => val !== void 0 && val !== null ? String(val) : void 0),
  ten_thuoc: import_zod.z.string().optional().nullable(),
  don_vi: import_zod.z.string().optional().nullable(),
  so_luong: import_zod.z.number().or(import_zod.z.string().transform(Number)).optional().nullable(),
  cach_dung: import_zod.z.string().optional().nullable(),
  don_gia: import_zod.z.number().or(import_zod.z.string().transform(Number)).optional().nullable()
}).passthrough();
var PrescriptionSchema = import_zod.z.object({
  ngay_sinh_benh_nhan: import_zod.z.string().optional().nullable(),
  ho_ten_benh_nhan: import_zod.z.string().optional().nullable(),
  ma_dinh_danh_y_te: import_zod.z.string().optional().nullable(),
  chan_doan: import_zod.z.union([import_zod.z.string(), import_zod.z.array(import_zod.z.any())]).optional().nullable(),
  ten_bac_si: import_zod.z.string().optional().nullable(),
  ten_co_so_kham: import_zod.z.string().optional().nullable(),
  ten_co_so_kham_chua_benh: import_zod.z.string().optional().nullable(),
  thong_tin_don_thuoc: import_zod.z.array(PrescriptionItemSchema).optional(),
  items: import_zod.z.array(PrescriptionItemSchema).optional()
}).passthrough();
var TransactionResponseSchema = import_zod.z.object({
  transactionId: import_zod.z.string().or(import_zod.z.number()).transform((val) => String(val)),
  status: import_zod.z.string().optional()
}).passthrough();

// src/csdl-duoc/drugs.ts
var DrugClient = class {
  http;
  portalHttp;
  logger;
  constructor(http, portalHttp, logger) {
    this.http = http;
    this.portalHttp = portalHttp;
    this.logger = logger;
  }
  /**
   * Unified drug search — POS portal first, fallback to master catalog.
   * Ported from `CsdlDuocService.search_drugs_for_wizard()`.
   */
  async search(keyword, opts = {}, apiOpts) {
    const { page = 1, pageSize = 20, source = "auto" } = opts;
    if (source === "pos" || source === "auto") {
      try {
        const result = await this.searchPos(keyword, { page, pageSize }, apiOpts);
        if (result.items.length > 0) return result;
      } catch (err) {
        this.logger.warn("POS drug search failed, trying master catalog", {
          error: err.message,
          traceId: apiOpts?.traceId
        });
      }
    }
    if (source === "master" || source === "auto") {
      return this.searchMaster(keyword, { page, pageSize }, apiOpts);
    }
    return { items: [], total: 0 };
  }
  async searchPos(keyword, opts = {}, apiOpts) {
    const { page = 1, pageSize = 20 } = opts;
    const skipCount = Math.max(0, (page - 1) * pageSize);
    const nowMs = Date.now();
    const body = {
      filter: keyword || "",
      isShowAdvanceSearch: false,
      onSearchBeginning: nowMs,
      isActived: null,
      type: 1,
      skipCount,
      maxResultCount: pageSize,
      sorting: "",
      version: nowMs
    };
    const data = await this.portalHttp.post(
      CSDL_DUOC_ENDPOINTS.POS_PRODUCT_GET_PAGED,
      body,
      { traceId: apiOpts?.traceId }
    );
    return parsePosResponse(data);
  }
  async searchMaster(keyword, opts = {}, apiOpts) {
    const { page = 1, pageSize = 20 } = opts;
    const data = await this.http.get(CSDL_DUOC_ENDPOINTS.MASTER_DRUGS, {
      queryParams: { search: keyword, page, page_size: pageSize },
      traceId: apiOpts?.traceId
    });
    return parseMasterResponse(data, "master");
  }
  async getDetail(drugId, apiOpts) {
    const data = await this.http.get(
      `${CSDL_DUOC_ENDPOINTS.MASTER_DRUGS}/${encodeURIComponent(drugId)}`,
      { traceId: apiOpts?.traceId }
    );
    return mapDrugDetail(data);
  }
};
function parsePosResponse(data) {
  let rawItems = [];
  let total = 0;
  const result = data["result"];
  if (result && typeof result === "object") {
    rawItems = result["items"] ?? [];
    total = result["total"] ?? rawItems.length;
  } else if (Array.isArray(data["items"])) {
    rawItems = data["items"];
    total = data["totalCount"] ?? data["total"] ?? rawItems.length;
  } else if (Array.isArray(data["data"])) {
    rawItems = data["data"];
    total = rawItems.length;
  }
  const items = rawItems.map((item) => {
    const parsed = DrugPosItemSchema.safeParse(item);
    const itemData = parsed.success ? parsed.data : {};
    return {
      id: itemData.id ?? item["drugId"] ?? item["id"] ?? "",
      name: itemData.tenThuoc ?? item["productName"] ?? item["tenThuoc"] ?? item["name"] ?? "",
      registrationNumber: itemData.soDangKy ?? item["registrationNumber"],
      baseUnit: item["baseUnit"],
      source: "pos",
      raw: item
    };
  });
  return { items, total };
}
function parseMasterResponse(data, source) {
  const rawItems = data["items"] ?? data["data"] ?? [];
  const total = data["total"] ?? rawItems.length;
  const items = rawItems.map((item) => {
    const parsed = DrugMasterItemSchema.safeParse(item);
    const itemData = parsed.success ? parsed.data : {};
    return {
      id: itemData.id ?? item["id"] ?? item["drugId"] ?? "",
      name: itemData.tenThuoc ?? item["name"] ?? item["tenThuoc"] ?? "",
      registrationNumber: itemData.soDangKy ?? item["registration_number"] ?? item["so_dang_ky"],
      baseUnit: item["base_unit"] ?? item["don_vi_co_ban"],
      source,
      raw: item
    };
  });
  return { items, total };
}
function mapDrugDetail(data) {
  const parsed = DrugDetailSchema.safeParse(data);
  const detailData = parsed.success ? parsed.data : {};
  const packagings = data["packagings"] ?? [];
  const basicPkg = packagings.find((p) => p.isBasicUnit === true) ?? packagings[0];
  const retailPkg = packagings.find((p) => p.isBasicUnit !== true) ?? basicPkg;
  const conversionRate = retailPkg?.conversionRateToBase ?? retailPkg?.quantity ?? 1;
  const gtin = data["gtin"] ?? basicPkg?.gtin ?? retailPkg?.gtin;
  const ingredients = data["active_ingredient_list"] ?? [];
  const activePharmaceuticalIngredient = data["active_pharmaceutical_ingredient"];
  const routes = data["routes"] ?? [];
  const route = routes[0];
  const manufacturer = data["manufacturer"];
  return {
    id: detailData.id ?? data["id"] ?? "",
    maThuocQg: data["ma_thuoc_qg"],
    name: detailData.tenThuoc ?? data["name"] ?? data["ten_thuoc"] ?? "",
    registrationNumber: detailData.soDangKy ?? data["so_dang_ky"],
    strength: data["strength"],
    drugGroupId: data["drug_group_id"],
    prescriptionStatus: data["prescription_status"],
    specialControlType: data["special_control_type"],
    dosageForm: data["dang_bao_che"],
    gtin,
    brandName: data["brand_name"],
    approvalDate: data["approval_date"],
    expiryDate: data["expiry_date"],
    isPrescriptionDrug: data["la_thuoc_ke_don"],
    route: route ? { id: route["id"], name: route["name"] } : void 0,
    manufacturer: manufacturer ? {
      id: manufacturer["id"],
      name: manufacturer["name"],
      address: manufacturer["address"],
      country: manufacturer["country"]
    } : void 0,
    activeIngredients: ingredients.map((i) => ({
      id: i["id"],
      name: i["name"],
      concentration: i["concentration"],
      isMainActiveIngredient: i["is_main_active_ingredient"],
      type: i["type"]
    })),
    activePharmaceuticalIngredient,
    packagings,
    basicUnitId: basicPkg?.id,
    basicUnitName: basicPkg?.unitName,
    retailUnitId: retailPkg?.id,
    retailUnitName: retailPkg?.unitName,
    conversionRate,
    countryOfManufacture: detailData.countryOfManufacture ?? data["nuoc_san_xuat"],
    raw: data
  };
}

// src/csdl-duoc/master-data.ts
var MasterDataClient = class {
  http;
  constructor(http) {
    this.http = http;
  }
  async getUnits(keyword, opts = {}) {
    return this.fetchList(CSDL_DUOC_ENDPOINTS.MASTER_UNITS, keyword, opts);
  }
  async getRoutes(keyword, opts = {}) {
    return this.fetchList(CSDL_DUOC_ENDPOINTS.MASTER_ROUTES, keyword, opts);
  }
  async getCountries(keyword, opts = {}) {
    return this.fetchList(CSDL_DUOC_ENDPOINTS.MASTER_COUNTRIES, keyword, opts);
  }
  async getDrugGroups(keyword, opts = {}) {
    return this.fetchList(CSDL_DUOC_ENDPOINTS.MASTER_DRUG_GROUPS, keyword, opts);
  }
  async getManufacturers(keyword, opts = {}) {
    return this.fetchList(
      CSDL_DUOC_ENDPOINTS.MASTER_MANUFACTURERS,
      keyword,
      opts
    );
  }
  async getActiveIngredients(keyword, opts = {}) {
    return this.fetchList(
      CSDL_DUOC_ENDPOINTS.MASTER_ACTIVE_INGREDIENTS,
      keyword,
      opts
    );
  }
  async fetchList(endpoint, keyword, opts = {}) {
    const { page = 1, pageSize = 100 } = opts;
    const queryParams = {
      page,
      page_size: pageSize
    };
    if (keyword) queryParams["search"] = keyword;
    const data = await this.http.get(endpoint, { queryParams });
    return data["items"] ?? data["data"] ?? [];
  }
};

// src/csdl-duoc/inventory.ts
var InventoryClient = class {
  http;
  logger;
  storeId;
  warehouseCode;
  constructor(http, logger, opts = {}) {
    this.http = http;
    this.logger = logger;
    this.storeId = opts.storeId;
    this.warehouseCode = opts.warehouseCode;
  }
  /**
   * Submit stock-in transaction (nhập kho).
   *
   * POST /transactions/stock-in → returns transaction_id → auto-polls until terminal.
   */
  async stockIn(opts, apiOpts) {
    const resolvedOpts = { traceId: apiOpts?.traceId ?? generateTraceId(), ...apiOpts };
    const txId = await this.postTransaction(CSDL_DUOC_ENDPOINTS.STOCK_IN, opts, "stock-in", resolvedOpts);
    return this.pollTransaction("stock-in", txId, resolvedOpts);
  }
  /**
   * Submit stock-out transaction (xuất kho).
   *
   * POST /transactions/stock-out → returns transaction_id → auto-polls until terminal.
   */
  async stockOut(opts, apiOpts) {
    const resolvedOpts = { traceId: apiOpts?.traceId ?? generateTraceId(), ...apiOpts };
    const txId = await this.postTransaction(CSDL_DUOC_ENDPOINTS.STOCK_OUT, opts, "stock-out", resolvedOpts);
    return this.pollTransaction("stock-out", txId, resolvedOpts);
  }
  /**
   * Submit stock-taking transaction (kiểm kho).
   *
   * POST /transactions/stock-taking → returns transaction_id → auto-polls until terminal.
   */
  async stockTaking(opts, apiOpts) {
    const resolvedOpts = { traceId: apiOpts?.traceId ?? generateTraceId(), ...apiOpts };
    const txId = await this.postTransaction(CSDL_DUOC_ENDPOINTS.STOCK_TAKING, opts, "stock-taking", resolvedOpts);
    return this.pollTransaction("stock-taking", txId, resolvedOpts);
  }
  async pollTransaction(type, transactionId, apiOpts) {
    const endpoint = `/transactions/${type}/${transactionId}/status`;
    let attempts = 0;
    let errorRetries = 0;
    const traceId = apiOpts?.traceId;
    while (attempts < POLL_MAX_ATTEMPTS) {
      attempts++;
      try {
        const statusObj = await this.http.get(endpoint, { traceId });
        const rawStatus = statusObj["status"] ?? statusObj["status_code"] ?? "";
        const statusCode = rawStatus.toLowerCase();
        this.logger.debug(`Poll attempt ${attempts}: status=${rawStatus}`, {
          transactionId,
          type,
          traceId
        });
        if (TERMINAL_STATUSES.includes(statusCode)) {
          const timedOut = false;
          const result = {
            transactionId,
            status: statusCode,
            raw: statusObj
          };
          if (statusCode === SUCCESS_STATUS) {
            this.logger.info(`Transaction completed successfully`, { transactionId, attempts, traceId });
          } else {
            this.logger.warn(`Transaction ${statusCode}`, {
              transactionId,
              status: statusObj,
              attempts,
              traceId
            });
          }
          return { ...result, timedOut, attempts };
        }
        if (statusCode === "accepted") {
          await sleep(POLL_ACCEPTED_DELAY_MS);
        } else if (statusCode === "processing") {
          await sleep(POLL_PROCESSING_DELAY_MS);
        } else {
          await sleep(POLL_ACCEPTED_DELAY_MS);
        }
      } catch (err) {
        this.logger.warn(`Poll error on attempt ${attempts}: ${err.message}`, { traceId });
        errorRetries++;
        if (errorRetries > POLL_MAX_ERROR_RETRIES) {
          return {
            transactionId,
            status: "error",
            raw: { messages: ["Polling error after max error retries"] },
            timedOut: false,
            attempts
          };
        }
        await sleep(POLL_ERROR_RETRY_DELAY_MS);
      }
    }
    return {
      transactionId,
      status: "error",
      raw: { messages: ["Polling timeout"] },
      timedOut: true,
      attempts
    };
  }
  // ─── Internal: Build payload and POST ───────────────────────
  async postTransaction(endpoint, opts, type, apiOpts) {
    const payload = this.buildPayload(opts, type);
    const traceId = apiOpts?.traceId;
    const data = await this.http.post(endpoint, payload, { traceId });
    const txId = data["transaction_id"] ?? data["id"] ?? "";
    this.logger.info(`Transaction submitted: ${txId}`, { type, traceId });
    return txId;
  }
  buildPayload(opts, type) {
    const items = "items" in opts ? opts.items.map(mapStockItem) : [];
    const reason = type === "stock-in" || type === "stock-out" ? mapReason(opts.reason, type) : void 0;
    const payload = {
      store_id: this.storeId,
      items,
      transaction_date: "transactionDate" in opts && opts.transactionDate ? opts.transactionDate : formatDateTime(/* @__PURE__ */ new Date())
    };
    if (this.warehouseCode) {
      payload["warehouse_code"] = this.warehouseCode;
    }
    if (reason) payload["reason"] = reason;
    if ("referenceNumber" in opts && opts.referenceNumber)
      payload["reference_number"] = opts.referenceNumber;
    if ("note" in opts && opts.note) payload["note"] = opts.note;
    if (type === "stock-in") {
      const si = opts;
      if (si.reason === "supplier" && si.supplierId) {
        payload["supplier_id"] = si.supplierId;
      }
      if (si.reason === "transfer-in") {
        if (si.sourceStoreId) payload["source_store_id"] = si.sourceStoreId;
        if (si.sourceWarehouseId) payload["source_warehouse_id"] = si.sourceWarehouseId;
        if (si.targetStoreId) payload["target_store_id"] = si.targetStoreId;
        if (si.targetWarehouseId) payload["target_warehouse_id"] = si.targetWarehouseId;
      }
    }
    if (type === "stock-out") {
      const so = opts;
      if (so.reason === "return" && so.supplierId) {
        payload["supplier_id"] = so.supplierId;
      }
      if (so.reason === "transfer-out") {
        if (so.sourceStoreId) payload["source_store_id"] = so.sourceStoreId;
        if (so.sourceWarehouseId) payload["source_warehouse_id"] = so.sourceWarehouseId;
        if (so.targetStoreId) payload["target_store_id"] = so.targetStoreId;
        if (so.targetWarehouseId) payload["target_warehouse_id"] = so.targetWarehouseId;
      }
    }
    return payload;
  }
};
function mapReason(reason, type) {
  if (type === "stock-in") {
    const allowed = [
      "supplier",
      "return",
      "transfer-in",
      "manufactured",
      "opening-balance",
      "imported"
    ];
    if (!allowed.includes(reason)) {
      throw new Error(`Invalid stock-in reason: ${reason}. Must be one of: ${allowed.join(", ")}`);
    }
    return reason;
  }
  if (type === "stock-out") {
    const allowed = ["sale-retail", "return", "transfer-out", "destroy", "other"];
    if (!allowed.includes(reason)) {
      throw new Error(`Invalid stock-out reason: ${reason}. Must be one of: ${allowed.join(", ")}`);
    }
    return reason;
  }
  return reason;
}
function mapStockItem(item) {
  const payload = {
    drug_id: item.drugId,
    unit_id: item.unitId,
    quantity: item.quantity
  };
  if (item.batchNo) payload["batch_no"] = item.batchNo;
  if (item.expiryDate) payload["expiry_date"] = formatExpiryDate(item.expiryDate);
  if (item.price !== void 0) payload["price"] = item.price;
  if (item.gtin) payload["gtin"] = item.gtin;
  if (item.manufacturer) {
    const m = item.manufacturer;
    payload["manufacturer"] = {
      id: m.id,
      name: m.name
    };
  }
  return payload;
}
function formatDateTime(date) {
  const utcMs = date.getTime() + date.getTimezoneOffset() * 6e4 + 7 * 36e5;
  const d = new Date(utcMs);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}+07:00`;
}
function formatExpiryDate(value) {
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return formatDateTime(d);
}
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// src/csdl-duoc/index.ts
var CsdlDuocClient = class {
  drugs;
  masterData;
  inventory;
  constructor(http, portalHttp, logger, _auth, opts) {
    this.drugs = new DrugClient(http, portalHttp, logger);
    this.masterData = new MasterDataClient(http);
    this.inventory = new InventoryClient(http, logger, {
      storeId: opts?.storeId,
      warehouseCode: opts?.warehouseCode
    });
  }
};

// src/qd228/prescriptions.ts
var PrescriptionClient = class {
  http;
  logger;
  constructor(http, logger) {
    this.http = http;
    this.logger = logger;
  }
  /**
   * Look up a prescription by code.
   *
   * GET /api/v1/thong-tin-don-thuoc/{maDonThuoc}
   */
  async get(maDonThuoc) {
    const url = `${NATIONAL_RX_ENDPOINTS.PRESCRIPTION_INFO}/${encodeURIComponent(maDonThuoc)}`;
    const data = await this.http.get(url);
    return mapPrescription(maDonThuoc, data);
  }
  /**
   * Update prescription sale quantity (UC05).
   *
   * POST /api/v1/cap-nhat-don-thuoc
   *
   * Retries up to QD228_MAX_RETRIES (2) times with QD228_RETRY_DELAY_MS (30s) delay.
   * Ported from `NationalRxService.update_prescription_sale_qty()` lines 411-477.
   */
  async updateSaleQty(opts) {
    const payload = buildPrescriptionUpdatePayload(opts);
    let lastError;
    let status = 0;
    let data;
    for (let attempt = 0; attempt <= QD228_MAX_RETRIES; attempt++) {
      try {
        const result = await this.http.post(
          NATIONAL_RX_ENDPOINTS.UPDATE_PRESCRIPTION,
          payload
        );
        status = 200;
        data = result;
        this.logger.info("Prescription sale quantity updated", {
          maDonThuoc: opts.maDonThuoc,
          attempt: attempt + 1
        });
        return { success: true, status, data };
      } catch (err) {
        this.logger.warn(
          `Prescription sale qty update failed (attempt ${attempt + 1}/${QD228_MAX_RETRIES + 1}): ${err.message}`
        );
        lastError = err;
        if (err instanceof Error && "status" in err) {
          status = err.status ?? 0;
        }
        if (attempt < QD228_MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, QD228_RETRY_DELAY_MS));
        }
      }
    }
    this.logger.error("Prescription sale qty update failed after all retries", {
      maDonThuoc: opts.maDonThuoc,
      error: lastError?.message
    });
    return {
      success: false,
      status,
      error: lastError?.message ?? "Update failed after retries"
    };
  }
};
function mapPrescription(maDonThuoc, data) {
  const parsed = PrescriptionSchema.safeParse(data);
  const rxData = parsed.success ? parsed.data : {};
  const rxItems = rxData.thong_tin_don_thuoc ?? rxData.items ?? data["thong_tin_don_thuoc"] ?? data["items"] ?? [];
  let diagnosisStr = "";
  const rawDiagnosis = rxData.chan_doan ?? data["chan_doan"];
  if (Array.isArray(rawDiagnosis)) {
    diagnosisStr = rawDiagnosis.map((c) => {
      if (typeof c === "object" && c !== null) {
        const ten = c["ten_chan_doan"];
        const ma = c["ma_chan_doan"];
        return ten || ma || "";
      }
      return String(c);
    }).filter(Boolean).join(", ");
  } else if (rawDiagnosis) {
    diagnosisStr = String(rawDiagnosis);
  }
  return {
    maDonThuoc,
    patientBirthDate: rxData.ngay_sinh_benh_nhan ?? data["ngay_sinh_benh_nhan"],
    patientName: rxData.ho_ten_benh_nhan ?? data["ho_ten_benh_nhan"],
    patientHealthId: rxData.ma_dinh_danh_y_te ?? data["ma_dinh_danh_y_te"],
    diagnosis: diagnosisStr || void 0,
    doctorName: rxData.ten_bac_si ?? data["ten_bac_si"],
    facilityName: rxData.ten_co_so_kham_chua_benh ?? rxData.ten_co_so_kham ?? data["ten_co_so_kham_chua_benh"] ?? data["ten_co_so_kham"],
    items: rxItems.map((item) => {
      const rawQty = item["so_luong"] ?? item["so_luong_to"] ?? item["prescribed_quantity"] ?? item["quantity"];
      const parsedQty = rawQty !== void 0 && rawQty !== null ? Number(rawQty) : void 0;
      return {
        drugCode: item["ma_thuoc"] ?? item["drug_code"] ?? item["ma_thuoc_qg"],
        drugName: item["ten_thuoc"] ?? item["drug_name"] ?? item["name"] ?? item["biet_duoc"],
        unitName: item["don_vi_tinh"] ?? item["don_vi"] ?? item["unit_name"],
        prescribedQuantity: parsedQty && !isNaN(parsedQty) ? parsedQty : void 0,
        usageInstruction: item["cach_dung"] ?? item["usage_instruction"],
        price: item["don_gia"],
        raw: item
      };
    }),
    raw: data
  };
}
function buildPrescriptionUpdatePayload(opts) {
  const payload = {
    ma_don_thuoc: opts.maDonThuoc,
    thong_tin_thuoc: opts.items.map((item) => ({
      ma_thuoc: item.drugId,
      ten_thuoc: item.drugName,
      don_vi: item.unitName,
      so_luong_to: item.prescribedQuantity,
      so_luong_ban: item.soldQuantity,
      cach_dung: item.usageInstruction
    }))
  };
  if (opts.pharmacyName) payload["co_so_kham"] = opts.pharmacyName;
  if (opts.pharmacyPhone) payload["so_dien_thoai"] = opts.pharmacyPhone;
  if (opts.pharmacyAddress) payload["dia_chi"] = opts.pharmacyAddress;
  if (opts.invoiceNumber) payload["so_hoa_don"] = opts.invoiceNumber;
  return payload;
}

// src/qd228/index.ts
var Qd228Client = class {
  prescriptions;
  constructor(http, logger) {
    this.prescriptions = new PrescriptionClient(http, logger);
  }
};

// src/http/retry.ts
function shouldRetry(status, retryOpts) {
  const maxRetries = retryOpts?.maxRetries ?? 3;
  if (maxRetries <= 0) return false;
  if (status === 429) return true;
  if (status >= 500 && status < 600) return true;
  return false;
}
function getRetryDelay(attempt, status, response, retryOpts) {
  const baseDelay = retryOpts?.baseDelayMs ?? 5e3;
  const maxDelay = retryOpts?.maxDelayMs ?? 3e4;
  if (status === 429 && response) {
    const retryAfter = response.headers.get("Retry-After");
    if (retryAfter) {
      const parsed = parseInt(retryAfter, 10);
      if (!isNaN(parsed) && parsed > 0) {
        return Math.min(parsed * 1e3, maxDelay);
      }
    }
    return baseDelay;
  }
  const exponential = baseDelay * Math.pow(2, Math.min(attempt, 5));
  const jitter = Math.random() * 1e3;
  return Math.min(exponential + jitter, maxDelay);
}

// src/http/logging-utils.ts
var SECRET_FIELDS = /* @__PURE__ */ new Set(["password", "token", "access_token", "appKey", "app-key"]);
function maskSecrets(data) {
  if (data === null || data === void 0) return data;
  if (typeof data === "string") return data;
  if (typeof data === "number" || typeof data === "boolean") return data;
  if (Array.isArray(data)) {
    return data.map(maskSecrets);
  }
  if (typeof data === "object") {
    const masked = {};
    for (const [key, value] of Object.entries(data)) {
      if (SECRET_FIELDS.has(key.toLowerCase())) {
        masked[key] = "***";
      } else if (typeof value === "object" && value !== null) {
        masked[key] = maskSecrets(value);
      } else {
        masked[key] = value;
      }
    }
    return masked;
  }
  return data;
}
function truncateLogBody(body) {
  if (body.length <= API_LOG_BODY_MAX) return body;
  return `${body.slice(0, API_LOG_BODY_MAX)}... [truncated, total ${body.length} chars]`;
}

// src/http/http-client.ts
var import_undici2 = require("undici");
var DrugPortalError = class extends Error {
  status;
  traceId;
  responseBody;
  data;
  constructor(message, opts) {
    super(message);
    this.name = "DrugPortalError";
    this.status = opts.status;
    this.traceId = opts.traceId;
    this.responseBody = opts.responseBody;
    this.data = opts.data;
  }
};
var HttpClient = class {
  baseUrl;
  logger;
  retryOpts;
  defaultHeaders;
  proxyAgent;
  auth;
  constructor(opts, auth) {
    this.baseUrl = opts.baseUrl;
    this.logger = opts.logger;
    this.retryOpts = opts.retry;
    this.defaultHeaders = opts.defaultHeaders ?? {};
    this.auth = auth;
    this.proxyAgent = opts.proxyUrl ? new import_undici2.ProxyAgent(opts.proxyUrl) : void 0;
  }
  setAuth(auth) {
    this.auth = auth;
  }
  async request(path2, init = {}) {
    const traceId = init.traceId ?? generateTraceId();
    const url = this.buildUrl(path2, init.queryParams);
    const method = init.method ?? "GET";
    const contentType = init.contentType ?? "json";
    let bodyStr;
    let contentHeader = {};
    if (init.body !== void 0) {
      if (contentType === "form") {
        bodyStr = new URLSearchParams(init.body).toString();
        contentHeader = { "Content-Type": "application/x-www-form-urlencoded" };
      } else {
        bodyStr = JSON.stringify(init.body);
        contentHeader = { "Content-Type": "application/json" };
      }
    }
    const headers = {
      ...contentHeader,
      ...this.defaultHeaders,
      ...init.headers ?? {},
      // [Giải thích] Trước khi gửi, gọi AuthProvider để lấy Bearer Token nhét vào Header. 
      // Nếu token chưa có/hết hạn, quá trình này sẽ tự động chặn lại để đi Login lấy Token.
      ...this.auth ? await this.auth.getAuthHeaders(traceId) : {}
    };
    const timeoutMs = this.retryOpts?.timeoutMs ?? 3e4;
    const maxRetries = this.retryOpts?.maxRetries ?? 3;
    this.logRequest(method, url, traceId, init.body);
    let retriesUsed = 0;
    let did401Retry = false;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const resp = await fetch(url, {
          method,
          headers,
          body: bodyStr,
          signal: controller.signal,
          ...this.proxyAgent ? { dispatcher: this.proxyAgent } : {}
        });
        clearTimeout(timer);
        if (resp.status === 401 && !did401Retry && this.auth) {
          did401Retry = true;
          this.logger.warn(`[${traceId}] 401 Unauthorized \u2014 refreshing auth and retrying`, { traceId });
          const refreshed = await this.auth.onUnauthorized(traceId);
          if (refreshed) {
            Object.assign(headers, await this.auth.getAuthHeaders(traceId));
            continue;
          }
          throw new DrugPortalError("Authentication failed after 401", {
            status: 401,
            traceId,
            responseBody: await resp.text()
          });
        }
        if (shouldRetry(resp.status, this.retryOpts) && attempt < maxRetries) {
          const delay = getRetryDelay(attempt, resp.status, resp, this.retryOpts);
          this.logger.warn(
            `[${traceId}] HTTP ${resp.status} \u2014 retry ${attempt + 1}/${maxRetries} in ${delay}ms`
          );
          await new Promise((r) => setTimeout(r, delay));
          retriesUsed = attempt + 1;
          continue;
        }
        const text = await resp.text();
        this.logResponse(method, url, resp.status, traceId, text, retriesUsed);
        if (!resp.ok) {
          throw new DrugPortalError(`HTTP ${resp.status}: ${text.slice(0, 200)}`, {
            status: resp.status,
            traceId,
            responseBody: text
          });
        }
        if (!text) return {};
        try {
          return JSON.parse(text);
        } catch {
          return text;
        }
      } catch (err) {
        clearTimeout(timer);
        if (err instanceof DrugPortalError) throw err;
        const isAbort = err instanceof Error && err.name === "AbortError";
        const isTransient = err instanceof TypeError || // network errors in Node fetch
        isAbort;
        if (isTransient && attempt < maxRetries) {
          const delay = getRetryDelay(attempt, 0, void 0, this.retryOpts);
          this.logger.warn(
            `[${traceId}] ${isAbort ? "Timeout" : "Network error"} \u2014 retry ${attempt + 1}/${maxRetries} in ${delay}ms`
          );
          await new Promise((r) => setTimeout(r, delay));
          retriesUsed = attempt + 1;
          continue;
        }
        throw new DrugPortalError(
          isAbort ? `Request timeout after ${timeoutMs}ms` : `Network error: ${err.message}`,
          { traceId }
        );
      }
    }
    throw new DrugPortalError("Max retries exceeded", { traceId });
  }
  // ─── Convenience methods ─────────────────────────────────────
  async get(path2, opts) {
    return this.request(path2, { method: "GET", ...opts });
  }
  async post(path2, body, opts) {
    return this.request(path2, { method: "POST", body, ...opts });
  }
  // ─── Internals ───────────────────────────────────────────────
  buildUrl(path2, queryParams) {
    const base = this.baseUrl.replace(/\/+$/, "");
    const cleanPath = path2.replace(/^\/+/, "");
    const url = new URL(`${base}/${cleanPath}`);
    if (queryParams) {
      for (const [key, value] of Object.entries(queryParams)) {
        if (value !== void 0 && value !== null) {
          url.searchParams.set(key, String(value));
        }
      }
    }
    return url.toString();
  }
  logRequest(method, url, traceId, body) {
    this.logger.debug(`\u2192 ${method} ${url}`, {
      traceId,
      body: body ? maskSecrets(body) : void 0
    });
  }
  logResponse(method, url, status, traceId, body, retries) {
    const level = status >= 400 ? "warn" : "debug";
    this.logger[level](`\u2190 ${status} ${method} ${url}`, {
      traceId,
      retries,
      body: truncateLogBody(body)
    });
  }
};

// src/types/config.ts
function resolveCsdlDuocBaseUrl(config) {
  if (config.csdlDuocBaseUrl) return config.csdlDuocBaseUrl;
  return config.environment === "production" ? "https://api.csdlduoc.com.vn/v2" : "https://api-sandbox.csdlduoc.com.vn/v2";
}
function resolvePortalApiRoot(baseUrl) {
  return baseUrl.replace(/\/v2\/?$/, "");
}
function resolveNationalRxBaseUrl(config) {
  return config.nationalRxBaseUrl ?? "https://donthuocquocgia.vn";
}

// src/client.ts
var DrugPortalClient = class {
  /** CSDL Dược (QĐ 522) sub-client */
  csdlDuoc;
  /** Cổng Đơn Thuốc (QĐ 228) sub-client — undefined if no qd228 config provided */
  qd228;
  logger;
  constructor(config) {
    this.logger = config.logger ?? new StructuredLogger("DrugPortalSDK");
    const csdlDuocBaseUrl = resolveCsdlDuocBaseUrl(config);
    let csdlDuocAuth;
    let mainHttp;
    if (config.csdlDuoc) {
      csdlDuocAuth = new CsdlDuocAuth({
        config: config.csdlDuoc,
        baseUrl: csdlDuocBaseUrl,
        logger: this.logger,
        tokenTtlHours: config.tokenTtlHours,
        onTokenChange: config.onTokenChange,
        proxyUrl: config.proxyUrl
      });
      if (config.cachedToken && config.cachedTokenExpiresAt) {
        csdlDuocAuth.setCachedToken(config.cachedToken, config.cachedTokenExpiresAt);
      }
      mainHttp = new HttpClient(
        {
          baseUrl: csdlDuocBaseUrl,
          logger: this.logger,
          retry: config.retry,
          proxyUrl: config.proxyUrl
        },
        csdlDuocAuth
      );
    }
    const portalHttp = mainHttp ? new HttpClient(
      {
        baseUrl: resolvePortalApiRoot(csdlDuocBaseUrl),
        logger: this.logger,
        retry: config.retry,
        proxyUrl: config.proxyUrl
      },
      csdlDuocAuth
    ) : void 0;
    this.csdlDuoc = new CsdlDuocClient(mainHttp, portalHttp, this.logger, csdlDuocAuth, {
      storeId: config.csdlDuoc?.storeId,
      warehouseCode: config.csdlDuoc?.warehouseCode
    });
    if (config.qd228) {
      const nationalRxBaseUrl = resolveNationalRxBaseUrl(config);
      const qd228Auth = new Qd228Auth(config.qd228, this.logger);
      const qd228Http = new HttpClient(
        {
          baseUrl: nationalRxBaseUrl,
          logger: this.logger,
          retry: config.retry,
          proxyUrl: config.proxyUrl
        },
        qd228Auth
      );
      this.qd228 = new Qd228Client(qd228Http, this.logger);
    }
    this.logger.info("DrugPortalClient initialized", {
      environment: config.environment,
      hasCsdlDuoc: !!config.csdlDuoc,
      hasQd228: !!config.qd228
    });
  }
};

// src/testing/mock-client.ts
var MockDrugPortalClient = class extends DrugPortalClient {
  constructor() {
    super({
      environment: "sandbox",
      csdlDuoc: { username: "mock_user", password: "mock_password" },
      qd228: { appName: "mock_app", appKey: "mock_key" }
    });
    this.csdlDuoc.drugs.search = async (keyword) => this.mockSearchDrugs(keyword);
    this.csdlDuoc.drugs.getDetail = async (id) => this.mockGetDrugDetail(id);
    this.csdlDuoc.inventory.stockIn = async () => this.mockStockIn();
    this.csdlDuoc.inventory.stockOut = async () => this.mockStockOut();
    if (this.qd228) {
      this.qd228.prescriptions.get = async (code) => this.mockGetPrescription(code);
      this.qd228.prescriptions.updateSaleQty = async () => ({
        success: true,
        status: 200,
        data: {}
      });
    }
  }
  // Pre-configured mock data stores that you can modify in tests
  mockDrugs = [
    {
      id: "1",
      name: "Paracetamol 500mg",
      registrationNumber: "VD-12345-20",
      baseUnit: "Vi\xEAn",
      source: "pos"
    },
    {
      id: "2",
      name: "Ibuprofen 400mg",
      registrationNumber: "VD-67890-21",
      baseUnit: "Vi\xEAn",
      source: "master"
    }
  ];
  mockPrescriptions = {
    "DT-001": {
      maDonThuoc: "DT-001",
      patientName: "Nguyen Van A",
      patientBirthDate: "1990-01-01",
      diagnosis: "C\u1EA3m c\xFAm",
      doctorName: "Dr. John Doe",
      facilityName: "B\u1EC7nh vi\u1EC7n B\u1EA1ch Mai",
      items: [
        {
          drugCode: "1",
          drugName: "Paracetamol 500mg",
          unitName: "Vi\xEAn",
          prescribedQuantity: 10,
          price: 1e3
        }
      ],
      raw: {}
    }
  };
  async mockSearchDrugs(keyword) {
    const items = this.mockDrugs.filter(
      (d) => d.name.toLowerCase().includes(keyword.toLowerCase())
    );
    return { items, total: items.length };
  }
  async mockGetDrugDetail(id) {
    const drug = this.mockDrugs.find((d) => d.id === id);
    if (!drug) throw new Error(`Drug with ID ${id} not found in mock store`);
    return {
      id: drug.id,
      name: drug.name,
      registrationNumber: drug.registrationNumber,
      packagings: [],
      activeIngredients: [],
      conversionRate: 1,
      raw: {}
    };
  }
  async mockStockIn() {
    return {
      transactionId: "tx-mock-in-" + Date.now(),
      status: "completed",
      attempts: 1,
      timedOut: false
    };
  }
  async mockStockOut() {
    return {
      transactionId: "tx-mock-out-" + Date.now(),
      status: "completed",
      attempts: 1,
      timedOut: false
    };
  }
  async mockGetPrescription(code) {
    const rx = this.mockPrescriptions[code];
    if (!rx) throw new Error(`Prescription ${code} not found in mock store`);
    return rx;
  }
};

// src/auth/token-store.ts
var fs = __toESM(require("fs/promises"), 1);
var path = __toESM(require("path"), 1);
var MemoryTokenStore = class {
  cache = /* @__PURE__ */ new Map();
  async get(key) {
    const raw = this.cache.get(key);
    if (!raw) return null;
    try {
      const data = JSON.parse(raw);
      return {
        accessToken: data.accessToken,
        expiresAt: new Date(data.expiresAt)
      };
    } catch {
      return null;
    }
  }
  async set(key, state) {
    this.cache.set(key, JSON.stringify(state));
  }
  async clear(key) {
    this.cache.delete(key);
  }
};
var FileTokenStore = class {
  filePath;
  constructor(filePath = ".token_cache.json") {
    this.filePath = path.resolve(filePath);
  }
  async readCache() {
    try {
      const content = await fs.readFile(this.filePath, "utf-8");
      return JSON.parse(content);
    } catch {
      return {};
    }
  }
  async writeCache(cache) {
    try {
      await fs.mkdir(path.dirname(this.filePath), { recursive: true });
      await fs.writeFile(this.filePath, JSON.stringify(cache, null, 2), "utf-8");
    } catch {
    }
  }
  async get(key) {
    const cache = await this.readCache();
    const raw = cache[key];
    if (!raw) return null;
    try {
      const data = JSON.parse(raw);
      return {
        accessToken: data.accessToken,
        expiresAt: new Date(data.expiresAt)
      };
    } catch {
      return null;
    }
  }
  async set(key, state) {
    const cache = await this.readCache();
    cache[key] = JSON.stringify(state);
    await this.writeCache(cache);
  }
  async clear(key) {
    const cache = await this.readCache();
    delete cache[key];
    await this.writeCache(cache);
  }
};
var RedisTokenStore = class {
  client;
  prefix;
  constructor(client, prefix = "drug_portal_token:") {
    this.client = client;
    this.prefix = prefix;
  }
  async get(key) {
    const raw = await this.client.get(`${this.prefix}${key}`);
    if (!raw) return null;
    try {
      const data = JSON.parse(raw);
      return {
        accessToken: data.accessToken,
        expiresAt: new Date(data.expiresAt)
      };
    } catch {
      return null;
    }
  }
  async set(key, state) {
    const redisKey = `${this.prefix}${key}`;
    const value = JSON.stringify(state);
    const ttlSeconds = Math.max(0, Math.floor((state.expiresAt.getTime() - Date.now()) / 1e3));
    if (ttlSeconds > 0) {
      await this.client.set(redisKey, value, "EX", ttlSeconds);
    } else {
      await this.client.set(redisKey, value);
    }
  }
  async clear(key) {
    await this.client.del(`${this.prefix}${key}`);
  }
};

// src/index.ts
var index_default = DrugPortalClient;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  CsdlDuocAuth,
  CsdlDuocClient,
  DrugPortalClient,
  DrugPortalError,
  FileTokenStore,
  MemoryTokenStore,
  MockDrugPortalClient,
  Qd228Auth,
  Qd228Client,
  RedisTokenStore,
  StructuredLogger
});
//# sourceMappingURL=index.cjs.map