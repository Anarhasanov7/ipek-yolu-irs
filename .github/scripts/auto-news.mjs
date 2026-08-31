// Auto-news: Fetches RSS headlines, picks the best one for GTDİB,
// writes an original article in AZ, creates EN version, and publishes.
// Runs daily via GitHub Actions.

const SUPABASE_URL = process.env.SUPABASE_URL;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'hasanov.anar.2023@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'GtdibNews2026!Az';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdsZml6Y2dheXFlY252dGZpaGd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwMTAzMDUsImV4cCI6MjEwMzU4NjMwNX0.V9MiUESH7Xu1TG4tadkj9a7_wi-pouLPtv3yYTSEn0I';

const FEEDS = [
  { name: 'Google News: Erasmus+', lang: 'en', url: 'https://news.google.com/rss/search?q=Erasmus%2B+OR+%22Erasmus+Mundus%22+OR+%22European+Solidarity+Corps%22&hl=en&gl=US&ceid=US:en', category: 'erasmus' },
  { name: 'Google News: EU Neighbourhood', lang: 'en', url: 'https://news.google.com/rss/search?q=%22Erasmus%2B+Neighbourhood%22+OR+%22Eastern+Partnership%22+OR+%22EU+neighbourhood%22+grant&hl=en&gl=US&ceid=US:en', category: 'grants' },
  { name: 'Google News: International Grants', lang: 'en', url: 'https://news.google.com/rss/search?q=international+grant+OR+funding+OR+call+for+proposals+education+youth+NGO&hl=en&gl=US&ceid=US:en', category: 'grants' },
  { name: 'Google News: EU Funding', lang: 'en', url: 'https://news.google.com/rss/search?q=%22EU+funding%22+OR+%22Horizon+Europe%22+OR+%22Creative+Europe%22+OR+%22EuropeAid%22+OR+%22EU+cooperation%22&hl=en&gl=US&ceid=US:en', category: 'grants' },
  { name: 'Google News: Scholarship Exchange', lang: 'en', url: 'https://news.google.com/rss/search?q=scholarship+OR+fellowship+OR+%22exchange+programme%22+OR+%22study+abroad%22+EU+OR+European&hl=en&gl=US&ceid=US:en', category: 'grants' },
  { name: 'The PIE News', lang: 'en', url: 'https://www.thepienews.com/feed/', category: 'edu' },
];

// HIGH-value keywords (must have at least one to be considered)
// Covers: Erasmus+, EU neighbourhood, international grants, funding calls,
// scholarships, fellowships, exchange programmes, youth mobility, NGO funding
const MUST_KEYWORDS = [
  // Erasmus+ family
  'erasmus','erasmus mundus','solidarity corps','esc ','youth exchange',
  'capacity building','strategic partnership','cooperation partnership',
  'youth worker','non-formal learning','joint master',
  // EU programmes & funding
  'eu funding','eu programme','horizon europe','marie skłodowska',
  'creative europe','europeaid','eu cooperation','european cooperation',
  'twinning','eu grant','eu grants','european grant',
  // Neighbourhood & partnership
  'neighbourhood east','eastern partnership','eu neighbourhood',
  'partner country','third country','association agreement',
  // International grants & funding
  'grant','funding','call for proposals','call for applications',
  'funding opportunity','grant opportunity','open call','deadline',
  'cost reimbursement','co-funded','co-financing',
  // Scholarships & mobility
  'scholarship','fellowship','student mobility','youth mobility',
  'exchange programme','study abroad','visiting scholarship',
  'volunteering','volunteer programme','international cooperation',
  // AZ keywords
  'Erasmus','qrant','təqaüd','mübadilə proqram','Avropa əməkdaşlığı',
  'beynəlxalq əməkdaşlıq','könüllü proqram','maliyyələşdir','qrant',
  'fond','proqramı','layihə maliyyə',
];

// LOW-value keywords (add bonus points but not required)
const BONUS_KEYWORDS_AZ = [
  'gənclər','təhsil','təlim','proqram','layihə','beynəlxalq',
];

const BONUS_KEYWORDS_EN = [
  'youth','education','training','programme','project','international',
  'european','partnership','cooperation','skills','mobility',
];

const SKIP_WORDS = [
  'football','futbol','premier league','premyer liqa','manchester','barcelona',
  'real madrid','spotify','victoria\'s secret','vin diesel','fast & furious',
  'uno championship','mattel','qarabag','qarabağ','neftči','zirə','kəpəz',
  'turan tovuz','idman','sport','crash','killed','attack','bombing','war',
  'missile','drone','airstrike','casualt','earthquake','flood','fire',
  'murder','arrest','corrupt','scandal','protest','riot','coup',
  // Geopolitical/non-education topics
  'ceuta','melilla','border control','immigration policy','asylum',
  'sanctions','tariff','trade war','military','defense','nato',
  'election','parliament','senate','congress','prime minister',
  'fraud','indicted','embezzlement','money laundering',
  // Humanitarian/conflict/aid (not education)
  'humanitarian','refugee','displaced','famine','sudan','gaza','ukraine war',
  'crisis','lifesaving','conflict','rescue committee','red cross',
  'food security','medical supplies','emergency relief',
];

function stripHtml(s) {
  if (!s) return '';
  // First unescape HTML entities
  let text = s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
  // Remove all HTML tags
  text = text.replace(/<[^>]+>/g, ' ');
  // Clean up whitespace
  text = text.replace(/\s+/g, ' ').trim();
  return text;
}

// Check if an image URL is a generic placeholder/logo (not a real article image)
function isBadImage(url) {
  if (!url) return true;
  const u = url.toLowerCase();
  const bad = [
    'googleusercontent.com/j6_cofbogx', // Google News placeholder
    'logo', 'icon', 'avatar', 'favicon',
    'site-featured', 'default-image', 'placeholder',
    'og-image-default', 'og-default', 'default-og',
    'gstatic.com/gnews', // Google News logo
    'static/uzdaily', 'static/logo', 'banner.jpg',
    'header.jpg', 'hero.jpg', 'cover.jpg',
    'yandex.ru/watch', 'mc.yandex', // tracking pixels
    'pixel', 'tracker', 'analytics',
    '1x1', 'spacer.gif', 'blank.gif',
  ];
  return bad.some(b => u.includes(b));
}

// Fetch og:image from an article page
async function fetchOgImage(url) {
  try {
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GTDIB-NewsBot/1.0)' },
      signal: AbortSignal.timeout(10000),
      redirect: 'follow',
    });
    if (!resp.ok) return null;
    const html = await resp.text();
    // Try og:image (property before content)
    let m = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
    if (m && !isBadImage(m[1])) return m[1];
    // Try og:image (content before property)
    m = html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
    if (m && !isBadImage(m[1])) return m[1];
    // Try twitter:image
    m = html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i);
    if (m && !isBadImage(m[1])) return m[1];
    // Try first significant img
    m = html.match(/<img[^>]*src=["'](https?:\/\/[^"']+)["']/i);
    if (m && !isBadImage(m[1])) return m[1];
    return null;
  } catch (e) {
    console.log(`  og:image fetch failed: ${e.message}`);
    return null;
  }
}

// Fetch image from source website by searching for the article title
async function fetchImageFromSource(sourceUrl, title) {
  if (!sourceUrl) return null;
  try {
    // Try fetching the source site homepage to find a relevant image
    const resp = await fetch(sourceUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GTDIB-NewsBot/1.0)' },
      signal: AbortSignal.timeout(10000),
      redirect: 'follow',
    });
    if (!resp.ok) return null;
    const html = await resp.text();
    // Try og:image
    let m = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
    if (m && !m[1].includes('logo') && !m[1].includes('icon')) return m[1];
    m = html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
    if (m && !m[1].includes('logo') && !m[1].includes('icon')) return m[1];
    return null;
  } catch (e) {
    return null;
  }
}

function scoreItem(item) {
  const text = (item.title + ' ' + item.description).toLowerCase();
  let score = 0;

  // Skip sports/violence/entertainment
  for (const kw of SKIP_WORDS) {
    if (text.includes(kw)) return -100;
  }

  // MUST have at least one high-value keyword (Erasmus, grant, scholarship, etc.)
  let hasMustKeyword = false;
  for (const kw of MUST_KEYWORDS) {
    if (text.includes(kw.toLowerCase())) {
      hasMustKeyword = true;
      score += 20;
    }
  }

  // If no must-keyword, reject this article
  if (!hasMustKeyword) return -1;

  // Bonus keywords add extra points
  const bonusKeywords = item.feedLang === 'az' ? BONUS_KEYWORDS_AZ : BONUS_KEYWORDS_EN;
  for (const kw of bonusKeywords) {
    if (text.includes(kw)) score += 5;
  }

  if (item.thumbnail || item.enclosureLink) score += 3;

  // Prefer recent items
  const age = Date.now() - new Date(item.pubDate).getTime();
  if (age < 24 * 60 * 60 * 1000) score += 5;
  else if (age < 48 * 60 * 60 * 1000) score += 2;
  else if (age > 7 * 24 * 60 * 60 * 1000) score -= 10; // penalize old articles

  return score;
}

async function fetchFeed(feed) {
  try {
    // Fetch RSS XML directly and parse it
    const res = await fetch(feed.url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GTDIB-NewsBot/1.0)' },
    });
    if (!res.ok) return [];
    const xml = await res.text();

    // Simple XML parsing for RSS items
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    let match;
    while ((match = itemRegex.exec(xml)) !== null && items.length < 10) {
      const block = match[1];
      const title = (block.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i) || [])[1] || '';
      const link = (block.match(/<link>([\s\S]*?)<\/link>/i) || [])[1] || '';
      const desc = (block.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i) || [])[1] || '';
      const pubDate = (block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i) || [])[1] || new Date().toISOString();
      const enclosure = (block.match(/<enclosure[^>]*url="([^"]+)"/i) || [])[1] || '';
      const mediaContent = (block.match(/<media:content[^>]*url="([^"]+)"/i) || [])[1] || '';
      const mediaThumbnail = (block.match(/<media:thumbnail[^>]*url="([^"]+)"/i) || [])[1] || '';
      const sourceUrl = (block.match(/<source[^>]*url="([^"]+)"/i) || [])[1] || '';
      const sourceName = (block.match(/<source[^>]*>(.*?)<\/source>/i) || [])[1] || '';

      items.push({
        title: stripHtml(title).trim(),
        link: link.trim(),
        description: stripHtml(desc).slice(0, 300),
        pubDate: pubDate.trim(),
        feedName: sourceName || feed.name,
        feedLang: feed.lang,
        category: feed.category,
        thumbnail: mediaThumbnail || mediaContent || '',
        enclosureLink: enclosure || '',
        sourceUrl: sourceUrl || '',
      });
    }
    return items;
  } catch (e) {
    console.log(`Feed error ${feed.name}: ${e.message}`);
    return [];
  }
}

async function translateText(text, fromLang, toLang) {
  if (!text || fromLang === toLang) return text;
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${fromLang}|${toLang}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.responseStatus === 200 || data.responseData) {
      return data.responseData.translatedText || text;
    }
    return text;
  } catch (e) {
    console.log(`Translation error: ${e.message}`);
    return text;
  }
}

async function generateArticle(item) {
  const sourceName = item.feedName;
  const sourceLink = item.link;
  const isAZ = item.feedLang === 'az';

  // Clean title: remove " - Source Name" suffix
  const cleanTitle = (item.title || '').replace(/\s*-\s*[^-]+$/,'').trim();

  // Translate title to the other language
  let titleAz, titleEnFinal;
  if (isAZ) {
    titleAz = cleanTitle;
    console.log('Translating AZ→EN...');
    titleEnFinal = await translateText(cleanTitle, 'az', 'en');
  } else {
    titleEnFinal = cleanTitle;
    console.log('Translating EN→AZ...');
    titleAz = await translateText(cleanTitle, 'en', 'az');
  }

  await new Promise(r => setTimeout(r, 500));

  // Generate article body from the title (since Google News RSS
  // descriptions don't contain article text, only links)
  const bodyEn = `<p>${titleEnFinal} — this development represents an important opportunity for international cooperation in education and youth policy. Programmes like this enable young people to gain new skills, experience different cultures, and build international partnerships.</p>
<p>At GTDİB, we actively support Azerbaijani youth in accessing such international opportunities. We believe that participation in exchange programmes, scholarships, and cross-border cooperation projects is essential for the personal and professional development of young people in Azerbaijan.</p>
<p><em>Source: <a href="${sourceLink}" target="_blank" rel="noopener">${sourceName}</a></em></p>`;

  const bodyAz = `<p>${titleAz} — bu inkişaf təhsil və gənclər siyasəti sahəsində beynəlxalq əməkdaşlıq üçün mühüm imkanı təmsil edir. Bu cür proqramlar gənclərin yeni bacarıqlar qazanmasına, müxtəlif mədəniyyətləri tanımasına və beynəlxalq tərəfdaşlıqlar qurmasına imkan yaradır.</p>
<p>GTDİB olaraq biz Azərbaycan gənclərinin bu cür beynəlxalq imkanlardan yararlanmasını fəal şəkildə dəstəkləyirik. Mübadilə proqramlarında, təqaüdlərdə və transsərhəd əməkdaşlıq layihələrində iştirakın Azərbaycan gənclərinin şəxsi və peşəkar inkişafı üçün əhəmiyyətli olduğuna inanırıq.</p>
<p><em>Mənbə: <a href="${sourceLink}" target="_blank" rel="noopener">${sourceName}</a></em></p>`;

  return { titleAz, titleEn: titleEnFinal, bodyAz, bodyEn };
}
async function main() {
  console.log('=== Auto-News Starting ===');

  // 1. Login to Supabase
  console.log('Logging in...');
  const loginRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'apikey': ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  const loginData = await loginRes.json();
  if (!loginData.access_token) {
    throw new Error(`Login failed: ${loginData.message || 'unknown'}`);
  }
  const token = loginData.access_token;
  console.log('Login OK');

  // 2. Check if already published today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkRes = await fetch(
    `${SUPABASE_URL}/rest/v1/news?select=id&is_published=eq.true&published_at=gte.${today.toISOString()}`,
    { headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${token}` } }
  );
  const existing = await checkRes.json();
  if (existing && existing.length >= 1) {
    console.log('Already published today, skipping.');
    return;
  }

  // 2b. Get all existing articles to avoid duplicates (by URL, title, AND image)
  const existingRes = await fetch(
    `${SUPABASE_URL}/rest/v1/news?select=title_az,title_en,source_url,external_image_url,image_path`,
    { headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${token}` } }
  );
  const existingArticles = await existingRes.json();
  const existingUrlSet = new Set((existingArticles || []).map(n => (n.source_url || '').toLowerCase()));
  const existingTitles = (existingArticles || []).map(n => (n.title_az || n.title_en || '').toLowerCase());
  const existingImages = new Set((existingArticles || []).map(n => (n.external_image_url || n.image_path || '').toLowerCase()));

  // Helper: check if a headline is too similar to any existing article
  function isDuplicate(title) {
    const t = title.toLowerCase();
    const titleWords = t.split(/\s+/).filter(w => w.length > 2);
    for (const existing of existingTitles) {
      const existingWords = existing.split(/\s+/).filter(w => w.length > 2);
      if (existingWords.length === 0) continue;
      let matches = 0;
      for (const w of titleWords) {
        // Match if one word contains the other (handles different word forms)
        if (existingWords.some(ew => ew.includes(w) || w.includes(ew))) matches++;
      }
      const similarity = matches / Math.max(titleWords.length, existingWords.length);
      if (similarity >= 0.5) {
        console.log(`  [dedup] "${title.slice(0,50)}..." ~${Math.round(similarity*100)}% match with existing article`);
        return true;
      }
    }
    return false;
  }

  // 3. Fetch all feeds
  console.log('Fetching RSS feeds...');
  const allItems = [];
  for (const feed of FEEDS) {
    const items = await fetchFeed(feed);
    allItems.push(...items);
    console.log(`  ${feed.name}: ${items.length} items`);
  }
  console.log(`Total items: ${allItems.length}`);

  // 4. Score and pick best — filter out duplicates by URL AND title similarity
  const scored = allItems
    .filter(item => item.title && item.link)
    .filter(item => !existingUrlSet.has(item.link.toLowerCase()))
    .filter(item => !isDuplicate(item.title))
    .map(item => ({ item, score: scoreItem(item) }))
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score);

  console.log(`Items with score > 0 (after dedup): ${scored.length}`);

  if (scored.length === 0) {
    console.log('No relevant articles found today.');
    return;
  }

  // 5. Try each candidate in score order until we find one WITH a real image.
  //    No image = no publish. We never use stock fallbacks.
  let picked = null;
  let imageUrl = null;
  let article = null;

  for (const candidate of scored) {
    const item = candidate.item;
    console.log(`Trying: [${item.feedName}] ${item.title} (score: ${candidate.score})`);

    // Try to get a real image from multiple sources
    let img = item.enclosureLink || item.thumbnail || '';
    if (img && isBadImage(img)) img = '';
    if (!img && item.sourceUrl) {
      console.log(`  Fetching image from source site: ${item.sourceUrl}...`);
      img = await fetchOgImage(item.sourceUrl);
    }
    if (!img && item.link) {
      console.log('  Fetching og:image from article link...');
      img = await fetchOgImage(item.link);
    }

    if (img) {
      // Check if this image is already used by an existing article
      if (existingImages.has(img.toLowerCase())) {
        console.log(`  ✗ Image already used by another article, skipping`);
        continue;
      }
      picked = item;
      imageUrl = img;
      console.log(`  ✓ Image found: ${img.slice(0, 80)}`);
      break;
    }
    console.log('  ✗ No real image found, skipping this article');
  }

  if (!picked) {
    console.log('No articles with real images found today. Nothing published.');
    return;
  }

  // 6. Generate article
  article = await generateArticle(picked);

  // 7. Insert into news table
  console.log('Publishing article...');
  const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/news`, {
    method: 'POST',
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify({
      title_az: article.titleAz,
      title_en: article.titleEn,
      body_az: article.bodyAz,
      body_en: article.bodyEn,
      image_path: null,
      external_image_url: imageUrl || null,
      image_alt_az: imageUrl ? `Foto: ${picked.feedName}` : null,
      image_alt_en: imageUrl ? `Photo: ${picked.feedName}` : null,
      source_url: picked.link,
      is_published: true,
      published_at: new Date().toISOString(),
    }),
  });

  const insertData = await insertRes.json();
  if (!insertRes.ok) {
    throw new Error(`Insert failed: ${JSON.stringify(insertData)}`);
  }

  console.log(`Published successfully: ${insertData[0]?.title_az || 'unknown'}`);
  console.log(`Image: ${imageUrl ? 'yes (external)' : 'none'}`);
  console.log('=== Auto-News Complete ===');
}

main().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
