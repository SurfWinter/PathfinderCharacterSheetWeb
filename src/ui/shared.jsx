import { useEffect, useRef, useState } from 'react';
import { normalizeCastCost } from '../domain/character-state.js';
import { TRAIT_LIBRARY, matchLibraryTrait } from '../domain/libraries/traits.js';
import { CAST_COST_LABEL, CAST_COSTS, PROF_LABEL, PROF_RANKS, traitDisplay, traitKey } from '../lib/rules.js';
import { enableTouchReorder } from '../domain/drag-reorder.js';
import { Chev } from './icons.jsx';
import { patch, useSheet } from '../state/store.js';

export function NumericField({
  value, onChange, onCommit, min, max, className, id, disabled, style, title,
}) {
  const [text, setText] = useState(String(value ?? ''));
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setText(String(value ?? ''));
  }, [value]);

  function commit(raw) {
    let n = Number(raw);
    if (!Number.isFinite(n)) n = Number(value) || 0;
    if (min != null) n = Math.max(min, n);
    if (max != null) n = Math.min(max, n);
    setText(String(n));
    onChange?.(n);
    onCommit?.(n);
    return n;
  }

  return (
    <input
      id={id}
      className={className}
      inputMode="numeric"
      type="text"
      disabled={disabled}
      style={style}
      title={title}
      value={text}
      onFocus={() => { focused.current = true; }}
      onChange={e => {
        const v = e.target.value;
        if (v !== '' && v !== '-' && !/^-?\d*$/.test(v)) return;
        setText(v);
        if (v === '' || v === '-') return;
        const n = Number(v);
        if (!Number.isFinite(n)) return;
        onChange?.(n);
      }}
      onBlur={() => {
        focused.current = false;
        commit(text);
      }}
    />
  );
}

export function TextField({ value, onChange, className, id, placeholder, disabled }) {
  return (
    <input
      id={id}
      type="text"
      className={className}
      placeholder={placeholder}
      disabled={disabled}
      value={value || ''}
      onChange={e => onChange(e.target.value)}
    />
  );
}

export function Autosize({ value, onChange, id, className }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.max(72, el.scrollHeight) + 'px';
  }, [value]);
  return (
    <textarea
      ref={ref}
      id={id}
      className={className ? className + ' autosize' : 'autosize'}
      value={value || ''}
      onChange={e => onChange(e.target.value)}
    />
  );
}

export function Collapsible({ title, collapsed, onToggle, extra, compact, children }) {
  return (
    <div className="card">
      <div className="card-header" onClick={onToggle}>
        <h3>{title}</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {extra}
          <Chev open={!collapsed} />
        </div>
      </div>
      {collapsed ? compact : null}
      <div className={`card-body ${collapsed ? 'collapsed' : ''}`}>{children}</div>
    </div>
  );
}

export function ProfDots({ rank, locked, onChange }) {
  const idx = PROF_RANKS.indexOf(rank);
  const colorClass = rank !== 'untrained' ? `c-${rank}` : '';
  return (
    <div className={`prof-dots ${locked ? 'locked' : ''}`} title={PROF_LABEL[rank]}>
      {[1, 2, 3, 4].map(i => (
        <span
          key={i}
          className={`prof-dot ${i <= idx ? 'filled ' + colorClass : ''}`}
          onClick={locked ? undefined : () => {
            const curIdx = PROF_RANKS.indexOf(rank);
            onChange(PROF_RANKS[curIdx === i ? i - 1 : i]);
          }}
        />
      ))}
    </div>
  );
}

export function TraitChip({ trait, onDelete }) {
  const view = traitDisplay(trait);
  return (
    <span className={`tag-chip tone-${view.color}`}>
      {view.name}
      {onDelete ? <button type="button" onClick={onDelete}>✕</button> : null}
    </span>
  );
}

export function TraitMeta({ tags }) {
  if (!tags || !tags.length) return null;
  return (
    <div className="item-traits">
      {tags.map((t, i) => {
        const view = traitDisplay(t);
        return <span key={i} className={`tg tone-${view.color}`}>{view.name}</span>;
      })}
    </div>
  );
}

export function TagEditor({ tags, onChange, placeholder = 'Добавить дескриптор…' }) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLocaleLowerCase('ru');
  const matches = q
    ? TRAIT_LIBRARY.filter(t => t.name.toLocaleLowerCase('ru').includes(q) || t.category.toLocaleLowerCase('ru').includes(q)).slice(0, 12)
    : [];

  function hasTag(candidate) {
    return (tags || []).some(tag => traitKey(tag) === traitKey(candidate));
  }
  function add(tag) {
    if (hasTag(tag)) return;
    onChange([...(tags || []), tag]);
    setQuery('');
  }
  function addFromInput() {
    const v = query.trim();
    if (!v) return;
    const library = matchLibraryTrait(v);
    add(library ? { type: 'library', id: library.id } : { type: 'custom', name: v });
  }

  return (
    <div className="tag-editor">
      <div className="tag-chip-box">
        {(tags || []).length
          ? tags.map((t, i) => (
            <TraitChip key={i} trait={t} onDelete={() => onChange(tags.filter((_, j) => j !== i))} />
          ))
          : <span className="empty-hint" style={{ padding: '2px 0' }}>Дескрипторов нет</span>}
      </div>
      <div className="tag-input-row">
        <input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addFromInput(); } }}
        />
        <button type="button" className="btn btn-sm btn-accent" onClick={addFromInput}>+</button>
      </div>
      <div className="tag-suggestions">
        {matches.map(trait => (
          <button
            key={trait.id}
            type="button"
            className={`tag-suggestion tone-${trait.color}`}
            onClick={() => add({ type: 'library', id: trait.id })}
          >
            <span>{trait.name}</span><small>{trait.category}</small>
          </button>
        ))}
      </div>
    </div>
  );
}

export function TraitAdder({ onAdd, placeholder }) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLocaleLowerCase('ru');
  const matches = q
    ? TRAIT_LIBRARY.filter(t => t.name.toLocaleLowerCase('ru').includes(q) || t.category.toLocaleLowerCase('ru').includes(q)).slice(0, 12)
    : [];
  function commit(tag) {
    onAdd(tag);
    setQuery('');
  }
  function fromInput() {
    const v = query.trim();
    if (!v) return;
    const library = matchLibraryTrait(v);
    commit(library ? { type: 'library', id: library.id } : { type: 'custom', name: v });
  }
  return (
    <>
      <div className="tag-input-row">
        <input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); fromInput(); } }}
        />
        <button type="button" className="btn btn-accent" onClick={fromInput}>+</button>
      </div>
      <div className="tag-suggestions">
        {matches.map(trait => (
          <button key={trait.id} type="button" className={`tag-suggestion tone-${trait.color}`} onClick={() => commit({ type: 'library', id: trait.id })}>
            <span>{trait.name}</span><small>{trait.category}</small>
          </button>
        ))}
      </div>
    </>
  );
}

export function ListItem({ id, head, body, extra, spent, className }) {
  const open = useSheet(s => !!s.openItems[id]);
  const toggle = useSheet(s => s.toggleOpenItem);
  return (
    <div className={`list-item ${spent ? 'spent' : ''} ${className || ''}`}>
      <div className="list-item-head" onClick={e => {
        if (e.target.closest('input, select, textarea, .spent-badge, button, .formula-copy-btn')) return;
        toggle(id);
      }}>
        {head}
        {extra}
      </div>
      <div className={`list-item-body ${open ? 'open' : ''}`}>{body}</div>
    </div>
  );
}

export function SlotDots({ max, used, variant, extra, onSpend, onRestore }) {
  max = Math.max(0, Number(max) || 0);
  used = Math.max(0, Math.min(Number(used) || 0, max));
  const remaining = max - used;
  if (!max && !extra) return <span className="empty-hint" style={{ padding: 0 }}>Нет</span>;
  return (
    <div className="slot-dots">
      {Array.from({ length: max }, (_, i) => {
        const filled = i < remaining;
        return (
          <button
            key={i}
            type="button"
            className={`slot-dot ${filled ? 'filled' : ''} ${variant === 'focus' ? 'focus-dot' : ''}`}
            aria-label={filled ? 'Потратить' : 'Вернуть'}
            onClick={() => filled ? onSpend?.() : onRestore?.()}
          />
        );
      })}
      {extra}
    </div>
  );
}

export function HpButtons({ onDelta, onFill }) {
  return (
    <div className="hp-btns">
      <button type="button" className="btn hp-delta hp-minus" onClick={() => onDelta(-25)}>−25</button>
      <button type="button" className="btn hp-delta hp-minus" onClick={() => onDelta(-5)}>−5</button>
      <button type="button" className="btn hp-delta hp-minus" onClick={() => onDelta(-1)}>−1</button>
      <button type="button" className="btn hp-delta hp-plus" onClick={() => onDelta(1)}>+1</button>
      <button type="button" className="btn hp-delta hp-plus" onClick={() => onDelta(5)}>+5</button>
      {onFill ? <button type="button" className="btn hp-delta hp-plus hp-max" onClick={onFill}>max</button> : null}
    </div>
  );
}

export function HpBar({ current, max, temp }) {
  const hpPct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
  const tempPct = max > 0 ? Math.max(0, Math.min(100 - hpPct, (temp / max) * 100)) : 0;
  return (
    <div className="hp-bar">
      <div className="hp-bar-fill" style={{ width: hpPct + '%' }} />
      <div className="hp-bar-temp" style={{ width: tempPct + '%', left: hpPct + '%' }} />
    </div>
  );
}

export function FlashNum({ flashKey, className, children }) {
  const flash = useSheet(s => s.flash);
  const ref = useRef(null);
  useEffect(() => {
    if (!flash || flash.key !== flashKey || !ref.current) return;
    const el = ref.current;
    el.classList.remove('num-flash', 'num-flash-good', 'num-flash-bad', 'num-flash-info', 'num-flash-accent');
    void el.offsetWidth;
    el.classList.add('num-flash', 'num-flash-' + flash.tone);
    const t = setTimeout(() => {
      el.classList.remove('num-flash', 'num-flash-good', 'num-flash-bad', 'num-flash-info', 'num-flash-accent');
    }, 400);
    return () => clearTimeout(t);
  }, [flash, flashKey]);
  return <span ref={ref} className={className}>{children}</span>;
}

export function ReorderList({ itemSelector, handleSelector, canReorder, onReorder, children, groupForItem }) {
  const ref = useRef(null);
  const onReorderRef = useRef(onReorder);
  const canReorderRef = useRef(canReorder);
  const groupRef = useRef(groupForItem);
  onReorderRef.current = onReorder;
  canReorderRef.current = canReorder;
  groupRef.current = groupForItem;
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    enableTouchReorder({
      root,
      itemSelector,
      handleSelector,
      canReorder: () => (canReorderRef.current ? canReorderRef.current() : true),
      groupForItem: item => (groupRef.current ? groupRef.current(item) : ''),
      onReorder: (group, ids) => onReorderRef.current?.(group, ids),
    });
  }, [itemSelector, handleSelector]);
  return <div ref={ref}>{children}</div>;
}

export function ProfSelect({ value, onChange }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}>
      {PROF_RANKS.map(r => <option key={r} value={r}>{PROF_LABEL[r]}</option>)}
    </select>
  );
}

function Diamond({ filled }) {
  if (filled) {
    return (
      <svg className="cast-dia" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
        <path d="M6 1.15 10.85 6 6 10.85 1.15 6Z" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg className="cast-dia outline" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
      <path d="M6 1.15 10.85 6 6 10.85 1.15 6Z" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinejoin="round" />
    </svg>
  );
}
function ReactionIcon() {
  return (
    <svg className="cast-react" viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
      <path d="M3.1 6.15 1.25 4.2 3.45 2.25" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M1.7 4.2h6.15A5.2 5.2 0 1 1 4.7 13.1" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
export function CastCostInner({ cast }) {
  const v = normalizeCastCost(cast);
  if (v === 'reaction') return <ReactionIcon />;
  if (v === '1-3') {
    return (
      <>
        <Diamond filled />
        <span className="cast-dash">–</span>
        <Diamond />
        <Diamond />
      </>
    );
  }
  const n = Number(v) || 0;
  return <>{Array.from({ length: n }, (_, i) => <Diamond key={i} filled />)}</>;
}
export function CastCost({ cast }) {
  const v = normalizeCastCost(cast);
  const label = CAST_COST_LABEL[v];
  return (
    <span className="cast-cost" data-cast={v} title={label} aria-label={label}>
      <CastCostInner cast={v} />
    </span>
  );
}
export function CastPicker({ value, onChange }) {
  const v = normalizeCastCost(value);
  return (
    <div className="field">
      <label className="field-label">Стоимость сотворения</label>
      <div className="cast-picker">
        {CAST_COSTS.map(c => (
          <button
            type="button"
            key={c}
            className={`cast-opt${c === v ? ' active' : ''}`}
            title={CAST_COST_LABEL[c]}
            aria-label={CAST_COST_LABEL[c]}
            aria-pressed={c === v}
            onClick={() => onChange(c)}
          >
            <CastCostInner cast={c} />
          </button>
        ))}
      </div>
    </div>
  );
}

export function Modal() {
  const modal = useSheet(s => s.modal);
  const closeModal = useSheet(s => s.closeModal);
  if (!modal) return null;
  return (
    <div className="modal-overlay open" onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
      <div className="modal">
        <h3>{modal.title}</h3>
        {typeof modal.body === 'function' ? modal.body(closeModal) : modal.body}
      </div>
    </div>
  );
}

export function Toast() {
  const toast = useSheet(s => s.toast);
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!toast) return;
    setShow(true);
    const t = setTimeout(() => setShow(false), 1400);
    return () => clearTimeout(t);
  }, [toast]);
  if (!toast) return null;
  return (
    <div className={`toast ${show ? 'show' : ''} ${toast.tone ? 'toast-' + toast.tone : ''}`}>
      {toast.message}
    </div>
  );
}

export { patch };
