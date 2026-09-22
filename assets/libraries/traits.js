// Библиотека дескрипторов. Допустимые цвета:
// default, red, green, blue, purple, deepBlue, gold, deepPink, silver, void.
// Добавляйте новые записи сюда; id должен быть уникальным и неизменяемым.
export const TRAIT_LIBRARY = [
  { id:'fire', name:'Огонь', color:'red', category:'Энергия' },
  { id:'acid', name:'Кислота', color:'green', category:'Энергия' },
  { id:'cold', name:'Холод', color:'blue', category:'Энергия' },
  { id:'electricity', name:'Электричество', color:'blue', category:'Энергия' },
  { id:'poison', name:'Яд', color:'green', category:'Энергия' },
  { id:'healing', name:'Исцеление', color:'gold', category:'Разное' },
  { id:'vitality', name:'Жизнь', color:'green', category:'Энергия' },
  { id:'attack', name:'Атака', color:'default', category:'Общее' },
  { id:'move', name:'Движение', color:'default', category:'Общее' },
  { id:'concentrate', name:'Концентрация', color:'default', category:'Общее' },
  { id:'manipulate', name:'Манипуляция', color:'default', category:'Общее' },
  { id:'sanctified', name:'Освящённый', color:'silver', category:'Освящённое' },
  { id:'holy', name:'Священный', color:'gold', category:'Освящённое' },
  { id:'mage', name:'Маг', color:'purple', category:'Персонаж' },
  { id:'magic', name:'Магический', color:'purple', category:'Разное' },
  { id:'extradimensional', name:'Межпространственный', color:'deepBlue', category:'Разное' },
  { id:'invested', name:'Настроенность', color:'silver', category:'Предметы' },
  { id:'versatileP', name:'универсальный Ко', color:'silver', category:'Оружие' },
  { id:'bulwark', name:'Закрытая', color:'silver', category:'Броня' },
  { id:'consumable', name:'Одноразовый', color:'default', category:'Предметы' },
  { id:'potion', name:'Зелье', color:'default', category:'Эффект' },

  // Расы и типы существ
  { id:'human', name:'Человек', color:'silver', category:'Персонаж' },
  { id:'elf', name:'Эльф', color:'blue', category:'Персонаж' },
  { id:'dwarf', name:'Дварф', color:'gold', category:'Персонаж' },
  { id:'gnome', name:'Гном', color:'deepPink', category:'Персонаж' },
  { id:'kobold', name:'Кобольд', color:'red', category:'Персонаж' },
  { id:'ratfolk', name:'Крысолюд', color:'silver', category:'Персонаж' },
  { id:'goblin', name:'Гоблин', color:'green', category:'Персонаж' },
  { id:'humanoid', name:'Гуманоид', color:'silver', category:'Персонаж' },
  { id:'undead', name:'Нежить', color:'deepBlue', category:'Персонаж' },
  { id:'dragon', name:'Дракон', color:'red', category:'Персонаж' },
  { id:'construct', name:'Конструкция', color:'silver', category:'Персонаж' },
  { id:'elemental', name:'Элементаль', color:'blue', category:'Персонаж' },
  { id:'plant', name:'Растение', color:'green', category:'Персонаж' },

  // Броня
  { id:'comfort', name:'Удобная', color:'silver', category:'Броня' },
  { id:'laminar', name:'Ламинарный', color:'silver', category:'Броня' },
  { id:'hydrodynamic', name:'Аквадинамика', color:'blue', category:'Броня' },
  { id:'flexible', name:'Гибкая', color:'green', category:'Броня' },
  { id:'noisy', name:'Шумная', color:'red', category:'Броня' },
  { id:'hindering', name:'Задерживающее', color:'red', category:'Броня' },

  // Редкость
  { id:'uncommon', name:'Необычный', color:'gold', category:'Редкость' },
  { id:'rare', name:'Редкий', color:'deepBlue', category:'Редкость' },
  { id:'unique', name:'Уникальный', color:'purple', category:'Редкость' },

  // Разное
  { id:'mythic', name:'Мифический', color:'blue', category:'Разное' },

  // Оружие
  { id:'unarmed', name:'Безоружное', color:'silver', category:'Оружие' },
  { id:'agile', name:'Быстрое', color:'silver', category:'Оружие' },
  { id:'nonlethal', name:'Несмертельное', color:'green', category:'Оружие' },
  { id:'finesse', name:'Фехтовальное', color:'silver', category:'Оружие' },
  { id:'twoHandD8', name:'Полуторное 1D8', color:'silver', category:'Оружие' },
  { id:'twoHandD10', name:'Полуторное 1D10', color:'silver', category:'Оружие' },
  { id:'versatileS', name:'Универсальное Р', color:'silver', category:'Оружие' },
  { id:'versatileB', name:'Универсальное Д', color:'silver', category:'Оружие' },
  { id:'shove', name:'Толкающее', color:'silver', category:'Оружие' },
  { id:'reach', name:'Длинное', color:'silver', category:'Оружие' },
  { id:'thrown10', name:'Метательное 10 фт', color:'silver', category:'Оружие' },
  { id:'thrown20', name:'Метательное 20 фт', color:'silver', category:'Оружие' },
  { id:'attached', name:'Наручное', color:'silver', category:'Оружие' },
  { id:'parry', name:'Парирующее', color:'silver', category:'Оружие' },
  { id:'deadlyD6', name:'Смертоносное D6', color:'red', category:'Оружие' },
  { id:'deadlyD8', name:'Смертоносное D8', color:'red', category:'Оружие' },
  { id:'deadlyD10', name:'Смертоносное D10', color:'red', category:'Оружие' },
  { id:'volley30', name:'Залповое 30 фт', color:'silver', category:'Оружие' },
  { id:'sweep', name:'Размашистое', color:'silver', category:'Оружие' },
  { id:'fatalD8', name:'Добивающее D8', color:'red', category:'Оружие' },
  { id:'combination', name:'Комбинированное', color:'blue', category:'Оружие' },
  { id:'trip', name:'Сбивающее', color:'silver', category:'Оружие' },
  { id:'backstabber', name:'Подлое', color:'green', category:'Оружие' },
  { id:'joustingD6', name:'Кавалерийское D6', color:'silver', category:'Оружие' },

  // Магия
  { id:'arcane', name:'Мистическая', color:'purple', category:'Магия' },
  { id:'divine', name:'Сакральная', color:'gold', category:'Магия' },
  { id:'occult', name:'Оккультная', color:'deepBlue', category:'Магия' },
  { id:'primal', name:'Первобытная', color:'green', category:'Магия' },
  { id:'cantrip', name:'Фокус', color:'purple', category:'Магия' },
  { id:'focus', name:'Фокальное', color:'gold', category:'Магия' },
  { id:'illusion', name:'Иллюзия', color:'purple', category:'Магия' },
  { id:'summon', name:'Призыв', color:'deepBlue', category:'Магия' },

  // Разное (доп.)
  { id:'subtle', name:'Незаметное', color:'silver', category:'Разное' },
  { id:'detection', name:'Обнаружение', color:'blue', category:'Разное' },

  // Общее (доп.)
  { id:'visual', name:'Зрение', color:'default', category:'Общее' },
  { id:'auditory', name:'Слух', color:'default', category:'Общее' },
  { id:'secret', name:'Тайна', color:'default', category:'Общее' },
  { id:'exploration', name:'Исследование', color:'default', category:'Общее' },
  { id:'linguistic', name:'Язык', color:'default', category:'Общее' },

  // Энергия (доп.)
  { id:'air', name:'Воздух', color:'blue', category:'Энергия' },
  { id:'force', name:'Сила', color:'purple', category:'Энергия' },
  { id:'light', name:'Свет', color:'gold', category:'Энергия' },
  { id:'mental', name:'Ментальный', color:'purple', category:'Энергия' },
  { id:'void', name:'Пустота', color:'void', category:'Энергия' },

  // Эффект (доп.)
  { id:'emotion', name:'Эмоции', color:'deepPink', category:'Эффект' },
  { id:'fear', name:'Ужас', color:'void', category:'Эффект' },
  { id:'incapacitation', name:'Устранение', color:'void', category:'Эффект' },
  { id:'sleep', name:'Сон', color:'deepBlue', category:'Эффект' },
  { id:'death', name:'Смерть', color:'void', category:'Эффект' },

  // Персонаж (доп.)
  { id:'wizard', name:'Волшебник', color:'purple', category:'Персонаж' },
  { id:'ancestry', name:'Родословная', color:'silver', category:'Персонаж' },
  { id:'general', name:'Общая', color:'silver', category:'Персонаж' },
  { id:'skillFeat', name:'Навык', color:'silver', category:'Персонаж' },

  // Грех
  { id:'lust', name:'Похоть', color:'deepPink', category:'Грех' },
  { id:'envy', name:'Зависть', color:'green', category:'Грех' },
  { id:'gluttony', name:'Чревоугодие', color:'red', category:'Грех' },
  { id:'sloth', name:'Лень', color:'deepBlue', category:'Грех' },
  { id:'pride', name:'Гордыня', color:'void', category:'Грех' },
  { id:'wrath', name:'Гнев', color:'red', category:'Грех' },
  { id:'greed', name:'Алчность', color:'gold', category:'Грех' },
];

const traitsById = new Map(TRAIT_LIBRARY.map(trait => [trait.id, trait]));
const traitsByName = new Map(TRAIT_LIBRARY.map(trait => [trait.name.toLocaleLowerCase('ru'), trait]));
const TRAIT_NAME_ALIASES = {
  'перемещение': 'move',
};

export function getLibraryTrait(id){
  return traitsById.get(id) || null;
}

export function matchLibraryTrait(name){
  const key = String(name || '').trim().toLocaleLowerCase('ru');
  if(!key) return null;
  const aliasId = TRAIT_NAME_ALIASES[key];
  if(aliasId) return traitsById.get(aliasId) || null;
  return traitsByName.get(key) || null;
}

function traitNameOf(trait){
  if(!trait) return '';
  if(trait.type === 'library'){
    const lib = getLibraryTrait(trait.id);
    return lib ? lib.name : String(trait.id || '');
  }
  if(typeof trait === 'string') return trait;
  return trait.name || '';
}

function traitMatchesId(trait, id){
  if(!trait) return false;
  if(trait.type === 'library' && trait.id === id) return true;
  const lib = getLibraryTrait(id);
  const names = new Set([String(id).toLocaleLowerCase('ru')]);
  if(lib) names.add(lib.name.toLocaleLowerCase('ru'));
  return names.has(traitNameOf(trait).trim().toLocaleLowerCase('ru'));
}

export function spellHasTrait(spell, traitId){
  return !!(spell && Array.isArray(spell.traits) && spell.traits.some(trait => traitMatchesId(trait, traitId)));
}

export function spellHasCantripTrait(spell){
  return spellHasTrait(spell, 'cantrip');
}

export function spellHasFocusTrait(spell){
  return spellHasTrait(spell, 'focus');
}

export function isAutoHeightenSpell(spell){
  return spellHasCantripTrait(spell) || spellHasFocusTrait(spell);
}

export function autoHeightenRank(characterLevel){
  return Math.max(1, Math.ceil(Math.max(1, Number(characterLevel) || 1) / 2));
}

export function spellDisplayRank(spell, characterLevel){
  if(isAutoHeightenSpell(spell)) return autoHeightenRank(characterLevel);
  return Math.max(1, Number(spell && spell.level) || 1);
}

export function spellFitsPreparedSlot(spell, slotLevel){
  if(!spell) return false;
  const slot = Number(slotLevel);
  const hasCantrip = spellHasCantripTrait(spell);
  const hasFocus = spellHasFocusTrait(spell);
  if(hasCantrip && hasFocus) return false;
  if(slot === 0) return hasCantrip;
  if(hasCantrip || hasFocus) return false;
  const rank = Number(spell.level) || 0;
  return rank >= 1 && rank <= slot;
}

export function spellFitsFocusList(spell){
  if(!spell) return false;
  return spellHasFocusTrait(spell) && !spellHasCantripTrait(spell);
}
