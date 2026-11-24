import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {cloudURL} from './cloudURL.ts';
import { mergeLibrary, type Catalog, type Feed, type PaperState, type StatePatch } from './domain.ts';
export async function readJSON<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, {signal});
  if (!response.ok) throw new Error(`读取数据失败 (${response.status})`);
  return response.json();
}
export async function catalog(signal?: AbortSignal) {
  const data = await readJSON<Catalog>('./docs/data/catalog.json', signal);
  if (data.schema_version !== 1 || !Array.isArray(data.runs)) throw new Error('不支持的数据目录版本');
  return data;
}
export async function feed(path: string, signal?: AbortSignal) {
  if (!/^(?:daily\/\d{8}(?:-\d{8})?|topics\/\d{8}-[a-f0-9]{12}|conferences\/conference-[a-f0-9]{16})\.json$/.test(path)) throw new Error('数据路径无效');
  const data = await readJSON<Feed>(`./docs/data/${path}`, signal);
  if (data.schema_version !== 1 || !Array.isArray(data.papers)) throw new Error('不支持的论文数据版本');
  return data;
}
let client: SupabaseClient | null = null;
let connection:{url:string;key:string}|null=null;
export function getClient(): SupabaseClient | null { return client; }
export function getCloudOrigin(){return connection?.url||'';}
export function matchesCloudConfiguration(url:string,key:string){
 return connection!==null&&url.trim().replace(/\/$/,'')===connection.url&&key.trim()===connection.key;
}
export function configureCloud(url: string, key: string) {
  url=url.trim();key=key.trim();
  if (!url && !key) { client = null; connection=null; return; }
  url=cloudURL(url,typeof location==='undefined'?'https://reader.invalid':location.href);
  if (key.startsWith('sb_secret_')) throw new Error('浏览器禁止使用 secret key');
  if (key.startsWith('ey')) {
    try { const payload = JSON.parse(atob(key.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))); if (payload.role !== 'anon') throw new Error('仅支持 anon 公钥'); }
    catch { throw new Error('请使用 publishable key 或 anon 公钥，不能使用 service role'); }
  } else if (!key.startsWith('sb_publishable_')) throw new Error('公钥格式无效');
  client = createClient(url, key);
  connection={url,key};
}
export async function githubLogin(){
 const captured=client,saved=connection;
 if(!captured||!saved)throw new Error('请先保存 Supabase 连接配置');
 const response=await fetch(`${saved.url}/auth/v1/settings`,{headers:{apikey:saved.key},signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw new Error(`无法检查登录配置 (${response.status})`);
 const settings=await response.json();
 if(client!==captured)throw new Error('连接已变更，请重新登录');
 if(settings.external?.github!==true)throw new Error('此 Supabase 项目尚未启用 GitHub 登录。请在 Supabase Auth 中配置 GitHub OAuth，或使用下方邮箱登录。');
 const {error}=await captured.auth.signInWithOAuth({provider:'github',options:{redirectTo:new URL('./',location.href).href}});
 if(error)throw error;
}
export async function loadStates(userId: string) {
  const capturedClient=client;
  if (!capturedClient) throw new Error('尚未配置云端状态');
  const states: Record<string, PaperState> = {};
  for (let offset = 0; ; offset += 500) {
    if(client!==capturedClient)throw new Error('云端配置已变更，请重新读取状态');
    const {data,error} = await capturedClient.from('paper_states').select('*').eq('user_id',userId).order('paper_key').range(offset,offset+499);
    if(error) throw error;
    for(const row of data) states[row.paper_key] = row;
    if(data.length < 500) break;
  }
  return states;
}
export async function saveState(userId: string, key: string, revision: number, patch: StatePatch): Promise<PaperState> {
  if(!client) throw new Error('请先配置并登录云端账户');
  // The database's RLS and revision trigger are the authority, never the username.
  const query = revision === 0
    ? client.from('paper_states').insert({user_id:userId,paper_key:key,...patch})
    : client.from('paper_states').update(patch).eq('user_id',userId).eq('paper_key',key).eq('revision',revision);
  const {data,error} = await query.select().single();
  if(error) throw new Error(`保存失败，请刷新云端状态后重试：${error.message}`);
  return data;
}

export async function library(runs: Catalog['runs'], signal?: AbortSignal) {
  const results: Feed[]=[];
  // Bounded parallel fetches; a missing feed is an error, never a partial success.
  for(let offset=0;offset<runs.length;offset+=4){
    results.push(...await Promise.all(runs.slice(offset,offset+4).map(run=>feed(run.path,signal))));
  }
  return mergeLibrary(results);
}
