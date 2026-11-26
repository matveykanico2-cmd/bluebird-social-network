const base=(import.meta.env.VITE_API_URL||'/api').replace(/\/$/,'');

const QUEUE_KEY='bluebird-offline-mutations';
type QueuedMutation={path:string;method:string;body:string;createdAt:number};
function readQueue():QueuedMutation[]{try{return JSON.parse(localStorage.getItem(QUEUE_KEY)||'[]')}catch{return []}}
async function flushQueue(){const items=readQueue();if(!items.length||!navigator.onLine)return;const rest:QueuedMutation[]=[];for(const item of items){try{const r=await fetch(base+item.path,{method:item.method,credentials:'include',headers:{'Content-Type':'application/json'},body:item.body});if(!r.ok)rest.push(item)}catch{rest.push(item)}}localStorage.setItem(QUEUE_KEY,JSON.stringify(rest))}
if(typeof window!=='undefined')window.addEventListener('online',()=>{void flushQueue()});

export async function api<T>(path:string, init:RequestInit={}){
  const isForm=typeof FormData!=='undefined'&&init.body instanceof FormData;
  const method=(init.method||'GET').toUpperCase();
  let response:Response;
  try {
    response=await fetch(base+path,{...init,credentials:'include',headers:{...(isForm?{}:{'Content-Type':'application/json'}),...(init.headers||{})}});
  } catch {
    if(method!=='GET'&&method!=='HEAD'&&typeof init.body==='string'&&!/auth\/(login|register|password|mfa)/.test(path)){const queued=readQueue();queued.push({path,method,body:init.body,createdAt:Date.now()});localStorage.setItem(QUEUE_KEY,JSON.stringify(queued.slice(-100)));return {queued:true,offline:true} as T}
    throw new Error('Сервер недоступен. Проверьте подключение и запущен ли API.');
  }
  const contentType=response.headers.get('content-type')||'';
  const data=contentType.includes('application/json')?await response.json():{error:(await response.text()).slice(0,200)};
  if(!response.ok||data.error&&data.code==='UNAUTHORIZED')throw new Error(data.error||`Ошибка сети (${response.status})`);
  return data as T;
}
