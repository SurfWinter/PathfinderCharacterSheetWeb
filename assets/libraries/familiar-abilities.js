// Способности фамильяра. Без дескрипторов: id, name, desc.
// На персонаже хранится копия {id, libraryId, name, desc}. libraryId = null у своих записей.

export const FAMILIAR_ABILITY_LIBRARY = [
  {
    id: 'accompanist',
    name: 'Аккомпаниатор',
    desc: 'Фамильяр содействует вашему исполнению. Когда вы совершаете проверку Исполнения, если ваш фамильяр поблизости и может действовать, он будет аккомпанировать вам трелями, хлопками или даже на собственном миниатюрном инструменте. Вы получаете ситуативный бонус +1 или +2, если вы мастер Исполнения.',
  },
];

export function getLibraryFamiliarAbility(id){
  return FAMILIAR_ABILITY_LIBRARY.find(entry => entry.id === id) || null;
}

export function searchLibraryFamiliarAbilities(query){
  const q = String(query || '').trim().toLocaleLowerCase('ru');
  if(!q) return FAMILIAR_ABILITY_LIBRARY.slice(0, 8);
  return FAMILIAR_ABILITY_LIBRARY.filter(entry =>
    entry.name.toLocaleLowerCase('ru').includes(q) ||
    entry.desc.toLocaleLowerCase('ru').includes(q)
  ).slice(0, 8);
}

export function instantiateLibraryFamiliarAbility(entry, makeId){
  return {
    id: makeId(),
    libraryId: entry.id,
    name: entry.name,
    desc: entry.desc,
  };
}
