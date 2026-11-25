import {t as uiText} from './i18n/messages.ts';
/** Supabase/PostgREST often rejects with plain objects, not Error instances. */
export function errorMessage(error:unknown):string{
 if(typeof error==='string')return error||uiText("请求失败，服务未返回错误说明。");
 if(!error||typeof error!=='object')return uiText("请求失败，服务未返回错误说明。");
 const value=error as Record<string,unknown>;
 const text=(name:string)=>typeof value[name]==='string'?(value[name] as string).trim():'';
 const message=text('message')||text('msg')||text('error_description')||text('error');
 const code=text('code')||text('error_code');
 let hint='';
 if((code==='PGRST205'||code==='42P01')&&message.includes('paper_states'))hint=uiText(" 当前项目尚未初始化阅读状态表，请在这个 Supabase 项目的 SQL Editor 执行 sql/create_paper_states_schema.sql。这不是邮箱或密码错误。");
 const parts=[message,text('details'),text('hint')].filter((s,i,all)=>s&&all.indexOf(s)===i);
 return (parts.join('；')||uiText("请求失败，服务未返回错误说明。"))+(code?` [${code}]`:'')+hint;
}
