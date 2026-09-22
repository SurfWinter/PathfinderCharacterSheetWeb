import { getLibraryTrait, matchLibraryTrait } from '../domain/libraries/traits.js';
import { isBagItem, parseItemLocation, parseStatNumber } from '../domain/libraries/items.js';

export const PROF_RANKS = ['untrained', 'trained', 'expert', 'master', 'legendary'];
export const PROF_LABEL = {
  untrained: 'Неизученный',
  trained: 'Изученный',
  expert: 'Экспертный',
  master: 'Мастерский',
  legendary: 'Легендарный',
};
export const PROF_BONUS = { untrained: 0, trained: 2, expert: 4, master: 6, legendary: 8 };
export const SPELL_LEVELS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
export const ACTION_TYPES = [
  'Свободное действие', 'Реакция', 'Одно действие', 'Два действия',
  'Три действия', 'От 1 до 3 действий', '10 минут', 'Несколько раундов',
];
export const CAST_COSTS = ['1', '2', '3', '1-3', 'reaction'];
export const CAST_COST_LABEL = {
  '1': 'Одно действие',
  '2': 'Два действия',
  '3': 'Три действия',
  '1-3': 'От одного до трёх действий',
  reaction: 'Реакция',
};
export const CURRENCY_DEFS = [
  { key: 'cp', name: 'Медные монеты', short: 'мм' },
  { key: 'sp', name: 'Серебряные монеты', short: 'см' },
  { key: 'gp', name: 'Золотые монеты', short: 'зм' },
  { key: 'pp', name: 'Платиновые монеты', short: 'пм' },
];
export const ABILITY_SHORT = { str: 'Сил', dex: 'Лов', con: 'Тел', int: 'Инт', wis: 'Мдр', cha: 'Хар' };

export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}
export function fmtMod(n) {
  n = Number(n) || 0;
  return (n >= 0 ? '+' : '') + n;
}
export function profTotal(rank, level) {
  if (rank === 'untrained') return 0;
  return PROF_BONUS[rank] + Number(level || 0);
}
export function formatBulk(n) {
  n = Number(n) || 0;
  if (Math.abs(n) < 0.0005) return '0';
  return String(Math.round(n * 1000) / 1000);
}

export function isPlay(ch) {
  return ch.mode === 'play';
}

export function equippedItem(ch, slot) {
  return (ch.equipment.items || []).find(item => item.location === slot && !item.isCurrency) || null;
}

export function itemHasLibraryTrait(item, id) {
  return !!(item && (item.traits || []).some(trait => trait && trait.type === 'library' && trait.id === id));
}

export function characterHasTrait(ch, id) {
  const lib = getLibraryTrait(id);
  return (ch.traits || []).some(trait => {
    if (!trait) return false;
    if (trait.type === 'library' && trait.id === id) return true;
    const name = trait.name;
    if (!name) return false;
    const matched = matchLibraryTrait(name);
    if (matched && matched.id === id) return true;
    return !!(lib && String(name).trim().toLocaleLowerCase('ru') === lib.name.toLocaleLowerCase('ru'));
  });
}

export function weaponAbilityId(item) {
  const type = item && item.weapon && item.weapon.type === 'ranged' ? 'ranged' : 'melee';
  if (type === 'ranged') return 'dex';
  if (itemHasLibraryTrait(item, 'finesse')) return 'dex';
  return 'str';
}

export function weaponAttackMod(ch, item) {
  if (!item || !item.weapon) return 0;
  const ability = weaponAbilityId(item);
  const abilityModValue = Number(ch.abilities[ability] && ch.abilities[ability].mod) || 0;
  const prof = profTotal(item.weapon.proficiency || 'untrained', ch.level);
  return abilityModValue + prof + (Number(item.weapon.otherBonus) || 0);
}

export function weaponDamageLabel(ch, item) {
  if (!item || !item.weapon) return '';
  const dice = String(item.weapon.damage || '').trim();
  const dtype = String(item.weapon.damageType || '').trim();
  let body = dice;
  if (item.weapon.type !== 'ranged') {
    const str = Number(ch.abilities.str && ch.abilities.str.mod) || 0;
    if (str) body = dice ? dice + (str > 0 ? '+' + str : String(str)) : fmtMod(str);
  }
  return [body, dtype].filter(Boolean).join(' ');
}

export function characterAcInfo(ch) {
  const armorItem = equippedItem(ch, 'equipped-armor');
  const shieldItem = equippedItem(ch, 'equipped-shield');
  const armor = armorItem && armorItem.armor;
  const shield = shieldItem && shieldItem.shield;
  const dexMod = Number(ch.abilities.dex.mod) || 0;
  const cap = armor ? parseStatNumber(armor.dexCap) : null;
  const dexUsed = cap === null ? dexMod : Math.min(dexMod, cap);
  const armorBonus = armor ? (parseStatNumber(armor.ac) || 0) : 0;
  const shieldBonus = shield ? (Number(shield.acBonus) || 0) : 0;
  const total = 10 + armorBonus + dexUsed + profTotal(ch.defenses.ac.proficiency, ch.level)
    + (Number(ch.defenses.ac.otherBonus) || 0) + shieldBonus;
  return { total, armorItem, shieldItem, armorBonus, shieldBonus, dexUsed, cap };
}

export function setItemLocation(ch, item, location) {
  if (!item) return;
  if (item.isCurrency) {
    if (location === 'belt' || location === 'equipped-armor' || location === 'equipped-shield') location = 'worn';
  } else if (isBagItem(item)) {
    const parsed = parseItemLocation(location);
    if (parsed.type === 'bag' || location === 'belt' || location === 'equipped-armor' || location === 'equipped-shield') location = 'worn';
  } else {
    if (location === 'equipped-armor' && item.category !== 'armor') location = 'worn';
    if (location === 'equipped-shield' && item.category !== 'shield') location = 'worn';
  }
  if (location === 'equipped-armor' || location === 'equipped-shield') {
    ch.equipment.items.forEach(entry => {
      if (entry === item || entry.location !== location) return;
      if (location === 'equipped-shield') delete entry.shieldHpCurrent;
      entry.location = 'worn';
    });
  }
  const prev = item.location;
  if (prev === 'equipped-shield' && location !== 'equipped-shield') delete item.shieldHpCurrent;
  item.location = location;
  if (location === 'equipped-shield' && item.shield && prev !== 'equipped-shield') {
    item.shieldHpCurrent = Number(item.shield.hpMax) || 0;
  }
}

export function applyAbilityBoost(st) {
  if (st.mod < 4) st.mod += 1;
  else if (st.partial) {
    st.mod += 1;
    st.partial = false;
  } else st.partial = true;
}
export function applyAbilityFlaw(st) {
  st.mod -= 1;
  st.partial = false;
}

export function applyHpDeltaTo(hp, d, max) {
  const cap = max == null ? hp.max : max;
  if (d < 0) {
    let dmg = -d;
    if (hp.temp > 0) {
      const absorbed = Math.min(hp.temp, dmg);
      hp.temp -= absorbed;
      dmg -= absorbed;
    }
    hp.current = clamp(hp.current - dmg, 0, cap);
  } else {
    hp.current = clamp(hp.current + d, 0, cap);
  }
}

export function rankLabel(lvl) {
  lvl = Number(lvl);
  return lvl === 0 ? 'Фокусы' : (lvl + ' круг');
}

export function traitDisplay(trait) {
  if (trait && typeof trait === 'object' && trait.type === 'library') {
    const libraryTrait = getLibraryTrait(trait.id);
    if (libraryTrait) return { name: libraryTrait.name, color: libraryTrait.color };
    return { name: trait.id, color: 'default' };
  }
  return { name: typeof trait === 'string' ? trait : (trait && trait.name) || '', color: 'default' };
}
export function traitKey(trait) {
  if (trait && typeof trait === 'object' && trait.type === 'library') return `library:${trait.id}`;
  return `custom:${traitDisplay(trait).name.trim().toLocaleLowerCase('ru')}`;
}

export function saveTotal(ch, key, abilityId) {
  const d = ch.defenses[key];
  return ch.abilities[abilityId].mod + profTotal(d.proficiency, ch.level) + Number(d.otherBonus || 0);
}
