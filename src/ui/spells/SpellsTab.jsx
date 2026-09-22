import { useState } from 'react';
import { ABILITY_DEFS, sanitizeSpellAssignments } from '../../domain/character-state.js';
import { clamp, fmtMod, isPlay, PROF_LABEL, profTotal, rankLabel, SPELL_LEVELS } from '../../lib/rules.js';
import {
  autoHeightenRank, curriculumSlotsOn, preparedGroupLabel, rankToast, restorePreparedRank,
  spellFitsFocusList, spellFitsPreparedSlot, spellOptionLabel, spellRankText, spendPreparedRank,
  syncCurriculumPrepared, syncPreparedSlots, toggleCurriculumSlot, togglePreparedSlot,
} from '../../lib/spells.js';
import { flash, patch, toast, useCharacter, useSheet } from '../../state/store.js';
import { Topbar } from '../shell.jsx';
import { CastCost, Collapsible, ListItem, NumericField, ProfSelect, SlotDots, TraitMeta } from '../shared.jsx';


export default function SpellsTab() {
  const ch = useCharacter();
  const play = isPlay(ch);
  const sc = ch.spellcasting;
  syncPreparedSlots(ch);
  syncCurriculumPrepared(ch);
  const mod = ch.abilities[sc.ability].mod;
  const dc = 10 + mod + profTotal(sc.proficiency, ch.level);
  const atk = mod + profTotal(sc.proficiency, ch.level);
  const typeLabel = { none: 'Нет заклинаний', spontaneous: 'Спонтанный', prepared: 'Подготавливающий' }[sc.type] || sc.type;
  const abilityLabel = (ABILITY_DEFS.find(d => d.id === sc.ability) || {}).name || sc.ability;
  const spendRanks = SPELL_LEVELS.filter(l => l >= 1 && Number(sc.slotsMax[l]) > 0);
  const showCurrDots = play && curriculumSlotsOn(ch);
  const focus = sc.focus;
  const focusMax = Math.max(0, Number(focus.max) || 0);
  const focusUsed = Math.min(Number(focus.used) || 0, focusMax);
  const focusAddOptions = ch.books.spellbook.filter(sp => spellFitsFocusList(sp) && !focus.spellIds.includes(sp.id));
  const focusCandidates = ch.books.spellbook.filter(spellFitsFocusList);

  function slotToast(kind, lvl, spend) {
    if (kind === 'focus') {
      toast(spend ? 'Очко фокуса' : 'Очко фокуса возвращено', 'focus');
      flash('focus', 'info');
      return;
    }
    if (kind === 'curr') {
      toast(spend ? ('Учебный план · ' + rankToast(lvl)) : ('Учебный план · ' + rankToast(lvl) + ' возвращён'), spend ? 'accent' : 'info');
      flash('curr-' + lvl, spend ? 'bad' : 'good');
      return;
    }
    toast(spend ? ('Ячейка ' + rankToast(lvl)) : ('Ячейка ' + rankToast(lvl) + ' возвращена'), spend ? 'accent' : 'info');
    flash('slot-' + lvl, spend ? 'bad' : 'good');
  }

  return (
    <>
      <Topbar title="Заклинания" subtitle={`СЛ ${dc} · Атака ${fmtMod(atk)}`} />
      <div className="page active">
        <div className="card">
          {play ? (
            <div className="play-id" style={{ marginBottom: 10 }}>
              <div className="play-kv"><span>Тип</span>{typeLabel}</div>
              <div className="row2" style={{ marginTop: 8 }}>
                <div className="play-kv"><span>Характеристика</span>{abilityLabel}</div>
                <div className="play-kv"><span>Владение</span>{PROF_LABEL[sc.proficiency] || ''}</div>
              </div>
            </div>
          ) : (
            <>
              <div className="field">
                <label className="field-label">Тип заклинателя</label>
                <select value={sc.type} onChange={e => patch(c => { c.spellcasting.type = e.target.value; })}>
                  <option value="none">Нет заклинаний</option>
                  <option value="spontaneous">Спонтанный (Чародей)</option>
                  <option value="prepared">Подготавливающий (Волшебник)</option>
                </select>
              </div>
              <div className="row2">
                <div className="field">
                  <label className="field-label">Характеристика</label>
                  <select value={sc.ability} onChange={e => patch(c => { c.spellcasting.ability = e.target.value; })}>
                    {ABILITY_DEFS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label className="field-label">Владение</label>
                  <ProfSelect value={sc.proficiency} onChange={v => patch(c => { c.spellcasting.proficiency = v; })} />
                </div>
              </div>
            </>
          )}
          <div className="row2">
            <div className="def-box" style={{ textAlign: 'center' }}><div className="def-title">Сл. заклинаний</div><div className="def-val">{dc}</div></div>
            <div className="def-box" style={{ textAlign: 'center' }}><div className="def-title">Атака заклинанием</div><div className="def-val">{fmtMod(atk)}</div></div>
          </div>
        </div>

        {!play && sc.type !== 'none' ? (
          <div className="card">
            <h3 style={{ marginBottom: 8 }}>Ячейки заклинаний</h3>
            <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(6,1fr)' }}>
              {SPELL_LEVELS.map(lvl => (
                <div className="stat-box" style={{ padding: '6px 4px' }} key={lvl}>
                  <div className="lbl">{lvl === 0 ? 'Фок.' : 'Ур.' + lvl}</div>
                  <NumericField min={0} value={sc.slotsMax[lvl] || 0} onChange={n => patch(c => { c.spellcasting.slotsMax[lvl] = Math.max(0, n); })} />
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {sc.type !== 'none' && (play || sc.type === 'spontaneous') ? (
          <Collapsible
            title="Ячейки"
            collapsed={!play && !!ch.spellSlotsCollapsed}
            onToggle={() => patch(c => { c.spellSlotsCollapsed = !c.spellSlotsCollapsed; })}
          >
            {spendRanks.length ? spendRanks.map(lvl => (
              <div className="slot-row" key={lvl}>
                <div className="lbl">{rankLabel(lvl)}</div>
                <SlotDots
                  max={Number(sc.slotsMax[lvl] || 0)}
                  used={Number(sc.slotsUsed[lvl] || 0)}
                  extra={showCurrDots ? <CurrDot ch={ch} lvl={lvl} onToast={slotToast} /> : null}
                  onSpend={() => {
                    patch(c => {
                      if (c.spellcasting.type === 'prepared' && lvl >= 1) {
                        if (!spendPreparedRank(c, lvl)) return;
                      } else {
                        const max = Number(c.spellcasting.slotsMax[lvl] || 0);
                        c.spellcasting.slotsUsed[lvl] = clamp((Number(c.spellcasting.slotsUsed[lvl] || 0) + 1), 0, max);
                      }
                    });
                    slotToast('slot', lvl, true);
                  }}
                  onRestore={() => {
                    patch(c => {
                      if (c.spellcasting.type === 'prepared' && lvl >= 1) {
                        if (!restorePreparedRank(c, lvl)) return;
                      } else {
                        const max = Number(c.spellcasting.slotsMax[lvl] || 0);
                        c.spellcasting.slotsUsed[lvl] = clamp((Number(c.spellcasting.slotsUsed[lvl] || 0) - 1), 0, max);
                      }
                    });
                    slotToast('slot', lvl, false);
                  }}
                />
              </div>
            )) : <div className="empty-hint">Нет ячеек 1 круга и выше</div>}
          </Collapsible>
        ) : null}

        {sc.type === 'prepared' && !play ? (
          <Collapsible
            title="Заполнение ячеек"
            collapsed={!!ch.spellSlotsCollapsed}
            onToggle={() => patch(c => { c.spellSlotsCollapsed = !c.spellSlotsCollapsed; })}
          >
            {SPELL_LEVELS.filter(l => Number(sc.slotsMax[l]) > 0).length
              ? SPELL_LEVELS.filter(l => Number(sc.slotsMax[l]) > 0).map(lvl => (
                <div style={{ marginBottom: 14 }} key={lvl}>
                  <div className="field-label" style={{ marginBottom: 6 }}>{preparedGroupLabel(lvl, ch.level)}</div>
                  <div className="slot-grid">
                    {(sc.prepared[lvl] || []).map((slot, idx) => (
                      <div className="slot-box" key={idx}>
                        <div>Ячейка {idx + 1}</div>
                        <select value={slot.spellId || ''} onChange={e => patch(c => {
                          c.spellcasting.prepared[lvl][idx].spellId = e.target.value || null;
                          c.spellcasting.prepared[lvl][idx].expended = false;
                          sanitizeSpellAssignments(c);
                        })}>
                          <option value="">— пусто —</option>
                          {(ch.books.spellbook || []).filter(sp => spellFitsPreparedSlot(sp, lvl)).map(sp => (
                            <option key={sp.id} value={sp.id}>{spellOptionLabel(sp, ch.level)}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                    {curriculumSlotsOn(ch) ? (
                      <div className="slot-box curr">
                        <div>Учебный план</div>
                        <select value={(sc.curriculumPrepared[lvl] || {}).spellId || ''} onChange={e => patch(c => {
                          syncCurriculumPrepared(c);
                          c.spellcasting.curriculumPrepared[lvl].spellId = e.target.value || null;
                          c.spellcasting.curriculumPrepared[lvl].expended = false;
                          sanitizeSpellAssignments(c);
                        })}>
                          <option value="">— пусто —</option>
                          {(ch.books.curriculum || []).filter(sp => spellFitsPreparedSlot(sp, lvl)).map(sp => (
                            <option key={sp.id} value={sp.id}>{spellOptionLabel(sp, ch.level)}</option>
                          ))}
                        </select>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))
              : <div className="empty-hint">Настройте ячейки выше</div>}
          </Collapsible>
        ) : null}

        {sc.type === 'prepared' ? (
          <Collapsible
            title="Подготовленные заклинания"
            collapsed={!!ch.preparedListCollapsed}
            onToggle={() => patch(c => { c.preparedListCollapsed = !c.preparedListCollapsed; })}
          >
            <PreparedCards ch={ch} play={play} onToast={slotToast} />
          </Collapsible>
        ) : null}

        <div className="card">
          <h3 style={{ marginBottom: 8 }}>Фокальные заклинания · {autoHeightenRank(ch.level)} круг</h3>
          {play ? null : (
            <>
              <div className="ability-hint">Круг равен половине уровня персонажа с округлением вверх. Очки фокуса задаются отдельно от числа известных фокальных заклинаний.</div>
              <div className="field">
                <label className="field-label">Максимум очков фокуса</label>
                <NumericField min={0} value={focusMax} style={{ maxWidth: 120 }} onChange={n => patch(c => {
                  c.spellcasting.focus.max = Math.max(0, n);
                  c.spellcasting.focus.used = clamp(Number(c.spellcasting.focus.used) || 0, 0, c.spellcasting.focus.max);
                })} />
              </div>
            </>
          )}
          <div className="slot-row" style={{ marginTop: 8 }}>
            <div className="lbl">Очки фокуса</div>
            <SlotDots
              max={focusMax}
              used={focusUsed}
              variant="focus"
              onSpend={() => {
                patch(c => {
                  const max = Math.max(0, Number(c.spellcasting.focus.max) || 0);
                  if ((c.spellcasting.focus.used || 0) >= max) return;
                  c.spellcasting.focus.used = (c.spellcasting.focus.used || 0) + 1;
                });
                slotToast('focus', 0, true);
              }}
              onRestore={() => {
                patch(c => {
                  if (!(c.spellcasting.focus.used > 0)) return;
                  c.spellcasting.focus.used -= 1;
                });
                slotToast('focus', 0, false);
              }}
            />
          </div>
          {focus.spellIds.length
            ? focus.spellIds.map(id => {
              const sp = ch.books.spellbook.find(s => s.id === id);
              if (!sp) return null;
              return (
                <ListItem
                  key={id}
                  id={'focus-' + id}
                  head={
                    <div style={{ flex: 1, minWidth: 0 }}>
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
                          <button type="button" className="btn btn-sm btn-danger" onClick={() => patch(c => {
                            c.spellcasting.focus.spellIds = c.spellcasting.focus.spellIds.filter(x => x !== id);
                            c.spellcasting.focus.used = clamp(Number(c.spellcasting.focus.used || 0), 0, Math.max(0, Number(c.spellcasting.focus.max) || 0));
                          })}>Убрать из фокальных</button>
                        </div>
                      )}
                    </>
                  }
                />
              );
            })
            : <div className="empty-hint">Нет фокальных заклинаний — добавьте в режиме настройки</div>}
          {play ? null : (
            focusAddOptions.length ? (
              <FocusAdd options={focusAddOptions} level={ch.level} />
            ) : (
              <div className="empty-hint" style={{ padding: '6px 0' }}>
                {focusCandidates.length
                  ? 'Все фокальные заклинания уже добавлены'
                  : (ch.books.spellbook.length ? 'В книге нет заклинаний с дескриптором «фокальное»' : 'Сначала добавьте заклинания в Книгу заклинаний')}
              </div>
            )
          )}
        </div>
      </div>
    </>
  );
}

function CurrDot({ ch, lvl, onToast }) {
  const slot = ch.spellcasting.curriculumPrepared && ch.spellcasting.curriculumPrepared[lvl];
  const available = !!(slot && slot.spellId && !slot.expended);
  return (
    <button
      type="button"
      className={`slot-dot curr-dot ${available ? 'filled' : ''}`}
      title="Учебный план"
      aria-label={available ? 'Потратить учебный план' : 'Вернуть учебный план'}
      onClick={() => {
        if (!slot || !slot.spellId) return;
        if (available) {
          patch(c => { c.spellcasting.curriculumPrepared[lvl].expended = true; });
          onToast('curr', lvl, true);
        } else {
          patch(c => { c.spellcasting.curriculumPrepared[lvl].expended = false; });
          onToast('curr', lvl, false);
        }
      }}
    />
  );
}

function PreparedCards({ ch, play, onToast }) {
  const sc = ch.spellcasting;
  const groups = SPELL_LEVELS.filter(l => Number(sc.slotsMax[l]) > 0).map(lvl => {
    const cards = (sc.prepared[lvl] || []).map((slot, idx) => (
      <PreparedCard key={idx} ch={ch} lvl={lvl} idx={idx} slot={slot} onToast={onToast} />
    ));
    const cuCard = curriculumSlotsOn(ch)
      ? <PreparedCard key="cu" ch={ch} lvl={lvl} idx={0} slot={sc.curriculumPrepared[lvl]} curriculum onToast={onToast} />
      : null;
    if (!cards.filter(Boolean).length && !cuCard) return null;
    return (
      <div style={{ marginBottom: 12 }} key={lvl}>
        <div className="field-label" style={{ marginBottom: 6 }}>{preparedGroupLabel(lvl, ch.level)}</div>
        {cards}
        {cuCard}
      </div>
    );
  }).filter(Boolean);
  if (!groups.length) return <div className="empty-hint">Нет подготовленных заклинаний — заполните ячейки в режиме настройки</div>;
  return <>{groups}</>;
}

function PreparedCard({ ch, lvl, idx, slot, curriculum, onToast }) {
  if (!slot || !slot.spellId) return null;
  const list = curriculum ? (ch.books.curriculum || []) : ch.books.spellbook;
  const sp = list.find(s => s.id === slot.spellId);
  if (!sp) return null;
  const canSpend = Number(lvl) >= 1;
  const spent = canSpend && slot.expended;
  const castRank = Number(lvl) === 0 ? autoHeightenRank(ch.level) : Number(lvl);
  let extra;
  if (curriculum) {
    extra = Number(lvl) === 0
      ? `Учебный план · ${castRank} круг`
      : `Учебный план${Number(sp.level) < castRank ? ' · усилено до ' + castRank : ''}`;
  } else {
    extra = Number(lvl) === 0
      ? `${castRank} круг`
      : `Ячейка ${idx + 1}${Number(sp.level) < castRank ? ' · усилено до ' + castRank : ''}`;
  }
  return (
    <ListItem
      id={(curriculum ? 'curr-' : 'prep-') + lvl + '-' + idx}
      spent={spent}
      className={curriculum ? 'curr-item' : ''}
      head={
        <div
          style={{ flex: 1, minWidth: 0, cursor: canSpend ? 'pointer' : undefined }}
          onClick={e => {
            if (!canSpend) return;
            e.stopPropagation();
            if (curriculum) {
              const nowSpent = toggleCurriculumSlot(ch, lvl);
              patch(c => { /* already mutated via same object */ });
              onToast('curr', lvl, nowSpent);
            } else {
              const nowSpent = togglePreparedSlot(ch, lvl, idx);
              patch(c => { /* already mutated */ });
              onToast('slot', lvl, nowSpent);
            }
          }}
        >
          <div className="name-row"><span className="name">{sp.name}</span><CastCost cast={sp.cast} /></div>
          <div className="tag">{extra}{sp.tradition ? ' · ' + sp.tradition : ''}</div>
          <TraitMeta tags={sp.traits} />
        </div>
      }
      extra={canSpend ? (
        <button type="button" className="spent-badge" onClick={e => {
          e.stopPropagation();
          if (curriculum) {
            const nowSpent = toggleCurriculumSlot(ch, lvl);
            patch(() => {});
            onToast('curr', lvl, nowSpent);
          } else {
            const nowSpent = togglePreparedSlot(ch, lvl, idx);
            patch(() => {});
            onToast('slot', lvl, nowSpent);
          }
        }}>{spent ? 'потрачено' : 'готово'}</button>
      ) : null}
      body={<div>{sp.desc || 'Без описания'}</div>}
    />
  );
}

function FocusAdd({ options, level }) {
  const [id, setId] = useState(options[0]?.id || '');
  return (
    <div className="tag-input-row" style={{ marginTop: 10 }}>
      <select value={id} onChange={e => setId(e.target.value)}>
        {options.map(sp => <option key={sp.id} value={sp.id}>{spellOptionLabel(sp, level)}</option>)}
      </select>
      <button type="button" className="btn btn-sm btn-accent" onClick={() => {
        if (!id) return;
        patch(c => {
          c.spellcasting.focus.spellIds.push(id);
          sanitizeSpellAssignments(c);
        });
      }}>+</button>
    </div>
  );
}

