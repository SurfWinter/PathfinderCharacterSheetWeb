import { ABILITY_DEFS, createCharacterProfile, defaultCharacter, listCharacterProfiles, loadCharacter, normalizeCharacter, saveCharacter, switchCharacterProfile, uid } from './character-state.js';
import { characterToXml, parseCharacterXml } from './character-xml.js';
import { byId, showToast } from './dom.js';
import { enableTouchReorder } from './drag-reorder.js';
import { TRAIT_LIBRARY, getLibraryTrait } from './libraries/traits.js';

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
const TABS = [
  {id:'character', label:'Персонаж', icon:'user'},
  {id:'actions', label:'Действия', icon:'bolt'},
  {id:'equipment', label:'Снаряжение', icon:'bag'},
  {id:'spells', label:'Заклинания', icon:'spark'},
  {id:'books', label:'Книги', icon:'book'},
  {id:'feats', label:'Черты', icon:'star'},
  {id:'more', label:'Ещё', icon:'dots'},
];
const ICONS = {
  user:'<circle cx="12" cy="8" r="3.4"/><path d="M4.5 20c1.5-4 4.5-6 7.5-6s6 2 7.5 6"/>',
  bolt:'<path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" stroke-linejoin="round"/>',
  bag:'<rect x="4" y="7" width="16" height="13" rx="2"/><path d="M8 7V6a4 4 0 0 1 8 0v1"/>',
  spark:'<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/>',
  book:'<path d="M4 5.5C4 4.7 4.7 4 5.5 4H12v16H5.5A1.5 1.5 0 0 1 4 18.5v-13Z"/><path d="M20 5.5c0-.8-.7-1.5-1.5-1.5H12v16h6.5c.8 0 1.5-.7 1.5-1.5v-13Z"/>',
  star:'<path d="M12 3.5l2.6 5.4 5.9.7-4.3 4.1 1.1 5.9-5.3-2.9-5.3 2.9 1.1-5.9-4.3-4.1 5.9-.7L12 3.5Z" stroke-linejoin="round"/>',
  dots:'<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
};
let activeTab = 'character';

function isPlay(){ return CH.mode === 'play'; }

function renderTopbar(title, subtitle){
  return `
    <div class="topbar">
      <div><div class="title">${title}</div><div class="sub">${subtitle||''}</div></div>
      <div class="mode-switch">
        <button class="mode-btn ${!isPlay()?'active':''}" data-mode="setup">Настройка</button>
        <button class="mode-btn play-active ${isPlay()?'active':''}" data-mode="play">Игра</button>
      </div>
    </div>
  `;
}
document.addEventListener('click', (e)=>{
  const btn = e.target.closest('[data-mode]');
  if(!btn) return;
  if(CH.mode === btn.dataset.mode) return;
  CH.mode = btn.dataset.mode;
  save();
  renderApp();
});

function renderNav(){
  const nav = document.getElementById('navbar');
  nav.innerHTML = TABS.map(t=>`
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
  const app = document.getElementById('app');
  let html = '';
  switch(activeTab){
    case 'character': html = renderCharacterTab(); break;
    case 'actions': html = renderActionsTab(); break;
    case 'equipment': html = renderEquipmentTab(); break;
    case 'spells': html = renderSpellsTab(); break;
    case 'books': html = renderBooksTab(); break;
    case 'feats': html = renderFeatsTab(); break;
    case 'more': html = renderMoreTab(); break;
  }
  app.innerHTML = html;
  wireCurrentTab();

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
    case 'actions': wireActionsTab(); break;
    case 'equipment': wireEquipmentTab(); break;
    case 'spells': wireSpellsTab(); break;
    case 'books': wireBooksTab(); break;
    case 'feats': wireFeatsTab(); break;
    case 'more': wireMoreTab(); break;
  }
}

/* small util: collapsible card header wiring */
function wireCollapsibles(root){
  root.querySelectorAll('[data-collapse-toggle]').forEach(h=>{
    h.addEventListener('click', ()=>{
      const key = h.dataset.collapseToggle;
      CH[key] = !CH[key];
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
  const lock = isPlay() ? 'disabled' : '';

  const abilityRows = ABILITY_DEFS.map(d=>{
    const st = a[d.id];
    return `
    <div class="ability-row">
      <div class="ability-name">${d.name}</div>
      <label class="partial-toggle ${st.partial?'active':''}" title="Частичное повышение (нужно два, чтобы поднять модификатор на +1, когда он уже +4 или больше)">
        <input type="checkbox" data-ability-partial="${d.id}" ${st.partial?'checked':''} ${lock}>½
      </label>
      <div class="ability-controls">
        <button class="btn btn-icon btn-sm" data-ability-flaw="${d.id}" ${lock}>−</button>
        <div class="ability-mod-wrap"><input type="number" class="ability-mod-input" data-ability-mod="${d.id}" value="${st.mod}" ${lock}></div>
        <button class="btn btn-icon btn-sm" data-ability-boost="${d.id}" ${lock}>+</button>
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
    return `
    <div class="skill-row" data-skill-id="${s.id}" data-reorder-id="${s.id}">
      ${!isPlay() ? `
      <span class="drag-handle" data-skill-drag-handle aria-label="Перетащить навык" title="Перетащить навык">⠿</span>` : ''}
      <div class="skill-name">
        <div class="n">${s.multi ? `<input type="text" class="skill-multi-name" data-skill-name="${s.id}" value="${escapeAttr(s.name)}" placeholder="Название" ${lock}>` : s.name}</div>
        <div class="a">${abilityShort(s.ability)}</div>
      </div>
      <div class="skill-prof">
        ${profDotsHtml(s.id, s.proficiency)}
      </div>
      <div class="skill-bonus-input">
        <input type="number" data-skill-bonus="${s.id}" value="${s.otherBonus||0}" title="доп. бонус" ${lock}>
      </div>
      <div class="skill-total">${fmtMod(total)}</div>
      ${s.multi ? `<button class="skill-del" data-skill-del="${s.id}" ${lock}>✕</button>` : '<span style="width:20px;display:inline-block;"></span>'}
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
        <div class="field">
          <input type="text" class="name-input" id="charName" placeholder="Имя персонажа" value="${escapeAttr(CH.name)}" ${lock}>
        </div>
        <div class="row2">
          <div class="field"><label class="field-label">Класс</label><input type="text" id="charClass" value="${escapeAttr(CH.className)}" ${lock}></div>
          <div class="field"><label class="field-label">Уровень</label><input type="number" id="charLevel" min="1" max="20" value="${CH.level}" ${lock}></div>
        </div>
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
            <div class="field"><label class="field-label">Родословная</label><input type="text" id="descAncestry" value="${escapeAttr(CH.descriptors.ancestry)}" ${lock}></div>
            <div class="field"><label class="field-label">Наследие</label><input type="text" id="descHeritage" value="${escapeAttr(CH.descriptors.heritage)}" ${lock}></div>
            <div class="field"><label class="field-label">Предыстория</label><input type="text" id="descBackground" value="${escapeAttr(CH.descriptors.background)}" ${lock}></div>
            <div class="field"><label class="field-label">Мировоззрение</label><input type="text" id="descAlignment" value="${escapeAttr(CH.descriptors.alignment)}" ${lock}></div>
            <div class="field"><label class="field-label">Божество</label><input type="text" id="descDeity" value="${escapeAttr(CH.descriptors.deity)}" ${lock}></div>
            <div class="field"><label class="field-label">Размер</label><input type="text" id="descSize" value="${escapeAttr(CH.descriptors.size)}" ${lock}></div>
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
          <div class="field"><label class="field-label">Внешность</label><textarea id="charAppearance" ${lock}>${escapeHtml_(CH.appearance)}</textarea></div>
          <div class="field" style="margin-bottom:0;"><label class="field-label">Заметки</label><textarea id="charNotes" ${lock}>${escapeHtml_(CH.notes)}</textarea></div>
        </div>
      </div>

      <div class="card">
        <div class="card-header" data-collapse-toggle="abilitiesCollapsed">
          <h3>Характеристики</h3>
          <svg class="chev ${!CH.abilitiesCollapsed?'open':''}" width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none"><path d="M6 9l6 6 6-6"/></svg>
        </div>
        <div class="card-body ${CH.abilitiesCollapsed?'collapsed':''}">
          <div class="ability-hint">Указывается сразу модификатор характеристики. Если модификатор уже +4 или больше, повышение сначала ставит отметку «½» — второе такое повышение поднимает модификатор на +1.</div>
          <div>${abilityRows}</div>
        </div>
      </div>

      <div class="card">
        <h3 style="margin-bottom:10px;">Здоровье</h3>
        <div class="hp-main">
          <span class="hp-num" id="hpCurrentDisplay">${CH.hp.current}</span><span class="hp-max"> / ${CH.hp.max}</span>
          ${CH.hp.temp>0 ? `<span class="pill" style="margin-left:8px;color:#8fb4de;border-color:#3a5474;">+${CH.hp.temp} врем.</span>`:''}
        </div>
        <div class="hp-bar"><div class="hp-bar-fill" style="width:${hpPct}%"></div><div class="hp-bar-temp" style="width:${tempPct}%;left:${hpPct}%"></div></div>
        <div class="hp-btns">
          <button class="btn hp-delta" data-delta="-5">-5</button>
          <button class="btn hp-delta" data-delta="-1">-1</button>
          <button class="btn hp-delta" data-delta="1">+1</button>
          <button class="btn hp-delta" data-delta="5">+5</button>
        </div>
        <div class="row2" style="margin-top:10px;">
          <div class="field" style="margin-bottom:0;"><label class="field-label">Текущие ОЗ</label><input type="number" id="hpCurrentInput" value="${CH.hp.current}"></div>
          <div class="field" style="margin-bottom:0;"><label class="field-label">Максимум ОЗ</label><input type="number" id="hpMaxInput" value="${CH.hp.max}" ${lock}></div>
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

      <div class="card">
        <h3 style="margin-bottom:10px;">Защита</h3>
        <div class="def-grid">
          <div class="def-box">
            <div class="def-title">Класс Доспеха</div>
            <div class="def-val">${acTotal}</div>
            <select data-ac-prof ${lock}>${profOptions(CH.defenses.ac.proficiency)}</select>
            <div class="mini-row">
              <input type="number" data-ac-armor placeholder="Бонус брони" value="${CH.defenses.ac.armorBonus||0}" title="Бонус брони" ${lock}>
              <input type="text" data-ac-dexcap placeholder="Кап Лов" value="${CH.defenses.ac.dexCap===null?'':CH.defenses.ac.dexCap}" title="Максимальный бонус Ловкости" ${lock}>
            </div>
            <div class="mini-row">
              <input type="number" data-ac-other placeholder="Прочее" value="${CH.defenses.ac.otherBonus||0}" title="Прочие бонусы" ${lock}>
            </div>
          </div>
          <div class="def-box">
            <div class="def-title">Стойкость</div>
            <div class="def-val">${fmtMod(fortTotal)}</div>
            <select data-save-prof="fort" ${lock}>${profOptions(CH.defenses.fort.proficiency)}</select>
            <div class="mini-row"><input type="number" data-save-other="fort" value="${CH.defenses.fort.otherBonus||0}" placeholder="Прочее" ${lock}></div>
            <label class="crit-toggle"><input type="checkbox" data-save-crit="fort" ${CH.defenses.fort.critUpgrade?'checked':''} ${lock}>Успех → крит. успех</label>
          </div>
          <div class="def-box">
            <div class="def-title">Реакция</div>
            <div class="def-val">${fmtMod(refTotal)}</div>
            <select data-save-prof="ref" ${lock}>${profOptions(CH.defenses.ref.proficiency)}</select>
            <div class="mini-row"><input type="number" data-save-other="ref" value="${CH.defenses.ref.otherBonus||0}" placeholder="Прочее" ${lock}></div>
            <label class="crit-toggle"><input type="checkbox" data-save-crit="ref" ${CH.defenses.ref.critUpgrade?'checked':''} ${lock}>Успех → крит. успех</label>
          </div>
          <div class="def-box">
            <div class="def-title">Воля</div>
            <div class="def-val">${fmtMod(willTotal)}</div>
            <select data-save-prof="will" ${lock}>${profOptions(CH.defenses.will.proficiency)}</select>
            <div class="mini-row"><input type="number" data-save-other="will" value="${CH.defenses.will.otherBonus||0}" placeholder="Прочее" ${lock}></div>
            <label class="crit-toggle"><input type="checkbox" data-save-crit="will" ${CH.defenses.will.critUpgrade?'checked':''} ${lock}>Успех → крит. успех</label>
          </div>
        </div>
      </div>

      <div class="card">
        <h3 style="margin-bottom:10px;">Восприятие</h3>
        <div class="def-box" style="margin-bottom:14px;">
          <div class="def-title">Внимательность</div>
          <div class="def-val">${fmtMod(perceptionTotal)}</div>
          <select data-perception-prof ${lock}>${profOptions(CH.perception.proficiency)}</select>
          <div class="mini-row"><input type="number" data-perception-other value="${CH.perception.otherBonus||0}" placeholder="Прочее" ${lock}></div>
        </div>
        ${senseGroupHtml('precise','Точные')}
        ${senseGroupHtml('imprecise','Вспомогательные')}
        ${senseGroupHtml('vague','Дополнительные')}
      </div>

      <div class="card">
        <h3 style="margin-bottom:10px;">Движение</h3>
        <div class="field">
          <label class="field-label">Наземная скорость (футы)</label>
          <input type="number" id="speedBase" value="${CH.speeds.base}" ${lock}>
        </div>
        ${CH.speeds.extra.length ? `<div style="margin-top:4px;">${CH.speeds.extra.map(s=>`
          <div class="extra-speed-row">
            <span>${escapeHtml(s.name)}${s.value ? ' — '+escapeHtml(s.value) : ''}</span>
            ${!isPlay() ? `<button data-speed-del="${s.id}">✕</button>` : ''}
          </div>
        `).join('')}</div>` : ''}
        ${!isPlay() ? `<button class="btn btn-sm" id="addSpeedBtn" style="margin-top:10px;">+ Доп. скорость</button>` : ''}
      </div>

      <div class="card">
        <h3 style="margin-bottom:6px;">Навыки</h3>
        <div>${skillRows}</div>
        <div class="row" style="margin-top:12px;">
          <button class="btn btn-accent btn-block" id="addLoreBtn" ${lock}>+ Знание</button>
          <button class="btn btn-accent btn-block" id="addCraftBtn" ${lock}>+ Ремесло</button>
        </div>
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

function wireCharacterTab(){
  const root = document.querySelector('.page.active');
  wireCollapsibles(root);

  byId('charName').addEventListener('input', e=>{ CH.name=e.target.value; save(); refreshTopbarOnly(); });
  byId('descAncestry').addEventListener('input', e=>{ CH.descriptors.ancestry=e.target.value; save(); });
  byId('descHeritage').addEventListener('input', e=>{ CH.descriptors.heritage=e.target.value; save(); });
  byId('descBackground').addEventListener('input', e=>{ CH.descriptors.background=e.target.value; save(); });
  byId('descAlignment').addEventListener('input', e=>{ CH.descriptors.alignment=e.target.value; save(); });
  byId('descDeity').addEventListener('input', e=>{ CH.descriptors.deity=e.target.value; save(); });
  byId('descSize').addEventListener('input', e=>{ CH.descriptors.size=e.target.value; save(); });
  byId('charAppearance').addEventListener('input', e=>{ CH.appearance=e.target.value; save(); });
  byId('charNotes').addEventListener('input', e=>{ CH.notes=e.target.value; save(); });
  byId('charClass').addEventListener('input', e=>{ CH.className=e.target.value; save(); renderApp(); });
  byId('charLevel').addEventListener('input', e=>{ CH.level=Number(e.target.value)||1; save(); renderApp(); });

  root.querySelectorAll('[data-mythic]').forEach(dot=>{
    dot.addEventListener('click', ()=>{
      const v = Number(dot.dataset.mythic);
      CH.mythicPoints = (CH.mythicPoints===v) ? v-1 : v;
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
    const matches = query ? TRAIT_LIBRARY.filter(t=>t.name.toLocaleLowerCase('ru').includes(query) || t.category.toLocaleLowerCase('ru').includes(query)).slice(0,6) : [];
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
    const trait = {type:'custom', name:v};
    if(v && !hasCharacterTrait(trait)){ CH.traits.push(trait); save(); renderApp(); }
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
    btn.addEventListener('click', ()=>{
      applyHpDelta(Number(btn.dataset.delta));
    });
  });
  byId('hpCurrentInput').addEventListener('input', e=>{ CH.hp.current = clamp(Number(e.target.value)||0, -9999, CH.hp.max); save(); renderApp(); });
  byId('hpMaxInput').addEventListener('input', e=>{ CH.hp.max = Math.max(0,Number(e.target.value)||0); save(); renderApp(); });
  byId('hpTempInput').addEventListener('input', e=>{ CH.hp.temp = Math.max(0,Number(e.target.value)||0); save(); renderApp(); });

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

  root.querySelector('[data-ac-prof]').addEventListener('change', e=>{ CH.defenses.ac.proficiency=e.target.value; save(); renderApp(); });
  root.querySelector('[data-ac-armor]').addEventListener('input', e=>{ CH.defenses.ac.armorBonus=Number(e.target.value)||0; save(); renderApp(); });
  root.querySelector('[data-ac-dexcap]').addEventListener('input', e=>{
    const v = e.target.value.trim();
    CH.defenses.ac.dexCap = v==='' ? null : Number(v);
    save(); renderApp();
  });
  root.querySelector('[data-ac-other]').addEventListener('input', e=>{ CH.defenses.ac.otherBonus=Number(e.target.value)||0; save(); renderApp(); });

  ['fort','ref','will'].forEach(key=>{
    root.querySelector(`[data-save-prof="${key}"]`).addEventListener('change', e=>{ CH.defenses[key].proficiency=e.target.value; save(); renderApp(); });
    root.querySelector(`[data-save-other="${key}"]`).addEventListener('input', e=>{ CH.defenses[key].otherBonus=Number(e.target.value)||0; save(); renderApp(); });
    root.querySelector(`[data-save-crit="${key}"]`).addEventListener('change', e=>{ CH.defenses[key].critUpgrade=e.target.checked; save(); });
  });

  root.querySelector('[data-perception-prof]').addEventListener('change', e=>{ CH.perception.proficiency=e.target.value; save(); renderApp(); });
  root.querySelector('[data-perception-other]').addEventListener('input', e=>{ CH.perception.otherBonus=Number(e.target.value)||0; save(); renderApp(); });

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

  byId('addLoreBtn').addEventListener('click', ()=>{
    CH.skills.push({id:uid(), name:'Знание (…)', ability:'int', proficiency:'untrained', otherBonus:0, multi:true});
    save(); renderApp();
  });
  byId('addCraftBtn').addEventListener('click', ()=>{
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
    const matches = query ? TRAIT_LIBRARY.filter(t => t.name.toLocaleLowerCase('ru').includes(query) || t.category.toLocaleLowerCase('ru').includes(query)).slice(0, 6) : [];
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
    const tag = {type:'custom', name:v};
    if(v && !hasTag(tag)) tags.push(tag);
    if(v){ input.value=''; renderSuggestions(); renderChips(); input.focus(); }
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
  root.querySelectorAll('[data-item-toggle]').forEach(head=>{
    head.addEventListener('click', ()=>{
      const body = head.parentElement.querySelector('.list-item-body');
      body.classList.toggle('open');
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

function ensureCurrencyItems(){
  CURRENCY_DEFS.forEach(c=>{
    if(!CH.equipment.items.find(i=>i.isCurrency && i.currencyKey===c.key)){
      CH.equipment.items.push({id:uid(), name:c.name, qty:0, bulk:0, location:'carried', note:'', isCurrency:true, currencyKey:c.key, custom:false});
    }
  });
}

function locationLabel(loc){
  if(loc==='worn') return 'Надето';
  if(loc==='carried') return 'В рюкзаке';
  const st = CH.equipment.storages.find(s=>s.id===loc);
  return st ? st.name : 'В рюкзаке';
}
function locationOptions(current){
  let opts = [`<option value="worn" ${current==='worn'?'selected':''}>Надето</option>`,
              `<option value="carried" ${current==='carried'?'selected':''}>В рюкзаке</option>`];
  CH.equipment.storages.forEach(s=>{
    opts.push(`<option value="${s.id}" ${current===s.id?'selected':''}>${escapeHtml(s.name)}</option>`);
  });
  return opts.join('');
}
function itemBulkValue(item){
  if(item.isCurrency){
    // 1000 монет = 1 объём (по правилам)
    return (Number(item.qty||0)/1000);
  }
  return Number(item.bulk||0) * Number(item.qty||1);
}

function renderEquipmentTab(){
  ensureCurrencyItems();
  const items = CH.equipment.items;
  const worn = items.filter(i=>i.location==='worn');
  const carried = items.filter(i=>i.location==='carried');
  const carriedTotalBulk = worn.concat(carried).reduce((s,i)=>s+itemBulkValue(i),0);

  const strMod = CH.abilities.str.mod;
  const encumbered = 5 + strMod;
  const maxBulk = 10 + strMod;
  const bulkPct = clamp((carriedTotalBulk/maxBulk)*100, 0, 100);

  function itemRow(i, group){
    if(i.isCurrency){
      return `
      <div class="eq-item" data-item-id="${i.id}">
        <div class="nm"><div class="n">${escapeHtml(i.name)}</div></div>
        <div class="qty"><input type="number" min="0" data-qty="${i.id}" value="${i.qty}"></div>
        <select class="locsel" data-loc="${i.id}">${locationOptions(i.location)}</select>
        <span style="width:18px;display:inline-block"></span>
      </div>`;
    }
    return `
    <div class="list-item" data-item-id="${i.id}" data-reorder-id="${i.id}" data-reorder-group="${i.location}">
      <div class="list-item-head" data-item-toggle>
        <div class="nm">
          <div class="n">${escapeHtml(i.name)}</div>
          <div class="meta">объём ${i.bulk||0}${i.note ? ' · '+escapeHtml(i.note) : ''}</div>
          ${tagsMetaHtml(i.traits)}
        </div>
      </div>
      <div class="eq-item-controls">
        <span class="drag-handle" data-equipment-drag-handle aria-label="Перетащить предмет" title="Перетащить предмет">⠿</span>
        <div class="qty"><input type="number" min="0" data-qty="${i.id}" value="${i.qty}"></div>
        <select class="locsel" data-loc="${i.id}">${locationOptions(i.location)}</select>
        <button class="skill-del" data-item-edit="${i.id}" title="Изменить">✎</button>
        ${i.custom !== false ? `<button class="skill-del" data-item-del="${i.id}">✕</button>` : '<span style="width:18px;display:inline-block"></span>'}
      </div>
      <div class="list-item-body">${i.desc ? escapeHtml(i.desc) : 'Нет описания'}</div>
    </div>`;
  }

  const wornHtml = worn.map(i=>itemRow(i, worn)).join('') || '<div class="empty-hint">Ничего не надето</div>';
  const carriedHtml = carried.map(i=>itemRow(i, carried)).join('') || '<div class="empty-hint">Рюкзак пуст</div>';

  const storagesHtml = CH.equipment.storages.map(st=>{
    const stItems = items.filter(i=>i.location===st.id);
    return `
    <div class="card" data-storage-id="${st.id}">
      <div class="card-header">
        <h3>${escapeHtml(st.name)}</h3>
        <button class="btn btn-sm btn-danger" data-storage-del="${st.id}">Удалить раздел</button>
      </div>
      <div class="card-body" style="display:block;">
        ${stItems.map(i=>itemRow(i, stItems)).join('') || '<div class="empty-hint">Пусто</div>'}
      </div>
    </div>`;
  }).join('');

  return `
    ${renderTopbar('Снаряжение', `Носимый объём: ${carriedTotalBulk.toFixed(2)} / ${maxBulk}`)}
    <div class="page active">

      <div class="card">
        <div class="weight-summary"><span>Носимый объём</span><span>${carriedTotalBulk.toFixed(2)} / ${maxBulk} (утомление с ${encumbered})</span></div>
        <div class="weight-bar"><div class="weight-bar-fill" style="width:${bulkPct}%"></div></div>
      </div>

      <div class="card">
        <h3 style="margin-bottom:8px;">Надето</h3>
        ${wornHtml}
      </div>

      <div class="card">
        <h3 style="margin-bottom:8px;">В рюкзаке</h3>
        ${carriedHtml}
      </div>

      ${storagesHtml}

      <div class="row" style="margin-bottom:12px;">
        <button class="btn btn-accent btn-block" id="addItemBtn">+ Добавить предмет</button>
        <button class="btn btn-block" id="addStorageBtn">+ Доп. раздел</button>
      </div>
    </div>
  `;
}

function itemFormHtml(i){
  i = i || {name:'', qty:1, bulk:0, note:'', location:'carried', desc:''};
  return `
    <div class="field"><label class="field-label">Название</label><input type="text" id="mfName" value="${escapeAttr(i.name)}"></div>
    <div class="row2">
      <div class="field"><label class="field-label">Количество</label><input type="number" id="mfQty" min="0" value="${i.qty}"></div>
      <div class="field"><label class="field-label">Объём (Bulk) за штуку</label><input type="number" step="0.1" id="mfBulk" value="${i.bulk}"></div>
    </div>
    <div class="field"><label class="field-label">Где находится</label><select id="mfLoc">${locationOptions(i.location)}</select></div>
    <div class="field"><label class="field-label">Заметка</label><input type="text" id="mfNote" value="${escapeAttr(i.note)}"></div>
    <div class="field"><label class="field-label">Описание</label><textarea id="mfDesc">${escapeHtml_(i.desc)}</textarea></div>
    <div class="field"><label class="field-label">Дескрипторы</label><div id="mfTagsContainer"></div></div>
  `;
}

function wireEquipmentTab(){
  const root = document.querySelector('.page.active');
  wireListItemToggles(root);

  root.querySelectorAll('[data-qty]').forEach(inp=>{
    inp.addEventListener('input', ()=>{
      const it = CH.equipment.items.find(x=>x.id===inp.dataset.qty);
      it.qty = Math.max(0, Number(inp.value)||0); save(); renderApp();
    });
  });
  root.querySelectorAll('[data-loc]').forEach(sel=>{
    sel.addEventListener('change', ()=>{
      const it = CH.equipment.items.find(x=>x.id===sel.dataset.loc);
      it.location = sel.value; save(); renderApp();
    });
  });
  root.querySelectorAll('[data-item-del]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      CH.equipment.items = CH.equipment.items.filter(x=>x.id!==btn.dataset.itemDel);
      save(); renderApp();
    });
  });
  enableTouchReorder({
    root, itemSelector: '.list-item[data-item-id]', handleSelector: '[data-equipment-drag-handle]',
    groupForItem: item => item.dataset.reorderGroup,
    onReorder: (location, ids) => {
      const ordered = ids.map(id => CH.equipment.items.find(item => item.id === id));
      let position = 0;
      CH.equipment.items = CH.equipment.items.map(item => item.location === location && !item.isCurrency ? ordered[position++] : item);
      save(); renderApp();
    },
  });
  root.querySelectorAll('[data-item-edit]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const it = CH.equipment.items.find(x=>x.id===btn.dataset.itemEdit);
      openModal('Изменить предмет', itemFormHtml(it) + `
        <div class="modal-actions">
          <button class="btn btn-block" id="mfCancel">Отмена</button>
          <button class="btn btn-accent btn-block" id="mfSave">Сохранить</button>
        </div>
      `, (m)=>{
        const tagEditor = createTagEditor(it.traits||[]);
        byId('mfTagsContainer').appendChild(tagEditor.el);
        byId('mfCancel').addEventListener('click', closeModal);
        byId('mfSave').addEventListener('click', ()=>{
          it.name = byId('mfName').value || it.name;
          it.qty = Number(byId('mfQty').value)||0;
          it.bulk = Number(byId('mfBulk').value)||0;
          it.location = byId('mfLoc').value;
          it.note = byId('mfNote').value;
          it.desc = byId('mfDesc').value;
          it.traits = tagEditor.getTags();
          save(); closeModal(); renderApp();
        });
      });
    });
  });
  root.querySelectorAll('[data-storage-del]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const sid = btn.dataset.storageDel;
      CH.equipment.storages = CH.equipment.storages.filter(x=>x.id!==sid);
      CH.equipment.items.forEach(i=>{ if(i.location===sid) i.location='carried'; });
      save(); renderApp();
    });
  });

  byId('addItemBtn').addEventListener('click', ()=>{
    openModal('Новый предмет', itemFormHtml() + `
      <div class="modal-actions">
        <button class="btn btn-block" id="mfCancel">Отмена</button>
        <button class="btn btn-accent btn-block" id="mfSave">Добавить</button>
      </div>
    `, ()=>{
      const tagEditor = createTagEditor([]);
      byId('mfTagsContainer').appendChild(tagEditor.el);
      byId('mfCancel').addEventListener('click', closeModal);
      byId('mfSave').addEventListener('click', ()=>{
        CH.equipment.items.push({
          id:uid(), name:byId('mfName').value||'Без названия', qty:Number(byId('mfQty').value)||0,
          bulk:Number(byId('mfBulk').value)||0, location:byId('mfLoc').value, note:byId('mfNote').value,
          desc: byId('mfDesc').value, isCurrency:false, custom:true, traits: tagEditor.getTags()
        });
        save(); closeModal(); renderApp();
      });
    });
  });

  byId('addStorageBtn').addEventListener('click', ()=>{
    openModal('Новый раздел хранения', `
      <div class="field"><label class="field-label">Название (напр. «Дом», «Банк»)</label><input type="text" id="mfStorageName"></div>
      <div class="modal-actions">
        <button class="btn btn-block" id="mfCancel">Отмена</button>
        <button class="btn btn-accent btn-block" id="mfSave">Создать</button>
      </div>
    `, ()=>{
      byId('mfCancel').addEventListener('click', closeModal);
      byId('mfSave').addEventListener('click', ()=>{
        const name = byId('mfStorageName').value.trim();
        if(!name) return;
        CH.equipment.storages.push({id:uid(), name});
        save(); closeModal(); renderApp();
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
  });
}

function renderSpellsTab(){
  const sc = CH.spellcasting;
  syncPreparedSlots();
  const mod = CH.abilities[sc.ability].mod;
  const dc = 10 + mod + profTotal(sc.proficiency, CH.level);
  const atk = mod + profTotal(sc.proficiency, CH.level);

  const lock = isPlay() ? 'disabled' : '';
  const typeOptions = [['none','Нет заклинаний'],['spontaneous','Спонтанный (Чародей)'],['prepared','Подготавливающий (Волшебник)']]
    .map(([v,l])=>`<option value="${v}" ${v===sc.type?'selected':''}>${l}</option>`).join('');

  const slotsConfig = SPELL_LEVELS.map(lvl=>`
    <div class="stat-box" style="padding:6px 4px;">
      <div class="lbl">${lvl===0?'Заг.':'Ур.'+lvl}</div>
      <input type="number" min="0" data-slot-max="${lvl}" value="${sc.slotsMax[lvl]||0}" ${lock}>
    </div>
  `).join('');

  let castingBody = '';
  if(sc.type === 'spontaneous'){
    castingBody = SPELL_LEVELS.filter(l=>Number(sc.slotsMax[l])>0).map(lvl=>{
      const used = Number(sc.slotsUsed[lvl]||0), max = Number(sc.slotsMax[lvl]||0);
      return `
      <div class="row" style="align-items:center;margin-bottom:8px;">
        <div style="flex:0 0 70px;font-size:13px;color:var(--text-dim);">${lvl===0?'Заговоры':'Ур. '+lvl}</div>
        <div style="flex:1;text-align:center;font-weight:600;">${max-used} / ${max}</div>
        <button class="btn btn-sm" data-slot-used="-1|${lvl}">−</button>
        <button class="btn btn-sm" data-slot-used="1|${lvl}">+</button>
      </div>`;
    }).join('') || '<div class="empty-hint">Настройте ячейки выше</div>';
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
      const boxes = slots.map((slot,idx)=>{
        const spell = slot.spellId ? CH.books.spellbook.find(s=>s.id===slot.spellId) : null;
        return `
        <div class="slot-box">
          <div>Ячейка ${idx+1}</div>
          <select data-prep-slot="${lvl}|${idx}">${bookOptions(slot.spellId)}</select>
        </div>`;
      }).join('');
      return `<div style="margin-bottom:14px;"><div class="field-label" style="margin-bottom:6px;">${lvl===0?'Заговоры':'Уровень '+lvl}</div><div class="slot-grid">${boxes}</div></div>`;
    }).join('') || '<div class="empty-hint">Настройте ячейки выше</div>';
  }

  const focus = sc.focus;
  const focusMax = Math.min(focus.spellIds.length, 3);
  const focusUsed = Math.min(focus.used||0, focusMax);

  let preparedCardsHtml = '';
  if(sc.type === 'prepared'){
    preparedCardsHtml = SPELL_LEVELS.filter(l=>Number(sc.slotsMax[l])>0).map(lvl=>{
      const slots = sc.prepared[lvl] || [];
      const cards = slots.map((slot,idx)=>{
        if(!slot.spellId) return '';
        const sp = CH.books.spellbook.find(s=>s.id===slot.spellId);
        if(!sp) return '';
        return `
        <div class="list-item">
          <div class="list-item-head" data-item-toggle>
            <div><div class="name">${escapeHtml(sp.name)}</div><div class="tag">Ячейка ${idx+1}${sp.tradition?' · '+escapeHtml(sp.tradition):''}</div>${tagsMetaHtml(sp.traits)}</div>
            <label class="prep-exp-label"><input type="checkbox" class="prep-exp-checkbox" data-prep-exp="${lvl}|${idx}" ${slot.expended?'checked':''}> исп.</label>
          </div>
          <div class="list-item-body">${escapeHtml(sp.desc)||'Без описания'}</div>
        </div>`;
      }).join('');
      if(!cards.trim()) return '';
      return `<div style="margin-bottom:12px;"><div class="field-label" style="margin-bottom:6px;">${lvl===0?'Заговоры':'Уровень '+lvl}</div>${cards}</div>`;
    }).join('');
    if(!preparedCardsHtml.trim()) preparedCardsHtml = '<div class="empty-hint">Нет подготовленных заклинаний — заполните ячейки выше</div>';
  }

  const focusSpellItems = focus.spellIds.map(id=>{
    const sp = CH.books.spellbook.find(s=>s.id===id);
    if(!sp) return '';
    return `
    <div class="list-item">
      <div class="list-item-head" data-item-toggle>
        <div><div class="name">${escapeHtml(sp.name)}</div><div class="tag">Уровень ${sp.level}${sp.tradition?' · '+escapeHtml(sp.tradition):''}</div>${tagsMetaHtml(sp.traits)}</div>
      </div>
      <div class="list-item-body">
        <div>${escapeHtml(sp.desc)||'Без описания'}</div>
        ${!isPlay() ? `<div class="list-item-actions"><button class="btn btn-sm btn-danger" data-focus-remove="${id}">Убрать из фокальных</button></div>` : ''}
      </div>
    </div>`;
  }).join('') || '<div class="empty-hint">Пока нет фокальных заклинаний</div>';

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
        <div class="field"><label class="field-label">Тип заклинателя</label><select id="scType" ${lock}>${typeOptions}</select></div>
        <div class="row2">
          <div class="field"><label class="field-label">Характеристика</label><select id="scAbility" ${lock}>${ABILITY_OPTIONS}</select></div>
          <div class="field"><label class="field-label">Владение</label><select id="scProf" ${lock}>${PROF_RANKS.map(r=>`<option value="${r}" ${r===sc.proficiency?'selected':''}>${PROF_LABEL[r]}</option>`).join('')}</select></div>
        </div>
        <div class="row2">
          <div class="def-box" style="text-align:center;"><div class="def-title">Сл. заклинаний</div><div class="def-val">${dc}</div></div>
          <div class="def-box" style="text-align:center;"><div class="def-title">Атака заклинанием</div><div class="def-val">${fmtMod(atk)}</div></div>
        </div>
      </div>

      <div class="card">
        <h3 style="margin-bottom:8px;">Ячейки заклинаний</h3>
        <div class="stat-grid" style="grid-template-columns:repeat(6,1fr);">${slotsConfig}</div>
      </div>

      ${sc.type!=='none' ? `
      <div class="card">
        <div class="card-header" data-collapse-toggle="spellSlotsCollapsed">
          <h3>${sc.type==='spontaneous' ? 'Использование ячеек' : 'Заполнение ячеек'}</h3>
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
        <h3 style="margin-bottom:4px;">Фокальные заклинания</h3>
        <div class="ability-hint">Тратятся за очки фокуса, а не за ячейки. Очков столько же, сколько известно фокальных заклинаний, но не больше 3.</div>
        <div class="row" style="align-items:center;margin-bottom:10px;">
          <div style="flex:1;font-size:13px;color:var(--text-dim);">Очки фокуса</div>
          <div style="font-weight:700;font-size:16px;">${focusMax-focusUsed} / ${focusMax}</div>
          <button class="btn btn-sm" data-focus-delta="-1" ${focusMax===0?'disabled':''}>−</button>
          <button class="btn btn-sm" data-focus-delta="1" ${focusMax===0?'disabled':''}>+</button>
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

  byId('scType').addEventListener('change', e=>{ sc.type=e.target.value; save(); renderApp(); });
  byId('scAbility').value = sc.ability;
  byId('scAbility').addEventListener('change', e=>{ sc.ability=e.target.value; save(); renderApp(); });
  byId('scProf').addEventListener('change', e=>{ sc.proficiency=e.target.value; save(); renderApp(); });

  root.querySelectorAll('[data-slot-max]').forEach(inp=>{
    inp.addEventListener('input', ()=>{
      sc.slotsMax[inp.dataset.slotMax] = Math.max(0, Number(inp.value)||0);
      save(); renderApp();
    });
  });
  root.querySelectorAll('[data-slot-used]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const [d, lvl] = btn.dataset.slotUsed.split('|');
      const max = Number(sc.slotsMax[lvl]||0);
      let used = Number(sc.slotsUsed[lvl]||0) + Number(d);
      sc.slotsUsed[lvl] = clamp(used, 0, max);
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
  root.querySelectorAll('.prep-exp-label').forEach(label=>{
    label.addEventListener('click', (e)=>{
      e.stopPropagation();
      const chk = label.querySelector('[data-prep-exp]');
      const [lvl, idx] = chk.dataset.prepExp.split('|');
      sc.prepared[lvl][idx].expended = chk.checked;
      save();
    });
  });

  root.querySelectorAll('[data-focus-delta]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const d = Number(btn.dataset.focusDelta);
      const max = Math.min(sc.focus.spellIds.length, 3);
      sc.focus.used = clamp(Number(sc.focus.used||0) + d, 0, max);
      save(); renderApp();
    });
  });
  root.querySelectorAll('[data-focus-remove]').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      e.stopPropagation();
      sc.focus.spellIds = sc.focus.spellIds.filter(x=>x!==btn.dataset.focusRemove);
      const newMax = Math.min(sc.focus.spellIds.length, 3);
      sc.focus.used = clamp(Number(sc.focus.used||0), 0, newMax);
      save(); renderApp();
    });
  });
  const focusAddBtn = byId('focusAddBtn');
  if(focusAddBtn) focusAddBtn.addEventListener('click', ()=>{
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
        <div class="list-item-actions">
          <button class="btn btn-sm" data-edit-spell="${sp.id}">Изменить</button>
          <button class="btn btn-sm btn-danger" data-del-spell="${sp.id}">Удалить</button>
        </div>
      </div>
    </div>`).join('') || '<div class="empty-hint">Книга заклинаний пуста</div>';

  const formulaItems = formulas.map(f=>`
    <div class="list-item">
      <div class="list-item-head" data-item-toggle>
        <div><div class="name">${escapeHtml(f.name)}</div><div class="tag">Уровень ${f.level}</div></div>
      </div>
      <div class="list-item-body">
        <div>${escapeHtml(f.note)||'Без описания'}</div>
        <div class="list-item-actions">
          <button class="btn btn-sm" data-edit-formula="${f.id}">Изменить</button>
          <button class="btn btn-sm btn-danger" data-del-formula="${f.id}">Удалить</button>
        </div>
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
        <button class="btn btn-accent btn-block" id="addSpellBtn" style="margin-bottom:12px;">+ Добавить заклинание</button>
        ${spellItems}
      ` : `
        <button class="btn btn-accent btn-block" id="addFormulaBtn" style="margin-bottom:12px;">+ Добавить формулу</button>
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
    </div>`).join('') || '<div class="empty-hint">Черт пока нет</div>';

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
   TAB: ЕЩЁ (экспорт/импорт XML, сброс)
   ========================================================================= */
function renderMoreTab(){
  const savedDate = CH.meta.savedAt ? new Date(CH.meta.savedAt).toLocaleString('ru-RU') : '—';
  const profiles = listCharacterProfiles();
  return `
    ${renderTopbar('Ещё', '')}
    <div class="page active">
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
      </div>
    </div>
  `;
}

function wireMoreTab(){
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
renderApp();
