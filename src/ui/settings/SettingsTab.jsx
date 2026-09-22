import { useState } from 'react';
import { listCharacterProfiles, normalizeCharacter } from '../../domain/character-state.js';
import { characterToXml, parseCharacterXml } from '../../domain/character-xml.js';
import { isPlay } from '../../lib/rules.js';
import { toast, useCharacter, useSheet } from '../../state/store.js';
import { Topbar } from '../shell.jsx';

export default function SettingsTab() {
  const ch = useCharacter();
  const patch = useSheet(s => s.patch);
  const createProfile = useSheet(s => s.createProfile);
  const switchProfile = useSheet(s => s.switchProfile);
  const deleteActiveProfile = useSheet(s => s.deleteActiveProfile);
  const resetActive = useSheet(s => s.resetActive);
  const replaceCharacter = useSheet(s => s.replaceCharacter);
  const openModal = useSheet(s => s.openModal);
  const setBooksSection = useSheet(s => s.setBooksSection);
  const profiles = listCharacterProfiles();
  const savedDate = ch.meta.savedAt ? new Date(ch.meta.savedAt).toLocaleString('ru-RU') : '—';

  function exportXml() {
    const xml = characterToXml(ch);
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeName = (ch.name || 'character').replace(/[^a-zA-Zа-яА-Я0-9_\- ]/g, '').trim() || 'character';
    a.href = url;
    a.download = `${safeName}.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast('Файл экспортирован');
  }

  function importXml() {
    const input = document.getElementById('importFileInput');
    input.onchange = e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = parseCharacterXml(reader.result);
          if (confirm('Импортировать этого персонажа? Текущие данные будут заменены.')) {
            replaceCharacter(normalizeCharacter(parsed));
            toast('Персонаж импортирован');
            useSheet.getState().setTab('character');
          }
        } catch (err) {
          alert('Не удалось прочитать файл: ' + err.message);
        }
        e.target.value = '';
      };
      reader.readAsText(file, 'UTF-8');
    };
    input.click();
  }

  return (
    <>
      <Topbar title="Настройки" settings />
      <div className="page active">
        <div className="card">
          <div className="more-item" style={{ paddingTop: 0 }}>
            <div><div className="t">Вкладка фамильяра</div><div className="d">Показать упрощённый лист связанного существа</div></div>
            <label className="switch">
              <input type="checkbox" checked={!!ch.familiarEnabled} onChange={e => {
                const on = e.target.checked;
                patch(c => {
                  c.familiarEnabled = on;
                  if (on && !c.familiar.ready) {
                    c.familiar.hp.current = 5 * (Number(c.level) || 1);
                    c.familiar.ready = true;
                    const compact = isPlay(c);
                    c.familiar.hpCollapsed = compact;
                    c.familiar.defensesCollapsed = compact;
                  }
                });
              }} />
              <span className="switch-ui" />
            </label>
          </div>
          <div className="more-item">
            <div><div className="t">Учебный план</div><div className="d">Отдельный список и дополнительная ячейка там, где уже есть обычные</div></div>
            <label className="switch">
              <input type="checkbox" checked={!!ch.curriculumEnabled} onChange={e => {
                patch(c => { c.curriculumEnabled = e.target.checked; });
                if (!e.target.checked && useSheet.getState().booksSection === 'curriculum') setBooksSection('spellbook');
              }} />
              <span className="switch-ui" />
            </label>
          </div>
        </div>
        <div className="card">
          <div className="more-item" style={{ border: 'none', paddingTop: 0 }}>
            <div><div className="t">Персонаж в этой вкладке</div><div className="d">Каждая вкладка может работать со своим персонажем.</div></div>
          </div>
          <div className="field" style={{ margin: '0 0 10px' }}>
            <select value={profiles.find(p => p.active)?.id || ''} onChange={e => { switchProfile(e.target.value); toast('Персонаж переключён'); }}>
              {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <button type="button" className="btn btn-accent btn-block" onClick={() => openModal({
            title: 'Новый персонаж',
            body: (close) => <NewCharForm onClose={close} onCreate={createProfile} />,
          })}>+ Новый персонаж</button>
          <button
            type="button"
            className="btn btn-danger btn-block"
            style={{ marginTop: 8 }}
            disabled={profiles.length <= 1}
            onClick={() => {
              if (profiles.length <= 1) return;
              const active = profiles.find(p => p.active) || profiles[0];
              if (!confirm('Удалить персонажа «' + (active.name || 'Без имени') + '»? Это нельзя отменить.')) return;
              const result = deleteActiveProfile();
              if (!result.ok) {
                toast(result.reason === 'last' ? 'Нельзя удалить единственного персонажа' : 'Не удалось удалить', 'bad');
                return;
              }
              toast('Персонаж удалён');
            }}
          >Удалить персонажа</button>
          {profiles.length <= 1 ? <div className="hint-line">Нельзя удалить единственного персонажа — есть сброс.</div> : null}
        </div>
        <div className="card">
          <div className="more-item">
            <div><div className="t">Экспорт персонажа</div><div className="d">Сохранить конфигурацию в файл .xml</div></div>
            <button type="button" className="btn btn-accent" onClick={exportXml}>Экспорт</button>
          </div>
          <div className="more-item">
            <div><div className="t">Импорт персонажа</div><div className="d">Загрузить конфигурацию из файла .xml</div></div>
            <button type="button" className="btn" onClick={importXml}>Импорт</button>
          </div>
          <div className="more-item">
            <div><div className="t">Сбросить персонажа</div><div className="d">Удалит все данные и начнёт заново</div></div>
            <button type="button" className="btn btn-danger" onClick={() => {
              if (confirm('Удалить все данные персонажа? Это действие необратимо.')) {
                resetActive();
                toast('Персонаж сброшен');
              }
            }}>Сброс</button>
          </div>
        </div>
        <div className="card">
          <div className="more-item" style={{ border: 'none', paddingTop: 0 }}>
            <div><div className="t">Автосохранение</div><div className="d">Данные хранятся локально в кэше браузера. Последнее сохранение: {savedDate}</div></div>
          </div>
          <div className="empty-hint" style={{ textAlign: 'left', padding: '4px 4px 0' }}>Версия 1.4.0</div>
        </div>
      </div>
    </>
  );
}

function NewCharForm({ onClose, onCreate }) {
  const [name, setName] = useState('');
  return (
    <>
      <div className="field"><label className="field-label">Имя персонажа</label><input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Можно указать позже" /></div>
      <div className="modal-actions">
        <button type="button" className="btn btn-block" onClick={onClose}>Отмена</button>
        <button type="button" className="btn btn-accent btn-block" onClick={() => { onCreate(name); toast('Создан новый персонаж'); }}>Создать</button>
      </div>
    </>
  );
}
