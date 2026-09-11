/**
 * football-today — CORS proxy for football360.ir
 *
 * Paste this into your Cloudflare Worker (dash.cloudflare.com → Compute → your
 * worker → Edit code), replacing what is there, then Deploy.
 *
 * Change from the first version: the posts endpoint is now allowed, which is
 * what v2 uses to find Iranian match highlights. Everything else is identical,
 * so v1 keeps working exactly as it does today.
 */

const ALLOWED = [
  /^\/api\/base\/competitions\/defaults\/$/,
  /^\/api\/base\/v2\/competition-trends\/[0-9a-fA-F-]{36}\/fixtures\/$/,
  /^\/api\/base\/v2\/competition-trends\/[0-9a-fA-F-]{36}\/standings\/$/,
  /^\/api\/cms\/v2\/posts\/$/,          // <-- new: highlight video posts
];

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
    if (!ALLOWED.some(rx => rx.test(url.pathname)))
      return json({ error: "path not allowed", path: url.pathname }, 403);

    try {
      const upstream = await fetch("https://football360.ir" + url.pathname + url.search, {
        headers: { accept: "application/json", "user-agent": "football-today/2.0" },
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
