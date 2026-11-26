import {requireWritableBranch} from './repository.ts';
import {t as uiText} from './i18n/messages.ts';
import {parseDocument,type Document} from 'yaml';
export interface GitHubConfig {repository:string;ref:string;token:string}
export interface Profile {tag:string;description?:string;enabled?:boolean;keywords?:unknown[];intent_queries?:unknown[];paper_sources?:string[];[key:string]:unknown}
export interface ConfigSnapshot {document:Document;sha:string;profiles:Profile[];raw:Record<string,any>}
export async function github(config:GitHubConfig,path:string,method='GET',body?:unknown){
 if(!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(config.repository)||!config.ref.trim()||!config.token)throw new Error(uiText("先在设置中填写仓库、分支和 GitHub Token"));
 if(method !== 'GET') requireWritableBranch(config.repository, config.ref);
 const response=await fetch(`https://api.github.com/repos/${config.repository}${path}`,{method,headers:{Accept:'application/vnd.github+json',Authorization:`Bearer ${config.token}`,'X-GitHub-Api-Version':'2022-11-28',...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
 if(response.status===409)throw new Error(uiText("仓库配置已被其他任务修改，请重新读取后合并你的编辑"));
 if(!response.ok)throw new Error(uiText("GitHub 请求失败 ({0})，请检查权限和分支", response.status));
 return response.status===204?null:response.json();
}
export async function loadConfig(config:GitHubConfig):Promise<ConfigSnapshot>{
 const file=await github(config,`/contents/config.yaml?ref=${encodeURIComponent(config.ref)}`);
 if(file.encoding!=='base64')throw new Error(uiText("不支持的配置文件编码"));
 const text=new TextDecoder().decode(Uint8Array.from(atob(file.content.replace(/\s/g,'')),c=>c.charCodeAt(0)));
 const document=parseDocument(text);if(document.errors.length)throw new Error(uiText("配置 YAML 无法解析"));
 const raw=document.toJS();if(!raw||typeof raw!=='object')throw new Error(uiText("配置根节点无效"));
 return {document,sha:file.sha,profiles:raw.subscriptions?.intent_profiles||[],raw};
}
export function validateProfiles(profiles:Profile[]){
 if(!Array.isArray(profiles))throw new Error(uiText("研究方向必须是数组"));
 const tags=new Set();
 for(const p of profiles){
  if(!p||typeof p!=='object'||typeof p.tag!=='string'||!p.tag.trim()||p.tag!==p.tag.trim()||tags.has(p.tag))throw new Error(uiText("研究方向 tag 必须非空、无首尾空白且唯一"));tags.add(p.tag);
  if(p.description!==undefined&&typeof p.description!=='string')throw new Error(uiText("方向说明必须是文本"));
  if(p.enabled!==undefined&&typeof p.enabled!=='boolean')throw new Error(uiText("enabled 必须是布尔值"));
  if(p.paper_sources!==undefined&&(!Array.isArray(p.paper_sources)||p.paper_sources.some(s=>typeof s!=='string'||!s.trim())))throw new Error(uiText("论文来源必须为非空字符串数组"));
  if(p.keywords!==undefined&&!Array.isArray(p.keywords))throw new Error(uiText("keywords 必须是数组"));
  if(p.intent_queries!==undefined&&!Array.isArray(p.intent_queries))throw new Error(uiText("intent_queries 必须是数组"));
  for(const kind of ['keywords','intent_queries'] as const)for(const item of p[kind]||[]){
   const keys=kind==='keywords'?['keyword','text','expr']:['query','text','keyword','expr'];
   const value=typeof item==='string'?item:item&&typeof item==='object'?keys.map(k=>(item as Record<string,unknown>)[k]).find(v=>v):null;
   if(typeof value!=='string'||!value.trim())throw new Error(kind==='keywords'?uiText("英文关键词不能为空"):uiText("独立语义查询不能为空"));
   if(item&&typeof item==='object'&&'query' in item&&typeof item.query!=='string')throw new Error(uiText("语义改写必须是文本"));
  }
 }
 return profiles;
}
export async function saveProfiles(config:GitHubConfig,snapshot:ConfigSnapshot,profiles:Profile[]){
 validateProfiles(profiles);const document=snapshot.document.clone();document.setIn(['subscriptions','intent_profiles'],profiles);
 const sha=await commitConfig(config,snapshot.sha,document,'Update research subscriptions');
 return {...snapshot,document,profiles,sha,raw:document.toJS()};
}
export async function commitConfig(config:GitHubConfig,sha:string,document:Document,message:string){
 const bytes=new TextEncoder().encode(document.toString());let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);
 const result=await github(config,'/contents/config.yaml','PUT',{message:message+'\n\nCo-Authored-By: xixi <3495302215@qq.com>',sha,branch:config.ref,content:btoa(binary)});
 return result.content.sha as string;
}
export async function dispatchWorkflow(config:GitHubConfig,workflow:string,inputs:Record<string,string>){
 if(!['daily-paper-reader.yml','conference-paper-retrieval.yml','topic-research.yml'].includes(workflow))throw new Error(uiText("不支持的任务"));
 return github(config,`/actions/workflows/${workflow}/dispatches`,'POST',{ref:config.ref,inputs});
}
export async function recentRuns(config:GitHubConfig){
 const data=await github(config,`/actions/runs?branch=${encodeURIComponent(config.ref)}&per_page=20`);return data.workflow_runs as {id:number;display_title:string;status:string;conclusion:string|null;html_url:string}[];
}
