export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  // Gmail drafts cannot be patched — the API requires deleting and recreating
  // the full message (including original headers like To/From/Date).
  // Full update support requires storing the original To/From fields alongside
  // the draft ID, which will be wired in Phase 9.3.
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ info: 'Draft edits not yet supported' }),
  };
};
