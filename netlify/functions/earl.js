import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'fs';
import { join } from 'path';

// FUTURE: user setting — mic mode toggle (tap on/off vs hold to talk)
// When implemented, pass mode in the request body and handle accordingly

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function buildSystemPrompt() {
  const universal = readFileSync(join(process.cwd(), 'earl-brain-universal.md'), 'utf8');
  const personal  = readFileSync(join(process.cwd(), 'user/earl-brain-personal.md'), 'utf8');

  let memory = '';
  try {
    const raw = readFileSync(join(process.cwd(), 'user/earl-memory.md'), 'utf8').trim();
    if (raw) memory = raw;
  } catch {
    // memory file missing or unreadable — proceed without it
  }

  let prompt = `${universal}\n\n---\n\n${personal}`;
  if (memory) prompt += `\n\n---\n## Runtime memory\n${memory}`;
  return prompt;
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  let transcript;
  try {
    ({ transcript } = JSON.parse(event.body));
    if (!transcript) throw new Error('No transcript');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request' }) };
  }

  const systemPrompt = buildSystemPrompt();
  const now = new Date();
  const dateContext = `Current date/time: ${now.toISOString()}. Day: ${now.toLocaleDateString('en-US', { weekday: 'long' })}.`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      system: systemPrompt,
      messages: [
        { role: 'user', content: `${dateContext}\n\nTranscript: "${transcript}"` }
      ]
    });

    const rawText = response.content[0]?.text;
    if (!rawText) throw new Error('Claude returned empty content');

    // Strip markdown code fences if Claude wraps the JSON
    const raw = rawText.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    console.log('[Earl] Claude raw response:', raw);

    const intent = JSON.parse(raw);
    console.log('[Earl] Parsed intent:', JSON.stringify(intent, null, 2));

    const actions = await routeIntent(intent);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actions })
    };

  } catch (err) {
    console.error('[Earl] Error:', err.message);
    console.error('[Earl] Stack:', err.stack);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actions: [{
          service: 'warn',
          label: "I didn't quite catch that",
          detail: 'Try again or speak more clearly'
        }]
      })
    };
  }
};

async function routeIntent(intent) {
  const { action, service, params, confirmation, clarification } = intent;

  if (action === 'clarify') {
    return [{ service: 'warn', label: clarification, detail: '', id: null, fullData: null }];
  }

  if (action === 'noted') {
    return [{ service: 'earl', label: 'Noted', detail: confirmation, id: null, fullData: params }];
  }

  try {
    switch (action) {
      case 'draft_email': {
        const { createDraft } = await import('./gmail.js');
        const created = await createDraft(params);
        return [{ service: 'gmail', label: 'Email drafted', detail: confirmation, id: created?.id || null, fullData: params }];
      }
      case 'create_event':
      case 'set_reminder':
      case 'move_meeting': {
        const { createEvent, moveEvent } = await import('./calendar.js');
        const created = action === 'move_meeting' ? await moveEvent(params) : await createEvent(params);
        return [{
          service: 'calendar',
          label: action === 'move_meeting' ? 'Meeting moved' : 'Event created',
          detail: confirmation,
          id: created?.id || null,
          fullData: params
        }];
      }
      case 'create_task': {
        const { createTask } = await import('./ticktick.js');
        const created = await createTask(params);
        return [{ service: 'ticktick', label: 'Task added', detail: confirmation, id: created?.id || null, fullData: params }];
      }
      default:
        return [{ service: 'earl', label: 'Done', detail: confirmation, id: null, fullData: params }];
    }
  } catch (err) {
    console.error('[Earl] Service error:', err);
    return [{
      service: 'warn',
      label: 'Understood, but hit an error',
      detail: confirmation,
      id: null,
      fullData: params
    }];
  }
}
