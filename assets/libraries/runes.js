// Библиотека рун. slot: weapon, armor, shield — подсказки фильтруются по категории предмета.
// Дескрипторы: { type:'library', id } из traits.js.
// Руна живёт только внутри оружия / брони / щита и в инвентарь не попадает.

export const RUNE_SLOT_LABELS = {
  weapon: 'Оружие',
  armor: 'Броня',
  shield: 'Щит',
};

export const RUNE_LIBRARY = [
  {
    id: 'weaponPotency1',
    name: 'Руна усиления +1',
    slot: 'weapon',
    traits: [{ type: 'library', id: 'magic' }],
    desc: 'Магическое усиление направляет оружие в цель. Проверки атак этим оружием получают бонус предмета +1. На оружии можно начертать 1 атрибутивную руну.',
  },
  {
    id: 'weaponPotency2',
    name: 'Руна усиления +2',
    slot: 'weapon',
    traits: [{ type: 'library', id: 'magic' }],
    desc: 'Магическое усиление направляет оружие в цель. Проверки атак этим оружием получают бонус предмета +2. На оружии можно начертать 2 атрибутивных руны.',
  },
  {
    id: 'weaponPotency3',
    name: 'Руна усиления +3',
    slot: 'weapon',
    traits: [{ type: 'library', id: 'magic' }],
    desc: 'Магическое усиление направляет оружие в цель. Проверки атак этим оружием получают бонус предмета +3. На оружии можно начертать 3 атрибутивных руны.',
  },
  {
    id: 'striking',
    name: 'Разящая',
    slot: 'weapon',
    traits: [{ type: 'library', id: 'magic' }],
    desc: 'Разящая руна наполняет оружие разрушительной магией, увеличивая количество костей урона оружия с одной до двух.',
  },
  {
    id: 'strikingGreater',
    name: 'Улучшенная разящая',
    slot: 'weapon',
    traits: [{ type: 'library', id: 'magic' }],
    desc: 'Разящая руна наполняет оружие разрушительной магией, увеличивая количество костей урона оружия с одной до 3-х.',
  },
  {
    id: 'strikingMajor',
    name: 'Высшая разящая',
    slot: 'weapon',
    traits: [{ type: 'library', id: 'magic' }],
    desc: 'Разящая руна наполняет оружие разрушительной магией, увеличивая количество костей урона оружия с одной до 4-х.',
  },
  {
    id: 'strikingMythic',
    name: 'Мифическая разящая',
    slot: 'weapon',
    traits: [
      { type: 'library', id: 'rare' },
      { type: 'library', id: 'magic' },
      { type: 'library', id: 'mythic' },
    ],
    desc: 'Это оружие наполнено непревзойдённой разрушительной силой. Количество костей урона оружия увеличивается до пяти.\n <strong> Активация </strong> — Неудержимое опустошение 5 (Концентрация).\nУсловие: вы бросаете кости урона при совершении Удара этим оружием и вам не нравится результат.\nЭффект: потратьте Мифический пункт и повторно бросьте кости урона, выбрав лучший из двух результатов.',
  },
  {
    id: 'weaponPotencyMythic',
    name: 'Мифическая руна усиления',
    slot: 'weapon',
    traits: [
      { type: 'library', id: 'rare' },
      { type: 'library', id: 'magic' },
      { type: 'library', id: 'mythic' },
    ],
    desc: 'Это оружие бьёт с несравненной точностью, чтобы пробить защиту самых могущественных чудовищ. Проверки атаки с этим оружием получают бонус предмета +4, и на оружие можно нанести четыре атрибутивные руны.\nАктивация — Неотразимый удар (реакция)\nУсловие: вы совершаете проверку атаки, чтобы нанести Удар этим оружием, и получаете критический провал.\nЭффект: потратьте Мифический пункт и пройдите повторно проверку атаки с мифическим умением, выбрав больший из двух результатов.',
  },
  {
    id: 'flaming',
    name: 'Огненная',
    slot: 'weapon',
    traits: [
      { type: 'library', id: 'magic' },
      { type: 'library', id: 'fire' },
    ],
    desc: 'Оружие наполняет огненный жар. При успешном Ударе оружие дополнительно наносит 1d6 урона огнём плюс 1d10 продолжительного урона огнём при критическом ударе.',
  },

  {
    id: 'armorPotency1',
    name: 'Руна усиления +1',
    slot: 'armor',
    traits: [{ type: 'library', id: 'magic' }],
    desc: 'Магические обереги защищают вас от атак. Бонус предмета к КБ от брони увеличивается на 1. На броне можно начертать 1 атрибутивную руну.',
  },
  {
    id: 'armorPotency2',
    name: 'Руна усиления +2',
    slot: 'armor',
    traits: [{ type: 'library', id: 'magic' }],
    desc: 'Магические обереги защищают вас от атак. Бонус предмета к КБ от брони увеличивается на 2. На броне можно начертать 2 атрибутивных руны.',
  },
  {
    id: 'armorPotency3',
    name: 'Руна усиления +3',
    slot: 'armor',
    traits: [{ type: 'library', id: 'magic' }],
    desc: 'Магические обереги защищают вас от атак. Бонус предмета к КБ от брони увеличивается на 3. На броне можно начертать 3 атрибутивных руны.',
  },
  {
    id: 'resilent',
    name: 'Укреплённая',
    slot: 'armor',
    traits: [{ type: 'library', id: 'magic' }],
    desc: 'Укреплённые руны даруют броне дополнительную магическую защиту. Носитель брони получает бонус предмета +1 к испытаниям.',
  },
  {
    id: 'resilentGreater',
    name: 'Улучшенная укреплённая',
    slot: 'armor',
    traits: [{ type: 'library', id: 'magic' }],
    desc: 'Укреплённые руны даруют броне дополнительную магическую защиту. Носитель брони получает бонус предмета +2 к испытаниям.',
  },
  {
    id: 'resilentMajor',
    name: 'Высшая укреплённая',
    slot: 'armor',
    traits: [{ type: 'library', id: 'magic' }],
    desc: 'Укреплённые руны даруют броне дополнительную магическую защиту. Носитель брони получает бонус предмета +3 к испытаниям.',
  },
  {
    id: 'resilentMythic',
    name: 'Мифическая укреплённая',
    slot: 'armor',
    traits: [
      { type: 'library', id: 'rare' },
      { type: 'library', id: 'magic' },
      { type: 'library', id: 'mythic' },
    ],
    desc: 'Мифические укреплённые руны наделяют броню непревзойдённой защитой от широкого спектра эффектов. Броня даёт владельцу бонус предмета +4 к испытаниям.\nАктивация — Бросить вызов уничтожению 5 (концентрация).\nУсловие: вы критически провалите испытание.\nЭффект: потратьте Мифический пункт. Если испытание, спровоцировавшее это ответное действие, было инициировано эффектом, созданным мифическим существом, опасностью или другим эффектом, результат считается обычным провалом. Если испытание было инициировано немифическим эффектом, результат считается успехом.',
  },
  {
    id: 'armorPotencyMythic',
    name: 'Мифическая руна усиления',
    slot: 'armor',
    traits: [
      { type: 'library', id: 'rare' },
      { type: 'library', id: 'magic' },
      { type: 'library', id: 'mythic' },
    ],
    desc: 'На этой броне начертан мифический оберег, обеспечивающий непревзойдённую защиту. Увеличьте бонус предмета брони к КБ на 4. Эта броня может быть наделена четырьмя атрибутивными рунами.\nАктивация — Пережить опустошение 5 (концентрация).\nУсловие: враг критически преуспел в проверке атаки для Удара оружием или безоружной атакой против вас.\nЭффект: потратьте мифический пункт. Если спровоцировавший Удар был нанесён мифическим существом, результат считается обычным успехом. Если он был нанесён не мифическим существом, результат считается провалом.',
  },

  {
    id: 'reinforcingMinor',
    name: 'Низшая армированная руна',
    slot: 'shield',
    traits: [{ type: 'library', id: 'magic' }],
    desc: 'Твёрдость щита повышается на 3, он получает 44 дополнительных ПЗ, его ПП увеличивается на 22 (максимум твёрдость 8, 64 ПЗ и ПП 32).',
  },
  {
    id: 'reinforcingLesser',
    name: 'Малая армированная руна',
    slot: 'shield',
    traits: [{ type: 'library', id: 'magic' }],
    desc: 'Твёрдость щита повышается на 3, он получает 52 дополнительных ПЗ, его ПП увеличивается на 26 (максимум твёрдость 10, 80 ПЗ и ПП40).',
  },
  {
    id: 'reinforcingModerate',
    name: 'Средняя армированная руна',
    slot: 'shield',
    traits: [{ type: 'library', id: 'magic' }],
    desc: 'Твёрдость щита повышается на 3, он получает 64 дополнительных ПЗ, его ПП увеличивается на 32 (максимум твёрдость 13, 104 ПЗ и ПП 52).',
  },
  {
    id: 'reinforcingGreater',
    name: 'Улучшенная армированная руна',
    slot: 'shield',
    traits: [{ type: 'library', id: 'magic' }],
    desc: 'Твёрдость щита повышается на 5, он получает 80 дополнительных ПЗ, его ПП увеличивается на 40 (максимум твёрдость 15, 120 ПЗ и ПП 60).',
  },
  {
    id: 'reinforcingMajor',
    name: 'Высшая армированная руна',
    slot: 'shield',
    traits: [{ type: 'library', id: 'magic' }],
    desc: 'Твёрдость щита повышается на 5, он получает 84 дополнительных ПЗ, его ПП увеличивается на 42 (максимум твёрдость 17, 136 ПЗ и ПП 68).',
  },
  {
    id: 'reinforcingSupreme',
    name: 'Превосходная армированная руна',
    slot: 'shield',
    traits: [{ type: 'library', id: 'magic' }],
    desc: 'Твёрдость щита повышается на 7, он получает 108 дополнительных ПЗ, его ПП увеличивается на 54 (максимум твёрдость 20, 160 ПЗ и ПП 80).',
  },
];

const runesById = new Map(RUNE_LIBRARY.map(rune => [rune.id, rune]));

export function getLibraryRune(id){
  return runesById.get(id) || null;
}

export function normalizeRuneSlot(value){
  const key = String(value || '').toLowerCase();
  return RUNE_SLOT_LABELS[key] ? key : '';
}

function copyRuneTraits(traits){
  if(!Array.isArray(traits)) return [];
  return traits.map(trait=>{
    if(trait && trait.type === 'library' && trait.id) return {type:'library', id:trait.id};
    const name = typeof trait === 'string' ? trait.trim() : (trait && trait.name ? String(trait.name).trim() : '');
    return name ? {type:'custom', name} : null;
  }).filter(Boolean);
}

export function searchLibraryRunes(query, opts={}){
  const slot = normalizeRuneSlot(opts.slot);
  const q = String(query || '').trim().toLocaleLowerCase('ru');
  if(!q) return [];
  return RUNE_LIBRARY.filter(rune=>{
    if(slot && rune.slot !== slot) return false;
    return rune.name.toLocaleLowerCase('ru').includes(q);
  }).slice(0, 8);
}

export function instantiateLibraryRune(entry, makeId){
  return {
    id: makeId(),
    libraryId: entry.id,
    name: entry.name,
    desc: entry.desc || '',
    traits: copyRuneTraits(entry.traits),
  };
}
