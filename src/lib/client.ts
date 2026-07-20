import { DrugPortalClient } from '@icare1/drug-portal-sdk';
import { prisma } from './prisma';
import { ProxyAgent } from 'undici';
import { SystemConfig } from '@prisma/client';

let cachedClient: DrugPortalClient | null = null;
let cachedFallbackProxy: string | null = null;
let isScraping = false;

// Helper to test if we can reach CSDL Dược Sandbox directly
async function checkDirectConnection(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 2000);
    // HEAD request to the sandbox domain to check availability
    await fetch('https://api-sandbox.csdlduoc.com.vn', {
      method: 'HEAD',
      signal: controller.signal
    });
    clearTimeout(id);
    return true;
  } catch (err) {
    console.log('[Fallback Proxy] Direct connection to CSDL Dược Sandbox failed:', (err as Error).message);
    return false;
  }
}

// Helper to test if a proxy is alive
async function testProxy(proxyUrl: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 3000);
    await fetch('https://api-sandbox.csdlduoc.com.vn', {
      method: 'HEAD',
      signal: controller.signal,
      dispatcher: new ProxyAgent(proxyUrl)
    } as unknown as RequestInit);
    clearTimeout(id);
    return true;
  } catch {
    return false;
  }
}

// Helper to scrape and find a working SOCKS5 proxy in Vietnam
async function getAutomaticFallbackProxy(): Promise<string | null> {
  if (cachedFallbackProxy) {
    const works = await testProxy(cachedFallbackProxy);
    if (works) {
      console.log(`[Fallback Proxy] Reusing cached proxy: ${cachedFallbackProxy}`);
      return cachedFallbackProxy;
    }
    cachedFallbackProxy = null;
  }

  if (isScraping) return null;
  isScraping = true;

  try {
    console.log('[Fallback Proxy] Scraping fresh Vietnamese HTTP/HTTPS/SOCKS5 proxies from Geonode API...');
    const res = await fetch('https://proxylist.geonode.com/api/proxy-list?limit=15&page=1&sort_by=lastChecked&sort_type=desc&country=VN&protocols=http%2Chttps%2Csocks5');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    const json = await res.json();
    const proxies = (json.data || []) as { ip: string; port: string; protocols: string[] }[];
    
    console.log(`[Fallback Proxy] Scraped ${proxies.length} proxies. Testing them in parallel...`);
    
    // Test in parallel to find first working one
    const testPromises = proxies.map(async (p) => {
      const isHttps = p.protocols.includes('https');
      const isHttp = p.protocols.includes('http');
      const protocol = isHttps || isHttp ? 'http' : 'socks5';
      const url = `${protocol}://${p.ip}:${p.port}`;
      const works = await testProxy(url);
      return works ? url : null;
    });

    const results = await Promise.all(testPromises);
    const workingProxy = results.find(url => url !== null);
    
    if (workingProxy) {
      console.log(`[Fallback Proxy] Successfully verified working proxy: ${workingProxy}`);
      cachedFallbackProxy = workingProxy;
      return workingProxy;
    }
    
    console.log('[Fallback Proxy] No working proxy found in the scraped list.');
    return null;
  } catch (err: unknown) {
    console.error('[Fallback Proxy] Failed to automatically acquire proxy:', (err as Error).message);
    return null;
  } finally {
    isScraping = false;
  }
}

export async function getClient(): Promise<DrugPortalClient | null> {
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

  return await createClientInstance(config);
}

export function resetClient() {
  cachedClient = null;
  cachedFallbackProxy = null; // Clear fallback proxy cache too
}

async function createClientInstance(config: SystemConfig): Promise<DrugPortalClient> {
  const hasCsdlDuoc = config.duocUsername && config.duocPassword;
  const hasQd228 = config.qd228AppName && config.qd228AppKey;

  let resolvedProxy: string | undefined = config.proxyUrl || undefined;

  // If no proxy configured, check if we need one
  if (!resolvedProxy) {
    console.log('[Fallback Proxy] No explicit proxy configured. Checking connection...');
    const canConnectDirectly = await checkDirectConnection();
    if (!canConnectDirectly) {
      console.log('[Fallback Proxy] Connection blocked. Attempting auto fallback proxy selection...');
      const fallback = await getAutomaticFallbackProxy();
      if (fallback) {
        resolvedProxy = fallback;
      }
    } else {
      console.log('[Fallback Proxy] Direct connection is available. Running without proxy.');
    }
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
