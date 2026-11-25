import {t as uiText} from './i18n/messages.ts';
const loopback=new Set(['localhost','127.0.0.1','[::1]']);
export function cloudURL(value:string,pageURL:string):string {
 let target:URL,page:URL;
 try{target=new URL(value);page=new URL(pageURL);}catch{throw new Error(uiText("Supabase 地址格式无效"));}
 if(target.username||target.password||target.search||target.hash||target.pathname!=='/')throw new Error(uiText("Supabase 地址只能包含协议、主机和端口"));
 const local=target.protocol==='http:'&&loopback.has(target.hostname)&&loopback.has(page.hostname);
 if(target.protocol!=='https:'&&!local)throw new Error(uiText("Supabase 地址必须使用 HTTPS；本地页面可连接回环测试服务"));
 return target.origin;
}
