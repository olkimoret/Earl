// One-time script — gets a Google OAuth refresh token using env vars.
// Reads GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET from .env
//
// Usage:
//   1. Make sure .env has GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
//   2. node scripts/get-google-token.js
//   3. Visit the printed URL and approve access
//   4. Paste the code from the redirect URL (?code=...)
//   5. Copy GOOGLE_REFRESH_TOKEN into your Netlify env vars

import 'dotenv/config';
import readline from 'readline';
import { google } from 'googleapis';

const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env;

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  console.error('Error: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in .env');
  process.exit(1);
}

const REDIRECT_URI = 'http://localhost:3000';

const oAuth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  REDIRECT_URI
);

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/calendar.events',
];

const authUrl = oAuth2Client.generateAuthUrl({ access_type: 'offline', scope: SCOPES });

console.log('\nVisit this URL in your browser:\n');
console.log(authUrl);
console.log('\nAfter approving, copy the "code" parameter from the redirect URL.');
console.log('It looks like: http://localhost:3000/?code=4/0ABCD...\n');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

rl.question('Paste the code here: ', async (code) => {
  rl.close();
  try {
    const { tokens } = await oAuth2Client.getToken(code.trim());
    console.log('\n✓ Success! Add this to Netlify env vars:\n');
    console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log('\nIt does not expire unless revoked.\n');
  } catch (err) {
    console.error('Failed to exchange code:', err.message);
    process.exit(1);
  }
});
