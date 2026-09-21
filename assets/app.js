import { ABILITY_DEFS, createCharacterProfile, defaultCharacter, listCharacterProfiles, loadCharacter, normalizeCharacter, saveCharacter, switchCharacterProfile, uid } from './character-state.js';
import { characterToXml, parseCharacterXml } from './character-xml.js';
import { byId, showToast } from './dom.js';
import { enableTouchReorder } from './drag-reorder.js';
import { instantiateLibraryFamiliarAbility, getLibraryFamiliarAbility, matchLibraryFamiliarAbility, searchLibraryFamiliarAbilities, DAMAGE_TYPES_RESISTANCE, SKILLED_EXCLUDED, hasFamiliarEffect, familiarAbilityEffect, skilledSkillsFromAbilities, resistanceFromAbilities } from './libraries/familiar-abilities.js';
import { TRAIT_LIBRARY, getLibraryTrait, matchLibraryTrait } from './libraries/traits.js';
import { instantiateLibraryRune, searchLibraryRunes } from './libraries/runes.js';
import {
  ITEM_CATEGORY_LABELS,
  bagCompartmentLocation, bagEffectiveBulk, canHoldRunes, compartmentContentsBulk,
  emptyCustomItem, getLibraryItem, instantiateLibraryItem, isBagItem, itemBulkValue,
  normalizeBagData, normalizeCategory, parseItemLocation, searchLibraryItems, wornCarriedBulk,
} from './libraries/items.js';

/* Общие расчёты, используемые вкладками. */
const PROF_RANKS = ['untrained','trained','expert','master','legendary'];
const PROF_LABEL = {untrained:'Неизученный', trained:'Изученный', expert:'Экспертный', master:'Мастерский', legendary:'Легендарный'};
const PROF_BONUS = {untrained:0, trained:2, expert:4, master:6, legendary:8};
function profDotsHtml(skillId, rank){
  const idx = PROF_RANKS.indexOf(rank);
  const colorClass = rank !== 'untrained' ? `c-${rank}` : '';
  const locked = isPlay();
  let dots = '';
  for(let i=1;i<=4;i++){
    const filled = i <= idx;
    dots += `<span class="prof-dot ${filled ? 'filled '+colorClass : ''}" ${locked ? '' : `data-dot-pos="${i}"`}></span>`;
  }
  return `<div class="prof-dots ${locked?'locked':''}" data-skill-dots="${skillId}" title="${PROF_LABEL[rank]}">${dots}</div>`;
}
function profTotal(rank, level){
  if(rank === 'untrained') return 0;
  return PROF_BONUS[rank] + Number(level||0);
}
function abilityMod(score){ return Math.floor((Number(score||10)-10)/2); }
function fmtMod(n){ n = Number(n)||0; return (n>=0? '+':'') + n; }

let CH = loadCharacter();
function save(){ saveCharacter(CH); }

/* ---------- tabs / navigation ---------- */
const BASE_TABS = [
  {id:'character', label:'Персонаж', icon:'user'},
  {id:'actions', label:'Действия', icon:'bolt'},
  {id:'equipment', label:'Снаряжение', icon:'bag'},
  {id:'spells', label:'Заклинания', icon:'spark'},
  {id:'books', label:'Книги', icon:'book'},
  {id:'feats', label:'Черты', icon:'star'},
];
const ICONS = {
  user:'<circle cx="12" cy="8" r="3.4"/><path d="M4.5 20c1.5-4 4.5-6 7.5-6s6 2 7.5 6"/>',
  bolt:'<path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" stroke-linejoin="round"/>',
  bag:'<rect x="4" y="7" width="16" height="13" rx="2"/><path d="M8 7V6a4 4 0 0 1 8 0v1"/>',
  spark:'<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/>',
  book:'<path d="M4 5.5C4 4.7 4.7 4 5.5 4H12v16H5.5A1.5 1.5 0 0 1 4 18.5v-13Z"/><path d="M20 5.5c0-.8-.7-1.5-1.5-1.5H12v16h6.5c.8 0 1.5-.7 1.5-1.5v-13Z"/>',
  star:'<path d="M12 3.5l2.6 5.4 5.9.7-4.3 4.1 1.1 5.9-5.3-2.9-5.3 2.9 1.1-5.9-4.3-4.1 5.9-.7L12 3.5Z" stroke-linejoin="round"/>',
  paw:'<circle cx="12" cy="16.2" r="3.4"/><circle cx="6.4" cy="10.2" r="2"/><circle cx="10" cy="7.2" r="2"/><circle cx="14" cy="7.2" r="2"/><circle cx="17.6" cy="10.2" r="2"/>',
  gear:'<circle cx="12" cy="12" r="3"/><path d="M12 3.2v2.3M12 18.5v2.3M4.5 7l2 1.15M17.5 15.85 19.5 17M4.5 17l2-1.15M17.5 8.15 19.5 7M3.2 12h2.3M18.5 12h2.3"/>',
  back:'<path d="M15 6 9 12l6 6"/>',
};
let activeTab = 'character';
let settingsReturnTab = 'character';

function visibleTabs(){
  const tabs = BASE_TABS.slice();
  if(CH.familiarEnabled){
    tabs.splice(1, 0, {id:'familiar', label:'Фамильяр', icon:'paw'});
  }
  return tabs;
}

function isPlay(){ return CH.mode === 'play'; }

let pendingFlash = null;
function queueFlash(selector, tone){
  pendingFlash = {selector, tone: tone || 'info'};
}
function runPendingFlash(){
  if(!pendingFlash) return;
  const rec = pendingFlash;
  pendingFlash = null;
  const el = document.querySelector(rec.selector);
  if(!el) return;
  el.classList.remove('num-flash', 'num-flash-good', 'num-flash-bad', 'num-flash-info', 'num-flash-accent');
  void el.offsetWidth;
  el.classList.add('num-flash', 'num-flash-' + rec.tone);
  setTimeout(()=>{
    el.classList.remove('num-flash', 'num-flash-good', 'num-flash-bad', 'num-flash-info', 'num-flash-accent');
  }, 400);
}
function onEl(el, ev, fn){
  if(el) el.addEventListener(ev, fn);
  return el;
}
function rankLabel(lvl){
  lvl = Number(lvl);
  return lvl === 0 ? 'Заговоры' : (lvl + ' круг');
}
function rankToast(lvl){
  lvl = Number(lvl);
  if(lvl === 0) return 'заговоров';
  return lvl + ' круга';
}
function slotDotsHtml(kind, key, max, used, variant){
  max = Math.max(0, Number(max) || 0);
  used = clamp(Number(used) || 0, 0, max);
  const remaining = max - used;
  let dots = '';
  for(let i = 0; i < max; i++){
    const filled = i < remaining;
    const action = filled ? 'spend' : 'restore';
    dots += `<button type="button" class="slot-dot ${filled ? 'filled' : ''} ${variant === 'focus' ? 'focus-dot' : ''}" data-slot-dot="${kind}|${key}|${action}|${i}" aria-label="${filled ? 'Потратить' : 'Вернуть'}"></button>`;
  }
  if(!max) return '<span class="empty-hint" style="padding:0;">Нет</span>';
  return `<div class="slot-dots">${dots}</div>`;
}

function renderTopbar(title, subtitle, opts){
  opts = opts || {};
  if(opts.settings){
    return `
      <div class="topbar">
        <button type="button" class="icon-btn" data-settings-back aria-label="Назад">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${ICONS.back}</svg>
        </button>
        <div class="topbar-main">
          <div class="title">${title}</div>
          <div class="sub">${subtitle||''}</div>
        </div>
      </div>
    `;
  }
  return `
    <div class="topbar">
      <div class="topbar-main">
        <div class="title">${title}</div>
        <div class="sub">${subtitle||''}</div>
      </div>
      <div class="topbar-right">
        <div class="mode-switch">
          <button class="mode-btn ${!isPlay()?'active':''}" data-mode="setup">Настройка</button>
          <button class="mode-btn play-active ${isPlay()?'active':''}" data-mode="play">Игра</button>
        </div>
        <button type="button" class="icon-btn" data-open-settings aria-label="Настройки">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${ICONS.gear}</svg>
        </button>
      </div>
    </div>
  `;
}
document.addEventListener('click', (e)=>{
  const gear = e.target.closest('[data-open-settings]');
  if(gear){
    if(activeTab === 'settings') return;
    settingsReturnTab = activeTab;
    activeTab = 'settings';
    renderApp();
    window.scrollTo(0,0);
    return;
  }
  const back = e.target.closest('[data-settings-back]');
  if(back){
    activeTab = (settingsReturnTab === 'familiar' && !CH.familiarEnabled) ? 'character' : (settingsReturnTab || 'character');
    renderApp();
    window.scrollTo(0,0);
    return;
  }
  const btn = e.target.closest('[data-mode]');
  if(!btn) return;
  if(CH.mode === btn.dataset.mode) return;
  CH.mode = btn.dataset.mode;
  const compact = CH.mode === 'play';
  CH.hpCollapsed = compact;
  CH.defensesCollapsed = compact;
  CH.perceptionCollapsed = compact;
  if(CH.familiar){
    CH.familiar.hpCollapsed = compact;
    CH.familiar.defensesCollapsed = compact;
  }
  save();
  renderApp();
});

function renderNav(){
  const nav = document.getElementById('navbar');
  const settings = activeTab === 'settings';
  document.body.classList.toggle('settings-open', settings);
  if(settings){
    nav.innerHTML = '';
    return;
  }
  nav.innerHTML = visibleTabs().map(t=>`
    <button class="nav-item ${t.id===activeTab?'active':''}" data-tab="${t.id}">
      <svg viewBox="0 0 24 24">${ICONS[t.icon]}</svg>
      <span>${t.label}</span>
    </button>
  `).join('');
  nav.querySelectorAll('.nav-item').forEach(btn=>{
    btn.addEventListener('click', ()=>{ activeTab = btn.dataset.tab; renderApp(); window.scrollTo(0,0); });
  });
}

function getFocusSelector(el){
  if(!el || el===document.body) return null;
  if(el.id) return '#' + CSS.escape(el.id);
  if(el.attributes){
    for(const attr of el.attributes){
      if(attr.name.indexOf('data-') === 0){
        return `[${attr.name}="${CSS.escape(attr.value)}"]`;
      }
    }
  }
  return null;
}

function renderApp(){
  const active = document.activeElement;
  let focusSel = null, selStart = null, selEnd = null;
  const isTextInput = active && (active.tagName==='INPUT' || active.tagName==='TEXTAREA');
  if(isTextInput){
    focusSel = getFocusSelector(active);
    try{ selStart = active.selectionStart; selEnd = active.selectionEnd; }catch(e){}
  }

  renderNav();
  if(activeTab === 'familiar' && !CH.familiarEnabled) activeTab = 'character';
  if(activeTab === 'more') activeTab = 'settings';
  const app = document.getElementById('app');
  let html = '';
  switch(activeTab){
    case 'character': html = renderCharacterTab(); break;
    case 'familiar': html = renderFamiliarTab(); break;
    case 'actions': html = renderActionsTab(); break;
    case 'equipment': html = renderEquipmentTab(); break;
    case 'spells': html = renderSpellsTab(); break;
    case 'books': html = renderBooksTab(); break;
    case 'feats': html = renderFeatsTab(); break;
    case 'settings': html = renderSettingsTab(); break;
  }
  app.innerHTML = html;
  wireCurrentTab();
  runPendingFlash();

  if(focusSel){
    try{
      const el = document.querySelector(focusSel);
      if(el && (el.tagName==='INPUT' || el.tagName==='TEXTAREA')){
        el.focus({preventScroll:true});
        if(selStart!==null && typeof el.setSelectionRange === 'function'){
          try{ el.setSelectionRange(selStart, selEnd); }catch(e){}
        }
      }
    }catch(e){}
  }
}

function wireCurrentTab(){
  switch(activeTab){
    case 'character': wireCharacterTab(); break;
    case 'familiar': wireFamiliarTab(); break;
    case 'actions': wireActionsTab(); break;
    case 'equipment': wireEquipmentTab(); break;
    case 'spells': wireSpellsTab(); break;
    case 'books': wireBooksTab(); break;
    case 'feats': wireFeatsTab(); break;
    case 'settings': wireSettingsTab(); break;
  }
}

/* small util: collapsible card header wiring */
function wireCollapsibles(root){
  root.querySelectorAll('[data-collapse-toggle]').forEach(h=>{
    h.addEventListener('click', ()=>{
      const key = h.dataset.collapseToggle;
      const scope = h.dataset.collapseScope;
      const obj = scope === 'familiar' ? CH.familiar : CH;
      obj[key] = !obj[key];
      save();
      renderApp();
    });
  });
}

/* =========================================================================
   TAB: ПЕРСОНАЖ
   ========================================================================= */
function renderCharacterTab(){
  const a = CH.abilities;
  const level = CH.level;

  const abilityRows = isPlay()
    ? `<div class="familiar-ability-grid">${ABILITY_DEFS.map(d=>`
        <div class="compact-stat"><span class="k">${d.name}</span><span class="v">${fmtMod(a[d.id].mod)}</span></div>
      `).join('')}</div>`
    : ABILITY_DEFS.map(d=>{
        const st = a[d.id];
        return `
        <div class="ability-row">
          <div class="ability-name">${d.name}</div>
          <label class="partial-toggle ${st.partial?'active':''}" title="Частичное повышение (нужно два, чтобы поднять модификатор на +1, когда он уже +4 или больше)">
            <input type="checkbox" data-ability-partial="${d.id}" ${st.partial?'checked':''}>½
          </label>
          <div class="ability-controls">
            <button class="btn btn-icon btn-sm" data-ability-flaw="${d.id}">−</button>
            <div class="ability-mod-wrap"><input type="number" class="ability-mod-input" data-ability-mod="${d.id}" value="${st.mod}"></div>
            <button class="btn btn-icon btn-sm" data-ability-boost="${d.id}">+</button>
          </div>
        </div>`;
      }).join('');

  const hpPct = CH.hp.max>0 ? Math.max(0, Math.min(100, (CH.hp.current/CH.hp.max)*100)) : 0;
  const tempPct = CH.hp.max>0 ? Math.max(0, Math.min(100-hpPct, (CH.hp.temp/CH.hp.max)*100)) : 0;

  const dexMod = a.dex.mod;
  const acDexCap = CH.defenses.ac.dexCap;
  const acDexUsed = (acDexCap!==null && acDexCap!=='') ? Math.min(dexMod, Number(acDexCap)) : dexMod;
  const acTotal = 10 + acDexUsed + profTotal(CH.defenses.ac.proficiency, level) + Number(CH.defenses.ac.armorBonus||0) + Number(CH.defenses.ac.otherBonus||0);

  function saveTotal(key, abilityId){
    const d = CH.defenses[key];
    return a[abilityId].mod + profTotal(d.proficiency, level) + Number(d.otherBonus||0);
  }
  const fortTotal = saveTotal('fort','con');
  const refTotal = saveTotal('ref','dex');
  const willTotal = saveTotal('will','wis');

  const perceptionTotal = a.wis.mod + profTotal(CH.perception.proficiency, level) + Number(CH.perception.otherBonus||0);

  function senseGroupHtml(key, label){
    const list = CH.perception.senses[key] || [];
    const chips = list.length
      ? list.map((s,i)=>`<span class="tag-chip">${escapeHtml(s)}${!isPlay() ? `<button type="button" data-sense-del="${key}|${i}">✕</button>`:''}</span>`).join('')
      : '<span class="empty-hint" style="padding:2px 0;">Нет</span>';
    return `
      <div class="field" style="margin-bottom:10px;">
        <label class="field-label">${label}</label>
        <div class="tag-chip-box">${chips}</div>
        ${!isPlay() ? `<div class="tag-input-row"><input type="text" id="senseInput_${key}" placeholder="Добавить..."><button class="btn btn-sm btn-accent" data-sense-add="${key}">+</button></div>` : ''}
      </div>
    `;
  }

  const profOptions = (val)=> PROF_RANKS.map(r=>`<option value="${r}" ${r===val?'selected':''}>${PROF_LABEL[r]}</option>`).join('');

  const skillRows = CH.skills.map(s=>{
    const total = a[s.ability].mod + profTotal(s.proficiency, level) + Number(s.otherBonus||0);
    if(isPlay()){
      return `
      <div class="skill-row play-skill-row">
        <div class="skill-name">
          <div class="n">${escapeHtml(s.name || 'Без названия')}</div>
          <div class="a">${abilityShort(s.ability)}</div>
        </div>
        <div class="skill-total">${fmtMod(total)}</div>
      </div>`;
    }
    return `
    <div class="skill-row" data-skill-id="${s.id}" data-reorder-id="${s.id}">
      <span class="drag-handle" data-skill-drag-handle aria-label="Перетащить навык" title="Перетащить навык">⠿</span>
      <div class="skill-name">
        <div class="n">${s.multi ? `<input type="text" class="skill-multi-name" data-skill-name="${s.id}" value="${escapeAttr(s.name)}" placeholder="Название">` : escapeHtml(s.name || 'Без названия')}</div>
        <div class="a">${abilityShort(s.ability)}</div>
      </div>
      <div class="skill-prof">
        ${profDotsHtml(s.id, s.proficiency)}
      </div>
      <div class="skill-bonus-input">
        <input type="number" data-skill-bonus="${s.id}" value="${s.otherBonus||0}" title="доп. бонус">
      </div>
      <div class="skill-total">${fmtMod(total)}</div>
      ${s.multi ? `<button class="skill-del" data-skill-del="${s.id}">✕</button>` : '<span style="width:20px;display:inline-block;"></span>'}
    </div>`;
  }).join('');

  const traitsHtml = CH.traits.length
    ? CH.traits.map((t,i)=>traitChipHtml(t, !isPlay() ? `<button type="button" data-trait-del="${i}">✕</button>` : '')).join('')
    : '<div class="empty-hint" style="padding:6px 0;">Дескрипторов пока нет</div>';

  const languagesHtml = CH.languages.length
    ? CH.languages.map((t,i)=>`<span class="tag-chip">${escapeHtml(t)}${!isPlay() ? `<button type="button" data-lang-del="${i}">✕</button>`:''}</span>`).join('')
    : '<span class="empty-hint" style="padding:2px 0;">Языков пока нет</span>';

  return `
    ${renderTopbar('Персонаж', `${CH.className||'Класс не указан'} · Ур. ${CH.level}`)}
    <div class="page active">

      <div class="card">
        ${isPlay() ? `
        <div class="play-id">
          <div class="name-display">${escapeHtml(CH.name) || 'Без имени'}</div>
          <div class="row2">
            <div class="play-kv"><span>Класс</span>${escapeHtml(CH.className) || '—'}</div>
            <div class="play-kv"><span>Уровень</span>${CH.level}</div>
          </div>
        </div>` : `
        <div class="field">
          <input type="text" class="name-input" id="charName" placeholder="Имя персонажа" value="${escapeAttr(CH.name)}">
        </div>
        <div class="row2">
          <div class="field"><label class="field-label">Класс</label><input type="text" id="charClass" value="${escapeAttr(CH.className)}"></div>
          <div class="field"><label class="field-label">Уровень</label><input type="number" id="charLevel" min="1" max="20" value="${CH.level}"></div>
        </div>`}
        <div class="mythic-row">
          <span class="field-label" style="margin:0;">Мифические очки</span>
          <div class="mythic-dots">
            ${[0,1,2].map(i=>`<div class="dot ${i < CH.mythicPoints ? 'filled':''}" data-mythic="${i+1}"></div>`).join('')}
          </div>
        </div>
      </div>

      <div class="card">
        <h3 style="margin-bottom:8px;">Дескрипторы персонажа</h3>
        <div class="tag-chip-box">${traitsHtml}</div>
        ${!isPlay() ? `
        <div class="tag-input-row">
          <input type="text" id="traitInput" placeholder="Выберите из библиотеки или введите свой…">
          <button class="btn btn-accent" id="traitAddBtn">+</button>
        </div>` : ''}
        ${!isPlay() ? '<div class="tag-suggestions" id="traitSuggestions"></div>' : ''}
      </div>

      <div class="card">
        <div class="card-header" data-collapse-toggle="aboutCollapsed">
          <h3>О персонаже</h3>
          <svg class="chev ${!CH.aboutCollapsed?'open':''}" width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none"><path d="M6 9l6 6 6-6"/></svg>
        </div>
        <div class="card-body ${CH.aboutCollapsed?'collapsed':''}">
          <div class="desc-grid">
            <div class="field"><label class="field-label">Родословная</label>${isPlay() ? `<div class="play-text">${escapeHtml(CH.descriptors.ancestry) || '—'}</div>` : `<input type="text" id="descAncestry" value="${escapeAttr(CH.descriptors.ancestry)}">`}</div>
            <div class="field"><label class="field-label">Наследие</label>${isPlay() ? `<div class="play-text">${escapeHtml(CH.descriptors.heritage) || '—'}</div>` : `<input type="text" id="descHeritage" value="${escapeAttr(CH.descriptors.heritage)}">`}</div>
            <div class="field"><label class="field-label">Предыстория</label>${isPlay() ? `<div class="play-text">${escapeHtml(CH.descriptors.background) || '—'}</div>` : `<input type="text" id="descBackground" value="${escapeAttr(CH.descriptors.background)}">`}</div>
            <div class="field"><label class="field-label">Мировоззрение</label>${isPlay() ? `<div class="play-text">${escapeHtml(CH.descriptors.alignment) || '—'}</div>` : `<input type="text" id="descAlignment" value="${escapeAttr(CH.descriptors.alignment)}">`}</div>
            <div class="field"><label class="field-label">Божество</label>${isPlay() ? `<div class="play-text">${escapeHtml(CH.descriptors.deity) || '—'}</div>` : `<input type="text" id="descDeity" value="${escapeAttr(CH.descriptors.deity)}">`}</div>
            <div class="field"><label class="field-label">Размер</label>${isPlay() ? `<div class="play-text">${escapeHtml(CH.descriptors.size) || '—'}</div>` : `<input type="text" id="descSize" value="${escapeAttr(CH.descriptors.size)}">`}</div>
          </div>
          <div class="field">
            <label class="field-label">Языки</label>
            <div class="tag-chip-box">${languagesHtml}</div>
            ${!isPlay() ? `
            <div class="tag-input-row">
              <input type="text" id="languageInput" placeholder="Например: Общий, Эльфийский…">
              <button class="btn btn-sm btn-accent" id="languageAddBtn">+</button>
            </div>` : ''}
          </div>
          ${isPlay() ? `
          <div class="field">
            <label class="field-label">Внешность</label>
            ${CH.appearance && CH.appearance.trim()
              ? `<div class="play-text">${escapeHtml(CH.appearance)}</div>`
              : `<div class="empty-hint" style="padding:2px 0;">Нет внешности</div>`}
          </div>
          <div class="field" style="margin-bottom:0;">
            <label class="field-label">Заметки</label>
            ${CH.notes && CH.notes.trim()
              ? `<div class="play-text">${escapeHtml(CH.notes)}</div>`
              : `<div class="empty-hint" style="padding:2px 0;">Нет заметок</div>`}
          </div>` : `
          <div class="field"><label class="field-label">Внешность</label><textarea class="autosize" id="charAppearance">${escapeHtml_(CH.appearance)}</textarea></div>
          <div class="field" style="margin-bottom:0;"><label class="field-label">Заметки</label><textarea class="autosize" id="charNotes">${escapeHtml_(CH.notes)}</textarea></div>`}
        </div>
      </div>

      <div class="card">
        <div class="card-header" data-collapse-toggle="abilitiesCollapsed">
          <h3>Характеристики</h3>
          <svg class="chev ${!CH.abilitiesCollapsed?'open':''}" width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none"><path d="M6 9l6 6 6-6"/></svg>
        </div>
        <div class="card-body ${CH.abilitiesCollapsed?'collapsed':''}">
          ${isPlay() ? '' : '<div class="ability-hint">Указывается сразу модификатор характеристики. Если модификатор уже +4 или больше, повышение сначала ставит отметку «½» — второе такое повышение поднимает модификатор на +1.</div>'}
          <div>${abilityRows}</div>
        </div>
      </div>

      <div class="card">
        <div class="card-header" data-collapse-toggle="hpCollapsed">
          <h3>Здоровье</h3>
          <svg class="chev ${!CH.hpCollapsed?'open':''}" width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none"><path d="M6 9l6 6 6-6"/></svg>
        </div>
        ${CH.hpCollapsed ? `
        <div class="compact-panel compact-hp">
          <div class="compact-hp-row">
            <button class="btn hp-delta hp-minus" data-delta="-1">−1</button>
            <div class="compact-hp-value">
              <span class="hp-num">${CH.hp.current}</span><span class="hp-max"> / ${CH.hp.max}</span>
              ${CH.hp.temp>0 ? `<span class="pill" style="margin-left:8px;color:#8fb4de;border-color:#3a5474;">+${CH.hp.temp} врем.</span>`:''}
            </div>
            <button class="btn hp-delta hp-plus" data-delta="1">+1</button>
          </div>
          <div class="hp-bar"><div class="hp-bar-fill" style="width:${hpPct}%"></div><div class="hp-bar-temp" style="width:${tempPct}%;left:${hpPct}%"></div></div>
        </div>` : ''}
        <div class="card-body ${CH.hpCollapsed?'collapsed':''}">
          <div class="hp-main">
            <span class="hp-num" id="hpCurrentDisplay">${CH.hp.current}</span><span class="hp-max"> / ${CH.hp.max}</span>
            ${CH.hp.temp>0 ? `<span class="pill" style="margin-left:8px;color:#8fb4de;border-color:#3a5474;">+${CH.hp.temp} врем.</span>`:''}
          </div>
          <div class="hp-bar"><div class="hp-bar-fill" style="width:${hpPct}%"></div><div class="hp-bar-temp" style="width:${tempPct}%;left:${hpPct}%"></div></div>
          <div class="hp-btns">
            <button class="btn hp-delta hp-minus" data-delta="-5">−5</button>
            <button class="btn hp-delta hp-minus" data-delta="-1">−1</button>
            <button class="btn hp-delta hp-plus" data-delta="1">+1</button>
            <button class="btn hp-delta hp-plus" data-delta="5">+5</button>
          </div>
          <div class="row2" style="margin-top:10px;">
            <div class="field" style="margin-bottom:0;"><label class="field-label">Текущие ОЗ</label><input type="number" id="hpCurrentInput" value="${CH.hp.current}"></div>
            ${isPlay() ? `
            <div class="field" style="margin-bottom:0;"><label class="field-label">Максимум ОЗ</label><div class="play-text" style="padding-top:8px;font-size:16px;font-weight:700;color:var(--text);">${CH.hp.max}</div></div>` : `
            <div class="field" style="margin-bottom:0;"><label class="field-label">Максимум ОЗ</label><input type="number" id="hpMaxInput" value="${CH.hp.max}"></div>`}
          </div>
          <div class="temp-hp-field">
            <label>Временные ОЗ</label>
            <input type="number" id="hpTempInput" value="${CH.hp.temp}" style="width:90px;">
          </div>
          <div class="field" style="margin-top:14px;margin-bottom:0;">
            <label class="field-label">Сопротивления, уязвимости, иммунитеты</label>
            <div class="tag-chip-box">${(CH.hp.resistances||[]).length ? CH.hp.resistances.map(resistChipHtml).join('') : '<span class="empty-hint" style="padding:2px 0;">Нет</span>'}</div>
            ${!isPlay() ? `<button class="btn btn-sm btn-accent" id="addResistBtn">+ Добавить</button>` : ''}
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header" data-collapse-toggle="defensesCollapsed">
          <h3>Защита</h3>
          <svg class="chev ${!CH.defensesCollapsed?'open':''}" width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none"><path d="M6 9l6 6 6-6"/></svg>
        </div>
        ${CH.defensesCollapsed ? `
        <div class="compact-panel compact-def">
          <div class="compact-stat"><span class="k">КБ</span><span class="v">${acTotal}</span></div>
          <div class="compact-stat"><span class="k">С</span><span class="v">${fmtMod(fortTotal)}</span></div>
          <div class="compact-stat"><span class="k">Р</span><span class="v">${fmtMod(refTotal)}</span></div>
          <div class="compact-stat"><span class="k">В</span><span class="v">${fmtMod(willTotal)}</span></div>
        </div>` : ''}
        <div class="card-body ${CH.defensesCollapsed?'collapsed':''}">
          <div class="def-grid">
            <div class="def-box">
              <div class="def-title">Класс Доспеха</div>
              <div class="def-val">${acTotal}</div>
              ${isPlay() ? '' : `
              <select data-ac-prof>${profOptions(CH.defenses.ac.proficiency)}</select>
              <div class="mini-row">
                <input type="number" data-ac-armor placeholder="Бонус брони" value="${CH.defenses.ac.armorBonus||0}" title="Бонус брони">
                <input type="text" data-ac-dexcap placeholder="Кап Лов" value="${CH.defenses.ac.dexCap===null?'':CH.defenses.ac.dexCap}" title="Максимальный бонус Ловкости">
              </div>
              <div class="mini-row">
                <input type="number" data-ac-other placeholder="Прочее" value="${CH.defenses.ac.otherBonus||0}" title="Прочие бонусы">
              </div>`}
            </div>
            <div class="def-box">
              <div class="def-title">Стойкость</div>
              <div class="def-val">${fmtMod(fortTotal)}</div>
              ${isPlay() ? (CH.defenses.fort.critUpgrade ? '<span class="pill crit-pill">успех → крит.</span>' : '') : `
              <select data-save-prof="fort">${profOptions(CH.defenses.fort.proficiency)}</select>
              <div class="mini-row"><input type="number" data-save-other="fort" value="${CH.defenses.fort.otherBonus||0}" placeholder="Прочее"></div>
              <label class="crit-toggle"><input type="checkbox" data-save-crit="fort" ${CH.defenses.fort.critUpgrade?'checked':''}>Успех → крит. успех</label>`}
            </div>
            <div class="def-box">
              <div class="def-title">Реакция</div>
              <div class="def-val">${fmtMod(refTotal)}</div>
              ${isPlay() ? (CH.defenses.ref.critUpgrade ? '<span class="pill crit-pill">успех → крит.</span>' : '') : `
              <select data-save-prof="ref">${profOptions(CH.defenses.ref.proficiency)}</select>
              <div class="mini-row"><input type="number" data-save-other="ref" value="${CH.defenses.ref.otherBonus||0}" placeholder="Прочее"></div>
              <label class="crit-toggle"><input type="checkbox" data-save-crit="ref" ${CH.defenses.ref.critUpgrade?'checked':''}>Успех → крит. успех</label>`}
            </div>
            <div class="def-box">
              <div class="def-title">Воля</div>
              <div class="def-val">${fmtMod(willTotal)}</div>
              ${isPlay() ? (CH.defenses.will.critUpgrade ? '<span class="pill crit-pill">успех → крит.</span>' : '') : `
              <select data-save-prof="will">${profOptions(CH.defenses.will.proficiency)}</select>
              <div class="mini-row"><input type="number" data-save-other="will" value="${CH.defenses.will.otherBonus||0}" placeholder="Прочее"></div>
              <label class="crit-toggle"><input type="checkbox" data-save-crit="will" ${CH.defenses.will.critUpgrade?'checked':''}>Успех → крит. успех</label>`}
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header" data-collapse-toggle="perceptionCollapsed">
          <h3>Восприятие</h3>
          <svg class="chev ${!CH.perceptionCollapsed?'open':''}" width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none"><path d="M6 9l6 6 6-6"/></svg>
        </div>
        ${CH.perceptionCollapsed ? `
        <div class="compact-panel compact-perception">
          <div class="compact-perception-value">${fmtMod(perceptionTotal)}</div>
          <div class="tag-chip-box">${['precise','imprecise','vague'].flatMap(key => (CH.perception.senses[key]||[]).map(s=>`<span class="tag-chip">${escapeHtml(s)}</span>`)).join('') || '<span class="empty-hint" style="padding:2px 0;">Нет чувств</span>'}</div>
        </div>` : ''}
        <div class="card-body ${CH.perceptionCollapsed?'collapsed':''}">
          <div class="def-box" style="margin-bottom:14px;">
            <div class="def-title">Внимательность</div>
            <div class="def-val">${fmtMod(perceptionTotal)}</div>
            ${isPlay() ? '' : `
            <select data-perception-prof>${profOptions(CH.perception.proficiency)}</select>
            <div class="mini-row"><input type="number" data-perception-other value="${CH.perception.otherBonus||0}" placeholder="Прочее"></div>`}
          </div>
          ${senseGroupHtml('precise','Точные')}
          ${senseGroupHtml('imprecise','Вспомогательные')}
          ${senseGroupHtml('vague','Дополнительные')}
        </div>
      </div>

      <div class="card">
        <h3 style="margin-bottom:10px;">Движение</h3>
        ${isPlay() ? `
        <div class="compact-speeds">
          <div class="compact-stat"><span class="k">Наземная</span><span class="v">${CH.speeds.base}</span></div>
          ${(CH.speeds.extra||[]).map(s=>`
            <div class="compact-stat"><span class="k">${escapeHtml(s.name||'Скорость')}</span><span class="v">${escapeHtml(s.value || '—')}</span></div>
          `).join('')}
        </div>` : `
        <div class="field speed-setup">
          <label class="field-label">Наземная скорость (футы)</label>
          <input type="number" id="speedBase" class="speed-num" value="${CH.speeds.base}">
        </div>
        ${CH.speeds.extra.length ? `<div style="margin-top:4px;">${CH.speeds.extra.map(s=>`
          <div class="extra-speed-row">
            <span>${escapeHtml(s.name)}${s.value ? ' — '+escapeHtml(s.value) : ''}</span>
            <button data-speed-del="${s.id}">✕</button>
          </div>
        `).join('')}</div>` : ''}
        <button class="btn btn-sm" id="addSpeedBtn" style="margin-top:10px;">+ Доп. скорость</button>`}
      </div>

      <div class="card">
        <h3 style="margin-bottom:6px;">Навыки</h3>
        <div>${skillRows || '<div class="empty-hint">Нет навыков — добавьте в режиме настройки</div>'}</div>
        ${isPlay() ? '' : `
        <div class="row" style="margin-top:12px;">
          <button class="btn btn-accent btn-block" id="addLoreBtn">+ Знание</button>
          <button class="btn btn-accent btn-block" id="addCraftBtn">+ Ремесло</button>
        </div>`}
      </div>

    </div>
  `;
}
function abilityShort(id){ return {str:'Сил',dex:'Лов',con:'Тел',int:'Инт',wis:'Мдр',cha:'Хар'}[id]; }
function resistChipHtml(r){
  const cls = r.type==='resistance' ? 'resist' : r.type==='weakness' ? 'weak' : 'immune';
  const label = r.type==='resistance' ? `Сопротивление к ${r.name} ${r.value}`
              : r.type==='weakness' ? `Уязвимость к ${r.name} ${r.value}`
              : `Иммунитет к ${r.name}`;
  return `<span class="tag-chip ${cls}">${escapeHtml(label)}${!isPlay() ? `<button type="button" data-resist-del="${r.id}">✕</button>`:''}</span>`;
}
function escapeAttr(s){ return String(s??'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;'); }
function escapeHtml(s){ return escapeAttr(s).replace(/\n/g,'<br>'); }
function bindAutosize(el){
  if(!el) return;
  const fit = ()=>{
    el.style.height = 'auto';
    el.style.height = Math.max(72, el.scrollHeight) + 'px';
  };
  el.addEventListener('input', fit);
  fit();
}

function wireCharacterTab(){
  const root = document.querySelector('.page.active');
  wireCollapsibles(root);

  onEl(byId('charName'), 'input', e=>{ CH.name=e.target.value; save(); refreshTopbarOnly(); });
  onEl(byId('descAncestry'), 'input', e=>{ CH.descriptors.ancestry=e.target.value; save(); });
  onEl(byId('descHeritage'), 'input', e=>{ CH.descriptors.heritage=e.target.value; save(); });
  onEl(byId('descBackground'), 'input', e=>{ CH.descriptors.background=e.target.value; save(); });
  onEl(byId('descAlignment'), 'input', e=>{ CH.descriptors.alignment=e.target.value; save(); });
  onEl(byId('descDeity'), 'input', e=>{ CH.descriptors.deity=e.target.value; save(); });
  onEl(byId('descSize'), 'input', e=>{ CH.descriptors.size=e.target.value; save(); });
  const appearanceEl = byId('charAppearance');
  if(appearanceEl){
    bindAutosize(appearanceEl);
    appearanceEl.addEventListener('input', e=>{ CH.appearance=e.target.value; save(); });
  }
  const notesEl = byId('charNotes');
  if(notesEl){
    bindAutosize(notesEl);
    notesEl.addEventListener('input', e=>{ CH.notes=e.target.value; save(); });
  }
  onEl(byId('charClass'), 'input', e=>{ CH.className=e.target.value; save(); renderApp(); });
  onEl(byId('charLevel'), 'input', e=>{ CH.level=Number(e.target.value)||1; save(); renderApp(); });

  root.querySelectorAll('[data-mythic]').forEach(dot=>{
    dot.addEventListener('click', ()=>{
      const v = Number(dot.dataset.mythic);
      const next = (CH.mythicPoints===v) ? v-1 : v;
      CH.mythicPoints = next;
      showToast('Мифические очки ' + next, 'mythic');
      queueFlash('.mythic-dots', 'accent');
      save(); renderApp();
    });
  });

  const traitAddBtn = byId('traitAddBtn');
  const traitInputEl = byId('traitInput');
  const traitSuggestionsEl = byId('traitSuggestions');
  function hasCharacterTrait(candidate){ return CH.traits.some(trait=>traitKey(trait) === traitKey(candidate)); }
  function renderCharacterTraitSuggestions(){
    if(!traitSuggestionsEl || !traitInputEl) return;
    const query = traitInputEl.value.trim().toLocaleLowerCase('ru');
    const matches = query ? TRAIT_LIBRARY.filter(t=>t.name.toLocaleLowerCase('ru').includes(query) || t.category.toLocaleLowerCase('ru').includes(query)).slice(0,12) : [];
    traitSuggestionsEl.innerHTML = '';
    matches.forEach(trait=>{
      const option = document.createElement('button');
      option.type = 'button'; option.className = `tag-suggestion tone-${trait.color}`;
      option.innerHTML = `<span>${escapeHtml(trait.name)}</span><small>${escapeHtml(trait.category)}</small>`;
      option.addEventListener('click', ()=>{
        if(!hasCharacterTrait({type:'library', id:trait.id})) CH.traits.push({type:'library', id:trait.id});
        save(); renderApp();
      });
      traitSuggestionsEl.appendChild(option);
    });
  }
  if(traitAddBtn) traitAddBtn.addEventListener('click', ()=>{
    const v = traitInputEl.value.trim();
    if(!v) return;
    const library = matchLibraryTrait(v);
    const trait = library ? {type:'library', id:library.id} : {type:'custom', name:v};
    if(!hasCharacterTrait(trait)){ CH.traits.push(trait); save(); renderApp(); }
  });
  if(traitInputEl){
    traitInputEl.addEventListener('input', renderCharacterTraitSuggestions);
    traitInputEl.addEventListener('keydown', e=>{ if(e.key==='Enter'){ e.preventDefault(); traitAddBtn.click(); } });
  }
  root.querySelectorAll('[data-trait-del]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      CH.traits.splice(Number(btn.dataset.traitDel),1);
      save(); renderApp();
    });
  });

  const languageAddBtn = byId('languageAddBtn');
  if(languageAddBtn) languageAddBtn.addEventListener('click', ()=>{
    const inp = byId('languageInput');
    const v = inp.value.trim();
    if(v){ CH.languages.push(v); save(); renderApp(); }
  });
  const languageInputEl = byId('languageInput');
  if(languageInputEl) languageInputEl.addEventListener('keydown', e=>{
    if(e.key==='Enter'){ e.preventDefault(); languageAddBtn.click(); }
  });
  root.querySelectorAll('[data-lang-del]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      CH.languages.splice(Number(btn.dataset.langDel),1);
      save(); renderApp();
    });
  });

  root.querySelectorAll('[data-ability-mod]').forEach(inp=>{
    inp.addEventListener('input', ()=>{
      CH.abilities[inp.dataset.abilityMod].mod = Number(inp.value)||0;
      save(); renderApp();
    });
  });
  root.querySelectorAll('[data-ability-partial]').forEach(chk=>{
    chk.addEventListener('change', ()=>{
      CH.abilities[chk.dataset.abilityPartial].partial = chk.checked;
      save(); renderApp();
    });
  });
  root.querySelectorAll('[data-ability-boost]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      applyAbilityBoost(btn.dataset.abilityBoost);
    });
  });
  root.querySelectorAll('[data-ability-flaw]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      applyAbilityFlaw(btn.dataset.abilityFlaw);
    });
  });

  root.querySelectorAll('.hp-delta').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      e.stopPropagation();
      applyHpDelta(Number(btn.dataset.delta));
    });
  });
  onEl(byId('hpCurrentInput'), 'input', e=>{ CH.hp.current = clamp(Number(e.target.value)||0, -9999, CH.hp.max); save(); renderApp(); });
  onEl(byId('hpMaxInput'), 'input', e=>{ CH.hp.max = Math.max(0,Number(e.target.value)||0); save(); renderApp(); });
  onEl(byId('hpTempInput'), 'input', e=>{
    CH.hp.temp = Math.max(0,Number(e.target.value)||0);
    save(); renderApp();
  });

  root.querySelectorAll('[data-resist-del]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      CH.hp.resistances = CH.hp.resistances.filter(x=>x.id!==btn.dataset.resistDel);
      save(); renderApp();
    });
  });
  const addResistBtn = byId('addResistBtn');
  if(addResistBtn) addResistBtn.addEventListener('click', ()=>{
    openModal('Сопротивление / уязвимость / иммунитет', `
      <div class="field"><label class="field-label">Тип урона или эффекта</label><input type="text" id="mfName" placeholder="Огонь, Холод, Электричество…"></div>
      <div class="field"><label class="field-label">Тип</label>
        <select id="mfRType">
          <option value="resistance">Сопротивление</option>
          <option value="weakness">Уязвимость</option>
          <option value="immunity">Иммунитет</option>
        </select>
      </div>
      <div class="field" id="mfValueField">
        <label class="field-label">Значение</label><input type="number" min="0" id="mfValue" value="5">
      </div>
      <div class="modal-actions">
        <button class="btn btn-block" id="mfCancel">Отмена</button>
        <button class="btn btn-accent btn-block" id="mfSave">Добавить</button>
      </div>
    `, ()=>{
      byId('mfRType').addEventListener('change', e=>{
        byId('mfValueField').style.display = e.target.value==='immunity' ? 'none' : '';
      });
      byId('mfCancel').addEventListener('click', closeModal);
      byId('mfSave').addEventListener('click', ()=>{
        const name = byId('mfName').value.trim();
        if(!name) return;
        const type = byId('mfRType').value;
        const value = type==='immunity' ? null : (Number(byId('mfValue').value)||0);
        CH.hp.resistances.push({id:uid(), name, type, value});
        save(); closeModal(); renderApp();
      });
    });
  });

  const acProf = root.querySelector('[data-ac-prof]');
  if(acProf) acProf.addEventListener('change', e=>{ CH.defenses.ac.proficiency=e.target.value; save(); renderApp(); });
  const acArmor = root.querySelector('[data-ac-armor]');
  if(acArmor) acArmor.addEventListener('input', e=>{ CH.defenses.ac.armorBonus=Number(e.target.value)||0; save(); renderApp(); });
  const acDex = root.querySelector('[data-ac-dexcap]');
  if(acDex) acDex.addEventListener('input', e=>{
    const v = e.target.value.trim();
    CH.defenses.ac.dexCap = v==='' ? null : Number(v);
    save(); renderApp();
  });
  const acOther = root.querySelector('[data-ac-other]');
  if(acOther) acOther.addEventListener('input', e=>{ CH.defenses.ac.otherBonus=Number(e.target.value)||0; save(); renderApp(); });

  ['fort','ref','will'].forEach(key=>{
    const prof = root.querySelector(`[data-save-prof="${key}"]`);
    if(prof) prof.addEventListener('change', e=>{ CH.defenses[key].proficiency=e.target.value; save(); renderApp(); });
    const other = root.querySelector(`[data-save-other="${key}"]`);
    if(other) other.addEventListener('input', e=>{ CH.defenses[key].otherBonus=Number(e.target.value)||0; save(); renderApp(); });
    const crit = root.querySelector(`[data-save-crit="${key}"]`);
    if(crit) crit.addEventListener('change', e=>{ CH.defenses[key].critUpgrade=e.target.checked; save(); });
  });

  const percProf = root.querySelector('[data-perception-prof]');
  if(percProf) percProf.addEventListener('change', e=>{ CH.perception.proficiency=e.target.value; save(); renderApp(); });
  const percOther = root.querySelector('[data-perception-other]');
  if(percOther) percOther.addEventListener('input', e=>{ CH.perception.otherBonus=Number(e.target.value)||0; save(); renderApp(); });

  root.querySelectorAll('[data-sense-del]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const [key, idx] = btn.dataset.senseDel.split('|');
      CH.perception.senses[key].splice(Number(idx),1);
      save(); renderApp();
    });
  });
  root.querySelectorAll('[data-sense-add]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const key = btn.dataset.senseAdd;
      const inp = byId('senseInput_'+key);
      const v = inp.value.trim();
      if(v){ CH.perception.senses[key].push(v); save(); renderApp(); }
    });
  });
  ['precise','imprecise','vague'].forEach(key=>{
    const inp = byId('senseInput_'+key);
    if(inp) inp.addEventListener('keydown', e=>{
      if(e.key==='Enter'){ e.preventDefault(); root.querySelector(`[data-sense-add="${key}"]`).click(); }
    });
  });

  const speedBaseInput = byId('speedBase');
  if(speedBaseInput) speedBaseInput.addEventListener('input', e=>{ CH.speeds.base=Number(e.target.value)||0; save(); renderApp(); });
  root.querySelectorAll('[data-speed-del]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      CH.speeds.extra = CH.speeds.extra.filter(x=>x.id!==btn.dataset.speedDel);
      save(); renderApp();
    });
  });
  const addSpeedBtn = byId('addSpeedBtn');
  if(addSpeedBtn) addSpeedBtn.addEventListener('click', ()=>{
    openModal('Дополнительная скорость', `
      <div class="field"><label class="field-label">Название</label><input type="text" id="mfName" placeholder="Полёт, Лазание, Плавание…"></div>
      <div class="field"><label class="field-label">Значение</label><input type="text" id="mfValue" placeholder="30 фт"></div>
      <div class="modal-actions">
        <button class="btn btn-block" id="mfCancel">Отмена</button>
        <button class="btn btn-accent btn-block" id="mfSave">Добавить</button>
      </div>
    `, ()=>{
      byId('mfCancel').addEventListener('click', closeModal);
      byId('mfSave').addEventListener('click', ()=>{
        const name = byId('mfName').value.trim();
        const value = byId('mfValue').value.trim();
        if(name){ CH.speeds.extra.push({id:uid(), name, value}); save(); closeModal(); renderApp(); }
      });
    });
  });

  root.querySelectorAll('[data-skill-dots]').forEach(container=>{
    if(container.classList.contains('locked')) return;
    container.querySelectorAll('[data-dot-pos]').forEach(dot=>{
      dot.addEventListener('click', ()=>{
        const s = CH.skills.find(x=>x.id===container.dataset.skillDots);
        const curIdx = PROF_RANKS.indexOf(s.proficiency);
        const pos = Number(dot.dataset.dotPos);
        s.proficiency = PROF_RANKS[curIdx===pos ? pos-1 : pos];
        save(); renderApp();
      });
    });
  });
  root.querySelectorAll('[data-skill-bonus]').forEach(inp=>{
    inp.addEventListener('input', ()=>{
      const s = CH.skills.find(x=>x.id===inp.dataset.skillBonus);
      s.otherBonus = Number(inp.value)||0; save(); renderApp();
    });
  });
  root.querySelectorAll('[data-skill-name]').forEach(inp=>{
    inp.addEventListener('input', ()=>{
      const s = CH.skills.find(x=>x.id===inp.dataset.skillName);
      s.name = inp.value; save();
    });
  });
  root.querySelectorAll('[data-skill-del]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      CH.skills = CH.skills.filter(x=>x.id!==btn.dataset.skillDel);
      save(); renderApp();
    });
  });
  enableTouchReorder({
    root, itemSelector: '.skill-row[data-skill-id]', handleSelector: '[data-skill-drag-handle]',
    canReorder: () => !isPlay(),
    onReorder: (_, ids) => { CH.skills = ids.map(id => CH.skills.find(skill => skill.id === id)); save(); renderApp(); },
  });

  const addLoreBtn = byId('addLoreBtn');
  if(addLoreBtn) addLoreBtn.addEventListener('click', ()=>{
    CH.skills.push({id:uid(), name:'Знание (…)', ability:'int', proficiency:'untrained', otherBonus:0, multi:true});
    save(); renderApp();
  });
  const addCraftBtn = byId('addCraftBtn');
  if(addCraftBtn) addCraftBtn.addEventListener('click', ()=>{
    CH.skills.push({id:uid(), name:'Ремесло (…)', ability:'int', proficiency:'untrained', otherBonus:0, multi:true});
    save(); renderApp();
  });
}

function applyAbilityBoost(id){
  const st = CH.abilities[id];
  if(st.mod < 4){
    st.mod += 1;
  } else if(st.partial){
    st.mod += 1;
    st.partial = false;
  } else {
    st.partial = true;
  }
  save(); renderApp();
}
function applyAbilityFlaw(id){
  const st = CH.abilities[id];
  st.mod -= 1;
  st.partial = false;
  save(); renderApp();
}
function applyHpDelta(d){
  if(d < 0){
    let dmg = -d;
    if(CH.hp.temp > 0){
      const absorbed = Math.min(CH.hp.temp, dmg);
      CH.hp.temp -= absorbed; dmg -= absorbed;
    }
    CH.hp.current = clamp(CH.hp.current - dmg, 0, CH.hp.max);
  } else {
    CH.hp.current = clamp(CH.hp.current + d, 0, CH.hp.max);
  }
  const sign = d < 0 ? String(d) : ('+' + d);
  showToast('ПЗ ' + sign + ' → ' + CH.hp.current, d < 0 ? 'bad' : 'good');
  queueFlash('.hp-num', d < 0 ? 'bad' : 'good');
  save(); renderApp();
}
function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }
function refreshTopbarOnly(){
  const t = document.querySelector('.topbar .title');
  if(t) t.textContent = 'Персонаж';
}

/* =========================================================================
   MODAL HELPER
   ========================================================================= */
function openModal(title, bodyHtml, onMount){
  byId('modalBody').innerHTML = `<h3>${title}</h3>${bodyHtml}`;
  byId('modalOverlay').classList.add('open');
  if(onMount) onMount(byId('modalBody'));
}
function closeModal(){ byId('modalOverlay').classList.remove('open'); }
document.getElementById('modalOverlay').addEventListener('click', (e)=>{
  if(e.target.id === 'modalOverlay') closeModal();
});

/* Универсальный редактор тегов-дескрипторов (для предметов/заклинаний/черт).
   Создаёт и монтирует DOM-узел, живущий независимо от остального рендера формы,
   поэтому его можно свободно добавлять/удалять теги, не теряя значения других полей. */
function traitDisplay(trait){
  if(trait && typeof trait === 'object' && trait.type === 'library'){
    const libraryTrait = getLibraryTrait(trait.id);
    if(libraryTrait) return {name:libraryTrait.name, color:libraryTrait.color};
    return {name:trait.id, color:'default'};
  }
  return {name:typeof trait === 'string' ? trait : (trait && trait.name) || '', color:'default'};
}
function traitKey(trait){
  if(trait && typeof trait === 'object' && trait.type === 'library') return `library:${trait.id}`;
  return `custom:${traitDisplay(trait).name.trim().toLocaleLowerCase('ru')}`;
}
function traitChipHtml(trait, extraHtml=''){
  const view = traitDisplay(trait);
  return `<span class="tag-chip tone-${view.color}">${escapeHtml(view.name)}${extraHtml}</span>`;
}

function createTagEditor(initialTags){
  const wrap = document.createElement('div');
  wrap.className = 'tag-editor';
  const chipBox = document.createElement('div');
  chipBox.className = 'tag-chip-box';
  const inputRow = document.createElement('div');
  inputRow.className = 'tag-input-row';
  const input = document.createElement('input');
  input.type = 'text'; input.placeholder = 'Добавить дескриптор…';
  const addBtn = document.createElement('button');
  addBtn.type = 'button'; addBtn.className = 'btn btn-sm btn-accent'; addBtn.textContent = '+';
  inputRow.appendChild(input); inputRow.appendChild(addBtn);
  wrap.appendChild(chipBox); wrap.appendChild(inputRow);

  const suggestions = document.createElement('div');
  suggestions.className = 'tag-suggestions';
  wrap.appendChild(suggestions);

  let tags = (initialTags||[]).slice();
  function renderChips(){
    chipBox.innerHTML = '';
    if(tags.length === 0){
      const e = document.createElement('span');
      e.className = 'empty-hint'; e.style.padding = '2px 0'; e.textContent = 'Дескрипторов нет';
      chipBox.appendChild(e);
    }
    tags.forEach((t,i)=>{
      const chip = document.createElement('span');
      const view = traitDisplay(t);
      chip.className = `tag-chip tone-${view.color}`;
      chip.appendChild(document.createTextNode(view.name));
      const x = document.createElement('button');
      x.type = 'button'; x.textContent = '✕';
      x.addEventListener('click', ()=>{ tags.splice(i,1); renderChips(); });
      chip.appendChild(x);
      chipBox.appendChild(chip);
    });
  }
  function renderSuggestions(){
    const query = input.value.trim().toLocaleLowerCase('ru');
    const matches = query ? TRAIT_LIBRARY.filter(t => t.name.toLocaleLowerCase('ru').includes(query) || t.category.toLocaleLowerCase('ru').includes(query)).slice(0, 12) : [];
    suggestions.innerHTML = '';
    matches.forEach(trait=>{
      const option = document.createElement('button');
      option.type = 'button'; option.className = `tag-suggestion tone-${trait.color}`;
      option.innerHTML = `<span>${escapeHtml(trait.name)}</span><small>${escapeHtml(trait.category)}</small>`;
      option.addEventListener('click', ()=>addLibraryTag(trait));
      suggestions.appendChild(option);
    });
  }
  function hasTag(candidate){ return tags.some(tag=>traitKey(tag) === traitKey(candidate)); }
  function addLibraryTag(trait){
    const tag = {type:'library', id:trait.id};
    if(!hasTag(tag)) tags.push(tag);
    input.value=''; renderSuggestions(); renderChips(); input.focus();
  }
  function addTag(){
    const v = input.value.trim();
    if(!v) return;
    const library = matchLibraryTrait(v);
    const tag = library ? {type:'library', id:library.id} : {type:'custom', name:v};
    if(!hasTag(tag)) tags.push(tag);
    input.value=''; renderSuggestions(); renderChips(); input.focus();
  }
  addBtn.addEventListener('click', addTag);
  input.addEventListener('input', renderSuggestions);
  input.addEventListener('keydown', e=>{ if(e.key==='Enter'){ e.preventDefault(); addTag(); } });
  renderChips();

  return { el: wrap, getTags: ()=>tags.slice() };
}
function tagsMetaHtml(tags){
  if(!tags || !tags.length) return '';
  return `<div class="item-traits">${tags.map(t=>{ const view=traitDisplay(t); return `<span class="tg tone-${view.color}">${escapeHtml(view.name)}</span>`; }).join('')}</div>`;
}


/* toggling open/closed detail body of a list-item */
function wireListItemToggles(root){
  root.querySelectorAll('[data-item-toggle]').forEach(el=>{
    el.addEventListener('click', (e)=>{
      if(e.target.closest('input, select, textarea, .spent-badge, [data-prep-cast]')) return;
      e.stopPropagation();
      const item = el.closest('.list-item');
      if(!item) return;
      const body = item.querySelector('.list-item-body');
      if(!body) return;
      const open = !body.classList.contains('open');
      body.classList.toggle('open', open);
      const chev = item.querySelector('.chev-btn');
      if(chev) chev.classList.toggle('open', open);
    });
  });
}

/* =========================================================================
   TAB: ДЕЙСТВИЯ
   ========================================================================= */
function actionListItemHtml(a){
  return `
    <div class="list-item">
      <div class="list-item-head" data-item-toggle>
        <div>
          <div class="name">${escapeHtml(a.name)}</div>
          <div class="tag">${escapeHtml(a.type)}${a.fromFeat?' · из черты':''}</div>
          ${tagsMetaHtml(a.traits)}
        </div>
        <button class="fav-star ${a.favorite?'active':''}" data-fav-toggle="${a.id}" title="${a.favorite?'Убрать из избранного':'Добавить в избранное'}">${a.favorite?'★':'☆'}</button>
      </div>
      <div class="list-item-body">
        <div>${escapeHtml(a.desc)}</div>
        ${!isPlay() ? `
        <div class="list-item-actions">
          <button class="btn btn-sm" data-edit-action="${a.id}">Изменить</button>
          <button class="btn btn-sm btn-danger" data-del-action="${a.id}">Удалить</button>
        </div>` : ''}
      </div>
    </div>
  `;
}

function renderActionsTab(){
  const favorites = CH.actions.filter(a=>a.favorite);
  const favItems = favorites.map(actionListItemHtml).join('') || '<div class="empty-hint">Нажмите ☆ у любого действия, чтобы закрепить его здесь</div>';
  const allItems = CH.actions.map(actionListItemHtml).join('') || '<div class="empty-hint">Пока нет действий</div>';

  return `
    ${renderTopbar('Действия', `${CH.actions.length} записей`)}
    <div class="page active">
      ${!isPlay() ? `<button class="btn btn-accent btn-block" id="addActionBtn" style="margin-bottom:12px;">+ Добавить действие</button>` : ''}

      <div class="card">
        <h3 style="margin-bottom:8px;">★ Избранное</h3>
        ${favItems}
      </div>

      <div class="card">
        <div class="card-header" data-collapse-toggle="actionsAllCollapsed">
          <h3>Все действия</h3>
          <svg class="chev ${!CH.actionsAllCollapsed?'open':''}" width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none"><path d="M6 9l6 6 6-6"/></svg>
        </div>
        <div class="card-body ${CH.actionsAllCollapsed?'collapsed':''}">
          ${allItems}
        </div>
      </div>
    </div>
  `;
}

function actionFormHtml(a){
  a = a || {name:'', type:'Одно действие', traits:[], desc:''};
  return `
    <div class="field"><label class="field-label">Название</label><input type="text" id="mfName" value="${escapeAttr(a.name)}"></div>
    <div class="field"><label class="field-label">Стоимость действия</label>
      <select id="mfType">
        ${['Свободное действие','Реакция','Одно действие','Два действия','Три действия','От 1 до 3 действий','10 минут','Несколько раундов'].map(t=>`<option ${t===a.type?'selected':''}>${t}</option>`).join('')}
      </select>
    </div>
    <div class="field"><label class="field-label">Дескрипторы</label><div id="mfTagsContainer"></div></div>
    <div class="field"><label class="field-label">Описание</label><textarea id="mfDesc">${escapeHtml_(a.desc)}</textarea></div>
  `;
}
function escapeHtml_(s){ return String(s??''); }

function wireActionsTab(){
  const root = document.querySelector('.page.active');
  wireListItemToggles(root);
  wireCollapsibles(root);

  root.querySelectorAll('[data-fav-toggle]').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      e.stopPropagation();
      const a = CH.actions.find(x=>x.id===btn.dataset.favToggle);
      a.favorite = !a.favorite;
      save(); renderApp();
    });
  });

  const addActionBtn = byId('addActionBtn');
  if(addActionBtn) addActionBtn.addEventListener('click', ()=>{
    openModal('Новое действие', actionFormHtml() + `
      <div class="modal-actions">
        <button class="btn btn-block" id="mfCancel">Отмена</button>
        <button class="btn btn-accent btn-block" id="mfSave">Добавить</button>
      </div>
    `, (m)=>{
      const tagEditor = createTagEditor([]);
      byId('mfTagsContainer').appendChild(tagEditor.el);
      byId('mfCancel').addEventListener('click', closeModal);
      byId('mfSave').addEventListener('click', ()=>{
        CH.actions.push({id:uid(), name:byId('mfName').value||'Без названия', type:byId('mfType').value, traits:tagEditor.getTags(), desc:byId('mfDesc').value, fromFeat:false, favorite:false});
        save(); closeModal(); renderApp();
      });
    });
  });

  root.querySelectorAll('[data-edit-action]').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      e.stopPropagation();
      const a = CH.actions.find(x=>x.id===btn.dataset.editAction);
      openModal('Изменить действие', actionFormHtml(a) + `
        <div class="modal-actions">
          <button class="btn btn-block" id="mfCancel">Отмена</button>
          <button class="btn btn-accent btn-block" id="mfSave">Сохранить</button>
        </div>
      `, ()=>{
        const tagEditor = createTagEditor(a.traits||[]);
        byId('mfTagsContainer').appendChild(tagEditor.el);
        byId('mfCancel').addEventListener('click', closeModal);
        byId('mfSave').addEventListener('click', ()=>{
          a.name = byId('mfName').value||a.name; a.type = byId('mfType').value;
          a.traits = tagEditor.getTags(); a.desc = byId('mfDesc').value;
          save(); closeModal(); renderApp();
        });
      });
    });
  });
  root.querySelectorAll('[data-del-action]').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      e.stopPropagation();
      CH.actions = CH.actions.filter(x=>x.id!==btn.dataset.delAction);
      save(); renderApp();
    });
  });
}

/* =========================================================================
   TAB: СНАРЯЖЕНИЕ
   ========================================================================= */
const CURRENCY_DEFS = [
  {key:'cp', name:'Медные монеты'}, {key:'sp', name:'Серебряные монеты'},
  {key:'gp', name:'Золотые монеты'}, {key:'pp', name:'Платиновые монеты'},
];

function formatBulk(n){
  n = Number(n) || 0;
  if(Math.abs(n) < 0.0005) return '0';
  const rounded = Math.round(n * 1000) / 1000;
  return String(rounded);
}
function fallbackItemLocation(excludeBagId){
  const bags = CH.equipment.items.filter(item=>isBagItem(item) && item.id !== excludeBagId);
  const bag = bags.find(item=>item.location === 'worn') || bags[0];
  if(!bag) return 'worn';
  return bagCompartmentLocation(bag.id, bag.bag.compartments[0].id);
}
function locationLabel(loc){
  if(loc === 'worn') return 'Надето';
  if(loc === 'carried') return 'В сумке';
  const parsed = parseItemLocation(loc);
  if(parsed.type === 'bag'){
    const bag = CH.equipment.items.find(item=>item.id === parsed.bagId);
    if(!bag) return 'Сумка';
    const compartment = bag.bag.compartments.find(entry=>entry.id === parsed.compartmentId);
    if(compartment && compartment.name) return `${bag.name} · ${compartment.name}`;
    return bag.name;
  }
  const storage = CH.equipment.storages.find(entry=>entry.id === loc);
  return storage ? storage.name : 'Надето';
}
function locationOptions(current, opts={}){
  const options = [`<option value="worn" ${current==='worn'?'selected':''}>Надето</option>`];
  if(!opts.forBag){
    CH.equipment.items.filter(isBagItem).forEach(bag=>{
      bag.bag.compartments.forEach(compartment=>{
        const value = bagCompartmentLocation(bag.id, compartment.id);
        const label = compartment.name ? `${bag.name} · ${compartment.name}` : bag.name;
        options.push(`<option value="${escapeAttr(value)}" ${current===value?'selected':''}>${escapeHtml(label)}</option>`);
      });
    });
  }
  CH.equipment.storages.forEach(storage=>{
    options.push(`<option value="${escapeAttr(storage.id)}" ${current===storage.id?'selected':''}>${escapeHtml(storage.name)}</option>`);
  });
  return options.join('');
}
function getCurrencyQty(location, key){
  const item = CH.equipment.items.find(entry=>entry.isCurrency && entry.currencyKey === key && entry.location === location);
  return item ? Math.max(0, Number(item.qty) || 0) : 0;
}
function setCurrencyQty(location, key, qty){
  qty = Math.max(0, Math.floor(Number(qty) || 0));
  const existing = CH.equipment.items.find(entry=>entry.isCurrency && entry.currencyKey === key && entry.location === location);
  if(qty === 0){
    if(existing) CH.equipment.items = CH.equipment.items.filter(entry=>entry !== existing);
    return;
  }
  if(existing){
    existing.qty = qty;
    return;
  }
  const def = CURRENCY_DEFS.find(entry=>entry.key === key);
  CH.equipment.items.push({
    id: uid(), name: def.name, qty, bulk: 0, location, note: '',
    isCurrency: true, currencyKey: key, custom: false, traits: [],
  });
}
function currencyGridHtml(location){
  return `<div class="currency-grid">${CURRENCY_DEFS.map(def=>`
    <label class="currency-cell">${escapeHtml(def.name)}
      <input type="number" min="0" step="1" data-currency="${escapeAttr(location + '::' + def.key)}" value="${getCurrencyQty(location, def.key)}">
    </label>`).join('')}</div>`;
}
function fillBarHtml(used, cap){
  const over = used > cap;
  const pct = cap > 0 ? clamp((used / cap) * 100, 0, 100) : (used > 0 ? 100 : 0);
  return `
    <div class="weight-summary"><span>${formatBulk(used)} / ${formatBulk(cap)}</span>${over ? '<span class="comp-over">Переполнена</span>' : ''}</div>
    <div class="weight-bar"><div class="weight-bar-fill ${over ? 'over' : ''}" style="width:${pct}%"></div></div>
  `;
}
function itemStatsHtml(item){
  if(item.weapon){
    const w = item.weapon;
    const parts = [w.damage, w.damageType, w.group, w.hands ? `${w.hands} рук.` : '', w.range, w.reload !== '' && w.reload != null ? `перезарядка ${w.reload}` : '', w.ammo].filter(part=>part);
    if(parts.length) return `<div class="item-stat-line">${escapeHtml(parts.join(' · '))}</div>`;
  }
  if(item.armor){
    const a = item.armor;
    const parts = [
      a.ac ? `КБ ${a.ac}` : '',
      a.dexCap ? `макс. Ловк. ${a.dexCap}` : '',
      a.armorCategory, a.group,
      a.speedPenalty ? `скорость ${a.speedPenalty}` : '',
      a.strength ? `сила ${a.strength}` : '',
    ].filter(Boolean);
    if(parts.length) return `<div class="item-stat-line">${escapeHtml(parts.join(' · '))}</div>`;
  }
  if(item.consumable){
    const c = item.consumable;
    const parts = [c.usage, c.activation].filter(Boolean);
    if(parts.length) return `<div class="item-stat-line">${escapeHtml(parts.join(' · '))}</div>`;
  }
  return '';
}
function runesHtml(item){
  if(!item.runes || !item.runes.length) return '';
  return `<div class="rune-list">${item.runes.map(rune=>`<span class="rune-chip">${escapeHtml(rune.name || 'Руна')}</span>`).join('')}</div>`;
}
function itemDescriptionHtml(item){
  const blocks = [];
  if(item.desc) blocks.push(`<div>${escapeHtml(item.desc)}</div>`);
  (item.runes || []).forEach(rune=>{
    const name = escapeHtml(rune.name || 'Руна');
    const desc = rune.desc ? `<div>${escapeHtml(rune.desc)}</div>` : '';
    blocks.push(`<div class="rune-desc-block"><div class="rune-desc-name">${name}</div>${desc}</div>`);
  });
  return blocks.length ? blocks.join('') : 'Нет описания';
}
function regularItemsAt(location){
  return CH.equipment.items.filter(item=>!item.isCurrency && !isBagItem(item) && item.location === location);
}
function bagsAt(location){
  return CH.equipment.items.filter(item=>isBagItem(item) && item.location === location);
}
function itemRowHtml(item){
  const play = isPlay();
  return `
    <div class="list-item" data-item-id="${item.id}" data-reorder-id="${item.id}" data-reorder-group="${escapeAttr(item.location)}">
      <div class="list-item-head ${play ? 'eq-play-head' : ''}" data-item-toggle>
        <div class="nm">
          <div class="n">${escapeHtml(item.name)}</div>
          <div class="meta">${escapeHtml(ITEM_CATEGORY_LABELS[item.category] || '')} · объём ${formatBulk(item.bulk)}${item.note ? ' · ' + escapeHtml(item.note) : ''}</div>
          ${itemStatsHtml(item)}
          ${tagsMetaHtml(item.traits)}
          ${runesHtml(item)}
        </div>
        ${play ? `<div class="play-qty"><input type="number" min="0" data-qty="${item.id}" value="${item.qty}"></div>` : ''}
      </div>
      ${play ? '' : `
      <div class="eq-item-controls">
        <span class="drag-handle" data-equipment-drag-handle aria-label="Перетащить предмет" title="Перетащить предмет">⠿</span>
        <div class="qty"><input type="number" min="0" data-qty="${item.id}" value="${item.qty}"></div>
        <select class="locsel" data-loc="${item.id}">${locationOptions(item.location)}</select>
        <button class="skill-del" data-item-edit="${item.id}" title="Изменить">✎</button>
        ${item.custom !== false ? `<button class="skill-del" data-item-del="${item.id}" title="Удалить">✕</button>` : '<span style="width:18px;display:inline-block"></span>'}
      </div>`}
      <div class="list-item-body">${itemDescriptionHtml(item)}</div>
    </div>`;
}
function bagCardHtml(bag){
  const play = isPlay();
  const used = bag.bag.compartments.reduce((sum, compartment)=>sum + compartmentContentsBulk(CH.equipment.items, bag, compartment), 0);
  const cap = bag.bag.compartments.reduce((sum, compartment)=>sum + (Number(compartment.capacity)||0), 0);
  const effective = bagEffectiveBulk(CH.equipment.items, bag);
  const insideCount = bag.bag.compartments.reduce((sum, compartment)=>{
    const location = bagCompartmentLocation(bag.id, compartment.id);
    return sum + regularItemsAt(location).length + CURRENCY_DEFS.filter(def => getCurrencyQty(location, def.key) > 0).length;
  }, 0);
  const weightNote = bag.bag.weightMode === 'fixed'
    ? `фиксированный вес ${formatBulk(bag.bulk)}`
    : `вес ${formatBulk(effective)}${bag.bag.ignoreBulk ? ` (первые ${formatBulk(bag.bag.ignoreBulk)} не считаются)` : ''}`;
  const playMeta = `внутри ${insideCount} · объём ${formatBulk(used)}/${formatBulk(cap)}`;
  const compartments = bag.bag.compartments.map(compartment=>{
    const location = bagCompartmentLocation(bag.id, compartment.id);
    const contents = regularItemsAt(location);
    const title = compartment.name || (bag.bag.compartments.length > 1 ? 'Отсек' : 'Содержимое');
    return `
      <div class="compartment-block">
        <div class="compartment-title">${escapeHtml(title)}</div>
        ${play ? '' : fillBarHtml(compartmentContentsBulk(CH.equipment.items, bag, compartment), compartment.capacity)}
        ${currencyGridHtml(location)}
        ${contents.map(itemRowHtml).join('') || '<div class="empty-hint" style="padding:8px 0;">Пусто</div>'}
        ${play ? '' : `<button class="btn btn-sm btn-block location-add" data-add-item-loc="${escapeAttr(location)}">+ Предмет в этот отсек</button>`}
      </div>`;
  }).join('');
  return `
    <div class="bag-card" data-bag-id="${bag.id}">
      <div class="bag-card-head" data-bag-toggle>
        <div>
          <div class="n">${escapeHtml(bag.name)}</div>
          <div class="meta">${play ? playMeta : `${weightNote} · внутри ${formatBulk(used)}`}</div>
          ${tagsMetaHtml(bag.traits)}
        </div>
        ${play ? '' : `
        <div class="bag-card-actions">
          <select class="locsel" data-loc="${bag.id}">${locationOptions(bag.location, {forBag:true})}</select>
          <button class="skill-del" data-item-edit="${bag.id}" title="Изменить">✎</button>
          <button class="skill-del" data-item-del="${bag.id}" title="Удалить">✕</button>
        </div>`}
      </div>
      ${play ? `
      <div class="bag-play-body">
        <div class="bag-desc open">${bag.desc ? escapeHtml(bag.desc) : 'Нет описания'}${bag.note ? `<div class="item-stat-line">${escapeHtml(bag.note)}</div>` : ''}</div>
        ${compartments}
      </div>` : `
      <div class="bag-desc">${bag.desc ? escapeHtml(bag.desc) : 'Нет описания'}${bag.note ? `<div class="item-stat-line">${escapeHtml(bag.note)}</div>` : ''}</div>
      ${compartments}`}
    </div>`;
}

function renderEquipmentTab(){
  const items = CH.equipment.items;
  const carriedTotalBulk = wornCarriedBulk(items);
  const strMod = CH.abilities.str.mod;
  const encumbered = 5 + strMod;
  const maxBulk = 10 + strMod;
  const bulkPct = maxBulk > 0 ? clamp((carriedTotalBulk / maxBulk) * 100, 0, 100) : (carriedTotalBulk > 0 ? 100 : 0);
  const over = carriedTotalBulk > maxBulk;

  const wornBags = bagsAt('worn').map(bagCardHtml).join('');
  const wornItems = regularItemsAt('worn').map(itemRowHtml).join('') || (!bagsAt('worn').length ? '<div class="empty-hint">Ничего не надето</div>' : '');

  const storagesHtml = isPlay() ? '' : CH.equipment.storages.map(storage=>{
    const bags = bagsAt(storage.id).map(bagCardHtml).join('');
    const list = regularItemsAt(storage.id).map(itemRowHtml).join('');
    return `
    <div class="card" data-storage-id="${storage.id}">
      <div class="card-header" style="cursor:default;">
        <h3>${escapeHtml(storage.name)}</h3>
        <button class="btn btn-sm btn-danger" data-storage-del="${storage.id}">Удалить</button>
      </div>
      <div class="card-body" style="display:block;">
        <div class="empty-hint" style="padding:0 0 8px;text-align:left;">Не даёт веса персонажу</div>
        ${currencyGridHtml(storage.id)}
        ${bags}
        ${list || (!bags ? '<div class="empty-hint">Пусто</div>' : '')}
        <button class="btn btn-sm btn-block location-add" data-add-item-loc="${escapeAttr(storage.id)}">+ Предмет сюда</button>
      </div>
    </div>`;
  }).join('');

  const encLabel = over ? 'перегруз' : (carriedTotalBulk >= encumbered ? 'утомление' : '');
  return `
    ${renderTopbar('Снаряжение', `Носимый объём: ${formatBulk(carriedTotalBulk)} / ${maxBulk}`)}
    <div class="page active">
      <div class="card">
        ${isPlay() ? `
        <div class="weight-line"><span>Носимый объём</span><span class="${over?'over':''}">${formatBulk(carriedTotalBulk)} / ${maxBulk}${encLabel ? ' · ' + encLabel : ''}</span></div>` : `
        <div class="weight-summary"><span>Носимый объём</span><span>${formatBulk(carriedTotalBulk)} / ${maxBulk} (утомление с ${encumbered})</span></div>
        <div class="weight-bar"><div class="weight-bar-fill ${over ? 'over' : ''}" style="width:${bulkPct}%"></div></div>`}
      </div>

      <div class="card">
        <h3 style="margin-bottom:8px;">Надето</h3>
        ${currencyGridHtml('worn')}
        ${wornBags}
        ${wornItems}
      </div>

      ${storagesHtml}

      ${isPlay() ? '' : `
      <div class="eq-toolbar">
        <div class="row">
          <button class="btn btn-accent btn-block" id="addItemBtn">+ Предмет</button>
          <button class="btn btn-accent btn-block" id="addBagBtn">+ Сумка</button>
        </div>
        <button class="btn btn-block" id="addStorageBtn">+ Хранилище</button>
      </div>`}
    </div>
  `;
}

function weaponFieldsHtml(weapon){
  const w = weapon || {damage:'', damageType:'', group:'', hands:'', range:'', reload:'', ammo:''};
  return `
    <div class="form-section" data-cat-section="weapon">
      <h4>Оружие</h4>
      <div class="row2">
        <div class="field"><label class="field-label">Урон</label><input type="text" id="mfWDamage" value="${escapeAttr(w.damage)}"></div>
        <div class="field"><label class="field-label">Тип урона</label><input type="text" id="mfWDamageType" value="${escapeAttr(w.damageType)}"></div>
      </div>
      <div class="row2">
        <div class="field"><label class="field-label">Группа</label><input type="text" id="mfWGroup" value="${escapeAttr(w.group)}"></div>
        <div class="field"><label class="field-label">Руки</label><input type="text" id="mfWHands" value="${escapeAttr(w.hands)}"></div>
      </div>
      <div class="row2">
        <div class="field"><label class="field-label">Дистанция</label><input type="text" id="mfWRange" value="${escapeAttr(w.range)}"></div>
        <div class="field"><label class="field-label">Перезарядка</label><input type="text" id="mfWReload" value="${escapeAttr(w.reload)}"></div>
      </div>
      <div class="field"><label class="field-label">Боеприпасы</label><input type="text" id="mfWAmmo" value="${escapeAttr(w.ammo)}"></div>
    </div>`;
}
function armorFieldsHtml(armor){
  const a = armor || {ac:'', dexCap:'', group:'', armorCategory:'', speedPenalty:'', strength:''};
  return `
    <div class="form-section" data-cat-section="armor">
      <h4>Броня</h4>
      <div class="row2">
        <div class="field"><label class="field-label">КБ</label><input type="text" id="mfAAc" value="${escapeAttr(a.ac)}"></div>
        <div class="field"><label class="field-label">Макс. Ловк.</label><input type="text" id="mfADexCap" value="${escapeAttr(a.dexCap)}"></div>
      </div>
      <div class="row2">
        <div class="field"><label class="field-label">Группа</label><input type="text" id="mfAGroup" value="${escapeAttr(a.group)}"></div>
        <div class="field"><label class="field-label">Категория</label><input type="text" id="mfACat" value="${escapeAttr(a.armorCategory)}"></div>
      </div>
      <div class="row2">
        <div class="field"><label class="field-label">Штраф скорости</label><input type="text" id="mfASpeed" value="${escapeAttr(a.speedPenalty)}"></div>
        <div class="field"><label class="field-label">Сила</label><input type="text" id="mfAStr" value="${escapeAttr(a.strength)}"></div>
      </div>
    </div>`;
}
function consumableFieldsHtml(consumable){
  const c = consumable || {usage:'', activation:''};
  return `
    <div class="form-section" data-cat-section="consumable">
      <h4>Расходник</h4>
      <div class="row2">
        <div class="field"><label class="field-label">Использование</label><input type="text" id="mfCUsage" value="${escapeAttr(c.usage)}"></div>
        <div class="field"><label class="field-label">Активация</label><input type="text" id="mfCAct" value="${escapeAttr(c.activation)}"></div>
      </div>
    </div>`;
}
function compartmentRowHtml(compartment){
  return `
    <div class="compartment-editor-row" data-comp-id="${escapeAttr(compartment.id)}">
      <input type="text" data-comp-name placeholder="Название отсека" value="${escapeAttr(compartment.name || '')}">
      <input type="number" data-comp-cap step="0.1" min="0" placeholder="Вмест." value="${compartment.capacity}">
      <button type="button" class="skill-del" data-comp-del title="Удалить отсек">✕</button>
    </div>`;
}
function bagFieldsHtml(bag){
  const data = bag || normalizeBagData({weightMode:'contents', ignoreBulk:0, capacity:4, cell:1}, uid);
  return `
    <div class="form-section" data-cat-section="bag">
      <h4>Сумка</h4>
      <div class="row2">
        <div class="field"><label class="field-label">Формула веса</label>
          <select id="mfBagMode">
            <option value="contents" ${data.weightMode==='contents'?'selected':''}>Содержимое минус игнор</option>
            <option value="fixed" ${data.weightMode==='fixed'?'selected':''}>Фиксированный вес</option>
          </select>
        </div>
        <div class="field" id="mfIgnoreWrap"><label class="field-label">Не учитывать объём</label>
          <input type="number" id="mfBagIgnore" step="0.1" min="0" value="${data.ignoreBulk}">
        </div>
      </div>
      <div class="field-label" style="margin-bottom:6px;">Отсеки</div>
      <div id="mfCompList">${data.compartments.map(compartmentRowHtml).join('')}</div>
      <button type="button" class="btn btn-sm" id="mfAddComp">+ Отсек</button>
    </div>`;
}
function itemFormHtml(item, opts={}){
  item = item || emptyCustomItem(opts.bagOnly ? 'bag' : 'other', uid);
  const cat = normalizeCategory(item.category);
  const catOpts = Object.entries(ITEM_CATEGORY_LABELS).map(([id, label])=>
    `<option value="${id}" ${cat===id?'selected':''}>${label}</option>`
  ).join('');
  return `
    <div class="field">
      <label class="field-label">Название</label>
      <input type="text" id="mfName" data-library-id="${escapeAttr(item.libraryId || '')}" value="${escapeAttr(item.name)}" autocomplete="off">
      ${opts.isNew ? '<div id="mfItemSuggestions" class="tag-suggestions"></div><div class="hint-line">Начните вводить название — появятся предметы из библиотеки</div>' : ''}
    </div>
    <div class="row2">
      <div class="field"><label class="field-label">Количество</label><input type="number" id="mfQty" min="0" value="${item.qty == null ? 1 : item.qty}"></div>
      <div class="field"><label class="field-label">Объём за штуку</label><input type="number" id="mfBulk" step="0.1" value="${item.bulk || 0}"></div>
    </div>
    <div class="row2">
      <div class="field"><label class="field-label">Категория</label>
        <select id="mfCategory" ${opts.lockCategory ? 'disabled' : ''}>${catOpts}</select>
      </div>
      <div class="field"><label class="field-label">Где находится</label>
        <select id="mfLoc">${locationOptions(item.location || (opts.lockCategory ? 'worn' : fallbackItemLocation()), {forBag: cat === 'bag' || opts.lockCategory})}</select>
      </div>
    </div>
    <div class="field"><label class="field-label">Заметка</label><input type="text" id="mfNote" value="${escapeAttr(item.note)}"></div>
    <div class="field"><label class="field-label">Описание</label><textarea id="mfDesc">${escapeHtml_(item.desc)}</textarea></div>
    <div class="field"><label class="field-label">Дескрипторы</label><div id="mfTagsContainer"></div></div>
    ${weaponFieldsHtml(item.weapon)}
    ${armorFieldsHtml(item.armor)}
    ${consumableFieldsHtml(item.consumable)}
    ${bagFieldsHtml(item.bag)}
    <div class="form-section" data-cat-section="weapon,armor,shield">
      <h4>Руны</h4>
      <div id="mfRunesContainer"></div>
    </div>
  `;
}
function syncCategorySections(){
  const cat = byId('mfCategory').value;
  document.querySelectorAll('[data-cat-section]').forEach(el=>{
    const need = el.dataset.catSection.split(',');
    el.style.display = need.includes(cat) ? '' : 'none';
  });
  const loc = byId('mfLoc');
  if(loc){
    const current = loc.value;
    loc.innerHTML = locationOptions(current, {forBag: cat === 'bag'});
    if(cat === 'bag' && parseItemLocation(current).type === 'bag') loc.value = 'worn';
  }
  const ignoreWrap = byId('mfIgnoreWrap');
  const mode = byId('mfBagMode');
  if(ignoreWrap && mode) ignoreWrap.style.display = mode.value === 'contents' ? '' : 'none';
}
function readCompartmentsFromForm(){
  return [...document.querySelectorAll('#mfCompList .compartment-editor-row')].map(row=>({
    id: row.dataset.compId || uid(),
    name: row.querySelector('[data-comp-name]').value.trim(),
    capacity: Number(row.querySelector('[data-comp-cap]').value) || 0,
  }));
}
function wireBagCompartmentEditor(){
  const list = byId('mfCompList');
  const addBtn = byId('mfAddComp');
  if(!list || !addBtn) return;
  function refreshDeleteState(){
    const rows = list.querySelectorAll('.compartment-editor-row');
    rows.forEach(row=>{
      const btn = row.querySelector('[data-comp-del]');
      if(btn) btn.disabled = rows.length <= 1;
    });
  }
  list.addEventListener('click', e=>{
    const btn = e.target.closest('[data-comp-del]');
    if(!btn || btn.disabled) return;
    const rows = list.querySelectorAll('.compartment-editor-row');
    if(rows.length <= 1) return;
    btn.closest('.compartment-editor-row').remove();
    refreshDeleteState();
  });
  addBtn.addEventListener('click', ()=>{
    list.insertAdjacentHTML('beforeend', compartmentRowHtml({id: uid(), name: '', capacity: 4}));
    refreshDeleteState();
  });
  refreshDeleteState();
  const mode = byId('mfBagMode');
  if(mode) mode.addEventListener('change', syncCategorySections);
}
function createRunesEditor(initialRunes, opts={}){
  const wrap = document.createElement('div');
  let runes = (initialRunes || []).map(rune=>({
    id: rune.id || uid(),
    libraryId: rune.libraryId || null,
    name: rune.name || '',
    desc: rune.desc || '',
    traits: (rune.traits || []).slice(),
    tagEditor: null,
  }));
  function snapshot(){
    runes.forEach(rune=>{
      if(rune.tagEditor) rune.traits = rune.tagEditor.getTags();
    });
  }
  function currentSlot(){
    return opts.getSlot ? opts.getSlot() : '';
  }
  function render(){
    snapshot();
    wrap.innerHTML = '';
    runes.forEach((rune, index)=>{
      const card = document.createElement('div');
      card.className = 'rune-form-card';
      card.innerHTML = `
        <div class="field"><label class="field-label">Название руны</label>
          <input type="text" data-rune-name value="${escapeAttr(rune.name)}" autocomplete="off">
          <div data-rune-suggestions class="tag-suggestions"></div>
          <div class="hint-line">Начните вводить название — появятся руны из библиотеки</div>
        </div>
        <div class="field"><label class="field-label">Дескрипторы</label><div data-rune-tags></div></div>
        <div class="field"><label class="field-label">Описание</label><textarea data-rune-desc>${escapeHtml_(rune.desc)}</textarea></div>
        <button type="button" class="btn btn-sm btn-danger" data-rune-del>Снять руну</button>
      `;
      rune.tagEditor = createTagEditor(rune.traits);
      card.querySelector('[data-rune-tags]').appendChild(rune.tagEditor.el);
      const nameInput = card.querySelector('[data-rune-name]');
      const box = card.querySelector('[data-rune-suggestions]');
      function renderSuggestions(){
        const hits = searchLibraryRunes(nameInput.value, {slot: currentSlot()});
        box.innerHTML = '';
        hits.forEach(entry=>{
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'tag-suggestion';
          btn.innerHTML = `<span>${escapeHtml(entry.name)}</span>`;
          btn.addEventListener('click', ()=>{
            snapshot();
            const next = instantiateLibraryRune(entry, uid);
            next.id = rune.id;
            runes[index] = Object.assign(next, {tagEditor: null});
            render();
          });
          box.appendChild(btn);
        });
      }
      nameInput.addEventListener('input', e=>{
        rune.name = e.target.value;
        rune.libraryId = rune.libraryId || null;
        renderSuggestions();
      });
      card.querySelector('[data-rune-desc]').addEventListener('input', e=>{ rune.desc = e.target.value; });
      card.querySelector('[data-rune-del]').addEventListener('click', ()=>{
        snapshot();
        runes.splice(index, 1);
        render();
      });
      wrap.appendChild(card);
      renderSuggestions();
    });
    const add = document.createElement('button');
    add.type = 'button';
    add.className = 'btn btn-sm';
    add.textContent = '+ Добавить руну';
    add.addEventListener('click', ()=>{
      snapshot();
      runes.push({id: uid(), libraryId: null, name: '', desc: '', traits: [], tagEditor: null});
      render();
    });
    wrap.appendChild(add);
  }
  render();
  return {
    el: wrap,
    refresh: render,
    getRunes: ()=>{
      snapshot();
      return runes.map(rune=>({
        id: rune.id,
        libraryId: rune.libraryId,
        name: rune.name.trim() || 'Руна',
        desc: rune.desc || '',
        traits: rune.tagEditor ? rune.tagEditor.getTags() : rune.traits,
      }));
    },
  };
}
function applyItemForm(target){
  const category = normalizeCategory(byId('mfCategory').value);
  const wasBag = isBagItem(target);
  const oldCompartments = wasBag ? target.bag.compartments.slice() : [];
  target.name = byId('mfName').value.trim() || 'Без названия';
  const picked = byId('mfName').dataset.libraryId;
  if(picked) target.libraryId = picked;
  target.qty = Math.max(0, Number(byId('mfQty').value) || 0);
  target.bulk = Number(byId('mfBulk').value) || 0;
  target.category = category;
  let location = byId('mfLoc').value;
  if(category === 'bag' && parseItemLocation(location).type === 'bag') location = 'worn';
  target.location = location;
  target.note = byId('mfNote').value;
  target.desc = byId('mfDesc').value;
  target.custom = true;
  target.isCurrency = false;
  if(category === 'weapon'){
    target.weapon = {
      damage: byId('mfWDamage').value, damageType: byId('mfWDamageType').value,
      group: byId('mfWGroup').value, hands: byId('mfWHands').value,
      range: byId('mfWRange').value, reload: byId('mfWReload').value, ammo: byId('mfWAmmo').value,
    };
  } else target.weapon = null;
  if(category === 'armor'){
    target.armor = {
      ac: byId('mfAAc').value, dexCap: byId('mfADexCap').value, group: byId('mfAGroup').value,
      armorCategory: byId('mfACat').value, speedPenalty: byId('mfASpeed').value, strength: byId('mfAStr').value,
    };
  } else target.armor = null;
  if(category === 'consumable'){
    target.consumable = {usage: byId('mfCUsage').value, activation: byId('mfCAct').value};
  } else target.consumable = null;
  if(category === 'bag'){
    const compartments = readCompartmentsFromForm();
    target.bag = {
      weightMode: byId('mfBagMode').value === 'fixed' ? 'fixed' : 'contents',
      ignoreBulk: byId('mfBagMode').value === 'fixed' ? 0 : (Number(byId('mfBagIgnore').value) || 0),
      compartments: compartments.length ? compartments : [{id: uid(), name: '', capacity: 4}],
    };
    if(wasBag){
      const keep = new Set(target.bag.compartments.map(entry=>entry.id));
      const dest = bagCompartmentLocation(target.id, target.bag.compartments[0].id);
      CH.equipment.items.forEach(item=>{
        if(!String(item.location).startsWith(`bag:${target.id}:`)) return;
        const compartmentId = String(item.location).split(':')[2];
        if(!keep.has(compartmentId)) item.location = dest;
      });
    }
  } else {
    if(wasBag){
      const dest = fallbackItemLocation(target.id);
      CH.equipment.items.forEach(item=>{
        if(String(item.location).startsWith(`bag:${target.id}:`)) item.location = dest;
      });
    }
    target.bag = null;
  }
  if(!canHoldRunes(target)) target.runes = [];
  return target;
}
function openItemEditor(opts){
  const item = opts.item;
  const isNew = !!opts.isNew;
  openModal(opts.title, itemFormHtml(item, opts) + `
    <div class="modal-actions">
      <button class="btn btn-block" id="mfCancel">Отмена</button>
      <button class="btn btn-accent btn-block" id="mfSave">${opts.saveLabel}</button>
    </div>
  `, ()=>{
    const tagEditor = createTagEditor(item.traits || []);
    byId('mfTagsContainer').appendChild(tagEditor.el);
    const runesEditor = createRunesEditor(item.runes || [], {
      getSlot: () => normalizeCategory(byId('mfCategory').value),
    });
    byId('mfRunesContainer').appendChild(runesEditor.el);
    wireBagCompartmentEditor();
    byId('mfCategory').addEventListener('change', ()=>{
      syncCategorySections();
      runesEditor.refresh();
    });
    syncCategorySections();
    if(isNew){
      const box = byId('mfItemSuggestions');
      const input = byId('mfName');
      function renderSuggestions(){
        const hits = searchLibraryItems(input.value, opts.searchOpts || {});
        box.innerHTML = '';
        hits.forEach(entry=>{
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'tag-suggestion';
          const label = ITEM_CATEGORY_LABELS[normalizeCategory(entry.category)] || '';
          btn.innerHTML = `<span>${escapeHtml(entry.name)}</span><small>${escapeHtml(label)}</small>`;
          btn.addEventListener('click', ()=>{
            const next = instantiateLibraryItem(entry, uid);
            next.id = item.id;
            next.qty = Math.max(1, Number(byId('mfQty').value) || 1);
            next.location = byId('mfLoc').value || item.location;
            if(next.category === 'bag' && parseItemLocation(next.location).type === 'bag') next.location = 'worn';
            closeModal();
            openItemEditor(Object.assign({}, opts, {item: next}));
          });
          box.appendChild(btn);
        });
      }
      input.addEventListener('input', renderSuggestions);
      renderSuggestions();
    }
    byId('mfCancel').addEventListener('click', closeModal);
    byId('mfSave').addEventListener('click', ()=>{
      applyItemForm(item);
      item.traits = tagEditor.getTags();
      item.runes = canHoldRunes(item) ? runesEditor.getRunes() : [];
      if(isNew && !CH.equipment.items.some(entry=>entry.id === item.id)){
        CH.equipment.items.push(item);
      }
      save();
      closeModal();
      renderApp();
    });
  });
}
function deleteEquipmentItem(id){
  const item = CH.equipment.items.find(entry=>entry.id === id);
  if(!item) return;
  if(isBagItem(item)){
    const dest = fallbackItemLocation(item.id);
    CH.equipment.items.forEach(entry=>{
      if(String(entry.location).startsWith(`bag:${item.id}:`)) entry.location = dest;
    });
  }
  CH.equipment.items = CH.equipment.items.filter(entry=>entry.id !== id);
}

function wireEquipmentTab(){
  const root = document.querySelector('.page.active');
  wireListItemToggles(root);
  root.querySelectorAll('[data-bag-toggle]').forEach(head=>{
    head.addEventListener('click', e=>{
      if(e.target.closest('button, select, input')) return;
      const card = head.parentElement;
      if(isPlay()){
        card.classList.toggle('open');
        return;
      }
      const desc = card.querySelector('.bag-desc');
      if(desc) desc.classList.toggle('open');
    });
  });
  root.querySelectorAll('[data-currency]').forEach(inp=>{
    inp.addEventListener('input', ()=>{
      const raw = inp.dataset.currency;
      const split = raw.lastIndexOf('::');
      setCurrencyQty(raw.slice(0, split), raw.slice(split + 2), inp.value);
      save();
      renderApp();
    });
  });
  root.querySelectorAll('[data-qty]').forEach(inp=>{
    inp.addEventListener('input', ()=>{
      const item = CH.equipment.items.find(entry=>entry.id === inp.dataset.qty);
      if(!item) return;
      item.qty = Math.max(0, Number(inp.value) || 0);
      save();
      renderApp();
    });
  });
  root.querySelectorAll('[data-loc]').forEach(sel=>{
    sel.addEventListener('change', ()=>{
      const item = CH.equipment.items.find(entry=>entry.id === sel.dataset.loc);
      if(!item) return;
      let location = sel.value;
      if(isBagItem(item) && parseItemLocation(location).type === 'bag') location = 'worn';
      item.location = location;
      save();
      renderApp();
    });
  });
  root.querySelectorAll('[data-item-del]').forEach(btn=>{
    btn.addEventListener('click', e=>{
      e.stopPropagation();
      deleteEquipmentItem(btn.dataset.itemDel);
      save();
      renderApp();
    });
  });
  enableTouchReorder({
    root, itemSelector: '.list-item[data-item-id]', handleSelector: '[data-equipment-drag-handle]',
    groupForItem: item => item.dataset.reorderGroup,
    onReorder: (location, ids) => {
      const ordered = ids.map(id => CH.equipment.items.find(item => item.id === id));
      let position = 0;
      CH.equipment.items = CH.equipment.items.map(item =>
        item.location === location && !item.isCurrency && !isBagItem(item) ? ordered[position++] : item
      );
      save();
      renderApp();
    },
  });
  root.querySelectorAll('[data-item-edit]').forEach(btn=>{
    btn.addEventListener('click', e=>{
      e.stopPropagation();
      const item = CH.equipment.items.find(entry=>entry.id === btn.dataset.itemEdit);
      if(!item) return;
      openItemEditor({title: 'Изменить предмет', item, saveLabel: 'Сохранить', isNew: false, lockCategory: false});
    });
  });
  root.querySelectorAll('[data-storage-del]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const sid = btn.dataset.storageDel;
      const dest = fallbackItemLocation();
      CH.equipment.storages = CH.equipment.storages.filter(entry=>entry.id !== sid);
      CH.equipment.items.forEach(item=>{
        if(item.location === sid) item.location = isBagItem(item) ? 'worn' : dest;
      });
      save();
      renderApp();
    });
  });
  function startNewItem(location, bagOnly){
    const item = emptyCustomItem(bagOnly ? 'bag' : 'other', uid);
    item.location = location || (bagOnly ? 'worn' : fallbackItemLocation());
    if(bagOnly && parseItemLocation(item.location).type === 'bag') item.location = 'worn';
    openItemEditor({
      title: bagOnly ? 'Новая сумка' : 'Новый предмет',
      item,
      saveLabel: 'Добавить',
      isNew: true,
      lockCategory: bagOnly,
      bagOnly,
      searchOpts: bagOnly ? {category: 'bag'} : {excludeCategory: 'bag'},
    });
  }
  root.querySelectorAll('[data-add-item-loc]').forEach(btn=>{
    btn.addEventListener('click', ()=>startNewItem(btn.dataset.addItemLoc, false));
  });
  onEl(byId('addItemBtn'), 'click', ()=>startNewItem(fallbackItemLocation(), false));
  onEl(byId('addBagBtn'), 'click', ()=>startNewItem('worn', true));
  onEl(byId('addStorageBtn'), 'click', ()=>{
    openModal('Новое хранилище', `
      <div class="field"><label class="field-label">Название (дом, банк…)</label><input type="text" id="mfStorageName"></div>
      <div class="modal-actions">
        <button class="btn btn-block" id="mfCancel">Отмена</button>
        <button class="btn btn-accent btn-block" id="mfSave">Создать</button>
      </div>
    `, ()=>{
      byId('mfCancel').addEventListener('click', closeModal);
      byId('mfSave').addEventListener('click', ()=>{
        const name = byId('mfStorageName').value.trim();
        if(!name) return;
        CH.equipment.storages.push({id: uid(), name});
        save();
        closeModal();
        renderApp();
      });
    });
  });
}

/* =========================================================================
   TAB: ЗАКЛИНАНИЯ
   ========================================================================= */
const SPELL_LEVELS = [0,1,2,3,4,5,6,7,8,9,10];
const ABILITY_OPTIONS = ABILITY_DEFS.map(d=>`<option value="${d.id}">${d.name}</option>`).join('');

function syncPreparedSlots(){
  const sc = CH.spellcasting;
  SPELL_LEVELS.forEach(lvl=>{
    const max = Number(sc.slotsMax[lvl]||0);
    if(!sc.prepared[lvl]) sc.prepared[lvl] = [];
    const arr = sc.prepared[lvl];
    while(arr.length < max) arr.push({spellId:null, expended:false});
    while(arr.length > max) arr.pop();
    if(lvl === 0){
      arr.forEach(slot => { if(slot) slot.expended = false; });
    } else if(sc.type === 'prepared'){
      sc.slotsUsed[lvl] = arr.filter(slot => slot && slot.spellId && slot.expended).length;
    }
  });
}
function preparedSlotsAt(lvl){
  return (CH.spellcasting.prepared[lvl] || []);
}
function spendPreparedRank(lvl){
  const slot = preparedSlotsAt(lvl).find(s => s && s.spellId && !s.expended);
  if(!slot) return false;
  slot.expended = true;
  syncPreparedSlots();
  return true;
}
function restorePreparedRank(lvl){
  const slots = preparedSlotsAt(lvl);
  for(let i = slots.length - 1; i >= 0; i--){
    const slot = slots[i];
    if(slot && slot.spellId && slot.expended){
      slot.expended = false;
      syncPreparedSlots();
      return true;
    }
  }
  return false;
}
function togglePreparedSlot(lvl, idx){
  lvl = Number(lvl);
  if(lvl === 0) return false;
  const slot = preparedSlotsAt(lvl)[Number(idx)];
  if(!slot || !slot.spellId) return false;
  slot.expended = !slot.expended;
  syncPreparedSlots();
  return slot.expended;
}

function preparedCardHtml(lvl, idx, slot){
  if(!slot || !slot.spellId) return '';
  const sp = CH.books.spellbook.find(s=>s.id===slot.spellId);
  if(!sp) return '';
  const canSpend = Number(lvl) >= 1;
  const spent = canSpend && slot.expended;
  return `
    <div class="list-item ${spent ? 'spent' : ''}">
      <div class="list-item-head">
        <div ${canSpend ? `data-prep-cast="${lvl}|${idx}" style="flex:1;min-width:0;cursor:pointer;"` : 'style="flex:1;min-width:0;"'}>
          <div class="name">${escapeHtml(sp.name)}</div>
          <div class="tag">Ячейка ${idx+1}${sp.tradition?' · '+escapeHtml(sp.tradition):''}</div>
          ${tagsMetaHtml(sp.traits)}
        </div>
        ${canSpend ? `<button type="button" class="spent-badge" data-prep-cast="${lvl}|${idx}">${spent ? 'потрачено' : 'готово'}</button>` : ''}
        <button type="button" class="chev-btn" data-item-toggle aria-label="Описание">
          <svg width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none"><path d="M6 9l6 6 6-6"/></svg>
        </button>
      </div>
      <div class="list-item-body">${escapeHtml(sp.desc)||'Без описания'}</div>
    </div>`;
}

function renderSpellsTab(){
  const sc = CH.spellcasting;
  syncPreparedSlots();
  const mod = CH.abilities[sc.ability].mod;
  const dc = 10 + mod + profTotal(sc.proficiency, CH.level);
  const atk = mod + profTotal(sc.proficiency, CH.level);
  const typeLabel = {none:'Нет заклинаний', spontaneous:'Спонтанный', prepared:'Подготавливающий'}[sc.type] || sc.type;
  const abilityLabel = (ABILITY_DEFS.find(d=>d.id===sc.ability)||{}).name || sc.ability;

  const typeOptions = [['none','Нет заклинаний'],['spontaneous','Спонтанный (Чародей)'],['prepared','Подготавливающий (Волшебник)']]
    .map(([v,l])=>`<option value="${v}" ${v===sc.type?'selected':''}>${l}</option>`).join('');

  const slotsConfig = SPELL_LEVELS.map(lvl=>`
    <div class="stat-box" style="padding:6px 4px;">
      <div class="lbl">${lvl===0?'Заг.':'Ур.'+lvl}</div>
      <input type="number" min="0" data-slot-max="${lvl}" value="${sc.slotsMax[lvl]||0}">
    </div>
  `).join('');

  const spendRanks = SPELL_LEVELS.filter(l => l >= 1 && Number(sc.slotsMax[l]) > 0);
  const dotsBody = spendRanks.map(lvl => {
    const max = Number(sc.slotsMax[lvl]||0);
    const used = Number(sc.slotsUsed[lvl]||0);
    return `<div class="slot-row"><div class="lbl">${rankLabel(lvl)}</div>${slotDotsHtml('slot', String(lvl), max, used)}</div>`;
  }).join('') || '<div class="empty-hint">Нет ячеек 1 круга и выше</div>';

  let castingBody = '';
  if(sc.type === 'spontaneous'){
    castingBody = dotsBody;
  } else if(sc.type === 'prepared'){
    const bookOptions = (current)=>{
      let o = `<option value="" ${!current?'selected':''}>— пусто —</option>`;
      CH.books.spellbook.forEach(sp=>{
        o += `<option value="${sp.id}" ${current===sp.id?'selected':''}>${escapeHtml(sp.name)} (ур.${sp.level})</option>`;
      });
      return o;
    };
    castingBody = SPELL_LEVELS.filter(l=>Number(sc.slotsMax[l])>0).map(lvl=>{
      const slots = sc.prepared[lvl];
      const boxes = slots.map((slot,idx)=>`
        <div class="slot-box">
          <div>Ячейка ${idx+1}</div>
          <select data-prep-slot="${lvl}|${idx}">${bookOptions(slot.spellId)}</select>
        </div>`).join('');
      return `<div style="margin-bottom:14px;"><div class="field-label" style="margin-bottom:6px;">${rankLabel(lvl)}</div><div class="slot-grid">${boxes}</div></div>`;
    }).join('') || '<div class="empty-hint">Настройте ячейки выше</div>';
  }

  const focus = sc.focus;
  const focusMax = Math.max(0, Number(focus.max) || 0);
  const focusUsed = Math.min(Number(focus.used)||0, focusMax);

  let preparedCardsHtml = '';
  if(sc.type === 'prepared'){
    preparedCardsHtml = SPELL_LEVELS.filter(l=>Number(sc.slotsMax[l])>0).map(lvl=>{
      const cards = (sc.prepared[lvl] || []).map((slot,idx)=>preparedCardHtml(lvl, idx, slot)).join('');
      if(!cards.trim()) return '';
      return `<div style="margin-bottom:12px;"><div class="field-label" style="margin-bottom:6px;">${rankLabel(lvl)}</div>${cards}</div>`;
    }).join('');
    if(!preparedCardsHtml.trim()) preparedCardsHtml = '<div class="empty-hint">Нет подготовленных заклинаний — заполните ячейки в режиме настройки</div>';
  }

  const focusSpellItems = focus.spellIds.map(id=>{
    const sp = CH.books.spellbook.find(s=>s.id===id);
    if(!sp) return '';
    return `
    <div class="list-item">
      <div class="list-item-head">
        <div style="flex:1;min-width:0;"><div class="name">${escapeHtml(sp.name)}</div><div class="tag">Уровень ${sp.level}${sp.tradition?' · '+escapeHtml(sp.tradition):''}</div>${tagsMetaHtml(sp.traits)}</div>
        <button type="button" class="chev-btn" data-item-toggle aria-label="Описание">
          <svg width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none"><path d="M6 9l6 6 6-6"/></svg>
        </button>
      </div>
      <div class="list-item-body">
        <div>${escapeHtml(sp.desc)||'Без описания'}</div>
        ${!isPlay() ? `<div class="list-item-actions"><button class="btn btn-sm btn-danger" data-focus-remove="${id}">Убрать из фокальных</button></div>` : ''}
      </div>
    </div>`;
  }).join('') || '<div class="empty-hint">Нет фокальных заклинаний — добавьте в режиме настройки</div>';

  const focusAddOptions = CH.books.spellbook.filter(sp=>!focus.spellIds.includes(sp.id));
  let focusAddHtml = '';
  if(!isPlay()){
    focusAddHtml = focusAddOptions.length ? `
      <div class="tag-input-row" style="margin-top:10px;">
        <select id="focusAddSelect">${focusAddOptions.map(sp=>`<option value="${sp.id}">${escapeHtml(sp.name)} (ур.${sp.level})</option>`).join('')}</select>
        <button class="btn btn-sm btn-accent" id="focusAddBtn">+</button>
      </div>
    ` : `<div class="empty-hint" style="padding:6px 0;">${CH.books.spellbook.length ? 'Все заклинания книги уже добавлены' : 'Сначала добавьте заклинания в Книгу заклинаний'}</div>`;
  }

  return `
    ${renderTopbar('Заклинания', `СЛ ${dc} · Атака ${fmtMod(atk)}`)}
    <div class="page active">

      <div class="card">
        ${isPlay() ? `
        <div class="play-id" style="margin-bottom:10px;">
          <div class="play-kv"><span>Тип</span>${escapeHtml(typeLabel)}</div>
        </div>
        <div class="row2" style="margin-bottom:10px;">
          <div class="play-kv"><span>Характеристика</span>${escapeHtml(abilityLabel)}</div>
          <div class="play-kv"><span>Владение</span>${escapeHtml(PROF_LABEL[sc.proficiency] || '')}</div>
        </div>` : `
        <div class="field"><label class="field-label">Тип заклинателя</label><select id="scType">${typeOptions}</select></div>
        <div class="row2">
          <div class="field"><label class="field-label">Характеристика</label><select id="scAbility">${ABILITY_OPTIONS}</select></div>
          <div class="field"><label class="field-label">Владение</label><select id="scProf">${PROF_RANKS.map(r=>`<option value="${r}" ${r===sc.proficiency?'selected':''}>${PROF_LABEL[r]}</option>`).join('')}</select></div>
        </div>`}
        <div class="row2">
          <div class="def-box" style="text-align:center;"><div class="def-title">Сл. заклинаний</div><div class="def-val">${dc}</div></div>
          <div class="def-box" style="text-align:center;"><div class="def-title">Атака заклинанием</div><div class="def-val">${fmtMod(atk)}</div></div>
        </div>
      </div>

      ${isPlay() || sc.type==='none' ? '' : `
      <div class="card">
        <h3 style="margin-bottom:8px;">Ячейки заклинаний</h3>
        <div class="stat-grid" style="grid-template-columns:repeat(6,1fr);">${slotsConfig}</div>
      </div>`}

      ${sc.type!=='none' && (isPlay() || sc.type==='spontaneous') ? `
      <div class="card">
        <div class="card-header" data-collapse-toggle="spellSlotsCollapsed">
          <h3>Ячейки</h3>
          <svg class="chev ${isPlay() || !CH.spellSlotsCollapsed?'open':''}" width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none"><path d="M6 9l6 6 6-6"/></svg>
        </div>
        <div class="card-body ${!isPlay() && CH.spellSlotsCollapsed?'collapsed':''}">${dotsBody}</div>
      </div>` : ''}

      ${sc.type==='prepared' && !isPlay() ? `
      <div class="card">
        <div class="card-header" data-collapse-toggle="spellSlotsCollapsed">
          <h3>Заполнение ячеек</h3>
          <svg class="chev ${!CH.spellSlotsCollapsed?'open':''}" width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none"><path d="M6 9l6 6 6-6"/></svg>
        </div>
        <div class="card-body ${CH.spellSlotsCollapsed?'collapsed':''}">${castingBody}</div>
      </div>` : ''}

      ${sc.type==='prepared' ? `
      <div class="card">
        <div class="card-header" data-collapse-toggle="preparedListCollapsed">
          <h3>Подготовленные заклинания</h3>
          <svg class="chev ${!CH.preparedListCollapsed?'open':''}" width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none"><path d="M6 9l6 6 6-6"/></svg>
        </div>
        <div class="card-body ${CH.preparedListCollapsed?'collapsed':''}">${preparedCardsHtml}</div>
      </div>` : ''}

      <div class="card">
        <h3 style="margin-bottom:8px;">Фокальные заклинания</h3>
        ${isPlay() ? '' : `<div class="ability-hint">Очки фокуса задаются отдельно от числа известных фокальных заклинаний.</div>
        <div class="field"><label class="field-label">Максимум очков фокуса</label><input type="number" min="0" id="focusMaxInput" value="${focusMax}" style="max-width:120px;"></div>`}
        <div class="slot-row" style="margin-top:8px;">
          <div class="lbl">Очки фокуса</div>
          ${slotDotsHtml('focus', 'focus', focusMax, focusUsed, 'focus')}
        </div>
        ${focusSpellItems}
        ${focusAddHtml}
      </div>
    </div>
  `;
}

function wireSpellsTab(){
  const root = document.querySelector('.page.active');
  const sc = CH.spellcasting;
  wireListItemToggles(root);
  wireCollapsibles(root);

  onEl(byId('scType'), 'change', e=>{ sc.type=e.target.value; save(); renderApp(); });
  const scAbility = byId('scAbility');
  if(scAbility){
    scAbility.value = sc.ability;
    scAbility.addEventListener('change', e=>{ sc.ability=e.target.value; save(); renderApp(); });
  }
  onEl(byId('scProf'), 'change', e=>{ sc.proficiency=e.target.value; save(); renderApp(); });
  onEl(byId('focusMaxInput'), 'input', e=>{
    sc.focus.max = Math.max(0, Number(e.target.value)||0);
    sc.focus.used = clamp(Number(sc.focus.used)||0, 0, sc.focus.max);
    save(); renderApp();
  });

  root.querySelectorAll('[data-slot-max]').forEach(inp=>{
    inp.addEventListener('input', ()=>{
      sc.slotsMax[inp.dataset.slotMax] = Math.max(0, Number(inp.value)||0);
      save(); renderApp();
    });
  });
  root.querySelectorAll('[data-slot-dot]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const [kind, key, action] = btn.dataset.slotDot.split('|');
      if(kind === 'focus'){
        const max = Math.max(0, Number(sc.focus.max)||0);
        if(action === 'spend'){
          if((sc.focus.used||0) >= max) return;
          sc.focus.used = (sc.focus.used||0) + 1;
          showToast('Очко фокуса', 'focus');
        } else {
          if(!(sc.focus.used > 0)) return;
          sc.focus.used -= 1;
          showToast('Очко фокуса возвращено', 'focus');
        }
        queueFlash('.slot-dot.focus-dot', 'info');
        save(); renderApp();
        return;
      }
      const lvl = Number(key);
      const max = Number(sc.slotsMax[lvl]||0);
      if(sc.type === 'prepared' && lvl >= 1){
        const ok = action === 'spend' ? spendPreparedRank(lvl) : restorePreparedRank(lvl);
        if(!ok) return;
        showToast(action === 'spend' ? ('Ячейка ' + rankToast(lvl)) : ('Ячейка ' + rankToast(lvl) + ' возвращена'), action === 'spend' ? 'accent' : 'info');
        queueFlash(`[data-slot-dot^="slot|${lvl}|"]`, action === 'spend' ? 'bad' : 'good');
        save(); renderApp();
        return;
      }
      let used = Number(sc.slotsUsed[lvl]||0);
      used = action === 'spend' ? used + 1 : used - 1;
      sc.slotsUsed[lvl] = clamp(used, 0, max);
      showToast(action === 'spend' ? ('Ячейка ' + rankToast(lvl)) : ('Ячейка ' + rankToast(lvl) + ' возвращена'), action === 'spend' ? 'accent' : 'info');
      queueFlash(`[data-slot-dot^="slot|${lvl}|"]`, action === 'spend' ? 'bad' : 'good');
      save(); renderApp();
    });
  });
  root.querySelectorAll('[data-prep-slot]').forEach(sel=>{
    sel.addEventListener('change', ()=>{
      const [lvl, idx] = sel.dataset.prepSlot.split('|');
      sc.prepared[lvl][idx].spellId = sel.value || null;
      sc.prepared[lvl][idx].expended = false;
      save(); renderApp();
    });
  });
  root.querySelectorAll('[data-prep-cast]').forEach(el=>{
    el.addEventListener('click', (e)=>{
      e.stopPropagation();
      const [lvl, idx] = el.dataset.prepCast.split('|');
      const spent = togglePreparedSlot(lvl, idx);
      showToast(spent ? ('Ячейка ' + rankToast(lvl)) : ('Ячейка ' + rankToast(lvl) + ' возвращена'), spent ? 'accent' : 'info');
      queueFlash(`[data-slot-dot^="slot|${lvl}|"]`, spent ? 'bad' : 'good');
      save(); renderApp();
    });
  });

  root.querySelectorAll('[data-focus-remove]').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      e.stopPropagation();
      sc.focus.spellIds = sc.focus.spellIds.filter(x=>x!==btn.dataset.focusRemove);
      sc.focus.used = clamp(Number(sc.focus.used||0), 0, Math.max(0, Number(sc.focus.max)||0));
      save(); renderApp();
    });
  });
  onEl(byId('focusAddBtn'), 'click', ()=>{
    const sel = byId('focusAddSelect');
    if(sel && sel.value){
      sc.focus.spellIds.push(sel.value);
      save(); renderApp();
    }
  });
}

/* =========================================================================
   TAB: КНИГИ (формулы + заклинания известные персонажу)
   ========================================================================= */
let booksSection = 'spellbook'; // 'spellbook' | 'formulas'

function renderBooksTab(){
  const spells = CH.books.spellbook.slice().sort((a,b)=>a.level-b.level || a.name.localeCompare(b.name,'ru'));
  const formulas = CH.books.formulas.slice().sort((a,b)=>a.level-b.level || a.name.localeCompare(b.name,'ru'));

  const spellItems = spells.map(sp=>`
    <div class="list-item">
      <div class="list-item-head" data-item-toggle>
        <div><div class="name">${escapeHtml(sp.name)}</div><div class="tag">Уровень ${sp.level}${sp.tradition?' · '+escapeHtml(sp.tradition):''}</div>${tagsMetaHtml(sp.traits)}</div>
      </div>
      <div class="list-item-body">
        <div>${escapeHtml(sp.desc)||'Без описания'}</div>
        ${!isPlay() ? `<div class="list-item-actions">
          <button class="btn btn-sm" data-edit-spell="${sp.id}">Изменить</button>
          <button class="btn btn-sm btn-danger" data-del-spell="${sp.id}">Удалить</button>
        </div>` : ''}
      </div>
    </div>`).join('') || '<div class="empty-hint">Книга заклинаний пуста</div>';

  const formulaItems = formulas.map(f=>`
    <div class="list-item">
      <div class="list-item-head" data-item-toggle>
        <div><div class="name">${escapeHtml(f.name)}</div><div class="tag">Уровень ${f.level}</div></div>
      </div>
      <div class="list-item-body">
        <div>${escapeHtml(f.note)||'Без описания'}</div>
        ${!isPlay() ? `<div class="list-item-actions">
          <button class="btn btn-sm" data-edit-formula="${f.id}">Изменить</button>
          <button class="btn btn-sm btn-danger" data-del-formula="${f.id}">Удалить</button>
        </div>` : ''}
      </div>
    </div>`).join('') || '<div class="empty-hint">Книга формул пуста</div>';

  return `
    ${renderTopbar('Книги', 'Формулы и заклинания')}
    <div class="page active">
      <div class="section-tabs">
        <div class="section-tab ${booksSection==='spellbook'?'active':''}" data-section="spellbook">Книга заклинаний</div>
        <div class="section-tab ${booksSection==='formulas'?'active':''}" data-section="formulas">Книга формул</div>
      </div>
      ${booksSection==='spellbook' ? `
        ${!isPlay() ? `<button class="btn btn-accent btn-block" id="addSpellBtn" style="margin-bottom:12px;">+ Добавить заклинание</button>` : ''}
        ${spellItems}
      ` : `
        ${!isPlay() ? `<button class="btn btn-accent btn-block" id="addFormulaBtn" style="margin-bottom:12px;">+ Добавить формулу</button>` : ''}
        ${formulaItems}
      `}
    </div>
  `;
}

function spellFormHtml(sp){
  sp = sp || {name:'', level:1, tradition:'', desc:''};
  return `
    <div class="field"><label class="field-label">Название</label><input type="text" id="mfName" value="${escapeAttr(sp.name)}"></div>
    <div class="row2">
      <div class="field"><label class="field-label">Уровень</label><input type="number" min="0" max="10" id="mfLevel" value="${sp.level}"></div>
      <div class="field"><label class="field-label">Традиция/школа</label><input type="text" id="mfTradition" value="${escapeAttr(sp.tradition)}"></div>
    </div>
    <div class="field"><label class="field-label">Описание</label><textarea id="mfDesc">${escapeHtml_(sp.desc)}</textarea></div>
    <div class="field"><label class="field-label">Дескрипторы</label><div id="mfTagsContainer"></div></div>
  `;
}
function formulaFormHtml(f){
  f = f || {name:'', level:1, note:''};
  return `
    <div class="field"><label class="field-label">Название предмета</label><input type="text" id="mfName" value="${escapeAttr(f.name)}"></div>
    <div class="field"><label class="field-label">Уровень</label><input type="number" min="0" id="mfLevel" value="${f.level}"></div>
    <div class="field"><label class="field-label">Заметка</label><textarea id="mfDesc">${escapeHtml_(f.note)}</textarea></div>
  `;
}

function wireBooksTab(){
  const root = document.querySelector('.page.active');
  wireListItemToggles(root);

  root.querySelectorAll('[data-section]').forEach(tab=>{
    tab.addEventListener('click', ()=>{ booksSection = tab.dataset.section; renderApp(); });
  });

  const spellBtn = byId('addSpellBtn');
  if(spellBtn) spellBtn.addEventListener('click', ()=>{
    openModal('Новое заклинание', spellFormHtml() + `
      <div class="modal-actions"><button class="btn btn-block" id="mfCancel">Отмена</button><button class="btn btn-accent btn-block" id="mfSave">Добавить</button></div>
    `, ()=>{
      const tagEditor = createTagEditor([]);
      byId('mfTagsContainer').appendChild(tagEditor.el);
      byId('mfCancel').addEventListener('click', closeModal);
      byId('mfSave').addEventListener('click', ()=>{
        CH.books.spellbook.push({id:uid(), name:byId('mfName').value||'Без названия', level:Number(byId('mfLevel').value)||0, tradition:byId('mfTradition').value, desc:byId('mfDesc').value, traits: tagEditor.getTags()});
        save(); closeModal(); renderApp();
      });
    });
  });
  root.querySelectorAll('[data-edit-spell]').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      e.stopPropagation();
      const sp = CH.books.spellbook.find(x=>x.id===btn.dataset.editSpell);
      openModal('Изменить заклинание', spellFormHtml(sp) + `
        <div class="modal-actions"><button class="btn btn-block" id="mfCancel">Отмена</button><button class="btn btn-accent btn-block" id="mfSave">Сохранить</button></div>
      `, ()=>{
        const tagEditor = createTagEditor(sp.traits||[]);
        byId('mfTagsContainer').appendChild(tagEditor.el);
        byId('mfCancel').addEventListener('click', closeModal);
        byId('mfSave').addEventListener('click', ()=>{
          sp.name=byId('mfName').value||sp.name; sp.level=Number(byId('mfLevel').value)||0;
          sp.tradition=byId('mfTradition').value; sp.desc=byId('mfDesc').value;
          sp.traits = tagEditor.getTags();
          save(); closeModal(); renderApp();
        });
      });
    });
  });
  root.querySelectorAll('[data-del-spell]').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      e.stopPropagation();
      const id = btn.dataset.delSpell;
      CH.books.spellbook = CH.books.spellbook.filter(x=>x.id!==id);
      // remove from prepared slots referencing this spell
      Object.values(CH.spellcasting.prepared).forEach(arr=>arr.forEach(s=>{ if(s.spellId===id){ s.spellId=null; s.expended=false; } }));
      save(); renderApp();
    });
  });

  const formulaBtn = byId('addFormulaBtn');
  if(formulaBtn) formulaBtn.addEventListener('click', ()=>{
    openModal('Новая формула', formulaFormHtml() + `
      <div class="modal-actions"><button class="btn btn-block" id="mfCancel">Отмена</button><button class="btn btn-accent btn-block" id="mfSave">Добавить</button></div>
    `, ()=>{
      byId('mfCancel').addEventListener('click', closeModal);
      byId('mfSave').addEventListener('click', ()=>{
        CH.books.formulas.push({id:uid(), name:byId('mfName').value||'Без названия', level:Number(byId('mfLevel').value)||0, note:byId('mfDesc').value});
        save(); closeModal(); renderApp();
      });
    });
  });
  root.querySelectorAll('[data-edit-formula]').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      e.stopPropagation();
      const f = CH.books.formulas.find(x=>x.id===btn.dataset.editFormula);
      openModal('Изменить формулу', formulaFormHtml(f) + `
        <div class="modal-actions"><button class="btn btn-block" id="mfCancel">Отмена</button><button class="btn btn-accent btn-block" id="mfSave">Сохранить</button></div>
      `, ()=>{
        byId('mfCancel').addEventListener('click', closeModal);
        byId('mfSave').addEventListener('click', ()=>{
          f.name=byId('mfName').value||f.name; f.level=Number(byId('mfLevel').value)||0; f.note=byId('mfDesc').value;
          save(); closeModal(); renderApp();
        });
      });
    });
  });
  root.querySelectorAll('[data-del-formula]').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      e.stopPropagation();
      CH.books.formulas = CH.books.formulas.filter(x=>x.id!==btn.dataset.delFormula);
      save(); renderApp();
    });
  });
}

/* =========================================================================
   TAB: ЧЕРТЫ
   ========================================================================= */
function renderFeatsTab(){
  const feats = CH.feats.slice().sort((a,b)=>a.level-b.level);
  const items = feats.map(f=>`
    <div class="list-item">
      <div class="list-item-head" data-item-toggle>
        <div><div class="name">${escapeHtml(f.name)}</div><div class="tag">Ур. ${f.level}${f.category?' · '+escapeHtml(f.category):''}</div>${tagsMetaHtml(f.traits)}</div>
      </div>
      <div class="list-item-body">
        <div>${escapeHtml(f.desc)||'Без описания'}</div>
        ${!isPlay() ? `
        <div class="list-item-actions">
          <button class="btn btn-sm" data-edit-feat="${f.id}">Изменить</button>
          <button class="btn btn-sm btn-danger" data-del-feat="${f.id}">Удалить</button>
        </div>` : ''}
      </div>
    </div>`).join('') || '<div class="empty-hint">Черт пока нет — добавьте в режиме настройки</div>';

  return `
    ${renderTopbar('Черты', `${CH.feats.length} черт`)}
    <div class="page active">
      ${!isPlay() ? `<button class="btn btn-accent btn-block" id="addFeatBtn" style="margin-bottom:12px;">+ Добавить черту</button>` : ''}
      ${items}
    </div>
  `;
}
function featFormHtml(f){
  f = f || {name:'', level:1, category:'', desc:'', addAction:false, actionType:'Одно действие', actionTraits:''};
  return `
    <div class="field"><label class="field-label">Название</label><input type="text" id="mfName" value="${escapeAttr(f.name)}"></div>
    <div class="row2">
      <div class="field"><label class="field-label">Уровень</label><input type="number" min="0" id="mfLevel" value="${f.level}"></div>
      <div class="field"><label class="field-label">Категория</label><input type="text" id="mfCategory" placeholder="классовая / общая / анцестри..." value="${escapeAttr(f.category)}"></div>
    </div>
    <div class="field"><label class="field-label">Описание</label><textarea id="mfDesc">${escapeHtml_(f.desc)}</textarea></div>
    <div class="field"><label class="field-label">Дескрипторы</label><div id="mfTagsContainer"></div></div>
    <div class="field">
      <label class="crit-toggle" style="font-size:13px;"><input type="checkbox" id="mfAddAction"> Эта черта даёт новое действие — добавить во вкладку «Действия»</label>
    </div>
  `;
}

function wireFeatsTab(){
  const root = document.querySelector('.page.active');
  wireListItemToggles(root);

  const addFeatBtn = byId('addFeatBtn');
  if(addFeatBtn) addFeatBtn.addEventListener('click', ()=>{
    openModal('Новая черта', featFormHtml() + `
      <div class="modal-actions"><button class="btn btn-block" id="mfCancel">Отмена</button><button class="btn btn-accent btn-block" id="mfSave">Добавить</button></div>
    `, ()=>{
      const tagEditor = createTagEditor([]);
      byId('mfTagsContainer').appendChild(tagEditor.el);
      byId('mfCancel').addEventListener('click', closeModal);
      byId('mfSave').addEventListener('click', ()=>{
        const name = byId('mfName').value||'Без названия';
        const desc = byId('mfDesc').value;
        CH.feats.push({id:uid(), name, level:Number(byId('mfLevel').value)||0, category:byId('mfCategory').value, desc, traits: tagEditor.getTags()});
        if(byId('mfAddAction').checked){
          CH.actions.push({id:uid(), name, type:'Одно действие', traits:[], desc, fromFeat:true, favorite:false});
        }
        save(); closeModal(); renderApp();
      });
    });
  });
  root.querySelectorAll('[data-edit-feat]').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      e.stopPropagation();
      const f = CH.feats.find(x=>x.id===btn.dataset.editFeat);
      openModal('Изменить черту', featFormHtml(f) + `
        <div class="modal-actions"><button class="btn btn-block" id="mfCancel">Отмена</button><button class="btn btn-accent btn-block" id="mfSave">Сохранить</button></div>
      `, ()=>{
        const tagEditor = createTagEditor(f.traits||[]);
        byId('mfTagsContainer').appendChild(tagEditor.el);
        byId('mfCancel').addEventListener('click', closeModal);
        byId('mfSave').addEventListener('click', ()=>{
          f.name=byId('mfName').value||f.name; f.level=Number(byId('mfLevel').value)||0;
          f.category=byId('mfCategory').value; f.desc=byId('mfDesc').value;
          f.traits = tagEditor.getTags();
          if(byId('mfAddAction').checked){
            CH.actions.push({id:uid(), name:f.name, type:'Одно действие', traits:[], desc:f.desc, fromFeat:true, favorite:false});
          }
          save(); closeModal(); renderApp();
        });
      });
    });
  });
  root.querySelectorAll('[data-del-feat]').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      e.stopPropagation();
      CH.feats = CH.feats.filter(x=>x.id!==btn.dataset.delFeat);
      save(); renderApp();
    });
  });
}

/* =========================================================================
   TAB: ФАМИЛЬЯР
   ========================================================================= */
function familiarDerived(){
  const level = Number(CH.level)||1;
  const spellKey = (CH.spellcasting && CH.spellcasting.ability) || 'int';
  const spellMod = (CH.abilities[spellKey] && CH.abilities[spellKey].mod) || 0;
  const special = level + Math.max(3, spellMod);
  const F = CH.familiar || {};
  const abilities = F.abilities || [];
  const tough = hasFamiliarEffect(abilities, 'tough');
  function saveTotal(key, abilityId){
    const d = CH.defenses[key];
    return CH.abilities[abilityId].mod + profTotal(d.proficiency, level) + Number(d.otherBonus||0);
  }
  return {
    level,
    spellMod,
    hpMax: (5 + (tough ? 2 : 0)) * level,
    tough,
    specialSkills: special,
    skilledSkills: skilledSkillsFromAbilities(abilities).map(name => ({name, total: level + spellMod})),
    otherSkills: level,
    resistances: resistanceFromAbilities(abilities, level),
    fort: saveTotal('fort','con'),
    ref: saveTotal('ref','dex'),
    will: saveTotal('will','wis'),
  };
}

function renderFamiliarTab(){
  const F = CH.familiar;
  const d = familiarDerived();
  const hpMax = d.hpMax;
  const hpCur = clamp(Number(F.hp.current)||0, 0, hpMax);
  const hpPct = hpMax>0 ? Math.max(0, Math.min(100, (hpCur/hpMax)*100)) : 0;
  const tempPct = hpMax>0 ? Math.max(0, Math.min(100-hpPct, ((F.hp.temp||0)/hpMax)*100)) : 0;

  const traitsHtml = (F.traits||[]).length
    ? F.traits.map((t,i)=>traitChipHtml(t, !isPlay() ? `<button type="button" data-fam-trait-del="${i}">✕</button>` : '')).join('')
    : '<div class="empty-hint" style="padding:6px 0;">Дескрипторов пока нет</div>';

  const abilityCards = (F.abilities||[]).map(ab=>{
    const effect = familiarAbilityEffect(ab);
    const meta = effect === 'skilled' && ab.skill
      ? `<div class="tag">${escapeHtml(ab.skill)}</div>`
      : effect === 'resistance' && (ab.damageTypes||[]).length
        ? `<div class="tag">${escapeHtml((ab.damageTypes||[]).join(', '))}</div>`
        : '';
    return `
    <div class="list-item">
      <div class="list-item-head" data-item-toggle>
        <div><div class="name">${escapeHtml(ab.name||'Без названия')}</div>${meta}</div>
      </div>
      <div class="list-item-body">
        <div>${escapeHtml(ab.desc)||'Без описания'}</div>
        ${!isPlay() ? `
        <div class="list-item-actions">
          <button class="btn btn-sm" data-edit-fam-ability="${ab.id}">Изменить</button>
          <button class="btn btn-sm btn-danger" data-del-fam-ability="${ab.id}">Удалить</button>
        </div>` : ''}
      </div>
    </div>
  `;
  }).join('') || '<div class="empty-hint">Нет способностей фамильяра — добавьте в режиме настройки</div>';

  const statCols = ABILITY_DEFS.map(def=>`
    <div class="compact-stat"><span class="k">${abilityShort(def.id)}</span><span class="v">${fmtMod(CH.abilities[def.id].mod)}</span></div>
  `).join('');

  return `
    ${renderTopbar('Фамильяр', `${F.kind ? escapeHtml(F.kind) : 'Вид не указан'} · Ур. ${d.level}`)}
    <div class="page active">
      <div class="card">
        ${isPlay() ? `
        <div class="play-id">
          <div class="name-display">${escapeHtml(F.name) || 'Без имени'}</div>
          <div class="row2">
            <div class="play-kv"><span>Вид</span>${escapeHtml(F.kind) || '—'}</div>
            <div class="play-kv"><span>Уровень</span>${d.level}</div>
          </div>
        </div>` : `
        <div class="field">
          <input type="text" class="name-input" id="famName" placeholder="Имя фамильяра" value="${escapeAttr(F.name)}">
        </div>
        <div class="row2" style="margin-bottom:0;">
          <div class="field" style="margin-bottom:0;">
            <label class="field-label">Вид</label>
            <input type="text" id="famKind" placeholder="Ворон, кошка, леший…" value="${escapeAttr(F.kind)}">
          </div>
          <div class="field" style="margin-bottom:0;">
            <label class="field-label">Уровень</label>
            <input type="number" value="${d.level}" disabled title="Совпадает с уровнем хозяина">
          </div>
        </div>`}
      </div>

      <div class="card">
        <h3 style="margin-bottom:8px;">Дескрипторы</h3>
        <div class="tag-chip-box">${traitsHtml}</div>
        ${!isPlay() ? `
        <div class="tag-input-row">
          <input type="text" id="famTraitInput" placeholder="Выберите из библиотеки или введите свой…">
          <button class="btn btn-accent" id="famTraitAddBtn">+</button>
        </div>
        <div class="tag-suggestions" id="famTraitSuggestions"></div>` : ''}
      </div>

      <div class="card">
        <div class="card-header" data-collapse-toggle="hpCollapsed" data-collapse-scope="familiar">
          <h3>Здоровье</h3>
          <svg class="chev ${!F.hpCollapsed?'open':''}" width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none"><path d="M6 9l6 6 6-6"/></svg>
        </div>
        ${F.hpCollapsed ? `
        <div class="compact-panel compact-hp">
          <div class="compact-hp-row">
            <button class="btn hp-delta hp-minus" data-fam-delta="-1">−1</button>
            <div class="compact-hp-value">
              <span class="hp-num">${hpCur}</span><span class="hp-max"> / ${hpMax}</span>
              ${F.hp.temp>0 ? `<span class="pill" style="margin-left:8px;color:#8fb4de;border-color:#3a5474;">+${F.hp.temp} врем.</span>`:''}
            </div>
            <button class="btn hp-delta hp-plus" data-fam-delta="1">+1</button>
          </div>
          <div class="hp-bar"><div class="hp-bar-fill" style="width:${hpPct}%"></div><div class="hp-bar-temp" style="width:${tempPct}%;left:${hpPct}%"></div></div>
          ${d.resistances.types.length ? `<div class="tag-chip-box" style="margin-top:8px;margin-bottom:0;">${d.resistances.types.map(t=>`<span class="tag-chip resist">Устойчивость к ${escapeHtml(t)} ${d.resistances.value}</span>`).join('')}</div>` : ''}
        </div>` : ''}
        <div class="card-body ${F.hpCollapsed?'collapsed':''}">
          <div class="hp-main">
            <span class="hp-num">${hpCur}</span><span class="hp-max"> / ${hpMax}</span>
            ${F.hp.temp>0 ? `<span class="pill" style="margin-left:8px;color:#8fb4de;border-color:#3a5474;">+${F.hp.temp} врем.</span>`:''}
          </div>
          <div class="hp-bar"><div class="hp-bar-fill" style="width:${hpPct}%"></div><div class="hp-bar-temp" style="width:${tempPct}%;left:${hpPct}%"></div></div>
          <div class="hp-btns">
            <button class="btn hp-delta hp-minus" data-fam-delta="-5">−5</button>
            <button class="btn hp-delta hp-minus" data-fam-delta="-1">−1</button>
            <button class="btn hp-delta hp-plus" data-fam-delta="1">+1</button>
            <button class="btn hp-delta hp-plus" data-fam-delta="5">+5</button>
          </div>
          <div class="row2" style="margin-top:10px;">
            <div class="field" style="margin-bottom:0;"><label class="field-label">Текущие ОЗ</label><input type="number" id="famHpCurrent" value="${hpCur}"></div>
            <div class="field" style="margin-bottom:0;"><label class="field-label">Максимум ОЗ</label><input type="number" value="${hpMax}" disabled></div>
          </div>
          <div class="temp-hp-field">
            <label>Временные ОЗ</label>
            <input type="number" id="famHpTemp" value="${F.hp.temp||0}" style="width:90px;">
          </div>
          <div class="empty-hint" style="margin-top:8px;">Максимум: ${d.tough ? '7' : '5'} × уровень хозяина${d.tough ? ' (живучий)' : ''}.</div>
          ${d.resistances.types.length ? `<div class="tag-chip-box" style="margin-top:8px;margin-bottom:0;">${d.resistances.types.map(t=>`<span class="tag-chip resist">Устойчивость к ${escapeHtml(t)} ${d.resistances.value}</span>`).join('')}</div>` : ''}
        </div>
      </div>

      <div class="card">
        <div class="card-header" data-collapse-toggle="defensesCollapsed" data-collapse-scope="familiar">
          <h3>Защита</h3>
          <svg class="chev ${!F.defensesCollapsed?'open':''}" width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none"><path d="M6 9l6 6 6-6"/></svg>
        </div>
        ${F.defensesCollapsed ? `
        <div class="compact-panel compact-def">
          <div class="compact-stat"><span class="k">КБ</span><span class="v">${F.ac}</span></div>
          <div class="compact-stat"><span class="k">С</span><span class="v">${fmtMod(d.fort)}</span></div>
          <div class="compact-stat"><span class="k">Р</span><span class="v">${fmtMod(d.ref)}</span></div>
          <div class="compact-stat"><span class="k">В</span><span class="v">${fmtMod(d.will)}</span></div>
        </div>` : ''}
        <div class="card-body ${F.defensesCollapsed?'collapsed':''}">
          <div class="field">
            <label class="field-label">Класс доспеха</label>
            ${isPlay() ? `<div class="def-box" style="padding:8px 10px;"><div class="def-val">${F.ac}</div></div>` : `<input type="number" id="famAc" value="${F.ac}">`}
          </div>
          <div class="compact-def compact-def-3" style="margin-top:8px;">
            <div class="compact-stat"><span class="k">Стойкость</span><span class="v">${fmtMod(d.fort)}</span></div>
            <div class="compact-stat"><span class="k">Реакция</span><span class="v">${fmtMod(d.ref)}</span></div>
            <div class="compact-stat"><span class="k">Воля</span><span class="v">${fmtMod(d.will)}</span></div>
          </div>
          <div class="empty-hint" style="margin-top:8px;">Испытания как у хозяина. КБ задаётся отдельно — броня хозяина на фамильяра не переносится.</div>
        </div>
      </div>

      <div class="card">
        <h3 style="margin-bottom:10px;">Навыки</h3>
        <div class="familiar-skill-grid">
          <div class="compact-stat familiar-skill-stat">
            <span class="k">Внимание, Акробатика, Скрытность</span>
            <span class="v">${fmtMod(d.specialSkills)}</span>
          </div>
          ${d.skilledSkills.map(s=>`
          <div class="compact-stat familiar-skill-stat">
            <span class="k">${escapeHtml(s.name)}</span>
            <span class="v">${fmtMod(s.total)}</span>
          </div>`).join('')}
          <div class="compact-stat familiar-skill-stat">
            <span class="k">Прочие навыки</span>
            <span class="v">${fmtMod(d.otherSkills)}</span>
          </div>
        </div>
        <div class="empty-hint" style="margin-top:8px;">Внимание / Акробатика / Скрытность: уровень + наибольшее из 3 и модификатора заклинательной характеристики. Умелец: уровень + этот модификатор. Прочие равны уровню хозяина.</div>
      </div>

      <div class="card">
        <div class="card-header" data-collapse-toggle="statsCollapsed" data-collapse-scope="familiar">
          <h3>Характеристики</h3>
          <svg class="chev ${!F.statsCollapsed?'open':''}" width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none"><path d="M6 9l6 6 6-6"/></svg>
        </div>
        ${F.statsCollapsed ? `
        <div class="compact-panel familiar-ability-grid">
          ${statCols}
        </div>` : ''}
        <div class="card-body ${F.statsCollapsed?'collapsed':''}">
          <div class="familiar-ability-grid">${statCols}</div>
          <div class="empty-hint" style="margin-top:8px;">Модификаторы как у хозяина.</div>
        </div>
      </div>

      <div class="card">
        <h3 style="margin-bottom:10px;">Движение</h3>
        ${isPlay() ? `
        <div class="compact-speeds">
          <div class="compact-stat"><span class="k">Наземная</span><span class="v">${F.speeds.base}</span></div>
          ${(F.speeds.extra||[]).map(s=>`
            <div class="compact-stat"><span class="k">${escapeHtml(s.name||'Скорость')}</span><span class="v">${escapeHtml(s.value || '—')}</span></div>
          `).join('')}
        </div>` : `
        <div class="field speed-setup">
          <label class="field-label">Наземная скорость (футы)</label>
          <input type="number" id="famSpeedBase" class="speed-num" value="${F.speeds.base}">
        </div>
        ${F.speeds.extra.length ? `<div style="margin-top:4px;">${F.speeds.extra.map(s=>`
          <div class="extra-speed-row">
            <span>${escapeHtml(s.name)}${s.value ? ' — '+escapeHtml(s.value) : ''}</span>
            <button data-fam-speed-del="${s.id}">✕</button>
          </div>
        `).join('')}</div>` : ''}
        <button class="btn btn-sm" id="famAddSpeedBtn" style="margin-top:10px;">+ Доп. скорость</button>`}
      </div>

      <div class="card">
        <h3 style="margin-bottom:8px;">Способности</h3>
        ${!isPlay() ? `<button class="btn btn-accent btn-block" id="famAddAbilityBtn" style="margin-bottom:12px;">+ Добавить способность</button>` : ''}
        ${abilityCards}
      </div>

      <div class="card">
        <h3 style="margin-bottom:8px;">Связь</h3>
        <div class="play-text">Эмпатическая связь до 1 мили: фамильяр делится эмоциями. Он не понимает языков и не говорит, пока способность не даст ему эту возможность.</div>
      </div>

      <div class="card">
        <h3 style="margin-bottom:8px;">Заметки</h3>
        ${isPlay()
          ? (F.notes && F.notes.trim() ? `<div class="play-text">${escapeHtml(F.notes)}</div>` : `<div class="empty-hint">Нет заметок</div>`)
          : `<textarea class="autosize" id="famNotes">${escapeHtml_(F.notes)}</textarea>`}
      </div>
    </div>
  `;
}

function familiarSkilledOptions(){
  const seen = new Set();
  const names = [];
  (CH.skills || []).forEach(skill => {
    const name = String(skill.name || '').trim();
    const key = name.toLocaleLowerCase('ru');
    if(!name || SKILLED_EXCLUDED.includes(key) || seen.has(key)) return;
    seen.add(key);
    names.push(name);
  });
  return names;
}

function familiarAbilityExtraHtml(effect, ab){
  ab = ab || {};
  if(effect === 'skilled'){
    const current = ab.skill || '';
    const opts = familiarSkilledOptions().map(name =>
      `<option value="${escapeAttr(name)}" ${name===current?'selected':''}>${escapeHtml(name)}</option>`
    ).join('');
    return `
      <div class="field" id="mfExtraInner">
        <label class="field-label">Навык умельца</label>
        <select id="mfSkilledSkill"><option value="">Выберите навык</option>${opts}</select>
        <div class="empty-hint" style="text-align:left;padding:6px 0 0;">Кроме Акробатики и Скрытности. Можно взять несколько раз.</div>
      </div>`;
  }
  if(effect === 'resistance'){
    const types = ab.damageTypes || [];
    function opts(selected){
      return DAMAGE_TYPES_RESISTANCE.map(t=>
        `<option value="${escapeAttr(t.name)}" ${t.name===selected?'selected':''}>${escapeHtml(t.name)}</option>`
      ).join('');
    }
    return `
      <div id="mfExtraInner">
        <div class="row2">
          <div class="field"><label class="field-label">Тип урона 1</label><select id="mfResistType1"><option value="">—</option>${opts(types[0]||'')}</select></div>
          <div class="field"><label class="field-label">Тип урона 2</label><select id="mfResistType2"><option value="">—</option>${opts(types[1]||'')}</select></div>
        </div>
      </div>`;
  }
  return '';
}

function familiarAbilityFormHtml(ab){
  ab = ab || {name:'', desc:'', effect:null, skill:null, damageTypes:null};
  const effect = familiarAbilityEffect(ab);
  return `
    <div class="field">
      <label class="field-label">Название</label>
      <input type="text" id="mfName" value="${escapeAttr(ab.name)}" placeholder="Из библиотеки или своё…">
    </div>
    <div class="tag-suggestions" id="mfFamAbilitySuggestions"></div>
    <div id="mfExtraParams">${familiarAbilityExtraHtml(effect, ab)}</div>
    <div class="field"><label class="field-label">Описание</label><textarea id="mfDesc">${escapeHtml_(ab.desc)}</textarea></div>
  `;
}

function syncFamiliarAbilityExtras(entry, current){
  const box = byId('mfExtraParams');
  if(!box) return;
  box.innerHTML = familiarAbilityExtraHtml(entry && entry.effect, current || {});
}

function readFamiliarAbilityExtras(){
  const skillEl = byId('mfSkilledSkill');
  const t1 = byId('mfResistType1');
  const t2 = byId('mfResistType2');
  const skill = skillEl ? skillEl.value.trim() : '';
  const types = [];
  if(t1 && t1.value) types.push(t1.value);
  if(t2 && t2.value) types.push(t2.value);
  return {
    skill: skill || null,
    damageTypes: types.length ? types : null,
  };
}

function validateFamiliarAbilityExtras(effect, extras){
  if(effect === 'skilled' && !extras.skill){
    showToast('Выберите навык для умельца');
    return false;
  }
  if(effect === 'resistance'){
    const types = extras.damageTypes || [];
    if(types.length < 2 || types[0] === types[1]){
      showToast('Выберите два разных типа урона');
      return false;
    }
  }
  return true;
}

function withFamiliarHpAdjust(mutate){
  const F = CH.familiar;
  const before = familiarDerived().hpMax;
  mutate();
  const after = familiarDerived().hpMax;
  if(after > before){
    F.hp.current = clamp((Number(F.hp.current)||0) + (after - before), 0, after);
  } else if(after < before){
    F.hp.current = clamp(Number(F.hp.current)||0, 0, after);
  }
}

function wireFamiliarAbilitySuggestions(onPick){
  const input = byId('mfName');
  const box = byId('mfFamAbilitySuggestions');
  if(!input || !box) return;
  function render(){
    const matches = searchLibraryFamiliarAbilities(input.value);
    box.innerHTML = '';
    matches.forEach(entry=>{
      const option = document.createElement('button');
      option.type = 'button';
      option.className = 'tag-suggestion';
      const mark = entry.effect ? 'эффект' : 'библиотека';
      option.innerHTML = `<span>${escapeHtml(entry.name)}</span><small>${mark}</small>`;
      option.addEventListener('click', ()=>onPick(entry));
      box.appendChild(option);
    });
  }
  input.addEventListener('input', render);
  input.addEventListener('focus', render);
  render();
}

function wireFamiliarTab(){
  const root = document.querySelector('.page.active');
  wireCollapsibles(root);
  wireListItemToggles(root);
  const F = CH.familiar;
  const d = familiarDerived();

  const nameEl = byId('famName');
  if(nameEl) nameEl.addEventListener('input', e=>{ F.name=e.target.value; save(); });
  const kindEl = byId('famKind');
  if(kindEl) kindEl.addEventListener('input', e=>{ F.kind=e.target.value; save(); });

  const traitAddBtn = byId('famTraitAddBtn');
  const traitInputEl = byId('famTraitInput');
  const traitSuggestionsEl = byId('famTraitSuggestions');
  function hasFamTrait(candidate){ return (F.traits||[]).some(trait=>traitKey(trait) === traitKey(candidate)); }
  function renderFamTraitSuggestions(){
    if(!traitSuggestionsEl || !traitInputEl) return;
    const query = traitInputEl.value.trim().toLocaleLowerCase('ru');
    const matches = query ? TRAIT_LIBRARY.filter(t=>t.name.toLocaleLowerCase('ru').includes(query) || t.category.toLocaleLowerCase('ru').includes(query)).slice(0,12) : [];
    traitSuggestionsEl.innerHTML = '';
    matches.forEach(trait=>{
      const option = document.createElement('button');
      option.type = 'button'; option.className = `tag-suggestion tone-${trait.color}`;
      option.innerHTML = `<span>${escapeHtml(trait.name)}</span><small>${escapeHtml(trait.category)}</small>`;
      option.addEventListener('click', ()=>{
        if(!hasFamTrait({type:'library', id:trait.id})) F.traits.push({type:'library', id:trait.id});
        save(); renderApp();
      });
      traitSuggestionsEl.appendChild(option);
    });
  }
  if(traitAddBtn) traitAddBtn.addEventListener('click', ()=>{
    const v = traitInputEl.value.trim();
    if(!v) return;
    const library = matchLibraryTrait(v);
    const trait = library ? {type:'library', id:library.id} : {type:'custom', name:v};
    if(!hasFamTrait(trait)){ F.traits.push(trait); save(); renderApp(); }
  });
  if(traitInputEl){
    traitInputEl.addEventListener('input', renderFamTraitSuggestions);
    traitInputEl.addEventListener('keydown', e=>{ if(e.key==='Enter'){ e.preventDefault(); traitAddBtn.click(); } });
  }
  root.querySelectorAll('[data-fam-trait-del]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      F.traits.splice(Number(btn.dataset.famTraitDel),1);
      save(); renderApp();
    });
  });

  root.querySelectorAll('[data-fam-delta]').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      e.stopPropagation();
      applyFamiliarHpDelta(Number(btn.dataset.famDelta));
    });
  });
  const hpCur = byId('famHpCurrent');
  if(hpCur) hpCur.addEventListener('input', e=>{ F.hp.current = clamp(Number(e.target.value)||0, 0, d.hpMax); save(); renderApp(); });
  const hpTemp = byId('famHpTemp');
  if(hpTemp) hpTemp.addEventListener('input', e=>{ F.hp.temp = Math.max(0, Number(e.target.value)||0); save(); renderApp(); });

  const acEl = byId('famAc');
  if(acEl) acEl.addEventListener('input', e=>{ F.ac = Number(e.target.value)||0; save(); renderApp(); });

  const speedEl = byId('famSpeedBase');
  if(speedEl) speedEl.addEventListener('input', e=>{ F.speeds.base = Number(e.target.value)||0; save(); renderApp(); });
  root.querySelectorAll('[data-fam-speed-del]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      F.speeds.extra = F.speeds.extra.filter(x=>x.id!==btn.dataset.famSpeedDel);
      save(); renderApp();
    });
  });
  const addSpeedBtn = byId('famAddSpeedBtn');
  if(addSpeedBtn) addSpeedBtn.addEventListener('click', ()=>{
    openModal('Дополнительная скорость', `
      <div class="field"><label class="field-label">Название</label><input type="text" id="mfName" placeholder="Полёт, Лазание, Плавание…"></div>
      <div class="field"><label class="field-label">Значение</label><input type="text" id="mfValue" placeholder="30"></div>
      <div class="modal-actions">
        <button class="btn btn-block" id="mfCancel">Отмена</button>
        <button class="btn btn-accent btn-block" id="mfSave">Добавить</button>
      </div>
    `, ()=>{
      byId('mfCancel').addEventListener('click', closeModal);
      byId('mfSave').addEventListener('click', ()=>{
        const name = byId('mfName').value.trim();
        if(!name) return;
        F.speeds.extra.push({id:uid(), name, value:byId('mfValue').value.trim()});
        save(); closeModal(); renderApp();
      });
    });
  });

  const addAbilityBtn = byId('famAddAbilityBtn');
  if(addAbilityBtn) addAbilityBtn.addEventListener('click', ()=>{
    openModal('Способность фамильяра', familiarAbilityFormHtml() + `
      <div class="modal-actions">
        <button class="btn btn-block" id="mfCancel">Отмена</button>
        <button class="btn btn-accent btn-block" id="mfSave">Добавить</button>
      </div>
    `, ()=>{
      let picked = null;
      function applyPick(entry){
        picked = entry;
        byId('mfName').value = entry.name;
        byId('mfDesc').value = entry.desc;
        syncFamiliarAbilityExtras(entry);
      }
      wireFamiliarAbilitySuggestions(applyPick);
      byId('mfName').addEventListener('input', ()=>{
        picked = matchLibraryFamiliarAbility(byId('mfName').value);
        syncFamiliarAbilityExtras(picked);
      });
      byId('mfCancel').addEventListener('click', closeModal);
      byId('mfSave').addEventListener('click', ()=>{
        const name = byId('mfName').value.trim() || 'Без названия';
        const desc = byId('mfDesc').value;
        const lib = picked || matchLibraryFamiliarAbility(name);
        const extras = readFamiliarAbilityExtras();
        if(lib && !validateFamiliarAbilityExtras(lib.effect, extras)) return;
        withFamiliarHpAdjust(()=>{
          if(lib){
            const inst = instantiateLibraryFamiliarAbility(lib, uid, extras);
            inst.name = name;
            inst.desc = desc;
            F.abilities.push(inst);
          } else {
            F.abilities.push({id:uid(), libraryId:null, name, desc, effect:null, skill:null, damageTypes:null});
          }
        });
        save(); closeModal(); renderApp();
      });
    });
  });
  root.querySelectorAll('[data-edit-fam-ability]').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      e.stopPropagation();
      const ab = F.abilities.find(x=>x.id===btn.dataset.editFamAbility);
      if(!ab) return;
      openModal('Изменить способность', familiarAbilityFormHtml(ab) + `
        <div class="modal-actions">
          <button class="btn btn-block" id="mfCancel">Отмена</button>
          <button class="btn btn-accent btn-block" id="mfSave">Сохранить</button>
        </div>
      `, ()=>{
        let picked = ab.libraryId ? getLibraryFamiliarAbility(ab.libraryId) : matchLibraryFamiliarAbility(ab.name);
        function applyPick(entry){
          picked = entry;
          byId('mfName').value = entry.name;
          byId('mfDesc').value = entry.desc;
          syncFamiliarAbilityExtras(entry, ab);
        }
        wireFamiliarAbilitySuggestions(applyPick);
        byId('mfName').addEventListener('input', ()=>{
          picked = matchLibraryFamiliarAbility(byId('mfName').value);
          syncFamiliarAbilityExtras(picked, ab);
        });
        byId('mfCancel').addEventListener('click', closeModal);
        byId('mfSave').addEventListener('click', ()=>{
          const name = byId('mfName').value.trim() || 'Без названия';
          const desc = byId('mfDesc').value;
          const lib = picked || matchLibraryFamiliarAbility(name);
          const extras = readFamiliarAbilityExtras();
          if(lib && !validateFamiliarAbilityExtras(lib.effect, extras)) return;
          withFamiliarHpAdjust(()=>{
            ab.name = name;
            ab.desc = desc;
            if(lib){
              ab.libraryId = lib.id;
              ab.effect = lib.effect || null;
              ab.skill = extras.skill;
              ab.damageTypes = extras.damageTypes;
            } else {
              ab.libraryId = null;
              ab.effect = null;
              ab.skill = null;
              ab.damageTypes = null;
            }
          });
          save(); closeModal(); renderApp();
        });
      });
    });
  });
  root.querySelectorAll('[data-del-fam-ability]').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      e.stopPropagation();
      withFamiliarHpAdjust(()=>{
        F.abilities = F.abilities.filter(x=>x.id!==btn.dataset.delFamAbility);
      });
      save(); renderApp();
    });
  });

  const notesEl = byId('famNotes');
  if(notesEl){
    bindAutosize(notesEl);
    notesEl.addEventListener('input', e=>{ F.notes=e.target.value; save(); });
  }
}

function applyFamiliarHpDelta(delta){
  const F = CH.familiar;
  const max = familiarDerived().hpMax;
  if(delta < 0){
    let dmg = -delta;
    if(F.hp.temp > 0){
      const absorbed = Math.min(F.hp.temp, dmg);
      F.hp.temp -= absorbed; dmg -= absorbed;
    }
    F.hp.current = clamp((Number(F.hp.current)||0) - dmg, 0, max);
  } else {
    F.hp.current = clamp((Number(F.hp.current)||0) + delta, 0, max);
  }
  const sign = delta < 0 ? String(delta) : ('+' + delta);
  showToast('ПЗ фамильяра ' + sign + ' → ' + F.hp.current, delta < 0 ? 'bad' : 'good');
  queueFlash('.hp-num', delta < 0 ? 'bad' : 'good');
  save(); renderApp();
}

/* =========================================================================
   НАСТРОЙКИ (бывшая вкладка «Ещё»)
   ========================================================================= */
function renderSettingsTab(){
  const savedDate = CH.meta.savedAt ? new Date(CH.meta.savedAt).toLocaleString('ru-RU') : '—';
  const profiles = listCharacterProfiles();
  return `
    ${renderTopbar('Настройки', '', {settings:true})}
    <div class="page active">
      <div class="card">
        <div class="more-item" style="border:none;padding-top:0;">
          <div><div class="t">Вкладка фамильяра</div><div class="d">Показать упрощённый лист связанного существа</div></div>
          <label class="switch">
            <input type="checkbox" id="familiarEnabledToggle" ${CH.familiarEnabled?'checked':''}>
            <span class="switch-ui"></span>
          </label>
        </div>
      </div>
      <div class="card">
        <div class="more-item" style="border:none;padding-top:0;">
          <div><div class="t">Персонаж в этой вкладке</div><div class="d">Каждая вкладка может работать со своим персонажем.</div></div>
        </div>
        <div class="field" style="margin:0 0 10px;">
          <select id="characterProfileSelect">
            ${profiles.map(profile=>`<option value="${escapeAttr(profile.id)}" ${profile.active?'selected':''}>${escapeHtml(profile.name)}</option>`).join('')}
          </select>
        </div>
        <button class="btn btn-accent btn-block" id="newCharacterBtn">+ Новый персонаж</button>
      </div>
      <div class="card">
        <div class="more-item">
          <div><div class="t">Экспорт персонажа</div><div class="d">Сохранить конфигурацию в файл .xml</div></div>
          <button class="btn btn-accent" id="exportBtn">Экспорт</button>
        </div>
        <div class="more-item">
          <div><div class="t">Импорт персонажа</div><div class="d">Загрузить конфигурацию из файла .xml</div></div>
          <button class="btn" id="importBtn">Импорт</button>
        </div>
        <div class="more-item">
          <div><div class="t">Сбросить персонажа</div><div class="d">Удалит все данные и начнёт заново</div></div>
          <button class="btn btn-danger" id="resetBtn">Сброс</button>
        </div>
      </div>
      <div class="card">
        <div class="more-item" style="border:none;padding-top:0;">
          <div><div class="t">Автосохранение</div><div class="d">Данные хранятся локально в кэше браузера. Последнее сохранение: ${savedDate}</div></div>
        </div>
        <div class="empty-hint" style="text-align:left;padding:4px 4px 0;">Версия 1.3.2</div>
      </div>
    </div>
  `;
}

function wireSettingsTab(){
  const famToggle = byId('familiarEnabledToggle');
  if(famToggle) famToggle.addEventListener('change', ()=>{
    const on = famToggle.checked;
    CH.familiarEnabled = on;
    if(on && !CH.familiar.ready){
      const level = Number(CH.level)||1;
      CH.familiar.hp.current = 5 * level;
      CH.familiar.ready = true;
      const compact = isPlay();
      CH.familiar.hpCollapsed = compact;
      CH.familiar.defensesCollapsed = compact;
    }
    save();
    renderApp();
  });
  byId('characterProfileSelect').addEventListener('change', e=>{
    CH = switchCharacterProfile(e.target.value);
    activeTab = 'character';
    renderApp();
    showToast('Персонаж переключён');
  });
  byId('newCharacterBtn').addEventListener('click', ()=>{
    openModal('Новый персонаж', `
      <div class="field"><label class="field-label">Имя персонажа</label><input type="text" id="newCharacterName" placeholder="Можно указать позже"></div>
      <div class="modal-actions"><button class="btn btn-block" id="mfCancel">Отмена</button><button class="btn btn-accent btn-block" id="mfSave">Создать</button></div>
    `, ()=>{
      byId('mfCancel').addEventListener('click', closeModal);
      byId('mfSave').addEventListener('click', ()=>{
        CH = createCharacterProfile(byId('newCharacterName').value);
        closeModal();
        activeTab = 'character';
        renderApp();
        showToast('Создан новый персонаж');
      });
    });
  });
  byId('exportBtn').addEventListener('click', ()=>{
    const xml = characterToXml(CH);
    const blob = new Blob([xml], {type:'application/xml'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeName = (CH.name||'character').replace(/[^a-zA-Zа-яА-Я0-9_\- ]/g,'').trim() || 'character';
    a.href = url; a.download = `${safeName}.xml`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Файл экспортирован');
  });

  byId('importBtn').addEventListener('click', ()=>{
    byId('importFileInput').click();
  });

  byId('resetBtn').addEventListener('click', ()=>{
    if(confirm('Удалить все данные персонажа? Это действие необратимо.')){
      CH = defaultCharacter();
      save();
      renderApp();
      showToast('Персонаж сброшен');
    }
  });
}

byId('importFileInput').addEventListener('change', (e)=>{
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try{
      const parsed = parseCharacterXml(reader.result);
      if(confirm('Импортировать этого персонажа? Текущие данные будут заменены.')){
        CH = normalizeCharacter(parsed);
        save();
        activeTab = 'character';
        renderApp();
        showToast('Персонаж импортирован');
      }
    }catch(err){
      alert('Не удалось прочитать файл: ' + err.message);
    }
    e.target.value = '';
  };
  reader.readAsText(file, 'UTF-8');
});

/* =========================================================================
   INIT
   ========================================================================= */
window.__pf2RenderApp = renderApp;
renderApp();
