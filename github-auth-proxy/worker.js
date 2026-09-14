// GitHub Device Flow proxy — Cloudflare Worker
// Replaces the local server.js. Handles two routes:
//   POST /api/device/code   -> asks GitHub for a device + user code
//   POST /api/device/token  -> polls GitHub for the access token
//
// The GitHub OAuth endpoints don't send CORS headers, so the browser can't
// call them directly. This Worker calls them server-side and adds the CORS
// headers your page needs.

const CLIENT_ID = 'Ov23licZ6L3RPQH85DI9';

// Which site is allowed to call this Worker. Set this to your GitHub Pages
// origin, e.g. 'https://yashwanth.github.io'. Using '*' also works but is
// looser; prefer your exact origin once you know it.
const ALLOWED_ORIGIN = '*';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
  };
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  });
}

export default {
  async fetch(request) {
    // Browser sends a preflight OPTIONS request first — answer it.
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    const url = new URL(request.url);

    try {
      // --- Step 1: request a device + user code ---
      if (request.method === 'POST' && url.pathname === '/api/device/code') {
        const r = await fetch('https://github.com/login/device/code', {
          method: 'POST',
          headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify({ client_id: CLIENT_ID, scope: 'repo' }),
        });
        return json(await r.json(), r.status);
      }

      // --- Step 2: poll for the access token ---
      if (request.method === 'POST' && url.pathname === '/api/device/token') {
        const body = await request.json().catch(() => ({}));
        const r = await fetch('https://github.com/login/oauth/access_token', {
          method: 'POST',
          headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: CLIENT_ID,
            device_code: body.device_code,
            grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
          }),
        });
        return json(await r.json(), r.status);
      }

      return json({ error: 'not_found' }, 404);
    } catch (err) {
      return json({ error: err.message }, 500);
    }
  },
};
