// notify-application: Sends email notifications when a partner or member
// application is submitted from the public website.
//   1. Admin notification → info@gtdib.org (with all form data)
//   2. Confirmation email → to the submitter (receipt confirmation)
//
// The form data is stored in Supabase by the client (anon INSERT via RLS);
// this function only relays the email notifications via Resend.
//
// POST body: { type: "partner" | "member", ...fields }
// verify_jwt = false (public endpoint)

// Prefer the gtdib-specific key; fall back to the shared key.
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY_GTDIB") || Deno.env.get("RESEND_API_KEY")!;
const FROM_EMAIL = "noreply@gtdib.org";
const ADMIN_EMAIL = "info@gtdib.org";
const SITE_URL = "https://gtdib.org";

const corsHeaders = {f40a66d4
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

// ---- Admin notification emails (always in Azerbaijani, to info@gtdib.org) ----
function adminPartnerEmail(d: Record<string, unknown>): string {
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

function adminMemberEmail(d: Record<string, unknown>): string {
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

// ---- Submitter confirmation emails (bilingual based on referer) ----
function confirmPartnerAz(d: Record<string, unknown>): string {
  return `<div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;color:#111;">
<h1 style="color:#c2410c;font-size:22px;margin-bottom:16px;">Müraciətiniz qəbul olundu</h1>
<p style="font-size:15px;line-height:1.7;">Hörmətli ${escapeHtml(d.contact_name)},</p>
<p style="font-size:15px;line-height:1.7;">
  <strong>${escapeHtml(d.org_name)}</strong> təşkilatı adından GTDİB ilə tərəfdaşlıq müraciətiniz
  uğurla qeydə alınmışdır. Komandamız müraciətinizi nəzərdən keçirəcək və qısa müddət ərzində
  sizinlə əlaqə saxlayacaq.
</p>
<p style="font-size:15px;line-height:1.7;">Təşəkkür edirik!</p>
<hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
<p style="font-size:13px;color:#6b7280;line-height:1.6;">
  Gənclərin "Tənhalara Dayaq" İctimai Birliyi<br>
  "Support for Solidarity People" Public Union<br>
  Bakı, Azərbaycan · <a href="${SITE_URL}" style="color:#c2410c;">gtdib.org</a>
</p>
</div>`;
}

function confirmPartnerEn(d: Record<string, unknown>): string {
  return `<div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;color:#111;">
<h1 style="color:#c2410c;font-size:22px;margin-bottom:16px;">Your application has been received</h1>
<p style="font-size:15px;line-height:1.7;">Dear ${escapeHtml(d.contact_name)},</p>
<p style="font-size:15px;line-height:1.7;">
  Your partnership application on behalf of <strong>${escapeHtml(d.org_name)}</strong> has been
  successfully submitted. Our team will review your application and contact you shortly.
</p>
<p style="font-size:15px;line-height:1.7;">Thank you!</p>
<hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
<p style="font-size:13px;color:#6b7280;line-height:1.6;">
  "Support for Solidarity People" Public Union<br>
  Baku, Azerbaijan · <a href="${SITE_URL}" style="color:#c2410c;">gtdib.org</a>
</p>
</div>`;
}

function confirmMemberAz(d: Record<string, unknown>): string {
  return `<div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;color:#111;">
<h1 style="color:#c2410c;font-size:22px;margin-bottom:16px;">Müraciətiniz qəbul olundu</h1>
<p style="font-size:15px;line-height:1.7;">Hörmətli ${escapeHtml(d.full_name)},</p>
<p style="font-size:15px;line-height:1.7;">
  GTDİB-ə üzvlük müraciətiniz uğurla qeydə alınmışdır. Komandamız müraciətinizi
  nəzərdən keçirəcək və qısa müddət ərzində sizinlə əlaqə saxlayacaq.
</p>
<p style="font-size:15px;line-height:1.7;">Təşəkkür edirik!</p>
<hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
<p style="font-size:13px;color:#6b7280;line-height:1.6;">
  Gənclərin "Tənhalara Dayaq" İctimai Birliyi<br>
  "Support for Solidarity People" Public Union<br>
  Bakı, Azərbaycan · <a href="${SITE_URL}" style="color:#c2410c;">gtdib.org</a>
</p>
</div>`;
}

function confirmMemberEn(d: Record<string, unknown>): string {
  return `<div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;color:#111;">
<h1 style="color:#c2410c;font-size:22px;margin-bottom:16px;">Your application has been received</h1>
<p style="font-size:15px;line-height:1.7;">Dear ${escapeHtml(d.full_name)},</p>
<p style="font-size:15px;line-height:1.7;">
  Your membership application to GTDIB has been successfully submitted. Our team will review
  your application and contact you shortly.
</p>
<p style="font-size:15px;line-height:1.7;">Thank you!</p>
<hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
<p style="font-size:13px;color:#6b7280;line-height:1.6;">
  "Support for Solidarity People" Public Union<br>
  Baku, Azerbaijan · <a href="${SITE_URL}" style="color:#c2410c;">gtdib.org</a>
</p>
</div>`;
}

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `GTDİB <${FROM_EMAIL}>`,
      to: [to],
      subject,
      html,
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error(`Resend error sending to ${to}:`, res.status, errText);
    return false;
  }
  return true;
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

  // Detect language from referer header
  const referer = req.headers.get("referer") || "";
  const isEnglish = referer.includes("/en/");

  const submitterEmail = String(body.email);

  // 1. Admin notification email (always Azerbaijani)
  const adminSubject =
    type === "partner"
      ? `[GTDİB] Yeni tərəfdaşlıq müraciəti: ${body.org_name}`
      : `[GTDİB] Yeni üzvlük müraciəti: ${body.full_name}`;
  const adminHtml =
    type === "partner" ? adminPartnerEmail(body) : adminMemberEmail(body);

  const adminOk = await sendEmail(ADMIN_EMAIL, adminSubject, adminHtml);

  // 2. Confirmation email to submitter (bilingual based on referer)
  let confirmSubject: string;
  let confirmHtml: string;
  if (type === "partner") {
    if (isEnglish) {
      confirmSubject = "Your partnership application — GTDIB";
      confirmHtml = confirmPartnerEn(body);
    } else {
      confirmSubject = "Tərəfdaşlıq müraciətiniz — GTDİB";
      confirmHtml = confirmPartnerAz(body);
    }
  } else {
    if (isEnglish) {
      confirmSubject = "Your membership application — GTDIB";
      confirmHtml = confirmMemberEn(body);
    } else {
      confirmSubject = "Üzvlük müraciətiniz — GTDİB";
      confirmHtml = confirmMemberAz(body);
    }
  }

  const submitterOk = await sendEmail(submitterEmail, confirmSubject, confirmHtml);

  // Return success if at least the admin email went through
  // (submitter email could fail if address is invalid, but data is already in DB)
  if (!adminOk) {
    return new Response(
      JSON.stringify({ error: "Admin email send failed", admin: false, submitter: submitterOk }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ ok: true, admin: true, submitter: submitterOk }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
