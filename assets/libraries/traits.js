// Библиотека дескрипторов. Допустимые цвета:
// default, red, green, blue, purple, deepBlue, gold, deepPink, silver.
// Добавляйте новые записи сюда; id должен быть уникальным и неизменяемым.
export const TRAIT_LIBRARY = [
  { id:'fire', name:'Огонь', color:'red', category:'Энергия' },
  { id:'acid', name:'Кислота', color:'green', category:'Энергия' },
  { id:'cold', name:'Холод', color:'blue', category:'Энергия' },
  { id:'electricity', name:'Электричество', color:'blue', category:'Энергия' },
  { id:'poison', name:'Яд', color:'green', category:'Энергия' },
  { id:'healing', name:'Исцеление', color:'green', category:'Эффект' },
  { id:'attack', name:'Атака', color:'default', category:'Общее' },
  { id:'move', name:'Движение', color:'default', category:'Общее' },
  { id:'concentrate', name:'Концентрация', color:'default', category:'Общее' },
  { id:'manipulate', name:'Манипуляция', color:'default', category:'Общее' },
  { id:'Sanctified', name:'Освящённый', color:'silver', category:'Освящённое' },
  { id:'Holy', name:'Священный', color:'gold', category:'Освящённое' },
];

const traitsById = new Map(TRAIT_LIBRARY.map(trait => [trait.id, trait]));

export function getLibraryTrait(id){
  return traitsById.get(id) || null;
}
