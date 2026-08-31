// Cloudflare Pages Function: generates dynamic news sitemap
// Accessible at: https://gtdib.org/sitemap-news.xml

const SUPABASE_URL = "https://glfizcgayqecnvtfihgy.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZmVyZW5jZSI6ImdsZml6Y2dheXFlY252dGZpaGd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwMTAzMDUsImV4cCI6MjEwMzU4NjMwNX0.V9MiUESH7Xu1TG4tadkj9a7_wi-pouLPtv3yYTSEn0I";

export async function onRequestGet() {
  try {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/news?select=id,published_at&is_published=eq.true&order=published_at.desc&limit=50`, {
      headers: {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });

    if (!resp.ok) {
      return new Response("Error generating sitemap", { status: 500 });
    }

    const articles = await resp.json();
    const base = "https://gtdib.org";

    const urls = articles.map((a) => {
      const loc = `${base}/article.html?id=${a.id}`;
      const lastmod = new Date(a.published_at).toISOString().split("T")[0];
      return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`;
    }).join("\n");

    // Also add EN article URLs
    const enUrls = articles.map((a) => {
      const loc = `${base}/en/article.html?id=${a.id}`;
      const lastmod = new Date(a.published_at).toISOString().split("T")[0];
      return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`;
    }).join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
${enUrls}
</urlset>`;

    return new Response(xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (e) {
    return new Response("Error generating sitemap", { status: 500 });
  }
}
