import { useMemo, useState } from 'react';
import { uid } from '../../domain/character-state.js';
import { instantiateLibraryItem, searchLibraryItems } from '../../domain/libraries/items.js';
import { instantiateLibraryRune, searchLibraryRunes } from '../../domain/libraries/runes.js';
import { canHoldRunes, ITEM_CATEGORY_LABELS, applyItemFormData, formFromItem, locationChoices, normalizeCategory, parseItemLocation } from './eqLogic.js';
import { TagEditor } from '../shared.jsx';
import { patch, useCharacter, useSheet } from '../../state/store.js';

export function openItemEditor(opts) {
  const { title, item, saveLabel, isNew, formula, bagOnly, lockCategory, searchOpts, onSaved } = opts;
  useSheet.getState().openModal({
    title,
    body: close => (
      <ItemEditor
        item={item}
        saveLabel={saveLabel}
        isNew={!!isNew}
        formula={!!formula}
        bagOnly={!!bagOnly}
        lockCategory={!!lockCategory}
        searchOpts={searchOpts || {}}
        onClose={close}
        onSaved={onSaved}
      />
    ),
  });
}

export function ItemEditor({ item, saveLabel, isNew, formula, bagOnly, lockCategory, searchOpts, onClose, onSaved }) {
  const ch = useCharacter();
  const [form, setForm] = useState(() => formFromItem(item));
  const [target] = useState(item);
  const cat = normalizeCategory(form.category);

  function set(partial) {
    setForm(prev => ({ ...prev, ...partial }));
  }

  const locOptions = useMemo(
    () => locationChoices(ch, form.location, { forBag: cat === 'bag' || bagOnly, category: cat }),
    [ch, form.location, cat, bagOnly],
  );

  const nameHits = isNew
    ? searchLibraryItems(form.name, searchOpts)
    : [];

  function pickLibrary(entry) {
    const next = instantiateLibraryItem(entry, uid);
    next.id = target.id;
    if (formula) {
      next.qty = 1;
      next.location = 'formula';
      next.runes = [];
      delete next.shieldHpCurrent;
      delete next.runeSlot;
    } else {
      next.qty = Math.max(1, Number(form.qty) || 1);
      next.location = form.location || target.location;
      if (next.category === 'bag' && parseItemLocation(next.location).type === 'bag') next.location = 'worn';
    }
    Object.assign(target, next);
    setForm(formFromItem(target));
  }

  function save() {
    const mode = formula ? 'formula' : 'equipment';
    patch(c => {
      applyItemFormData(c, target, form, mode);
      if (formula) {
        target.runes = [];
        if (isNew && !c.books.formulas.some(entry => entry.id === target.id)) {
          c.books.formulas.push(target);
        }
      } else {
        target.runes = canHoldRunes(target) ? (form.runes || []) : [];
        if (isNew && !c.equipment.items.some(entry => entry.id === target.id)) {
          c.equipment.items.push(target);
        }
      }
    });
    onSaved?.(target);
    onClose();
  }

  return (
    <>
      <div className="field">
        <label className="field-label">Название</label>
        <input type="text" autoComplete="off" value={form.name} onChange={e => set({ name: e.target.value, libraryId: '' })} />
        {isNew ? (
          <>
            <div className="tag-suggestions">
              {nameHits.map(entry => (
                <button type="button" key={entry.id} className="tag-suggestion" onClick={() => pickLibrary(entry)}>
                  <span>{entry.name}</span>
                  <small>{ITEM_CATEGORY_LABELS[normalizeCategory(entry.category)] || ''}</small>
                </button>
              ))}
            </div>
            <div className="hint-line">Начните вводить название — появятся предметы из библиотеки</div>
          </>
        ) : null}
      </div>

      {formula ? (
        <div className="row2">
          <CategoryField form={form} set={set} lockCategory={lockCategory} />
          <div className="field">
            <label className="field-label">Объём</label>
            <input type="text" inputMode="decimal" value={form.bulk} onChange={e => set({ bulk: e.target.value })} />
          </div>
        </div>
      ) : (
        <>
          <div className="row2">
            <div className="field">
              <label className="field-label">Количество</label>
              <input type="text" inputMode="numeric" value={form.qty} onChange={e => set({ qty: e.target.value })} />
            </div>
            <div className="field">
              <label className="field-label">Объём за штуку</label>
              <input type="text" inputMode="decimal" value={form.bulk} onChange={e => set({ bulk: e.target.value })} />
            </div>
          </div>
          <div className="row2">
            <CategoryField form={form} set={set} lockCategory={lockCategory} />
            <div className="field">
              <label className="field-label">Где находится</label>
              <select value={form.location} onChange={e => set({ location: e.target.value })}>
                {locOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
        </>
      )}

      <div className="field"><label className="field-label">Заметка</label><input type="text" value={form.note} onChange={e => set({ note: e.target.value })} /></div>
      <div className="field"><label className="field-label">Описание</label><textarea value={form.desc} onChange={e => set({ desc: e.target.value })} /></div>
      <div className="field"><label className="field-label">Дескрипторы</label><TagEditor tags={form.traits} onChange={traits => set({ traits })} /></div>

      {cat === 'weapon' ? <WeaponFields form={form} set={set} /> : null}
      {cat === 'armor' ? <ArmorFields form={form} set={set} /> : null}
      {cat === 'shield' ? <ShieldFields form={form} set={set} /> : null}
      {cat === 'consumable' ? <ConsumableFields form={form} set={set} /> : null}
      {cat === 'bag' ? <BagFields form={form} set={set} /> : null}
      {!formula && (cat === 'weapon' || cat === 'armor' || cat === 'shield') ? (
        <div className="form-section">
          <h4>Руны</h4>
          <RunesEditor runes={form.runes} slot={cat} onChange={runes => set({ runes })} />
        </div>
      ) : null}

      <div className="modal-actions">
        <button type="button" className="btn btn-block" onClick={onClose}>Отмена</button>
        <button type="button" className="btn btn-accent btn-block" onClick={save}>{saveLabel}</button>
      </div>
    </>
  );
}

function CategoryField({ form, set, lockCategory }) {
  return (
    <div className="field">
      <label className="field-label">Категория</label>
      <select value={form.category} disabled={lockCategory} onChange={e => set({ category: e.target.value })}>
        {Object.entries(ITEM_CATEGORY_LABELS).map(([id, label]) => (
          <option key={id} value={id}>{label}</option>
        ))}
      </select>
    </div>
  );
}

function WeaponFields({ form, set }) {
  const w = form.weapon;
  const ranged = w.type === 'ranged';
  function setW(partial) {
    set({ weapon: { ...w, ...partial } });
  }
  return (
    <div className="form-section">
      <h4>Оружие</h4>
      <div className="field">
        <label className="field-label">Тип</label>
        <select value={w.type} onChange={e => setW({ type: e.target.value })}>
          <option value="melee">Ближний бой</option>
          <option value="ranged">Дальнобойное</option>
        </select>
      </div>
      <div className="row2">
        <div className="field"><label className="field-label">Урон</label><input type="text" value={w.damage} onChange={e => setW({ damage: e.target.value })} /></div>
        <div className="field"><label className="field-label">Тип урона</label><input type="text" value={w.damageType} onChange={e => setW({ damageType: e.target.value })} /></div>
      </div>
      <div className="row2">
        <div className="field"><label className="field-label">Группа</label><input type="text" value={w.group} onChange={e => setW({ group: e.target.value })} /></div>
        <div className="field"><label className="field-label">Руки</label><input type="text" value={w.hands} onChange={e => setW({ hands: e.target.value })} /></div>
      </div>
      {ranged ? (
        <>
          <div className="row2">
            <div className="field"><label className="field-label">Дистанция</label><input type="text" value={w.range} onChange={e => setW({ range: e.target.value })} /></div>
            <div className="field"><label className="field-label">Перезарядка</label><input type="text" value={w.reload} onChange={e => setW({ reload: e.target.value })} /></div>
          </div>
          <div className="field"><label className="field-label">Боеприпасы</label><input type="text" value={w.ammo} onChange={e => setW({ ammo: e.target.value })} /></div>
        </>
      ) : null}
    </div>
  );
}

function ArmorFields({ form, set }) {
  const a = form.armor;
  function setA(partial) { set({ armor: { ...a, ...partial } }); }
  return (
    <div className="form-section">
      <h4>Броня</h4>
      <div className="row2">
        <div className="field"><label className="field-label">КБ</label><input type="text" value={a.ac} onChange={e => setA({ ac: e.target.value })} /></div>
        <div className="field"><label className="field-label">Макс. Ловк.</label><input type="text" value={a.dexCap} onChange={e => setA({ dexCap: e.target.value })} /></div>
      </div>
      <div className="row2">
        <div className="field"><label className="field-label">Группа</label><input type="text" value={a.group} onChange={e => setA({ group: e.target.value })} /></div>
        <div className="field"><label className="field-label">Категория</label><input type="text" value={a.armorCategory} onChange={e => setA({ armorCategory: e.target.value })} /></div>
      </div>
      <div className="row2">
        <div className="field"><label className="field-label">Штраф скорости</label><input type="text" value={a.speedPenalty} onChange={e => setA({ speedPenalty: e.target.value })} /></div>
        <div className="field"><label className="field-label">Сила</label><input type="text" value={a.strength} onChange={e => setA({ strength: e.target.value })} /></div>
      </div>
    </div>
  );
}

function ShieldFields({ form, set }) {
  const s = form.shield;
  function setS(partial) { set({ shield: { ...s, ...partial } }); }
  return (
    <div className="form-section">
      <h4>Щит</h4>
      <div className="row2">
        <div className="field"><label className="field-label">Бонус к КБ</label><input type="text" inputMode="numeric" value={s.acBonus} onChange={e => setS({ acBonus: e.target.value })} /></div>
        <div className="field"><label className="field-label">Твёрдость</label><input type="text" inputMode="numeric" value={s.hardness} onChange={e => setS({ hardness: e.target.value })} /></div>
      </div>
      <div className="field"><label className="field-label">Максимум ПЗ</label><input type="text" inputMode="numeric" value={s.hpMax} onChange={e => setS({ hpMax: e.target.value })} /></div>
    </div>
  );
}

function ConsumableFields({ form, set }) {
  const c = form.consumable;
  return (
    <div className="form-section">
      <h4>Расходник</h4>
      <div className="row2">
        <div className="field"><label className="field-label">Использование</label><input type="text" value={c.usage} onChange={e => set({ consumable: { ...c, usage: e.target.value } })} /></div>
        <div className="field"><label className="field-label">Активация</label><input type="text" value={c.activation} onChange={e => set({ consumable: { ...c, activation: e.target.value } })} /></div>
      </div>
    </div>
  );
}

function BagFields({ form, set }) {
  const b = form.bag;
  function setB(partial) { set({ bag: { ...b, ...partial } }); }
  return (
    <div className="form-section">
      <h4>Сумка</h4>
      <div className="row2">
        <div className="field">
          <label className="field-label">Формула веса</label>
          <select value={b.weightMode} onChange={e => setB({ weightMode: e.target.value })}>
            <option value="contents">Содержимое минус игнор</option>
            <option value="fixed">Фиксированный вес</option>
          </select>
        </div>
        {b.weightMode === 'contents' ? (
          <div className="field">
            <label className="field-label">Не учитывать объём</label>
            <input type="text" inputMode="decimal" value={b.ignoreBulk} onChange={e => setB({ ignoreBulk: e.target.value })} />
          </div>
        ) : <div className="field" />}
      </div>
      <div className="field-label" style={{ marginBottom: 6 }}>Отсеки</div>
      {b.compartments.map((comp, i) => (
        <div className="compartment-editor-row" key={comp.id}>
          <input type="text" placeholder="Название отсека" value={comp.name} onChange={e => {
            const compartments = b.compartments.map((c, j) => j === i ? { ...c, name: e.target.value } : c);
            setB({ compartments });
          }} />
          <input type="text" inputMode="decimal" placeholder="Вмест." value={comp.capacity} onChange={e => {
            const compartments = b.compartments.map((c, j) => j === i ? { ...c, capacity: e.target.value } : c);
            setB({ compartments });
          }} />
          <button type="button" className="skill-del" disabled={b.compartments.length <= 1} onClick={() => {
            if (b.compartments.length <= 1) return;
            setB({ compartments: b.compartments.filter((_, j) => j !== i) });
          }}>✕</button>
        </div>
      ))}
      <button type="button" className="btn btn-sm" onClick={() => setB({ compartments: [...b.compartments, { id: uid(), name: '', capacity: 4 }] })}>+ Отсек</button>
    </div>
  );
}

function RunesEditor({ runes, slot, onChange }) {
  function update(i, partial) {
    onChange(runes.map((r, j) => j === i ? { ...r, ...partial } : r));
  }
  return (
    <div>
      {runes.map((rune, i) => {
        const hits = searchLibraryRunes(rune.name, { slot });
        return (
          <div className="rune-form-card" key={rune.id}>
            <div className="field">
              <label className="field-label">Название руны</label>
              <input type="text" autoComplete="off" value={rune.name} onChange={e => update(i, { name: e.target.value, libraryId: null })} />
              <div className="tag-suggestions">
                {hits.map(entry => (
                  <button type="button" key={entry.id} className="tag-suggestion" onClick={() => {
                    const next = instantiateLibraryRune(entry, uid);
                    next.id = rune.id;
                    onChange(runes.map((r, j) => j === i ? next : r));
                  }}>
                    <span>{entry.name}</span>
                  </button>
                ))}
              </div>
              <div className="hint-line">Начните вводить название — появятся руны из библиотеки</div>
            </div>
            <div className="field"><label className="field-label">Дескрипторы</label>
              <TagEditor tags={rune.traits || []} onChange={traits => update(i, { traits })} />
            </div>
            <div className="field"><label className="field-label">Описание</label>
              <textarea value={rune.desc || ''} onChange={e => update(i, { desc: e.target.value })} />
            </div>
            <button type="button" className="btn btn-sm btn-danger" onClick={() => onChange(runes.filter((_, j) => j !== i))}>Снять руну</button>
          </div>
        );
      })}
      <button type="button" className="btn btn-sm" onClick={() => onChange([...runes, { id: uid(), libraryId: null, name: '', desc: '', traits: [] }])}>+ Добавить руну</button>
    </div>
  );
}
