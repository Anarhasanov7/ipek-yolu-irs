// Cloudflare Pages Function — proxy for CF GraphQL Analytics API
// Returns zone-level traffic data (page views, requests, uniques, top countries, top paths)
// Secured via simple bearer token check (admin-only)

const ADMIN_TOKEN = 'gtdib-admin-analytics-2026';

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

async function cfGraphQL(token, query) {
  const resp = await fetch('https://api.cloudflare.com/client/v4/graphql', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });
  const json = await resp.json();
  if (json.errors) throw new Error(json.errors[0]?.message || 'GraphQL error');
  return json.data;
}

export async function onRequestGet(context) {
  const { request, env } = context;

  // Simple auth check — must match the token in admin.html
  const authHeader = request.headers.get('X-Admin-Token') || '';
  if (authHeader !== ADMIN_TOKEN) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const token = env.CF_API_TOKEN;
  const zoneId = env.CF_ZONE_ID;
  if (!token || !zoneId) {
    return jsonResponse({ error: 'CF credentials not configured' }, 500);
  }

  const url = new URL(request.url);
  const days = parseInt(url.searchParams.get('days') || '30', 10);
  const type = url.searchParams.get('type') || 'overview';

  const now = new Date();
  const endDate = now.toISOString().slice(0, 10);
  const startDate = new Date(now.getTime() - days * 86400000).toISOString().slice(0, 10);

  try {
    if (type === 'overview') {
      // Daily stats for the period
      const data = await cfGraphQL(token,
        `{ viewer { zones(filter: {zoneTag: "${zoneId}"}) { httpRequests1dGroups(limit: ${days}, filter: {date_geq: "${startDate}", date_leq: "${endDate}"}) { dimensions { date } sum { requests pageViews } uniq { uniques } } } } }`);

      const daily = (data.viewer.zones[0]?.httpRequests1dGroups || []).map(d => ({
        date: d.dimensions.date,
        requests: d.sum.requests,
        pageViews: d.sum.pageViews,
        uniques: d.uniq.uniques,
      }));

      const totals = daily.reduce((acc, d) => ({
        requests: acc.requests + d.requests,
        pageViews: acc.pageViews + d.pageViews,
        uniques: acc.uniques + d.uniques,
      }), { requests: 0, pageViews: 0, uniques: 0 });

      const today = daily.find(d => d.date === endDate) || { requests: 0, pageViews: 0, uniques: 0 };

      return jsonResponse({
        today: { requests: today.requests, pageViews: today.pageViews, uniques: today.uniques },
        period: totals,
        daily,
      });
    }

    if (type === 'countries') {
      // Top countries — adaptive groups limited to 1 day, so query last 1 day
      const dayStart = new Date(now.getTime() - 86400000).toISOString();
      const data = await cfGraphQL(token,
        `{ viewer { zones(filter: {zoneTag: "${zoneId}"}) { httpRequestsAdaptiveGroups(limit: 15, filter: {datetime_geq: "${dayStart}", datetime_lt: "${now.toISOString()}", requestSource: "eyeball"}, orderBy: [count_DESC]) { count dimensions { clientCountryName } } } } }`);

      const countries = (data.viewer.zones[0]?.httpRequestsAdaptiveGroups || [])
        .filter(d => d.dimensions.clientCountryName)
        .map(d => ({ country: d.dimensions.clientCountryName, count: d.count }));

      return jsonResponse({ countries });
    }

    if (type === 'paths') {
      // Top paths — last 1 day
      const dayStart = new Date(now.getTime() - 86400000).toISOString();
      const data = await cfGraphQL(token,
        `{ viewer { zones(filter: {zoneTag: "${zoneId}"}) { httpRequestsAdaptiveGroups(limit: 15, filter: {datetime_geq: "${dayStart}", datetime_lt: "${now.toISOString()}", requestSource: "eyeball"}, orderBy: [count_DESC]) { count dimensions { clientRequestPath } } } } }`);

      const paths = (data.viewer.zones[0]?.httpRequestsAdaptiveGroups || [])
        .map(d => ({ path: d.dimensions.clientRequestPath, count: d.count }));

      return jsonResponse({ paths });
    }

    if (type === 'browsers') {
      // Top browsers — last 1 day
      const dayStart = new Date(now.getTime() - 86400000).toISOString();
      const data = await cfGraphQL(token,
        `{ viewer { zones(filter: {zoneTag: "${zoneId}"}) { httpRequestsAdaptiveGroups(limit: 10, filter: {datetime_geq: "${dayStart}", datetime_lt: "${now.toISOString()}", requestSource: "eyeball"}, orderBy: [count_DESC]) { count dimensions { clientRequestHTTPProtocolName familyClientName } } } } }`);

      const browsers = (data.viewer.zones[0]?.httpRequestsAdaptiveGroups || [])
        .filter(d => d.dimensions.familyClientName)
        .map(d => ({ browser: d.dimensions.familyClientName, count: d.count }));

      return jsonResponse({ browsers });
    }

    return jsonResponse({ error: 'Unknown type. Use: overview, countries, paths, browsers' }, 400);
  } catch (e) {
    return jsonResponse({ error: e.message }, 500);
  }
}
