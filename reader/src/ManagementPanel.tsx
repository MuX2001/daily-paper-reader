import {useEffect,useRef,useState} from 'react';
import {dispatchWorkflow,loadConfig,recentRuns,saveProfiles,validateProfiles,type ConfigSnapshot,type GitHubConfig,type Profile} from './github';
import '../../app/topic-preview.js';
import {safeURL} from './domain';
import {ProfileEditor} from './ProfileEditor';
declare global {interface Window {TopicResearchPreview:{preview:(options:unknown)=>Promise<{status:string;count:number|null;threshold:number;reason?:string}>}}}
export function ManagementPanel({config,configure}:{config:GitHubConfig;configure:()=>void}){
 const topicVisited=useRef(false);
 const [snapshot,setSnapshot]=useState<ConfigSnapshot|null>(null),[profiles,setProfiles]=useState<Profile[]>([]),[tab,setTab]=useState('daily');
 const [error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[dirty,setDirty]=useState(false);
 const [deleting,setDeleting]=useState<number|null>(null);
 const [editing,setEditing]=useState<number|null>(null),[draft,setDraft]=useState('');
 const [dailyTag,setDailyTag]=useState(''),[conferenceTag,setConferenceTag]=useState(''),[topicTag,setTopicTag]=useState('');
 const [days,setDays]=useState('10'),[conference,setConference]=useState('ICML'),[years,setYears]=useState(String(new Date().getFullYear()));
 const [mode,setMode]=useState('90'),[asOf,setAsOf]=useState(new Date().toISOString().slice(0,10)),[budget,setBudget]=useState('10'),[resume,setResume]=useState('');
 const [preview,setPreview]=useState<{status:string;count:number|null;threshold:number;reason?:string}|null>(null);
 const [pending,setPending]=useState<{workflow:string;inputs:Record<string,string>}|null>(null),[runs,setRuns]=useState<Awaited<ReturnType<typeof recentRuns>>>([]);
 async function load(){if(!config.token){configure();return;}setBusy(true);setError('');try{const next=await loadConfig(config);setSnapshot(next);setProfiles(next.profiles);setDirty(false);setNotice('已读取配置');}catch(e){setError(String(e));}finally{setBusy(false);}}
 useEffect(()=>{setSnapshot(null);setProfiles([]);setDirty(false);setRuns([]);setPending(null);},[config.repository,config.ref]);
 useEffect(()=>{setPending(null);},[tab,dailyTag,conferenceTag,topicTag,days,conference,years,mode,asOf,budget,resume,profiles,editing]);
 useEffect(()=>{setPreview(null);},[topicTag,mode,asOf,profiles]);
 function update(next:Profile[]){setProfiles(next);setDirty(true);setPending(null);}
 function remapSelection(oldTag:string,newTag:string){
  if(dailyTag===oldTag)setDailyTag(newTag);if(conferenceTag===oldTag)setConferenceTag(newTag);if(topicTag===oldTag)setTopicTag(newTag);
 }
 function applyEdit(){try{
  const p=JSON.parse(draft);const next=[...profiles];next[editing!]=p;validateProfiles(next);
  const old=profiles[editing!];if(old&&old.tag!==p.tag)remapSelection(old.tag,p.tag);
  update(next);setEditing(null);setError('');
 }catch(e){setError(String(e));}}
 function prepare(){
  try{
   if(editing!==null)throw new Error('请先应用或取消方向编辑');
   if(dirty)throw new Error('请先保存订阅修改，再触发任务');
   if(!snapshot)throw new Error('请先读取订阅配置');
   if(tab==='daily')setPending({workflow:'daily-paper-reader.yml',inputs:{profile_tag:dailyTag,fetch_days:days,fetch_mode:'auto',content_mode:'triage',triage_previews:'true'}});
   else if(tab==='conference'){
    if(!/^\d{4}(,\s*\d{4})*$/.test(years))throw new Error('年份应为2024,2025这样的列表');
    setPending({workflow:'conference-paper-retrieval.yml',inputs:{profile_tag:conferenceTag,conference,years}});
   }else{
    if(!topicTag&&!resume)throw new Error('请选择一个专题词条');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(asOf)||!Number.isInteger(Number(budget))||Number(budget)<0||Number(budget)>100)throw new Error('截止日或内容预算无效');
    if(resume&&!/^\d{8}-[a-f0-9]{12}$/.test(resume))throw new Error('继续任务 ID 格式无效');
    setPending({workflow:'topic-research.yml',inputs:{profile_tag:topicTag,mode,as_of:asOf,content_batch:budget,action:resume?'continue-content':'run',run_id:resume}});
   }
  }catch(e){setError(String(e));}
 }
 const selectedTag=tab==='daily'?dailyTag:tab==='conference'?conferenceTag:topicTag;
 function selectTag(value:string){if(tab==='daily')setDailyTag(value);else if(tab==='conference')setConferenceTag(value);else setTopicTag(value);}
 return <section className="management"><div className="management-heading"><h2>研究方向与任务</h2><div><button disabled={busy||dirty||editing!==null} onClick={()=>void load()}>读取仓库配置</button><button disabled={busy||!dirty||!snapshot||editing!==null} onClick={async()=>{if(!snapshot)return;setBusy(true);setError('');try{setSnapshot(await saveProfiles(config,snapshot,profiles));setDirty(false);setNotice('订阅已保存到所选分支');}catch(e){setError(String(e));}finally{setBusy(false);}}}>保存订阅</button></div></div><p className="muted">当前目标：{config.repository||'未配置仓库'} / {config.ref}。模型密钥继续保存在 GitHub Actions Secrets。</p>{error&&<p role="alert" className="banner error">{error}</p>}{notice&&<p role="status" className="banner">{notice}</p>}<div className="management-tabs">{[['daily','日常管理'],['conference','会议论文'],['topic','专题研究']].map(([key,label])=><button key={key} aria-pressed={tab===key} onClick={()=>{setTab(key);setPending(null);if(key==='topic'&&!topicVisited.current){topicVisited.current=true;if(dailyTag)setTopicTag(dailyTag);}}}>{label}</button>)}</div>
 <div className="profile-grid">{profiles.map((p,i)=><article className="profile-card" key={p.tag}><div><strong>{p.tag}</strong><label><input type="checkbox" checked={p.enabled!==false} disabled={busy||editing!==null} onChange={e=>update(profiles.map((item,j)=>j===i?{...item,enabled:e.target.checked}:item))}/>启用</label></div><p>{p.description||'尚无方向说明'}</p><small>{p.keywords?.length||0} 个关键词 · {p.intent_queries?.length||0} 个语义查询</small><button disabled={busy||editing!==null} onClick={()=>{setDeleting(null);setEditing(i);setDraft(JSON.stringify(p,null,2));}}>编辑方向</button><button disabled={busy||editing!==null} onClick={()=>setDeleting(i)}>删除方向</button></article>)}</div><button className="add-profile" disabled={!snapshot||busy||editing!==null} onClick={()=>{setDeleting(null);setEditing(profiles.length);setDraft(JSON.stringify({tag:'',description:'',enabled:true,paper_sources:['arxiv'],keywords:[{keyword:'',query:''}],intent_queries:[]},null,2));}}>＋ 新增研究方向</button>
 {deleting!==null&&<div className="task-confirm" role="alert"><p>从订阅中移除“{profiles[deleting]?.tag}”？历史论文和阅读记录会保留，保存订阅后生效。</p><button onClick={()=>{const old=profiles[deleting];if(old)remapSelection(old.tag,'');update(profiles.filter((_,i)=>i!==deleting));setDeleting(null);}}>确认移除方向</button><button onClick={()=>setDeleting(null)}>取消移除</button></div>}
 {editing!==null&&<ProfileEditor draft={draft} onChange={setDraft} apply={applyEdit} cancel={()=>setEditing(null)}/>}
 <section className="task-form"><h3>{tab==='daily'?'日常分诊':tab==='conference'?'会议检索':'专题研究'}</h3><label>研究方向<select aria-label="任务研究方向" value={selectedTag} onChange={e=>selectTag(e.target.value)}><option value="">{tab==='topic'?'选择一个词条':'全部启用词条'}</option>{profiles.filter(p=>p.enabled!==false).map(p=><option key={p.tag} value={p.tag}>{p.tag}</option>)}</select></label>{tab==='daily'?<label>检索窗口<select value={days} onChange={e=>setDays(e.target.value)}><option value="1">今日</option><option value="10">10天</option><option value="30">30天</option></select></label>:tab==='conference'?<><label>会议<select value={conference} onChange={e=>setConference(e.target.value)}>{['NeurIPS','ICLR','ICML','AAAI','CVPR','ECCV','IJCAI','ACL','EMNLP','OSDI','SOSP','IEEE S&P','NDSS'].map(c=><option key={c}>{c}</option>)}</select></label><label>年份列表<input value={years} onChange={e=>setYears(e.target.value)}/></label></>:<><div className="research-modes">{[['90','90天','聚焦近期 arXiv'],['365','365天','回溯全年 arXiv'],['starter','研究方向大礼包','arXiv 与会议论文']].map(([value,title,text])=><button key={value} aria-pressed={mode===value} onClick={()=>setMode(value)}><strong>{title}</strong><span>{text}</span></button>)}</div><label>UTC 排他截止日<input type="date" value={asOf} onChange={e=>setAsOf(e.target.value)}/></label><label>本轮新增阅读内容预算<input type="number" min="0" max="100" value={budget} onChange={e=>setBudget(e.target.value)}/></label><label>继续已有任务（可选）<input value={resume} onChange={e=>setResume(e.target.value)} placeholder="YYYYMMDD-任务指纹"/></label><button disabled={busy||!topicTag||!snapshot} onClick={async()=>{setBusy(true);try{setPreview(await window.TopicResearchPreview.preview({config:snapshot!.raw,profile:profiles.find(p=>p.tag===topicTag),mode,asOf,conferences:[]}));}catch(e){setError(String(e));}finally{setBusy(false);}}}>预览关键词范围</button>{preview&&<p role="status">关键词命中：{preview.count===null?'未知':preview.count} · {preview.status}。{preview.reason} 此预览不代表完整混合召回数量。</p>}<p className="muted">最终最多100篇；评审预算最多300篇。继续内容只恢复原名单，不重新检索或评分。</p></>}
 <button className="primary" disabled={busy||!snapshot} onClick={prepare}>准备运行任务</button>{pending&&<div className="task-confirm"><h3>确认本次运行</h3><p>任务：{pending.workflow}，分支：{config.ref}。将调用已配置的模型，费用按实际用量计算。</p><pre>{JSON.stringify(pending.inputs,null,2)}</pre>{tab==='topic'&&preview?.status==='too_broad'&&<p>范围较宽，建议先编辑英文关键词或约束，再重新预览。</p>}<button disabled={busy} onClick={async()=>{setBusy(true);try{await dispatchWorkflow(config,pending.workflow,pending.inputs);setNotice('GitHub 已接收任务请求；可刷新运行列表查看进度。');setPending(null);}catch(e){setError(String(e));}finally{setBusy(false);}}}>确认并提交任务</button><button onClick={()=>setPending(null)}>取消</button></div>}</section>
 <section className="recent-runs"><h3>最近运行</h3><button disabled={busy} onClick={async()=>{try{setRuns(await recentRuns(config));}catch(e){setError(String(e));}}}>刷新运行状态</button>{runs.map(r=><a key={r.id} href={safeURL(r.html_url)} target="_blank" rel="noreferrer"><span>{r.display_title}</span><small>{r.conclusion||r.status}</small></a>)}</section></section>;
}
