import { Icon } from './icons.jsx';
import { isPlay } from '../lib/rules.js';
import { useCharacter, useSheet } from '../state/store.js';

const BASE_TABS = [
  { id: 'character', label: 'Персонаж', icon: 'user' },
  { id: 'actions', label: 'Действия', icon: 'bolt' },
  { id: 'equipment', label: 'Снаряжение', icon: 'bag' },
  { id: 'spells', label: 'Заклинания', icon: 'spark' },
  { id: 'books', label: 'Книги', icon: 'book' },
  { id: 'feats', label: 'Черты', icon: 'star' },
];

export function Topbar({ title, subtitle, settings }) {
  const ch = useCharacter();
  const setMode = useSheet(s => s.setMode);
  const setTab = useSheet(s => s.setTab);
  const closeSettings = useSheet(s => s.closeSettings);
  const play = isPlay(ch);

  if (settings) {
    return (
      <div className="topbar">
        <button type="button" className="icon-btn" aria-label="Назад" onClick={closeSettings}>
          <Icon name="back" size={18} />
        </button>
        <div className="topbar-main">
          <div className="title">{title}</div>
          {subtitle ? <div className="sub">{subtitle}</div> : null}
        </div>
      </div>
    );
  }

  return (
    <div className="topbar">
      <div className="topbar-main">
        <div className="title">{title}</div>
        {subtitle ? <div className="sub">{subtitle}</div> : null}
      </div>
      <div className="topbar-right">
        <div className="mode-switch">
          <button type="button" className={`mode-btn ${!play ? 'active' : ''}`} onClick={() => setMode('setup')}>Настройка</button>
          <button type="button" className={`mode-btn play-active ${play ? 'active' : ''}`} onClick={() => setMode('play')}>Игра</button>
        </div>
        <button type="button" className="icon-btn" aria-label="Настройки" onClick={() => setTab('settings')}>
          <Icon name="gear" size={18} />
        </button>
      </div>
    </div>
  );
}

export function Navbar() {
  const ch = useCharacter();
  const tab = useSheet(s => s.tab);
  const setTab = useSheet(s => s.setTab);
  if (tab === 'settings') return null;
  const tabs = BASE_TABS.slice();
  if (ch.familiarEnabled) tabs.splice(1, 0, { id: 'familiar', label: 'Фамильяр', icon: 'paw' });
  return (
    <div className="navbar" id="navbar">
      {tabs.map(t => (
        <button key={t.id} type="button" className={`nav-item ${t.id === tab ? 'active' : ''}`} onClick={() => setTab(t.id)}>
          <Icon name={t.icon} />
          <span>{t.label}</span>
        </button>
      ))}
    </div>
  );
}
