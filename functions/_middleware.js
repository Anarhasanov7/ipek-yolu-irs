// Cloudflare Pages Function middleware — anonymous page view tracking
// Runs on every request, fire-and-forget via ctx.waitUntil().
// Privacy-friendly: no cookies, no PII, IP is hashed daily (can't track across days).
// Only tracks HTML page requests, skips static assets and API calls.

const SUPABASE_URL = 'https://glfizcgayqecnvtfihgy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdsZml6Y2dheXFlY252dGZpaGd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwMTAzMDUsImV4cCI6MjEwMzU4NjMwNX0.V9MiUESH7Xu1TG4tadkj9a7_wi-pouLPtv3yYTSEn0I';

// File extensions to skip (static assets)
const STATIC_EXTS = /\.(css|js|jpg|jpeg|png|gif|svg|ico|webp|woff|woff2|ttf|eot|otf|txt|xml|map|webmanifest|pdf|zip|mp4|webm|avif)$/i;

// Bot user agents to skip
const BOT_UA = /bot|crawler|spider|crawling|googlebot|bingbot|yandexbot|facebookexternalhit|twitterbot|linkedinbot|telegrambot|whatsapp|preview/i;

function parseDevice(ua) {
  if (/iPad|Tablet|PlayBook|Silk/i.test(ua)) return 'tablet';
  if (/Mobile|Android|iPhone|iPod|BlackBerry|Opera Mini|IEMobile|Windows Phone/i.test(ua)) return 'mobile';
  return 'desktop';
}

function normalizePath(pathname) {
  // Remove trailing .html (Clean URLs), trailing slash, and query strings
  let p = pathname.replace(/\.html$/, '').replace(/\/$/, '');
  if (p === '') p = '/';
  return p;
}

function normalizeReferrer(referrer) {
  if (!referrer) return null;
  try {
    const url = new URL(referrer);
    // Don't store internal referrers (same domain)
    const host = url.hostname;
    if (host === 'gtdib.org' || host.endsWith('.gtdib.org') ||
        host === 'gtdib-site.pages.dev' || host.endsWith('.gtdib-site.pages.dev')) {
      return null;
    }
    // Strip path, keep only origin for privacy
    return url.origin;
  } catch {
    return null;
  }
}

async function hashVisitor(ip, dateStr) {
  if (!ip) return null;
  try {
    const data = new TextEncoder().encode(ip + ':' + dateStr);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
  } catch {
    return null;
  }
}

async function trackPageView(request, env) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Skip static assets
  if (STATIC_EXTS.test(pathname)) return;

  // Skip admin page and API/function paths
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/')) return;

  const ua = request.headers.get('User-Agent') || '';
  if (BOT_UA.test(ua)) return;

  // Only track HTML page requests (check Accept header or path without extension)
  const accept = request.headers.get('Accept') || '';
  const isHtml = accept.includes('text/html') || !pathname.includes('.');
  if (!isHtml) return;

  const path = normalizePath(pathname);
  const country = (request.cf && request.cf.country) ? request.cf.country : null;
  const referrer = normalizeReferrer(request.headers.get('Referer'));
  const device = parseDevice(ua);
  const ip = request.headers.get('CF-Connecting-IP') || '';
  const dateStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const visitorHash = await hashVisitor(ip, dateStr);

  const body = JSON.stringify({
    path,
    country,
    referrer,
    device,
    visitor_hash: visitorHash,
  });

  // Fire-and-forget insert via PostgREST
  await fetch(`${SUPABASE_URL}/rest/v1/page_views`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body,
  });
}

export async function onRequest(context) {
  const { request, env, ctx, next } = context;

  // Fire-and-forget: track without blocking the response
  ctx.waitUntil(trackPageView(request, env).catch(() => {}));

  // Continue to the static content
  return next();
}
