// Google Calendar service — Phase 3 stub (real OAuth in Phase 6)

export async function createEvent(params) {
  console.log('[Earl/calendar] createEvent:', JSON.stringify(params, null, 2));
  return true;
}

export async function moveEvent(params) {
  console.log('[Earl/calendar] moveEvent:', JSON.stringify(params, null, 2));
  return true;
}
