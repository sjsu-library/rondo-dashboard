const express = require('express');
const app = express();
app.use(express.json());
app.use(express.static(__dirname));   // serves auth.html, landing.html, etc.
app.get('/', (req, res) => res.redirect('/auth.html'));
const CLIENT_ID = 'Ov23licZ6L3RPQH85DI9';

app.post('/api/device/code', async (req, res) => {
  const r = await fetch('https://github.com/login/device/code', {
    method: 'POST',
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: CLIENT_ID, scope: 'repo' })
  });
  res.status(r.status).json(await r.json());
});

app.post('/api/device/token', async (req, res) => {
  try {
    console.log('polling with device_code:', req.body.device_code);
    const r = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        device_code: req.body.device_code,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
      })
    });
    const json = await r.json();
    console.log('github replied:', json);
    res.status(r.status).json(json);
  } catch (err) {
    console.error('token route error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => console.log('→ http://localhost:3000'));