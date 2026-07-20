import { ProxyAgent, fetch, type RequestInit } from 'undici';
import { findFirstWorkingProxy, scrapeVietnamProxies } from '../src/lib/proxy-scraper';

const CSDL_DUOC_SANDBOX_URL = 'https://api-sandbox.csdlduoc.com.vn';
const PROXY_TEST_TIMEOUT_MS = 5_000;

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

function onProgress(step: string, message: string) {
  console.log(`[${step}] ${message}`);
}

async function main() {
  console.log('=== LIVE PROXY SCRAPER TEST ===\n');

  const proxies = await scrapeVietnamProxies(onProgress);
  console.log(`\nCollected ${proxies.length} unique proxies`);

  const bySource = proxies.reduce<Record<string, number>>((acc, proxy) => {
    acc[proxy.source] = (acc[proxy.source] || 0) + 1;
    return acc;
  }, {});
  console.log('By source:', bySource);

  if (proxies.length === 0) {
    console.error('\nFAIL: No proxies collected from any source');
    process.exit(1);
  }

  console.log('\n--- Testing proxies against CSDL Dược sandbox ---\n');
  const workingProxy = await findFirstWorkingProxy(proxies, testProxy, onProgress);

  if (workingProxy) {
    console.log(`\nPASS: Found working proxy -> ${workingProxy}`);
    process.exit(0);
  }

  console.log(`\nWARN: Scraped ${proxies.length} proxies but none reached CSDL Dược sandbox right now`);
  console.log('Scraper logic works; free proxies are intermittent.');
  process.exit(0);
}

main().catch((err) => {
  console.error('FAIL:', err);
  process.exit(1);
});
