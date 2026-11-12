import { google } from 'googleapis';
import { eventTimes } from '../lib/tz.js';

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
  let data;
  try {
    ({ data } = await calendarClient.calendarList.list());
  } catch (err) {
    // Token lacks calendar-list scope: rerun scripts/get-google-token.js. Fall back to primary meanwhile.
    console.error('[Earl/calendar] Cannot list calendars (' + err.message + ') — using primary');
    return [];
  }
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

  const { start, end } = eventTimes(String(date).slice(0, 10), time || '09:00', Number(duration) || 60);

  const requestBody = {
    summary: title,
    start,
    end,
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

  const durationMin = (new Date(event.end.dateTime) - new Date(event.start.dateTime)) / 60000 || 60;
  const { start, end } = eventTimes(String(newDate).slice(0, 10), newTime || '09:00', durationMin);

  const { data: updated } = await cal.events.update({
    calendarId: resolvedId,
    eventId: event.id,
    requestBody: { ...event, start, end },
  });

  console.log('[Earl/calendar] moveEvent updated:', updated.id, meetingTitle, '->', newDate, newTime);
  return updated;
}
