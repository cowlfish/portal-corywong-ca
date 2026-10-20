import { getCloudflareContext } from "@opennextjs/cloudflare";

// Notification emails to Cory, sent through Cloudflare Email Service (the EMAIL binding in
// wrangler.jsonc). The sending domain is notify.corywong.ca, onboarded separately from
// corywong.ca so the main domain's DreamHost mail is untouched.
const FROM = { email: "portal@notify.corywong.ca", name: "Cory Wong Client Portal" };
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://portal.corywong.ca";

export interface AgentNotification {
  subject: string;
  // Label/value rows shown in the email; empty values are skipped
  fields: [string, string | null | undefined][];
  // Path in the portal to act on this (e.g. "/agent/requests")
  actionPath: string;
  actionLabel: string;
  // Lets Cory hit Reply to answer the client directly
  replyTo?: { email: string; name?: string };
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function render(n: AgentNotification) {
  const rows = n.fields.filter(([, v]) => v);
  const url = new URL(n.actionPath, APP_URL).toString();
  const text = [...rows.map(([k, v]) => `${k}: ${v}`), "", `${n.actionLabel}: ${url}`].join("\n");
  const html = `<div style="font-family:system-ui,sans-serif;font-size:15px;color:#0f172a">
<table style="border-collapse:collapse">${rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:4px 16px 4px 0;color:#64748b;vertical-align:top">${escapeHtml(k)}</td>` +
        `<td style="padding:4px 0;white-space:pre-wrap">${escapeHtml(v!)}</td></tr>`
    )
    .join("")}</table>
<p style="margin-top:20px"><a href="${escapeHtml(url)}" style="background:#0f172a;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">${escapeHtml(n.actionLabel)}</a></p>
</div>`;
  return { text, html };
}

async function send(n: AgentNotification) {
  let env: CloudflareEnv | undefined;
  try {
    env = getCloudflareContext().env;
  } catch {
    env = undefined;
  }
  const to = env?.NOTIFY_EMAIL || process.env.NOTIFY_EMAIL;
  if (!env?.EMAIL || !to) {
    console.log(`[notify] email not configured; would send "${n.subject}" to ${to ?? "(no NOTIFY_EMAIL)"}`);
    return;
  }
  const { text, html } = render(n);
  try {
    await env.EMAIL.send({ from: FROM, to, subject: n.subject, text, html, replyTo: n.replyTo });
  } catch (err) {
    // A failed notification must never fail the client's request; the record is in the DB regardless.
    console.error(`[notify] failed to send "${n.subject}":`, err);
  }
}

// Sends after the response, so the client isn't kept waiting on email delivery.
export function notifyAgent(n: AgentNotification) {
  const promise = send(n);
  try {
    getCloudflareContext().ctx.waitUntil(promise);
  } catch {
    // No Cloudflare context (scripts, plain next dev): the promise still runs.
  }
}
