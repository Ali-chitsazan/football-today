/**
 * football-today — CORS proxy
 *
 * Paste this into your Cloudflare Worker (dash.cloudflare.com → Compute → your
 * worker → Edit code), replacing what is there, then Deploy.
 *
 * Change from the previous version: one new route, /yt/afc, which returns The
 * AFC Hub's YouTube RSS feed. That feed lists the live ACL Elite streams with
 * both team names in the title, which is how each stream gets pinned to a
 * match. YouTube sends no CORS header, so the browser cannot read it directly.
 * Everything football360 does is unchanged.
 */

const ALLOWED = [
  /^\/api\/base\/competitions\/defaults\/$/,
  /^\/api\/base\/v2\/competition-trends\/[0-9a-fA-F-]{36}\/fixtures\/$/,
  /^\/api\/base\/v2\/competition-trends\/[0-9a-fA-F-]{36}\/standings\/$/,
  /^\/api\/cms\/v2\/posts\/$/,
];

// The AFC Hub. Hard-coded: this route takes no channel from the caller, so the
// worker can never be used as an open proxy for any YouTube feed.
const AFC_CHANNEL = "UCnj0TjaM0wyxkAWW_nz8_1g";

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,OPTIONS",
  "access-control-max-age": "86400",
};

const json = (obj, status) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { ...CORS, "content-type": "application/json; charset=utf-8" },
  });

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });
    if (request.method !== "GET") return json({ error: "GET only" }, 405);

    const url = new URL(request.url);

    // --- YouTube: The AFC Hub feed ---------------------------------------
    if (url.pathname === "/yt/afc") {
      try {
        const upstream = await fetch(
          "https://www.youtube.com/feeds/videos.xml?channel_id=" + AFC_CHANNEL,
          {
            headers: { accept: "application/atom+xml", "user-agent": "football-today/2.1" },
            signal: AbortSignal.timeout(9000),
            cf: { cacheTtl: 120, cacheEverything: true },
          }
        );
        if (!upstream.ok) return json({ error: "upstream " + upstream.status }, 502);
        return new Response(await upstream.text(), {
          status: 200,
          headers: {
            ...CORS,
            "content-type": "application/xml; charset=utf-8",
            "cache-control": "public, max-age=120",
          },
        });
      } catch (e) {
        return json({ error: "youtube unreachable", detail: String(e).slice(0, 120) }, 504);
      }
    }

    // --- football360 ------------------------------------------------------
    if (!ALLOWED.some(rx => rx.test(url.pathname)))
      return json({ error: "path not allowed", path: url.pathname }, 403);

    try {
      const upstream = await fetch("https://football360.ir" + url.pathname + url.search, {
        headers: { accept: "application/json", "user-agent": "football-today/2.1" },
        signal: AbortSignal.timeout(9000),
        cf: { cacheTtl: 60, cacheEverything: true },
      });
      if (!upstream.ok) return json({ error: "upstream " + upstream.status }, 502);
      return new Response(await upstream.text(), {
        status: 200,
        headers: {
          ...CORS,
          "content-type": "application/json; charset=utf-8",
          "cache-control": "public, max-age=60",
        },
      });
    } catch (e) {
      return json({ error: "football360 unreachable", detail: String(e).slice(0, 120) }, 504);
    }
  },
};
