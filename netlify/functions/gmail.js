import { google } from 'googleapis';

function getAuth() {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return auth;
}

export async function createDraft({ to, subject, body }) {
  const gmail = google.gmail({ version: 'v1', auth: getAuth() });

  const raw = Buffer.from(
    `To: ${to || ''}\r\nSubject: ${subject || '(no subject)'}\r\n\r\n${body}`
  ).toString('base64url');

  const { data } = await gmail.users.drafts.create({
    userId: 'me',
    requestBody: { message: { raw } },
  });

  console.log('[Earl/gmail] Draft created:', data.id);
  return data;
}
