# Phase 3 — Netlify Function + Claude API Router

## Goal
Build `netlify/functions/earl.js` — the backend that receives a voice transcript, sends it to Claude, parses the structured intent, and returns an actions array to the frontend.

---

## Flow
```
Frontend POST /api/earl
  { transcript: "remind me to send the email at 5pm" }
        ↓
earl.js — calls Claude API with system prompt
        ↓
Claude returns JSON action object
        ↓
earl.js routes to correct service handler
        ↓
Returns { actions: [...] } to frontend
```

---

## `netlify/functions/earl.js`

```javascript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `
You are Earl, a discreet and capable personal butler.
You receive voice transcripts and must identify the user's intent and extract all relevant details.

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

  // Inject current date context
  const now = new Date();
  const dateContext = `Current date/time: ${now.toISOString()}. Day: ${now.toLocaleDateString('en-US', { weekday: 'long' })}.`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: `${dateContext}\n\nTranscript: "${transcript}"` }
      ]
    });

    const raw = response.content[0].text.trim();
    const intent = JSON.parse(raw);

    // Route to service handler
    const actions = await routeIntent(intent);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actions })
    };

  } catch (err) {
    console.error('Earl error:', err);
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

  // Clarification needed
  if (action === 'clarify') {
    return [{ service: 'warn', label: clarification, detail: '' }];
  }

  // Just noted, no service action
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
        return [{ service: 'calendar', label: action === 'move_meeting' ? 'Meeting moved' : 'Event created', detail: confirmation }];
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
    console.error('Service error:', err);
    // Return partial success — tell user what Earl understood but couldn't execute
    return [{
      service: 'warn',
      label: 'Understood, but hit an error',
      detail: confirmation
    }];
  }
}
```

---

## Package dependencies
```json
{
  "dependencies": {
    "@anthropic-ai/sdk": "^0.20.0"
  }
}
```

Add `package.json` at root. Netlify auto-installs.

---

## Testing Phase 3 (before real services)
The gmail.js, calendar.js, ticktick.js stubs should just `console.log` their params and return `true` for now. This lets you verify the Claude routing works end-to-end before wiring real APIs.

```javascript
// Stub for testing — gmail.js
export async function createDraft(params) {
  console.log('DRAFT:', params);
  return true;
}
```

---

## Done when
- [ ] `POST /api/earl` with a transcript returns `{ actions: [...] }`
- [ ] Claude correctly identifies intent from natural speech
- [ ] Relative dates are correctly resolved ("today", "tomorrow")
- [ ] Clarify action returns a readable question in the card
- [ ] Service errors return a warn card instead of crashing
- [ ] Stub service functions log correctly to Netlify function logs
