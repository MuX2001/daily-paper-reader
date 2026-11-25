import {t as uiText} from './i18n/messages.ts';
import {errorMessage} from './errors';
import {useEffect,useState} from 'react';
import {getClient,githubLogin,getCloudOrigin,matchesCloudConfiguration} from './api';

export function AccountLogin({draftURL,draftKey}:{draftURL:string;draftKey:string}){
 const origin=getCloudOrigin(),unsaved=!!origin&&!matchesCloudConfiguration(draftURL,draftKey);
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 const [githubEnabled,setGithubEnabled]=useState(false);
 useEffect(()=>{const controller=new AbortController();setGithubEnabled(false);if(origin&&draftKey)fetch(`${origin}/auth/v1/settings`,{headers:{apikey:draftKey},signal:controller.signal}).then(r=>r.ok?r.json():null).then(data=>setGithubEnabled(data?.external?.github===true)).catch(()=>{});return()=>controller.abort();},[origin,draftKey]);
 async function authenticate(register=false){
  setError('');setMessage('');const client=getClient();
  if(unsaved){setError(uiText("连接信息已修改，请先点击“保存并验证连接”。"));return;}
  if(!client){setError(uiText("请先保存并验证连接。"));return;}
  if(!email.trim()||!password){setError(uiText("请填写邮箱和密码。"));return;}
  setBusy(true);
  try{
   const credentials={email:email.trim(),password};
   const result=register?await client.auth.signUp(credentials):await client.auth.signInWithPassword(credentials);
   if(getClient()!==client)return;
   if(result.error)throw result.error;
   setPassword('');setMessage(result.data.session?uiText("登录成功，可以关闭设置并测试收藏和笔记。"):uiText("注册请求已提交；如果项目要求验证邮箱，请先完成邮件验证再登录。"));
  }catch(e){if(getClient()===client)setError(errorMessage(e));}finally{setBusy(false);}
 }
 return <section className="account-login"><p className="auth-target">{uiText("实际登录项目：")}<strong>{origin||uiText("尚未保存并验证连接")}</strong></p>{unsaved&&<p role="alert">{uiText("连接信息已修改，请先点击“保存并验证连接”。")}</p>}{githubEnabled&&<button disabled={busy||unsaved} onClick={async()=>{setBusy(true);setError('');setMessage(uiText("正在检查 GitHub 登录配置…"));try{await githubLogin();setMessage(uiText("正在前往 GitHub…"));}catch(e){setMessage('');setError(errorMessage(e));}finally{setBusy(false);}}}>{busy?uiText("正在处理登录…"):uiText("使用 GitHub 登录")}</button>}
 {error&&<p role="alert" className="banner error">{error}</p>}{message&&<p role="status" className="banner">{message}</p>}
 <form onSubmit={e=>{e.preventDefault();void authenticate();}}>
 <h3>{uiText("邮箱登录")}</h3><label>{uiText("登录邮箱")}<input aria-label={uiText("登录邮箱")} type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} required/></label>
 <label>{uiText("登录密码")}<input aria-label={uiText("登录密码")} type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required/></label>
 <button disabled={busy||unsaved} type="submit">{busy?uiText("正在处理…"):uiText("邮箱登录")}</button><button disabled={busy||unsaved} type="button" onClick={()=>void authenticate(true)}>{uiText("注册邮箱账户")}</button>
 </form></section>;
}
