# Earl — AI Butler PWA

> A voice-first personal assistant. Speak. Earl acts.

## What it does
Earl listens to your voice, understands your intent via Claude AI, and executes actions across Gmail, Google Calendar, and TickTick — confirming each action with a clean visual card.

## Tech stack
- **Frontend** — Vanilla HTML/CSS/JS, PWA (installable)
- **Backend** — Netlify Functions (serverless, Node.js)
- **AI** — Claude API (`claude-sonnet-4-20250514`)
- **Voice** — Web Speech API (native browser)
- **Services** — Gmail API, Google Calendar API, TickTick API

## Project structure
```
earl/
├── public/
│   ├── index.html          # Single-page app
│   ├── manifest.json       # PWA manifest
│   ├── sw.js               # Service worker
│   └── icons/              # App icons (192px, 512px)
├── netlify/
│   └── functions/
│       ├── earl.js         # Main Claude router
│       ├── gmail.js        # Gmail API helper
│       ├── calendar.js     # Google Calendar helper
│       └── ticktick.js     # TickTick API helper
├── themes/
│   └── themes.js           # Theme definitions (all 5 skins)
├── .env.example
├── netlify.toml
└── README.md
```

## Phases
- **Phase 1** — Project scaffold + theme system CSS foundation
- **Phase 2** — Frontend UI (full PWA with all states)
- **Phase 3** — Netlify function + Claude API routing
- **Phase 4** — Google OAuth + Gmail integration
- **Phase 5** — Google Calendar integration
- **Phase 6** — TickTick integration
- **Phase 7** — PWA finalization + Netlify deploy
- **Phase 8** — Theme switcher UI in menu

## Deploy (per client)
1. Fork this repo on GitHub
2. Create free Netlify account → connect repo
3. Add env vars (see `.env.example`)
4. Deploy → Add to Home Screen on iOS/Android

## Env vars needed
See `.env.example` for full list.
