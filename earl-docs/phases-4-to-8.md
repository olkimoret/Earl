# Phase 4 — Google OAuth + Gmail Integration

## Goal
Wire up Gmail API so Earl can create email drafts from voice.

---

## One-time OAuth setup (run locally, not on Netlify)
You need a refresh token that Netlify will use server-side. Do this once:

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create project → Enable **Gmail API** + **Google Calendar API**
3. Create OAuth 2.0 credentials (Desktop app type)
4. Download `credentials.json`
5. Run the auth script below locally to get your refresh token
6. Paste the refresh token into Netlify env vars — never expires unless revoked

### Auth script (`scripts/get-google-token.js` — run once locally):
```javascript
import { google } from 'googleapis';
import readline from 'readline';

const { client_id, client_secret, redirect_uris } = require('./credentials.json').installed;
const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/calendar.events'
];

const authUrl = oAuth2Client.generateAuthUrl({ access_type: 'offline', scope: SCOPES });
console.log('Visit this URL:', authUrl);

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question('Paste the code: ', async (code) => {
  const { tokens } = await oAuth2Client.getToken(code);
  console.log('REFRESH TOKEN:', tokens.refresh_token);
  rl.close();
});
```

---

## `netlify/functions/gmail.js`

```javascript
import { google } from 'googleapis';

function getAuth() {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return auth;
}

export async function createDraft({ to, subject, body }) {
  const gmail = google.gmail({ version: 'v1', auth: getAuth() });

  const raw = Buffer.from(
    `To: ${to || ''}\r\nSubject: ${subject || '(no subject)'}\r\n\r\n${body}`
  ).toString('base64url');

  await gmail.users.drafts.create({
    userId: 'me',
    requestBody: { message: { raw } }
  });
}
```

### Package dependency:
```json
"googleapis": "^140.0.0"
```

---

## Done when
- [ ] Saying "draft an email to..." creates a real draft in Gmail
- [ ] Draft appears immediately in Gmail Drafts folder
- [ ] Subject and body are filled by Claude based on voice description
- [ ] Card confirms: "Draft created — [subject]"


---
---


# Phase 5 — Google Calendar Integration

## Goal
Wire up Calendar API so Earl can create events and move meetings.

---

## `netlify/functions/calendar.js`

```javascript
import { google } from 'googleapis';

function getAuth() {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return auth;
}

export async function createEvent({ title, date, time, duration = 60 }) {
  const calendar = google.calendar({ version: 'v3', auth: getAuth() });

  const start = new Date(`${date}T${time || '09:00'}:00`);
  const end   = new Date(start.getTime() + duration * 60000);

  await calendar.events.insert({
    calendarId: 'primary',
    requestBody: {
      summary: title,
      start: { dateTime: start.toISOString() },
      end:   { dateTime: end.toISOString() }
    }
  });
}

export async function moveEvent({ meetingTitle, newDate, newTime }) {
  const calendar = google.calendar({ version: 'v3', auth: getAuth() });

  // Find the event
  const { data } = await calendar.events.list({
    calendarId: 'primary',
    q: meetingTitle,
    maxResults: 1,
    singleEvents: true,
    orderBy: 'startTime',
    timeMin: new Date().toISOString()
  });

  const event = data.items?.[0];
  if (!event) throw new Error(`Event not found: ${meetingTitle}`);

  const start = new Date(`${newDate}T${newTime || '09:00'}:00`);
  const duration = new Date(event.end.dateTime) - new Date(event.start.dateTime);
  const end = new Date(start.getTime() + duration);

  await calendar.events.update({
    calendarId: 'primary',
    eventId: event.id,
    requestBody: {
      ...event,
      start: { dateTime: start.toISOString() },
      end:   { dateTime: end.toISOString() }
    }
  });
}
```

---

## Done when
- [ ] "Add meeting with X on Thursday at 2pm" creates calendar event
- [ ] "Move my standup to Friday" finds and reschedules correctly
- [ ] Card confirms with event title and time
- [ ] Duration preserved when moving events


---
---


# Phase 6 — TickTick Integration

## Goal
Wire up TickTick API so Earl can create tasks in the correct project/folder with tags and deadlines.

## Pre-requisite
Apply for TickTick API access at [developer.ticktick.com](https://developer.ticktick.com). Free, but manual approval — do this early.

---

## `netlify/functions/ticktick.js`

```javascript
const BASE = 'https://api.ticktick.com/open/v1';

async function getHeaders() {
  // TickTick uses OAuth2 bearer token
  // If token is expired, refresh it first
  return {
    'Authorization': `Bearer ${process.env.TICKTICK_ACCESS_TOKEN}`,
    'Content-Type': 'application/json'
  };
}

// Cache project list (fetch once per cold start)
let _projects = null;

async function getProjects() {
  if (_projects) return _projects;
  const res = await fetch(`${BASE}/project`, { headers: await getHeaders() });
  _projects = await res.json();
  return _projects;
}

export async function createTask({ title, project, tags = [], dueDate, priority = 'none' }) {
  const headers = await getHeaders();

  // Find project ID by name (case-insensitive)
  let projectId = null;
  if (project) {
    const projects = await getProjects();
    const match = projects.find(p => p.name.toLowerCase() === project.toLowerCase());
    projectId = match?.id || null;
  }

  const priorityMap = { none: 0, low: 1, medium: 3, high: 5 };

  const body = {
    title,
    projectId,
    tags,
    priority: priorityMap[priority] ?? 0,
    ...(dueDate && { dueDate: new Date(dueDate).toISOString() })
  };

  const res = await fetch(`${BASE}/task`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });

  if (!res.ok) throw new Error(`TickTick error: ${res.status}`);
  return res.json();
}
```

### Token refresh (add to ticktick.js):
```javascript
async function refreshToken() {
  // TickTick token refresh if needed
  // Store new token back — note: Netlify env vars can't be updated at runtime
  // Solution: use a simple KV store or just set a long-lived token initially
}
```

> **Note:** TickTick access tokens expire. For simplicity in v1, request a long-lived token during setup. For v2, add a token refresh flow using a Netlify KV store or a small database.

---

## System prompt addition for TickTick
Add to Claude's system prompt so it knows your folder names:

```
The user's TickTick projects/folders are: Work, Home, CS (computer science), Deadlines.
When the user mentions work tasks, use project "Work".
When they mention personal tasks, use "Home".
When they mention school or CS, use "CS".
When they mention something with a firm deadline, use "Deadlines".
Match tags to what the user says naturally.
```

This should be loaded from an env var or config so each deployment can customize it.

---

## Done when
- [ ] "Add a task to send the proposal by Friday" creates task in Work
- [ ] Project is correctly matched from user's TickTick folders
- [ ] Tags are added when mentioned
- [ ] Due dates are set correctly
- [ ] Card confirms: "Task added — [project]"


---
---


# Phase 7 — PWA Finalization + Netlify Deploy

## Goal
Make Earl installable as a proper app on iOS and Android.

---

## `public/manifest.json`
```json
{
  "name": "Earl",
  "short_name": "Earl",
  "description": "Your personal AI butler",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#2A2938",
  "theme_color": "#2A2938",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

> Note: `background_color` and `theme_color` should match the default (slate) theme's `--bg-gradient-end`.

---

## `public/sw.js` (service worker — offline shell)
```javascript
const CACHE = 'earl-v1';
const SHELL = ['/', '/index.html'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('fetch', e => {
  // Network first for API calls, cache first for shell
  if (e.request.url.includes('/api/')) return;
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
```

## Register service worker in `index.html`:
```javascript
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}
```

---

## App icons
Create two square PNG icons:
- `public/icons/icon-192.png` — 192×192px
- `public/icons/icon-512.png` — 512×512px

Design: Dark background matching `--bg-gradient-end` (#2A2938), "Earl" wordmark centered in `--text-primary` color with the same pill border treatment as the header. Simple, recognizable at small size.

---

## Netlify deploy checklist
1. Push repo to GitHub
2. Connect to Netlify → New site from Git
3. Build settings: publish dir = `public`, functions dir = `netlify/functions`
4. Add all env vars from `.env.example`
5. Deploy

## iOS install instructions (for workshop):
1. Open URL in Safari (must be Safari)
2. Tap Share → "Add to Home Screen"
3. Name it "Earl" → Add
4. Tap the icon — opens full screen, no browser chrome

---

## Done when
- [ ] App installs from Safari on iPhone
- [ ] Launches full screen with no browser UI
- [ ] App icon appears on home screen
- [ ] Loads offline (shows shell)
- [ ] All env vars set in Netlify dashboard
- [ ] All 3 services working end-to-end


---
---


# Phase 8 — Theme Switcher

## Goal
Add a minimal side menu with a theme picker. Users can choose from 5 skins. Selection persists. No re-deploy needed.

---

## UI
- Swipe right or tap a subtle `≡` icon top-right to open menu
- Menu slides in from right (not left — Earl wordmark is top-left)
- Menu content:
  1. **Connected apps** — icon row (Gmail ✉, Calendar 📅, TickTick ✓) with green dot if connected
  2. **Last 5 actions** — pulled from localStorage log
  3. **Appearance** — 5 theme swatches

---

## Theme swatch component
```html
<div class="theme-grid">
  <!-- One per theme -->
  <button class="swatch" data-theme="slate"     style="background:#6B6880" title="Slate"></button>
  <button class="swatch" data-theme="parchment" style="background:#E8E2D5" title="Parchment"></button>
  <button class="swatch" data-theme="noir"      style="background:#111111" title="Noir"></button>
  <button class="swatch" data-theme="dusk"      style="background:#8B6A50" title="Dusk"></button>
  <button class="swatch" data-theme="sage"      style="background:#4A6B58" title="Sage"></button>
</div>
```

```javascript
document.querySelectorAll('.swatch').forEach(btn => {
  btn.addEventListener('click', () => {
    const theme = btn.dataset.theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('earl-theme', theme);
    markActiveSwatch(theme);
  });
});

function markActiveSwatch(theme) {
  document.querySelectorAll('.swatch').forEach(b =>
    b.classList.toggle('active', b.dataset.theme === theme)
  );
}
```

---

## Action log
Every completed action is saved to localStorage:

```javascript
function logAction(action) {
  const log = JSON.parse(localStorage.getItem('earl-log') || '[]');
  log.unshift({
    label: action.label,
    detail: action.detail,
    service: action.service,
    time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  });
  localStorage.setItem('earl-log', JSON.stringify(log.slice(0, 5)));
}
```

Display in menu:
```javascript
function renderLog() {
  const log = JSON.parse(localStorage.getItem('earl-log') || '[]');
  // render each entry as a small row with service icon + label + time
}
```

---

## Per-client reskin (workshop / client deployments)
To deploy a custom theme for a specific client:
1. Add their custom theme to `themes/themes.js`
2. Set `EARL_DEFAULT_THEME=customname` as a Netlify env var
3. On app load, check env var first, then localStorage

```javascript
// In index.html — read default theme from a meta tag injected by a Netlify Edge Function
// OR: simply set the default in .env and inject via a build plugin
// Simplest v1 approach: each client fork sets defaultTheme in themes.js
```

---

## Done when
- [ ] Menu opens/closes smoothly from the right
- [ ] 5 theme swatches are shown with active indicator
- [ ] Tapping a swatch instantly repaints the entire app
- [ ] Theme persists across sessions
- [ ] Last 5 actions show in the menu
- [ ] Connected app icons display with correct status dots
