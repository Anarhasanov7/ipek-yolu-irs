// notify-application: Sends an email notification to info@gtdib.org when a
// partner or member application is submitted from the public website.
// The form data is stored in Supabase by the client (anon INSERT via RLS);
// this function only relays the email notification via Resend.
//
// POST body: { type: "partner" | "member", ...fields }
// verify_jwt = false (public endpoint)

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const FROM_EMAIL = "noreply@gtdib.org";
const TO_EMAIL = "info@gtdib.org";
const SITE_URL = "https://gtdib.org";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function escapeHtml(s: unknown): string {
  if (s === null || s === undefined) return "";
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!)
  );
}

function row(label: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  return `<tr><td style="padding:8px 16px 8px 0;color:#6b7280;font-weight:600;white-space:nowrap;vertical-align:top;border-bottom:1px solid #f1f1f1;">${escapeHtml(label)}</td><td style="padding:8px 0;vertical-align:top;border-bottom:1px solid #f1f1f1;">${escapeHtml(value)}</td></tr>`;
}

function partnerEmail(d: Record<string, unknown>): string {
  return `<h2 style="margin:0 0 16px;color:#c2410c;">Yeni tərəfdaşlıq müraciəti (NGO)</h2>
<table style="border-collapse:collapse;font-family:Inter,Arial,sans-serif;font-size:14px;color:#111;">
${row("Təşkilatın adı", d.org_name)}
${row("Ölkə", d.country)}
${row("Əlaqə şəxsi", d.contact_name)}
${row("E-poçt", d.email)}
${row("Telefon", d.phone)}
${row("Vebsayt", d.website)}
${row("Missiya / Fəaliyyət sahələri", d.mission)}
${row("Əməkdaşlıq marağı", d.collaboration_interest)}
</table>
<p style="margin-top:24px;font-size:13px;color:#6b7280;">Müraciəti idarə panelində nəzərdən keçirin: <a href="${SITE_URL}/admin.html">${SITE_URL}/admin.html</a></p>`;
}

function memberEmail(d: Record<string, unknown>): string {
  return `<h2 style="margin:0 0 16px;color:#c2410c;">Yeni üzvlük müraciəti</h2>
<table style="border-collapse:collapse;font-family:Inter,Arial,sans-serif;font-size:14px;color:#111;">
${row("Ad Soyad", d.full_name)}
${row("E-poçt", d.email)}
${row("Telefon", d.phone)}
${row("Şəhər", d.city)}
${row("Doğum ili", d.birth_year)}
${row("Maraq sahələri", d.areas_of_interest)}
${row("Motivasiya", d.motivation)}
</table>
<p style="margin-top:24px;font-size:13px;color:#6b7280;">Müraciəti idarə panelində nəzərdən keçirin: <a href="${SITE_URL}/admin.html">${SITE_URL}/admin.html</a></p>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const type = body.type;
  if (type !== "partner" && type !== "member") {
    return new Response(JSON.stringify({ error: "Invalid type" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Basic validation
  if (type === "partner") {
    if (!body.org_name || !body.contact_name || !body.email) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } else {
    if (!body.full_name || !body.email) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  const subject =
    type === "partner"
      ? `[GTDİB] Yeni tərəfdaşlıq müraciəti: ${body.org_name}`
      : `[GTDİB] Yeni üzvlük müraciəti: ${body.full_name}`;

  const html =
    type === "partner" ? partnerEmail(body) : memberEmail(body);

  const emailRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `GTDİB <${FROM_EMAIL}>`,
      to: [TO_EMAIL],
      subject,
      html,
    }),
  });

  if (!emailRes.ok) {
    const errText = await emailRes.text();
    console.error("Resend error:", emailRes.status, errText);
    return new Response(
      JSON.stringify({ error: "Email send failed", detail: errText }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
