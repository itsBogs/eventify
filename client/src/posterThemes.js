export const POSTER_THEMES = [
  { id: 'neon', label: 'Neon concert', font: 'Anton', accent: '#ff3d87', description: 'Neon pink and purple glow' },
  { id: 'elegant', label: 'Elegant gala', font: 'Cormorant Garamond', accent: '#e1bd72', description: 'Formal cream and gold' },
  { id: 'retro', label: 'Retro festival', font: 'Bungee', accent: '#ff9a42', description: 'Warm retro orange' },
  { id: 'minimal', label: 'Minimal workshop', font: 'Sora', accent: '#76e5cf', description: 'Clean modern teal' },
  { id: 'sports', label: 'Sports energy', font: 'Oswald', accent: '#ff4d55', description: 'Bold red and black' },
  { id: 'script', label: 'Celebration', font: 'Dancing Script', accent: '#ff8fcb', description: 'Festive handwritten pink' },
  { id: 'cyber', label: 'Cyber tech', font: 'Orbitron', accent: '#49e7f4', description: 'Electric cyan and green' },
  { id: 'classic', label: 'Classic seminar', font: 'Roboto Slab', accent: '#d7bd91', description: 'Navy and warm cream' },
];

const categoryTheme = {
  music: ['neon', 'retro', 'script'], concert: ['neon', 'retro'], festival: ['retro', 'neon', 'script'],
  gala: ['elegant', 'script'], celebration: ['script', 'retro'], sports: ['sports'], workshop: ['minimal', 'cyber'],
  educational: ['minimal', 'classic', 'cyber'], technology: ['cyber', 'minimal'], tech: ['cyber', 'minimal'],
  seminar: ['classic', 'minimal'], conference: ['classic', 'cyber', 'minimal'],
};

export function getPosterTheme(event = {}) {
  const requested = POSTER_THEMES.find(theme => theme.id === event.theme);
  if (requested) return requested;
  const category = String(event.category || '').toLowerCase();
  const candidates = categoryTheme[category] || POSTER_THEMES.map(theme => theme.id);
  const identity = `${category}:${event._id || event.title || 'event'}`;
  let hash = 0;
  for (let i = 0; i < identity.length; i += 1) hash = (hash * 31 + identity.charCodeAt(i)) >>> 0;
  const themeId = candidates[hash % candidates.length];
  return POSTER_THEMES.find(theme => theme.id === themeId) || POSTER_THEMES[0];
}

export function posterGallery(event = {}) {
  const photos = [event.gallery, event.images, event.image].flatMap(value => Array.isArray(value) ? value : value ? [value] : []);
  return [...new Set(photos.filter(value => typeof value === 'string' && value.trim()))].slice(0, 6);
}
