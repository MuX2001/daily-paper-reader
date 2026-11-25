import {t as uiText} from './i18n/messages.ts';
import {errorMessage} from './errors';
import {useState} from 'react';
import {library} from './api';
import {importMigration} from './migration';
import {planMigration} from './migrationPlan';
import {legacyBackup} from './legacyBackup';
import type {CatalogEntry,PaperState} from './domain';
export function MigrationPanel({runs,states,userId,refresh}:{runs:CatalogEntry[];states:Record<string,PaperState>;userId?:string;refresh:()=>Promise<void>}){
  const [source,setSource]=useState<'browser'|'file'>('browser');
  const [plan,setPlan]=useState<ReturnType<typeof planMigration>|null>(null),[raw,setRaw]=useState<unknown>(null),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  const [owners,setOwners]=useState<string[]>([]),[owner,setOwner]=useState(''),[filename,setFilename]=useState('');
  async function previewFile(){setBusy(true);setPlan(null);try{
    const backup=legacyBackup(raw,owner);
    if(backup.owners.length&&!owner)throw new Error(uiText("请明确选择要导入的旧版用户名"));
    const next=planMigration(backup.states,await library(runs),states,new Date().toISOString());
    next.skipped.push(...backup.conflicts.map(id=>({id,reason:uiText("备份中同一论文存在冲突状态，未导入")})));
    setPlan(next);setMessage(uiText("已预览文件，尚未写入云端。导入目标为当前登录账户。"));
  }catch(e){setMessage(errorMessage(e));}finally{setBusy(false);}}
  async function preview(){setBusy(true);try{const data=JSON.parse(localStorage.getItem('dpr_read_papers_v1')||'{}');setRaw(data);setPlan(planMigration(data,await library(runs),states,new Date().toISOString()));setMessage(uiText("已预览，尚未写入云端。"));}catch(e){setMessage(errorMessage(e));}finally{setBusy(false);}}
  function backup(){const blob=new Blob([JSON.stringify(raw,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='dpr-legacy-reading-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  return <section><h3>{uiText("迁移旧版阅读记录")}</h3><p className="muted">{uiText("标记1转为收藏、标记4转为归档，标记2/3保留原颜色标记；不会自动生成正负反馈。已读时间记为迁移时间，原记录不删除。云端已有状态不覆盖。")}</p><h4>{uiText("1. 选择来源")}</h4><div className="settings-actions"><button aria-pressed={source==='browser'} onClick={()=>{setSource('browser');setPlan(null);}}>{uiText("读取当前浏览器旧记录")}</button><button aria-pressed={source==='file'} onClick={()=>{setSource('file');setPlan(null);}}>{uiText("选择 JSON 备份文件")}</button></div>{source==='browser'&&<button disabled={busy} onClick={()=>{setFilename('');setOwners([]);setOwner('');setPlan(null);void preview();}}>{uiText("预览本设备旧记录")}</button>}
  {source==='file'&&<label>{uiText("导入旧记录 JSON 文件")}<input aria-label={uiText("旧记录备份文件")} type="file" accept=".json,application/json" disabled={busy} onChange={async e=>{
    const file=e.target.files?.[0];e.target.value='';setPlan(null);setRaw(null);setFilename('');setOwners([]);setOwner('');if(!file)return;
    setBusy(true);try{if(file.size>5_000_000)throw new Error(uiText("备份超过5MB，请按用户名拆分后导入"));const data=JSON.parse(await file.text());const parsed=legacyBackup(data);setRaw(data);setOwners(parsed.owners);setFilename(file.name);setMessage(uiText("文件已读取，请选择用户并预览；尚未导入。"));}catch(error){setMessage(errorMessage(error));}finally{setBusy(false);}
  }}/></label>}{source==='file'&&filename&&<><p>{uiText("备份文件：")}{filename}</p>{owners.length>0&&<label>{uiText("旧版用户名")}<select aria-label={uiText("备份用户名")} disabled={busy} value={owner} onChange={e=>{setOwner(e.target.value);setPlan(null);}}><option value="">{uiText("请选择自己的旧版用户名")}</option>{owners.map(name=><option key={name}>{name}</option>)}</select></label>}<button disabled={busy||(owners.length>0&&!owner)} onClick={()=>void previewFile()}>{uiText("预览文件迁移")}</button></>}
  {plan&&<><h4>{uiText("2. 预览确认")}</h4><p>{uiText("收藏")} {plan.rows.filter(r=>r.starred).length} {uiText("条，已读")} {plan.rows.length} {uiText("条（含收藏），归档")} {plan.rows.filter(r=>r.dismissed_at).length} {uiText("条。当前备份格式不迁移笔记正文。")}</p><p>{uiText("可导入")} {plan.rows.length} {uiText("条；保留或待处理")} {plan.skipped.length} {uiText("条。")}</p><button onClick={backup}>{uiText("下载原始记录备份")}</button><h4>{uiText("3. 导入当前账户")}</h4>{!userId&&<p>{uiText("请先在“账户与同步”中登录。")}</p>}<button disabled={busy||!userId||!plan.rows.length} onClick={async()=>{if(!userId)return;setBusy(true);try{const count=await importMigration(userId,plan.rows);await refresh();setMessage(uiText("已导入 {0} 条，旧记录仍保留。", count));setPlan(null);}catch(e){setMessage(errorMessage(e));}finally{setBusy(false);}}}>{uiText("导入到当前账户")}</button><details><summary>{uiText("查看保留与冲突")}</summary><ul>{plan.skipped.map((item,i)=><li key={i}>{item.id}：{item.reason}</li>)}</ul></details></>}{busy&&<p role="status">{uiText("正在处理，请稍候…")}</p>}{message&&<p role="status">{message}</p>}</section>;
}
