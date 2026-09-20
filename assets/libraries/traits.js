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
];

const traitsById = new Map(TRAIT_LIBRARY.map(trait => [trait.id, trait]));

export function getLibraryTrait(id){
  return traitsById.get(id) || null;
}
