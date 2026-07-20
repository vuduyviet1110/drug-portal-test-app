type ProxySource =
  | 'geonode'
  | 'proxyscrape-http'
  | 'proxyscrape-socks5'
  | 'proxifly'
  | 'proxy-list-download';

export type ScrapedProxy = {
  url: string;
  source: ProxySource;
};

const GEONODE_PROXY_PAGES = 3;
const GEONODE_PROXY_LIMIT = 20;
const PROXY_TEST_BATCH_SIZE = 30;

type GeonodeProxy = { ip: string; port: string; protocols: string[] };

type ProxiflyEntry = {
  proxy?: string;
  protocol?: string;
  ip?: string;
  port?: number;
};

function toHttpProxyUrl(ip: string, port: string | number): string {
  return `http://${ip}:${port}`;
}

function toSocks5ProxyUrl(ip: string, port: string | number): string {
  return `socks5://${ip}:${port}`;
}

function parseIpPortLines(text: string, protocol: 'http' | 'socks5', source: ProxySource): ScrapedProxy[] {
  const toUrl = protocol === 'http' ? toHttpProxyUrl : toSocks5ProxyUrl;
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(line))
    .map((line) => {
      const [ip, port] = line.split(':');
      return { url: toUrl(ip, port), source };
    });
}

function geonodeToProxyUrl(proxy: GeonodeProxy): string {
  const isHttps = proxy.protocols.includes('https');
  const isHttp = proxy.protocols.includes('http');
  const protocol = isHttps || isHttp ? 'http' : 'socks5';
  return `${protocol}://${proxy.ip}:${proxy.port}`;
}

async function safeFetchText(url: string, timeoutMs = 12_000): Promise<string | null> {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    if (!res.ok) return null;
    return await res.text();
  } catch (err) {
    console.warn(`[Proxy Scraper] Failed to fetch ${url}:`, (err as Error).message);
    return null;
  }
}

async function fetchGeonodeProxies(): Promise<ScrapedProxy[]> {
  const proxies: ScrapedProxy[] = [];
  const seen = new Set<string>();

  for (let page = 1; page <= GEONODE_PROXY_PAGES; page++) {
    const params = new URLSearchParams({
      limit: String(GEONODE_PROXY_LIMIT),
      page: String(page),
      sort_by: 'lastChecked',
      sort_type: 'desc',
      country: 'VN',
      protocols: 'http,https,socks5',
    });
    const text = await safeFetchText(`https://proxylist.geonode.com/api/proxy-list?${params}`);
    if (!text) break;

    const json = JSON.parse(text) as { data?: GeonodeProxy[] };
    const batch = json.data || [];
    for (const proxy of batch) {
      const key = `${proxy.ip}:${proxy.port}`;
      if (!seen.has(key)) {
        seen.add(key);
        proxies.push({ url: geonodeToProxyUrl(proxy), source: 'geonode' });
      }
    }
    if (batch.length < GEONODE_PROXY_LIMIT) break;
  }

  return proxies;
}

async function fetchProxyScrape(protocol: 'http' | 'socks5'): Promise<ScrapedProxy[]> {
  const params = new URLSearchParams({
    request: 'displayproxies',
    protocol,
    timeout: '10000',
    country: 'VN',
    ssl: 'all',
    anonymity: 'all',
  });
  const text = await safeFetchText(`https://api.proxyscrape.com/v2/?${params}`);
  if (!text?.trim()) return [];
  return parseIpPortLines(
    text,
    protocol,
    protocol === 'http' ? 'proxyscrape-http' : 'proxyscrape-socks5',
  );
}

async function fetchProxiflyProxies(): Promise<ScrapedProxy[]> {
  const text = await safeFetchText(
    'https://cdn.jsdelivr.net/gh/proxifly/free-proxy-list@main/proxies/countries/VN/data.json',
  );
  if (!text?.trim()) return [];

  try {
    const entries = JSON.parse(text) as ProxiflyEntry[];
    const proxies: ScrapedProxy[] = [];

    for (const entry of entries) {
      if (entry.proxy) {
        proxies.push({ url: entry.proxy, source: 'proxifly' });
        continue;
      }
      if (entry.ip && entry.port) {
        const protocol = entry.protocol === 'socks5' ? 'socks5' : 'http';
        const url =
          protocol === 'socks5'
            ? toSocks5ProxyUrl(entry.ip, entry.port)
            : toHttpProxyUrl(entry.ip, entry.port);
        proxies.push({ url, source: 'proxifly' });
      }
    }

    return proxies;
  } catch (err) {
    console.warn('[Proxy Scraper] Failed to parse Proxifly JSON:', (err as Error).message);
    return [];
  }
}

async function fetchProxyListDownload(type: 'http' | 'https'): Promise<ScrapedProxy[]> {
  const text = await safeFetchText(
    `https://www.proxy-list.download/api/v1/get?type=${type}&country=VN`,
  );
  if (!text?.trim() || text.toLowerCase().includes('error')) return [];
  return parseIpPortLines(text, 'http', 'proxy-list-download');
}

function dedupeProxies(proxies: ScrapedProxy[]): ScrapedProxy[] {
  const seen = new Set<string>();
  const result: ScrapedProxy[] = [];
  for (const proxy of proxies) {
    const key = proxy.url.replace(/^https?:\/\//, 'http://');
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(proxy);
  }
  return result;
}

export async function scrapeVietnamProxies(
  onProgress?: (step: string, message: string) => void,
): Promise<ScrapedProxy[]> {
  onProgress?.(
    'scraping_proxies',
    'Đang quét proxy VN từ nhiều nguồn (Geonode, ProxyScrape, Proxifly, Proxy-List)...',
  );

  const results = await Promise.allSettled([
    fetchGeonodeProxies(),
    fetchProxyScrape('http'),
    fetchProxyScrape('socks5'),
    fetchProxiflyProxies(),
    fetchProxyListDownload('http'),
    fetchProxyListDownload('https'),
  ]);

  const merged: ScrapedProxy[] = [];
  const sourceCounts: Record<string, number> = {};

  for (const result of results) {
    if (result.status !== 'fulfilled') continue;
    for (const proxy of result.value) {
      merged.push(proxy);
      sourceCounts[proxy.source] = (sourceCounts[proxy.source] || 0) + 1;
    }
  }

  const unique = dedupeProxies(merged);
  const summary = Object.entries(sourceCounts)
    .map(([source, count]) => `${source}: ${count}`)
    .join(', ');

  console.log(`[Proxy Scraper] Collected ${unique.length} unique VN proxies (${summary || 'no sources'})`);
  onProgress?.(
    'scraping_done',
    `Đã thu thập ${unique.length} proxy VN từ ${Object.keys(sourceCounts).length || 0} nguồn (${summary || 'không có nguồn nào phản hồi'}).`,
  );

  return unique;
}

export async function findFirstWorkingProxy(
  proxies: ScrapedProxy[],
  testProxy: (proxyUrl: string) => Promise<boolean>,
  onProgress?: (step: string, message: string) => void,
): Promise<string | null> {
  if (proxies.length === 0) return null;

  onProgress?.(
    'testing_proxies',
    `Đang kiểm tra ${proxies.length} proxy (theo lô ${PROXY_TEST_BATCH_SIZE})...`,
  );

  for (let i = 0; i < proxies.length; i += PROXY_TEST_BATCH_SIZE) {
    const batch = proxies.slice(i, i + PROXY_TEST_BATCH_SIZE);
    const batchNumber = Math.floor(i / PROXY_TEST_BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(proxies.length / PROXY_TEST_BATCH_SIZE);

    onProgress?.(
      'testing_proxy_batch',
      `Đang test lô ${batchNumber}/${totalBatches} (${batch.length} proxy)...`,
    );

    const results = await Promise.all(
      batch.map(async (proxy) => ((await testProxy(proxy.url)) ? proxy : null)),
    );
    const working = results.find((item) => item !== null);
    if (working) {
      console.log(`[Proxy Scraper] Working proxy from ${working.source}: ${working.url}`);
      onProgress?.(
        'proxy_found',
        `Đã tìm thấy proxy hoạt động (${working.source}): ${working.url}`,
      );
      return working.url;
    }
  }

  return null;
}
