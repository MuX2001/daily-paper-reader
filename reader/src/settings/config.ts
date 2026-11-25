import {t as uiText} from '../i18n/messages.ts';
export type SettingsTab='account'|'chat'|'deep'|'export'|'maintenance';
export type ExportMode='markdown'|'obsidian'|'both';
export type Naming='stable-id'|'date-title'|'id-title';
export interface SettingsConfig {url:string;key:string;endpoint:string;model:string;apiKey:string;repository:string;branch:string;token:string;vault:string;folder:string;exportMode:ExportMode;naming:Naming;rememberChat:boolean;rememberGithub:boolean}
export function readSetting(key:string,storage:Storage=localStorage){try{return storage.getItem(key);}catch{return null;}}
export function rememberedSecrets(storage:Storage=localStorage){
 let flags;try{flags=JSON.parse(readSetting('dpr.settings.remember_secrets',storage)||'{}');}catch{flags={};}
 const chat=flags?.chat===true,github=flags?.github===true;
 return {rememberChat:chat,rememberGithub:github,apiKey:chat?readSetting('dpr.chat.api_key',storage)||'':'',token:github?readSetting('dpr.github.token',storage)||'':''};
}
export function exportPreferences(storage:Storage=localStorage){
 const mode=readSetting('dpr.settings.export_mode',storage),naming=readSetting('dpr.obsidian.naming',storage);
 return {exportMode:(['markdown','obsidian','both'].includes(mode||'')?mode:readSetting('dpr.obsidian.vault',storage)?.trim()?'both':'markdown') as ExportMode,naming:(['stable-id','date-title','id-title'].includes(naming||'')?naming:'stable-id') as Naming};
}
export function storeValues(values:Record<string,string|null>,storage:Storage=localStorage){
 const previous=Object.fromEntries(Object.keys(values).map(key=>[key,storage.getItem(key)]));
 try{for(const [key,value] of Object.entries(values))value===null?storage.removeItem(key):storage.setItem(key,value);}
 catch{for(const [key,value] of Object.entries(previous)){try{value===null?storage.removeItem(key):storage.setItem(key,value);}catch{/* report failed storage below */}}throw new Error(uiText("浏览器无法保存设置，请检查站点存储权限或空间。配置尚未生效。"));}
}
export function saveSecrets(chat:boolean,github:boolean,apiKey:string,token:string){
 storeValues({'dpr.settings.remember_secrets':JSON.stringify({chat,github}),'dpr.chat.api_key':chat?apiKey:null,'dpr.github.token':github?token:null});
}
export const CHAT_PRESETS=[{name:'DeepSeek',url:'https://api.deepseek.com',model:'deepseek-v4-pro'},{name:'OpenAI',url:'https://api.openai.com/v1',model:''},{name:'OpenRouter',url:'https://openrouter.ai/api/v1',model:''},{name:'自定义',url:'',model:''}];
