/**
 * Одноразовый, но идемпотентный перенос основы приложения в ES-модули.
 * Запускать после extract-v111.mjs, если нужно воспроизвести этот этап.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const assets = resolve(root, 'v1.1.2-dev', 'assets');
const appPath = resolve(assets, 'app.js');
let app = await readFile(appPath, 'utf8');

if (app.startsWith('import ')) {
  console.log('Основа уже разделена на модули.');
  process.exit(0);
}

const defaultData = app.match(/\/\* ---------- default data ---------- \*\/[\s\S]*?(?=let CH = loadCharacter\(\);)/)?.[0];
const migrations = app.match(/function migrateAbilities[\s\S]*?(?=function showToast)/)?.[0];
if (!defaultData || !migrations) throw new Error('Не удалось распознать блок состояния в app.js.');

const state = `// Состояние персонажа, миграции и локальное хранилище.\n\nconst STORAGE_KEY = 'pf2_character_v1';\nexport const uid = () => Math.random().toString(36).slice(2, 10);\n\n${defaultData}\n${migrations
  .replace(/function save\(\)\{\n  CH\.meta\.savedAt = Date\.now\(\);\n  localStorage\.setItem\(STORAGE_KEY, JSON\.stringify\(CH\)\);\n\}/, `export function saveCharacter(character){\n  character.meta.savedAt = Date.now();\n  localStorage.setItem(STORAGE_KEY, JSON.stringify(character));\n}`)}\n\nexport { ABILITY_DEFS, defaultCharacter, normalizeCharacter, loadCharacter };\n`;

const helpers = `/* Общие расчёты, используемые вкладками. */\nconst PROF_RANKS = ['untrained','trained','expert','master','legendary'];\nconst PROF_LABEL = {untrained:'Неизученный', trained:'Изученный', expert:'Экспертный', master:'Мастерский', legendary:'Легендарный'};\nconst PROF_BONUS = {untrained:0, trained:2, expert:4, master:6, legendary:8};\nfunction profDotsHtml(skillId, rank){\n  const idx = PROF_RANKS.indexOf(rank);\n  const colorClass = rank !== 'untrained' ? \`c-\${rank}\` : '';\n  const locked = isPlay();\n  let dots = '';\n  for(let i=1;i<=4;i++){\n    const filled = i <= idx;\n    dots += \`<span class="prof-dot \${filled ? 'filled '+colorClass : ''}" \${locked ? '' : \`data-dot-pos="\${i}"\`}></span>\`;\n  }\n  return \`<div class="prof-dots \${locked?'locked':''}" data-skill-dots="\${skillId}" title="\${PROF_LABEL[rank]}">\${dots}</div>\`;\n}\nfunction profTotal(rank, level){\n  if(rank === 'untrained') return 0;\n  return PROF_BONUS[rank] + Number(level||0);\n}\nfunction abilityMod(score){ return Math.floor((Number(score||10)-10)/2); }\nfunction fmtMod(n){ n = Number(n)||0; return (n>=0? '+':'') + n; }\n`;

const tabsStart = app.indexOf('/* ---------- tabs / navigation ---------- */');
if (tabsStart === -1) throw new Error('Не найдена навигация в app.js.');
app = `import { ABILITY_DEFS, defaultCharacter, loadCharacter, normalizeCharacter, saveCharacter, uid } from './character-state.js';\nimport { characterToXml, parseCharacterXml } from './character-xml.js';\nimport { byId, showToast } from './dom.js';\n\n${helpers}\nlet CH = loadCharacter();\nfunction save(){ saveCharacter(CH); }\n\n${app.slice(tabsStart)}`;

app = app
  .replace(/function showToast\(msg\)[\s\S]*?\n}\n\n\/\* ---------- tabs \/ navigation ---------- \*\//, '/* ---------- tabs / navigation ---------- */')
  .replace(/function byId\(id\)\{ return document\.getElementById\(id\); \}\n/, '')
  .replace(/function characterToXml\(\)[\s\S]*?(?=function wireMoreTab)/, '')
  .replace('const xml = characterToXml();', 'const xml = characterToXml(CH);')
  .replace('const parsed = xmlToCharacter(reader.result);', 'const parsed = parseCharacterXml(reader.result);');

const xml = `// Совместимый с v1 формат импорта и экспорта персонажей.\n\nexport function characterToXml(character){\n  const json = JSON.stringify(character);\n  const safe = json.split(']]>').join(']]]]><![CDATA[>');\n  return \`<?xml version="1.0" encoding="UTF-8"?>\\n<pf2character version="1">\\n  <name>\${escapeXmlText(character.name || 'Без имени')}</name>\\n  <data><![CDATA[\${safe}]]></data>\\n</pf2character>\\n\`;\n}\n\nexport function parseCharacterXml(xmlText){\n  const doc = new DOMParser().parseFromString(xmlText, 'application/xml');\n  if (doc.querySelector('parsererror')) throw new Error('Некорректный XML-файл');\n  const dataNode = doc.querySelector('data');\n  if (!dataNode) throw new Error('В файле не найдены данные персонажа');\n  return JSON.parse(dataNode.textContent);\n}\n\nfunction escapeXmlText(value){\n  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');\n}\n`;

const dom = `// Минимальные DOM-помощники, не зависящие от состояния персонажа.\n\nexport function byId(id){\n  return document.getElementById(id);\n}\n\nexport function showToast(message){\n  const toast = byId('toast');\n  toast.textContent = message;\n  toast.classList.add('show');\n  clearTimeout(showToast.timeoutId);\n  showToast.timeoutId = setTimeout(() => toast.classList.remove('show'), 1800);\n}\n`;

await Promise.all([
  writeFile(resolve(assets, 'character-state.js'), state, 'utf8'),
  writeFile(resolve(assets, 'character-xml.js'), xml, 'utf8'),
  writeFile(resolve(assets, 'dom.js'), dom, 'utf8'),
  writeFile(appPath, app, 'utf8'),
]);
console.log('Основа перенесена в character-state.js, character-xml.js и dom.js.');
