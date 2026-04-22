import { google } from 'googleapis';

function getAuth() {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return auth;
}

// Cache calendar list for the lifetime of the Lambda container
let _calendars = null;

async function getCalendars(calendarClient) {
  if (_calendars) return _calendars;
  const { data } = await calendarClient.calendarList.list();
  _calendars = data.items || [];
  console.log('[Earl/calendar] Loaded', _calendars.length, 'calendars:',
    _calendars.map(c => c.summary).join(', '));
  return _calendars;
}

// Resolve a friendly calendar name (e.g. "In_Person_N") to its Google calendar ID.
// Falls back to 'primary' with a warning if not found.
async function resolveCalendarId(calendarClient, name) {
  if (!name) return 'primary';
  const calendars = await getCalendars(calendarClient);
  const n = name.toLowerCase().trim();
  const match = calendars.find(c =>
    c.summary?.toLowerCase().trim() === n ||
    c.id?.toLowerCase() === n
  );
  if (!match) {
    console.warn(`[Earl/calendar] Calendar "${name}" not found — falling back to primary`);
    return 'primary';
  }
  return match.id;
}

export async function createEvent({ title, date, time, duration = 60, location, description, calendarId }) {
  const auth       = getAuth();
  const cal        = google.calendar({ version: 'v3', auth });
  const resolvedId = await resolveCalendarId(cal, calendarId);

  const start = new Date(`${date}T${time || '09:00'}:00`);
  const end   = new Date(start.getTime() + duration * 60000);

  const requestBody = {
    summary: title,
    start: { dateTime: start.toISOString() },
    end:   { dateTime: end.toISOString() },
    ...(location    ? { location }    : {}),
    ...(description ? { description } : {}),
  };

  const { data } = await cal.events.insert({
    calendarId: resolvedId,
    requestBody,
  });

  console.log('[Earl/calendar] createEvent created:', data.id, title,
    '| calendar:', resolvedId,
    '| location:', location    || '—',
    '| description:', description || '—');
  return data;
}

export async function moveEvent({ meetingTitle, newDate, newTime, calendarId }) {
  const auth     = getAuth();
  const cal      = google.calendar({ version: 'v3', auth });
  const resolvedId = await resolveCalendarId(cal, calendarId);

  const { data } = await cal.events.list({
    calendarId: resolvedId,
    q: meetingTitle,
    maxResults: 1,
    singleEvents: true,
    orderBy: 'startTime',
    timeMin: new Date().toISOString(),
  });

  const event = data.items?.[0];
  if (!event) throw new Error(`Event not found: ${meetingTitle}`);

  const start    = new Date(`${newDate}T${newTime || '09:00'}:00`);
  const duration = new Date(event.end.dateTime) - new Date(event.start.dateTime);
  const end      = new Date(start.getTime() + duration);

  const { data: updated } = await cal.events.update({
    calendarId: resolvedId,
    eventId: event.id,
    requestBody: {
      ...event,
      start: { dateTime: start.toISOString() },
      end:   { dateTime: end.toISOString() },
    },
  });

  console.log('[Earl/calendar] moveEvent updated:', updated.id, meetingTitle, '->', newDate, newTime);
  return updated;
}
