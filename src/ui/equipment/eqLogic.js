import { uid } from '../../domain/character-state.js';
import {
  bagCompartmentLocation, bagEffectiveBulk, canHoldRunes, compartmentContentsBulk,
  emptyCustomItem, instantiateLibraryItem, isBagItem, isFormulaRune, ITEM_CATEGORY_LABELS,
  FORMULA_CATEGORY_LABELS, normalizeArmorData, normalizeBagData, normalizeCategory,
  normalizeFormulaCategory, normalizeShieldData, normalizeWeaponData, parseItemLocation,
  wornCarriedBulk,
} from '../../domain/libraries/items.js';
import { CURRENCY_DEFS, formatBulk, fmtMod, setItemLocation, weaponAttackMod, weaponDamageLabel } from '../../lib/rules.js';

export function fallbackItemLocation(ch, excludeBagId) {
  const bags = ch.equipment.items.filter(item => isBagItem(item) && item.id !== excludeBagId);
  const bag = bags.find(item => item.location === 'worn') || bags[0];
  if (!bag) return 'worn';
  return bagCompartmentLocation(bag.id, bag.bag.compartments[0].id);
}

export function locationLabel(ch, loc) {
  if (loc === 'worn') return 'С собой';
  if (loc === 'belt') return 'На поясе';
  if (loc === 'equipped-armor') return 'Надето: броня';
  if (loc === 'equipped-shield') return 'Надето: щит';
  const parsed = parseItemLocation(loc);
  if (parsed.type === 'bag') {
    const bag = ch.equipment.items.find(item => item.id === parsed.bagId);
    if (!bag) return 'Сумка';
    const compartment = bag.bag.compartments.find(entry => entry.id === parsed.compartmentId);
    if (compartment && compartment.name) return `${bag.name} · ${compartment.name}`;
    return bag.name;
  }
  const storage = ch.equipment.storages.find(entry => entry.id === loc);
  return storage ? storage.name : 'С собой';
}

export function locationChoices(ch, current, opts = {}) {
  const options = [{ value: 'worn', label: 'С собой' }];
  if (!opts.forBag) {
    options.push({ value: 'belt', label: 'На поясе' });
    if (!opts.category || opts.category === 'armor') options.push({ value: 'equipped-armor', label: 'Надето: броня' });
    if (!opts.category || opts.category === 'shield') options.push({ value: 'equipped-shield', label: 'Надето: щит' });
    ch.equipment.items.filter(isBagItem).forEach(bag => {
      bag.bag.compartments.forEach(compartment => {
        const value = bagCompartmentLocation(bag.id, compartment.id);
        options.push({ value, label: compartment.name ? `${bag.name} · ${compartment.name}` : bag.name });
      });
    });
  }
  ch.equipment.storages.forEach(storage => options.push({ value: storage.id, label: storage.name }));
  if (current && !options.some(o => o.value === current)) {
    options.unshift({ value: current, label: locationLabel(ch, current) });
  }
  return options;
}

export function getCurrencyQty(ch, location, key) {
  const item = ch.equipment.items.find(entry => entry.isCurrency && entry.currencyKey === key && entry.location === location);
  return item ? Math.max(0, Number(item.qty) || 0) : 0;
}

export function setCurrencyQty(ch, location, key, qty) {
  qty = Math.max(0, Math.floor(Number(qty) || 0));
  const existing = ch.equipment.items.find(entry => entry.isCurrency && entry.currencyKey === key && entry.location === location);
  if (qty === 0) {
    if (existing) ch.equipment.items = ch.equipment.items.filter(entry => entry !== existing);
    return;
  }
  if (existing) {
    existing.qty = qty;
    return;
  }
  const def = CURRENCY_DEFS.find(entry => entry.key === key);
  ch.equipment.items.push({
    id: uid(), name: def.name, qty, bulk: 0, location, note: '',
    isCurrency: true, currencyKey: key, custom: false, traits: [],
  });
}

export function regularItemsAt(ch, location) {
  return ch.equipment.items.filter(item => !item.isCurrency && !isBagItem(item) && item.location === location);
}
export function bagsAt(ch, location) {
  return ch.equipment.items.filter(item => isBagItem(item) && item.location === location);
}

export function cloneItemRecord(item) {
  const copy = Object.assign({}, item, {
    id: uid(),
    traits: Array.isArray(item.traits) ? item.traits.map(t => Object.assign({}, t)) : [],
    runes: [],
    weapon: item.weapon ? Object.assign({}, item.weapon) : null,
    armor: item.armor ? Object.assign({}, item.armor) : null,
    shield: item.shield ? Object.assign({}, item.shield) : null,
    consumable: item.consumable ? Object.assign({}, item.consumable) : null,
    bag: null,
  });
  if (item.bag) {
    copy.bag = {
      weightMode: item.bag.weightMode,
      ignoreBulk: item.bag.ignoreBulk,
      compartments: (item.bag.compartments || []).map(c => ({
        id: uid(), name: c.name || '', capacity: Number(c.capacity) || 0,
      })),
    };
  }
  delete copy.shieldHpCurrent;
  return copy;
}

export function cloneEquipmentToFormula(item) {
  const copy = cloneItemRecord(item);
  copy.qty = 1;
  copy.location = 'formula';
  copy.runes = [];
  delete copy.runeSlot;
  return copy;
}
export function cloneFormulaToEquipment(item) {
  if (!item || isFormulaRune(item)) return null;
  const copy = cloneItemRecord(item);
  copy.qty = 1;
  copy.location = 'worn';
  copy.runes = [];
  delete copy.runeSlot;
  return copy;
}

export function itemStatsText(ch, item, opts = {}) {
  if (item.weapon) {
    const w = item.weapon;
    const combat = opts.formula
      ? [w.damage, w.damageType].filter(Boolean).join(' ')
      : `${fmtMod(weaponAttackMod(ch, item))} · ${weaponDamageLabel(ch, item)}`;
    const parts = [
      w.type === 'ranged' ? 'дальнобойное' : 'ближний бой',
      w.group, w.hands ? `${w.hands} рук.` : '',
      w.type === 'ranged' ? w.range : '',
      w.type === 'ranged' && w.reload !== '' && w.reload != null ? `перезарядка ${w.reload}` : '',
      w.type === 'ranged' ? w.ammo : '',
    ].filter(Boolean);
    return { combat, parts: parts.join(' · ') };
  }
  if (item.armor) {
    const a = item.armor;
    const parts = [
      a.ac ? `КБ ${a.ac}` : '', a.dexCap ? `макс. Ловк. ${a.dexCap}` : '',
      a.armorCategory, a.group, a.speedPenalty ? `скорость ${a.speedPenalty}` : '',
      a.strength ? `сила ${a.strength}` : '',
    ].filter(Boolean);
    return { combat: '', parts: parts.join(' · ') };
  }
  if (item.shield) {
    const s = item.shield;
    const parts = [
      s.acBonus ? `КБ ${fmtMod(s.acBonus)}` : '',
      s.hardness ? `твёрдость ${s.hardness}` : '',
      s.hpMax ? `ПЗ ${s.hpMax}` : '',
    ].filter(Boolean);
    return { combat: '', parts: parts.join(' · ') };
  }
  if (item.consumable) {
    const c = item.consumable;
    return { combat: '', parts: [c.usage, c.activation].filter(Boolean).join(' · ') };
  }
  return { combat: '', parts: '' };
}

export function applyItemFormData(ch, target, form, mode) {
  const formula = mode === 'formula';
  const category = normalizeCategory(form.category);
  const wasBag = isBagItem(target);
  target.name = form.name.trim() || 'Без названия';
  if (form.libraryId) target.libraryId = form.libraryId;
  target.category = category;
  target.note = form.note;
  target.desc = form.desc;
  target.custom = true;
  target.isCurrency = false;
  if (formula) {
    target.qty = 1;
    target.bulk = Number(form.bulk) || 0;
    target.location = 'formula';
    delete target.shieldHpCurrent;
    delete target.runeSlot;
  } else {
    target.qty = Math.max(0, Number(form.qty) || 0);
    target.bulk = Number(form.bulk) || 0;
    let location = form.location || target.location || 'worn';
    if (category === 'bag' && parseItemLocation(location).type === 'bag') location = 'worn';
    setItemLocation(ch, target, location);
  }
  if (category === 'weapon') {
    const prev = target.weapon || {};
    target.weapon = normalizeWeaponData({ ...form.weapon, proficiency: prev.proficiency, otherBonus: prev.otherBonus }, { instance: true });
  } else target.weapon = null;
  if (category === 'armor') target.armor = normalizeArmorData(form.armor);
  else target.armor = null;
  if (category === 'shield') {
    const max = Math.max(0, Number(form.shield.hpMax) || 0);
    target.shield = normalizeShieldData(form.shield);
    if (!formula && target.location === 'equipped-shield') {
      target.shieldHpCurrent = Math.max(0, Math.min(max, target.shieldHpCurrent == null ? max : Number(target.shieldHpCurrent) || 0));
    } else delete target.shieldHpCurrent;
  } else {
    target.shield = null;
    delete target.shieldHpCurrent;
  }
  if (category === 'consumable') target.consumable = { usage: form.consumable.usage, activation: form.consumable.activation };
  else target.consumable = null;
  if (category === 'bag') {
    const compartments = form.bag.compartments.length ? form.bag.compartments : [{ id: uid(), name: '', capacity: 4 }];
    target.bag = {
      weightMode: form.bag.weightMode === 'fixed' ? 'fixed' : 'contents',
      ignoreBulk: form.bag.weightMode === 'fixed' ? 0 : (Number(form.bag.ignoreBulk) || 0),
      compartments,
    };
    if (!formula && wasBag) {
      const keep = new Set(target.bag.compartments.map(entry => entry.id));
      const dest = bagCompartmentLocation(target.id, target.bag.compartments[0].id);
      ch.equipment.items.forEach(item => {
        if (!String(item.location).startsWith(`bag:${target.id}:`)) return;
        const compartmentId = String(item.location).split(':')[2];
        if (!keep.has(compartmentId)) item.location = dest;
      });
    }
  } else {
    if (!formula && wasBag) {
      const dest = fallbackItemLocation(ch, target.id);
      ch.equipment.items.forEach(item => {
        if (String(item.location).startsWith(`bag:${target.id}:`)) item.location = dest;
      });
    }
    target.bag = null;
  }
  target.traits = form.traits || [];
  if (formula || !canHoldRunes(target)) target.runes = [];
  else target.runes = form.runes || [];
  return target;
}

export function deleteEquipmentItem(ch, id) {
  const item = ch.equipment.items.find(entry => entry.id === id);
  if (!item) return;
  if (isBagItem(item)) {
    const dest = fallbackItemLocation(ch, item.id);
    ch.equipment.items.forEach(entry => {
      if (String(entry.location).startsWith(`bag:${item.id}:`)) entry.location = dest;
    });
  }
  ch.equipment.items = ch.equipment.items.filter(entry => entry.id !== id);
}

export function formFromItem(item) {
  const cat = normalizeCategory(item.category);
  const w = item.weapon || {};
  const a = item.armor || {};
  const s = item.shield || {};
  const c = item.consumable || {};
  const b = item.bag || normalizeBagData({ weightMode: 'contents', ignoreBulk: 0, capacity: 4, cell: 1 }, uid);
  return {
    name: item.name || '',
    libraryId: item.libraryId || '',
    qty: item.qty == null ? 1 : item.qty,
    bulk: item.bulk || 0,
    category: cat,
    location: item.location || 'worn',
    note: item.note || '',
    desc: item.desc || '',
    traits: (item.traits || []).map(t => Object.assign({}, t)),
    runes: (item.runes || []).map(r => ({
      id: r.id || uid(),
      libraryId: r.libraryId || null,
      name: r.name || '',
      desc: r.desc || '',
      traits: (r.traits || []).map(t => Object.assign({}, t)),
    })),
    weapon: {
      type: w.type || 'melee',
      damage: w.damage || '',
      damageType: w.damageType || '',
      group: w.group || '',
      hands: w.hands || '',
      range: w.range || '',
      reload: w.reload || '',
      ammo: w.ammo || '',
    },
    armor: {
      ac: a.ac || '',
      dexCap: a.dexCap || '',
      group: a.group || '',
      armorCategory: a.armorCategory || '',
      speedPenalty: a.speedPenalty || '',
      strength: a.strength || '',
    },
    shield: { acBonus: s.acBonus || 0, hardness: s.hardness || 0, hpMax: s.hpMax || 0 },
    consumable: { usage: c.usage || '', activation: c.activation || '' },
    bag: {
      weightMode: b.weightMode === 'fixed' ? 'fixed' : 'contents',
      ignoreBulk: b.ignoreBulk || 0,
      compartments: (b.compartments || []).map(comp => ({
        id: comp.id || uid(),
        name: comp.name || '',
        capacity: Number(comp.capacity) || 0,
      })),
    },
  };
}

export {
  emptyCustomItem, instantiateLibraryItem, isBagItem, isFormulaRune, ITEM_CATEGORY_LABELS,
  FORMULA_CATEGORY_LABELS, normalizeCategory, normalizeFormulaCategory, bagCompartmentLocation,
  bagEffectiveBulk, compartmentContentsBulk, wornCarriedBulk, canHoldRunes, formatBulk,
  CURRENCY_DEFS, normalizeBagData, parseItemLocation,
};
