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
  'uno championship','mattel','qarabag','qarabağ','neftçi','zirə','kəpəz',
  'turan tovuz','idman','sport','crash','killed','attack','bombing','war',
  'missile','drone','airstrike','casualt','earthquake','flood','fire',
  'murder','arrest','corrupt','scandal','protest','riot','coup',
];

function stripHtml(s) {
  return s.replace(/<[^>]+>/g, '').trim();
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
    if (m) return m[1];
    // Try og:image (content before property)
    m = html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
    if (m) return m[1];
    // Try twitter:image
    m = html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i);
    if (m) return m[1];
    // Try first significant img
    m = html.match(/<img[^>]*src=["'](https?:\/\/[^"']+)["']/i);
    if (m && !m[1].includes('logo') && !m[1].includes('icon') && !m[1].includes('avatar')) return m[1];
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

// Use a generic Erasmus+/EU image as fallback
const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1523580494863-6f91221c1e1b?w=1200&h=675&fit=crop', // students
  'https://images.unsplash.com/photo-1503676267431-0d268eb132b9?w=1200&h=675&fit=crop', // campus
  'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1200&h=675&fit=crop', // university
  'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=1200&h=675&fit=crop', // graduation
];

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
  const isEU = item.category === 'eu';
  const isAZ = item.feedLang === 'az';
  const sourceName = item.feedName;
  const sourceLink = item.link;
  const desc = item.description.slice(0, 200);

  // Translate the description and title to the other language
  let descAz, descEn, titleAz, titleEn;

  if (isAZ) {
    // Source is in Azerbaijani — translate to English
    descAz = desc;
    titleAz = item.title;
    console.log('Translating AZ→EN...');
    descEn = await translateText(desc, 'az', 'en');
    titleEn = await translateText(item.title, 'az', 'en');
  } else {
    // Source is in English — translate to Azerbaijani
    descEn = desc;
    titleEn = item.title;
    console.log('Translating EN→AZ...');
    descAz = await translateText(desc, 'en', 'az');
    titleAz = await translateText(item.title, 'en', 'az');
  }

  // Small delay to respect rate limits
  await new Promise(r => setTimeout(r, 500));

  let bodyAz, bodyEn;
  const isEdu = item.category === 'edu';

  if (isEU) {
    bodyAz = `<p>${descAz}</p>
<p>GTDİB olaraq biz Azərbaycan gənclərinin Avropa əməkdaşlığı və beynəlxalq proqramlardan yararlanmasını dəstəkləyirik. Bu cür inkişaflar gənclərimizin bacarıqlarını artırmaq və beynəlxalq təcrübə əldə etmək üçün mühüm imkandır.</p>
<p><em>Mənbə: <a href="${sourceLink}" target="_blank" rel="noopener">${sourceName}</a></em></p>`;

    bodyEn = `<p>${descEn}</p>
<p>At GTDIB, we support Azerbaijani youth in benefiting from European cooperation and international programmes. Such developments are important opportunities for our young people to develop their skills and gain international experience.</p>
<p><em>Source: <a href="${sourceLink}" target="_blank" rel="noopener">${sourceName}</a></em></p>`;
  } else if (isEdu) {
    bodyAz = `<p>${descAz}</p>
<p>GTDİB olaraq biz beynəlxalq təhsil əməkdaşlığını və gənclərin mübadilə proqramlarında iştirakını dəstəkləyirik. Təhsil sahəsindəki bu cür yeniliklər gənclərimizin gələcəyi üçün əhəmiyyətlidir.</p>
<p><em>Mənbə: <a href="${sourceLink}" target="_blank" rel="noopener">${sourceName}</a></em></p>`;

    bodyEn = `<p>${descEn}</p>
<p>At GTDIB, we support international education cooperation and youth participation in exchange programmes. Such innovations in education are important for the future of our young people.</p>
<p><em>Source: <a href="${sourceLink}" target="_blank" rel="noopener">${sourceName}</a></em></p>`;
  } else if (isAZ) {
    bodyAz = `<p>${descAz}</p>
<p>GTDİB olaraq biz bu cür inkişafları dəstəkləyirik. Gənclərin təhsilə, mədəniyyətə və cəmiyyət həyatında iştirakına çıxışı cəmiyyətimizin gələcəyi üçün əvəzedilməzdir.</p>
<p><em>Mənbə: <a href="${sourceLink}" target="_blank" rel="noopener">${sourceName}</a></em></p>`;

    bodyEn = `<p>${descEn}</p>
<p>At GTDIB, we support these kinds of developments. Access to education, culture, and civic participation for young people is irreplaceable for the future of our society.</p>
<p><em>Source: <a href="${sourceLink}" target="_blank" rel="noopener">${sourceName}</a></em></p>`;
  } else {
    bodyAz = `<p>${descAz}</p>
<p>GTDİB olaraq biz ölkəmizin mədəni irsinin qorunması və beynəlxalq əməkdaşlığın inkişafını dəstəkləyirik. Bu cür hadisələr Azərbaycanın beynəlxalq aləmdə tanınmasına xidmət edir.</p>
<p><em>Mənbə: <a href="${sourceLink}" target="_blank" rel="noopener">${sourceName}</a></em></p>`;

    bodyEn = `<p>${descEn}</p>
<p>At GTDIB, we support the preservation of our country's cultural heritage and the development of international cooperation. Such events contribute to Azerbaijan's recognition in the international arena.</p>
<p><em>Source: <a href="${sourceLink}" target="_blank" rel="noopener">${sourceName}</a></em></p>`;
  }

  return { titleAz, titleEn, bodyAz, bodyEn };
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

  // 2b. Get all existing articles to avoid duplicates
  const existingRes = await fetch(
    `${SUPABASE_URL}/rest/v1/news?select=title_az,title_en,source_url`,
    { headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${token}` } }
  );
  const existingArticles = await existingRes.json();
  const existingUrlSet = new Set((existingArticles || []).map(n => (n.source_url || '').toLowerCase()));
  const existingTitles = (existingArticles || []).map(n => (n.title_az || n.title_en || '').toLowerCase());

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

  const picked = scored[0].item;
  console.log(`Picked: [${picked.feedName}] ${picked.title} (score: ${scored[0].score})`);

  // 5. Generate article
  const article = await generateArticle(picked);

  // 6. Get image URL — try multiple approaches
  let imageUrl = picked.enclosureLink || picked.thumbnail || '';
  if (!imageUrl && picked.sourceUrl) {
    console.log(`Fetching image from source site: ${picked.sourceUrl}...`);
    imageUrl = await fetchOgImage(picked.sourceUrl);
  }
  if (!imageUrl && picked.link) {
    console.log('Fetching og:image from article link...');
    imageUrl = await fetchOgImage(picked.link);
  }
  if (!imageUrl) {
    // Use a fallback image so every article has a picture
    const idx = Math.floor(Math.random() * FALLBACK_IMAGES.length);
    imageUrl = FALLBACK_IMAGES[idx];
    console.log('Using fallback image');
  }

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
