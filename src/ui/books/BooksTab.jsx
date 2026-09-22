import { useState } from 'react';
import { sanitizeSpellAssignments, uid } from '../../domain/character-state.js';
import { emptyCustomItem, FORMULA_CATEGORY_LABELS, isFormulaRune, ITEM_CATEGORY_LABELS, normalizeFormulaCategory } from '../../domain/libraries/items.js';
import { instantiateLibraryRune, RUNE_SLOT_LABELS, searchLibraryRunes } from '../../domain/libraries/runes.js';
import { isAutoHeightenSpell, autoHeightenRank } from '../../domain/libraries/traits.js';
import { formatBulk, isPlay } from '../../lib/rules.js';
import {
  cloneSpellEntry, emptyRuneFormula, normalizeCastCost, spellBookGroupKeys, spellRankText, storedSpellLevel,
} from '../../lib/spells.js';
import { cloneFormulaToEquipment, itemStatsText } from '../equipment/eqLogic.js';
import { openItemEditor } from '../equipment/ItemEditor.jsx';
import { patch, toast, useCharacter, useSheet } from '../../state/store.js';
import { Topbar } from '../shell.jsx';
import { CastCost, CastPicker, ListItem, TagEditor, TraitMeta } from '../shared.jsx';
import { Chev } from '../icons.jsx';

export default function BooksTab() {
  const ch = useCharacter();
  const play = isPlay(ch);
  const booksSection = useSheet(s => s.booksSection);
  const setBooksSection = useSheet(s => s.setBooksSection);
  const openModal = useSheet(s => s.openModal);
  const section = booksSection === 'curriculum' && !ch.curriculumEnabled ? 'spellbook' : booksSection;

  const tabs = [
    { id: 'spellbook', label: 'Заклинания' },
    ...(ch.curriculumEnabled ? [{ id: 'curriculum', label: 'Учебный план' }] : []),
    { id: 'rituals', label: 'Ритуалы' },
    { id: 'formulas', label: 'Формулы' },
  ];

  return (
    <>
      <Topbar title="Книги" subtitle={ch.curriculumEnabled ? 'Заклинания, учебный план, ритуалы и формулы' : 'Заклинания, ритуалы и формулы'} />
      <div className="page active">
        <div className="section-tabs">
          {tabs.map(t => (
            <div key={t.id} className={`section-tab ${section === t.id ? 'active' : ''}`} onClick={() => setBooksSection(t.id)}>{t.label}</div>
          ))}
        </div>
        {section === 'spellbook' ? (
          <>
            {play ? null : <button type="button" className="btn btn-accent btn-block" style={{ marginBottom: 12 }} onClick={() => openSpellForm(null, 'spellbook')}>+ Добавить заклинание</button>}
            <SpellGroups list={ch.books.spellbook || []} prefix="sp:" kind="spellbook" empty="Книга заклинаний пуста" />
          </>
        ) : section === 'curriculum' ? (
          <>
            {play ? null : <button type="button" className="btn btn-accent btn-block" style={{ marginBottom: 12 }} onClick={() => openSpellForm(null, 'curriculum')}>+ Добавить в учебный план</button>}
            <SpellGroups list={ch.books.curriculum || []} prefix="cu:" kind="curriculum" empty="Учебный план пуст" />
          </>
        ) : section === 'rituals' ? (
          <>
            {play ? null : <button type="button" className="btn btn-accent btn-block" style={{ marginBottom: 12 }} onClick={() => openRitualForm(null)}>+ Добавить ритуал</button>}
            <RitualGroups />
          </>
        ) : (
          <>
            {play ? null : (
              <div className="eq-toolbar" style={{ marginBottom: 12 }}>
                <button type="button" className="btn btn-accent btn-block" onClick={() => {
                  const item = emptyCustomItem('other', uid);
                  item.location = 'formula';
                  item.qty = 1;
                  item.runes = [];
                  openItemEditor({
                    title: 'Новая формула',
                    item,
                    saveLabel: 'Добавить',
                    isNew: true,
                    formula: true,
                    onSaved: saved => useSheet.getState().openBookGroup('fm:' + normalizeFormulaCategory(saved.category)),
                  });
                }}>+ Добавить формулу</button>
                <button type="button" className="btn btn-block" onClick={() => openRuneFormulaForm(emptyRuneFormula(), true)}>+ Формула руны</button>
              </div>
            )}
            <FormulaGroups />
          </>
        )}
      </div>
    </>
  );
}

function isBookGroupCollapsed(ch, key) {
  const map = ch.booksCollapsed && typeof ch.booksCollapsed === 'object' ? ch.booksCollapsed : {};
  return map[key] !== false;
}
function toggleBookGroup(key) {
  patch(c => {
    if (!c.booksCollapsed || typeof c.booksCollapsed !== 'object') c.booksCollapsed = {};
    c.booksCollapsed[key] = !isBookGroupCollapsed(c, key);
  });
}

function BookGroup({ groupKey, title, count, children }) {
  const ch = useCharacter();
  if (!count) return null;
  const collapsed = isBookGroupCollapsed(ch, groupKey);
  return (
    <div className="card book-group">
      <div className="card-header" onClick={() => toggleBookGroup(groupKey)}>
        <h3>{title} · {count}</h3>
        <Chev open={!collapsed} />
      </div>
      <div className={`card-body ${collapsed ? 'collapsed' : ''}`}>{children}</div>
    </div>
  );
}

function SpellGroups({ list, prefix, kind, empty }) {
  const byKey = { cantrip: [], focus: [] };
  for (let i = 1; i <= 10; i++) byKey['rank:' + i] = [];
  (list || []).forEach(sp => {
    spellBookGroupKeys(sp).forEach(key => {
      if (byKey[key]) byKey[key].push(sp);
    });
  });
  const order = ['cantrip', 'focus'].concat(Array.from({ length: 10 }, (_, i) => 'rank:' + (i + 1)));
  const labels = { cantrip: 'Фокусы', focus: 'Фокальные' };
  const groups = order.map(key => {
    const items = (byKey[key] || []).slice().sort((a, b) => a.name.localeCompare(b.name, 'ru'));
    const title = labels[key] || (key.startsWith('rank:') ? (key.slice(5) + ' круг') : key);
    return (
      <BookGroup key={key} groupKey={prefix + key} title={title} count={items.length}>
        {items.map(sp => <SpellCard key={sp.id} sp={sp} kind={kind} />)}
      </BookGroup>
    );
  });
  if (!(list || []).length) return <div className="empty-hint">{empty}</div>;
  return <>{groups}</>;
}

function SpellCard({ sp, kind }) {
  const ch = useCharacter();
  const play = isPlay(ch);
  return (
    <ListItem
      id={(kind === 'curriculum' ? 'currsp-' : 'sp-') + sp.id}
      head={
        <div>
          <div className="name-row"><span className="name">{sp.name}</span><CastCost cast={sp.cast} /></div>
          <div className="tag">{spellRankText(sp, ch.level)}{sp.tradition ? ' · ' + sp.tradition : ''}</div>
          <TraitMeta tags={sp.traits} />
        </div>
      }
      body={
        <>
          <div>{sp.desc || 'Без описания'}</div>
          {play ? null : (
            <div className="list-item-actions">
              <button type="button" className="btn btn-sm" onClick={() => openSpellForm(sp, kind)}>Изменить</button>
              {kind === 'curriculum'
                ? <button type="button" className="btn btn-sm" onClick={() => {
                  patch(c => {
                    const copy = cloneSpellEntry(sp);
                    c.books.spellbook.push(copy);
                    if (!c.booksCollapsed || typeof c.booksCollapsed !== 'object') c.booksCollapsed = {};
                    c.booksCollapsed['sp:' + spellBookGroupKeys(copy)[0]] = false;
                  });
                  toast('Скопировано в книгу заклинаний');
                }}>В книгу</button>
                : (ch.curriculumEnabled ? <button type="button" className="btn btn-sm" onClick={() => {
                  patch(c => {
                    if (!Array.isArray(c.books.curriculum)) c.books.curriculum = [];
                    const copy = cloneSpellEntry(sp);
                    c.books.curriculum.push(copy);
                    if (!c.booksCollapsed || typeof c.booksCollapsed !== 'object') c.booksCollapsed = {};
                    c.booksCollapsed['cu:' + spellBookGroupKeys(copy)[0]] = false;
                  });
                  toast('Скопировано в учебный план');
                }}>В учебный план</button> : null)}
              <button type="button" className="btn btn-sm btn-danger" onClick={() => patch(c => {
                if (kind === 'curriculum') {
                  c.books.curriculum = (c.books.curriculum || []).filter(x => x.id !== sp.id);
                  const cu = c.spellcasting.curriculumPrepared || {};
                  Object.keys(cu).forEach(lvl => {
                    if (cu[lvl] && cu[lvl].spellId === sp.id) {
                      cu[lvl].spellId = null;
                      cu[lvl].expended = false;
                    }
                  });
                } else {
                  c.books.spellbook = c.books.spellbook.filter(x => x.id !== sp.id);
                  Object.values(c.spellcasting.prepared).forEach(arr => arr.forEach(s => {
                    if (s.spellId === sp.id) { s.spellId = null; s.expended = false; }
                  }));
                  c.spellcasting.focus.spellIds = (c.spellcasting.focus.spellIds || []).filter(x => x !== sp.id);
                }
                sanitizeSpellAssignments(c);
              })}>Удалить</button>
            </div>
          )}
        </>
      }
    />
  );
}

function RitualGroups() {
  const ch = useCharacter();
  const play = isPlay(ch);
  const byRank = {};
  for (let i = 1; i <= 10; i++) byRank[i] = [];
  (ch.books.rituals || []).forEach(r => {
    const lvl = Math.max(1, Math.min(10, Number(r.level) || 1));
    byRank[lvl].push(r);
  });
  const groups = Array.from({ length: 10 }, (_, i) => i + 1).map(lvl => {
    const list = byRank[lvl].slice().sort((a, b) => a.name.localeCompare(b.name, 'ru'));
    return (
      <BookGroup key={lvl} groupKey={'rt:' + lvl} title={lvl + ' круг'} count={list.length}>
        {list.map(r => (
          <ListItem
            key={r.id}
            id={'rt-' + r.id}
            head={
              <div>
                <div className="name">{r.name}</div>
                <div className="tag">{r.level + ' круг'}</div>
                <TraitMeta tags={r.traits} />
              </div>
            }
            body={
              <>
                <div>{r.desc || 'Без описания'}</div>
                {play ? null : (
                  <div className="list-item-actions">
                    <button type="button" className="btn btn-sm" onClick={() => openRitualForm(r)}>Изменить</button>
                    <button type="button" className="btn btn-sm btn-danger" onClick={() => patch(c => { c.books.rituals = c.books.rituals.filter(x => x.id !== r.id); })}>Удалить</button>
                  </div>
                )}
              </>
            }
          />
        ))}
      </BookGroup>
    );
  });
  if (!(ch.books.rituals || []).length) return <div className="empty-hint">Книга ритуалов пуста</div>;
  return <>{groups}</>;
}

function FormulaGroups() {
  const ch = useCharacter();
  const play = isPlay(ch);
  const cats = Object.keys(FORMULA_CATEGORY_LABELS);
  const byCat = {};
  cats.forEach(c => { byCat[c] = []; });
  (ch.books.formulas || []).forEach(item => {
    const cat = normalizeFormulaCategory(item.category);
    (byCat[cat] || byCat.other).push(item);
  });
  const groups = cats.map(cat => {
    const list = byCat[cat].slice().sort((a, b) => a.name.localeCompare(b.name, 'ru'));
    return (
      <BookGroup key={cat} groupKey={'fm:' + cat} title={FORMULA_CATEGORY_LABELS[cat]} count={list.length}>
        {list.map(item => {
          const rune = isFormulaRune(item);
          const catLabel = (rune ? FORMULA_CATEGORY_LABELS.rune : ITEM_CATEGORY_LABELS[item.category]) || '';
          const extra = rune
            ? (RUNE_SLOT_LABELS[item.runeSlot] ? ' · ' + RUNE_SLOT_LABELS[item.runeSlot] : '')
            : ' · объём ' + formatBulk(item.bulk);
          return (
            <ListItem
              key={item.id}
              id={'fm-' + item.id}
              head={
                <div>
                  <div className="name">{item.name}</div>
                  <div className="tag">{catLabel}{extra}{item.note ? ' · ' + item.note : ''}</div>
                  {rune ? null : <ItemStatsLine ch={ch} item={item} />}
                  <TraitMeta tags={item.traits} />
                </div>
              }
              body={
                <>
                  <div>{item.desc || 'Без описания'}</div>
                  {play ? null : (
                    <div className="list-item-actions">
                      <button type="button" className="btn btn-sm" onClick={() => {
                        if (isFormulaRune(item)) openRuneFormulaForm(item, false);
                        else openItemEditor({ title: 'Изменить формулу', item, saveLabel: 'Сохранить', isNew: false, formula: true });
                      }}>Изменить</button>
                      {rune ? null : (
                        <button type="button" className="btn btn-sm" onClick={() => {
                          patch(c => {
                            const copy = cloneFormulaToEquipment(item);
                            if (copy) c.equipment.items.push(copy);
                          });
                          toast('Добавлено в снаряжение (с собой)');
                        }}>В снаряжение</button>
                      )}
                      <button type="button" className="btn btn-sm btn-danger" onClick={() => patch(c => { c.books.formulas = c.books.formulas.filter(x => x.id !== item.id); })}>Удалить</button>
                    </div>
                  )}
                </>
              }
            />
          );
        })}
      </BookGroup>
    );
  });
  if (!(ch.books.formulas || []).length) return <div className="empty-hint">Книга формул пуста</div>;
  return <>{groups}</>;
}

function ItemStatsLine({ ch, item }) {
  const stats = itemStatsText(ch, item, { formula: true });
  return (
    <>
      {stats.combat ? <div className="weapon-combat"><span className="atk">{stats.combat}</span></div> : null}
      {stats.parts ? <div className="item-stat-line">{stats.parts}</div> : null}
    </>
  );
}

function openSpellForm(sp, kind) {
  const isNew = !sp;
  const title = kind === 'curriculum'
    ? (isNew ? 'Новое заклинание учебного плана' : 'Изменить заклинание учебного плана')
    : (isNew ? 'Новое заклинание' : 'Изменить заклинание');
  useSheet.getState().openModal({
    title,
    body: close => <SpellForm initial={sp} kind={kind} onClose={close} />,
  });
}

function SpellForm({ initial, kind, onClose }) {
  const ch = useCharacter();
  const [name, setName] = useState(initial?.name || '');
  const [cast, setCast] = useState(normalizeCastCost(initial?.cast));
  const [level, setLevel] = useState(String(initial?.level ?? 1));
  const [tradition, setTradition] = useState(initial?.tradition || '');
  const [desc, setDesc] = useState(initial?.desc || '');
  const [traits, setTraits] = useState(initial?.traits || []);
  const auto = isAutoHeightenSpell({ traits });
  return (
    <>
      <div className="field"><label className="field-label">Название</label><input type="text" value={name} onChange={e => setName(e.target.value)} /></div>
      <CastPicker value={cast} onChange={setCast} />
      <div className="row2">
        {auto ? (
          <div className="field">
            <label className="field-label">Круг</label>
            <div className="play-text">{autoHeightenRank(ch.level)} круг · от уровня персонажа</div>
          </div>
        ) : (
          <div className="field"><label className="field-label">Круг</label><input type="text" inputMode="numeric" value={level} onChange={e => setLevel(e.target.value)} /></div>
        )}
        <div className="field"><label className="field-label">Традиция/школа</label><input type="text" value={tradition} onChange={e => setTradition(e.target.value)} /></div>
      </div>
      <div className="field"><label className="field-label">Описание</label><textarea value={desc} onChange={e => setDesc(e.target.value)} /></div>
      <div className="field"><label className="field-label">Дескрипторы</label><TagEditor tags={traits} onChange={setTraits} /></div>
      <div className="modal-actions">
        <button type="button" className="btn btn-block" onClick={onClose}>Отмена</button>
        <button type="button" className="btn btn-accent btn-block" onClick={() => {
          const stored = storedSpellLevel(traits, level);
          patch(c => {
            if (initial) {
              initial.name = name || initial.name;
              initial.level = stored;
              initial.tradition = tradition;
              initial.desc = desc;
              initial.traits = traits;
              initial.cast = normalizeCastCost(cast);
            } else {
              const entry = { id: uid(), name: name || 'Без названия', level: stored, tradition, desc, traits, cast: normalizeCastCost(cast) };
              if (kind === 'curriculum') {
                if (!Array.isArray(c.books.curriculum)) c.books.curriculum = [];
                c.books.curriculum.push(entry);
                if (!c.booksCollapsed || typeof c.booksCollapsed !== 'object') c.booksCollapsed = {};
                c.booksCollapsed['cu:' + spellBookGroupKeys(entry)[0]] = false;
              } else {
                c.books.spellbook.push(entry);
                if (!c.booksCollapsed || typeof c.booksCollapsed !== 'object') c.booksCollapsed = {};
                c.booksCollapsed['sp:' + spellBookGroupKeys(entry)[0]] = false;
              }
            }
            sanitizeSpellAssignments(c);
          });
          onClose();
        }}>{initial ? 'Сохранить' : 'Добавить'}</button>
      </div>
    </>
  );
}

function openRitualForm(r) {
  useSheet.getState().openModal({
    title: r ? 'Изменить ритуал' : 'Новый ритуал',
    body: close => <RitualForm initial={r} onClose={close} />,
  });
}

function RitualForm({ initial, onClose }) {
  const [name, setName] = useState(initial?.name || '');
  const [level, setLevel] = useState(String(Math.max(1, Number(initial?.level) || 1)));
  const [desc, setDesc] = useState(initial?.desc || '');
  const [traits, setTraits] = useState(initial?.traits || []);
  return (
    <>
      <div className="field"><label className="field-label">Название</label><input type="text" value={name} onChange={e => setName(e.target.value)} /></div>
      <div className="field"><label className="field-label">Круг</label><input type="text" inputMode="numeric" value={level} onChange={e => setLevel(e.target.value)} /></div>
      <div className="field"><label className="field-label">Описание</label><textarea value={desc} onChange={e => setDesc(e.target.value)} /></div>
      <div className="field"><label className="field-label">Дескрипторы</label><TagEditor tags={traits} onChange={setTraits} /></div>
      <div className="modal-actions">
        <button type="button" className="btn btn-block" onClick={onClose}>Отмена</button>
        <button type="button" className="btn btn-accent btn-block" onClick={() => {
          const stored = storedSpellLevel([], level);
          patch(c => {
            if (initial) {
              initial.name = name || initial.name;
              initial.level = stored;
              initial.desc = desc;
              initial.traits = traits;
            } else {
              c.books.rituals.push({ id: uid(), name: name || 'Без названия', level: stored, desc, traits });
              if (!c.booksCollapsed || typeof c.booksCollapsed !== 'object') c.booksCollapsed = {};
              c.booksCollapsed['rt:' + stored] = false;
            }
          });
          onClose();
        }}>{initial ? 'Сохранить' : 'Добавить'}</button>
      </div>
    </>
  );
}

function openRuneFormulaForm(item, isNew) {
  useSheet.getState().openModal({
    title: isNew ? 'Новая формула руны' : 'Изменить формулу руны',
    body: close => <RuneFormulaForm item={item} isNew={isNew} onClose={close} />,
  });
}

function RuneFormulaForm({ item, isNew, onClose }) {
  const [name, setName] = useState(item.name || '');
  const [libraryId, setLibraryId] = useState(item.libraryId || '');
  const [slot, setSlot] = useState(item.runeSlot || 'weapon');
  const [desc, setDesc] = useState(item.desc || '');
  const [traits, setTraits] = useState(item.traits || []);
  const hits = searchLibraryRunes(name);
  return (
    <>
      <div className="field">
        <label className="field-label">Название</label>
        <input type="text" autoComplete="off" value={name} onChange={e => { setName(e.target.value); setLibraryId(''); }} />
        <div className="tag-suggestions">
          {hits.map(entry => (
            <button type="button" key={entry.id} className="tag-suggestion" onClick={() => {
              setName(entry.name);
              setLibraryId(entry.id);
              setSlot(entry.slot);
              setDesc(entry.desc || '');
              setTraits((entry.traits || []).map(t => Object.assign({}, t)));
            }}>
              <span>{entry.name}</span><small>{RUNE_SLOT_LABELS[entry.slot] || ''}</small>
            </button>
          ))}
        </div>
        <div className="hint-line">Начните вводить название — появятся руны из библиотеки</div>
      </div>
      <div className="field">
        <label className="field-label">Для чего</label>
        <select value={slot} onChange={e => setSlot(e.target.value)}>
          {Object.entries(RUNE_SLOT_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
      </div>
      <div className="field"><label className="field-label">Описание</label><textarea value={desc} onChange={e => setDesc(e.target.value)} /></div>
      <div className="field"><label className="field-label">Дескрипторы</label><TagEditor tags={traits} onChange={setTraits} /></div>
      <div className="modal-actions">
        <button type="button" className="btn btn-block" onClick={onClose}>Отмена</button>
        <button type="button" className="btn btn-accent btn-block" onClick={() => {
          patch(c => {
            item.name = name.trim() || 'Руна';
            item.libraryId = libraryId || null;
            item.category = 'rune';
            item.qty = 1;
            item.bulk = 0;
            item.location = 'formula';
            item.runeSlot = slot || 'weapon';
            item.desc = desc;
            item.traits = traits;
            item.runes = [];
            item.weapon = item.armor = item.shield = item.consumable = item.bag = null;
            if (!Array.isArray(c.books.formulas)) c.books.formulas = [];
            if (isNew && !c.books.formulas.some(entry => entry.id === item.id)) c.books.formulas.push(item);
            if (!c.booksCollapsed || typeof c.booksCollapsed !== 'object') c.booksCollapsed = {};
            c.booksCollapsed['fm:rune'] = false;
          });
          onClose();
        }}>{isNew ? 'Добавить' : 'Сохранить'}</button>
      </div>
    </>
  );
}
