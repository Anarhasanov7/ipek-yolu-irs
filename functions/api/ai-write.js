// Cloudflare Pages Function — AI news writer via Workers AI
// Generates Azerbaijani news title+body and English translation
// from a short topic/source prompt. Requires Workers AI binding.

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

function cleanText(s) {
  if (!s) return '';
  if (typeof s !== 'string') {
    if (Array.isArray(s) && s[0]?.message?.content) s = s[0].message.content;
    else if (s.response && typeof s.response === 'string') s = s.response;
    else if (s.text && typeof s.text === 'string') s = s.text;
    else s = JSON.stringify(s);
  }
  return s.trim().replace(/^```\w*\n?|\n?```$/g, '').trim();
}

function extractJson(s) {
  // Try whole string first
  try { return JSON.parse(s); } catch (e) {}
  // Find first balanced { ... }
  let depth = 0, start = -1;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '{') { if (depth === 0) start = i; depth++; }
    else if (s[i] === '}') { depth = Math.max(0, depth - 1); if (depth === 0 && start !== -1) { try { return JSON.parse(s.slice(start, i + 1)); } catch (e) { start = -1; } } }
  }
  return null;
}

export async function onRequestPost(context) {
  const { request, env } = context;

  // Auth
  const authHeader = request.headers.get('X-Admin-Token') || '';
  if (authHeader !== ADMIN_TOKEN) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  if (!env.AI) {
    return jsonResponse({ error: 'Workers AI binding not configured' }, 500);
  }

  let payload;
  try {
    payload = await request.json();
  } catch (e) {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }

  const topic = (payload.topic || '').trim();
  if (!topic) {
    return jsonResponse({ error: 'Topic/source is required' }, 400);
  }

  const tone = (payload.tone || 'informative').trim();
  const chapters = Math.min(Math.max(parseInt(payload.chapters || 2, 10), 1), 5);

  const messages = [
    { role: 'system', content: 'You are a concise news writer. You respond only with valid, compact JSON. Never add markdown, explanations, or any text outside the JSON object. Use double quotes for keys and values. Do not use real line breaks inside string values.' },
    { role: 'user', content: `Write a short news article in Azerbaijani about this topic: "${topic}".
The tone should be ${tone}.
Write exactly ${chapters} short chapter(s) or paragraph(s). Keep it concise, like a real NGO news article.
Return only this exact JSON structure, with no text before or after. Separate the body paragraphs with "||" (do not use <p> or newlines inside the JSON value):
{"title_az": "short catchy title in Azerbaijani", "body_az": "first paragraph||second paragraph"}` }
  ];

  try {
    const aiRes = await env.AI.run('@cf/meta/llama-3.1-8b-instruct-fast', {
      messages,
      max_tokens: 2048,
      temperature: 0.6,
    });

    const raw = cleanText(aiRes.response || '');
    const parsed = extractJson(raw);
    if (!parsed) {
      throw new Error('Could not parse AI response as JSON: ' + raw.slice(0, 200));
    }

    const title_az = parsed.title_az ? cleanText(parsed.title_az) : '';
    let body_az = parsed.body_az ? cleanText(parsed.body_az) : '';

    // Ensure body is wrapped in paragraphs
    if (body_az && !body_az.includes('<p>')) {
      body_az = body_az.split(/\|\|/).map(p => `<p>${p.trim()}</p>`).join('\n');
    }

    // Translate title + body to English
    const transMessages = [
      { role: 'system', content: 'You are a translator. You respond only with valid JSON. Never add markdown, explanations, or any text outside the JSON object. Do not use real line breaks inside string values.' },
      { role: 'user', content: `Translate this Azerbaijani news text to English. Return only JSON. Separate the body paragraphs with "||" (do not use <p> or newlines inside the JSON value):
{"title_en": "...", "body_en": "first paragraph||second paragraph"}

Azerbaijani title: """${title_az}"""
Azerbaijani body: """${body_az}"""` }
    ];

    const transRes = await env.AI.run('@cf/meta/llama-3.1-8b-instruct-fast', {
      messages: transMessages,
      max_tokens: 2048,
      temperature: 0.4,
    });

    const transRaw = cleanText(transRes.response || '');
    const transParsed = extractJson(transRaw) || {};

    const title_en = cleanText(transParsed.title_en || '') || '[English translation pending]';
    let body_en = transParsed.body_en || '';
    if (body_en && !body_en.includes('<p>')) {
      body_en = body_en.split(/\|\|/).map(p => `<p>${p.trim()}</p>`).join('\n');
    }

    const image_alt_az = `Xəbər şəkli: ${title_az}`;
    const image_alt_en = `News image: ${title_en}`;

    return jsonResponse({
      title_az,
      body_az,
      title_en,
      body_en,
      image_alt_az,
      image_alt_en,
      raw_az: raw,
    });
  } catch (e) {
    return jsonResponse({ error: e.message }, 500);
  }
}
