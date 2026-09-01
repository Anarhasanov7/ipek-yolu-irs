// Cloudflare Pages Function middleware — anonymous page view tracking
// Privacy-friendly: no cookies, no PII, IP hashed daily (can't track across days).
// Synchronous with timeout: adds ~50-100ms but ensures tracking completes.

const SUPABASE_URL = 'https://glfizcgayqecnvtfihgy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdsZml6Y2dheXFlY252dGZpaGd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwMTAzMDUsImV4cCI6MjEwMzU4NjMwNX0.V9MiUESH7Xu1TG4tadkj9a7_wi-pouLPtv3yYTSEn0I';

const STATIC_EXTS = /\.(css|js|jpg|jpeg|png|gif|svg|ico|webp|woff|woff2|ttf|eot|otf|txt|xml|map|webmanifest|pdf|zip|mp4|webm|avif)$/i;
const BOT_UA = /bot|crawler|spider|googlebot|bingbot|yandexbot|facebookexternalhit|twitterbot|linkedinbot|telegrambot|whatsapp|preview/i;

function parseDevice(ua) {
  if (/iPad|Tablet|PlayBook|Silk/i.test(ua)) return 'tablet';
  if (/Mobile|Android|iPhone|iPod|BlackBerry|Opera Mini|IEMobile|Windows Phone/i.test(ua)) return 'mobile';
  return 'desktop';
}

function normalizePath(pathname) {
  let p = pathname.replace(/\.html$/, '').replace(/\/$/, '');
  if (p === '') p = '/';
  return p;
}

function normalizeReferrer(referrer) {
  if (!referrer) return null;
  try {
    const url = new URL(referrer);
    const host = url.hostname;
    if (host === 'gtdib.org' || host.endsWith('.gtdib.org') ||
        host === 'gtdib-site.pages.dev' || host.endsWith('.gtdib-site.pages.dev')) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

async function trackPageView(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  if (STATIC_EXTS.test(pathname)) return 'skip-static';
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/')) return 'skip-admin';

  const ua = request.headers.get('User-Agent') || '';
  if (BOT_UA.test(ua)) return 'skip-bot';

  const accept = request.headers.get('Accept') || '';
  if (!accept.includes('text/html') && pathname.includes('.')) return 'skip-nonhtml';

  const path = normalizePath(pathname);
  const country = (request.cf && request.cf.country) ? request.cf.country : null;
  const referrer = normalizeReferrer(request.headers.get('Referer'));
  const device = parseDevice(ua);
  const ip = request.headers.get('CF-Connecting-IP') || '';
  const dateStr = new Date().toISOString().slice(0, 10);

  let visitorHash = null;
  if (ip) {
    try {
      const data = new TextEncoder().encode(ip + ':' + dateStr);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      visitorHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
    } catch {}
  }

  const body = JSON.stringify({ path, country, referrer, device, visitor_hash: visitorHash });

  // Race the fetch against a 2s timeout so tracking never blocks the page for too long
  const fetchPromise = fetch(SUPABASE_URL + '/rest/v1/page_views', {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body,
  });

  const timeoutPromise = new Promise(resolve => setTimeout(() => resolve('timeout'), 2000));
  const result = await Promise.race([fetchPromise, timeoutPromise]);
  if (result === 'timeout') return 'timeout';
  if (result && result.status) return 'insert-' + result.status;
  return 'insert-ok';
}

export async function onRequest(context) {
  // Track synchronously with timeout — never blocks more than 2s
  let trackResult = 'none';
  try {
    trackResult = await trackPageView(context.request);
  } catch (e) {
    trackResult = 'error: ' + (e.message || e);
  }

  // Pass through to static content
  const response = await context.next();
  response.headers.set('X-Track', trackResult || 'ok');
  return response;
}
