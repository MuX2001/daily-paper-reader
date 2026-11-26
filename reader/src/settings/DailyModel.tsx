import {useEffect,useState} from 'react';
import {t} from '../i18n/messages';
import {DEFAULT_REPOSITORY,repositoryLinks} from '../repository';
import {errorMessage} from '../errors';

const variable = 'DAILY_READER_MODEL';
const inherit = '';
export function DailyModel({repository,token}:{repository:string;token:string}) {
  const siteOwner = location.hostname.match(/^([a-z0-9-]+)\.github\.io$/i)?.[1];
  const siteRepo = location.pathname.split('/')[1];
  const target = repository.trim() || (siteOwner && siteRepo ? siteOwner+'/'+siteRepo : DEFAULT_REPOSITORY);
  const valid = repositoryLinks(target).repository === target;
  const base = 'https://api.github.com/repos/'+target+'/actions/variables';
  const [current,setCurrent]=useState<string|null>(null),[choice,setChoice]=useState(inherit);
  const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[failed,setFailed]=useState(false);
  async function api(path:string,method='GET',body?:object,signal?:AbortSignal) {
    const response=await fetch(path,{method,signal,headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json',...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
    if(!response.ok)throw new Error(t("GitHub 返回 {0}，请核对仓库和 Token 的 Variables 权限。",response.status));
    return response;
  }
  useEffect(()=>{
    const stop=new AbortController();
    if(valid && token){
      setBusy(true);
      (async()=>{
        // The list distinguishes an absent variable from an inaccessible repository (404).
        for(let page=1;;page++){
          const data=await (await api(base+'?per_page=100&page='+page,'GET',undefined,stop.signal)).json();
          if(!Array.isArray(data.variables))throw new Error(t("无法读取仓库变量"));
          const found=data.variables.find((v:{name:string})=>v.name===variable);
          if(found || data.variables.length<100){
            if(!stop.signal.aborted){setCurrent(found?.value??inherit);setChoice(found?.value??inherit);}
            break;
          }
        }
      })().catch(e=>{if(!stop.signal.aborted){setFailed(true);setMessage(errorMessage(e));}}).finally(()=>{if(!stop.signal.aborted)setBusy(false);});
    }
    return ()=>stop.abort();
  },[base,valid,token]);
  async function save(){
    if(current===null || !valid || !token)return;
    setBusy(true);setFailed(false);setMessage('');
    try{
      const item=base+'/'+variable;
      if(!choice)await api(item,'DELETE');
      else if(current)await api(item,'PATCH',{name:variable,value:choice});
      else await api(base,'POST',{name:variable,value:choice});
      setCurrent(choice);setMessage(t("已保存到 GitHub，下次日报生效。"));
    }catch(e){setFailed(true);setMessage(errorMessage(e));}finally{setBusy(false);}
  }
  return <section className="settings-card"><h3>{t("每日自动工作流模型")}</h3>
    <p>{t("用于日报评分和分诊总结。沿用原配置时，评分使用仓库模型配置，分诊优先使用 TRIAGE_MODEL。网页无法读取 Secret 的值。")}</p>
    <p>{t("目标仓库：{0}",target)}</p>
    <label>{t("日报模型")}<select aria-label={t("日报模型")} value={current===null?'pending':choice} disabled={busy||current===null} onChange={e=>setChoice(e.target.value)}>
      {current===null&&<option value="pending">{t("尚未读取云端配置")}</option>}
      <option value="">{t("沿用仓库原配置")}</option>
      <option value="deepseek-flash">DeepSeek Flash</option><option value="deepseek-v4-pro">DeepSeek Pro</option>
      {current && !['deepseek-flash','deepseek-v4-pro'].includes(current)&&<option value={current}>{current}</option>}
    </select></label>
    <p className="muted">{t("先在上方保存仓库和 GitHub Token，Token 需具备该仓库的 Variables 读写权限。也可在 GitHub 设置 DAILY_READER_MODEL；API Key 继续使用原 Secret。")}</p>
    <div className="settings-actions"><button disabled={current===null||busy||choice===current} onClick={()=>void save()}>{busy?t("正在处理…"):t("保存日报模型到 GitHub")}</button>
    {valid&&<a href={repositoryLinks(target).url+'/settings/variables/actions'} target="_blank" rel="noopener noreferrer">{t("打开 GitHub Variables")} ↗</a>}</div>
    {message&&<p role={failed?'alert':'status'} className={'settings-result '+(failed?'failure':'success')}>{message}</p>}
  </section>;
}
