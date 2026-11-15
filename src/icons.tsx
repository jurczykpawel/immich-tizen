import type { ComponentChildren } from 'preact';

// One icon family: 24px grid, 2px round strokes (Lucide-style).
const Svg = ({ children, size = 40 }: { children: ComponentChildren; size?: number }) => (
  <svg class="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{children}</svg>
);
type P = { size?: number };

export const GearIcon = (p: P) => <Svg {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></Svg>;
export const PlayIcon = (p: P) => <Svg {...p}><polygon points="6 4 20 12 6 20 6 4" /></Svg>;
export const PauseIcon = (p: P) => <Svg {...p}><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></Svg>;
export const ClockIcon = (p: P) => <Svg {...p}><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15.5 14" /></Svg>;
export const PhoneIcon = (p: P) => <Svg {...p}><rect x="6" y="2" width="12" height="20" rx="3" /><line x1="11" y1="18" x2="13" y2="18" /></Svg>;
export const KeyboardIcon = (p: P) => <Svg {...p}><rect x="2" y="6" width="20" height="12" rx="2" /><line x1="6" y1="10" x2="6.01" y2="10" /><line x1="10" y1="10" x2="10.01" y2="10" /><line x1="14" y1="10" x2="14.01" y2="10" /><line x1="18" y1="10" x2="18.01" y2="10" /><line x1="7" y1="14" x2="17" y2="14" /></Svg>;
export const TrashIcon = (p: P) => <Svg {...p}><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></Svg>;
export const ChevronLeftIcon = (p: P) => <Svg {...p}><polyline points="15 18 9 12 15 6" /></Svg>;
export const ChevronRightIcon = (p: P) => <Svg {...p}><polyline points="9 18 15 12 9 6" /></Svg>;
export const AlertIcon = (p: P) => <Svg {...p}><path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></Svg>;
export const ImageIcon = (p: P) => <Svg {...p}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></Svg>;
export const LogoMark = ({ size = 56 }: P) => (
  <svg class="logo" width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
    <circle cx="24" cy="24" r="22" fill="#1d2230" />
    <path d="M24 6c3 5 3 9 0 14-3-5-3-9 0-14z" fill="#f2c94c" /><path d="M42 24c-5 3-9 3-14 0 5-3 9-3 14 0z" fill="#eb5757" />
    <path d="M24 42c-3-5-3-9 0-14 3 5 3 9 0 14z" fill="#6fcf97" /><path d="M6 24c5-3 9-3 14 0-5 3-9 3-14 0z" fill="#56ccf2" />
  </svg>
);
export const AlbumsIcon = (p: P) => <Svg {...p}><rect x="3" y="3" width="8" height="8" rx="1.5" /><rect x="13" y="3" width="8" height="8" rx="1.5" /><rect x="3" y="13" width="8" height="8" rx="1.5" /><rect x="13" y="13" width="8" height="8" rx="1.5" /></Svg>;
export const CalendarIcon = (p: P) => <Svg {...p}><rect x="3" y="5" width="18" height="16" rx="2" /><line x1="3" y1="10" x2="21" y2="10" /><line x1="8" y1="3" x2="8" y2="7" /><line x1="16" y1="3" x2="16" y2="7" /></Svg>;
export const MotionIcon = (p: P) => <Svg {...p}><polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" /></Svg>;
