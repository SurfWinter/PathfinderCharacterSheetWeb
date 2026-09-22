const ICONS = {
  user: '<circle cx="12" cy="8" r="3.4"/><path d="M4.5 20c1.5-4 4.5-6 7.5-6s6 2 7.5 6"/>',
  bolt: '<path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" stroke-linejoin="round"/>',
  bag: '<rect x="4" y="7" width="16" height="13" rx="2"/><path d="M8 7V6a4 4 0 0 1 8 0v1"/>',
  spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/>',
  book: '<path d="M4 5.5C4 4.7 4.7 4 5.5 4H12v16H5.5A1.5 1.5 0 0 1 4 18.5v-13Z"/><path d="M20 5.5c0-.8-.7-1.5-1.5-1.5H12v16h6.5c.8 0 1.5-.7 1.5-1.5v-13Z"/>',
  star: '<path d="M12 3.5l2.6 5.4 5.9.7-4.3 4.1 1.1 5.9-5.3-2.9-5.3 2.9 1.1-5.9-4.3-4.1 5.9-.7L12 3.5Z" stroke-linejoin="round"/>',
  paw: '<circle cx="12" cy="16.2" r="3.4"/><circle cx="6.4" cy="10.2" r="2"/><circle cx="10" cy="7.2" r="2"/><circle cx="14" cy="7.2" r="2"/><circle cx="17.6" cy="10.2" r="2"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 3.2v2.3M12 18.5v2.3M4.5 7l2 1.15M17.5 15.85 19.5 17M4.5 17l2-1.15M17.5 8.15 19.5 7M3.2 12h2.3M18.5 12h2.3"/>',
  back: '<path d="M15 6 9 12l6 6"/>',
};

export function Icon({ name, size = 20 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2">
      <g dangerouslySetInnerHTML={{ __html: ICONS[name] || '' }} />
    </svg>
  );
}

export function Chev({ open }) {
  return (
    <svg className={`chev ${open ? 'open' : ''}`} width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export { ICONS };
