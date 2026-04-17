// themes/themes.js
// Each theme maps to a data-theme attribute value on <html>.
// CSS custom properties for each theme are defined in public/index.html.

export const themes = [
  {
    id: 'slate',
    name: 'Slate',
    description: 'Cool twilight. Focused, quiet.',
    preview: '#6B6880',
    // DEFAULT theme
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

export const defaultTheme = 'parchment';
