import {useEffect, useState} from 'react';
import {useSearchParams} from 'react-router-dom';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {api} from '../shared/api';
import s from './Views.module.css';

export function Search() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const type = params.get('type') || 'all';
  const [city, setCity] = useState(params.get('city') || '');
  const [minAge, setMinAge] = useState(params.get('minAge') || '');
  const [maxAge, setMaxAge] = useState(params.get('maxAge') || ''); const [from,setFrom]=useState(params.get('from')||''); const [to,setTo]=useState(params.get('to')||'');
  const [cursor, setCursor] = useState(0);
  const [items, setItems] = useState<any[]>([]);
  const qc = useQueryClient();
  const result = useQuery({
    queryKey: ['global-search', q, type, city, minAge, maxAge, from, to, cursor],
    queryFn: () => type === 'people'
      ? api<any>('/users?q=' + encodeURIComponent(q) + '&city=' + encodeURIComponent(city) + '&minAge=' + (minAge || 0) + '&maxAge=' + (maxAge || 0))
      : api<any>('/search/advanced?q=' + encodeURIComponent(q) + '&type=' + type + '&cursor=' + cursor + '&from=' + encodeURIComponent(from) + '&to=' + encodeURIComponent(to)),
    enabled: q.length > 0 || type === 'people',
  });
  useEffect(() => { setCursor(0); setItems([]); }, [q, type, city, minAge, maxAge, from, to]);
  useEffect(() => { if (result.data?.items) setItems(previous => cursor ? Array.from(new Map([...previous, ...result.data.items].map((item: any) => [item.type + '-' + item.id, item])).values()) : result.data.items); }, [result.data, cursor]);
  const history = useQuery({queryKey: ['search-history'], queryFn: () => api<any>('/search/history')});
  const save = useMutation({mutationFn: (query: string) => api('/search/history', {method: 'POST', body: JSON.stringify({query})}), onSuccess: () => qc.invalidateQueries({queryKey: ['search-history']})});
  const clear = useMutation({mutationFn: () => api('/search/history', {method: 'DELETE'}), onSuccess: () => qc.invalidateQueries({queryKey: ['search-history']})});
  function updateFilters(next: {city?: string; minAge?: string; maxAge?: string}) {
    const nextCity = next.city ?? city; const nextMin = next.minAge ?? minAge; const nextMax = next.maxAge ?? maxAge;
    setCity(nextCity); setMinAge(nextMin); setMaxAge(nextMax); setCursor(0);
    setParams({q, type, ...(nextCity ? {city: nextCity} : {}), ...(nextMin ? {minAge: nextMin} : {}), ...(nextMax ? {maxAge: nextMax} : {}), ...(from ? {from} : {}), ...(to ? {to} : {})});
  }
  return <div className={s.feed}>
    <div className={s.welcome}><h1>Поиск</h1>{history.data?.items?.length > 0 && <button className="secondary" onClick={() => clear.mutate()}>Очистить историю</button>}</div>
    <form onSubmit={e => {e.preventDefault(); if (q.trim()) save.mutate(q.trim());}}><input className={s.fullInput} value={q} onChange={e => {setCursor(0); setParams({q: e.target.value, type, ...(city ? {city} : {})});}} placeholder="Люди, посты, группы…" /></form>
    <div className={s.searchTabs}>{['all', 'people', 'posts', 'groups', 'articles', 'events', 'messages'].map(x => <button type="button" key={x} className={type === x ? 'primary' : 'secondary'} onClick={() => {setCursor(0); setParams({q, type: x});}}>{x === 'all' ? 'Все' : x === 'people' ? 'Люди' : x === 'posts' ? 'Посты' : x === 'groups' ? 'Группы' : x === 'articles' ? 'Статьи' : x === 'events' ? 'События' : 'Сообщения'}</button>)}</div>
    {type !== 'people' && <section className={s.card}><h3>Фильтр по дате</h3><div className={s.filterGrid}><input type="date" value={from} onChange={e=>{setFrom(e.target.value);setCursor(0)}}/><input type="date" value={to} onChange={e=>{setTo(e.target.value);setCursor(0)}}/></div></section>}
    {type === 'people' && <section className={s.card}><h3>Фильтры людей</h3><div className={s.filterGrid}><input value={city} onChange={e => updateFilters({city: e.target.value})} placeholder="Город" /><input type="number" min="0" max="120" value={minAge} onChange={e => updateFilters({minAge: e.target.value})} placeholder="Возраст от" /><input type="number" min="0" max="120" value={maxAge} onChange={e => updateFilters({maxAge: e.target.value})} placeholder="Возраст до" /></div></section>}
    {q && result.data?.items?.length > 0 && <div className={s.searchTabs}><span className={s.muted}>Подсказки:</span>{result.data.items.slice(0, 5).map((item: any) => <button type="button" className="secondary" key={'hint-' + item.type + '-' + item.id} onClick={() => item.type === 'people' && (location.href = '/profile/' + item.username)}>{item.displayName || item.name || item.body?.slice(0, 40)}</button>)}</div>}
    {!q && history.data?.items?.length > 0 && <section className={s.card}><h3>Недавние запросы</h3>{history.data.items.map((h: any) => <button type="button" className={s.historyItem} key={h.id} onClick={() => setParams({q: h.query, type: 'all'})}>{h.query}</button>)}</section>}
    <section className={s.card}><h3>Результаты</h3>{items.map((item: any) => <div className={s.person} key={item.type + '-' + item.id}><div className={s.avatar}>{item.displayName?.[0] || item.name?.[0] || 'B'}</div><div><b>{item.displayName || item.name}</b><div className={s.muted}>{item.type === 'people' ? '@' + item.username : item.type === 'post' ? item.body : item.description || item.slug}</div></div></div>)}{(q || type === 'people') && !items.length && <p className={s.muted}>Ничего не найдено.</p>}{result.data?.nextCursor && type !== 'people' && <button className="secondary" onClick={() => setCursor(result.data.nextCursor)}>Загрузить ещё</button>}</section>
  </div>;
}
