import {useEffect,useState} from 'react';
import {getClient,githubLogin,getCloudOrigin,matchesCloudConfiguration} from './api';

export function AccountLogin({connectLocal,draftURL,draftKey}:{connectLocal:(url:string,key:string)=>void;draftURL:string;draftKey:string}){
 const origin=getCloudOrigin(),unsaved=!!origin&&!matchesCloudConfiguration(draftURL,draftKey);
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 const [local,setLocal]=useState<{url:string;key:string}|null>(null);
 useEffect(()=>{
  if(!['localhost','127.0.0.1','[::1]'].includes(location.hostname))return;
  const controller=new AbortController();
  fetch('./local-reader-config.json',{signal:controller.signal,cache:'no-store'}).then(async response=>{
   if(!response.ok)return;const data=await response.json();const target=new URL(data.url);
   if(['localhost','127.0.0.1','[::1]'].includes(target.hostname)&&typeof data.key==='string')setLocal(data);
  }).catch(()=>{});
  return ()=>controller.abort();
 },[]);
 async function authenticate(register=false){
  setError('');setMessage('');const client=getClient();
  if(unsaved){setError('连接信息已修改，请先点击“保存连接配置”。');return;}
  if(!client){setError('请先保存连接配置，或连接下方本地测试库。');return;}
  if(!email.trim()||!password){setError('请填写邮箱和密码。');return;}
  setBusy(true);
  try{
   const credentials={email:email.trim(),password};
   const result=register?await client.auth.signUp(credentials):await client.auth.signInWithPassword(credentials);
   if(getClient()!==client)return;
   if(result.error)throw result.error;
   setPassword('');setMessage(result.data.session?'登录成功，可以关闭设置并测试收藏和笔记。':'注册请求已提交；如果项目要求验证邮箱，请先完成邮件验证再登录。');
  }catch(e){if(getClient()===client)setError(e instanceof Error?e.message:String(e));}finally{setBusy(false);}
 }
 return <section className="account-login"><p className="auth-target">实际登录项目：<strong>{origin||'尚未保存连接配置'}</strong></p>{unsaved&&<p role="alert">连接信息已修改，请先点击“保存连接配置”。</p>}<button disabled={busy||unsaved} onClick={async()=>{setBusy(true);setError('');setMessage('正在检查 GitHub 登录配置…');try{await githubLogin();setMessage('正在前往 GitHub…');}catch(e){setMessage('');setError(e instanceof Error?e.message:String(e));}finally{setBusy(false);}}}>{busy?'正在处理登录…':'使用 GitHub 登录'}</button>
 {error&&<p role="alert" className="banner error">{error}</p>}{message&&<p role="status" className="banner">{message}</p>}
 {local&&<details className="local-account"><summary>本地测试（不与线上同步）</summary><p>此入口会切换到独立测试库。线上账号不能在这里登录。</p><button disabled={busy} onClick={()=>{try{connectLocal(local.url,local.key);setError('');setMessage('已连接本地测试库。首次使用请填写邮箱和密码，然后注册。');}catch(e){setError(String(e));}}}>连接本地测试库</button><small>如果通过远程服务器访问网页，也需要转发测试库端口54321。</small></details>}
 <form onSubmit={e=>{e.preventDefault();void authenticate();}}>
 <h3>邮箱登录</h3><label>登录邮箱<input aria-label="登录邮箱" type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} required/></label>
 <label>登录密码<input aria-label="登录密码" type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required/></label>
 <button disabled={busy||unsaved} type="submit">邮箱登录</button><button disabled={busy||unsaved} type="button" onClick={()=>void authenticate(true)}>注册邮箱账户</button>
 </form></section>;
}
