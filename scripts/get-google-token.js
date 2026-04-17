// One-time script — run locally to get your Google OAuth refresh token.
// Never commit credentials.json or the printed refresh token.
//
// Usage:
//   1. Download credentials.json from Google Cloud Console (Desktop app type)
//   2. Place it next to this file (scripts/credentials.json)
//   3. node scripts/get-google-token.js
//   4. Visit the URL, approve, paste the code back
//   5. Copy GOOGLE_REFRESH_TOKEN into your Netlify env vars

import { readFileSync } from 'fs';
import readline from 'readline';
import { google } from 'googleapis';

const creds = JSON.parse(readFileSync(new URL('./credentials.json', import.meta.url)));
const { client_id, client_secret, redirect_uris } = creds.installed;

const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/calendar.events',
];

const authUrl = oAuth2Client.generateAuthUrl({ access_type: 'offline', scope: SCOPES });
console.log('\nVisit this URL in your browser:\n');
console.log(authUrl);
console.log();

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question('Paste the code from Google here: ', async (code) => {
  rl.close();
  try {
    const { tokens } = await oAuth2Client.getToken(code.trim());
    console.log('\n✓ Success! Add this to Netlify env vars:\n');
    console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log('\nStore it securely. It does not expire unless revoked.\n');
  } catch (err) {
    console.error('Failed to get token:', err.message);
    process.exit(1);
  }
});
