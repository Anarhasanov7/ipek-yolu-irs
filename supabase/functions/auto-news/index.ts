// Auto-news: Fetches RSS headlines, picks the best one for GTDİB,
// writes an original article in AZ, translates to EN, downloads image,
// uploads to Storage, and publishes to the news table.
// Scheduled daily via pg_cron + pg_net.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const NEWS_BUCKET = "news-images";

// RSS feeds — same as admin dashboard
const FEEDS = [
  { name: "Oxu.az", lang: "az", url: "https://oxu.az/feed", category: "az" },
  { name: "Operativmm.az", lang: "az", url: "https://operativmm.az/rss.xml", category: "az" },
  { name: "AzerNews", lang: "en", url: "https://www.azernews.az/feed.php", category: "az" },
  { name: "EU Erasmus+ Schools", lang: "en", url: "https://ec.europa.eu/newsroom/eac/feed?topic_id=3208&lang=en&orderby=item_date", category: "eu" },
  { name: "EU Erasmus+ Youth", lang: "en", url: "https://ec.europa.eu/newsroom/eac/feed?topic_id=3166&lang=en&orderby=item_date", category: "eu" },
];

// Keywords that make a headline relevant to GTDİB (youth NGO, education, culture, EU partnership)
const RELEVANT_KEYWORDS_AZ = [
  "təhsil", "universitet", "şagird", "tələbə", "gənc", "gənclər", "peşə", "təlim",
  "mədəniyyət", "irs", "tarix", "muzey", "qoruq", "Avropa", "Erasmus", "proqram",
  "layihə", "birlik", "ictimai", " könüll", "təcrübə", "bacarıq", "istiqdam",
  "qadın", "uşaq", "region", "kənd", "tənha", "dayaq",
];

const RELEVANT_KEYWORDS_EN = [
  "education", "university", "student", "youth", "young", "vocational", "training",
  "culture", "heritage", "history", "museum", "reserve", "europe", "erasmus",
  "programme", "project", "ngo", "civic", "volunteer", "skills", "employment",
  "women", "child", "region", "rural", "solidarity",
];

const SKIP_KEYWORDS = [
  "football", "futbol", "premier league", "premyer liqa", "manchester", "barcelona",
  "real madrid", "spotify", "victoria's secret", "vin diesel", "fast & furious",
  "uno championship", "mattel", "qarabag", "qarabağ", "neftçi", "zirə", "kəpəz",
  "turan tovuz", "idman", "sport", "video", "foto", "şou",
];

interface FeedItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  feedName: string;
  feedLang: string;
  category: string;
  thumbnail?: string;
  enclosure?: { link: string; type: string };
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, "").trim();
}

function scoreItem(item: FeedItem): number {
  const text = (item.title + " " + item.description).toLowerCase();
  let score = 0;

  // Skip sports/entertainment
  for (const kw of SKIP_KEYWORDS) {
    if (text.includes(kw)) return -100;
  }

  // Score by relevant keywords
  const keywords = item.feedLang === "az" ? RELEVANT_KEYWORDS_AZ : RELEVANT_KEYWORDS_EN;
  for (const kw of keywords) {
    if (text.includes(kw)) score += 10;
  }

  // Prefer EU/Erasmus+ content
  if (item.category === "eu") score += 5;

  // Prefer items with images
  if (item.thumbnail || item.enclosure) score += 3;

  // Prefer recent items (within 24h)
  const age = Date.now() - new Date(item.pubDate).getTime();
  if (age < 24 * 60 * 60 * 1000) score += 5;
  else if (age < 48 * 60 * 60 * 1000) score += 2;

  return score;
}

async function fetchFeed(feed: typeof FEEDS[0]): Promise<FeedItem[]> {
  try {
    const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}`;
    const res = await fetch(apiUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
    const data = await res.json();
    if (data.status !== "ok") return [];

    return (data.items || []).slice(0, 10).map((item: any) => ({
      title: stripHtml(item.title || ""),
      link: item.link || "",
      description: stripHtml(item.description || "").slice(0, 300),
      pubDate: item.pubDate || new Date().toISOString(),
      feedName: feed.name,
      feedLang: feed.lang,
      category: feed.category,
      thumbnail: item.thumbnail || "",
      enclosure: item.enclosure || undefined,
    }));
  } catch (e) {
    console.log(`Feed error ${feed.name}: ${e.message}`);
    return [];
  }
}

async function downloadImage(url: string): Promise<{ bytes: Uint8Array; contentType: string } | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" },
    });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") || "image/jpeg";
    if (!contentType.startsWith("image/")) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    return { bytes, contentType };
  } catch (e) {
    console.log(`Image download error: ${e.message}`);
    return null;
  }
}

async function translateText(text: string, source: string, target: string): Promise<string> {
  try {
    // Strip HTML for translation, translate chunks
    const plain = stripHtml(text);
    const chunks = plain.match(/.{1,500}/g) || [plain];
    const translated: string[] = [];

    for (const chunk of chunks) {
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=${source}|${target}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.responseStatus === 200 || data.responseData) {
        translated.push(data.responseData.translatedText || chunk);
      } else {
        translated.push(chunk);
      }
      // Small delay to avoid rate limits
      await new Promise((r) => setTimeout(r, 500));
    }

    return translated.join(" ");
  } catch (e) {
    console.log(`Translation error: ${e.message}`);
    return text;
  }
}

function generateArticleAZ(item: FeedItem): { title: string; body: string } {
  const isEU = item.category === "eu";
  const isAZ = item.feedLang === "az";

  // Create an original title inspired by the headline
  let title: string;
  if (isAZ) {
    // Use the headline as-is but could be modified
    title = item.title;
  } else {
    // For EN sources, create an AZ title
    title = item.title;
  }

  // Generate original body with GTDİB perspective
  const sourceName = item.feedName;
  const sourceLink = item.link;
  const preview = item.description.slice(0, 200);

  let body: string;
  if (isEU) {
    body = `<p>Azərbaycan gəncləri və təhsil müəssisələri üçün Avropa əməkdaşlığı sahəsində yeni imkanlar yaranıb. ${preview}</p>
<p>GTDİB olaraq biz Azərbaycan gənclərinin beynəlxalq təhsil və mübadilə proqramlarından yararlanmasını dəstəkləyirik. Bu cür imkanlar gənclərimizin bacarıqlarını inkişaf etdirmək və Avropa təcrübəsi əldə etmək üçün mühüm vasitədir.</p>
<p><em>Mənbə: <a href="${sourceLink}" target="_blank" rel="noopener">${sourceName}</a></em></p>`;
  } else if (isAZ) {
    body = `<p>${preview}</p>
<p>GTDİB olaraq biz bu cür nailiyyətləri və inkişafları dəstəkləyirik. Gənclərin təhsilə və peşə təliminə çıxışı cəmiyyətimizin gələcəyi üçün əvəzedilməzdir.</p>
<p><em>Mənbə: <a href="${sourceLink}" target="_blank" rel="noopener">${sourceName}</a></em></p>`;
  } else {
    body = `<p>${preview}</p>
<p>GTDİB olaraq biz ölkəmizin mədəni irsinin qorunması və təbliğ edilməsini dəstəkləyirik. Bu cür nailiyyətlər Azərbaycanın beynəlxalq aləmdə tanınmasına xidmət edir.</p>
<p><em>Mənbə: <a href="${sourceLink}" target="_blank" rel="noopener">${sourceName}</a></em></p>`;
  }

  return { title, body };
}

function generateArticleEN(item: FeedItem, translatedBody: string): { title: string; body: string } {
  const sourceName = item.feedName;
  const sourceLink = item.link;

  const body = translatedBody + `\n<p><em>Source: <a href="${sourceLink}" target="_blank" rel="noopener">${sourceName}</a></em></p>`;

  return { title: item.title, body };
}

async function getArticleImage(item: FeedItem): Promise<{ bytes: Uint8Array; contentType: string } | null> {
  // Try enclosure first (RSS provides this)
  if (item.enclosure && item.enclosure.link) {
    const img = await downloadImage(item.enclosure.link);
    if (img) return img;
  }

  // Try thumbnail
  if (item.thumbnail) {
    const img = await downloadImage(item.thumbnail);
    if (img) return img;
  }

  // Try fetching og:image from the article page
  try {
    const res = await fetch(item.link, {
      headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" },
    });
    const html = await res.text();
    const ogMatch = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i);
    if (ogMatch) {
      const img = await downloadImage(ogMatch[1]);
      if (img) return img;
    }
  } catch (e) {
    console.log(`og:image fetch error: ${e.message}`);
  }

  return null;
}

Deno.serve(async (req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // 1. Fetch all feeds
    console.log("Fetching RSS feeds...");
    const allItems: FeedItem[] = [];
    for (const feed of FEEDS) {
      const items = await fetchFeed(feed);
      allItems.push(...items);
    }
    console.log(`Total items fetched: ${allItems.length}`);

    // 2. Check what's already published today (avoid duplicates)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { data: existing } = await supabase
      .from("news")
      .select("title_az")
      .gte("published_at", today.toISOString());

    const existingTitles = new Set((existing || []).map((n: any) => n.title_az.toLowerCase()));

    // 3. Score and filter items
    const scored = allItems
      .filter((item) => item.title && item.link)
      .filter((item) => !existingTitles.has(item.title.toLowerCase()))
      .map((item) => ({ item, score: scoreItem(item) }))
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score);

    console.log(`Scored items with score > 0: ${scored.length}`);

    if (scored.length === 0) {
      console.log("No relevant articles found today.");
      return new Response(JSON.stringify({ success: true, message: "No relevant articles found today" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // 4. Pick top 1 article
    const picked = scored[0].item;
    console.log(`Picked: [${picked.feedName}] ${picked.title} (score: ${scored[0].score})`);

    // 5. Generate article text
    const azArticle = generateArticleAZ(picked);

    // 6. Translate to EN
    console.log("Translating to EN...");
    const translatedBody = await translateText(azArticle.body, "az|en", "en");
    const enArticle = generateArticleEN(picked, translatedBody);
    // For EN title, use original if from EN source, otherwise translate
    if (picked.feedLang === "en") {
      enArticle.title = picked.title;
    } else {
      enArticle.title = await translateText(azArticle.title, "az|en", "en");
    }

    // 7. Download image
    console.log("Downloading image...");
    const image = await getArticleImage(picked);
    let imagePath: string | null = null;
    let imageAltAz = "";
    let imageAltEn = "";

    if (image) {
      const timestamp = Date.now();
      const safeName = picked.feedName.toLowerCase().replace(/[^a-z0-9]/g, "-");
      imagePath = `auto-${safeName}-${timestamp}.jpg`;

      console.log(`Uploading image: ${imagePath}`);
      const { error: uploadError } = await supabase.storage
        .from(NEWS_BUCKET)
        .upload(imagePath, image.bytes, {
          contentType: image.contentType,
          upsert: false,
        });

      if (uploadError) {
        console.log(`Image upload error: ${uploadError.message}`);
        imagePath = null;
      } else {
        imageAltAz = `Foto: ${picked.feedName}`;
        imageAltEn = `Photo: ${picked.feedName}`;
      }
    }

    // 8. Insert into news table
    console.log("Publishing article...");
    const { data: newsItem, error: insertError } = await supabase
      .from("news")
      .insert({
        title_az: azArticle.title,
        title_en: enArticle.title,
        body_az: azArticle.body,
        body_en: enArticle.body,
        image_path: imagePath,
        image_alt_az: imageAltAz,
        image_alt_en: imageAltEn,
        is_published: true,
        published_at: new Date().toISOString(),
      })
      .select("id, title_az")
      .single();

    if (insertError) {
      console.log(`Insert error: ${insertError.message}`);
      return new Response(JSON.stringify({ success: false, error: insertError.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log(`Published: ${newsItem.title_az}`);
    return new Response(
      JSON.stringify({
        success: true,
        article: newsItem,
        image: imagePath ? "uploaded" : "none",
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.log(`Fatal error: ${e.message}`);
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
