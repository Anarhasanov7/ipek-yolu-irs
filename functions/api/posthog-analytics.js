// Cloudflare Pages Function — proxy for PostHog Analytics API
// Returns product analytics data (page views, unique visitors, top pages, etc.)
// Secured via simple bearer token check (admin-only)

const ADMIN_TOKEN = 'gtdib-admin-analytics-2026';
const POSTHOG_HOST = 'https://eu.i.posthog.com';
const PROJECT_ID = '262633';

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

async function posthogQuery(apiKey, query) {
  const resp = await fetch(`${POSTHOG_HOST}/api/projects/${PROJECT_ID}/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: { kind: 'HogQLQuery', query } }),
  });
  const json = await resp.json();
  if (json.error) throw new Error(json.error);
  return json;
}

async function posthogEvents(apiKey, params) {
  const url = new URL(`${POSTHOG_HOST}/api/projects/${PROJECT_ID}/events`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const resp = await fetch(url, {
    headers: { 'Authorization': `Bearer ${apiKey}` },
  });
  const json = await resp.json();
  if (json.error) throw new Error(json.error);
  return json;
}

export async function onRequestGet(context) {
  const { request, env } = context;

  // Simple auth check
  const authHeader = request.headers.get('X-Admin-Token') || '';
  if (authHeader !== ADMIN_TOKEN) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const apiKey = env.POSTHOG_API_KEY;
  if (!apiKey) {
    return jsonResponse({ error: 'PostHog API key not configured' }, 500);
  }

  const url = new URL(request.url);
  const days = parseInt(url.searchParams.get('days') || '30', 10);
  const type = url.searchParams.get('type') || 'overview';

  try {
    if (type === 'overview') {
      // Daily event counts for the period
      const data = await posthogQuery(apiKey, `
        SELECT
          toDate(timestamp) AS date,
          count() AS events,
          countIf(event = '$pageview') AS pageviews,
          count(DISTINCT distinct_id) AS unique_visitors
        FROM events
        WHERE timestamp >= now() - INTERVAL ${days} DAY
          AND event IN ('$pageview', '$pageleave', '$pageview', '$autocapture')
        GROUP BY date
        ORDER BY date
      `);

      const columns = data.columns || [];
      const rows = data.results || [];
      const dateIdx = columns.indexOf('date');
      const eventsIdx = columns.indexOf('events');
      const pageviewsIdx = columns.indexOf('pageviews');
      const uniqueIdx = columns.indexOf('unique_visitors');

      const daily = rows.map(r => ({
        date: r[dateIdx],
        events: r[eventsIdx],
        pageviews: r[pageviewsIdx],
        unique_visitors: r[uniqueIdx],
      }));

      const totals = daily.reduce((acc, d) => ({
        events: acc.events + d.events,
        pageviews: acc.pageviews + d.pageviews,
        unique_visitors: acc.unique_visitors + d.unique_visitors,
      }), { events: 0, pageviews: 0, unique_visitors: 0 });

      const todayDate = new Date().toISOString().slice(0, 10);
      const today = daily.find(d => d.date === todayDate) || { events: 0, pageviews: 0, unique_visitors: 0 };

      return jsonResponse({ today, period: totals, daily });
    }

    if (type === 'top_pages') {
      const data = await posthogQuery(apiKey, `
        SELECT
          properties.$current_url AS url,
          count() AS views,
          count(DISTINCT distinct_id) AS unique_visitors
        FROM events
        WHERE event = '$pageview'
          AND timestamp >= now() - INTERVAL ${days} DAY
        GROUP BY url
        ORDER BY views DESC
        LIMIT 15
      `);

      const columns = data.columns || [];
      const rows = data.results || [];
      const urlIdx = columns.indexOf('url');
      const viewsIdx = columns.indexOf('views');
      const uniqueIdx = columns.indexOf('unique_visitors');

      const pages = rows.map(r => ({
        url: r[urlIdx] || '(unknown)',
        views: r[viewsIdx],
        unique_visitors: r[uniqueIdx],
      }));

      return jsonResponse({ pages });
    }

    if (type === 'top_countries') {
      const data = await posthogQuery(apiKey, `
        SELECT
          properties.$geoip_country_name AS country,
          count() AS views,
          count(DISTINCT distinct_id) AS unique_visitors
        FROM events
        WHERE event = '$pageview'
          AND timestamp >= now() - INTERVAL ${days} DAY
        GROUP BY country
        ORDER BY views DESC
        LIMIT 15
      `);

      const columns = data.columns || [];
      const rows = data.results || [];
      const countryIdx = columns.indexOf('country');
      const viewsIdx = columns.indexOf('views');
      const uniqueIdx = columns.indexOf('unique_visitors');

      const countries = rows.map(r => ({
        country: r[countryIdx] || '(unknown)',
        views: r[viewsIdx],
        unique_visitors: r[uniqueIdx],
      }));

      return jsonResponse({ countries });
    }

    if (type === 'top_referrers') {
      const data = await posthogQuery(apiKey, `
        SELECT
          properties.$referrer AS referrer,
          count() AS views,
          count(DISTINCT distinct_id) AS unique_visitors
        FROM events
        WHERE event = '$pageview'
          AND timestamp >= now() - INTERVAL ${days} DAY
          AND properties.$referrer IS NOT NULL
          AND properties.$referrer != ''
          AND properties.$referrer NOT LIKE '%gtdib.org%'
        GROUP BY referrer
        ORDER BY views DESC
        LIMIT 15
      `);

      const columns = data.columns || [];
      const rows = data.results || [];
      const refIdx = columns.indexOf('referrer');
      const viewsIdx = columns.indexOf('views');
      const uniqueIdx = columns.indexOf('unique_visitors');

      const referrers = rows.map(r => ({
        referrer: r[refIdx] || '(direct)',
        views: r[viewsIdx],
        unique_visitors: r[uniqueIdx],
      }));

      return jsonResponse({ referrers });
    }

    if (type === 'devices') {
      const data = await posthogQuery(apiKey, `
        SELECT
          properties.$device_type AS device,
          count() AS views,
          count(DISTINCT distinct_id) AS unique_visitors
        FROM events
        WHERE event = '$pageview'
          AND timestamp >= now() - INTERVAL ${days} DAY
        GROUP BY device
        ORDER BY views DESC
      `);

      const columns = data.columns || [];
      const rows = data.results || [];
      const deviceIdx = columns.indexOf('device');
      const viewsIdx = columns.indexOf('views');
      const uniqueIdx = columns.indexOf('unique_visitors');

      const devices = rows.map(r => ({
        device: r[deviceIdx] || '(unknown)',
        views: r[viewsIdx],
        unique_visitors: r[uniqueIdx],
      }));

      return jsonResponse({ devices });
    }

    if (type === 'browsers') {
      const data = await posthogQuery(apiKey, `
        SELECT
          properties.$browser AS browser,
          count() AS views,
          count(DISTINCT distinct_id) AS unique_visitors
        FROM events
        WHERE event = '$pageview'
          AND timestamp >= now() - INTERVAL ${days} DAY
        GROUP BY browser
        ORDER BY views DESC
        LIMIT 10
      `);

      const columns = data.columns || [];
      const rows = data.results || [];
      const browserIdx = columns.indexOf('browser');
      const viewsIdx = columns.indexOf('views');
      const uniqueIdx = columns.indexOf('unique_visitors');

      const browsers = rows.map(r => ({
        browser: r[browserIdx] || '(unknown)',
        views: r[viewsIdx],
        unique_visitors: r[uniqueIdx],
      }));

      return jsonResponse({ browsers });
    }

    if (type === 'recent_events') {
      const data = await posthogQuery(apiKey, `
        SELECT
          timestamp,
          event,
          distinct_id,
          properties.$current_url AS url,
          properties.$geoip_country_name AS country,
          properties.$device_type AS device
        FROM events
        WHERE timestamp >= now() - INTERVAL 1 DAY
        ORDER BY timestamp DESC
        LIMIT 20
      `);

      const columns = data.columns || [];
      const rows = data.results || [];
      const tsIdx = columns.indexOf('timestamp');
      const eventIdx = columns.indexOf('event');
      const idIdx = columns.indexOf('distinct_id');
      const urlIdx = columns.indexOf('url');
      const countryIdx = columns.indexOf('country');
      const deviceIdx = columns.indexOf('device');

      const events = rows.map(r => ({
        timestamp: r[tsIdx],
        event: r[eventIdx],
        distinct_id: r[idIdx],
        url: r[urlIdx],
        country: r[countryIdx],
        device: r[deviceIdx],
      }));

      return jsonResponse({ events });
    }

    return jsonResponse({ error: 'Unknown type. Use: overview, top_pages, top_countries, top_referrers, devices, browsers, recent_events' }, 400);
  } catch (e) {
    return jsonResponse({ error: e.message }, 500);
  }
}
