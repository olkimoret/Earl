import { google } from 'googleapis';

function getAuth() {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return auth;
}

export async function createEvent({ title, date, time, duration = 60 }) {
  const calendar = google.calendar({ version: 'v3', auth: getAuth() });

  const start = new Date(`${date}T${time || '09:00'}:00`);
  const end   = new Date(start.getTime() + duration * 60000);

  const { data } = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: {
      summary: title,
      start: { dateTime: start.toISOString() },
      end:   { dateTime: end.toISOString() }
    }
  });

  console.log('[Earl/calendar] createEvent created:', data.id, title);
}

export async function moveEvent({ meetingTitle, newDate, newTime }) {
  const calendar = google.calendar({ version: 'v3', auth: getAuth() });

  const { data } = await calendar.events.list({
    calendarId: 'primary',
    q: meetingTitle,
    maxResults: 1,
    singleEvents: true,
    orderBy: 'startTime',
    timeMin: new Date().toISOString()
  });

  const event = data.items?.[0];
  if (!event) throw new Error(`Event not found: ${meetingTitle}`);

  const start = new Date(`${newDate}T${newTime || '09:00'}:00`);
  const duration = new Date(event.end.dateTime) - new Date(event.start.dateTime);
  const end = new Date(start.getTime() + duration);

  const { data: updated } = await calendar.events.update({
    calendarId: 'primary',
    eventId: event.id,
    requestBody: {
      ...event,
      start: { dateTime: start.toISOString() },
      end:   { dateTime: end.toISOString() }
    }
  });

  console.log('[Earl/calendar] moveEvent updated:', updated.id, meetingTitle, '->', newDate, newTime);
}
