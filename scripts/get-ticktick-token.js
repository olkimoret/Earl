// One-time script — gets a TickTick OAuth access token using env vars.
// Reads TICKTICK_CLIENT_ID and TICKTICK_CLIENT_SECRET from .env
//
// Usage:
//   1. In developer.ticktick.com, set your app's OAuth redirect URL to http://localhost:3000
//   2. node scripts/get-ticktick-token.js
//   3. Visit the printed URL and approve access
//   4. Paste the code from the redirect URL (?code=...)
//   5. Copy TICKTICK_ACCESS_TOKEN into .env and your Netlify env vars, then redeploy

import 'dotenv/config';
import readline from 'readline';

const { TICKTICK_CLIENT_ID, TICKTICK_CLIENT_SECRET } = process.env;

if (!TICKTICK_CLIENT_ID || !TICKTICK_CLIENT_SECRET) {
  console.error('Error: TICKTICK_CLIENT_ID and TICKTICK_CLIENT_SECRET must be set in .env');
  process.exit(1);
}

const REDIRECT_URI = 'http://localhost:3000';
const SCOPE = 'tasks:read tasks:write';

const authUrl =
  'https://ticktick.com/oauth/authorize?' +
  new URLSearchParams({
    client_id: TICKTICK_CLIENT_ID,
    scope: SCOPE,
    state: 'earl',
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
  });

console.log('\nVisit this URL in your browser:\n');
console.log(authUrl);
console.log('\nAfter approving, copy the "code" parameter from the redirect URL.');
console.log('It looks like: http://localhost:3000/?code=abc123&state=earl\n');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

rl.question('Paste the code here: ', async (code) => {
  rl.close();
  try {
    const basic = Buffer.from(`${TICKTICK_CLIENT_ID}:${TICKTICK_CLIENT_SECRET}`).toString('base64');
    const res = await fetch('https://ticktick.com/oauth/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code.trim(),
        scope: SCOPE,
        redirect_uri: REDIRECT_URI,
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.access_token) throw new Error(JSON.stringify(data));
    console.log('\n✓ Success! Add this to .env and Netlify env vars:\n');
    console.log(`TICKTICK_ACCESS_TOKEN=${data.access_token}`);
    if (data.refresh_token) console.log(`TICKTICK_REFRESH_TOKEN=${data.refresh_token}`);
    console.log('\nTickTick tokens expire; rerun this script when tasks start failing with 401.\n');
  } catch (err) {
    console.error('Failed to exchange code:', err.message);
    process.exit(1);
  }
});
