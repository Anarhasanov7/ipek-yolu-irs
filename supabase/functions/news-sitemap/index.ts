import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

Deno.serve(async (_req) => {
  const url = new URL(_req.url);
  const lang = url.searchParams.get("lang") || "az";

  const { data, error } = await supabase
    .from("news")
    .select("id, title_az, title_en, published_at")
    .eq("is_published", true)
    .order("published_at", { ascending: false })
    .limit(50);

  if (error) {
    return new Response("Error generating sitemap", { status: 500 });
  }

  const base = "https://gtdib.org";
  const articlePath = lang === "en" ? "/en/article.html?id=" : "/article.html?id=";

  const urls = (data || []).map((n) => {
    const loc = `${base}${articlePath}${n.id}`;
    const lastmod = new Date(n.published_at).toISOString().split("T")[0];
    return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`;
  }).join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${urls}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
});
