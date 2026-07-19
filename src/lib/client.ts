import { DrugPortalClient } from '@icare1/drug-portal-sdk';
import { prisma } from './prisma';

let cachedClient: DrugPortalClient | null = null;

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

  return createClientInstance(config);
}

export function resetClient() {
  cachedClient = null;
}

function createClientInstance(config: any): DrugPortalClient {
  const hasCsdlDuoc = config.duocUsername && config.duocPassword;
  const hasQd228 = config.qd228AppName && config.qd228AppKey;

  cachedClient = new DrugPortalClient({
    environment: 'sandbox',
    proxyUrl: config.proxyUrl || undefined,
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
          appName: config.qd228AppName,
          appKey: config.qd228AppKey,
        }
      : undefined,
  });

  return cachedClient;
}
