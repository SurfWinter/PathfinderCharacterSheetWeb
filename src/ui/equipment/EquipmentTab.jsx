import { useState } from 'react';
import { uid } from '../../domain/character-state.js';
import { normalizeFormulaCategory } from '../../domain/libraries/items.js';
import { clamp, isPlay, PROF_LABEL, PROF_RANKS, setItemLocation } from '../../lib/rules.js';
import { flash, patch, toast, useCharacter, useSheet } from '../../state/store.js';
import { Topbar } from '../shell.jsx';
import { Chev, Icon } from '../icons.jsx';
import { FlashNum, NumericField, ReorderList, TraitMeta } from '../shared.jsx';
import {
  bagCompartmentLocation, bagEffectiveBulk, bagsAt, cloneEquipmentToFormula, compartmentContentsBulk,
  CURRENCY_DEFS, deleteEquipmentItem, emptyCustomItem, fallbackItemLocation, formatBulk,
  getCurrencyQty, isBagItem, ITEM_CATEGORY_LABELS, itemStatsText, locationChoices, parseItemLocation,
  regularItemsAt, setCurrencyQty, wornCarriedBulk,
} from './eqLogic.js';
import { openItemEditor } from './ItemEditor.jsx';


export default function EquipmentTab() {
  const ch = useCharacter();
  const play = isPlay(ch);
  const openModal = useSheet(s => s.openModal);
  const items = ch.equipment.items;
  const carriedTotalBulk = wornCarriedBulk(items);
  const strMod = ch.abilities.str.mod;
  const encumbered = 5 + strMod;
  const maxBulk = 10 + strMod;
  const bulkPct = maxBulk > 0 ? clamp((carriedTotalBulk / maxBulk) * 100, 0, 100) : (carriedTotalBulk > 0 ? 100 : 0);
  const over = carriedTotalBulk > maxBulk;
  const encLabel = over ? 'перегруз' : (carriedTotalBulk >= encumbered ? 'утомление' : '');

  function startNewItem(location, bagOnly) {
    const item = emptyCustomItem(bagOnly ? 'bag' : 'other', uid);
    item.location = location || (bagOnly ? 'worn' : fallbackItemLocation(ch));
    if (bagOnly && parseItemLocation(item.location).type === 'bag') item.location = 'worn';
    openItemEditor({
      title: bagOnly ? 'Новая сумка' : 'Новый предмет',
      item,
      saveLabel: 'Добавить',
      isNew: true,
      lockCategory: bagOnly,
      bagOnly,
      searchOpts: bagOnly ? { category: 'bag' } : { excludeCategory: 'bag' },
    });
  }

  return (
    <>
      <Topbar title="Снаряжение" subtitle={`Носимый объём: ${formatBulk(carriedTotalBulk)} / ${maxBulk}`} />
      <div className="page active">
        <ReorderList
          itemSelector=".list-item[data-item-id]"
          handleSelector="[data-equipment-drag-handle]"
          groupForItem={el => el.dataset.reorderGroup}
          onReorder={(location, ids) => patch(c => {
            const ordered = ids.map(id => c.equipment.items.find(item => item.id === id));
            let position = 0;
            c.equipment.items = c.equipment.items.map(item =>
              item.location === location && !item.isCurrency && !isBagItem(item) ? ordered[position++] : item
            );
          })}
        >
          <div className="card">
            {play ? (
              <div className="weight-line">
                <span>Носимый объём</span>
                <span className={over ? 'over' : ''}>{formatBulk(carriedTotalBulk)} / {maxBulk}{encLabel ? ' · ' + encLabel : ''}</span>
              </div>
            ) : (
              <>
                <div className="weight-summary">
                  <span>Носимый объём</span>
                  <span>{formatBulk(carriedTotalBulk)} / {maxBulk} (утомление с {encumbered})</span>
                </div>
                <div className="weight-bar"><div className={`weight-bar-fill ${over ? 'over' : ''}`} style={{ width: bulkPct + '%' }} /></div>
              </>
            )}
          </div>

          <CoinsCard location="worn" ch={ch} />

          <div className="card">
            <h3 style={{ marginBottom: 8 }}>Надето</h3>
            <div className="equip-slots">
              <EquipSlot kind="armor" ch={ch} play={play} />
              <EquipSlot kind="shield" ch={ch} play={play} />
            </div>
          </div>

          <div className="card">
            <h3 style={{ marginBottom: 8 }}>На поясе</h3>
            {regularItemsAt(ch, 'belt').map(item => <ItemRow key={item.id} item={item} ch={ch} play={play} />)}
            {!regularItemsAt(ch, 'belt').length ? <div className="empty-hint">На поясе пусто</div> : null}
            {play ? null : <button type="button" className="btn btn-sm btn-block location-add" onClick={() => startNewItem('belt', false)}>+ Предмет на пояс</button>}
          </div>

          <div className="card">
            <h3 style={{ marginBottom: 8 }}>С собой</h3>
            {bagsAt(ch, 'worn').map(bag => <BagCard key={bag.id} bag={bag} ch={ch} play={play} onAdd={startNewItem} />)}
            {regularItemsAt(ch, 'worn').map(item => <ItemRow key={item.id} item={item} ch={ch} play={play} />)}
            {!bagsAt(ch, 'worn').length && !regularItemsAt(ch, 'worn').length ? <div className="empty-hint">Ничего нет с собой</div> : null}
            {play ? null : <button type="button" className="btn btn-sm btn-block location-add" onClick={() => startNewItem('worn', false)}>+ Предмет с собой</button>}
          </div>

          {play ? null : ch.equipment.storages.map(storage => (
            <div className="card" key={storage.id}>
              <div className="card-header" style={{ cursor: 'default' }}>
                <h3>{storage.name}</h3>
                <button type="button" className="btn btn-sm btn-danger" onClick={() => patch(c => {
                  const dest = fallbackItemLocation(c);
                  c.equipment.storages = c.equipment.storages.filter(entry => entry.id !== storage.id);
                  c.equipment.items.forEach(item => {
                    if (item.location === storage.id) item.location = isBagItem(item) ? 'worn' : dest;
                  });
                })}>Удалить</button>
              </div>
              <div className="card-body" style={{ display: 'block' }}>
                <div className="empty-hint" style={{ padding: '0 0 8px', textAlign: 'left' }}>Не даёт веса персонажу</div>
                <CurrencyGrid location={storage.id} />
                {bagsAt(ch, storage.id).map(bag => <BagCard key={bag.id} bag={bag} ch={ch} play={play} onAdd={startNewItem} />)}
                {regularItemsAt(ch, storage.id).map(item => <ItemRow key={item.id} item={item} ch={ch} play={play} />)}
                {!bagsAt(ch, storage.id).length && !regularItemsAt(ch, storage.id).length ? <div className="empty-hint">Пусто</div> : null}
                <button type="button" className="btn btn-sm btn-block location-add" onClick={() => startNewItem(storage.id, false)}>+ Предмет сюда</button>
              </div>
            </div>
          ))}
        </ReorderList>

        {play ? null : (
          <div className="eq-toolbar">
            <div className="row">
              <button type="button" className="btn btn-accent btn-block" onClick={() => startNewItem(fallbackItemLocation(ch), false)}>+ Предмет</button>
              <button type="button" className="btn btn-accent btn-block" onClick={() => startNewItem('worn', true)}>+ Сумка</button>
            </div>
            <button type="button" className="btn btn-block" onClick={() => openModal({
              title: 'Новое хранилище',
              body: close => <StorageForm onClose={close} />,
            })}>+ Хранилище</button>
          </div>
        )}
      </div>
    </>
  );
}

function CoinsCard({ location, ch }) {
  const collapsed = !!ch.coinsCollapsed;
  return (
    <div className="card">
      <div className="card-header" onClick={() => patch(c => { c.coinsCollapsed = !c.coinsCollapsed; })}>
        <h3>Монеты</h3>
        <div className="coin-head-right">
          <span className="coin-summary">{currencySummary(ch, location)}</span>
          <Chev open={!collapsed} />
        </div>
      </div>
      <div className={`card-body ${collapsed ? 'collapsed' : ''}`}>
        <CurrencyGrid location={location} />
      </div>
    </div>
  );
}

function currencySummary(ch, location) {
  const parts = CURRENCY_DEFS.map(def => {
    const qty = getCurrencyQty(ch, location, def.key);
    return qty ? `${qty} ${def.short}` : null;
  }).filter(Boolean);
  return parts.join(' · ') || 'Нет монет';
}

function CurrencyGrid({ location }) {
  const ch = useCharacter();
  return (
    <div className="currency-grid">
      {CURRENCY_DEFS.map(def => (
        <label className="currency-cell" key={def.key}>
          {def.name}
          <NumericField min={0} value={getCurrencyQty(ch, location, def.key)} onChange={n => patch(c => setCurrencyQty(c, location, def.key, n))} />
        </label>
      ))}
    </div>
  );
}

function FillBar({ used, cap }) {
  const over = used > cap;
  const pct = cap > 0 ? clamp((used / cap) * 100, 0, 100) : (used > 0 ? 100 : 0);
  return (
    <>
      <div className="weight-summary">
        <span>{formatBulk(used)} / {formatBulk(cap)}</span>
        {over ? <span className="comp-over">Переполнена</span> : null}
      </div>
      <div className="weight-bar"><div className={`weight-bar-fill ${over ? 'over' : ''}`} style={{ width: pct + '%' }} /></div>
    </>
  );
}

function ItemStats({ ch, item, formula }) {
  const stats = itemStatsText(ch, item, { formula });
  return (
    <>
      {stats.combat ? <div className="weapon-combat"><span className="atk">{stats.combat}</span></div> : null}
      {stats.parts ? <div className="item-stat-line">{stats.parts}</div> : null}
    </>
  );
}

function RunesLine({ item }) {
  if (!item.runes || !item.runes.length) return null;
  return <div className="rune-list">{item.runes.map(rune => <span className="rune-chip" key={rune.id}>{rune.name || 'Руна'}</span>)}</div>;
}

function ItemDescription({ item }) {
  const blocks = [];
  if (item.desc) blocks.push(<div key="d">{item.desc}</div>);
  (item.runes || []).forEach(rune => {
    blocks.push(
      <div className="rune-desc-block" key={rune.id}>
        <div className="rune-desc-name">{rune.name || 'Руна'}</div>
        {rune.desc ? <div>{rune.desc}</div> : null}
      </div>
    );
  });
  return blocks.length ? <>{blocks}</> : 'Нет описания';
}

function FormulaCopyBtn({ item }) {
  return (
    <button type="button" className="icon-btn formula-copy-btn" title="В формулы" aria-label="Добавить в формулы" onClick={e => {
      e.stopPropagation();
      patch(c => {
        if (!Array.isArray(c.books.formulas)) c.books.formulas = [];
        c.books.formulas.push(cloneEquipmentToFormula(item));
        if (!c.booksCollapsed || typeof c.booksCollapsed !== 'object') c.booksCollapsed = {};
        c.booksCollapsed['fm:' + normalizeFormulaCategory(item.category)] = false;
      });
      toast('Добавлено в формулы');
    }}>
      <Icon name="book" size={16} />
    </button>
  );
}

function ItemRow({ item, ch, play }) {
  const open = useSheet(s => !!s.openItems['eq-' + item.id]);
  const toggle = useSheet(s => s.toggleOpenItem);
  const locOpts = locationChoices(ch, item.location, { category: item.category });
  return (
    <div className="list-item" data-item-id={item.id} data-reorder-id={item.id} data-reorder-group={item.location}>
      <div className={`list-item-head ${play ? 'eq-play-head' : ''}`} onClick={e => {
        if (e.target.closest('input, select, textarea, button, .formula-copy-btn')) return;
        toggle('eq-' + item.id);
      }}>
        <div className="nm">
          <div className="n">{item.name}</div>
          <div className="meta">{ITEM_CATEGORY_LABELS[item.category] || ''} · объём {formatBulk(item.bulk)}{item.note ? ' · ' + item.note : ''}</div>
          <ItemStats ch={ch} item={item} />
          {!play && item.weapon ? (
            <div className="weapon-setup-row">
              <select value={item.weapon.proficiency || 'untrained'} onChange={e => patch(c => {
                const x = c.equipment.items.find(t => t.id === item.id);
                if (x && x.weapon) x.weapon.proficiency = e.target.value;
              })}>
                {PROF_RANKS.map(r => <option key={r} value={r}>{PROF_LABEL[r]}</option>)}
              </select>
              <NumericField value={item.weapon.otherBonus || 0} title="Прочее" onChange={n => patch(c => {
                const x = c.equipment.items.find(t => t.id === item.id);
                if (x && x.weapon) x.weapon.otherBonus = n;
              })} />
            </div>
          ) : null}
          <TraitMeta tags={item.traits} />
          <RunesLine item={item} />
        </div>
        {play
          ? <div className="play-qty"><NumericField min={0} value={item.qty} onChange={n => patch(c => { const x = c.equipment.items.find(t => t.id === item.id); if (x) x.qty = Math.max(0, n); })} /></div>
          : <FormulaCopyBtn item={item} />}
      </div>
      {play ? null : (
        <div className="eq-item-controls">
          <span className="drag-handle" data-equipment-drag-handle aria-label="Перетащить предмет" title="Перетащить предмет">⠿</span>
          <div className="qty">
            <NumericField min={0} value={item.qty} onChange={n => patch(c => { const x = c.equipment.items.find(t => t.id === item.id); if (x) x.qty = Math.max(0, n); })} />
          </div>
          <select className="locsel" value={item.location} onChange={e => patch(c => {
            const x = c.equipment.items.find(t => t.id === item.id);
            if (!x) return;
            let location = e.target.value;
            if (isBagItem(x) && parseItemLocation(location).type === 'bag') location = 'worn';
            setItemLocation(c, x, location);
          })}>
            {locOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <button type="button" className="skill-del" title="Изменить" onClick={() => openItemEditor({ title: 'Изменить предмет', item, saveLabel: 'Сохранить', isNew: false })}>✎</button>
          {item.custom !== false
            ? <button type="button" className="skill-del" title="Удалить" onClick={() => patch(c => deleteEquipmentItem(c, item.id))}>✕</button>
            : <span style={{ width: 18, display: 'inline-block' }} />}
        </div>
      )}
      <div className={`list-item-body ${open ? 'open' : ''}`}><ItemDescription item={item} /></div>
    </div>
  );
}

function BagCard({ bag, ch, play, onAdd }) {
  const open = useSheet(s => !!s.openBags[bag.id]);
  const toggle = useSheet(s => s.toggleOpenBag);
  const used = bag.bag.compartments.reduce((sum, compartment) => sum + compartmentContentsBulk(ch.equipment.items, bag, compartment), 0);
  const cap = bag.bag.compartments.reduce((sum, compartment) => sum + (Number(compartment.capacity) || 0), 0);
  const effective = bagEffectiveBulk(ch.equipment.items, bag);
  const insideCount = bag.bag.compartments.reduce((sum, compartment) => {
    const location = bagCompartmentLocation(bag.id, compartment.id);
    return sum + regularItemsAt(ch, location).length + CURRENCY_DEFS.filter(def => getCurrencyQty(ch, location, def.key) > 0).length;
  }, 0);
  const weightNote = bag.bag.weightMode === 'fixed'
    ? `фиксированный вес ${formatBulk(bag.bulk)}`
    : `вес ${formatBulk(effective)}${bag.bag.ignoreBulk ? ` (первые ${formatBulk(bag.bag.ignoreBulk)} не считаются)` : ''}`;
  const playMeta = `внутри ${insideCount} · объём ${formatBulk(used)}/${formatBulk(cap)}`;
  const locOpts = locationChoices(ch, bag.location, { forBag: true });

  const compartments = bag.bag.compartments.map(compartment => {
    const location = bagCompartmentLocation(bag.id, compartment.id);
    const contents = regularItemsAt(ch, location);
    const title = compartment.name || (bag.bag.compartments.length > 1 ? 'Отсек' : 'Содержимое');
    return (
      <div className="compartment-block" key={compartment.id}>
        <div className="compartment-title">{title}</div>
        {play ? null : <FillBar used={compartmentContentsBulk(ch.equipment.items, bag, compartment)} cap={compartment.capacity} />}
        <CurrencyGrid location={location} />
        {contents.map(item => <ItemRow key={item.id} item={item} ch={ch} play={play} />)}
        {!contents.length ? <div className="empty-hint" style={{ padding: '8px 0' }}>Пусто</div> : null}
        {play ? null : <button type="button" className="btn btn-sm btn-block location-add" onClick={() => onAdd(location, false)}>+ Предмет в этот отсек</button>}
      </div>
    );
  });

  return (
    <div className="bag-card" data-bag-id={bag.id}>
      <div className="bag-card-head" onClick={e => {
        if (e.target.closest('button, select, input')) return;
        toggle(bag.id);
      }}>
        <div>
          <div className="n">{bag.name}</div>
          <div className="meta">{play ? playMeta : `${weightNote} · внутри ${formatBulk(used)}`}</div>
          <TraitMeta tags={bag.traits} />
        </div>
        {play ? null : (
          <div className="bag-card-actions">
            <FormulaCopyBtn item={bag} />
            <select className="locsel" value={bag.location} onChange={e => patch(c => {
              const x = c.equipment.items.find(t => t.id === bag.id);
              if (x) setItemLocation(c, x, e.target.value);
            })}>
              {locOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <button type="button" className="skill-del" title="Изменить" onClick={() => openItemEditor({ title: 'Изменить предмет', item: bag, saveLabel: 'Сохранить', isNew: false })}>✎</button>
            <button type="button" className="skill-del" title="Удалить" onClick={() => patch(c => deleteEquipmentItem(c, bag.id))}>✕</button>
          </div>
        )}
      </div>
      {play ? (
        <div className="bag-play-body">
          <div className="bag-desc open">{bag.desc || 'Нет описания'}{bag.note ? <div className="item-stat-line">{bag.note}</div> : null}</div>
          {compartments}
        </div>
      ) : (
        <>
          <div className={`bag-desc ${open ? 'open' : ''}`}>{bag.desc || 'Нет описания'}{bag.note ? <div className="item-stat-line">{bag.note}</div> : null}</div>
          {compartments}
        </>
      )}
    </div>
  );
}

function EquipSlot({ kind, ch, play }) {
  const loc = kind === 'armor' ? 'equipped-armor' : 'equipped-shield';
  const item = ch.equipment.items.find(entry => entry.location === loc && !entry.isCurrency) || null;
  const title = kind === 'armor' ? 'Броня' : 'Щит';
  const emptyLabel = kind === 'armor' ? 'Нет брони' : 'Нет щита';
  const candidates = regularItemsAt(ch, 'worn').filter(entry => entry.category === kind);
  if (!item) {
    return (
      <div className="equip-slot empty">
        <div className="equip-slot-k">{title}</div>
        <div className="empty-hint" style={{ padding: '6px 0' }}>{emptyLabel}</div>
        {play || !candidates.length ? null : (
          <select defaultValue="" onChange={e => {
            const id = e.target.value;
            if (!id) return;
            patch(c => {
              const x = c.equipment.items.find(t => t.id === id);
              if (x) setItemLocation(c, x, loc);
            });
          }}>
            <option value="">— надеть {kind === 'armor' ? 'броню' : 'щит'} —</option>
            {candidates.map(entry => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
          </select>
        )}
      </div>
    );
  }
  const max = Number(item.shield && item.shield.hpMax) || 0;
  const current = item.shieldHpCurrent == null ? max : clamp(Number(item.shieldHpCurrent) || 0, 0, max);
  return (
    <div className="equip-slot">
      <div className="equip-slot-k">{title}</div>
      <div className="n">{item.name}</div>
      <ItemStats ch={ch} item={item} />
      {kind === 'shield' ? (
        <div className="shield-hp">
          <div className="shield-hp-value">
            <FlashNum flashKey={'shield-' + item.id} className="hp-num">{current}</FlashNum>
            <span className="hp-max"> / {max}</span>
          </div>
          <div className="hp-btns shield-hp-btns">
            {[-5, -1, 1, 5].map(d => (
              <button
                key={d}
                type="button"
                className={`btn hp-delta ${d < 0 ? 'hp-minus' : 'hp-plus'}`}
                onClick={e => {
                  e.stopPropagation();
                  patch(c => {
                    const x = c.equipment.items.find(t => t.id === item.id);
                    if (!x || !x.shield || x.location !== 'equipped-shield') return;
                    const m = Number(x.shield.hpMax) || 0;
                    const cur = x.shieldHpCurrent == null ? m : Number(x.shieldHpCurrent) || 0;
                    x.shieldHpCurrent = clamp(cur + d, 0, m);
                  });
                  const after = useSheet.getState().character.equipment.items.find(t => t.id === item.id);
                  toast('ПЗ щита ' + (d < 0 ? String(d) : '+' + d) + ' → ' + (after?.shieldHpCurrent ?? 0), d < 0 ? 'bad' : 'good');
                  flash('shield-' + item.id, d < 0 ? 'bad' : 'good');
                }}
              >{d < 0 ? d : '+' + d}</button>
            ))}
          </div>
        </div>
      ) : null}
      <TraitMeta tags={item.traits} />
      {play ? null : (
        <div className="equip-slot-actions">
          <FormulaCopyBtn item={item} />
          <button type="button" className="btn btn-sm" onClick={() => patch(c => {
            const x = c.equipment.items.find(t => t.id === item.id);
            if (x) setItemLocation(c, x, 'worn');
          })}>Снять</button>
          <button type="button" className="skill-del" title="Изменить" onClick={() => openItemEditor({ title: 'Изменить предмет', item, saveLabel: 'Сохранить', isNew: false })}>✎</button>
        </div>
      )}
    </div>
  );
}

function StorageForm({ onClose }) {
  const [name, setName] = useState('');
  return (
    <>
      <div className="field"><label className="field-label">Название (дом, банк…)</label><input type="text" value={name} onChange={e => setName(e.target.value)} /></div>
      <div className="modal-actions">
        <button type="button" className="btn btn-block" onClick={onClose}>Отмена</button>
        <button type="button" className="btn btn-accent btn-block" onClick={() => {
          const n = name.trim();
          if (!n) return;
          patch(c => { c.equipment.storages.push({ id: uid(), name: n }); });
          onClose();
        }}>Создать</button>
      </div>
    </>
  );
}

