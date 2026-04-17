# Phase 2 — Frontend UI

## Goal
Build the complete `public/index.html` — the full PWA interface with all states, the fluid orb animation, and the result card. Every visual value must reference the CSS variables defined in Phase 1. No hardcoded colors.

---

## Reference design
The approved UI design is in `index.html` (root of repo — the prototype). Use it as the pixel reference. Phase 2 is about rebuilding it cleanly against the variable system.

---

## App states
The app has 4 states, driven by a class on `<div id="app">`:

| State | Class | Orb | Status text | Mic button |
|---|---|---|---|---|
| Idle | `app` | Slow, gentle, 4 rings | *"Ready when you are."* italic | Resting |
| Listening | `app listening` | Fast, expressive, 7 rings | Live transcript | Active/filled |
| Processing | `app processing` | Medium, 5 rings | *"On it…"* | Resting |
| — | — | — | — | — |

---

## Layout (top → bottom)
```
[ HEADER — Earl wordmark pill ]

[ STAGE — flex:1, centered ]
  [ ORB — canvas 300×300px ]
  [ STATUS TEXT — italic, below orb, 38px gap ]

[ CONTROLS — bottom ]
  [ Cancel ×  ]  [ Mic ◉ ]
```

---

## Orb animation (Canvas 2D)

The orb is drawn on a `<canvas id="orbCanvas" width="600" height="600">` displayed at 300×300 CSS pixels (retina-ready).

### Config per state:
```javascript
const configs = {
  idle: {
    rings: 4, baseR: 95, gap: 24,
    amp: 10, speed: 0.00042, ns: 1.0,
    alpha: 'var(--orb-alpha-idle)', lw: 1.3
  },
  listening: {
    rings: 7, baseR: 118, gap: 21,
    amp: 36, speed: 0.0019, ns: 2.6,
    alpha: 'var(--orb-alpha-listen)', lw: 1.6
  },
  processing: {
    rings: 5, baseR: 104, gap: 22,
    amp: 18, speed: 0.0010, ns: 1.6,
    alpha: 0.40, lw: 1.4
  }
};
```

### Orb color:
Read `--orb-color` from CSS variables at runtime so it responds to theme changes:
```javascript
function getOrbColor() {
  return getComputedStyle(document.documentElement)
    .getPropertyValue('--orb-color').trim(); // returns "200,194,223"
}
// Use as: `rgba(${getOrbColor()}, ${alpha})`
```

### Noise function (layered sine — organic feel):
```javascript
function noise(a, t, ns, off) {
  return (
    Math.sin(a*2.0 + t*1.1 + off)      * 0.38 +
    Math.sin(a*3.5 + t*0.8 + off*1.3)  * 0.26 +
    Math.sin(a*1.2 + t*1.9 + off*0.6)  * 0.22 +
    Math.sin(a*4.8 + t*0.4 + off*2.0)  * 0.14
  ) * ns;
}
```

### Smooth transitions:
Lerp all numeric config values at 0.038 per frame. This creates the smooth expansion when switching states.

### Innermost ring fill:
Radial gradient from center — `rgba(orbColor, alpha*0.14)` → transparent at edge.

---

## Hold-to-speak interaction
- **Press and hold** the mic button → starts listening after 100ms delay
- **Release** → stops recognition, sends transcript
- On mobile: `touchstart` / `touchend` with `e.preventDefault()`
- On desktop: `mousedown` / `mouseup` / `mouseleave`

---

## Result card
- Fixed to bottom, slides up with spring easing: `cubic-bezier(0.34, 1.48, 0.64, 1)`
- Auto-dismisses after 6.5 seconds
- Tap anywhere on card to dismiss early
- Each action item animates in with `slideUp` staggered by 70ms

### Action item structure:
```html
<li class="action-item">
  <div class="action-icon gmail">✉️</div>
  <div class="action-text">
    Draft created
    <span>Proposal — 3 price points</span>
  </div>
</li>
```

### Service → icon mapping:
```javascript
const icons = {
  gmail:    { e: '✉️', c: 'gmail' },
  calendar: { e: '📅', c: 'calendar' },
  ticktick: { e: '✓',  c: 'ticktick' },
  earl:     { e: '◆',  c: 'earl' },
  warn:     { e: '⚠',  c: 'warn' },
};
```

### Action icon background colors — must use CSS variables:
```css
.action-icon.gmail    { background: var(--icon-gmail); }
.action-icon.calendar { background: var(--icon-calendar); }
.action-icon.ticktick { background: var(--icon-ticktick); }
.action-icon.earl     { background: var(--icon-earl); }
.action-icon.warn     { background: var(--icon-warn); }
```

---

## Demo mode
When `/.netlify/functions/earl` returns an error (no backend yet), fall back to `demoActions(text)`:

```javascript
function demoActions(text) {
  const t = text.toLowerCase(), a = [];
  if (t.includes('email')||t.includes('draft')||t.includes('send'))
    a.push({ service:'gmail',    label:'Draft created', detail:'Proposal — 3 price points' });
  if (t.includes('remind')||t.includes('calendar')||t.includes('meeting'))
    a.push({ service:'calendar', label:'Reminder set',  detail:'Today at 5:00 PM' });
  if (t.includes('task')||t.includes('todo'))
    a.push({ service:'ticktick', label:'Task added',    detail:'Work — send proposal' });
  if (!a.length)
    a.push({ service:'earl',     label:'Noted',         detail: text.slice(0,60) });
  return a;
}
```

---

## CSS rules — all referencing variables
```css
body {
  background: linear-gradient(
    var(--bg-gradient-angle),
    var(--bg-gradient-start) 0%,
    var(--bg-gradient-mid)   50%,
    var(--bg-gradient-end)   100%
  );
  font-family: var(--font-body);
  color: var(--text-primary);
}

body::before {
  /* bloom */
  background: radial-gradient(ellipse 60% 50% at 50% 38%, var(--bloom-color) 0%, transparent 68%);
}

.wordmark {
  letter-spacing: var(--wordmark-tracking);
  color: var(--text-primary);
  border: 1px solid var(--border);
  background: var(--btn-bg);
}

.status-text      { color: var(--text-mid); }
.app.listening
  .status-text    { color: var(--text-primary); }

.ctrl-btn         { background: var(--btn-bg); border: 1px solid var(--btn-border); }
.ctrl-btn.cancel svg { stroke: var(--text-soft); }
.ctrl-btn.cancel:active { border-color: var(--danger); }
.ctrl-btn.cancel:active svg { stroke: var(--danger); }

.ctrl-btn.mic-main         { background: var(--mic-bg); border-color: var(--mic-border); }
.ctrl-btn.mic-main svg *   { stroke: var(--mic-icon); }
.ctrl-btn.mic-main.active  { background: var(--mic-active-bg); box-shadow: 0 0 28px var(--mic-active-glow); }
.ctrl-btn.mic-main.active svg * { stroke: var(--mic-icon-active); }

.result-card      { background: var(--card-bg); border-top: 1px solid var(--border); }
.card-handle      { background: var(--border); }
.card-label       { color: var(--text-soft); }
.action-text      { color: var(--text-primary); }
.action-text span { color: var(--text-soft); }
```

---

## Done when
- [ ] App renders correctly in the browser
- [ ] All 4 states work (idle, listening, processing, card)
- [ ] Orb animates smoothly and transitions between states
- [ ] Hold-to-speak works on both desktop and mobile
- [ ] Result card slides up with correct content
- [ ] Demo mode triggers when no backend is available
- [ ] Switching `data-theme` on `<html>` repaints the entire UI correctly
- [ ] No hardcoded color values in CSS or JS
