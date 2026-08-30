// Auto-news: Fetches RSS headlines, picks the best one for GTDİB,
// writes an original article in AZ, creates EN version, and publishes.
// Runs daily via GitHub Actions.

const SUPABASE_URL = process.env.SUPABASE_URL;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'hasanov.anar.2023@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'GtdibNews2026!Az';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdsZml6Y2dheXFlY252dGZpaGd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwMTAzMDUsImV4cCI6MjEwMzU4NjMwNX0.V9MiUESH7Xu1TG4tadkj9a7_wi-pouLPtv3yYTSEn0I';

const FEEDS = [
  { name: 'Oxu.az', lang: 'az', url: 'https://oxu.az/feed', category: 'az' },
  { name: 'Operativmm.az', lang: 'az', url: 'https://operativmm.az/rss.xml', category: 'az' },
  { name: 'AzerNews', lang: 'en', url: 'https://www.azernews.az/feed.php', category: 'az' },
  { name: 'EU Erasmus+ Schools', lang: 'en', url: 'https://ec.europa.eu/newsroom/eac/feed?topic_id=3208&lang=en&orderby=item_date', category: 'eu' },
  { name: 'EU Erasmus+ Youth', lang: 'en', url: 'https://ec.europa.eu/newsroom/eac/feed?topic_id=3166&lang=en&orderby=item_date', category: 'eu' },
];

const KEYWORDS_AZ = [
  'təhsil','universitet','şagird','tələbə','gənc','gənclər','peşə','təlim',
  'mədəniyyət','irs','tarix','muzey','qoruq','Avropa','Erasmus','proqram',
  'layihə','birlik','ictimai','könüll','təcrübə','bacarıq','istiqdam',
  'qadın','uşaq','region','kənd','tənha','dayaq',
];

const KEYWORDS_EN = [
  'education','university','student','youth','young','vocational','training',
  'culture','heritage','history','museum','reserve','europe','erasmus',
  'programme','project','ngo','civic','volunteer','skills','employment',
  'women','child','region','rural','solidarity',
];

const SKIP_WORDS = [
  'football','futbol','premier league','premyer liqa','manchester','barcelona',
  'real madrid','spotify','victoria\'s secret','vin diesel','fast & furious',
  'uno championship','mattel','qarabag','qarabağ','neftçi','zirə','kəpəz',
  'turan tovuz','idman','sport',
];

function stripHtml(s) {
  return s.replace(/<[^>]+>/g, '').trim();
}

function scoreItem(item) {
  const text = (item.title + ' ' + item.description).toLowerCase();
  let score = 0;

  for (const kw of SKIP_WORDS) {
    if (text.includes(kw)) return -100;
  }

  const keywords = item.feedLang === 'az' ? KEYWORDS_AZ : KEYWORDS_EN;
  for (const kw of keywords) {
    if (text.includes(kw)) score += 10;
  }

  if (item.category === 'eu') score += 5;
  if (item.thumbnail || item.enclosureLink) score += 3;

  const age = Date.now() - new Date(item.pubDate).getTime();
  if (age < 24 * 60 * 60 * 1000) score += 5;
  else if (age < 48 * 60 * 60 * 1000) score += 2;

  return score;
}

async function fetchFeed(feed) {
  try {
    const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}`;
    const res = await fetch(apiUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const data = await res.json();
    if (data.status !== 'ok') return [];

    return (data.items || []).slice(0, 10).map(item => ({
      title: stripHtml(item.title || ''),
      link: item.link || '',
      description: stripHtml(item.description || '').slice(0, 300),
      pubDate: item.pubDate || new Date().toISOString(),
      feedName: feed.name,
      feedLang: feed.lang,
      category: feed.category,
      thumbnail: item.thumbnail || '',
      enclosureLink: item.enclosure?.link || '',
    }));
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

  if (isEU) {
    bodyAz = `<p>Azərbaycan gəncləri və təhsil müəssisələri üçün Avropa əməkdaşlığı sahəsində yeni imkanlar yaranıb. ${descAz}</p>
<p>GTDİB olaraq biz Azərbaycan gənclərinin beynəlxalq təhsil və mübadilə proqramlarından yararlanmasını dəstəkləyirik. Bu cür imkanlar gənclərimizin bacarıqlarını inkişaf etdirmək və Avropa təcrübəsi əldə etmək üçün mühüm vasitədir.</p>
<p><em>Mənbə: <a href="${sourceLink}" target="_blank" rel="noopener">${sourceName}</a></em></p>`;

    bodyEn = `<p>New opportunities have emerged for Azerbaijani youth and educational institutions in the field of European cooperation. ${descEn}</p>
<p>At GTDIB, we support Azerbaijani youth in benefiting from international education and exchange programmes. Such opportunities are essential for developing our young people's skills and gaining European experience.</p>
<p><em>Source: <a href="${sourceLink}" target="_blank" rel="noopener">${sourceName}</a></em></p>`;
  } else if (isAZ) {
    bodyAz = `<p>${descAz}</p>
<p>GTDİB olaraq biz bu cür nailiyyətləri və inkişafları dəstəkləyirik. Gənclərin təhsilə və peşə təliminə çıxışı cəmiyyətimizin gələcəyi üçün əvəzedilməzdir.</p>
<p><em>Mənbə: <a href="${sourceLink}" target="_blank" rel="noopener">${sourceName}</a></em></p>`;

    bodyEn = `<p>${descEn}</p>
<p>At GTDIB, we support these kinds of achievements and developments. Access to education and vocational training for young people is irreplaceable for the future of our society.</p>
<p><em>Source: <a href="${sourceLink}" target="_blank" rel="noopener">${sourceName}</a></em></p>`;
  } else {
    bodyAz = `<p>${descAz}</p>
<p>GTDİB olaraq biz ölkəmizin mədəni irsinin qorunması və təbliğ edilməsini dəstəkləyirik. Bu cür nailiyyətlər Azərbaycanın beynəlxalq aləmdə tanınmasına xidmət edir.</p>
<p><em>Mənbə: <a href="${sourceLink}" target="_blank" rel="noopener">${sourceName}</a></em></p>`;

    bodyEn = `<p>${descEn}</p>
<p>At GTDIB, we support the preservation and promotion of our country's cultural heritage. Such achievements contribute to Azerbaijan's recognition in the international arena.</p>
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

  // 6. Get image URL (external, not downloading)
  const imageUrl = picked.enclosureLink || picked.thumbnail || '';

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
