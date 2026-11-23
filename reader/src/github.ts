import {parseDocument,type Document} from 'yaml';
export interface GitHubConfig {repository:string;ref:string;token:string}
export interface Profile {tag:string;description?:string;enabled?:boolean;keywords?:unknown[];intent_queries?:unknown[];paper_sources?:string[];[key:string]:unknown}
export interface ConfigSnapshot {document:Document;sha:string;profiles:Profile[];raw:Record<string,any>}
export async function github(config:GitHubConfig,path:string,method='GET',body?:unknown){
 if(!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(config.repository)||!config.ref.trim()||!config.token)throw new Error('先在设置中填写仓库、分支和 GitHub Token');
 const response=await fetch(`https://api.github.com/repos/${config.repository}${path}`,{method,headers:{Accept:'application/vnd.github+json',Authorization:`Bearer ${config.token}`,'X-GitHub-Api-Version':'2022-11-28',...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
 if(response.status===409)throw new Error('仓库配置已被其他任务修改，请重新读取后合并你的编辑');
 if(!response.ok)throw new Error(`GitHub 请求失败 (${response.status})，请检查权限和分支`);
 return response.status===204?null:response.json();
}
export async function loadConfig(config:GitHubConfig):Promise<ConfigSnapshot>{
 const file=await github(config,`/contents/config.yaml?ref=${encodeURIComponent(config.ref)}`);
 if(file.encoding!=='base64')throw new Error('不支持的配置文件编码');
 const text=new TextDecoder().decode(Uint8Array.from(atob(file.content.replace(/\s/g,'')),c=>c.charCodeAt(0)));
 const document=parseDocument(text);if(document.errors.length)throw new Error('配置 YAML 无法解析');
 const raw=document.toJS();if(!raw||typeof raw!=='object')throw new Error('配置根节点无效');
 return {document,sha:file.sha,profiles:raw.subscriptions?.intent_profiles||[],raw};
}
export function validateProfiles(profiles:Profile[]){
 const tags=new Set();
 for(const p of profiles){
  if(!p.tag?.trim()||tags.has(p.tag))throw new Error('研究方向 tag 必须非空且唯一');tags.add(p.tag);
  if(p.keywords!==undefined&&!Array.isArray(p.keywords))throw new Error('keywords 必须是数组');
  if(p.intent_queries!==undefined&&!Array.isArray(p.intent_queries))throw new Error('intent_queries 必须是数组');
 }
 return profiles;
}
export async function saveProfiles(config:GitHubConfig,snapshot:ConfigSnapshot,profiles:Profile[]){
 validateProfiles(profiles);const document=snapshot.document.clone();document.setIn(['subscriptions','intent_profiles'],profiles);
 const bytes=new TextEncoder().encode(document.toString());let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);
 const result=await github(config,'/contents/config.yaml','PUT',{message:'Update research subscriptions\n\nCo-Authored-By: xixi <3495302215@qq.com>',sha:snapshot.sha,branch:config.ref,content:btoa(binary)});
 return {...snapshot,document,profiles,sha:result.content.sha,raw:document.toJS()};
}
export async function dispatchWorkflow(config:GitHubConfig,workflow:string,inputs:Record<string,string>){
 if(!['daily-paper-reader.yml','conference-paper-retrieval.yml','topic-research.yml'].includes(workflow))throw new Error('不支持的任务');
 return github(config,`/actions/workflows/${workflow}/dispatches`,'POST',{ref:config.ref,inputs});
}
export async function recentRuns(config:GitHubConfig){
 const data=await github(config,`/actions/runs?branch=${encodeURIComponent(config.ref)}&per_page=20`);return data.workflow_runs as {id:number;display_title:string;status:string;conclusion:string|null;html_url:string}[];
}
