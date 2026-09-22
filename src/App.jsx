import { useEffect } from 'react';
import { useSheet } from './state/store.js';
import { Navbar } from './ui/shell.jsx';
import { Modal, Toast } from './ui/shared.jsx';
import CharacterTab from './ui/character/CharacterTab.jsx';
import ActionsTab from './ui/actions/ActionsTab.jsx';
import EquipmentTab from './ui/equipment/EquipmentTab.jsx';
import SpellsTab from './ui/spells/SpellsTab.jsx';
import BooksTab from './ui/books/BooksTab.jsx';
import FeatsTab from './ui/feats/FeatsTab.jsx';
import FamiliarTab from './ui/familiar/FamiliarTab.jsx';
import SettingsTab from './ui/settings/SettingsTab.jsx';

export default function App() {
  const tab = useSheet(s => s.tab);
  const familiarEnabled = useSheet(s => s.character.familiarEnabled);

  useEffect(() => {
    document.body.classList.toggle('settings-open', tab === 'settings');
  }, [tab]);

  let page = null;
  switch (tab) {
    case 'familiar': page = familiarEnabled ? <FamiliarTab /> : <CharacterTab />; break;
    case 'actions': page = <ActionsTab />; break;
    case 'equipment': page = <EquipmentTab />; break;
    case 'spells': page = <SpellsTab />; break;
    case 'books': page = <BooksTab />; break;
    case 'feats': page = <FeatsTab />; break;
    case 'settings': page = <SettingsTab />; break;
    default: page = <CharacterTab />;
  }

  return (
    <>
      <div id="app">{page}</div>
      <Navbar />
      <Modal />
      <Toast />
      <input type="file" id="importFileInput" accept=".xml" style={{ display: 'none' }} />
    </>
  );
}
