import { DrugPortalClient } from '@icare1/drug-portal-sdk';
import { prisma } from './prisma';
import { ProxyAgent, fetch, type RequestInit } from 'undici';
import { SystemConfig } from '@prisma/client';
import { findFirstWorkingProxy, scrapeVietnamProxies } from './proxy-scraper';

let cachedClient: DrugPortalClient | null = null;
let cachedFallbackProxy: string | null = null;
let isScraping = false;

const CSDL_DUOC_SANDBOX_URL = 'https://api-sandbox.csdlduoc.com.vn';
const DIRECT_CHECK_TIMEOUT_MS = 10_000;
const DIRECT_RETRY_TIMEOUT_MS = 20_000;
const PROXY_TEST_TIMEOUT_MS = 5_000;

// Helper to test if we can reach CSDL Dược Sandbox directly
async function checkDirectConnection(timeoutMs = DIRECT_CHECK_TIMEOUT_MS): Promise<boolean> {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    await fetch(CSDL_DUOC_SANDBOX_URL, {
      method: 'HEAD',
      signal: controller.signal,
    });
    clearTimeout(id);
    return true;
  } catch (err) {
    console.log(
      `[Fallback Proxy] Direct connection to CSDL Dược Sandbox failed (${timeoutMs}ms):`,
      (err as Error).message,
    );
    return false;
  }
}

// Helper to test if a proxy is alive
async function testProxy(proxyUrl: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), PROXY_TEST_TIMEOUT_MS);
    const proxyRequest: RequestInit = {
      method: 'HEAD',
      signal: controller.signal,
      dispatcher: new ProxyAgent(proxyUrl),
    };
    await fetch(CSDL_DUOC_SANDBOX_URL, proxyRequest);
    clearTimeout(id);
    return true;
  } catch {
    return false;
  }
}

// Helper to scrape and find a working proxy in Vietnam from multiple free sources
async function getAutomaticFallbackProxy(
  onProgress?: (step: string, message: string) => void
): Promise<string | null> {
  if (cachedFallbackProxy) {
    onProgress?.('testing_cached_proxy', `Đang kiểm tra lại proxy lưu trong cache: ${cachedFallbackProxy}...`);
    const works = await testProxy(cachedFallbackProxy);
    if (works) {
      console.log(`[Fallback Proxy] Reusing cached proxy: ${cachedFallbackProxy}`);
      onProgress?.('reusing_cached_proxy', `Đang sử dụng lại proxy hoạt động tốt từ cache: ${cachedFallbackProxy}`);
      return cachedFallbackProxy;
    }
    cachedFallbackProxy = null;
  }

  if (isScraping) return null;
  isScraping = true;

  try {
    const proxies = await scrapeVietnamProxies(onProgress);
    const workingProxy = await findFirstWorkingProxy(proxies, testProxy, onProgress);

    if (workingProxy) {
      cachedFallbackProxy = workingProxy;
      return workingProxy;
    }

    console.log('[Fallback Proxy] No working proxy found across all sources.');
    onProgress?.(
      'proxy_not_found',
      `Không tìm thấy proxy miễn phí nào hoạt động (đã thử ${proxies.length} proxy từ nhiều nguồn). Thử lại sau vài giờ hoặc nhập proxy VN riêng.`,
    );
    return null;
  } catch (err: unknown) {
    console.error('[Fallback Proxy] Failed to automatically acquire proxy:', (err as Error).message);
    onProgress?.('proxy_error', `Lỗi khi lấy proxy tự động: ${(err as Error).message}`);
    return null;
  } finally {
    isScraping = false;
  }
}

export async function getClient(
  onProgress?: (step: string, message: string) => void
): Promise<DrugPortalClient | null> {
  if (cachedClient) return cachedClient;

  let config = await prisma.systemConfig.findUnique({
    where: { id: 'default' },
  });

  // If database config doesn't exist, try loading and seeding from .env
  if (!config) {
    const username = process.env.CSDL_DUOC_USERNAME;
    const password = process.env.CSDL_DUOC_PASSWORD;
    const storeId = process.env.CSDL_DUOC_STORE_ID;
    const warehouseCode = process.env.CSDL_DUOC_WAREHOUSE_CODE;
    const qd228AppName = process.env.QD228_APP_NAME?.trim();
    const qd228AppKey = process.env.QD228_APP_KEY?.trim();
    const proxyUrl = process.env.PROXY_URL?.trim();

    if (username && password) {
      config = await prisma.systemConfig.create({
        data: {
          id: 'default',
          duocUsername: username,
          duocPassword: password,
          duocStoreId: storeId || null,
          duocWarehouseCode: warehouseCode || null,
          qd228AppName: qd228AppName || null,
          qd228AppKey: qd228AppKey || null,
          proxyUrl: proxyUrl || null,
        },
      });
    }
  }

  if (!config) return null;

  return await createClientInstance(config, onProgress);
}

export function resetClient(options?: { clearProxyCache?: boolean }) {
  cachedClient = null;
  if (options?.clearProxyCache) {
    cachedFallbackProxy = null;
  }
}

async function createClientInstance(
  config: SystemConfig,
  onProgress?: (step: string, message: string) => void
): Promise<DrugPortalClient> {
  const hasCsdlDuoc = config.duocUsername && config.duocPassword;
  const hasQd228 = config.qd228AppName && config.qd228AppKey;

  let resolvedProxy: string | undefined = config.proxyUrl || undefined;

  // If no proxy configured, check if we need one
  if (!resolvedProxy) {
    console.log('[Fallback Proxy] No explicit proxy configured. Checking connection...');
    onProgress?.(
      'check_direct_connection',
      'Đang kiểm tra kết nối trực tiếp đến máy chủ CSDL Dược (có thể mất ~10 giây)...',
    );
    let canConnectDirectly = await checkDirectConnection();
    if (!canConnectDirectly) {
      console.log('[Fallback Proxy] Connection blocked or slow. Attempting auto fallback proxy selection...');
      onProgress?.(
        'direct_connection_blocked',
        'Kết nối trực tiếp chưa phản hồi kịp. Đang thử tìm proxy Việt Nam tự động...',
      );
      const fallback = await getAutomaticFallbackProxy(onProgress);
      if (fallback) {
        resolvedProxy = fallback;
      } else {
        onProgress?.(
          'retry_direct_connection',
          'Proxy tự động không khả dụng. Thử lại kết nối trực tiếp (chờ lâu hơn, ~20 giây)...',
        );
        canConnectDirectly = await checkDirectConnection(DIRECT_RETRY_TIMEOUT_MS);
        if (canConnectDirectly) {
          console.log('[Fallback Proxy] Direct connection succeeded on retry. Running without proxy.');
          onProgress?.(
            'direct_connection_success',
            'Kết nối trực tiếp thành công (chậm nhưng ổn). Không cần proxy.',
          );
        } else {
          onProgress?.(
            'connection_failed',
            'Không kết nối được CSDL Dược. Nếu deploy ngoài Việt Nam, hãy nhập Proxy URL VN trả phí rồi thử lại.',
          );
        }
      }
    } else {
      console.log('[Fallback Proxy] Direct connection is available. Running without proxy.');
      onProgress?.('direct_connection_success', 'Kết nối trực tiếp thành công! Không cần dùng proxy.');
    }
  } else {
    onProgress?.('using_configured_proxy', `Sử dụng cấu hình proxy tùy chọn: ${resolvedProxy}`);
  }

  cachedClient = new DrugPortalClient({
    environment: 'sandbox',
    proxyUrl: resolvedProxy,
    csdlDuoc: hasCsdlDuoc
      ? {
          username: config.duocUsername,
          password: config.duocPassword,
          storeId: config.duocStoreId || undefined,
          warehouseCode: config.duocWarehouseCode || undefined,
        }
      : undefined,
    qd228: hasQd228
      ? {
          appName: config.qd228AppName!,
          appKey: config.qd228AppKey!,
        }
      : undefined,
  });

  return cachedClient;
}
