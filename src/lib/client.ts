import { DrugPortalClient, clearFallbackProxyCache } from '@icare1/drug-portal-sdk';
import { prisma } from './prisma';
import { SystemConfig } from '@prisma/client';

let cachedClient: DrugPortalClient | null = null;

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

export function resetClient() {
  cachedClient = null;
  clearFallbackProxyCache();
}

async function createClientInstance(
  config: SystemConfig,
  onProgress?: (step: string, message: string) => void
): Promise<DrugPortalClient> {
  const hasCsdlDuoc = config.duocUsername && config.duocPassword;
  const hasQd228 = config.qd228AppName && config.qd228AppKey;
  const resolvedProxy = config.proxyUrl || config.autoResolvedProxyUrl || undefined;

  cachedClient = new DrugPortalClient({
    environment: 'sandbox',
    proxyUrl: resolvedProxy,
    autoFallbackProxy: !config.proxyUrl,
    onProxyProgress: onProgress,
    onProxyResolved: async (proxyUrl) => {
      try {
        await prisma.systemConfig.update({
          where: { id: 'default' },
          data: { autoResolvedProxyUrl: proxyUrl },
        });
      } catch (err) {
        console.warn('[Fallback Proxy] Failed to persist auto-resolved proxy:', err);
      }
    },
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
