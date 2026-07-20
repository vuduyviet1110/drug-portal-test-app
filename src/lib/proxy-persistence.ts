import { ensureSchema, prisma } from './prisma';

export async function loadPersistedProxyUrl(): Promise<string | null> {
  await ensureSchema();
  try {
    const config = await prisma.systemConfig.findUnique({
      where: { id: 'default' },
      select: { autoResolvedProxyUrl: true },
    });
    return config?.autoResolvedProxyUrl?.trim() || null;
  } catch (err) {
    console.warn('[Fallback Proxy] Failed to load persisted proxy:', (err as Error).message);
    return null;
  }
}

export async function savePersistedProxyUrl(proxyUrl: string): Promise<void> {
  await ensureSchema();
  try {
    await prisma.systemConfig.update({
      where: { id: 'default' },
      data: { autoResolvedProxyUrl: proxyUrl },
    });
  } catch (err) {
    console.warn('[Fallback Proxy] Failed to persist proxy URL:', (err as Error).message);
  }
}

export async function clearPersistedProxyUrl(): Promise<void> {
  await ensureSchema();
  try {
    await prisma.systemConfig.update({
      where: { id: 'default' },
      data: { autoResolvedProxyUrl: null },
    });
  } catch {
    // Config row may not exist yet.
  }
}
