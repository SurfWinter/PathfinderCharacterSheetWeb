import { create } from 'zustand';
import {
  createCharacterProfile,
  defaultCharacter,
  deleteCharacterProfile,
  listCharacterProfiles,
  loadCharacter,
  normalizeCharacter,
  saveCharacter,
  switchCharacterProfile,
} from '../domain/character-state.js';

export const useSheet = create((set, get) => ({
  character: loadCharacter(),
  rev: 0,
  tab: 'character',
  booksSection: 'spellbook',
  settingsReturnTab: 'character',
  modal: null,
  toast: null,
  flash: null,
  openItems: {},
  openBags: {},

  patch(fn) {
    const character = get().character;
    fn(character);
    saveCharacter(character);
    set({ character, rev: get().rev + 1 });
  },

  replaceCharacter(next) {
    const character = normalizeCharacter(next);
    saveCharacter(character);
    set({
      character,
      rev: get().rev + 1,
      tab: get().tab === 'familiar' && !character.familiarEnabled ? 'character' : get().tab,
      booksSection: get().booksSection === 'curriculum' && !character.curriculumEnabled
        ? 'spellbook'
        : get().booksSection,
    });
  },

  setTab(tab) {
    if (tab === 'settings') {
      const current = get().tab;
      set({ settingsReturnTab: current === 'settings' ? get().settingsReturnTab : current, tab: 'settings' });
      window.scrollTo(0, 0);
      return;
    }
    set({ tab });
    window.scrollTo(0, 0);
  },

  closeSettings() {
    const { settingsReturnTab, character } = get();
    const next = (settingsReturnTab === 'familiar' && !character.familiarEnabled)
      ? 'character'
      : (settingsReturnTab || 'character');
    set({ tab: next });
    window.scrollTo(0, 0);
  },

  setBooksSection(booksSection) {
    set({ booksSection });
  },

  setMode(mode) {
    const character = get().character;
    if (character.mode === mode) return;
    character.mode = mode;
    const compact = mode === 'play';
    character.hpCollapsed = compact;
    character.defensesCollapsed = compact;
    character.perceptionCollapsed = compact;
    if (character.familiar) {
      character.familiar.hpCollapsed = compact;
      character.familiar.defensesCollapsed = compact;
    }
    saveCharacter(character);
    set({ character, rev: get().rev + 1 });
  },

  openModal(modal) {
    set({ modal });
  },
  closeModal() {
    set({ modal: null });
  },

  showToast(message, tone) {
    set({ toast: { message, tone: tone || '', id: Date.now() } });
  },

  queueFlash(key, tone) {
    set({ flash: { key, tone: tone || 'info', id: Date.now() } });
  },

  toggleOpenItem(id) {
    const openItems = { ...get().openItems, [id]: !get().openItems[id] };
    set({ openItems });
  },
  toggleOpenBag(id) {
    const openBags = { ...get().openBags, [id]: !get().openBags[id] };
    set({ openBags });
  },

  openBookGroup(key) {
    const character = get().character;
    if (!character.booksCollapsed || typeof character.booksCollapsed !== 'object') character.booksCollapsed = {};
    character.booksCollapsed[key] = false;
    saveCharacter(character);
    set({ character, rev: get().rev + 1 });
  },

  switchProfile(id) {
    const character = switchCharacterProfile(id);
    set({ character, rev: get().rev + 1, tab: 'character' });
  },
  createProfile(name) {
    const character = createCharacterProfile(name);
    set({ character, rev: get().rev + 1, tab: 'character', modal: null });
  },
  deleteActiveProfile() {
    const profiles = listCharacterProfiles();
    const active = profiles.find(p => p.active) || profiles[0];
    if (!active) return { ok: false, reason: 'missing' };
    const result = deleteCharacterProfile(active.id);
    if (!result.ok) return result;
    set({ character: result.character, rev: get().rev + 1, tab: 'character' });
    return result;
  },
  resetActive() {
    const character = defaultCharacter();
    saveCharacter(character);
    set({ character, rev: get().rev + 1 });
  },
}));

export function useCharacter() {
  return useSheet(s => {
    void s.rev;
    return s.character;
  });
}

export function patch(fn) {
  useSheet.getState().patch(fn);
}
export function toast(message, tone) {
  useSheet.getState().showToast(message, tone);
}
export function flash(key, tone) {
  useSheet.getState().queueFlash(key, tone);
}
