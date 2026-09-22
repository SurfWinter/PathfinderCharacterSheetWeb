import { useState } from 'react';
import { uid } from '../../domain/character-state.js';
import { ACTION_TYPES, isPlay } from '../../lib/rules.js';
import { patch, useCharacter, useSheet } from '../../state/store.js';
import { Topbar } from '../shell.jsx';
import { Collapsible, ListItem, TagEditor, TraitMeta } from '../shared.jsx';

export default function ActionsTab() {
  const ch = useCharacter();
  const play = isPlay(ch);
  const openModal = useSheet(s => s.openModal);
  const favorites = ch.actions.filter(a => a.favorite);

  function ActionCard({ a }) {
    return (
      <ListItem
        id={'act-' + a.id}
        head={
          <div>
            <div className="name">{a.name}</div>
            <div className="tag">{a.type}{a.fromFeat ? ' · из черты' : ''}</div>
            <TraitMeta tags={a.traits} />
          </div>
        }
        extra={
          <button type="button" className={`fav-star ${a.favorite ? 'active' : ''}`} onClick={e => {
            e.stopPropagation();
            patch(c => { const x = c.actions.find(t => t.id === a.id); if (x) x.favorite = !x.favorite; });
          }}>{a.favorite ? '★' : '☆'}</button>
        }
        body={
          <>
            <div style={{ whiteSpace: 'pre-wrap' }}>{a.desc}</div>
            {play ? null : (
              <div className="list-item-actions">
                <button type="button" className="btn btn-sm" onClick={() => openModal({
                  title: 'Изменить действие',
                  body: (close) => <ActionForm initial={a} onClose={close} onSave={data => {
                    patch(c => {
                      const x = c.actions.find(t => t.id === a.id);
                      if (!x) return;
                      Object.assign(x, data);
                    });
                    close();
                  }} />,
                })}>Изменить</button>
                <button type="button" className="btn btn-sm btn-danger" onClick={() => patch(c => { c.actions = c.actions.filter(x => x.id !== a.id); })}>Удалить</button>
              </div>
            )}
          </>
        }
      />
    );
  }

  return (
    <>
      <Topbar title="Действия" subtitle={`${ch.actions.length} записей`} />
      <div className="page active">
        {play ? null : (
          <button type="button" className="btn btn-accent btn-block" style={{ marginBottom: 12 }} onClick={() => openModal({
            title: 'Новое действие',
            body: (close) => <ActionForm onClose={close} onSave={data => {
              patch(c => c.actions.push({ id: uid(), ...data, fromFeat: false, favorite: false }));
              close();
            }} />,
          })}>+ Добавить действие</button>
        )}
        <div className="card">
          <h3 style={{ marginBottom: 8 }}>★ Избранное</h3>
          {favorites.length ? favorites.map(a => <ActionCard key={a.id} a={a} />) : <div className="empty-hint">Нажмите ☆ у любого действия, чтобы закрепить его здесь</div>}
        </div>
        <Collapsible
          title="Все действия"
          collapsed={!!ch.actionsAllCollapsed}
          onToggle={() => patch(c => { c.actionsAllCollapsed = !c.actionsAllCollapsed; })}
        >
          {ch.actions.length ? ch.actions.map(a => <ActionCard key={a.id} a={a} />) : <div className="empty-hint">Пока нет действий</div>}
        </Collapsible>
      </div>
    </>
  );
}

function ActionForm({ initial, onClose, onSave }) {
  const [name, setName] = useState(initial?.name || '');
  const [type, setType] = useState(initial?.type || 'Одно действие');
  const [traits, setTraits] = useState(initial?.traits || []);
  const [desc, setDesc] = useState(initial?.desc || '');
  return (
    <>
      <div className="field"><label className="field-label">Название</label><input type="text" value={name} onChange={e => setName(e.target.value)} /></div>
      <div className="field">
        <label className="field-label">Стоимость действия</label>
        <select value={type} onChange={e => setType(e.target.value)}>
          {ACTION_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
      </div>
      <div className="field"><label className="field-label">Дескрипторы</label><TagEditor tags={traits} onChange={setTraits} /></div>
      <div className="field"><label className="field-label">Описание</label><textarea value={desc} onChange={e => setDesc(e.target.value)} /></div>
      <div className="modal-actions">
        <button type="button" className="btn btn-block" onClick={onClose}>Отмена</button>
        <button type="button" className="btn btn-accent btn-block" onClick={() => onSave({ name: name || 'Без названия', type, traits, desc })}>
          {initial ? 'Сохранить' : 'Добавить'}
        </button>
      </div>
    </>
  );
}
