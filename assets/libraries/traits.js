// Библиотека дескрипторов. Допустимые цвета:
// default, red, green, blue, purple, deepBlue, gold, deepPink, silver.
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
  { id:'sweep', name:'Размашистое', color:'silver', category:'Оружие' },
  { id:'fatalD8', name:'Добивающее D8', color:'red', category:'Оружие' },
  { id:'combination', name:'Комбинированное', color:'blue', category:'Оружие' },
  { id:'trip', name:'Сбивающее', color:'silver', category:'Оружие' },
  { id:'backstabber', name:'Подлое', color:'green', category:'Оружие' },
  { id:'joustingD6', name:'Кавалерийское D6', color:'silver', category:'Оружие' },
];

const traitsById = new Map(TRAIT_LIBRARY.map(trait => [trait.id, trait]));

export function getLibraryTrait(id){
  return traitsById.get(id) || null;
}
