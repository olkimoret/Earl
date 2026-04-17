import Anthropic from '@anthropic-ai/sdk';

// FUTURE: user setting — mic mode toggle (tap on/off vs hold to talk)
// When implemented, pass mode in the request body and handle accordingly

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `
You are Earl, a discreet and capable personal butler.
You receive voice transcripts and must identify the user's intent and extract all relevant details.

The user's TickTick project names are: Work, Home, CS, Deadlines.
When creating tasks, match the project to one of these if mentioned or implied by context.

Always respond with a single valid JSON object. No markdown, no explanation, just JSON.

Response format:
{
  "action": "create_task" | "draft_email" | "move_meeting" | "create_event" | "set_reminder" | "clarify" | "noted",
  "service": "ticktick" | "gmail" | "google_calendar" | "earl",
  "params": {
    // For create_task:
    "title": string,
    "project": string | null,   // TickTick folder name if mentioned
    "tags": string[],
    "dueDate": string | null,   // ISO 8601 or null
    "priority": "none" | "low" | "medium" | "high",

    // For draft_email:
    "to": string | null,
    "subject": string | null,
    "body": string,             // Earl drafts a professional body from the voice note

    // For create_event or set_reminder:
    "title": string,
    "date": string | null,      // ISO 8601 date
    "time": string | null,      // HH:MM 24h
    "duration": number | null,  // minutes

    // For move_meeting:
    "meetingTitle": string,
    "newDate": string | null,
    "newTime": string | null,

    // For clarify:
    "missingField": string      // What specifically is missing
  },
  "confirmation": string,       // Short human-readable, e.g. "Reminder set for 5pm today"
  "clarification": string | null // Only if action is "clarify"
}

Rules:
- Today's date context will be injected by the server. Use it for relative dates ("today", "tomorrow", "this week").
- If the request is ambiguous, use action "clarify" and ask only for the single most critical missing piece.
- For draft_email, write a complete professional email body based on what the user described. Never leave body empty.
- Be brief in confirmation strings. Max 8 words.
- Never explain yourself. Just return the JSON.
`;

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

  const now = new Date();
  const dateContext = `Current date/time: ${now.toISOString()}. Day: ${now.toLocaleDateString('en-US', { weekday: 'long' })}.`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: `${dateContext}\n\nTranscript: "${transcript}"` }
      ]
    });

    const raw = response.content[0].text.trim();
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
    console.error('[Earl] Error:', err);
    return {
      statusCode: 500,
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
    return [{ service: 'warn', label: clarification, detail: '' }];
  }

  if (action === 'noted') {
    return [{ service: 'earl', label: 'Noted', detail: confirmation }];
  }

  try {
    switch (action) {
      case 'draft_email': {
        const { createDraft } = await import('./gmail.js');
        await createDraft(params);
        return [{ service: 'gmail', label: 'Draft created', detail: confirmation }];
      }
      case 'create_event':
      case 'set_reminder':
      case 'move_meeting': {
        const { createEvent, moveEvent } = await import('./calendar.js');
        if (action === 'move_meeting') await moveEvent(params);
        else await createEvent(params);
        return [{
          service: 'calendar',
          label: action === 'move_meeting' ? 'Meeting moved' : 'Event created',
          detail: confirmation
        }];
      }
      case 'create_task': {
        const { createTask } = await import('./ticktick.js');
        await createTask(params);
        return [{ service: 'ticktick', label: 'Task added', detail: confirmation }];
      }
      default:
        return [{ service: 'earl', label: 'Done', detail: confirmation }];
    }
  } catch (err) {
    console.error('[Earl] Service error:', err);
    return [{
      service: 'warn',
      label: 'Understood, but hit an error',
      detail: confirmation
    }];
  }
}
