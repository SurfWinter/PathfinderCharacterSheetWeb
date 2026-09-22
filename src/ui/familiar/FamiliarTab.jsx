import { useState } from 'react';
import { ABILITY_DEFS, uid } from '../../domain/character-state.js';
import {
  DAMAGE_TYPES_RESISTANCE, SKILLED_EXCLUDED, familiarAbilityEffect, getLibraryFamiliarAbility,
  hasFamiliarEffect, instantiateLibraryFamiliarAbility, matchLibraryFamiliarAbility,
  resistanceFromAbilities, searchLibraryFamiliarAbilities, skilledSkillsFromAbilities,
} from '../../domain/libraries/familiar-abilities.js';
import { ABILITY_SHORT, applyHpDeltaTo, clamp, fmtMod, isPlay, profTotal, saveTotal, traitKey } from '../../lib/rules.js';
import { flash, patch, toast, useCharacter, useSheet } from '../../state/store.js';
import { Topbar } from '../shell.jsx';
import { Autosize, Collapsible, FlashNum, HpBar, HpButtons, ListItem, NumericField, TextField, TraitAdder, TraitChip } from '../shared.jsx';

export function familiarDerived(ch) {
  const level = Number(ch.level) || 1;
  const spellKey = (ch.spellcasting && ch.spellcasting.ability) || 'int';
  const spellMod = (ch.abilities[spellKey] && ch.abilities[spellKey].mod) || 0;
  const special = level + Math.max(3, spellMod);
  const F = ch.familiar || {};
  const abilities = F.abilities || [];
  const tough = hasFamiliarEffect(abilities, 'tough');
  return {
    level,
    spellMod,
    hpMax: (5 + (tough ? 2 : 0)) * level,
    tough,
    specialSkills: special,
    skilledSkills: skilledSkillsFromAbilities(abilities).map(name => ({ name, total: level + spellMod })),
    otherSkills: level,
    resistances: resistanceFromAbilities(abilities, level),
    fort: saveTotal(ch, 'fort', 'con'),
    ref: saveTotal(ch, 'ref', 'dex'),
    will: saveTotal(ch, 'will', 'wis'),
  };
}

function withFamiliarHpAdjust(ch, mutate) {
  const F = ch.familiar;
  const before = familiarDerived(ch).hpMax;
  mutate();
  const after = familiarDerived(ch).hpMax;
  if (after > before) {
    F.hp.current = clamp((Number(F.hp.current) || 0) + (after - before), 0, after);
  } else if (after < before) {
    F.hp.current = clamp(Number(F.hp.current) || 0, 0, after);
  }
}

export default function FamiliarTab() {
  const ch = useCharacter();
  const F = ch.familiar;
  const d = familiarDerived(ch);
  const play = isPlay(ch);
  const openModal = useSheet(s => s.openModal);
  const hpMax = d.hpMax;
  const hpCur = clamp(Number(F.hp.current) || 0, 0, hpMax);

  function hpDelta(delta) {
    patch(c => applyHpDeltaTo(c.familiar.hp, delta, familiarDerived(c).hpMax));
    const cur = useSheet.getState().character.familiar.hp.current;
    toast('ПЗ ' + (delta < 0 ? String(delta) : '+' + delta) + ' → ' + cur, delta < 0 ? 'bad' : 'good');
    flash('fam-hp', delta < 0 ? 'bad' : 'good');
  }
  function hpFill() {
    patch(c => { c.familiar.hp.current = familiarDerived(c).hpMax; });
    toast('ПЗ → макс. ' + useSheet.getState().character.familiar.hp.current, 'good');
    flash('fam-hp', 'good');
  }

  const resistChips = d.resistances.types.length
    ? d.resistances.types.map(t => (
      <span className="tag-chip resist" key={t}>Устойчивость к {t} {d.resistances.value}</span>
    ))
    : null;

  return (
    <>
      <Topbar title="Фамильяр" subtitle={`${F.kind || 'Вид не указан'} · Ур. ${d.level}`} />
      <div className="page active">
        <div className="card">
          {play ? (
            <div className="play-id">
              <div className="name-display">{F.name || 'Без имени'}</div>
              <div className="row2">
                <div className="play-kv"><span>Вид</span>{F.kind || '—'}</div>
                <div className="play-kv"><span>Уровень</span>{d.level}</div>
              </div>
            </div>
          ) : (
            <>
              <div className="field">
                <TextField className="name-input" placeholder="Имя фамильяра" value={F.name} onChange={v => patch(c => { c.familiar.name = v; })} />
              </div>
              <div className="row2" style={{ marginBottom: 0 }}>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label className="field-label">Вид</label>
                  <TextField placeholder="Ворон, кошка, леший…" value={F.kind} onChange={v => patch(c => { c.familiar.kind = v; })} />
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label className="field-label">Уровень</label>
                  <input type="text" value={d.level} disabled title="Совпадает с уровнем хозяина" />
                </div>
              </div>
            </>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 8 }}>Дескрипторы</h3>
          <div className="tag-chip-box">
            {(F.traits || []).length
              ? F.traits.map((t, i) => (
                <TraitChip key={i} trait={t} onDelete={play ? undefined : () => patch(c => { c.familiar.traits.splice(i, 1); })} />
              ))
              : <div className="empty-hint" style={{ padding: '6px 0' }}>Дескрипторов пока нет</div>}
          </div>
          {play ? null : (
            <TraitAdder
              placeholder="Выберите из библиотеки или введите свой…"
              onAdd={tag => patch(c => {
                if (!(c.familiar.traits || []).some(t => traitKey(t) === traitKey(tag))) c.familiar.traits.push(tag);
              })}
            />
          )}
        </div>

        <Collapsible
          title="Здоровье"
          collapsed={!!F.hpCollapsed}
          onToggle={() => patch(c => { c.familiar.hpCollapsed = !c.familiar.hpCollapsed; })}
          compact={F.hpCollapsed ? (
            <div className="compact-panel compact-hp">
              <div className="compact-hp-value">
                <FlashNum flashKey="fam-hp" className="hp-num">{hpCur}</FlashNum>
                <span className="hp-max"> / {hpMax}</span>
                {F.hp.temp > 0 ? <span className="pill" style={{ marginLeft: 8, color: '#8fb4de', borderColor: '#3a5474' }}>+{F.hp.temp} врем.</span> : null}
              </div>
              <HpButtons onDelta={hpDelta} onFill={hpFill} />
              <HpBar current={hpCur} max={hpMax} temp={F.hp.temp || 0} />
              {resistChips ? <div className="tag-chip-box" style={{ marginTop: 8, marginBottom: 0 }}>{resistChips}</div> : null}
            </div>
          ) : null}
        >
          <div className="hp-main">
            <FlashNum flashKey="fam-hp" className="hp-num">{hpCur}</FlashNum>
            <span className="hp-max"> / {hpMax}</span>
            {F.hp.temp > 0 ? <span className="pill" style={{ marginLeft: 8, color: '#8fb4de', borderColor: '#3a5474' }}>+{F.hp.temp} врем.</span> : null}
          </div>
          <HpBar current={hpCur} max={hpMax} temp={F.hp.temp || 0} />
          <HpButtons onDelta={hpDelta} onFill={hpFill} />
          <div className="row2" style={{ marginTop: 10 }}>
            <div className="field" style={{ marginBottom: 0 }}>
              <label className="field-label">Текущие ОЗ</label>
              <NumericField value={hpCur} onChange={n => patch(c => { c.familiar.hp.current = clamp(n, 0, familiarDerived(c).hpMax); })} />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label className="field-label">Максимум ОЗ</label>
              <input type="text" value={hpMax} disabled />
            </div>
          </div>
          <div className="temp-hp-field">
            <label>Временные ОЗ</label>
            <NumericField min={0} value={F.hp.temp || 0} style={{ width: 90 }} onChange={n => patch(c => { c.familiar.hp.temp = Math.max(0, n); })} />
          </div>
          <div className="empty-hint" style={{ marginTop: 8 }}>Максимум: {d.tough ? '7' : '5'} × уровень хозяина{d.tough ? ' (живучий)' : ''}.</div>
          {resistChips ? <div className="tag-chip-box" style={{ marginTop: 8, marginBottom: 0 }}>{resistChips}</div> : null}
        </Collapsible>

        <Collapsible
          title="Защита"
          collapsed={!!F.defensesCollapsed}
          onToggle={() => patch(c => { c.familiar.defensesCollapsed = !c.familiar.defensesCollapsed; })}
          compact={F.defensesCollapsed ? (
            <div className="compact-panel compact-def">
              <div className="compact-stat"><span className="k">КБ</span><span className="v">{F.ac}</span></div>
              <div className="compact-stat"><span className="k">С</span><span className="v">{fmtMod(d.fort)}</span></div>
              <div className="compact-stat"><span className="k">Р</span><span className="v">{fmtMod(d.ref)}</span></div>
              <div className="compact-stat"><span className="k">В</span><span className="v">{fmtMod(d.will)}</span></div>
            </div>
          ) : null}
        >
          <div className="field">
            <label className="field-label">Класс доспеха</label>
            {play
              ? <div className="def-box" style={{ padding: '8px 10px' }}><div className="def-val">{F.ac}</div></div>
              : <NumericField value={F.ac} onChange={n => patch(c => { c.familiar.ac = n; })} />}
          </div>
          <div className="compact-def compact-def-3" style={{ marginTop: 8 }}>
            <div className="compact-stat"><span className="k">Стойкость</span><span className="v">{fmtMod(d.fort)}</span></div>
            <div className="compact-stat"><span className="k">Реакция</span><span className="v">{fmtMod(d.ref)}</span></div>
            <div className="compact-stat"><span className="k">Воля</span><span className="v">{fmtMod(d.will)}</span></div>
          </div>
          <div className="empty-hint" style={{ marginTop: 8 }}>Испытания как у хозяина. КБ задаётся отдельно — броня хозяина на фамильяра не переносится.</div>
        </Collapsible>

        <div className="card">
          <h3 style={{ marginBottom: 10 }}>Навыки</h3>
          <div className="familiar-skill-grid">
            <div className="compact-stat familiar-skill-stat">
              <span className="k">Внимание, Акробатика, Скрытность</span>
              <span className="v">{fmtMod(d.specialSkills)}</span>
            </div>
            {d.skilledSkills.map(s => (
              <div className="compact-stat familiar-skill-stat" key={s.name}>
                <span className="k">{s.name}</span>
                <span className="v">{fmtMod(s.total)}</span>
              </div>
            ))}
            <div className="compact-stat familiar-skill-stat">
              <span className="k">Прочие навыки</span>
              <span className="v">{fmtMod(d.otherSkills)}</span>
            </div>
          </div>
          <div className="empty-hint" style={{ marginTop: 8 }}>Внимание / Акробатика / Скрытность: уровень + наибольшее из 3 и модификатора заклинательной характеристики. Умелец: уровень + этот модификатор. Прочие равны уровню хозяина.</div>
        </div>

        <Collapsible
          title="Характеристики"
          collapsed={!!F.statsCollapsed}
          onToggle={() => patch(c => { c.familiar.statsCollapsed = !c.familiar.statsCollapsed; })}
          compact={F.statsCollapsed ? (
            <div className="compact-panel familiar-ability-grid">
              {ABILITY_DEFS.map(def => (
                <div className="compact-stat" key={def.id}><span className="k">{ABILITY_SHORT[def.id]}</span><span className="v">{fmtMod(ch.abilities[def.id].mod)}</span></div>
              ))}
            </div>
          ) : null}
        >
          <div className="familiar-ability-grid">
            {ABILITY_DEFS.map(def => (
              <div className="compact-stat" key={def.id}><span className="k">{ABILITY_SHORT[def.id]}</span><span className="v">{fmtMod(ch.abilities[def.id].mod)}</span></div>
            ))}
          </div>
          <div className="empty-hint" style={{ marginTop: 8 }}>Модификаторы как у хозяина.</div>
        </Collapsible>

        <div className="card">
          <h3 style={{ marginBottom: 10 }}>Движение</h3>
          {play ? (
            <div className="compact-speeds">
              <div className="compact-stat"><span className="k">Наземная</span><span className="v">{F.speeds.base}</span></div>
              {(F.speeds.extra || []).map(s => (
                <div className="compact-stat" key={s.id}><span className="k">{s.name || 'Скорость'}</span><span className="v">{s.value || '—'}</span></div>
              ))}
            </div>
          ) : (
            <>
              <div className="field speed-setup">
                <label className="field-label">Наземная скорость (футы)</label>
                <NumericField className="speed-num" value={F.speeds.base} onChange={n => patch(c => { c.familiar.speeds.base = n; })} />
              </div>
              {F.speeds.extra.map(s => (
                <div className="extra-speed-row" key={s.id}>
                  <span>{s.name}{s.value ? ' — ' + s.value : ''}</span>
                  <button type="button" onClick={() => patch(c => { c.familiar.speeds.extra = c.familiar.speeds.extra.filter(x => x.id !== s.id); })}>✕</button>
                </div>
              ))}
              <button type="button" className="btn btn-sm" style={{ marginTop: 10 }} onClick={() => openModal({
                title: 'Дополнительная скорость',
                body: close => <FamSpeedForm onClose={close} />,
              })}>+ Доп. скорость</button>
            </>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 8 }}>Способности</h3>
          {play ? null : <button type="button" className="btn btn-accent btn-block" style={{ marginBottom: 12 }} onClick={() => openModal({
            title: 'Способность фамильяра',
            body: close => <FamAbilityForm onClose={close} />,
          })}>+ Добавить способность</button>}
          {(F.abilities || []).length
            ? F.abilities.map(ab => {
              const effect = familiarAbilityEffect(ab);
              const meta = effect === 'skilled' && ab.skill
                ? ab.skill
                : effect === 'resistance' && (ab.damageTypes || []).length
                  ? (ab.damageTypes || []).join(', ')
                  : '';
              return (
                <ListItem
                  key={ab.id}
                  id={'famab-' + ab.id}
                  head={
                    <div>
                      <div className="name">{ab.name || 'Без названия'}</div>
                      {meta ? <div className="tag">{meta}</div> : null}
                    </div>
                  }
                  body={
                    <>
                      <div>{ab.desc || 'Без описания'}</div>
                      {play ? null : (
                        <div className="list-item-actions">
                          <button type="button" className="btn btn-sm" onClick={() => openModal({
                            title: 'Изменить способность',
                            body: close => <FamAbilityForm initial={ab} onClose={close} />,
                          })}>Изменить</button>
                          <button type="button" className="btn btn-sm btn-danger" onClick={() => patch(c => {
                            withFamiliarHpAdjust(c, () => {
                              c.familiar.abilities = c.familiar.abilities.filter(x => x.id !== ab.id);
                            });
                          })}>Удалить</button>
                        </div>
                      )}
                    </>
                  }
                />
              );
            })
            : <div className="empty-hint">Нет способностей фамильяра — добавьте в режиме настройки</div>}
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 8 }}>Связь</h3>
          <div className="play-text">Эмпатическая связь до 1 мили: фамильяр делится эмоциями. Он не понимает языков и не говорит, пока способность не даст ему эту возможность.</div>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 8 }}>Заметки</h3>
          {play
            ? (F.notes && F.notes.trim() ? <div className="play-text">{F.notes}</div> : <div className="empty-hint">Нет заметок</div>)
            : <Autosize value={F.notes} onChange={v => patch(c => { c.familiar.notes = v; })} />}
        </div>
      </div>
    </>
  );
}

function FamSpeedForm({ onClose }) {
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  return (
    <>
      <div className="field"><label className="field-label">Название</label><input type="text" placeholder="Полёт, Лазание, Плавание…" value={name} onChange={e => setName(e.target.value)} /></div>
      <div className="field"><label className="field-label">Значение</label><input type="text" placeholder="30" value={value} onChange={e => setValue(e.target.value)} /></div>
      <div className="modal-actions">
        <button type="button" className="btn btn-block" onClick={onClose}>Отмена</button>
        <button type="button" className="btn btn-accent btn-block" onClick={() => {
          const n = name.trim();
          if (!n) return;
          patch(c => { c.familiar.speeds.extra.push({ id: uid(), name: n, value: value.trim() }); });
          onClose();
        }}>Добавить</button>
      </div>
    </>
  );
}

function familiarSkilledOptions(ch) {
  const seen = new Set();
  const names = [];
  (ch.skills || []).forEach(skill => {
    const name = String(skill.name || '').trim();
    const key = name.toLocaleLowerCase('ru');
    if (!name || SKILLED_EXCLUDED.includes(key) || seen.has(key)) return;
    seen.add(key);
    names.push(name);
  });
  return names;
}

function FamAbilityForm({ initial, onClose }) {
  const ch = useCharacter();
  const [name, setName] = useState(initial?.name || '');
  const [desc, setDesc] = useState(initial?.desc || '');
  const [picked, setPicked] = useState(() => initial?.libraryId ? getLibraryFamiliarAbility(initial.libraryId) : matchLibraryFamiliarAbility(initial?.name || ''));
  const [skill, setSkill] = useState(initial?.skill || '');
  const [type1, setType1] = useState((initial?.damageTypes || [])[0] || '');
  const [type2, setType2] = useState((initial?.damageTypes || [])[1] || '');
  const matches = searchLibraryFamiliarAbilities(name);
  const effect = (picked && picked.effect) || null;

  function applyPick(entry) {
    setPicked(entry);
    setName(entry.name);
    setDesc(entry.desc);
  }

  function extras() {
    const types = [];
    if (type1) types.push(type1);
    if (type2) types.push(type2);
    return { skill: skill.trim() || null, damageTypes: types.length ? types : null };
  }

  return (
    <>
      <div className="field">
        <label className="field-label">Название</label>
        <input type="text" value={name} placeholder="Из библиотеки или своё…" onChange={e => {
          setName(e.target.value);
          setPicked(matchLibraryFamiliarAbility(e.target.value));
        }} />
      </div>
      <div className="tag-suggestions">
        {matches.map(entry => (
          <button type="button" key={entry.id} className="tag-suggestion" onClick={() => applyPick(entry)}>
            <span>{entry.name}</span><small>{entry.effect ? 'эффект' : 'библиотека'}</small>
          </button>
        ))}
      </div>
      {effect === 'skilled' ? (
        <div className="field">
          <label className="field-label">Навык умельца</label>
          <select value={skill} onChange={e => setSkill(e.target.value)}>
            <option value="">Выберите навык</option>
            {familiarSkilledOptions(ch).map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <div className="empty-hint" style={{ textAlign: 'left', padding: '6px 0 0' }}>Кроме Акробатики и Скрытности. Можно взять несколько раз.</div>
        </div>
      ) : null}
      {effect === 'resistance' ? (
        <div className="row2">
          <div className="field">
            <label className="field-label">Тип урона 1</label>
            <select value={type1} onChange={e => setType1(e.target.value)}>
              <option value="">—</option>
              {DAMAGE_TYPES_RESISTANCE.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="field-label">Тип урона 2</label>
            <select value={type2} onChange={e => setType2(e.target.value)}>
              <option value="">—</option>
              {DAMAGE_TYPES_RESISTANCE.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
            </select>
          </div>
        </div>
      ) : null}
      <div className="field"><label className="field-label">Описание</label><textarea value={desc} onChange={e => setDesc(e.target.value)} /></div>
      <div className="modal-actions">
        <button type="button" className="btn btn-block" onClick={onClose}>Отмена</button>
        <button type="button" className="btn btn-accent btn-block" onClick={() => {
          const n = name.trim() || 'Без названия';
          const lib = picked || matchLibraryFamiliarAbility(n);
          const extra = extras();
          if (lib && lib.effect === 'skilled' && !extra.skill) {
            toast('Выберите навык для умельца');
            return;
          }
          if (lib && lib.effect === 'resistance') {
            const types = extra.damageTypes || [];
            if (types.length < 2 || types[0] === types[1]) {
              toast('Выберите два разных типа урона');
              return;
            }
          }
          patch(c => {
            withFamiliarHpAdjust(c, () => {
              if (initial) {
                initial.name = n;
                initial.desc = desc;
                if (lib) {
                  initial.libraryId = lib.id;
                  initial.effect = lib.effect || null;
                  initial.skill = extra.skill;
                  initial.damageTypes = extra.damageTypes;
                } else {
                  initial.libraryId = null;
                  initial.effect = null;
                  initial.skill = null;
                  initial.damageTypes = null;
                }
              } else if (lib) {
                const inst = instantiateLibraryFamiliarAbility(lib, uid, extra);
                inst.name = n;
                inst.desc = desc;
                c.familiar.abilities.push(inst);
              } else {
                c.familiar.abilities.push({ id: uid(), libraryId: null, name: n, desc, effect: null, skill: null, damageTypes: null });
              }
            });
          });
          onClose();
        }}>{initial ? 'Сохранить' : 'Добавить'}</button>
      </div>
    </>
  );
}
