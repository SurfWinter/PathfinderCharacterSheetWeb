// Совместимый с v1 формат импорта и экспорта персонажей.

export function characterToXml(character){
  const json = JSON.stringify(character);
  const safe = json.split(']]>').join(']]]]><![CDATA[>');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<pf2character version="1">\n  <name>${escapeXmlText(character.name || 'Без имени')}</name>\n  <data><![CDATA[${safe}]]></data>\n</pf2character>\n`;
}

export function parseCharacterXml(xmlText){
  const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
  if (doc.querySelector('parsererror')) throw new Error('Некорректный XML-файл');
  const dataNode = doc.querySelector('data');
  if (!dataNode) throw new Error('В файле не найдены данные персонажа');
  return JSON.parse(dataNode.textContent);
}

function escapeXmlText(value){
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
