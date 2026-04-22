import { google } from 'googleapis';

function getAuth() {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return auth;
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  let id, title, date, time, location, onlineOrInPerson;
  try {
    ({ id, title, date, time, location, onlineOrInPerson } = JSON.parse(event.body));
    if (!id) throw new Error('Missing id');
  } catch (err) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request: ' + err.message }) };
  }

  try {
    const calendar = google.calendar({ version: 'v3', auth: getAuth() });

    // Fetch the existing event to preserve fields we're not updating
    const { data: existing } = await calendar.events.get({
      calendarId: 'primary',
      eventId: id,
    });

    const patch = { ...existing };

    if (title) patch.summary = title;

    if (date || time) {
      const startDate = date || existing.start.dateTime.split('T')[0];
      const startTime = time || existing.start.dateTime.split('T')[1].slice(0, 5);
      const start = new Date(`${startDate}T${startTime}:00`);

      const originalDuration =
        new Date(existing.end.dateTime) - new Date(existing.start.dateTime);
      const end = new Date(start.getTime() + originalDuration);

      patch.start = { dateTime: start.toISOString(), timeZone: existing.start.timeZone };
      patch.end   = { dateTime: end.toISOString(),   timeZone: existing.end.timeZone };
    }

    if (location !== undefined) {
      patch.location = location || '';
    }

    if (onlineOrInPerson === 'online') {
      patch.location = '';
    }

    console.log('[Earl/update-event] Updating event:', id, title || existing.summary);

    const { data: updated } = await calendar.events.update({
      calendarId: 'primary',
      eventId: id,
      requestBody: patch,
    });

    console.log('[Earl/update-event] Updated:', updated.id, updated.summary);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, message: 'Event updated' }),
    };

  } catch (err) {
    console.error('[Earl/update-event] Error:', err.message);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
