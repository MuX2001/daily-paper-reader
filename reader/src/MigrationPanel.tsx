import {useState} from 'react';
import {library} from './api';
import {importMigration} from './migration';
import {planMigration} from './migrationPlan';
import type {CatalogEntry,PaperState} from './domain';
export function MigrationPanel({runs,states,userId,refresh}:{runs:CatalogEntry[];states:Record<string,PaperState>;userId?:string;refresh:()=>Promise<void>}){
  const [plan,setPlan]=useState<ReturnType<typeof planMigration>|null>(null),[raw,setRaw]=useState<unknown>(null),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  async function preview(){setBusy(true);try{const data=JSON.parse(localStorage.getItem('dpr_read_papers_v1')||'{}');setRaw(data);setPlan(planMigration(data,await library(runs),states,new Date().toISOString()));setMessage('已预览，尚未写入云端。');}catch(e){setMessage(String(e));}finally{setBusy(false);}}
  function backup(){const blob=new Blob([JSON.stringify(raw,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='dpr-legacy-reading-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  return <section><h3>迁移旧版阅读记录</h3><p className="muted">读取本设备旧版记录。标记1转为收藏、标记4转为归档，标记2/3保留原颜色标记；不会自动生成正负反馈。已读时间记为迁移时间，原记录不删除。云端已有状态不覆盖。</p><button disabled={busy} onClick={()=>void preview()}>预览旧记录迁移</button>{plan&&<><p>可导入 {plan.rows.length} 条；保留或待处理 {plan.skipped.length} 条。</p><button onClick={backup}>下载原始记录备份</button><button disabled={busy||!userId||!plan.rows.length} onClick={async()=>{if(!userId)return;setBusy(true);try{const count=await importMigration(userId,plan.rows);await refresh();setMessage(`已导入 ${count} 条，旧记录仍保留。`);setPlan(null);}catch(e){setMessage(String(e));}finally{setBusy(false);}}}>导入到当前账户</button><details><summary>查看保留与冲突</summary><ul>{plan.skipped.map((item,i)=><li key={i}>{item.id}：{item.reason}</li>)}</ul></details></>}{message&&<p role="status">{message}</p>}</section>;
}
