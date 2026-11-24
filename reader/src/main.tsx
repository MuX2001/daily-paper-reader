import {errorMessage} from './errors';
import React, { useCallback, useEffect, useMemo, useRef, useState, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import type { Session } from '@supabase/supabase-js';
import { catalog, feed, library, configureCloud, getClient, loadStates, saveState } from './api';
import { editableTarget, emptyState, filterPapers, safeURL, type Catalog, type Paper, type PaperState, type StatePatch, type View } from './domain';
import './style.css';
import {ReadingMaterial} from './ReadingMaterial';
import {DeepReadSetup} from './DeepReadSetup';
import {AccountLogin} from './AccountLogin';
import {PaperThumbnail} from './PaperThumbnail';
import {FeedbackForm} from './FeedbackForm';
import {NoteEditor,type NoteDraft} from './NoteEditor';
import {noteMarkdown,noteFilename,obsidianURI,obsidianFolder} from './notes';
import {scopedBatch} from './scopedBatch';
import {installCitation,downloadCitation,citationDate} from './citation';
const ManagementPanel=lazy(()=>import('./ManagementPanel').then(module=>({default:module.ManagementPanel})));
import { MigrationPanel } from './MigrationPanel';
import { TopicsPanel } from './TopicsPanel';
import { ChatPanel } from './ChatPanel';
import { dispatchDeepRead, pollDeepRead, recoverDeepRead, type DeepTask } from './deepRead';

const labels: Record<View,string> = {inbox:'论文收件箱',starred:'待精读',topics:'专题包',archive:'已归档',manage:'研究管理'};
const icons: Record<View,string> = {inbox:'▤',starred:'☆',topics:'▦',archive:'▱',manage:'⚙'};
function App() {
  const [runs,setRuns] = useState<Catalog['runs']>([]), [run,setRun] = useState('');
  const [papers,setPapers] = useState<Paper[]>([]), [storedStates,setStates] = useState<Record<string,PaperState>>({});
  const [view,setView] = useState<View>('inbox'), [query,setQuery] = useState(''), [selected,setSelected] = useState('');
  const [loading,setLoading] = useState(true), [error,setError] = useState(''), [notice,setNotice] = useState('');
  const [feedbackOpen,setFeedbackOpen]=useState(false);
  const [settings,setSettings] = useState(false), [help,setHelp] = useState(false), [detail,setDetail] = useState(false);
  const [url,setUrl] = useState(localStorage.getItem('dpr.cloud.url') || ''), [key,setKey] = useState(localStorage.getItem('dpr.cloud.key') || '');
  const [session,setSession] = useState<Session|null>(null), [cloudEpoch,setCloudEpoch] = useState(0), [busy,setBusy] = useState(false);
  const [stateScope,setStateScope]=useState('');
  const scope=`${cloudEpoch}:${session?.user.id||''}`;
  const activeScope=useRef(scope);activeScope.current=scope;
  const states=stateScope===scope?storedStates:{};
  const [vault,setVault] = useState(localStorage.getItem('dpr.obsidian.vault') || '');
  const [inboxFolder,setInboxFolder]=useState(localStorage.getItem('dpr.obsidian.folder')??'Inbox');
  const [archiveConfirm,setArchiveConfirm] = useState(false);
  const [repository,setRepository]=useState(localStorage.getItem('dpr.github.repository')||'');
  const [branch,setBranch]=useState(localStorage.getItem('dpr.github.ref')||'dev');
  const [githubToken,setGithubToken]=useState('');
  const [chatEndpoint,setChatEndpoint]=useState(localStorage.getItem('dpr.chat.endpoint')||'https://api.deepseek.com/v1');
  const [chatModel,setChatModel]=useState(localStorage.getItem('dpr.chat.model')||'');
  const [chatKey,setChatKey]=useState('');
  const [deepConfirm,setDeepConfirm]=useState(false), [deepTask,setDeepTask]=useState<DeepTask|null>(null);
  const [dispatching,setDispatching]=useState(false);
  const gitConfigRef=useRef({repository,ref:branch,token:githubToken});gitConfigRef.current={repository,ref:branch,token:githubToken};
  async function recoverTask(paper:Paper){
    if(!githubToken){setSettings(true);setNotice('请先配置 GitHub 任务权限，再恢复精读状态。');return;}
    const config=gitConfigRef.current;setDispatching(true);setError('');
    const active=()=>{const current=gitConfigRef.current;return current.repository===config.repository&&current.ref===config.ref&&current.token===config.token;};
    try{const task=await recoverDeepRead(config,paper.original_id);if(!active())return;if(task){setDeepTask(task);setNotice('已恢复现有精读任务，未触发新模型调用。');}else setNotice('最近300次工作流运行中未找到此版本任务；更早记录请到 GitHub Actions 查看。');}
    catch(e){if(active())setError(errorMessage(e));}finally{setDispatching(false);}
  }
  useEffect(()=>{
    if(!deepTask || ['succeeded','failed'].includes(deepTask.status) || !githubToken)return;
    let stopped=false, polling=false;
    const timer=setInterval(()=>{if(polling)return;polling=true;pollDeepRead({repository,ref:branch,token:githubToken},deepTask).then(value=>{if(!stopped)setDeepTask(value);}).catch(e=>{if(!stopped)setError(errorMessage(e));}).finally(()=>{polling=false;});},10000);
    return ()=>{stopped=true;clearInterval(timer);};
  },[deepTask,githubToken,repository,branch]);
  const pending = useRef(false);
  const refreshTicket=useRef(0);
  useEffect(()=>{
    if(!detail || window.innerWidth > 1100)return;
    const previous=document.body.style.overflow;document.body.style.overflow='hidden';
    return ()=>{document.body.style.overflow=previous;};
  },[detail]);
  const [retry,setRetry] = useState(0);
  useEffect(()=>{ try { configureCloud(url,key); setCloudEpoch(v=>v+1); } catch(e) { setError(errorMessage(e)); } },[]);
  useEffect(()=>{
    const client = getClient(); if(!client) return;
    let stopped=false,authEvent=false;
    client.auth.getSession().then(({data,error})=>{if(stopped||authEvent||getClient()!==client)return;if(error)setError(error.message);else setSession(data.session);});
    const {data} = client.auth.onAuthStateChange((_event,value)=>{authEvent=true;if(!stopped&&getClient()===client)setSession(value);});
    return ()=>{stopped=true;data.subscription.unsubscribe();};
  },[cloudEpoch]);
  const refresh = useCallback(async()=>{
    if(!session) {setStates({}); return;}
    const captured=activeScope.current, ticket=++refreshTicket.current, cloud=getClient();
    try {const loaded=await loadStates(session.user.id);if(activeScope.current===captured&&ticket===refreshTicket.current&&getClient()===cloud){setStates(loaded);setStateScope(captured);}} catch(e){if(activeScope.current===captured&&ticket===refreshTicket.current&&getClient()===cloud)setError(errorMessage(e));}
  },[session,cloudEpoch]);
  useEffect(()=>{void refresh(); const handler=()=>void refresh(); window.addEventListener('focus',handler); return ()=>window.removeEventListener('focus',handler);},[refresh]);
  useEffect(()=>{
    const controller = new AbortController(); setLoading(true); setError('');
    catalog(controller.signal).then(data=>{setRuns([...data.runs,...(data.conferences||[]),...(data.topics||[])]);setRun(current=>current || data.runs[0]?.run_id || data.conferences?.[0]?.run_id || data.topics?.[0]?.run_id || ''); if(!data.runs.length)setLoading(false);if(data.migration?.unresolved_conference_routes?.length)setNotice(`${data.migration.unresolved_conference_routes.length} 篇历史会议论文缺少可核验身份，仍保留在旧版归档。`);}).catch(e=>{if(!controller.signal.aborted){setError(errorMessage(e));setLoading(false);}});
    return ()=>controller.abort();
  },[retry]);
  useEffect(()=>{
    if(!runs.length)return;
    const controller = new AbortController();setLoading(true);setError('');
    const all=view==='starred'||view==='archive'||run==='all';
    const item=runs.find(r=>r.run_id===run);
    const load=all?library(runs,controller.signal):item?feed(item.path,controller.signal).then(f=>f.papers):Promise.resolve([]);
    load.then(data=>{setPapers(data);setSelected(current=>data.some(p=>p.paper_key===current)?current:data[0]?.paper_key||'');setLoading(false);}).catch(e=>{if(!controller.signal.aborted){setPapers([]);setError(errorMessage(e));setLoading(false);}});
    return ()=>controller.abort();
  },[run,runs,view]);
  const visible = useMemo(()=>filterPapers(papers,states,view,query),[papers,states,view,query]);
  const current = visible.find(p=>p.paper_key===selected) || visible[0];
  useEffect(()=>installCitation(view==='manage'||view==='topics'?undefined:current),[current,view]);
  const [noteDrafts,setNoteDrafts]=useState<Record<string,NoteDraft>>({});
  const noteKey=(p:Paper)=>`${scope}:${p.paper_key}`;
  const personalNote=(p:Paper)=>noteDrafts[noteKey(p)]?.text??states[p.paper_key]?.note_text??'';
  useEffect(()=>{
    const dirty=Object.entries(noteDrafts).some(([key,draft])=>key.startsWith(scope+':')&&draft.text!==(states[key.slice(scope.length+1)]?.note_text??''));
    if(!dirty)return;const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};
    window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);
  },[noteDrafts,scope,states]);
  const state = current ? states[current.paper_key] || emptyState(current.paper_key) : null;
  const change = useCallback(async(p:Paper,patch:StatePatch)=>{
    if(!session){setSettings(true);setNotice('登录后即可保存阅读状态并在设备间同步。');return;}
    if(pending.current)return;
    const captured=activeScope.current;
    const cloud=getClient();refreshTicket.current++;
    pending.current=true;setBusy(true);setError('');
    try {const next=await saveState(session.user.id,p.paper_key,states[p.paper_key]?.revision || 0,patch);if(activeScope.current!==captured||getClient()!==cloud)return;refreshTicket.current++;setStateScope(captured);setStates(s=>({...s,[p.paper_key]:next}));if(patch.note_text!==undefined)setNoteDrafts(d=>{const key=`${captured}:${p.paper_key}`,draft=d[key];if(!draft)return d;const updated={...d};if(draft.text===(next.note_text??''))delete updated[key];else updated[key]={...draft,base:next.note_text??''};return updated;});setNotice('已同步到云端');}
    catch(e){if(activeScope.current===captured&&getClient()===cloud){setError(errorMessage(e));await refresh();}}
    finally{pending.current=false;setBusy(false);}
  },[session,states,refresh]);
  const openOriginal = useCallback((p:Paper)=>{const link=safeURL(p.pdf_url)||safeURL(p.url);if(link)window.open(link,'_blank','noopener,noreferrer');else setNotice('该论文尚无可核验原文链接');},[]);
  const download = (p:Paper)=>{const blob=new Blob([noteMarkdown(p,personalNote(p))],{type:'text/markdown;charset=utf-8'});const href=URL.createObjectURL(blob);const a=document.createElement('a');a.href=href;a.download=noteFilename(p)+'.md';a.click();setTimeout(()=>URL.revokeObjectURL(href),1000);};
  useEffect(()=>{
    const handler=(e:KeyboardEvent)=>{
      if(e.isComposing||e.ctrlKey||e.metaKey||e.altKey||editableTarget(e.target)||view==='manage'||settings||help||feedbackOpen||archiveConfirm||deepConfirm)return;
      if(e.key==='?'){setHelp(true);return;}
      if(!current)return;
      if(['j','k','s','x','o','Escape'].includes(e.key))e.preventDefault();
      const i=visible.findIndex(p=>p.paper_key===current.paper_key);
      if(e.key==='j'||e.key==='k')setSelected(visible[Math.max(0,Math.min(visible.length-1,i+(e.key==='j'?1:-1)))].paper_key);
      if(e.key==='s')void change(current,{starred:!state?.starred});
      if(e.key==='x')void change(current,{dismissed_at:state?.dismissed_at?null:new Date().toISOString()});
      if(e.key==='o')openOriginal(current);
      if(e.key==='d'&&!dispatching&&(!deepTask||['succeeded','failed'].includes(deepTask.status))){if(!githubToken)setSettings(true);else setDeepConfirm(true);}
      if(e.key==='Escape')setDetail(false);
    };
    window.addEventListener('keydown',handler);return()=>window.removeEventListener('keydown',handler);
  },[current,state,visible,change,openOriginal,settings,help,feedbackOpen,archiveConfirm,deepConfirm,githubToken,dispatching,deepTask,view]);
  useEffect(()=>{document.querySelector(`[data-paper-key="${CSS.escape(current?.paper_key || '')}"]`)?.scrollIntoView({block:'nearest'});},[current?.paper_key]);
  const high = papers.filter(p=>(p.score||0)>=8).length;
  const today = new Date().toLocaleDateString('sv-SE').replaceAll('-','');
  const displayDate = view==='starred'||view==='archive'||run==='all' ? '全部日期' : run.length===8 ? `${run.slice(0,4)}.${run.slice(4,6)}.${run.slice(6,8)}` : run.replace('-',' — ');
  const batchTargets = papers.filter(p=>{const s=states[p.paper_key]||emptyState(p.paper_key);return !s.read_at&&!s.starred&&!s.dismissed_at;});
  const [archiveUndo,setArchiveUndo]=useState<{scope:string;items:{paper_key:string;revision:number}[]}>({scope:'',items:[]});
  const undoItems=archiveUndo.scope===scope?archiveUndo.items:[];
  async function bulkArchive(){
    if(!session){setArchiveConfirm(false);setSettings(true);return;}
    if(pending.current)return;
    const captured=activeScope.current,cloud=getClient();
    const active=()=>activeScope.current===captured&&getClient()===cloud;
    refreshTicket.current++;
    setArchiveUndo({scope:captured,items:[]});
    setArchiveConfirm(false);setBusy(true);pending.current=true;
    let done=0;
    try {
      const result=await scopedBatch(batchTargets,active,
        p=>saveState(session.user.id,p.paper_key,states[p.paper_key]?.revision||0,{dismissed_at:new Date().toISOString()}),
        next=>{refreshTicket.current++;setStateScope(captured);setStates(s=>({...s,[next.paper_key]:next}));setArchiveUndo(s=>s.scope===captured?{...s,items:[...s.items,{paper_key:next.paper_key,revision:next.revision}]}:s);done++;});
      if(!result.stopped)setNotice(`已归档 ${done} 篇，可在已归档中恢复。`);
    }catch(e){if(active()){setError(`已完成 ${done} 篇，其余未变更。${errorMessage(e)}`);await refresh();}}
    finally{setBusy(false);pending.current=false;}
  }
  async function undoArchive(){
    if(!session||pending.current||!undoItems.length)return;
    const captured=activeScope.current,cloud=getClient();
    const active=()=>activeScope.current===captured&&getClient()===cloud;
    refreshTicket.current++;pending.current=true;setBusy(true);setError('');
    let done=0;
    try{
      const result=await scopedBatch(undoItems,active,
        item=>saveState(session.user.id,item.paper_key,item.revision,{dismissed_at:null}),
        next=>{refreshTicket.current++;setStateScope(captured);setStates(s=>({...s,[next.paper_key]:next}));setArchiveUndo(s=>s.scope===captured?{...s,items:s.items.filter(item=>item.paper_key!==next.paper_key)}:s);done++;});
      if(!result.stopped)setNotice(`已撤销 ${done} 篇归档。`);
    }catch(e){if(active()){setError(`已恢复 ${done} 篇；其余可能已在归档后修改，请在已归档中检查。${errorMessage(e)}`);await refresh();}}
    finally{pending.current=false;setBusy(false);}
  }
  return <div className="workspace">
    <aside className="navigation"><a className="brand" href="#"><span className="brand-icon">P<span>·</span></span><span>Paper Reader<small>把注意力留给好论文</small></span></a>
      <div className="nav-top-links"><button onClick={()=>setView('inbox')}>首页</button><a href="./legacy.html#/tutorial/README">教程</a><button onClick={()=>setFeedbackOpen(true)}>反馈</button></div>
      <div className="nav-label">工作空间</div><nav>{(Object.keys(labels) as View[]).map(v=><button key={v} className={view===v?'nav-item active':'nav-item'} onClick={()=>{setView(v);setDetail(false);}}><span className="nav-icon">{icons[v]}</span>{labels[v]}{v==='inbox'&&<span className="nav-count">{papers.filter(p=>!states[p.paper_key]?.dismissed_at).length}</span>}</button>)}</nav>
      <div className="nav-divider"/><div className="nav-label">资料与工具</div><a className="nav-item" href="./legacy.html">▧<span>历史阅读库</span></a><a className="nav-item" href="./legacy.html#/tutorial/README">◷<span>使用指南</span></a>
      <div className="nav-bottom"><div className="sync-note"><i className={session?'online':''}/>{session?'云端账户已连接':'访客浏览 · 登录后同步'}</div><button className="profile" onClick={()=>setSettings(true)}><span className="avatar">{session?'U':'G'}</span><span>{session?.user.user_metadata.user_name || '连接你的工作空间'}<small>账户与阅读偏好</small></span><span>⚙</span></button></div>
    </aside>
    <main className="main"><header className="topbar"><span className="topbar-motto">你的研究，每天向前一点。</span><div className="mobile-top-links"><button onClick={()=>setView('inbox')}>首页</button><a href="./legacy.html#/tutorial/README">教程</a><button onClick={()=>setFeedbackOpen(true)}>反馈</button></div><div><button className="quiet" onClick={()=>setHelp(true)}>快捷键 <kbd>?</kbd></button><button className="mobile-settings quiet" onClick={()=>setSettings(true)}>设置</button><a href="./legacy.html">旧版入口</a></div></header>
      <section className="heading"><div><div className="eyebrow">DAILY DISCOVERY</div><h1>{labels[view]}</h1><p>{view==='inbox'?'快速扫过，留下值得深读的想法。':view==='starred'?'你的下一份阅读清单。':view==='archive'?'已处理的论文，随时可以重新找回。':view==='manage'?'管理研究方向，运行可恢复的研究任务。':'按研究方向回看已有成果。'}</p></div><div className="issue-date"><span>{run===today?'TODAY':'HISTORY'}</span><strong>{displayDate || '暂无日报'}</strong></div></section>
      <div className="summary-strip"><span><b>{papers.length}</b> 篇推荐</span><span><b>{high}</b> 篇高相关</span><span><b>{papers.filter(p=>states[p.paper_key]?.starred).length}</b> 篇待精读</span><span className="summary-end">先发现，再深入</span></div>
      {error&&<div className="banner error" role="alert">{error}<button onClick={()=>setRetry(x=>x+1)}>重试读取</button></div>}
      {notice&&<div className="banner" role="status">{notice}<button aria-label="关闭提示" onClick={()=>setNotice('')}>×</button></div>}
      {view==='manage'?<Suspense fallback={<p>正在加载研究管理…</p>}><ManagementPanel key={`${repository}:${branch}`} config={{repository,ref:branch,token:githubToken}} configure={()=>setSettings(true)}/></Suspense>:view==='topics'?<TopicsPanel entries={runs.filter(r=>r.kind==='topic')} open={(id,key)=>{setRun(id);setView('inbox');if(key)setSelected(key);}}/>:<>
      <div className="toolbar"><label className="search"><span>⌕</span><input aria-label="搜索论文" placeholder="搜索标题、摘要或研究方向…" value={query} onChange={e=>setQuery(e.target.value)}/><kbd>/</kbd></label><select aria-label="推荐日期" disabled={view==='starred'||view==='archive'} value={view==='starred'||view==='archive'?'all':run} onChange={e=>setRun(e.target.value)}><option value="all">全部日期</option>{runs.map(r=><option key={r.run_id} value={r.run_id}>{r.title||r.run_id} · {r.count} 篇</option>)}</select><button className="quiet" disabled={busy||!batchTargets.length} onClick={()=>setArchiveConfirm(true)}>批量归档</button>{undoItems.length>0&&<button className="quiet" disabled={busy} onClick={()=>void undoArchive()}>撤销上次归档（{undoItems.length}）</button>}</div>
      <div className={'reading-layout'+(detail?' detail-open':'')}><section className="paper-list" aria-label="论文列表"><div className="list-caption"><span>{visible.length} 篇论文</span><span>按匹配得分排序</span></div>
        {loading?<div className="empty">正在读取论文…</div>:!visible.length?<div className="empty"><span className="empty-icon">▤</span><h2>{papers.length?'这里暂时没有论文':'尚无推荐数据'}</h2><p>{papers.length?'试试其他日期或筛选条件。':'运行每日流水线后，论文会出现在这里。'}</p></div>:visible.map(p=>{const s=states[p.paper_key]||emptyState(p.paper_key);return <article key={p.paper_key} data-paper-key={p.paper_key} className={'paper-card'+(current?.paper_key===p.paper_key?' selected':'')}>
          <button className="paper-select" onClick={()=>{setSelected(p.paper_key);setDetail(true);}} aria-label={`阅读 ${p.title}`}><div className="paper-meta"><span className="source">{p.source}</span><span>{citationDate(p)||'日期未核实'}</span>{s.read_at&&<span>已读</span>}{s.legacy_status&&['blue','orange'].includes(s.legacy_status)&&<span>{s.legacy_status==='blue'?'旧标记2':'旧标记3'}</span>}<span className="score">{p.score===null?'—':p.score.toFixed(1)}<small> 匹配</small></span></div><div className="card-body"><div><h2>{p.title_zh||p.title}</h2>{p.title_zh&&<p className="english-title">{p.title}</p>}<p className="tldr">{p.tldr||'暂无一句话速览，可查看原始摘要。'}</p></div><PaperThumbnail thumbnail={p.thumbnail}/></div></button>
          <footer className="card-footer"><div className="tags">{[...new Set(p.tags.map(t=>t.replace(/^(keyword|query):/,'')))].slice(0,3).map(t=><span key={t}>{t}</span>)}</div><div className="card-actions"><button title="收藏 (s)" aria-label={s.starred?'取消收藏':'收藏'} aria-pressed={s.starred} disabled={busy} onClick={()=>void change(p,{starred:!s.starred})}>{s.starred?'★':'☆'}</button><button title="归档 (x)" aria-label={s.dismissed_at?'恢复论文':'归档论文'} disabled={busy} onClick={()=>void change(p,{dismissed_at:s.dismissed_at?null:new Date().toISOString()})}>{s.dismissed_at?'↶':'✓'}</button></div></footer>
        </article>;})}</section>
        <aside className="preview" aria-label="论文预览">{current?<><div className="preview-top"><span>论文预览</span><button className="quiet close-preview" onClick={()=>setDetail(false)}>关闭</button><span className="preview-badge">{current.source}</span></div><div className="preview-content"><div className="eyebrow">值得多看一眼</div><h2>{current.title_zh||current.title}</h2><p className="authors">{current.authors?.join(', ') || '作者信息待补充'}</p><div className="preview-buttons"><button className="primary" onClick={()=>openOriginal(current)}>打开原文 <kbd>o</kbd></button><button disabled={busy} onClick={()=>void change(current,{starred:!state?.starred})}>{state?.starred?'★ 已收藏':'☆ 待精读'}</button></div><section className="insight"><h3>核心亮点</h3><p>{current.tldr||'尚未生成速览。请以原始摘要为准。'}</p></section><h3>为什么推荐</h3><p className="reason">{current.reason||'暂无推荐理由'}</p><div className="feedback"><span>这个推荐对你有帮助吗？</span><button aria-label="推荐有帮助" aria-pressed={state?.feedback===1} disabled={busy} onClick={()=>void change(current,{feedback:state?.feedback===1?0:1})}>＋</button><button aria-label="不感兴趣" aria-pressed={state?.feedback===-1} disabled={busy} onClick={()=>void change(current,{feedback:state?.feedback===-1?0:-1})}>−</button></div><h3>三点速览</h3><dl className="breakdown">{([['problem','研究问题'],['method','核心方法'],['results','实验结果']] as const).map(([field,label])=><div key={field}><dt>{label}</dt><dd>{current.breakdown?.[field]||'待生成 · 暂无可核验内容'}</dd></div>)}</dl><details open><summary>原始摘要</summary><p className="abstract">{current.abstract||'摘要缺失，请打开原文。'}</p></details><ChatPanel key={current.paper_key} paper={current} config={{endpoint:chatEndpoint,model:chatModel,apiKey:chatKey}} configure={()=>{setSettings(true);setNotice('请在设置中配置聊天模型与 API Key。');}}/><ReadingMaterial key={current.paper_key} paper={current} personalNote={personalNote(current)}/><h3>自动精读（可选 API）</h3><p className="muted">仅此篇：读取指定版本全文，用已配置的精读模型生成带原文证据的 Obsidian 笔记。</p><button className="primary" disabled={dispatching||current.source!=='arxiv'||!!deepTask&&!['succeeded','failed'].includes(deepTask.status)} onClick={()=>{if(!githubToken){setSettings(true);setNotice('请先配置 GitHub 任务权限。');}else setDeepConfirm(true);}}>强模型精读 <kbd>d</kbd></button><button disabled={dispatching||current.source!=='arxiv'||!!deepTask&&!['succeeded','failed'].includes(deepTask.status)} onClick={()=>void recoverTask(current)}>恢复这篇的精读任务</button>{deepTask&&deepTask.paperId===current.original_id&&<div className="task-status" role="status"><p>{{queued:'已提交，等待启动',running:'正在读取全文并生成笔记',succeeded:'精读任务完成，可下载笔记',failed:'精读任务失败'}[deepTask.status]}</p>{deepTask.error&&<p>{deepTask.error}</p>}{safeURL(deepTask.url)&&<a href={safeURL(deepTask.url)} target="_blank" rel="noreferrer">查看运行与下载笔记</a>}</div>}<NoteEditor saved={state?.note_text??''} draft={noteDrafts[noteKey(current)]} edit={draft=>setNoteDrafts(d=>({...d,[noteKey(current)]:draft}))} discard={()=>setNoteDrafts(d=>{const next={...d};delete next[noteKey(current)];return next;})} save={()=>{if(!session)download(current);void change(current,{note_text:personalNote(current)});}} busy={busy} loggedIn={!!session}/><h3>知识库</h3><p className="muted">仅导出你选中的论文，不自动收录整个日报。</p><div className="export-actions"><button onClick={()=>downloadCitation(current)}>下载 BibTeX</button><button onClick={()=>download(current)}>下载 Markdown</button><button onClick={()=>{if(!vault){setSettings(true);setNotice('先设置 Obsidian vault 名称。');return;}let uri:string|null;try{uri=obsidianURI(current,vault,personalNote(current),inboxFolder);}catch(e){setError(errorMessage(e));setSettings(true);return;}if(!uri){download(current);setNotice('笔记较长，已下载 Markdown，请导入 Obsidian。');return;}window.location.href=uri;}}>发送到 Obsidian</button></div><button className="read-toggle" disabled={busy} onClick={()=>void change(current,{read_at:state?.read_at?null:new Date().toISOString()})}>{state?.read_at?'标记为未读':'标记为已读'}</button></div></>:<div className="empty">选择一篇论文开始阅读</div>}</aside>
      </div></>}
      <footer className="workspace-footer"><span>DAILY PAPER READER</span><span><kbd>j</kbd><kbd>k</kbd> 切换 <kbd>s</kbd> 收藏 <kbd>x</kbd> 归档</span></footer>
    </main>
    {feedbackOpen&&<Modal title="项目反馈" close={()=>setFeedbackOpen(false)}><FeedbackForm/></Modal>}
    {settings&&<Modal title="连接你的工作空间" close={()=>setSettings(false)}><p>使用 Supabase 账户保存阅读状态；公开浏览无需登录。</p>{error&&<p role="alert" className="banner error">{error}</p>}{notice&&<p role="status">{notice}</p>}<label>Supabase URL<input value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://your-project.supabase.co"/></label><label>Publishable / anon key<input value={key} onChange={e=>setKey(e.target.value)} placeholder="sb_publishable_…"/></label><button className="primary" onClick={()=>{try{configureCloud(url,key);setError('');setSession(null);setStates({});setStateScope('');refreshTicket.current++;localStorage.setItem('dpr.cloud.url',url);localStorage.setItem('dpr.cloud.key',key);setCloudEpoch(x=>x+1);setNotice('连接配置已保存');}catch(e){setError(errorMessage(e));}}}>保存连接配置</button><AccountLogin key={cloudEpoch} draftURL={url} draftKey={key} connectLocal={(nextURL,nextKey)=>{configureCloud(nextURL,nextKey);setUrl(nextURL);setKey(nextKey);setSession(null);setStates({});setStateScope('');refreshTicket.current++;localStorage.setItem('dpr.cloud.url',nextURL);localStorage.setItem('dpr.cloud.key',nextKey);setCloudEpoch(x=>x+1);setNotice('已连接独立本地测试库，请使用邮箱注册或登录。');}}/>{session&&<button onClick={async()=>{await getClient()?.auth.signOut();setSession(null);setStates({});}}>退出登录</button>}<hr/><MigrationPanel key={scope} runs={runs} states={states} userId={session?.user.id} refresh={refresh}/><hr/><h3>论文聊天</h3><label>模型端点<input value={chatEndpoint} onChange={e=>setChatEndpoint(e.target.value)} placeholder="https://api.example.com/v1"/></label><label>聊天模型<input value={chatModel} onChange={e=>setChatModel(e.target.value)}/></label><label>聊天 API Key（仅当前页面）<input type="password" autoComplete="off" value={chatKey} onChange={e=>setChatKey(e.target.value)}/></label><button onClick={()=>{localStorage.setItem('dpr.chat.endpoint',chatEndpoint);localStorage.setItem('dpr.chat.model',chatModel);setNotice('聊天设置已保存；API Key 仅保留在当前页面内存。');}}>保存聊天设置</button><hr/><h3>按需精读任务</h3><DeepReadSetup repository={repository}/><p className="muted">模型密钥只放在 Actions Secrets：DEEP_READ_API_KEY / MODEL / BASE_URL。Token 仅保留在当前页面内存。</p><label>GitHub 仓库<input value={repository} onChange={e=>setRepository(e.target.value)} placeholder="owner/daily-paper-reader"/></label><label>任务分支<input value={branch} onChange={e=>setBranch(e.target.value)}/></label><label>GitHub Token（Actions 读写）<input type="password" autoComplete="off" value={githubToken} onChange={e=>setGithubToken(e.target.value)}/></label><button onClick={()=>{localStorage.setItem('dpr.github.repository',repository);localStorage.setItem('dpr.github.ref',branch);setNotice('任务设置已保存；Token 在关闭页面后清除。');}}>保存任务设置</button><hr/><label>Obsidian vault 名称<input value={vault} onChange={e=>setVault(e.target.value)} placeholder="My Research"/></label><label>Obsidian 收件箱目录<input aria-label="Obsidian 收件箱目录" value={inboxFolder} onChange={e=>setInboxFolder(e.target.value)} placeholder="Inbox（可改为 Papers/Inbox）"/></label><p className="muted">填写 vault 内的相对目录，留空放在根目录。此处用于“发送到 Obsidian”；Actions 自动同步目录由 OBSIDIAN_NOTES_FOLDER 配置。</p><button onClick={()=>{try{const folder=obsidianFolder(inboxFolder);localStorage.setItem('dpr.obsidian.vault',vault);localStorage.setItem('dpr.obsidian.folder',folder);setInboxFolder(folder);setError('');setNotice('Obsidian 设置已保存');setSettings(false);}catch(e){setError(errorMessage(e));}}}>保存阅读偏好</button><p className="muted">账户公钥和 vault 名称保存在此设备。论文状态由云端保存。</p></Modal>}
    {deepConfirm&&current&&<Modal title="生成这篇论文的深度笔记" close={()=>setDeepConfirm(false)}><p>{current.title}</p><p>指定版本：{current.original_id}。此操作会调用 Actions 中配置的强模型并产生费用；缓存命中时复用结果。长文会分段提取证据后合成，最多12段加1次合成调用；费用取决于模型定价和实际用量。缓存命中不重复调用，超出总预算或证据校验失败会停止，不会自动改用摘要。</p><button className="primary" disabled={dispatching} onClick={async()=>{setDispatching(true);try{const task=await dispatchDeepRead({repository,ref:branch,token:githubToken},current.original_id);setDeepTask(task);setDeepConfirm(false);setNotice('精读请求已提交。任务完成后可下载 Markdown 笔记。');}catch(e){setError(errorMessage(e));setDeepConfirm(false);}finally{setDispatching(false);}}}>确认调用强模型</button></Modal>}
    {help&&<Modal title="让阅读更顺手" close={()=>setHelp(false)}><dl className="shortcuts">{[['j / k','下一篇 / 上一篇'],['s','收藏或取消收藏'],['x','归档或恢复'],['o','打开原文'],['d','按需精读'],['?','查看快捷键']].map(([k,v])=><div key={k}><dt><kbd>{k}</kbd></dt><dd>{v}</dd></div>)}</dl><p>输入文字时不会触发快捷键。</p></Modal>}
    {archiveConfirm&&<Modal title="归档当前日期的未读论文" close={()=>setArchiveConfirm(false)}><p>将归档 {displayDate} 的 {batchTargets.length} 篇未读论文。已收藏的论文会保留，之后可从“已归档”逐篇恢复。</p><button className="primary" onClick={()=>void bulkArchive()}>归档 {batchTargets.length} 篇</button></Modal>}
  </div>;
}
function Modal({title,close,children}:{title:string;close:()=>void;children:React.ReactNode}){
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{ref.current?.showModal();return()=>ref.current?.close();},[]);
  return <dialog ref={ref} className="modal" onCancel={close} onClick={event=>{if(event.target!==ref.current)return;const r=ref.current.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)close();}}><div className="modal-heading"><h2>{title}</h2><button onClick={close} aria-label="关闭对话框">×</button></div>{children}</dialog>;
}

if (location.hash.startsWith('#/')) {
  location.replace(new URL('./legacy.html', location.href).href + location.hash);
} else {
  createRoot(document.getElementById('root')!).render(<App/>);
}
