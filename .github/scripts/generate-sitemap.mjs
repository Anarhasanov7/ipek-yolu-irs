// Generates sitemap-news.xml by querying Supabase for published articles.
// Run after auto-news publishes a new article.

const SUPABASE_URL = process.env.SUPABASE_URL;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'hasanov.anar.2023@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'GtdibNews2026!Az';

async function main() {
  // Authenticate as admin to get a valid access token
  const authResp = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': getAnonKey() },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  const authData = await authResp.json();
  if (!authData.access_token) {
    console.error('Failed to authenticate:', authData);
    process.exit(1);
  }

  // Fetch all published articles
  const newsResp = await fetch(`${SUPABASE_URL}/rest/v1/news?select=id,published_at&is_published=eq.true&order=published_at.desc&limit=50`, {
    headers: {
      'apikey': authData.access_token,
      'Authorization': `Bearer ${authData.access_token}`,
    },
  });
  const articles = await newsResp.json();
  if (!Array.isArray(articles)) {
    console.error('Failed to fetch news:', articles);
    process.exit(1);
  }

  // Generate sitemap XML
  const urls = [];
  for (const a of articles) {
    const lastmod = new Date(a.published_at).toISOString().split('T')[0];
    urls.push(`  <url>
    <loc>https://gtdib.org/article.html?id=${a.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`);
    urls.push(`  <url>
    <loc>https://gtdib.org/en/article.html?id=${a.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`;

  const fs = await import('fs');
  fs.writeFileSync('sitemap-news.xml', xml);
  console.log(`Generated sitemap-news.xml with ${articles.length} articles (${urls.length} URLs)`);
}

function getAnonKey() {
  // Read from supabase-config.js
  const fs = require('fs');
  const config = fs.readFileSync('supabase-config.js', 'utf8');
  const match = config.match(/SUPABASE_ANON_KEY = '([^']+)'/);
  return match ? match[1] : '';
}

// For Node.js compatibility (require in ESM)
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

main().catch(e => { console.error(e); process.exit(1); });
