// Библиотека предметов. category: weapon, armor, shield, gear, consumable, bag, other.
// Дескрипторы: { type:'library', id } из traits.js или { type:'custom', name }.
// Оружие: type melee | ranged. Дальность и боеприпасы только у ranged.
// Щит: acBonus, hardness, hpMax. Текущие ПЗ щита живут на экземпляре, только пока он экипирован.

export const ITEM_CATEGORY_LABELS = {
  weapon: 'Оружие',
  armor: 'Броня',
  shield: 'Щит',
  gear: 'Снаряжение',
  consumable: 'Расходник',
  bag: 'Сумка',
  other: 'Разное',
};
export const FORMULA_CATEGORY_LABELS = Object.assign({}, ITEM_CATEGORY_LABELS, {
  rune: 'Руны',
});

export const ON_PERSON_LOCATIONS = ['worn', 'belt', 'equipped-armor', 'equipped-shield'];
const WEAPON_PROF_RANKS = ['untrained', 'trained', 'expert', 'master', 'legendary'];

export const ITEM_LIBRARY = [
  {
    id: 'backpack',
    name: 'Рюкзак',
    category: 'bag',
    bulk: 0,
    traits: [],
    desc: 'В рюкзак можно сложить предметы общим весом до 4; при этом первые 2 единицы веса положенных внутрь предметов не учитываются при определении предельного веса. Если вы не носите рюкзак на спине, а переносите его как-то ещё или убрали, его вес считается лёгким, а не незначительным.',
    bag: {
      weightMode: 'contents',
      ignoreBulk: 2,
      compartments: [
        { name: '', capacity: 4 },
      ],
    },
  },

  {
    id: 'spaciousPouchLvl4',
    name: 'Бездонная сумка I',
    category: 'bag',
    bulk: 1,
    traits: [
      { type: 'library', id: 'magic' },
      { type: 'library', id: 'extradimensional' },
    ],
    desc: 'Межпространственная сумка. Её собственный объём всегда равен 1, независимо от содержимого. Внутри можно хранить предметы общим объёмом до 25.',
    bag: {
      weightMode: 'fixed',
      ignoreBulk: 0,
      compartments: [
        { name: '', capacity: 25 },
      ],
    },
  },

  {
    id: 'spaciousPouchLvl7',
    name: 'Бездонная сумка II',
    category: 'bag',
    bulk: 1,
    traits: [
      { type: 'library', id: 'magic' },
      { type: 'library', id: 'extradimensional' },
    ],
    desc: 'Межпространственная сумка. Её собственный объём всегда равен 1, независимо от содержимого. Внутри можно хранить предметы общим объёмом до 50.',
    bag: {
      weightMode: 'fixed',
      ignoreBulk: 0,
      compartments: [
        { name: '', capacity: 50 },
      ],
    },
  },

  {
    id: 'sleevesOfStorageLvl4',
    name: 'Вместительные рукава',
    category: 'bag',
    bulk: 0.1,
    traits: [
      { type: 'library', id: 'magic' },
      { type: 'library', id: 'extradimensional' },
      { type: 'library', id: 'invested' },
    ],
    desc: 'Эти просторные одеяния отличаются объёмными широкими рукавами, в каждом из которых скрыт межпространственный карман. Каждый из карманов аналогичен бездонной сумке и может вмещать предметы общим весом не более 5 (всего в обоих рукавах можно хранить предметы общим весом до 10), но вес каждого предмета не должен превышать 1. Полностью наполненный рукав становится чуть тяжелее. Вы можете положить предмет в рукав или извлечь его оттуда Взаимодействием; для этого требуется одна свободная рука.\nЕсли в рукаве ничего нет, вы можете поместить в межпространственный карман своего фамильяра. Он может находиться внутри до 1 часа, после чего начинает задыхаться. Фамильяр в рукаве не может быть выбран целью и не подвергается никаким эффектам, но вы не получаете преимуществ способностей хозяина. Фамильяр может самовольно покинуть рукав в качестве одиночного действия с дескрипторами «движение» и «манипуляция». Вы не можете помещать в рукава других существ и не можете поместить туда фамильяра, если его размер больше маленького. Если рукав занят фамильяром, предметы в него поместить нельзя.',
    bag: {
      weightMode: 'fixed',
      ignoreBulk: 0,
      compartments: [
        { name: 'Левый рукав', capacity: 5 },
        { name: 'Правый рукав', capacity: 5 },
      ],
    },
  },

  {
    id: 'longsword',
    name: 'Длинный меч',
    category: 'weapon',
    bulk: 1,
    traits: [
      { type: 'library', id: 'versatileP' },
    ],
    desc: 'Тяжёлые клинки этих мечей длиной 3-4 фута и могут иметь одностороннюю или двустороннюю заточку.',
    weapon: {
      type: 'melee',
      damage: '1d8',
      damageType: 'рубящий',
      group: 'меч',
      hands: '1',
    },
  },

  {
    id: 'longbow',
    name: 'Длинный лук',
    category: 'weapon',
    bulk: 2,
    traits: [
      { type: 'library', id: 'volley30' },
      { type: 'library', id: 'deadlyD10' },
    ],
    desc: 'Длинный лук выше большинства людей и при стрельбе упирается одним концом в землю. Он стреляет на большую дистанцию, но неудобен в тесноте.',
    weapon: {
      type: 'ranged',
      damage: '1d8',
      damageType: 'колющий',
      group: 'лук',
      hands: '1+',
      range: '100 фт',
      reload: '0',
      ammo: 'Стрелы',
    },
  },

  {
    id: 'fullPlate',
    name: 'Полный латный доспех',
    category: 'armor',
    bulk: 4,
    traits: [
      { type: 'library', id: 'bulwark' },
    ],
    desc: 'Состоит из металлических пластин, откованных по форме частей тела, и практически полностью покрывает тело носителя. Он дорог, тяжёл, и часто его невозможно надеть в одиночку, но защиту он обеспечивает превосходную. В комплект также входит стёганый поддоспешник и пара латных рукавиц.',
    armor: {
      ac: '+6',
      dexCap: '+0',
      group: 'Латная',
      armorCategory: 'Тяжёлая',
      speedPenalty: '-10 фт',
      strength: '+4',
    },
  },

  {
    id: 'steelShield',
    name: 'Стальной щит',
    category: 'shield',
    bulk: 1,
    traits: [],
    desc: 'Тяжёлый стальной щит, который держат за рукоять. Пока щит экипирован, он даёт бонус к КБ.',
    shield: {
      acBonus: 2,
      hardness: 5,
      hpMax: 20,
    },
  },

  {
    id: 'healingPotionLvl1',
    name: 'низшее зелье исцеления',
    category: 'consumable',
    bulk: 0.1,
    traits: [
      { type: 'library', id: 'magic' },
      { type: 'library', id: 'consumable' },
      { type: 'library', id: 'healing' },
      { type: 'library', id: 'potion' },
      { type: 'library', id: 'vitality' },
    ],
    desc: 'Это пузырёк с ярко-красной жидкостью, выпив которую вы ощутите, как ваши раны быстро затягиваются, вызывая лёгкое покалывание. Выпив зелье исцеления, вы восстанавливаете 1d8 ПЗ.',
    consumable: {
      usage: '1 рука',
      activation: '1 действие (манипуляция)',
    },
  },

  {
    id: 'healingPotionLvl3',
    name: 'Малое елье исцеления',
    category: 'consumable',
    bulk: 0.1,
    traits: [
      { type: 'library', id: 'magic' },
      { type: 'library', id: 'consumable' },
      { type: 'library', id: 'healing' },
      { type: 'library', id: 'potion' },
      { type: 'library', id: 'vitality' },
    ],
    desc: 'Это пузырёк с ярко-красной жидкостью, выпив которую вы ощутите, как ваши раны быстро затягиваются, вызывая лёгкое покалывание. Выпив зелье исцеления, вы восстанавливаете 2d8+5 ПЗ.',
    consumable: {
      usage: '1 рука',
      activation: '1 действие (манипуляция)',
    },
  },

  {
    id: 'masqueradeScarf',
    name: 'Платок маскировки',
    category: 'gear',
    bulk: 0,
    traits: [
      { type: 'library', id: 'magic' },
      { type: 'library', id: 'invested' },
    ],
    desc: 'Этот изящно вышитый платок подходит к любой одежде и может дополнить маскировку или костюм при помощи иллюзий.\n\nАктивация — Маскарад: 1 минута (манипуляция).\nЧастота: 1 в день. Эффект: вы укрываете нижнюю часть лица платком и он творит на вас иллюзорный облик 1 круга, действие которого немедленно прекращается, если платок снять. Вы можете изменить облик платка или же вовсе сделать его невидимым в качестве части эффекта иллюзорного облика, но его всё ещё можно почувствовать на ощупь.',
  },

  {
    id: 'academyToken',
    name: 'Жетон коллегии',
    category: 'other',
    bulk: 0.001,
    traits: [
      { type: 'library', id: 'magic' },
    ],
    desc: 'Валюта используемая в волшебниками.',
  },
];

const itemsById = new Map(ITEM_LIBRARY.map(item => [item.id, item]));

export function getLibraryItem(id){
  return itemsById.get(id) || null;
}

export function normalizeCategory(value){
  const key = String(value || 'other').toLowerCase();
  return ITEM_CATEGORY_LABELS[key] ? key : 'other';
}
export function normalizeFormulaCategory(value){
  const key = String(value || 'other').toLowerCase();
  return FORMULA_CATEGORY_LABELS[key] ? key : 'other';
}
export function isFormulaRune(item){
  return !!(item && normalizeFormulaCategory(item.category) === 'rune');
}

export function parseStatNumber(value){
  if(value === null || value === undefined || value === '') return null;
  const n = Number(String(value).replace(',', '.').replace(/[^\d.+-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

export function normalizeWeaponData(raw, opts={}){
  if(!raw || typeof raw !== 'object') return null;
  let type = raw.type === 'ranged' || raw.type === 'melee' ? raw.type : null;
  if(!type) type = (raw.range || raw.ammo) ? 'ranged' : 'melee';
  const ranged = type === 'ranged';
  const data = {
    type,
    damage: raw.damage || '',
    damageType: raw.damageType || '',
    group: raw.group || '',
    hands: raw.hands || '',
    range: ranged ? (raw.range || '') : '',
    reload: ranged ? (raw.reload || '') : '',
    ammo: ranged ? (raw.ammo || '') : '',
  };
  if(opts.instance){
    data.proficiency = WEAPON_PROF_RANKS.includes(raw.proficiency) ? raw.proficiency : 'untrained';
    data.otherBonus = Number(raw.otherBonus) || 0;
  }
  return data;
}

export function normalizeArmorData(raw){
  if(!raw || typeof raw !== 'object') return null;
  return {
    ac: raw.ac || '',
    dexCap: raw.dexCap == null ? '' : String(raw.dexCap),
    group: raw.group || '',
    armorCategory: raw.armorCategory || '',
    speedPenalty: raw.speedPenalty || '',
    strength: raw.strength || '',
  };
}

export function normalizeShieldData(raw){
  if(!raw || typeof raw !== 'object') return null;
  return {
    acBonus: Number(raw.acBonus) || 0,
    hardness: Number(raw.hardness) || 0,
    hpMax: Math.max(0, Number(raw.hpMax) || 0),
  };
}

function copyTraits(traits){
  if(!Array.isArray(traits)) return [];
  return traits.map(trait=>{
    if(trait && trait.type === 'library' && trait.id) return {type:'library', id:trait.id};
    const name = typeof trait === 'string' ? trait.trim() : (trait && trait.name ? String(trait.name).trim() : '');
    return name ? {type:'custom', name} : null;
  }).filter(Boolean);
}

export function searchLibraryItems(query, opts={}){
  const q = String(query || '').trim().toLocaleLowerCase('ru');
  if(!q) return [];
  return ITEM_LIBRARY.filter(item=>{
    const category = normalizeCategory(item.category);
    if(opts.category && category !== opts.category) return false;
    if(opts.excludeCategory && category === opts.excludeCategory) return false;
    const label = ITEM_CATEGORY_LABELS[category] || '';
    return item.name.toLocaleLowerCase('ru').includes(q) || label.toLocaleLowerCase('ru').includes(q);
  }).slice(0, 6);
}

export function normalizeBagData(raw, makeId){
  const source = raw || {};
  const weightMode = String(source.weightMode || source.weithMode || source.WeithMode || 'contents').toLowerCase() === 'fixed'
    ? 'fixed'
    : 'contents';
  const ignoreRaw = source.ignoreBulk ?? source.ingoreBulk ?? source.IngoreBulk;
  const ignoreBulk = weightMode === 'fixed' ? 0 : (Number(ignoreRaw) || 0);
  let compartments = source.compartments;
  if(!Array.isArray(compartments) || !compartments.length){
    const count = Math.max(1, Number(source.cell) || 1);
    const capacity = Number(source.capacity ?? source.Capacity) || 0;
    compartments = [];
    for(let i=0;i<count;i++){
      compartments.push({
        id: makeId(),
        name: count === 1 ? '' : `Отсек ${i+1}`,
        capacity,
      });
    }
  } else {
    compartments = compartments.map((compartment, index)=>({
      id: compartment.id || makeId(),
      name: compartment.name || (source.compartments.length === 1 ? '' : `Отсек ${index+1}`),
      capacity: Number(compartment.capacity) || 0,
    }));
  }
  return {weightMode, ignoreBulk, compartments};
}

export function instantiateLibraryItem(entry, makeId){
  const category = normalizeCategory(entry.category);
  const item = {
    id: makeId(),
    libraryId: entry.id,
    name: entry.name,
    category,
    qty: 1,
    bulk: Number(entry.bulk) || 0,
    location: 'worn',
    note: '',
    desc: entry.desc || '',
    traits: copyTraits(entry.traits),
    isCurrency: false,
    custom: true,
    runes: [],
    weapon: category === 'weapon' ? normalizeWeaponData(entry.weapon || {}, {instance:true}) : null,
    armor: category === 'armor' ? normalizeArmorData(entry.armor || {}) : null,
    shield: category === 'shield' ? normalizeShieldData(entry.shield || {}) : null,
    consumable: entry.consumable ? Object.assign({}, entry.consumable) : null,
  };
  if(category === 'bag'){
    item.bag = normalizeBagData(entry.bag, makeId);
  }
  return item;
}

export function emptyCustomItem(category, makeId){
  const item = {
    id: makeId(),
    libraryId: null,
    name: '',
    category: normalizeCategory(category || 'other'),
    qty: 1,
    bulk: 0,
    location: 'worn',
    note: '',
    desc: '',
    traits: [],
    isCurrency: false,
    custom: true,
    runes: [],
    weapon: null,
    armor: null,
    shield: null,
    consumable: null,
  };
  if(item.category === 'weapon') item.weapon = normalizeWeaponData({type:'melee'}, {instance:true});
  if(item.category === 'armor') item.armor = normalizeArmorData({});
  if(item.category === 'shield') item.shield = normalizeShieldData({acBonus:1, hardness:3, hpMax:12});
  if(item.category === 'bag'){
    item.bag = normalizeBagData({weightMode:'contents', ignoreBulk:0, capacity:4, cell:1}, makeId);
  }
  return item;
}

export function isBagItem(item){
  return !!(item && !item.isCurrency && item.category === 'bag' && item.bag);
}

export function canHoldRunes(item){
  if(!item || item.isCurrency) return false;
  return item.category === 'weapon' || item.category === 'armor' || item.category === 'shield';
}

export function bagCompartmentLocation(bagId, compartmentId){
  return `bag:${bagId}:${compartmentId}`;
}

export function isOnPersonLocation(location){
  return ON_PERSON_LOCATIONS.includes(location);
}

export function parseItemLocation(location){
  if(location === 'worn') return {type:'worn'};
  if(location === 'belt') return {type:'belt'};
  if(location === 'equipped-armor') return {type:'equipped-armor'};
  if(location === 'equipped-shield') return {type:'equipped-shield'};
  if(typeof location === 'string' && location.startsWith('bag:')){
    const parts = location.split(':');
    return {type:'bag', bagId:parts[1], compartmentId:parts[2]};
  }
  return {type:'storage', id:location};
}

export function itemBulkValue(item){
  if(!item) return 0;
  if(item.isCurrency) return (Number(item.qty) || 0) / 1000;
  return (Number(item.bulk) || 0) * (Number(item.qty) || 1);
}

export function compartmentContentsBulk(items, bag, compartment){
  const location = bagCompartmentLocation(bag.id, compartment.id);
  return items.filter(item=>item.location === location).reduce((sum, item)=>sum + itemBulkValue(item), 0);
}

export function bagContentsBulk(items, bag){
  if(!isBagItem(bag)) return 0;
  return bag.bag.compartments.reduce((sum, compartment)=>sum + compartmentContentsBulk(items, bag, compartment), 0);
}

export function bagEffectiveBulk(items, bag){
  if(!isBagItem(bag)) return itemBulkValue(bag);
  const own = itemBulkValue(bag);
  if(bag.bag.weightMode === 'fixed') return own;
  return own + Math.max(0, bagContentsBulk(items, bag) - (Number(bag.bag.ignoreBulk) || 0));
}

export function wornCarriedBulk(items){
  return items.reduce((sum, item)=>{
    if(!isOnPersonLocation(item.location)) return sum;
    if(item.isCurrency) return sum + itemBulkValue(item);
    if(isBagItem(item)) return sum + bagEffectiveBulk(items, item);
    return sum + itemBulkValue(item);
  }, 0);
}