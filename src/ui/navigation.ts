import type { View } from '../types/career.ts';

export const NAV_ITEMS: { id: View; label: string }[] = [
  { id: 'overview', label: 'Visão geral' },
  { id: 'squad', label: 'Team Manager' },
  { id: 'ranking', label: 'Ranking' },
  { id: 'market', label: 'Mercado' },
  { id: 'training', label: 'Treinos' },
  { id: 'strategy', label: 'Táticas & Olheiros' },
  { id: 'competition', label: 'Campeonato' },
];

const ICONS: Record<View, string> = {
  overview: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>',
  squad: '<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6M21 20v-2a6 6 0 0 0-4-5.65"/>',
  ranking: '<rect x="3" y="13" width="5" height="8" rx="1"/><rect x="9.5" y="8" width="5" height="13" rx="1"/><rect x="16" y="3" width="5" height="18" rx="1"/>',
  market: '<path d="M5 7h14l2 13H3ZM9 7V5a3 3 0 0 1 6 0v2M9 12v.01M15 12v.01"/>',
  training: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
  strategy: '<circle cx="5" cy="18" r="2"/><circle cx="19" cy="6" r="2"/><path d="M7 18h6a4 4 0 0 0 0-8H9a4 4 0 0 1 0-8h4M17 18l4 4M21 18l-4 4"/>',
  competition: '<path d="M8 3h8v6a4 4 0 0 1-8 0ZM8 5H4v2a4 4 0 0 0 4 4M16 5h4v2a4 4 0 0 1-4 4M12 13v5M8 21h8M9 18h6v3H9Z"/>',
};

export function navIcon(view: View): string {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICONS[view]}</svg>`;
}
