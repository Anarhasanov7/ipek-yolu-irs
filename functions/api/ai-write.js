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
  return s.trim().replace(/^```\w*\n?|\n?```$/g, '').trim();
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

  const prompt = `Write a short news article in Azerbaijani about this topic: "${topic}".
The tone should be ${tone}.
Write exactly ${chapters} short chapter(s) or paragraph(s). Keep it concise, like a real NGO news article.
Output only the following JSON (no markdown, no extra commentary):
{
  "title_az": "short catchy title in Azerbaijani",
  "body_az": "<p>chapter 1</p>\n<p>chapter 2</p>..."
}
`;

  try {
    const aiRes = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      prompt,
      max_tokens: 1024,
      temperature: 0.6,
    });

    const raw = cleanText(aiRes.response || '');
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      // Try to extract JSON from a larger block
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        throw new Error('Could not parse AI response as JSON');
      }
    }

    const title_az = parsed.title_az ? cleanText(parsed.title_az) : '';
    let body_az = parsed.body_az ? cleanText(parsed.body_az) : '';

    // Ensure body is wrapped in paragraphs
    if (body_az && !body_az.includes('<p>')) {
      body_az = body_az.split(/\n\n+/).map(p => `<p>${p.trim()}</p>`).join('\n');
    }

    // Translate title + body to English
    const transPrompt = `Translate this Azerbaijani news text to English. Return only JSON:
{
  "title_en": "...",
  "body_en": "..."
}

Azerbaijani title: """${title_az}"""
Azerbaijani body: """${body_az}"""
`;

    const transRes = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      prompt: transPrompt,
      max_tokens: 1024,
      temperature: 0.4,
    });

    const transRaw = cleanText(transRes.response || '');
    let transParsed;
    try {
      transParsed = JSON.parse(transRaw);
    } catch (e) {
      const match = transRaw.match(/\{[\s\S]*\}/);
      transParsed = match ? JSON.parse(match[0]) : {};
    }

    const title_en = cleanText(transParsed.title_en || '') || '[English translation pending]';
    let body_en = transParsed.body_en || '';
    if (body_en && !body_en.includes('<p>')) {
      body_en = body_en.split(/\n\n+/).map(p => `<p>${p.trim()}</p>`).join('\n');
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
