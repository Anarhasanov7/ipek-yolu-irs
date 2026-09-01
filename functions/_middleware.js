// Cloudflare Pages Function middleware — anonymous page view tracking
// Privacy-friendly: no cookies, no PII, IP hashed daily.

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

  // Skip static assets, admin, API
  if (STATIC_EXTS.test(pathname)) return 'skip-static';
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/')) return 'skip-admin';

  const ua = request.headers.get('User-Agent') || '';
  if (BOT_UA.test(ua)) return 'skip-bot';

  // Only track HTML pages
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

  const resp = await fetch(SUPABASE_URL + '/rest/v1/page_views', {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body,
  });
  return 'insert-' + resp.status;
}

export async function onRequest(context) {
  const { request, ctx } = context;

  // Track page view (fire-and-forget, but also set debug header)
  let trackResult = 'none';
  try {
    if (ctx && ctx.waitUntil) {
      ctx.waitUntil(
        trackPageView(request)
          .then(r => { trackResult = r; })
          .catch(e => { trackResult = 'error: ' + e.message; })
      );
    }
  } catch (e) {
    trackResult = 'catch: ' + e.message;
  }

  // Pass through to static content, add debug header
  const response = await context.next();
  response.headers.set('X-Track-Status', trackResult);
  return response;
}
