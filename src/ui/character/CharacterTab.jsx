import { useState } from 'react';
import { ABILITY_DEFS, uid } from '../../domain/character-state.js';
import {
  ABILITY_SHORT, applyAbilityBoost, applyAbilityFlaw, applyHpDeltaTo, characterAcInfo,
  characterHasTrait, clamp, fmtMod, isPlay, profTotal, saveTotal, traitKey,
} from '../../lib/rules.js';
import { flash, patch, toast, useCharacter, useSheet } from '../../state/store.js';
import { Topbar } from '../shell.jsx';
import {
  Autosize, Collapsible, FlashNum, HpBar, HpButtons, NumericField, ProfDots, ProfSelect,
  ReorderList, TextField, TraitAdder, TraitChip,
} from '../shared.jsx';

function resistLabel(r) {
  if (r.type === 'resistance') return `Сопротивление к ${r.name} ${r.value}`;
  if (r.type === 'weakness') return `Уязвимость к ${r.name} ${r.value}`;
  return `Иммунитет к ${r.name}`;
}

export default function CharacterTab() {
  const ch = useCharacter();
  const play = isPlay(ch);
  const a = ch.abilities;
  const level = ch.level;
  const acInfo = characterAcInfo(ch);
  const fortTotal = saveTotal(ch, 'fort', 'con');
  const refTotal = saveTotal(ch, 'ref', 'dex');
  const willTotal = saveTotal(ch, 'will', 'wis');
  const perceptionTotal = a.wis.mod + profTotal(ch.perception.proficiency, level) + Number(ch.perception.otherBonus || 0);
  const openModal = useSheet(s => s.openModal);

  function hpDelta(d) {
    patch(c => applyHpDeltaTo(c.hp, d));
    const cur = useSheet.getState().character.hp.current;
    toast('ПЗ ' + (d < 0 ? String(d) : '+' + d) + ' → ' + cur, d < 0 ? 'bad' : 'good');
    flash('hp', d < 0 ? 'bad' : 'good');
  }
  function hpFill() {
    patch(c => { c.hp.current = c.hp.max; });
    toast('ПЗ → макс. ' + useSheet.getState().character.hp.current, 'good');
    flash('hp', 'good');
  }

  return (
    <>
      <Topbar title="Персонаж" subtitle={`${ch.className || 'Класс не указан'} · Ур. ${ch.level}`} />
      <div className="page active">
        <div className="card">
          {play ? (
            <div className="play-id">
              <div className="name-display">{ch.name || 'Без имени'}</div>
              <div className="row2">
                <div className="play-kv"><span>Класс</span>{ch.className || '—'}</div>
                <div className="play-kv"><span>Уровень</span>{ch.level}</div>
              </div>
            </div>
          ) : (
            <>
              <div className="field">
                <TextField className="name-input" placeholder="Имя персонажа" value={ch.name} onChange={v => patch(c => { c.name = v; })} />
              </div>
              <div className="row2">
                <div className="field">
                  <label className="field-label">Класс</label>
                  <TextField value={ch.className} onChange={v => patch(c => { c.className = v; })} />
                </div>
                <div className="field">
                  <label className="field-label">Уровень</label>
                  <NumericField min={1} max={20} value={ch.level} onChange={n => patch(c => { c.level = n || 1; })} />
                </div>
              </div>
            </>
          )}
          {characterHasTrait(ch, 'mythic') ? (
            <div className="mythic-row">
              <span className="field-label" style={{ margin: 0 }}>Мифические очки</span>
              <div className="mythic-dots">
                {[1, 2, 3].map(v => (
                  <div
                    key={v}
                    className={`dot ${v <= ch.mythicPoints ? 'filled' : ''}`}
                    onClick={() => {
                      patch(c => { c.mythicPoints = c.mythicPoints === v ? v - 1 : v; });
                      toast('Мифические очки ' + useSheet.getState().character.mythicPoints, 'mythic');
                      flash('mythic', 'accent');
                    }}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 8 }}>Дескрипторы персонажа</h3>
          <div className="tag-chip-box">
            {ch.traits.length
              ? ch.traits.map((t, i) => (
                <TraitChip key={i} trait={t} onDelete={play ? undefined : () => patch(c => { c.traits.splice(i, 1); })} />
              ))
              : <div className="empty-hint" style={{ padding: '6px 0' }}>Дескрипторов пока нет</div>}
          </div>
          {play ? null : (
            <TraitAdder
              placeholder="Выберите из библиотеки или введите свой…"
              onAdd={tag => patch(c => {
                if (!c.traits.some(t => traitKey(t) === traitKey(tag))) c.traits.push(tag);
              })}
            />
          )}
        </div>

        <Collapsible
          title="О персонаже"
          collapsed={!!ch.aboutCollapsed}
          onToggle={() => patch(c => { c.aboutCollapsed = !c.aboutCollapsed; })}
        >
          <div className="desc-grid">
            {[
              ['ancestry', 'Родословная'],
              ['heritage', 'Родина'],
              ['background', 'Предыстория'],
              ['alignment', 'Мировоззрение'],
              ['deity', 'Божество'],
              ['size', 'Размер'],
            ].map(([key, label]) => (
              <div className="field" key={key}>
                <label className="field-label">{label}</label>
                {play
                  ? <div className="play-text">{ch.descriptors[key] || '—'}</div>
                  : <TextField value={ch.descriptors[key]} onChange={v => patch(c => { c.descriptors[key] = v; })} />}
              </div>
            ))}
          </div>
          <div className="field">
            <label className="field-label">Языки</label>
            <div className="tag-chip-box">
              {ch.languages.length
                ? ch.languages.map((t, i) => (
                  <span className="tag-chip" key={i}>
                    {t}
                    {play ? null : <button type="button" onClick={() => patch(c => { c.languages.splice(i, 1); })}>✕</button>}
                  </span>
                ))
                : <span className="empty-hint" style={{ padding: '2px 0' }}>Языков пока нет</span>}
            </div>
            {play ? null : <LangAdder />}
          </div>
          {play ? (
            <>
              <div className="field">
                <label className="field-label">Внешность</label>
                {ch.appearance?.trim()
                  ? <div className="play-text" style={{ whiteSpace: 'pre-wrap' }}>{ch.appearance}</div>
                  : <div className="empty-hint" style={{ padding: '2px 0' }}>Нет внешности</div>}
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label className="field-label">Заметки</label>
                {ch.notes?.trim()
                  ? <div className="play-text" style={{ whiteSpace: 'pre-wrap' }}>{ch.notes}</div>
                  : <div className="empty-hint" style={{ padding: '2px 0' }}>Нет заметок</div>}
              </div>
            </>
          ) : (
            <>
              <div className="field">
                <label className="field-label">Внешность</label>
                <Autosize value={ch.appearance} onChange={v => patch(c => { c.appearance = v; })} />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label className="field-label">Заметки</label>
                <Autosize value={ch.notes} onChange={v => patch(c => { c.notes = v; })} />
              </div>
            </>
          )}
        </Collapsible>

        <Collapsible
          title="Характеристики"
          collapsed={!!ch.abilitiesCollapsed}
          onToggle={() => patch(c => { c.abilitiesCollapsed = !c.abilitiesCollapsed; })}
        >
          {play ? null : <div className="ability-hint">Указывается сразу модификатор характеристики. Если модификатор уже +4 или больше, повышение сначала ставит отметку «½» — второе такое повышение поднимает модификатор на +1.</div>}
          {play ? (
            <div className="familiar-ability-grid">
              {ABILITY_DEFS.map(d => (
                <div className="compact-stat" key={d.id}><span className="k">{d.name}</span><span className="v">{fmtMod(a[d.id].mod)}</span></div>
              ))}
            </div>
          ) : ABILITY_DEFS.map(d => {
            const st = a[d.id];
            return (
              <div className="ability-row" key={d.id}>
                <div className="ability-name">{d.name}</div>
                <label className={`partial-toggle ${st.partial ? 'active' : ''}`}>
                  <input type="checkbox" checked={!!st.partial} onChange={e => patch(c => { c.abilities[d.id].partial = e.target.checked; })} />½
                </label>
                <div className="ability-controls">
                  <button type="button" className="btn btn-icon btn-sm" onClick={() => patch(c => applyAbilityFlaw(c.abilities[d.id]))}>−</button>
                  <div className="ability-mod-wrap">
                    <NumericField className="ability-mod-input" value={st.mod} onChange={n => patch(c => { c.abilities[d.id].mod = n; })} />
                  </div>
                  <button type="button" className="btn btn-icon btn-sm" onClick={() => patch(c => applyAbilityBoost(c.abilities[d.id]))}>+</button>
                </div>
              </div>
            );
          })}
        </Collapsible>

        <Collapsible
          title="Здоровье"
          collapsed={!!ch.hpCollapsed}
          onToggle={() => patch(c => { c.hpCollapsed = !c.hpCollapsed; })}
          compact={ch.hpCollapsed ? (
            <div className="compact-panel compact-hp">
              <div className="compact-hp-value">
                <FlashNum flashKey="hp" className="hp-num">{ch.hp.current}</FlashNum>
                <span className="hp-max"> / {ch.hp.max}</span>
                {ch.hp.temp > 0 ? <span className="pill" style={{ marginLeft: 8, color: '#8fb4de', borderColor: '#3a5474' }}>+{ch.hp.temp} врем.</span> : null}
              </div>
              <HpButtons onDelta={hpDelta} onFill={hpFill} />
              <HpBar current={ch.hp.current} max={ch.hp.max} temp={ch.hp.temp} />
            </div>
          ) : null}
        >
          <div className="hp-main">
            <FlashNum flashKey="hp" className="hp-num">{ch.hp.current}</FlashNum>
            <span className="hp-max"> / {ch.hp.max}</span>
            {ch.hp.temp > 0 ? <span className="pill" style={{ marginLeft: 8, color: '#8fb4de', borderColor: '#3a5474' }}>+{ch.hp.temp} врем.</span> : null}
          </div>
          <HpBar current={ch.hp.current} max={ch.hp.max} temp={ch.hp.temp} />
          <HpButtons onDelta={hpDelta} onFill={hpFill} />
          <div className="row2" style={{ marginTop: 10 }}>
            <div className="field" style={{ marginBottom: 0 }}>
              <label className="field-label">Текущие ОЗ</label>
              <NumericField
                value={ch.hp.current}
                onChange={n => patch(c => { c.hp.current = n; })}
                onCommit={n => patch(c => { c.hp.current = clamp(n, -9999, c.hp.max); })}
              />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label className="field-label">Максимум ОЗ</label>
              {play
                ? <div className="play-text" style={{ paddingTop: 8, fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{ch.hp.max}</div>
                : <NumericField min={0} value={ch.hp.max} onChange={n => patch(c => { c.hp.max = Math.max(0, n); })} />}
            </div>
          </div>
          <div className="temp-hp-field">
            <label>Временные ОЗ</label>
            <NumericField min={0} value={ch.hp.temp} style={{ width: 90 }} onChange={n => patch(c => { c.hp.temp = Math.max(0, n); })} />
          </div>
          <div className="field" style={{ marginTop: 14, marginBottom: 0 }}>
            <label className="field-label">Сопротивления, уязвимости, иммунитеты</label>
            <div className="tag-chip-box">
              {(ch.hp.resistances || []).length
                ? ch.hp.resistances.map(r => (
                  <span key={r.id} className={`tag-chip ${r.type === 'resistance' ? 'resist' : r.type === 'weakness' ? 'weak' : 'immune'}`}>
                    {resistLabel(r)}
                    {play ? null : <button type="button" onClick={() => patch(c => { c.hp.resistances = c.hp.resistances.filter(x => x.id !== r.id); })}>✕</button>}
                  </span>
                ))
                : <span className="empty-hint" style={{ padding: '2px 0' }}>Нет</span>}
            </div>
            {play ? null : (
              <button type="button" className="btn btn-sm btn-accent" onClick={() => openModal({
                title: 'Сопротивление / уязвимость / иммунитет',
                body: (close) => <ResistForm onClose={close} />,
              })}>+ Добавить</button>
            )}
          </div>
        </Collapsible>

        <Collapsible
          title="Защита"
          collapsed={!!ch.defensesCollapsed}
          onToggle={() => patch(c => { c.defensesCollapsed = !c.defensesCollapsed; })}
          compact={ch.defensesCollapsed ? (
            <div className="compact-panel compact-def">
              <div className="compact-stat"><span className="k">КБ</span><span className="v">{acInfo.total}</span></div>
              <div className="compact-stat"><span className="k">С</span><span className="v">{fmtMod(fortTotal)}</span></div>
              <div className="compact-stat"><span className="k">Р</span><span className="v">{fmtMod(refTotal)}</span></div>
              <div className="compact-stat"><span className="k">В</span><span className="v">{fmtMod(willTotal)}</span></div>
            </div>
          ) : null}
        >
          <div className="def-grid">
            <div className="def-box">
              <div className="def-title">Класс Доспеха</div>
              <div className="def-val">{acInfo.total}</div>
              {play ? (
                <div className="play-text" style={{ marginTop: 6 }}>
                  {acInfo.armorItem ? `${acInfo.armorItem.name} ${fmtMod(acInfo.armorBonus)}` : 'Без доспеха'}
                  {acInfo.shieldItem ? ` · ${acInfo.shieldItem.name} ${fmtMod(acInfo.shieldBonus)}` : ''}
                </div>
              ) : (
                <>
                  <ProfSelect value={ch.defenses.ac.proficiency} onChange={v => patch(c => { c.defenses.ac.proficiency = v; })} />
                  <div className="play-text" style={{ marginTop: 6 }}>{acInfo.armorItem ? 'Броня: ' + acInfo.armorItem.name + ' ' + fmtMod(acInfo.armorBonus) : 'Броня: нет'}</div>
                  <div className="play-text">{acInfo.shieldItem ? 'Щит: ' + acInfo.shieldItem.name + ' ' + fmtMod(acInfo.shieldBonus) : 'Щит: нет'}</div>
                  <div className="mini-row">
                    <NumericField value={ch.defenses.ac.otherBonus || 0} title="Прочие бонусы" onChange={n => patch(c => { c.defenses.ac.otherBonus = n; })} />
                  </div>
                </>
              )}
            </div>
            {[['fort', 'Стойкость', fortTotal], ['ref', 'Реакция', refTotal], ['will', 'Воля', willTotal]].map(([key, title, total]) => (
              <div className="def-box" key={key}>
                <div className="def-title">{title}</div>
                <div className="def-val">{fmtMod(total)}</div>
                {play ? (
                  ch.defenses[key].critUpgrade ? <span className="pill crit-pill">успех → крит.</span> : null
                ) : (
                  <>
                    <ProfSelect value={ch.defenses[key].proficiency} onChange={v => patch(c => { c.defenses[key].proficiency = v; })} />
                    <div className="mini-row">
                      <NumericField value={ch.defenses[key].otherBonus || 0} onChange={n => patch(c => { c.defenses[key].otherBonus = n; })} />
                    </div>
                    <label className="crit-toggle">
                      <input type="checkbox" checked={!!ch.defenses[key].critUpgrade} onChange={e => patch(c => { c.defenses[key].critUpgrade = e.target.checked; })} />
                      Успех → крит. успех
                    </label>
                  </>
                )}
              </div>
            ))}
          </div>
        </Collapsible>

        <Collapsible
          title="Восприятие"
          collapsed={!!ch.perceptionCollapsed}
          onToggle={() => patch(c => { c.perceptionCollapsed = !c.perceptionCollapsed; })}
          compact={ch.perceptionCollapsed ? (
            <div className="compact-panel compact-perception">
              <div className="compact-perception-value">{fmtMod(perceptionTotal)}</div>
              <div className="tag-chip-box">
                {['precise', 'imprecise', 'vague'].flatMap(key => (ch.perception.senses[key] || []).map((s, i) => (
                  <span className="tag-chip" key={key + i}>{s}</span>
                )))}
              </div>
            </div>
          ) : null}
        >
          <div className="def-box" style={{ marginBottom: 14 }}>
            <div className="def-title">Внимательность</div>
            <div className="def-val">{fmtMod(perceptionTotal)}</div>
            {play ? null : (
              <>
                <ProfSelect value={ch.perception.proficiency} onChange={v => patch(c => { c.perception.proficiency = v; })} />
                <div className="mini-row">
                  <NumericField value={ch.perception.otherBonus || 0} onChange={n => patch(c => { c.perception.otherBonus = n; })} />
                </div>
              </>
            )}
          </div>
          <SenseGroup k="precise" label="Точные" play={play} list={ch.perception.senses.precise || []} />
          <SenseGroup k="imprecise" label="Вспомогательные" play={play} list={ch.perception.senses.imprecise || []} />
          <SenseGroup k="vague" label="Дополнительные" play={play} list={ch.perception.senses.vague || []} />
        </Collapsible>

        <div className="card">
          <h3 style={{ marginBottom: 10 }}>Движение</h3>
          {play ? (
            <div className="compact-speeds">
              <div className="compact-stat"><span className="k">Наземная</span><span className="v">{ch.speeds.base}</span></div>
              {(ch.speeds.extra || []).map(s => (
                <div className="compact-stat" key={s.id}><span className="k">{s.name || 'Скорость'}</span><span className="v">{s.value || '—'}</span></div>
              ))}
            </div>
          ) : (
            <>
              <div className="field speed-setup">
                <label className="field-label">Наземная скорость (футы)</label>
                <NumericField className="speed-num" value={ch.speeds.base} onChange={n => patch(c => { c.speeds.base = n; })} />
              </div>
              {ch.speeds.extra.map(s => (
                <div className="extra-speed-row" key={s.id}>
                  <span>{s.name}{s.value ? ' — ' + s.value : ''}</span>
                  <button type="button" onClick={() => patch(c => { c.speeds.extra = c.speeds.extra.filter(x => x.id !== s.id); })}>✕</button>
                </div>
              ))}
              <button type="button" className="btn btn-sm" style={{ marginTop: 10 }} onClick={() => openModal({
                title: 'Дополнительная скорость',
                body: (close) => <SpeedForm onClose={close} />,
              })}>+ Доп. скорость</button>
            </>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 6 }}>Навыки</h3>
          <ReorderList
            itemSelector=".skill-row[data-skill-id]"
            handleSelector="[data-skill-drag-handle]"
            canReorder={() => !isPlay(useSheet.getState().character)}
            onReorder={(_, ids) => patch(c => { c.skills = ids.map(id => c.skills.find(s => s.id === id)).filter(Boolean); })}
          >
            {ch.skills.map(s => {
              const total = a[s.ability].mod + profTotal(s.proficiency, level) + Number(s.otherBonus || 0);
              if (play) {
                return (
                  <div className="skill-row play-skill-row" key={s.id}>
                    <div className="skill-name">
                      <div className="n">{s.name || 'Без названия'}</div>
                      <div className="a">{ABILITY_SHORT[s.ability]}</div>
                    </div>
                    <div className="skill-total">{fmtMod(total)}</div>
                  </div>
                );
              }
              return (
                <div className="skill-row" data-skill-id={s.id} data-reorder-id={s.id} key={s.id}>
                  <span className="drag-handle" data-skill-drag-handle aria-label="Перетащить навык" title="Перетащить навык">⠿</span>
                  <div className="skill-name">
                    <div className="n">
                      {s.multi
                        ? <TextField className="skill-multi-name" value={s.name} placeholder="Название" onChange={v => patch(c => { const x = c.skills.find(t => t.id === s.id); if (x) x.name = v; })} />
                        : (s.name || 'Без названия')}
                    </div>
                    <div className="a">{ABILITY_SHORT[s.ability]}</div>
                  </div>
                  <div className="skill-prof">
                    <ProfDots rank={s.proficiency} onChange={r => patch(c => { const x = c.skills.find(t => t.id === s.id); if (x) x.proficiency = r; })} />
                  </div>
                  <div className="skill-bonus-input">
                    <NumericField value={s.otherBonus || 0} title="доп. бонус" onChange={n => patch(c => { const x = c.skills.find(t => t.id === s.id); if (x) x.otherBonus = n; })} />
                  </div>
                  <div className="skill-total">{fmtMod(total)}</div>
                  {s.multi
                    ? <button type="button" className="skill-del" onClick={() => patch(c => { c.skills = c.skills.filter(x => x.id !== s.id); })}>✕</button>
                    : <span style={{ width: 20, display: 'inline-block' }} />}
                </div>
              );
            })}
          </ReorderList>
          {play ? null : (
            <div className="row2" style={{ marginTop: 10 }}>
              <button type="button" className="btn btn-sm" onClick={() => patch(c => {
                c.skills.push({ id: uid(), name: 'Знание (…)', ability: 'int', proficiency: 'untrained', otherBonus: 0, multi: true });
              })}>+ Знание</button>
              <button type="button" className="btn btn-sm" onClick={() => patch(c => {
                c.skills.push({ id: uid(), name: 'Ремесло (…)', ability: 'int', proficiency: 'untrained', otherBonus: 0, multi: true });
              })}>+ Ремесло</button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function LangAdder() {
  const [v, setV] = useState('');
  function add() {
    const t = v.trim();
    if (!t) return;
    patch(c => { if (!c.languages.includes(t)) c.languages.push(t); });
    setV('');
  }
  return (
    <div className="tag-input-row">
      <input type="text" placeholder="Добавить язык…" value={v} onChange={e => setV(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} />
      <button type="button" className="btn btn-accent" onClick={add}>+</button>
    </div>
  );
}

function SenseGroup({ k, label, play, list }) {
  const [v, setV] = useState('');
  function add() {
    const t = v.trim();
    if (!t) return;
    patch(c => { c.perception.senses[k].push(t); });
    setV('');
  }
  return (
    <div className="field" style={{ marginBottom: 10 }}>
      <label className="field-label">{label}</label>
      <div className="tag-chip-box">
        {list.length
          ? list.map((s, i) => (
            <span className="tag-chip" key={i}>
              {s}
              {play ? null : <button type="button" onClick={() => patch(c => { c.perception.senses[k].splice(i, 1); })}>✕</button>}
            </span>
          ))
          : <span className="empty-hint" style={{ padding: '2px 0' }}>Нет</span>}
      </div>
      {play ? null : (
        <div className="tag-input-row">
          <input type="text" placeholder="Добавить..." value={v} onChange={e => setV(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} />
          <button type="button" className="btn btn-sm btn-accent" onClick={add}>+</button>
        </div>
      )}
    </div>
  );
}

function ResistForm({ onClose }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('resistance');
  const [value, setValue] = useState('5');
  return (
    <>
      <div className="field"><label className="field-label">Тип урона или эффекта</label><input type="text" placeholder="Огонь, Холод, Электричество…" value={name} onChange={e => setName(e.target.value)} /></div>
      <div className="field">
        <label className="field-label">Тип</label>
        <select value={type} onChange={e => setType(e.target.value)}>
          <option value="resistance">Сопротивление</option>
          <option value="weakness">Уязвимость</option>
          <option value="immunity">Иммунитет</option>
        </select>
      </div>
      {type === 'immunity' ? null : (
        <div className="field">
          <label className="field-label">Значение</label>
          <input type="text" inputMode="numeric" value={value} onChange={e => setValue(e.target.value)} />
        </div>
      )}
      <div className="modal-actions">
        <button type="button" className="btn btn-block" onClick={onClose}>Отмена</button>
        <button type="button" className="btn btn-accent btn-block" onClick={() => {
          const n = name.trim();
          if (!n) return;
          patch(c => {
            c.hp.resistances.push({ id: uid(), name: n, type, value: type === 'immunity' ? null : (Number(value) || 0) });
          });
          onClose();
        }}>Добавить</button>
      </div>
    </>
  );
}

function SpeedForm({ onClose }) {
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  return (
    <>
      <div className="field"><label className="field-label">Название</label><input type="text" placeholder="Полёт, Лазание, Плавание…" value={name} onChange={e => setName(e.target.value)} /></div>
      <div className="field"><label className="field-label">Значение</label><input type="text" placeholder="30 фт" value={value} onChange={e => setValue(e.target.value)} /></div>
      <div className="modal-actions">
        <button type="button" className="btn btn-block" onClick={onClose}>Отмена</button>
        <button type="button" className="btn btn-accent btn-block" onClick={() => {
          const n = name.trim();
          if (!n) return;
          patch(c => { c.speeds.extra.push({ id: uid(), name: n, value: value.trim() }); });
          onClose();
        }}>Добавить</button>
      </div>
    </>
  );
}
