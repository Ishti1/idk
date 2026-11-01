import invitation from "../web/index.html?raw";
import inbox from "../web/inbox.html?raw";
import styles from "../web/style.css?raw";
import inviteScript from "../web/invite.js?raw";
import inboxScript from "../web/inbox.js?raw";
import cat from "../web/cafe-cat.svg?raw";
import favicon from "../web/favicon.svg?raw";
import marks from "../web/marks.svg?raw";

const files = new Map([
  ["/", ["text/html", invitation]],
  ["/index.html", ["text/html", invitation]],
  ["/inbox", ["text/html", inbox]],
  ["/inbox/", ["text/html", inbox]],
  ["/style.css", ["text/css", styles]],
  ["/invite.js", ["text/javascript", inviteScript]],
  ["/inbox.js", ["text/javascript", inboxScript]],
  ["/cafe-cat.svg", ["image/svg+xml", cat]],
  ["/favicon.svg", ["image/svg+xml", favicon]],
  ["/marks.svg", ["image/svg+xml", marks]]
]);

async function saveReply(request, db) {
  const origin = request.headers.get("Origin");
  if (origin && origin !== new URL(request.url).origin) return new Response(null, { status: 403 });
  if (!request.headers.get("Content-Type")?.startsWith("application/json")) return new Response(null, { status: 415 });
  const raw = await request.text();
  if (raw.length > 512) return new Response(null, { status: 413 });
  let data;
  try { data = JSON.parse(raw); } catch { return new Response(null, { status: 400 }); }
  const { id, coffee, date } = data ?? {};
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (typeof id !== "string" || !uuid.test(id) || !["yes", "no", "sometimes"].includes(coffee)
      || ![null, "yes", "no"].includes(date)) {
    return new Response(null, { status: 400 });
  }

  // A pending preference can be updated until the date question is answered.
  const saved = await db.prepare(`
    INSERT INTO replies (id, coffee, date, updated_at) VALUES (?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET coffee=excluded.coffee, date=excluded.date, updated_at=excluded.updated_at
    WHERE replies.date IS NULL
    RETURNING id
  `).bind(id, coffee, date, Date.now()).first();
  if (!saved) {
    const previous = await db.prepare("SELECT coffee, date FROM replies WHERE id=?").bind(id).first();
    if (previous?.coffee !== coffee || previous?.date !== date) return new Response(null, { status: 409 });
  }
  return new Response(null, { status: 204 });
}

async function readInbox(request, env) {
  const headers = { "Cache-Control": "private, no-store", Vary: "Authorization" };
  if (!env.INBOX_KEY || request.headers.get("Authorization") !== "Bearer " + env.INBOX_KEY) {
    return new Response(null, { status: 403, headers });
  }
  const { results } = await env.DB.prepare(
    "SELECT r.coffee, r.date, r.updated_at AS received, p.place, p.day, p.time FROM replies r LEFT JOIN plans p ON p.reply_id = r.id ORDER BY r.updated_at DESC LIMIT 100"
  ).all();
  return Response.json(results, { headers });
}

async function savePlan(request, db) {
  const origin = request.headers.get("Origin");
  if (origin && origin !== new URL(request.url).origin) return new Response(null, { status: 403 });
  if (!request.headers.get("Content-Type")?.startsWith("application/json")) return new Response(null, { status: 415 });
  const raw = await request.text();
  if (raw.length > 1024) return new Response(null, { status: 413 });
  let data;
  try { data = JSON.parse(raw); } catch { return new Response(null, { status: 400 }); }
  const { id, place, day, time } = data ?? {};
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id) ||
      typeof place !== "string" || !place.trim() || place.length > 120 ||
      typeof day !== "string" || !/^(\d{4}-\d{2}-\d{2})?$/.test(day) ||
      typeof time !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$|^$/.test(time)) return new Response(null, { status: 400 });
  const result = await db.prepare(`
    INSERT INTO plans (reply_id, place, day, time)
    SELECT id, ?, ?, ? FROM replies WHERE id = ? AND date = 'yes'
    ON CONFLICT(reply_id) DO UPDATE SET place = excluded.place, day = excluded.day, time = excluded.time
    RETURNING reply_id
  `).bind(place.trim(), day, time, id).first();
  return new Response(null, { status: result ? 204 : 409 });
}

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (path === "/api/reply" && request.method === "POST") return saveReply(request, env.DB);
    if (path === "/api/plan" && request.method === "POST") return savePlan(request, env.DB);
    if (path === "/api/inbox" && request.method === "GET") return readInbox(request, env);
    const file = files.get(path);
    if (!file) return new Response("Not found", { status: 404 });
    if (!["GET", "HEAD"].includes(request.method)) return new Response(null, { status: 405, headers: { Allow: "GET, HEAD" } });
    const [type, body] = file;
    return new Response(request.method === "HEAD" ? null : body, {
      headers: { "Content-Type": type + "; charset=utf-8", "Cache-Control": "no-cache", "X-Content-Type-Options": "nosniff" }
    });
  }
};
