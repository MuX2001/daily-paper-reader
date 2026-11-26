import {useEffect,useState,type ReactNode} from 'react';
import {t} from '../i18n/messages';
import {commitConfig,dispatchWorkflow,github,loadConfig,type ConfigSnapshot} from '../github';
import {errorMessage} from '../errors';
import {listSecrets,putSecret} from './pipelineApi';

const presets = {
  deepseek:['DeepSeek','https://api.deepseek.com','deepseek-flash'],
  siliconflow:['SiliconFlow','https://api.siliconflow.cn/v1','deepseek-ai/DeepSeek-V3'],
  openrouter:['OpenRouter','https://openrouter.ai/api/v1','openai/gpt-4o-mini'],
  openai:['OpenAI','https://api.openai.com/v1','gpt-4o-mini'],
  custom:['Custom','',''],
};
const defaults={
  summary_lang:'zh',
  daily_llm:{provider_preset:'deepseek',base_url:presets.deepseek[1],model:presets.deepseek[2]},
  triage_llm:{use_separate_model:false,base_url:'',model:''},
  rerank:{profile:'public-zwwen-rerank',provider:'',base_url:'',model:'',min_interval_seconds:8}
};
function fromSnapshot(s:ConfigSnapshot){
  const cfg=s.raw.pipeline||{};
  return {summary_lang:cfg.summary_lang||defaults.summary_lang,daily_llm:{...defaults.daily_llm,...cfg.daily_llm},triage_llm:{...defaults.triage_llm,...cfg.triage_llm},rerank:{...defaults.rerank,...cfg.rerank}} as typeof defaults;
}
function endpoint(value:string){
  const u=new URL(value);
  if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash)throw new Error(t('请填写有效的 HTTPS 模型端点'));
  return value.replace(/\/+$/,'');
}
export function DailyModel({repository,token,branch,connectionEdited,children,saveButton,saveResult,onBusy,onDirty}:{repository:string;token:string;branch:string;connectionEdited:boolean;children:ReactNode;saveButton:ReactNode;saveResult:ReactNode;onBusy:(v:boolean)=>void;onDirty:(v:boolean)=>void}){
  const cfg={repository,token,ref:branch};
  const [snapshot,setSnapshot]=useState<ConfigSnapshot|null>(null),[form,setForm]=useState(defaults);
  const [dates,setDates]=useState<Record<string,string>|null>(null),[keys,setKeys]=useState<Record<string,string>>({});
  const [busy,setBusy]=useState(''),[message,setMessage]=useState(''),[issue,setIssue]=useState(''),[secretError,setSecretError]=useState('');
  const [check,setCheck]=useState(0),[access,setAccess]=useState<Record<string,boolean>>({});
  const connected=!connectionEdited&&!!repository&&!!token&&branch==='dev';
  useEffect(()=>{
    let mounted=true;
    if(!connected){setBusy('');return;}
    setBusy('load');setIssue('');setSecretError('');setSnapshot(null);setDates(null);setAccess({});
    const mark=(name:string,ok:boolean)=>{if(mounted)setAccess(a=>({...a,[name]:ok}));};
    Promise.all([
      loadConfig(cfg).then(s=>{if(mounted){setSnapshot(s);setForm(fromSnapshot(s));}mark('Contents',true);},e=>{if(mounted)setIssue(errorMessage(e));mark('Contents',false);}),
      listSecrets(cfg).then(d=>{if(mounted)setDates(d);mark('Secrets',true);},e=>{if(mounted)setSecretError(errorMessage(e));mark('Secrets',false);}),
      github(cfg,'/actions/workflows/daily-paper-reader.yml').then(w=>mark('Actions',w.state==='active'),()=>mark('Actions',false)),
    ]).finally(()=>{if(mounted)setBusy('');});
    return ()=>{mounted=false;};
  },[repository,token,branch,check]);
  const dirty=!!snapshot && (JSON.stringify(form)!==JSON.stringify(fromSnapshot(snapshot)) || Object.values(keys).some(Boolean));
  useEffect(()=>{onDirty(dirty);return ()=>onDirty(false);},[dirty,onDirty]);
  useEffect(()=>{onBusy(!!busy);return ()=>onBusy(false);},[busy,onBusy]);
  const {daily_llm:d,triage_llm:tr,rerank:r}=form;
  function daily(v:Partial<typeof d>){setForm(f=>({...f,daily_llm:{...f.daily_llm,...v}}));}
  function triage(v:Partial<typeof tr>){setForm(f=>({...f,triage_llm:{...f.triage_llm,...v}}));}
  function rank(v:Partial<typeof r>){setForm(f=>({...f,rerank:{...f.rerank,...v}}));}
  function field(label:string,value:string,write:(s:string)=>void){return <label>{t(label)}<input value={value} onChange={e=>write(e.target.value)}/></label>;}
  function secret(name:string){return <label>{name}<small>{dates===null?t('密钥状态未知'):dates[name]?t('● 已托管于 GitHub Secrets（更新于 {0}）',dates[name]):t('○ 尚未在 GitHub 配置密钥')}</small>
    <input type="password" aria-label={name} autoComplete="off" value={keys[name]||''} placeholder={t('留空则保持线上现有密钥不变，输入新值将覆盖')} onChange={e=>setKeys(k=>({...k,[name]:e.target.value}))}/></label>;}
  async function act(label:string,fn:()=>Promise<void>){setBusy(label);setMessage('');setIssue('');try{await fn();}catch(e){setIssue(errorMessage(e));}finally{setBusy('');}}
  async function test(model:string,url:string,key:string){
    const address=endpoint(url)+'/chat/completions';
    let res:Response;
    try{res=await fetch(address,{method:'POST',signal:AbortSignal.timeout(20000),headers:{'Content-Type':'application/json',Authorization:'Bearer '+key.trim()},body:JSON.stringify({model,messages:[{role:'user',content:'Reply OK'}],max_tokens:8})});}
    catch{throw new Error(t('浏览器网络或跨域受限。GitHub Actions 可独立连接此端点。'));}
    if(!res.ok)throw new Error(t('模型测试失败（HTTP {0}）',res.status));
    if(!Array.isArray((await res.json()).choices))throw new Error(t('服务未返回聊天响应'));
    setMessage(t('模型端点已响应'));
  }
  async function save(){
    if(!snapshot)return;
    endpoint(d.base_url);if(!d.model.trim())throw new Error(t('请填写模型端点与模型 ID'));
    if(tr.use_separate_model&&tr.base_url)endpoint(tr.base_url);
    if(r.profile!=='public-zwwen-rerank'){
      endpoint(r.base_url);if(!r.model.trim()||!Number.isFinite(r.min_interval_seconds)||r.min_interval_seconds<0)throw new Error(t('请填写重排模型和有效间隔'));
    }
    const names=['DEEPSEEK_API_KEY',...(tr.use_separate_model?['TRIAGE_API_KEY']:[]),...(r.profile==='siliconflow'?['SILICONFLOW_API_KEY']:r.profile==='custom'?['RERANK_API_KEY']:[])].filter(n=>keys[n]?.trim());
    const doc=snapshot.document.clone();
    doc.setIn(['pipeline','summary_lang'],form.summary_lang);
    for(const block of ['daily_llm','triage_llm','rerank'] as const)
      for(const [key,value] of Object.entries(form[block]))doc.setIn(['pipeline',block,key],value);
    if(doc.toString()!==snapshot.document.toString()){
      const sha=await commitConfig(cfg,snapshot.sha,doc,'Update daily pipeline settings');
      setSnapshot({...snapshot,sha,document:doc,raw:doc.toJS()});
    }
    for(const n of names){
      try{await putSecret(cfg,n,keys[n]);setKeys(k=>({...k,[n]:''}));}
      catch(e){throw new Error(t('配置已保存。密钥 {0} 保存失败，可重试。{1}',n,errorMessage(e)));}
    }
    if(names.length){
      try{setDates(await listSecrets(cfg));setSecretError('');}
      catch(e){setDates(null);setSecretError(errorMessage(e));}
    }
    setMessage(t('已保存到 GitHub，下次日报生效。'));
  }
  return <>
    <section className="settings-card">{children}
      <div className="settings-actions">{saveButton}<button disabled={!connected||!!busy} onClick={()=>setCheck(n=>n+1)}>{t('检查连接与权限')}</button></div>
      {saveResult}
      {!connected&&<p>{t('请先保存仓库、dev 分支和 Token')}</p>}
      {connected&&<p>{['Contents','Actions','Secrets'].map(n=><span key={n} style={{color:access[n]?'#186543':'#846414'}}>{access[n]?'✓':'⚠'} {n}　</span>)}</p>}
      <small>{t('检查确认读取权限；写权限在保存或运行时验证。')}</small>
      {secretError&&<p role="alert">{secretError}</p>}
    </section>
    <section className="settings-card"><h3>{t('每日评分与速览模型')}</h3><fieldset disabled={!connected||!!busy||!snapshot}>
      <label>{t('服务商快速预设')}<select value={d.provider_preset} onChange={e=>{const id=e.target.value,p=presets[id as keyof typeof presets];daily({provider_preset:id,base_url:p[1],model:p[2]});setKeys(k=>({...k,DEEPSEEK_API_KEY:''}));}}>{Object.entries(presets).map(([id,p])=><option key={id} value={id}>{id==='custom'?t('自定义'):p[0]}</option>)}</select></label>
      {field('API Base URL',d.base_url,base_url=>daily({base_url}))}
      {field('日报模型',d.model,model=>daily({model}))}
      {d.provider_preset==='deepseek'&&<div className="settings-actions">{['deepseek-flash','deepseek-v4-pro'].map((id,i)=><button key={id} aria-pressed={d.model===id} onClick={()=>daily({model:id})}>{i?'DeepSeek Pro':'DeepSeek Flash'}</button>)}</div>}
      <label>{t('新生成速览语言')}<select value={form.summary_lang} onChange={e=>setForm({...form,summary_lang:e.target.value})}><option value="zh">中文</option><option value="en">English</option></select></label>
      {secret('DEEPSEEK_API_KEY')}<button disabled={!keys.DEEPSEEK_API_KEY?.trim()} onClick={()=>void act('test',()=>test(d.model,d.base_url,keys.DEEPSEEK_API_KEY))}>{t('测试模型连接')}</button>
      <label className="settings-check"><input type="checkbox" checked={tr.use_separate_model} onChange={e=>{triage({use_separate_model:e.target.checked});if(!e.target.checked)setKeys(k=>({...k,TRIAGE_API_KEY:''}));}}/>{t('为速览单独指定模型或密钥')}</label>
      {tr.use_separate_model&&<>{field('Triage Base URL',tr.base_url,base_url=>triage({base_url}))}{field('Triage Model ID',tr.model,model=>triage({model}))}{secret('TRIAGE_API_KEY')}
      <button disabled={!keys.TRIAGE_API_KEY?.trim()} onClick={()=>void act('test',()=>test(tr.model||d.model,tr.base_url||d.base_url,keys.TRIAGE_API_KEY))}>{t('测试速览连接')}</button></>}
    </fieldset></section>
    <section className="settings-card"><h3>{t('候选论文重排')}</h3><fieldset disabled={!connected||!!busy||!snapshot}>
      <label>{t('重排模式')}<select value={r.profile} onChange={e=>{const profile=e.target.value;setKeys(k=>({...k,RERANK_API_KEY:'',SILICONFLOW_API_KEY:''}));rank({profile,provider:profile==='custom'?'custom':'',model:profile==='siliconflow'?'BAAI/bge-reranker-v2-m3':'',base_url:profile==='siliconflow'?'https://api.siliconflow.cn/v1/rerank':'',min_interval_seconds:8});}}>
        <option value="public-zwwen-rerank">{t('公共免费重排')}</option><option value="siliconflow">SiliconFlow</option><option value="custom">{t('自定义')}</option></select></label>
      {r.profile==='public-zwwen-rerank'?<p>{t('使用默认公共重排服务，免配 API Key。')}</p>:<>
        {r.profile==='custom'&&field('Provider',r.provider,provider=>rank({provider}))}
        {field('Reranker URL',r.base_url,base_url=>rank({base_url}))}{field('Reranker Model ID',r.model,model=>rank({model}))}
        <label>{t('最小请求间隔（秒）')}<input type="number" min="0" step="any" value={r.min_interval_seconds} onChange={e=>rank({min_interval_seconds:Number(e.target.value)})}/></label>
        {secret(r.profile==='siliconflow'?'SILICONFLOW_API_KEY':'RERANK_API_KEY')}</>}
    </fieldset></section>
    <div className="settings-actions"><button disabled={!connected||!!busy||!snapshot} onClick={()=>void act('save',save)}>{busy==='save'?t('正在处理…'):t('保存流水线配置到 GitHub')}</button>
    <button disabled={!connected||!!busy||!snapshot||dirty} onClick={()=>void act('run',async()=>{await dispatchWorkflow(cfg,'daily-paper-reader.yml',{pipeline_action:'daily'});setMessage(t('日报任务已提交'));})}>{t('立即运行一次今日推荐')}</button></div>
    {message&&<p role="status">{message}</p>}{issue&&<p role="alert">{issue}</p>}
  </>;
}
