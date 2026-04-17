# Phase 1 — Project Scaffold + Theme System

## Goal
Create the full folder structure, config files, and — most importantly — the CSS variable architecture that will power all 5 themes. Every color, font, and visual property in the app must reference a CSS variable. No hardcoded values anywhere in the UI code.

---

## What to build

### 1. Folder structure
Create the complete project scaffold:
```
earl/
├── public/
│   ├── index.html          (empty shell for now)
│   ├── manifest.json
│   ├── sw.js               (empty shell for now)
│   └── icons/              (placeholder, real icons in Phase 7)
├── netlify/
│   └── functions/
│       ├── earl.js         (empty shell)
│       ├── gmail.js        (empty shell)
│       ├── calendar.js     (empty shell)
│       └── ticktick.js     (empty shell)
├── themes/
│   └── themes.js
├── .env.example
├── netlify.toml
└── README.md
```

---

### 2. `netlify.toml`
```toml
[build]
  publish = "public"
  functions = "netlify/functions"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200
```

---

### 3. `.env.example`
```
# Anthropic
ANTHROPIC_API_KEY=

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REFRESH_TOKEN=

# TickTick OAuth
TICKTICK_CLIENT_ID=
TICKTICK_CLIENT_SECRET=
TICKTICK_ACCESS_TOKEN=
TICKTICK_REFRESH_TOKEN=
```

---

### 4. CSS Variable Architecture — CRITICAL

This is the most important part of Phase 1. All 5 themes are defined as CSS variable sets. The active theme is applied by swapping a `data-theme` attribute on `<html>`. No other code changes are needed to switch themes.

#### The variable contract (every theme must define ALL of these):

```css
:root[data-theme="..."] {

  /* ── BACKGROUNDS ── */
  --bg-gradient-start: ;   /* top of gradient */
  --bg-gradient-mid:   ;   /* middle */
  --bg-gradient-end:   ;   /* bottom */
  --bg-gradient-angle: ;   /* e.g. 170deg */
  --bloom-color:       ;   /* radial center glow, rgba */

  /* ── ORB ── */
  --orb-color:         ;   /* rgb values only, e.g. 200,194,223 */
  --orb-alpha-idle:    ;   /* e.g. 0.28 */
  --orb-alpha-listen:  ;   /* e.g. 0.62 */

  /* ── TEXT ── */
  --text-primary:      ;   /* main text color */
  --text-mid:          ;   /* secondary, ~65% opacity */
  --text-soft:         ;   /* tertiary, ~38% opacity */

  /* ── SURFACES ── */
  --border:            ;   /* rgba border color */
  --card-bg:           ;   /* result card background, rgba */
  --btn-bg:            ;   /* control button background */
  --btn-border:        ;   /* control button border */

  /* ── MIC BUTTON ── */
  --mic-bg:            ;   /* resting mic button bg */
  --mic-border:        ;   /* resting mic border */
  --mic-active-bg:     ;   /* active/listening state */
  --mic-active-glow:   ;   /* box-shadow color when active */
  --mic-icon:          ;   /* mic SVG stroke color at rest */
  --mic-icon-active:   ;   /* mic SVG stroke when active */

  /* ── DANGER ── */
  --danger:            ;   /* cancel/error color */

  /* ── ACTION ICON BACKGROUNDS ── */
  --icon-gmail:        ;
  --icon-calendar:     ;
  --icon-ticktick:     ;
  --icon-earl:         ;
  --icon-warn:         ;

  /* ── TYPOGRAPHY ── */
  --font-body:         ;   /* e.g. 'DM Sans', sans-serif */
  --font-display:      ;   /* optional different display font */
  --wordmark-tracking: ;   /* letter-spacing for EARL wordmark */
}
```

---

### 5. `themes/themes.js`
Define all 5 themes here. This file is the single source of truth. It will be used in Phase 8 to build the theme switcher, but the CSS variables must be defined now.

```javascript
// themes/themes.js
// Each theme maps to a data-theme attribute value.
// CSS custom properties are injected or a matching CSS block exists.

export const themes = [
  {
    id: 'slate',
    name: 'Slate',
    description: 'Cool twilight. Focused, quiet.',
    preview: '#6B6880', // swatch color for the picker UI
    // This is the DEFAULT theme — already built in index.html
  },
  {
    id: 'parchment',
    name: 'Parchment',
    description: 'Warm paper. Classic, analog.',
    preview: '#E8E2D5',
  },
  {
    id: 'noir',
    name: 'Noir',
    description: 'Deep black. Sharp, minimal.',
    preview: '#0F0F0F',
  },
  {
    id: 'dusk',
    name: 'Dusk',
    description: 'Warm amber fade. Calm, creative.',
    preview: '#8B6A4F',
  },
  {
    id: 'sage',
    name: 'Sage',
    description: 'Forest green. Grounded, natural.',
    preview: '#4A6B5A',
  },
];

export const defaultTheme = 'slate';
```

---

### 6. Define all 5 theme CSS blocks

In `public/index.html` (or a linked `themes.css`), define all 5 theme variable blocks. Start with the already-designed `slate` theme and define the other 4 with appropriate values.

#### `slate` (default — already designed):
```css
:root, :root[data-theme="slate"] {
  --bg-gradient-start: #6B6880;
  --bg-gradient-mid:   #52506B;
  --bg-gradient-end:   #2A2938;
  --bg-gradient-angle: 170deg;
  --bloom-color:       rgba(200,194,223,0.09);
  --orb-color:         200,194,223;
  --orb-alpha-idle:    0.28;
  --orb-alpha-listen:  0.62;
  --text-primary:      #EDE8F2;
  --text-mid:          rgba(237,232,242,0.65);
  --text-soft:         rgba(237,232,242,0.38);
  --border:            rgba(237,232,242,0.09);
  --card-bg:           rgba(36,35,50,0.95);
  --btn-bg:            rgba(255,255,255,0.05);
  --btn-border:        rgba(237,232,242,0.09);
  --mic-bg:            rgba(200,194,223,0.10);
  --mic-border:        rgba(200,194,223,0.26);
  --mic-active-bg:     #C8C2DF;
  --mic-active-glow:   rgba(200,194,223,0.30);
  --mic-icon:          #C8C2DF;
  --mic-icon-active:   #2A2938;
  --danger:            #E08888;
  --icon-gmail:        rgba(234,67,53,0.16);
  --icon-calendar:     rgba(100,149,237,0.16);
  --icon-ticktick:     rgba(80,200,120,0.16);
  --icon-earl:         rgba(200,194,223,0.14);
  --icon-warn:         rgba(255,200,80,0.16);
  --font-body:         'DM Sans', sans-serif;
  --wordmark-tracking: 0.34em;
}
```

#### `parchment`:
```css
:root[data-theme="parchment"] {
  --bg-gradient-start: #F0EBE0;
  --bg-gradient-mid:   #E5DDD0;
  --bg-gradient-end:   #C8BFB0;
  --bg-gradient-angle: 160deg;
  --bloom-color:       rgba(180,160,130,0.12);
  --orb-color:         120,100,80;
  --orb-alpha-idle:    0.22;
  --orb-alpha-listen:  0.55;
  --text-primary:      #2A2520;
  --text-mid:          rgba(42,37,32,0.60);
  --text-soft:         rgba(42,37,32,0.35);
  --border:            rgba(42,37,32,0.10);
  --card-bg:           rgba(245,240,232,0.96);
  --btn-bg:            rgba(0,0,0,0.04);
  --btn-border:        rgba(42,37,32,0.10);
  --mic-bg:            rgba(120,100,80,0.10);
  --mic-border:        rgba(120,100,80,0.25);
  --mic-active-bg:     #7A6450;
  --mic-active-glow:   rgba(120,100,80,0.28);
  --mic-icon:          #7A6450;
  --mic-icon-active:   #F0EBE0;
  --danger:            #C05050;
  --icon-gmail:        rgba(234,67,53,0.12);
  --icon-calendar:     rgba(66,133,244,0.12);
  --icon-ticktick:     rgba(52,168,83,0.12);
  --icon-earl:         rgba(120,100,80,0.12);
  --icon-warn:         rgba(230,170,0,0.12);
  --font-body:         'DM Sans', sans-serif;
  --wordmark-tracking: 0.34em;
}
```

#### `noir`:
```css
:root[data-theme="noir"] {
  --bg-gradient-start: #1A1A1A;
  --bg-gradient-mid:   #111111;
  --bg-gradient-end:   #050505;
  --bg-gradient-angle: 180deg;
  --bloom-color:       rgba(255,255,255,0.04);
  --orb-color:         220,220,220;
  --orb-alpha-idle:    0.20;
  --orb-alpha-listen:  0.55;
  --text-primary:      #E8E8E8;
  --text-mid:          rgba(232,232,232,0.55);
  --text-soft:         rgba(232,232,232,0.30);
  --border:            rgba(255,255,255,0.07);
  --card-bg:           rgba(18,18,18,0.97);
  --btn-bg:            rgba(255,255,255,0.04);
  --btn-border:        rgba(255,255,255,0.07);
  --mic-bg:            rgba(220,220,220,0.08);
  --mic-border:        rgba(220,220,220,0.18);
  --mic-active-bg:     #D0D0D0;
  --mic-active-glow:   rgba(220,220,220,0.20);
  --mic-icon:          #AAAAAA;
  --mic-icon-active:   #0A0A0A;
  --danger:            #E06060;
  --icon-gmail:        rgba(234,67,53,0.14);
  --icon-calendar:     rgba(100,149,237,0.14);
  --icon-ticktick:     rgba(80,200,120,0.14);
  --icon-earl:         rgba(200,200,200,0.10);
  --icon-warn:         rgba(255,200,80,0.14);
  --font-body:         'DM Sans', sans-serif;
  --wordmark-tracking: 0.38em;
}
```

#### `dusk`:
```css
:root[data-theme="dusk"] {
  --bg-gradient-start: #8B6A50;
  --bg-gradient-mid:   #6B4E3A;
  --bg-gradient-end:   #2E2018;
  --bg-gradient-angle: 165deg;
  --bloom-color:       rgba(220,170,100,0.10);
  --orb-color:         220,185,140;
  --orb-alpha-idle:    0.28;
  --orb-alpha-listen:  0.60;
  --text-primary:      #F2E8DC;
  --text-mid:          rgba(242,232,220,0.62);
  --text-soft:         rgba(242,232,220,0.36);
  --border:            rgba(242,232,220,0.09);
  --card-bg:           rgba(38,26,18,0.95);
  --btn-bg:            rgba(255,255,255,0.05);
  --btn-border:        rgba(242,232,220,0.09);
  --mic-bg:            rgba(220,185,140,0.10);
  --mic-border:        rgba(220,185,140,0.26);
  --mic-active-bg:     #DDB978;
  --mic-active-glow:   rgba(220,185,140,0.30);
  --mic-icon:          #DDB978;
  --mic-icon-active:   #2E2018;
  --danger:            #E08070;
  --icon-gmail:        rgba(234,67,53,0.16);
  --icon-calendar:     rgba(100,149,237,0.16);
  --icon-ticktick:     rgba(80,200,120,0.16);
  --icon-earl:         rgba(220,185,140,0.14);
  --icon-warn:         rgba(255,200,80,0.16);
  --font-body:         'DM Sans', sans-serif;
  --wordmark-tracking: 0.34em;
}
```

#### `sage`:
```css
:root[data-theme="sage"] {
  --bg-gradient-start: #4A6B58;
  --bg-gradient-mid:   #354D40;
  --bg-gradient-end:   #1A2820;
  --bg-gradient-angle: 168deg;
  --bloom-color:       rgba(140,200,160,0.09);
  --orb-color:         160,210,175;
  --orb-alpha-idle:    0.26;
  --orb-alpha-listen:  0.58;
  --text-primary:      #E8F2EC;
  --text-mid:          rgba(232,242,236,0.62);
  --text-soft:         rgba(232,242,236,0.36);
  --border:            rgba(232,242,236,0.09);
  --card-bg:           rgba(20,32,24,0.95);
  --btn-bg:            rgba(255,255,255,0.05);
  --btn-border:        rgba(232,242,236,0.09);
  --mic-bg:            rgba(160,210,175,0.10);
  --mic-border:        rgba(160,210,175,0.26);
  --mic-active-bg:     #90C8A0;
  --mic-active-glow:   rgba(160,210,175,0.28);
  --mic-icon:          #90C8A0;
  --mic-icon-active:   #1A2820;
  --danger:            #E08888;
  --icon-gmail:        rgba(234,67,53,0.16);
  --icon-calendar:     rgba(100,149,237,0.16);
  --icon-ticktick:     rgba(80,200,120,0.16);
  --icon-earl:         rgba(160,210,175,0.14);
  --icon-warn:         rgba(255,200,80,0.16);
  --font-body:         'DM Sans', sans-serif;
  --wordmark-tracking: 0.34em;
}
```

---

### 7. Theme persistence
Save the active theme to `localStorage` under the key `earl-theme`. On app load, read it and apply `data-theme` to `<html>` before anything renders.

```javascript
// In index.html <head>, before CSS renders
const saved = localStorage.getItem('earl-theme') || 'slate';
document.documentElement.setAttribute('data-theme', saved);
```

---

## Done when
- [ ] Full folder structure exists
- [ ] `netlify.toml` and `.env.example` created
- [ ] All CSS variables defined and working for all 5 themes
- [ ] Switching `data-theme` on `<html>` visually changes the app
- [ ] Active theme persists across page reloads via localStorage
- [ ] No hardcoded color or font values exist anywhere in the UI CSS
