import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MEMORY_FILE = 'user/earl-memory.md';
const MARKER = '<!-- Earl adds new instructions below this line. Newest at top. -->';

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  let instruction;
  try {
    ({ instruction } = JSON.parse(event.body));
    if (!instruction) throw new Error('No instruction');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request' }) };
  }

  const repo   = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || 'main';
  const token  = process.env.GITHUB_TOKEN;

  if (!repo || !token) {
    return { statusCode: 500, body: JSON.stringify({ error: 'GITHUB_REPO or GITHUB_TOKEN not set' }) };
  }

  // Format the raw instruction via Claude
  const formatResponse = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 200,
    messages: [{
      role: 'user',
      content: `The user wants to add a personal instruction for their AI butler Earl.\nReformat this into a clean, concise Earl-style instruction (2-3 sentences max).\nWrite it as a rule Earl should always follow. Return only the instruction, no explanation.\n\nUser's raw instruction: ${instruction}`
    }]
  });

  const formatted = formatResponse.content[0].text.trim();
  console.log('[Earl/memory] Formatted instruction:', formatted);

  // Fetch current file content + SHA from GitHub
  const apiBase = `https://api.github.com/repos/${repo}/contents/${MEMORY_FILE}`;
  const getRes = await fetch(`${apiBase}?ref=${branch}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json'
    }
  });

  if (!getRes.ok) {
    const err = await getRes.text();
    console.error('[Earl/memory] GitHub GET failed:', err);
    return { statusCode: 502, body: JSON.stringify({ error: 'Failed to read memory file from GitHub' }) };
  }

  const fileData = await getRes.json();
  const currentContent = Buffer.from(fileData.content, 'base64').toString('utf8');
  const sha = fileData.sha;

  // Build new entry and insert directly after the marker (newest at top)
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const entry = `\n## Added ${date}\n${formatted}\n`;

  const updatedContent = currentContent.includes(MARKER)
    ? currentContent.replace(MARKER, MARKER + entry)
    : currentContent + entry;

  // Write back to GitHub
  const putRes = await fetch(apiBase, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: `Earl memory: ${formatted.slice(0, 72)}`,
      content: Buffer.from(updatedContent).toString('base64'),
      sha,
      branch
    })
  });

  if (!putRes.ok) {
    const err = await putRes.text();
    console.error('[Earl/memory] GitHub PUT failed:', err);
    return { statusCode: 502, body: JSON.stringify({ error: 'Failed to save memory to GitHub' }) };
  }

  console.log('[Earl/memory] Saved to GitHub successfully');

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ success: true, formatted })
  };
};
