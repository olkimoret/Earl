// Shared time helpers. Netlify runs in UTC, so never build event times with new Date(local string).
export const TZ = process.env.EARL_TIMEZONE || 'America/Los_Angeles';

// "2026-11-14", "15:00", 60 → { start: {dateTime, timeZone}, end: {...} } in the user's time zone
export function eventTimes(date, time = '09:00', durationMin = 60) {
  const base = new Date(`${date}T${time}:00Z`);           // treat as wall-clock, math only
  const end  = new Date(base.getTime() + durationMin * 60000);
  const fmt  = d => d.toISOString().slice(0, 19);          // "YYYY-MM-DDTHH:MM:SS", no zone
  return {
    start: { dateTime: fmt(base), timeZone: TZ },
    end:   { dateTime: fmt(end),  timeZone: TZ },
  };
}
