import { emptyCurriculumPrepared, normalizeCastCost, uid } from '../domain/character-state.js';
import {
  autoHeightenRank, isAutoHeightenSpell, spellFitsFocusList, spellFitsPreparedSlot,
  spellHasCantripTrait, spellHasFocusTrait, spellDisplayRank,
} from '../domain/libraries/traits.js';
import { SPELL_LEVELS, rankLabel } from './rules.js';

export function preparedGroupLabel(lvl, characterLevel) {
  lvl = Number(lvl);
  if (lvl === 0) return 'Фокусы · ' + autoHeightenRank(characterLevel) + ' круг';
  return rankLabel(lvl);
}
export function spellOptionLabel(spell, characterLevel) {
  const rank = spellDisplayRank(spell, characterLevel);
  if (spellHasCantripTrait(spell) && !spellHasFocusTrait(spell)) return `${spell.name} (фокус · ${rank} круг)`;
  if (spellHasFocusTrait(spell) && !spellHasCantripTrait(spell)) return `${spell.name} (фокальное · ${rank} круг)`;
  return `${spell.name} (${rank} круг)`;
}
export function spellRankText(spell, characterLevel) {
  return spellDisplayRank(spell, characterLevel) + ' круг';
}
export function rankToast(lvl) {
  lvl = Number(lvl);
  if (lvl === 0) return 'фокусов';
  return lvl + ' круга';
}

export function syncPreparedSlots(ch) {
  const sc = ch.spellcasting;
  SPELL_LEVELS.forEach(lvl => {
    const max = Number(sc.slotsMax[lvl] || 0);
    if (!sc.prepared[lvl]) sc.prepared[lvl] = [];
    const arr = sc.prepared[lvl];
    while (arr.length < max) arr.push({ spellId: null, expended: false });
    while (arr.length > max) arr.pop();
    if (lvl === 0) {
      arr.forEach(slot => { if (slot) slot.expended = false; });
    } else if (sc.type === 'prepared') {
      sc.slotsUsed[lvl] = arr.filter(slot => slot && slot.spellId && slot.expended).length;
    }
  });
}
export function syncCurriculumPrepared(ch) {
  const sc = ch.spellcasting;
  if (!sc.curriculumPrepared || typeof sc.curriculumPrepared !== 'object' || Array.isArray(sc.curriculumPrepared)) {
    sc.curriculumPrepared = emptyCurriculumPrepared();
  }
  SPELL_LEVELS.forEach(lvl => {
    const slot = sc.curriculumPrepared[lvl];
    if (!slot || typeof slot !== 'object') {
      sc.curriculumPrepared[lvl] = { spellId: null, expended: false };
    } else if (lvl === 0) {
      slot.expended = false;
    }
  });
}
export function curriculumSlotsOn(ch) {
  return !!(ch.curriculumEnabled && ch.spellcasting.type === 'prepared');
}
export function cloneSpellEntry(sp) {
  return {
    id: uid(),
    name: (sp && sp.name) || 'Без названия',
    level: sp && sp.level,
    tradition: (sp && sp.tradition) || '',
    desc: (sp && sp.desc) || '',
    traits: Array.isArray(sp && sp.traits) ? sp.traits.map(t => Object.assign({}, t)) : [],
    cast: normalizeCastCost(sp && sp.cast),
  };
}
export function preparedSlotsAt(ch, lvl) {
  return (ch.spellcasting.prepared[lvl] || []);
}
export function spendPreparedRank(ch, lvl) {
  const slot = preparedSlotsAt(ch, lvl).find(s => s && s.spellId && !s.expended);
  if (!slot) return false;
  slot.expended = true;
  syncPreparedSlots(ch);
  return true;
}
export function restorePreparedRank(ch, lvl) {
  const slots = preparedSlotsAt(ch, lvl);
  for (let i = slots.length - 1; i >= 0; i--) {
    const slot = slots[i];
    if (slot && slot.spellId && slot.expended) {
      slot.expended = false;
      syncPreparedSlots(ch);
      return true;
    }
  }
  return false;
}
export function togglePreparedSlot(ch, lvl, idx) {
  lvl = Number(lvl);
  if (lvl === 0) return false;
  const slot = preparedSlotsAt(ch, lvl)[Number(idx)];
  if (!slot || !slot.spellId) return false;
  slot.expended = !slot.expended;
  syncPreparedSlots(ch);
  return slot.expended;
}
export function toggleCurriculumSlot(ch, lvl) {
  lvl = Number(lvl);
  if (lvl === 0) return false;
  const slot = ch.spellcasting.curriculumPrepared && ch.spellcasting.curriculumPrepared[lvl];
  if (!slot || !slot.spellId) return false;
  slot.expended = !slot.expended;
  return slot.expended;
}

export function storedSpellLevel(traits, raw) {
  if (isAutoHeightenSpell({ traits: traits || [] })) return Math.max(0, Number(raw) || 0);
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return 1;
  if (n > 10) return 10;
  return Math.floor(n);
}

export function spellBookGroupKeys(sp) {
  const keys = [];
  if (spellHasCantripTrait(sp)) keys.push('cantrip');
  if (spellHasFocusTrait(sp)) keys.push('focus');
  if (!keys.length) {
    const lvl = Math.max(1, Math.min(10, Number(sp.level) || 1));
    keys.push('rank:' + lvl);
  }
  return keys;
}

export function emptyRuneFormula() {
  return {
    id: uid(),
    libraryId: null,
    name: '',
    category: 'rune',
    qty: 1,
    bulk: 0,
    location: 'formula',
    note: '',
    desc: '',
    traits: [],
    isCurrency: false,
    custom: true,
    runes: [],
    runeSlot: 'weapon',
    weapon: null,
    armor: null,
    shield: null,
    consumable: null,
    bag: null,
  };
}

export {
  autoHeightenRank, isAutoHeightenSpell, spellFitsFocusList, spellFitsPreparedSlot,
  spellHasCantripTrait, spellHasFocusTrait, spellDisplayRank, normalizeCastCost,
};
