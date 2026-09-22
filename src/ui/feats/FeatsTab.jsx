import { useState } from 'react';
import { uid } from '../../domain/character-state.js';
import { isPlay } from '../../lib/rules.js';
import { patch, useCharacter, useSheet } from '../../state/store.js';
import { Topbar } from '../shell.jsx';
import { ListItem, TagEditor, TraitMeta } from '../shared.jsx';

export default function FeatsTab() {
  const ch = useCharacter();
  const play = isPlay(ch);
  const openModal = useSheet(s => s.openModal);
  const feats = ch.feats.slice().sort((a, b) => a.level - b.level);

  return (
    <>
      <Topbar title="Черты" subtitle={`${ch.feats.length} черт`} />
      <div className="page active">
        {play ? null : (
          <button type="button" className="btn btn-accent btn-block" style={{ marginBottom: 12 }} onClick={() => openModal({
            title: 'Новая черта',
            body: (close) => <FeatForm onClose={close} onSave={(data, addAction) => {
              patch(c => {
                c.feats.push({ id: uid(), ...data });
                if (addAction) c.actions.push({ id: uid(), name: data.name, type: 'Одно действие', traits: [], desc: data.desc, fromFeat: true, favorite: false });
              });
              close();
            }} />,
          })}>+ Добавить черту</button>
        )}
        {feats.length ? feats.map(f => (
          <ListItem
            key={f.id}
            id={'feat-' + f.id}
            head={
              <div>
                <div className="name">{f.name}</div>
                <div className="tag">Ур. {f.level}{f.category ? ' · ' + f.category : ''}</div>
                <TraitMeta tags={f.traits} />
              </div>
            }
            body={
              <>
                <div style={{ whiteSpace: 'pre-wrap' }}>{f.desc || 'Без описания'}</div>
                {play ? null : (
                  <div className="list-item-actions">
                    <button type="button" className="btn btn-sm" onClick={() => openModal({
                      title: 'Изменить черту',
                      body: (close) => <FeatForm initial={f} onClose={close} onSave={(data, addAction) => {
                        patch(c => {
                          const x = c.feats.find(t => t.id === f.id);
                          if (x) Object.assign(x, data);
                          if (addAction) c.actions.push({ id: uid(), name: data.name, type: 'Одно действие', traits: [], desc: data.desc, fromFeat: true, favorite: false });
                        });
                        close();
                      }} />,
                    })}>Изменить</button>
                    <button type="button" className="btn btn-sm btn-danger" onClick={() => patch(c => { c.feats = c.feats.filter(x => x.id !== f.id); })}>Удалить</button>
                  </div>
                )}
              </>
            }
          />
        )) : <div className="empty-hint">Черт пока нет — добавьте в режиме настройки</div>}
      </div>
    </>
  );
}

function FeatForm({ initial, onClose, onSave }) {
  const [name, setName] = useState(initial?.name || '');
  const [level, setLevel] = useState(String(initial?.level ?? 1));
  const [category, setCategory] = useState(initial?.category || '');
  const [desc, setDesc] = useState(initial?.desc || '');
  const [traits, setTraits] = useState(initial?.traits || []);
  const [addAction, setAddAction] = useState(false);
  return (
    <>
      <div className="field"><label className="field-label">Название</label><input type="text" value={name} onChange={e => setName(e.target.value)} /></div>
      <div className="row2">
        <div className="field"><label className="field-label">Уровень</label><input type="text" inputMode="numeric" value={level} onChange={e => setLevel(e.target.value)} /></div>
        <div className="field"><label className="field-label">Категория</label><input type="text" placeholder="классовая / общая / анцестри..." value={category} onChange={e => setCategory(e.target.value)} /></div>
      </div>
      <div className="field"><label className="field-label">Описание</label><textarea value={desc} onChange={e => setDesc(e.target.value)} /></div>
      <div className="field"><label className="field-label">Дескрипторы</label><TagEditor tags={traits} onChange={setTraits} /></div>
      <div className="field">
        <label className="crit-toggle" style={{ fontSize: 13 }}>
          <input type="checkbox" checked={addAction} onChange={e => setAddAction(e.target.checked)} />
          Эта черта даёт новое действие — добавить во вкладку «Действия»
        </label>
      </div>
      <div className="modal-actions">
        <button type="button" className="btn btn-block" onClick={onClose}>Отмена</button>
        <button type="button" className="btn btn-accent btn-block" onClick={() => onSave({
          name: name || 'Без названия',
          level: Number(level) || 0,
          category,
          desc,
          traits,
        }, addAction)}>{initial ? 'Сохранить' : 'Добавить'}</button>
      </div>
    </>
  );
}
