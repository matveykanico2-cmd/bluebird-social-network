import {useState} from 'react';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {api} from '../shared/api';
import s from './Views.module.css';

export function Friends() {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [city, setCity] = useState('');
  const [minAge, setMinAge] = useState('');
  const [maxAge, setMaxAge] = useState('');
  const [listName, setListName] = useState('');
  const [closeFriends, setCloseFriends] = useState(false);
  const [memberId, setMemberId] = useState('');
  const [contacts, setContacts] = useState('');
  const [consent, setConsent] = useState(false);
  const users = useQuery({queryKey: ['users', q, city, minAge, maxAge], queryFn: () => api<any>('/users?q=' + encodeURIComponent(q) + '&city=' + encodeURIComponent(city) + '&minAge=' + encodeURIComponent(minAge) + '&maxAge=' + encodeURIComponent(maxAge))});
  const friends = useQuery({queryKey: ['friends'], queryFn: () => api<any>('/friends')});
  const online = useQuery({queryKey: ['friends-online'], queryFn: () => api<any>('/friends/online'), refetchInterval: 60000});
  const recommendations = useQuery({queryKey: ['friends-recommendations'], queryFn: () => api<any>('/feed/recommendations')});
  const lists = useQuery({queryKey: ['friend-lists'], queryFn: () => api<any>('/friends/lists')});
  const birthdays = useQuery({queryKey: ['friend-birthdays'], queryFn: () => api<any>('/friends/birthdays')});
  const refresh = () => {qc.invalidateQueries({queryKey: ['friends']}); qc.invalidateQueries({queryKey: ['friends-online']}); qc.invalidateQueries({queryKey: ['friend-lists']});};
  const request = useMutation({mutationFn: (id: number) => api('/friends/' + id + '/request', {method: 'POST'}), onSuccess: refresh});
  const action = useMutation({mutationFn: ({id, kind}: {id: number; kind: 'accept'|'reject'|'cancel'|'remove'}) => api('/friends/' + id + (kind === 'accept' ? '/accept' : kind === 'reject' ? '/reject' : kind === 'cancel' ? '/request' : ''), {method: kind === 'accept' || kind === 'reject' ? 'POST' : 'DELETE'}), onSuccess: refresh});
  const createList = useMutation({mutationFn: () => api('/friends/lists', {method: 'POST', body: JSON.stringify({name: listName, closeFriends})}), onSuccess: () => {setListName(''); refresh();}});
  const addMember = useMutation({mutationFn: (listId: number) => api('/friends/lists/' + listId + '/members', {method: 'POST', body: JSON.stringify({userId: Number(memberId)})}), onSuccess: () => {setMemberId(''); refresh();}});
  const importContacts = useMutation({mutationFn: () => api('/friends/import', {method: 'POST', body: JSON.stringify({consent, contacts: contacts.split(/[,\n]/).map(x => x.trim()).filter(Boolean)})})});
  return <div className={s.feed}>
    <div className={s.welcome}><div><h1>Друзья</h1><p className={s.muted}>Люди, с которыми вы на связи</p></div></div>
    <section className={s.card}><h3>Кого можно добавить</h3>{recommendations.data?.authors?.length ? <div className={s.people}>{recommendations.data.authors.slice(0, 4).map((u: any) => <div className={s.person} key={u.id}><div className={s.avatar}>{u.displayName[0]}</div><div><b>{u.displayName}</b><div className={s.muted}>@{u.username}</div></div><button className="secondary" onClick={() => request.mutate(u.id)}>Добавить</button></div>)}</div> : <p className={s.muted}>Рекомендаций пока нет.</p>}</section>
    <section className={s.card}><h3>Сейчас в сети</h3>{online.data?.items?.length ? <div className={s.people}>{online.data.items.map((u: any) => <a className={s.person} key={u.id} href={'/profile/' + u.username}><div className={s.avatar}>{u.displayName[0]}</div><div><b>{u.displayName}</b><div className={s.muted}>@{u.username} · онлайн</div></div></a>)}</div> : <p className={s.muted}>Сейчас онлайн нет друзей.</p>}</section>
    <section className={s.card}><h3>Поиск людей</h3><input className={s.fullInput} value={q} onChange={e => setQ(e.target.value)} placeholder="Имя или короткий адрес" /><div className={s.filterGrid}><input value={city} onChange={e => setCity(e.target.value)} placeholder="Город" /><input type="number" min="13" max="120" value={minAge} onChange={e => setMinAge(e.target.value)} placeholder="Возраст от" /><input type="number" min="13" max="120" value={maxAge} onChange={e => setMaxAge(e.target.value)} placeholder="Возраст до" /></div><div className={s.people}>{users.data?.items?.map((u: any) => <div className={s.person} key={u.id}><div className={s.avatar}>{u.displayName[0]}</div><div><b>{u.displayName}</b><div className={s.muted}>@{u.username}{u.bio && ' · ' + u.bio}</div></div><button className="secondary" onClick={() => request.mutate(u.id)}>Добавить</button></div>)}</div></section>
    <section className={s.card}><h3>Ближайшие дни рождения</h3>{birthdays.data?.items?.length ? birthdays.data.items.map((u: any) => <div className={s.person} key={u.id}><div className={s.avatar}>🎂</div><div><b>{u.displayName}</b><div className={s.muted}>@{u.username} · {u.birthDate}</div></div></div>) : <p className={s.muted}>Ближайших дней рождения нет.</p>}</section>
    <section className={s.card}><h3>Списки друзей</h3><form className={s.linkForm} onSubmit={e => {e.preventDefault(); if (listName.trim()) createList.mutate();}}><input value={listName} onChange={e => setListName(e.target.value)} placeholder="Название списка" /><label><input type="checkbox" checked={closeFriends} onChange={e => setCloseFriends(e.target.checked)} /> Близкие друзья</label><button className="secondary">Создать</button></form>{lists.data?.items?.map((list: any) => <div className={s.settingRow} key={list.id}><span>{list.name}{list.closeFriends ? ' · близкие друзья' : ''} · {list.memberCount} участников</span><form onSubmit={e => {e.preventDefault(); addMember.mutate(list.id);}}><input className={s.tinyInput} value={memberId} onChange={e => setMemberId(e.target.value)} placeholder="ID друга" /><button className="secondary">Добавить</button></form></div>)}</section>
    <section className={s.card}><h3>Импорт контактов</h3><p className={s.muted}>Контакты используются только после вашего согласия.</p><textarea className={s.fullInput} value={contacts} onChange={e => setContacts(e.target.value)} placeholder="email или username, по одному в строке" /><label><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} /> Я согласен на поиск совпадений</label><button className="secondary" disabled={!consent || !contacts.trim() || importContacts.isPending} onClick={() => importContacts.mutate()}>Импортировать</button>{(importContacts.data as any)?.items?.length > 0 && <p className={s.success}>Найдено совпадений: {(importContacts.data as any).items.length}</p>}</section>
    <section className={s.card}><h3>Мои связи</h3>{friends.data?.items?.length ? friends.data.items.map((f: any) => <div className={s.person} key={f.id}><div className={s.avatar}>{f.displayName[0]}</div><div><b>{f.displayName}</b><div className={s.muted}>{f.status === 'accepted' ? 'В друзьях' : f.incoming ? 'Входящая заявка' : 'Заявка ожидает ответа'}</div></div>{f.status === 'accepted' ? <button className="secondary" onClick={() => action.mutate({id: f.id, kind: 'remove'})}>Удалить</button> : f.incoming ? <><button className="primary" onClick={() => action.mutate({id: f.id, kind: 'accept'})}>Принять</button><button className="secondary" onClick={() => action.mutate({id: f.id, kind: 'reject'})}>Отклонить</button></> : <button className="secondary" onClick={() => action.mutate({id: f.id, kind: 'cancel'})}>Отменить</button>}</div>) : <p className={s.muted}>Связей пока нет.</p>}</section>
  </div>;
}
