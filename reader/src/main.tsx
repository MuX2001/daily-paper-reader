import {Guide} from './Guide';
import {t as uiText} from './i18n/messages.ts';
import {LanguageSwitch,useLanguage} from './i18n/LanguageProvider';
import type {ChatMessage} from './chat';
import {ReadingProgress} from './ReadingProgress';
import {ArchiveIcon,StarButton} from './PaperActions';
import {cardHook,displayTitle,runLabel} from './presentation';
import {readingMaterial,readingPrompt} from './readingMaterial';
import {MinMaxCard} from './MinMaxCard';
import {errorMessage} from './errors';
import React, { useCallback, useEffect, useMemo, useRef, useState, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import type { Session } from '@supabase/supabase-js';
import { catalog, feed, library, configureCloud, getClient, matchesCloudConfiguration, loadStates, saveState } from './api';
import { editableTarget, emptyState, filterPapers, safeURL, type Catalog, type Paper, type PaperState, type StatePatch, type View } from './domain';
import './style.css';
import {ReadingMaterial} from './ReadingMaterial';
import {SettingsDialog} from './settings/SettingsDialog';
import {readSetting,rememberedSecrets,exportPreferences,storeValues,saveSecrets,type SettingsConfig,type SettingsTab} from './settings/config';
import {PaperThumbnail} from './PaperThumbnail';
import {FeedbackForm} from './FeedbackForm';
import {NoteEditor,type NoteDraft} from './NoteEditor';
import {noteMarkdown,exportFilename,obsidianURI,obsidianFolder} from './notes';
import {scopedBatch} from './scopedBatch';
import {installCitation,downloadCitation,citationDate} from './citation';
const ManagementPanel=lazy(()=>import('./ManagementPanel').then(module=>({default:module.ManagementPanel})));
import { TopicsPanel } from './TopicsPanel';
import { ChatPanel } from './ChatPanel';

const labels: Record<View,string> = {inbox:'论文收件箱',starred:'待精读',topics:'专题包',archive:'已归档',manage:'研究管理'};
const icons: Record<View,string> = {inbox:'▤',starred:'☆',topics:'▦',archive:'▱',manage:'⚙'};
function App() {
  const [runs,setRuns] = useState<Catalog['runs']>([]), [run,setRun] = useState('');
  const [papers,setPapers] = useState<Paper[]>([]), [storedStates,setStates] = useState<Record<string,PaperState>>({});
  const [guide,setGuide]=useState(()=>location.hash==='#guide');
  const searchInput=useRef<HTMLInputElement>(null);
  useEffect(()=>{
    const navigate=()=>{setGuide(location.hash==='#guide');setMenuOpen(false);setChatOpen(false);setDetail(false);};
    window.addEventListener('hashchange',navigate);
    return ()=>window.removeEventListener('hashchange',navigate);
  },[]);
  const [view,setView] = useState<View>('inbox'), [query,setQuery] = useState(''), [selected,setSelected] = useState('');
  const [loading,setLoading] = useState(true), [error,setError] = useState(''), [notice,setNotice] = useState('');
  const [menuOpen,setMenuOpen]=useState(false);
  const [collapsed,setCollapsed]=useState(()=>window.innerWidth<1280);
  const [chatOpen,setChatOpen]=useState(false);
  const lang=useLanguage();
  useEffect(()=>{document.documentElement.lang=lang;},[lang]);
  const [narrow,setNarrow]=useState(()=>window.innerWidth<1600);
  useEffect(()=>{const media=matchMedia('(max-width:1599px)');const change=()=>setNarrow(media.matches);media.addEventListener('change',change);return ()=>media.removeEventListener('change',change);},[]);
  const [histories,setHistories]=useState<Record<string,ChatMessage[]>>({});
  const [feedbackOpen,setFeedbackOpen]=useState(false);
  const [settingsTab,setSettingsTab]=useState<SettingsTab>('account');
  const [settings,setSettings] = useState(false), [help,setHelp] = useState(false), [detail,setDetail] = useState(false);
  const [url,setUrl] = useState(readSetting('dpr.cloud.url') || ''), [key,setKey] = useState(readSetting('dpr.cloud.key') || '');
  const [session,setSession] = useState<Session|null>(null), [cloudEpoch,setCloudEpoch] = useState(0), [busy,setBusy] = useState(false);
  const [stateScope,setStateScope]=useState('');
  const scope=`${cloudEpoch}:${session?.user.id||''}`;
  const activeScope=useRef(scope);activeScope.current=scope;
  const states=stateScope===scope?storedStates:{};
  const [vault,setVault] = useState(readSetting('dpr.obsidian.vault') || '');
  const [inboxFolder,setInboxFolder]=useState(readSetting('dpr.obsidian.folder')??'Inbox');
  const [archiveConfirm,setArchiveConfirm] = useState(false);
  const [repository,setRepository]=useState(readSetting('dpr.github.repository')||'');
  const [branch,setBranch]=useState(readSetting('dpr.github.ref')||'dev');
  const [rememberChat,setRememberChat]=useState(()=>rememberedSecrets().rememberChat),[rememberGithub,setRememberGithub]=useState(()=>rememberedSecrets().rememberGithub);
  const [exportPrefs,setExportPrefs]=useState(()=>exportPreferences());
  const [syncStatus,setSyncStatus]=useState('idle'),[syncTime,setSyncTime]=useState('');
  const [githubToken,setGithubToken]=useState(()=>rememberedSecrets().token);
  const [chatEndpoint,setChatEndpoint]=useState(readSetting('dpr.chat.endpoint')||'https://api.deepseek.com/v1');
  const [chatModel,setChatModel]=useState(readSetting('dpr.chat.model')||'');
  const [chatKey,setChatKey]=useState(()=>rememberedSecrets().apiKey);
  const pending = useRef(false);
  const refreshTicket=useRef(0);
  useEffect(()=>{
    if(!detail || window.innerWidth >= 1024)return;
    const previous=document.body.style.overflow;document.body.style.overflow='hidden';
    return ()=>{document.body.style.overflow=previous;};
  },[detail]);
  useEffect(()=>{setHistories({});},[scope]);
  const [retry,setRetry] = useState(0);
  useEffect(()=>{ try { configureCloud(url,key); setCloudEpoch(v=>v+1); } catch(e) { setError(errorMessage(e)); } },[]);
  const settingsConfig:SettingsConfig={url,key,endpoint:chatEndpoint,model:chatModel,apiKey:chatKey,repository,branch,token:githubToken,vault,folder:inboxFolder,...exportPrefs,rememberChat,rememberGithub};
  async function saveSettings(tab:SettingsTab,c:SettingsConfig){
    if(tab==='account'){
      storeValues({'dpr.cloud.url':c.url,'dpr.cloud.key':c.key});
      if(!matchesCloudConfiguration(c.url,c.key)){configureCloud(c.url,c.key);setSession(null);setStates({});setStateScope('');refreshTicket.current++;setSyncStatus('idle');setSyncTime('');setCloudEpoch(x=>x+1);}
      setUrl(c.url);setKey(c.key);
    }else if(tab==='chat'){
      storeValues({'dpr.chat.endpoint':c.endpoint,'dpr.chat.model':c.model,'dpr.chat.api_key':c.rememberChat?c.apiKey:null,'dpr.settings.remember_secrets':JSON.stringify({chat:c.rememberChat,github:rememberGithub})});
      setChatEndpoint(c.endpoint);setChatModel(c.model);setChatKey(c.apiKey);setRememberChat(c.rememberChat);
    }else if(tab==='deep'){
      storeValues({'dpr.github.repository':c.repository,'dpr.github.ref':c.branch,'dpr.github.token':c.rememberGithub?c.token:null,'dpr.settings.remember_secrets':JSON.stringify({chat:rememberChat,github:c.rememberGithub})});
      setRepository(c.repository);setBranch(c.branch);setGithubToken(c.token);setRememberGithub(c.rememberGithub);
    }else if(tab==='export'){
      storeValues({'dpr.obsidian.vault':c.vault,'dpr.obsidian.folder':c.folder,'dpr.settings.export_mode':c.exportMode,'dpr.obsidian.naming':c.naming});
      setVault(c.vault);setInboxFolder(c.folder);setExportPrefs({exportMode:c.exportMode,naming:c.naming});
    }
  }
  function forgetSecret(kind:'chat'|'github'){
    saveSecrets(kind==='chat'?false:rememberChat,kind==='github'?false:rememberGithub,chatKey,githubToken);
    if(kind==='chat')setRememberChat(false);else setRememberGithub(false);
  }
  function clearSecrets(){saveSecrets(false,false,'','');setChatKey('');setGithubToken('');setRememberChat(false);setRememberGithub(false);}
  useEffect(()=>{
    const client = getClient(); if(!client) return;
    let stopped=false,authEvent=false;
    client.auth.getSession().then(({data,error})=>{if(stopped||authEvent||getClient()!==client)return;if(error)setError(error.message);else setSession(data.session);});
    const {data} = client.auth.onAuthStateChange((_event,value)=>{authEvent=true;if(!stopped&&getClient()===client)setSession(value);});
    return ()=>{stopped=true;data.subscription.unsubscribe();};
  },[cloudEpoch]);
  const refresh = useCallback(async()=>{
    if(!session) {setStates({});setSyncStatus('idle');setSyncTime('');return;}
    const captured=activeScope.current, ticket=++refreshTicket.current, cloud=getClient();setSyncStatus('syncing');
    try {const loaded=await loadStates(session.user.id);if(activeScope.current===captured&&ticket===refreshTicket.current&&getClient()===cloud){setStates(loaded);setStateScope(captured);setSyncStatus('synced');setSyncTime(new Date().toISOString());}} catch(e){if(activeScope.current===captured&&ticket===refreshTicket.current&&getClient()===cloud){setSyncStatus('failed');setError(errorMessage(e));}throw e;}
  },[session,cloudEpoch]);
  useEffect(()=>{void refresh().catch(()=>{}); const handler=()=>void refresh().catch(()=>{}); window.addEventListener('focus',handler); return ()=>window.removeEventListener('focus',handler);},[refresh]);
  useEffect(()=>{
    const controller = new AbortController(); setLoading(true); setError('');
    catalog(controller.signal).then(data=>{setRuns([...data.runs,...(data.conferences||[]),...(data.topics||[])]);setRun(current=>current || data.runs[0]?.run_id || data.conferences?.[0]?.run_id || data.topics?.[0]?.run_id || ''); if(!data.runs.length)setLoading(false);if(data.migration?.unresolved_conference_routes?.length)setNotice(uiText("{0} 篇历史会议论文缺少可核验身份，仍保留在旧版归档。", data.migration.unresolved_conference_routes.length));}).catch(e=>{if(!controller.signal.aborted){setError(errorMessage(e));setLoading(false);}});
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
  useEffect(()=>installCitation(guide||view==='manage'||view==='topics'?undefined:current),[current,view,guide]);
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
    if(!session){setSettingsTab('account');setSettings(true);setNotice(uiText("登录后即可保存阅读状态并在设备间同步。"));return;}
    if(pending.current)return;
    const captured=activeScope.current;
    const cloud=getClient();refreshTicket.current++;
    pending.current=true;setBusy(true);setError('');
    try {const next=await saveState(session.user.id,p.paper_key,states[p.paper_key]?.revision || 0,patch);if(activeScope.current!==captured||getClient()!==cloud)return;refreshTicket.current++;setStateScope(captured);setStates(s=>({...s,[p.paper_key]:next}));if(patch.note_text!==undefined)setNoteDrafts(d=>{const key=`${captured}:${p.paper_key}`,draft=d[key];if(!draft)return d;const updated={...d};if(draft.text===(next.note_text??''))delete updated[key];else updated[key]={...draft,base:next.note_text??''};return updated;});setSyncStatus('synced');setSyncTime(new Date().toISOString());setNotice(uiText("已同步到云端"));}
    catch(e){if(activeScope.current===captured&&getClient()===cloud){setError(errorMessage(e));await refresh().catch(()=>{});}}
    finally{pending.current=false;setBusy(false);}
  },[session,states,refresh]);
  const openOriginal = useCallback((p:Paper)=>{const link=safeURL(p.pdf_url)||safeURL(p.url);if(link)window.open(link,'_blank','noopener,noreferrer');else setNotice(uiText("该论文尚无可核验原文链接"));},[]);
  async function downloadPDF(p:Paper){
    const url=safeURL(p.pdf_url);
    if(!url)return;
    try{
      const response=await fetch(url);
      if(!response.ok)throw new Error(String(response.status));
      const blob=await response.blob();
      if(await blob.slice(0,5).text()!=='%PDF-')throw new Error(uiText("未返回 PDF"));
      const href=URL.createObjectURL(blob),link=document.createElement('a');
      link.href=href;link.download=p.original_id.replaceAll('/','-')+'.pdf';link.click();
      setTimeout(()=>URL.revokeObjectURL(href),30000);
    }catch{setNotice(uiText("无法从本站下载此 PDF。请点「预览」，在原文工具栏下载。"));}
  }
  const download = (p:Paper)=>{const blob=new Blob([noteMarkdown(p,personalNote(p))],{type:'text/markdown;charset=utf-8'});const href=URL.createObjectURL(blob);const a=document.createElement('a');a.href=href;a.download=exportFilename(p,exportPrefs.naming)+'.md';a.click();setTimeout(()=>URL.revokeObjectURL(href),1000);};
  async function copyReading(p:Paper){try{await navigator.clipboard.writeText(readingMaterial(p,personalNote(p),readSetting(`dpr.reading.prompt.${p.paper_key}`)||readingPrompt(p)));setNotice(uiText("精读包已复制，请同时附上对应版本的 PDF。"));}catch{setError(uiText("无法访问剪贴板，请检查浏览器权限。"));}}
  useEffect(()=>{
    const handler=(e:KeyboardEvent)=>{
      if(chatOpen&&e.key==="Escape"&&!document.querySelector("dialog[open]")){e.preventDefault();setChatOpen(false);return;}
      if(document.querySelector('dialog[open]')||e.isComposing||e.ctrlKey||e.metaKey||e.altKey||editableTarget(e.target)||view==='manage'||guide||settings||help||feedbackOpen||archiveConfirm)return;
      if(e.key==='?'){setHelp(true);return;}
      if(e.key==='/'&&searchInput.current){e.preventDefault();searchInput.current.focus();return;}
      if(!current)return;
      if(['j','k','s','x','o','Escape'].includes(e.key))e.preventDefault();
      const i=visible.findIndex(p=>p.paper_key===current.paper_key);
      if(e.key==='j'||e.key==='k')setSelected(visible[Math.max(0,Math.min(visible.length-1,i+(e.key==='j'?1:-1)))].paper_key);
      if(e.key==='c'){e.preventDefault();setChatOpen(v=>!v);}
      if(e.key==='s')void change(current,{starred:!state?.starred});
      if(e.key==='x')void change(current,{dismissed_at:state?.dismissed_at?null:new Date().toISOString()});
      if(e.key==='o')openOriginal(current);
      if(e.key==='Escape')setDetail(false);
    };
    window.addEventListener('keydown',handler);return()=>window.removeEventListener('keydown',handler);
  },[current,state,visible,change,openOriginal,settings,help,feedbackOpen,archiveConfirm,githubToken,view,chatOpen,guide]);
  useEffect(()=>{document.querySelector(`[data-paper-key="${CSS.escape(current?.paper_key || '')}"]`)?.scrollIntoView({block:'nearest'});},[current?.paper_key]);
  const high = papers.filter(p=>(p.score||0)>=8).length;
  const displayDate = view==='starred'||view==='archive'||run==='all' ? uiText("全部日期") : run.length===8 && lang==='en'?run.slice(0,4)+'-'+run.slice(4,6)+'-'+run.slice(6):run.length===8 ? `${run.slice(0,4)}.${run.slice(4,6)}.${run.slice(6,8)}` : run.replace('-',' — ');
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
      if(!result.stopped)setNotice(uiText("已归档 {0} 篇，可在已归档中恢复。", done));
    }catch(e){if(active()){setError(uiText("已完成 {0} 篇，其余未变更。{1}", done, errorMessage(e)));await refresh().catch(()=>{});}}
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
      if(!result.stopped)setNotice(uiText("已撤销 {0} 篇归档。", done));
    }catch(e){if(active()){setError(uiText("已恢复 {0} 篇；其余可能已在归档后修改，请在已归档中检查。{1}", done, errorMessage(e)));await refresh().catch(()=>{});}}
    finally{pending.current=false;setBusy(false);}
  }
  const showChat=!guide&&!!current&&chatOpen&&view!=='manage'&&view!=='topics';
  const bilingual=(p:Paper)=>lang==='zh'&&p.title_zh&&displayTitle(p.title_zh)!==displayTitle(p.title);
  return <div className={"workspace"+(showChat?" split-open":"")+((collapsed||(showChat&&narrow))?" nav-collapsed":"")+(menuOpen?" menu-open":"")}>
    <aside className="navigation"><button className="nav-collapse" disabled={showChat&&narrow} title={collapsed?uiText("展开导航"):uiText("折叠导航")} aria-expanded={!collapsed} onClick={()=>setCollapsed(!collapsed)}>{collapsed?"»":"«"}</button><a className="brand" href="#"><span className="brand-icon">P<span>·</span></span><span>Paper Reader<small>{uiText("把注意力留给好论文")}</small></span></a>

      <div className="nav-label">{uiText("工作空间")}</div><nav>{(Object.keys(labels) as View[]).map(v=><button key={v} title={uiText(labels[v])} className={!guide&&view===v?'nav-item active':'nav-item'} onClick={()=>{if(guide)location.hash='';setChatOpen(false);setView(v);setDetail(false);setMenuOpen(false);}}><span className="nav-icon">{v==='archive'?<ArchiveIcon/>:icons[v]}</span><span className="nav-text">{uiText(labels[v])}</span>{v==='inbox'&&<span className="nav-count">{papers.filter(p=>!states[p.paper_key]?.dismissed_at).length}</span>}</button>)}</nav>
      <div className="nav-divider"/><div className="nav-label">{uiText("资料与工具")}</div><a className="nav-item" href="./legacy.html">▧<span>{uiText("历史阅读库")}</span></a><a title={uiText("使用指南")} aria-current={guide?"page":undefined} className={guide?"nav-item active":"nav-item"} href="#guide">◷<span>{uiText("使用指南")}</span></a>
      <div className="nav-bottom"><ReadingProgress batch={papers} runs={runs} states={states}/><div className="sync-note"><i className={session?'online':''}/>{session?uiText("云端账户已连接"):uiText("访客浏览 · 登录后同步")}</div><button className="profile" onClick={()=>{setSettingsTab('account');setSettings(true);}}><span className="avatar">{session?'U':'G'}</span><span>{session?.user.user_metadata.user_name || uiText("工作台设置")}<small>{uiText("账户与阅读偏好")}</small></span><span>⚙</span></button></div>
    </aside>
    <main className="main"><header className="topbar workspace-heading"><div className="heading-main"><button className="menu-toggle" aria-label={uiText("导航菜单")} aria-expanded={menuOpen} onClick={()=>setMenuOpen(!menuOpen)}>☰</button><h1>{uiText(guide?"使用指南":labels[view])}</h1>{!guide&&<div className="summary-strip"><span><b>{papers.length}</b> {uiText("篇推荐")}</span><span><b>{high}</b> {uiText("篇高相关")}</span><span><b>{papers.filter(p=>states[p.paper_key]?.starred&&!states[p.paper_key]?.dismissed_at).length}</b> {uiText("篇待精读")}</span></div>}</div><div className="workspace-tools"><a className="mobile-guide" href="#guide">{uiText("使用指南")}</a><LanguageSwitch/><time>{displayDate || uiText("暂无日报")}</time><button className="quiet" onClick={()=>setHelp(true)}>{uiText("快捷键")} <kbd>?</kbd></button><button className="mobile-settings quiet" onClick={()=>{setSettingsTab('account');setSettings(true);}}>{uiText("设置")}</button></div></header>
      {error&&<div className="banner error" role="alert">{error}<button onClick={()=>setRetry(x=>x+1)}>{uiText("重试读取")}</button></div>}
      {notice&&<div className="banner" role="status">{notice}<button aria-label={uiText("关闭提示")} onClick={()=>setNotice('')}>×</button></div>}
      {guide?<Guide openSettings={()=>{setSettingsTab('account');setSettings(true);}}/>:view==='manage'?<Suspense fallback={<p>{uiText("正在加载研究管理…")}</p>}><ManagementPanel key={`${repository}:${branch}`} config={{repository,ref:branch,token:githubToken}} configure={()=>{setSettingsTab('deep');setSettings(true);}}/></Suspense>:view==='topics'?<TopicsPanel entries={runs.filter(r=>r.kind==='topic')} open={(id,key)=>{setRun(id);setView('inbox');if(key)setSelected(key);}}/>:<>
      <div className="toolbar"><label className="search"><span>⌕</span><input ref={searchInput} aria-label={uiText("搜索论文")} placeholder={uiText("搜索标题、摘要或研究方向…")} value={query} onChange={e=>setQuery(e.target.value)}/><kbd>/</kbd></label><select title={runs.find(r=>r.run_id===run)?.title||displayDate} aria-label={uiText("推荐日期")} disabled={view==='starred'||view==='archive'} value={view==='starred'||view==='archive'?'all':run} onChange={e=>setRun(e.target.value)}><option value="all">{uiText("全部日期")}</option>{runs.map(r=><option key={r.run_id} value={r.run_id}>{runLabel(r)}</option>)}</select><button className="quiet" disabled={busy||!batchTargets.length} onClick={()=>setArchiveConfirm(true)}>{uiText("批量归档")}</button>{undoItems.length>0&&<button className="quiet" disabled={busy} onClick={()=>void undoArchive()}>{uiText("撤销上次归档（")}{undoItems.length}）</button>}</div>
      <div className={'reading-layout'+(detail?' detail-open':'')}><section className="paper-list" aria-label={uiText("论文列表")}><div className="list-caption"><span>{visible.length} {uiText("篇论文")}</span><span>{uiText("按匹配得分排序")}</span></div>
        {loading?<div className="empty">{uiText("正在读取论文…")}</div>:!visible.length?<div className="empty"><span className="empty-icon">▤</span><h2>{papers.length?uiText("这里暂时没有论文"):uiText("尚无推荐数据")}</h2><p>{papers.length?uiText("试试其他日期或筛选条件。"):uiText("运行每日流水线后，论文会出现在这里。")}</p></div>:visible.map(p=>{const s=states[p.paper_key]||emptyState(p.paper_key);return <article key={p.paper_key} data-paper-key={p.paper_key} className={'paper-card'+(current?.paper_key===p.paper_key?' selected':'')}>
          <button className="paper-select" onClick={()=>{setSelected(p.paper_key);setDetail(true);}} aria-label={uiText("阅读 {0}", p.title)}><div className="paper-meta"><span className="source">{p.source}</span><span>{citationDate(p)}</span>{s.read_at&&<span>{uiText("已读")}</span>}{s.legacy_status&&['blue','orange'].includes(s.legacy_status)&&<span>{s.legacy_status==='blue'?uiText("旧标记2"):uiText("旧标记3")}</span>}{p.score!=null&&<span className="score">{p.score.toFixed(1)}</span>}</div><div className="card-body"><div><h2>{displayTitle(bilingual(p)?p.title_zh!:p.title)}</h2>{bilingual(p)&&<p className="english-title">{displayTitle(p.title)}</p>}<p className="tldr" title={cardHook(p)||undefined}>{cardHook(p)}</p></div></div></button>
          <footer className="card-footer"><div className="tags">{[...new Set((p.narrative?.tags||p.tags).map(t=>t.replace(/^(keyword|query):/,'')))].slice(0,2).map(t=><span key={t}>{t}</span>)}</div><div className="card-actions"><StarButton compact starred={s.starred} busy={busy} onClick={()=>void change(p,{starred:!s.starred})}/><button title={s.dismissed_at?uiText("恢复 (x)"):uiText("归档 (x)")} aria-label={s.dismissed_at?uiText("恢复论文"):uiText("归档论文")} disabled={busy} onClick={()=>void change(p,{dismissed_at:s.dismissed_at?null:new Date().toISOString()})}>{s.dismissed_at?'↶':<ArchiveIcon/>}</button></div></footer>
        </article>;})}</section>
        <aside className="preview" aria-label={uiText("论文预览")}>{current?<><div className="preview-top"><button className="quiet close-preview" onClick={()=>setDetail(false)}>{uiText("关闭")}</button></div><div className="preview-content"><h2>{displayTitle(bilingual(current)?current.title_zh!:current.title)}</h2>{bilingual(current)&&<p className="original-title">{displayTitle(current.title)}</p>}<div className="preview-buttons"><button className="primary" onClick={()=>openOriginal(current)}>{uiText("打开原文")} <kbd>o</kbd></button><StarButton starred={!!state?.starred} busy={busy} onClick={()=>void change(current,{starred:!state?.starred})}/><button title={state?.dismissed_at?uiText("恢复 (x)"):uiText("归档 (x)")} disabled={busy} onClick={()=>void change(current,{dismissed_at:state?.dismissed_at?null:new Date().toISOString()})}><ArchiveIcon/>{state?.dismissed_at?uiText("恢复"):uiText("归档")} <kbd>x</kbd></button><ReadingMaterial key={`reading:${current.paper_key}`} paper={current}/><button onClick={()=>void copyReading(current)}>{uiText("复制精读包")}</button><button onClick={()=>download(current)}>{uiText("导出 Markdown")}</button><button aria-expanded={showChat} onClick={()=>setChatOpen(v=>!v)}>{uiText("AI 问答")}<kbd>c</kbd></button></div><div className="overview"><div>{cardHook(current)&&<><h3>{uiText("一句话总览")}</h3><p>{cardHook(current)}</p></>}{current.reason&&<><h3>{uiText("为什么推荐")}</h3><p>{current.reason}</p></>}<div className="feedback"><span>{uiText("推荐有帮助吗？")}</span><button aria-label={uiText("推荐有帮助")} aria-pressed={state?.feedback===1} disabled={busy} onClick={()=>void change(current,{feedback:state?.feedback===1?0:1})}>＋</button><button aria-label={uiText("不感兴趣")} aria-pressed={state?.feedback===-1} disabled={busy} onClick={()=>void change(current,{feedback:state?.feedback===-1?0:-1})}>−</button></div></div><dl className="overview-meta">{[['Authors',current.authors?.join(', ')],['Date',citationDate(current)],['Source / Venue',[current.source,current.venue].filter(Boolean).join(' · ')],['Score',current.score?.toFixed(1)],['Tags',(current.narrative?.tags||current.tags).join(' · ')]].map(([label,value])=>value&&<div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}{safeURL(current.pdf_url)&&<div><dt>PDF</dt><dd><a href={safeURL(current.pdf_url)} target="_blank" rel="noreferrer">{uiText("预览")}</a> · <button className="pdf-download" onClick={()=>void downloadPDF(current)}>{uiText("下载")}</button></dd></div>}{safeURL(current.code_url)&&<div><dt>Code</dt><dd><a href={safeURL(current.code_url)} target="_blank" rel="noreferrer">{uiText("代码仓库")}</a></dd></div>}</dl></div><MinMaxCard paper={current}/>{current.thumbnail&&<section className="figure-grid"><h3>{uiText("图表预览")}</h3><PaperThumbnail thumbnail={current.thumbnail}/></section>}<details key={current.paper_key} className="original-abstract" aria-label={uiText("原始摘要")}><summary>{uiText("展开英文原始摘要")}</summary><p className="abstract">{current.abstract||uiText("摘要缺失，请打开原文。")}</p></details><NoteEditor saved={state?.note_text??''} draft={noteDrafts[noteKey(current)]} edit={draft=>setNoteDrafts(d=>({...d,[noteKey(current)]:draft}))} discard={()=>setNoteDrafts(d=>{const next={...d};delete next[noteKey(current)];return next;})} save={()=>{if(!session)download(current);void change(current,{note_text:personalNote(current)});}} busy={busy} loggedIn={!!session}/><h3>{uiText("知识库")}</h3><p className="muted">{uiText("仅导出你选中的论文，不自动收录整个日报。")}</p><div className="export-actions"><button onClick={()=>downloadCitation(current)}>{uiText("下载 BibTeX")}</button>{exportPrefs.exportMode!=='obsidian'&&<button onClick={()=>download(current)}>{uiText("下载骨架 Markdown")}</button>}{exportPrefs.exportMode!=='markdown'&&<button onClick={()=>{if(!vault){setSettingsTab('export');setSettings(true);setNotice(uiText("先设置 Obsidian vault 名称。"));return;}let uri:string|null;try{uri=obsidianURI(current,vault,personalNote(current),inboxFolder,exportPrefs.naming);}catch(e){setError(errorMessage(e));setSettings(true);return;}if(!uri){download(current);setNotice(uiText("笔记较长，已下载 Markdown，请导入 Obsidian。"));return;}window.location.href=uri;}}>{uiText("导出骨架到 Obsidian")}</button>}</div><button className="read-toggle" disabled={busy} onClick={()=>void change(current,{read_at:state?.read_at?null:new Date().toISOString()})}>{state?.read_at?uiText("标记为未读"):uiText("标记为已读")}</button></div></>:<div className="empty">{uiText("选择一篇论文开始阅读")}</div>}</aside>
      </div></>}
      {!guide&&<footer className="workspace-footer"><span>DAILY PAPER READER</span><span><kbd>j</kbd><kbd>k</kbd> {uiText("切换")} <kbd>s</kbd> {uiText("待精读")} <kbd>x</kbd> {uiText("归档")} </span></footer>}
    </main>{showChat&&current&&<ChatPanel key={current.paper_key} paper={current} config={{endpoint:chatEndpoint,model:chatModel,apiKey:chatKey}} messages={histories[current.paper_key]||[]} save={messages=>setHistories(old=>({...old,[current.paper_key]:messages}))} close={()=>setChatOpen(false)} configure={()=>{setSettingsTab('chat');setSettings(true);}}/>}
    {feedbackOpen&&<Modal title={uiText("项目反馈")} close={()=>setFeedbackOpen(false)}><FeedbackForm/></Modal>}
    {settings&&<SettingsDialog config={settingsConfig} session={session} syncStatus={busy?'syncing':syncStatus} syncTime={syncTime} initialTab={settingsTab} paper={current} runs={runs} states={states} close={()=>setSettings(false)} save={saveSettings} refresh={refresh} clearSecrets={clearSecrets} forget={forgetSecret}/>}

    {help&&<Modal title={uiText("让阅读更顺手")} close={()=>setHelp(false)}><dl className="shortcuts">{[['j / k',uiText("下一篇 / 上一篇")],['s',uiText("加入或移出待精读")],['x',uiText("归档或恢复")],['o',uiText("打开原文")],['c',uiText("打开或收起 AI 问答")],['?',uiText("查看快捷键")]].map(([k,v])=><div key={k}><dt><kbd>{k}</kbd></dt><dd>{v}</dd></div>)}</dl><p>{uiText("输入文字时不会触发快捷键。")}</p><button onClick={()=>{setHelp(false);setFeedbackOpen(true);}}>{uiText("反馈问题")}</button></Modal>}
    {archiveConfirm&&<Modal title={uiText("归档当前日期的未读论文")} close={()=>setArchiveConfirm(false)}><p>{uiText("将归档")} {displayDate} {uiText("的")} {batchTargets.length} {uiText("篇未读论文。已收藏的论文会保留，之后可从“已归档”逐篇恢复。")}</p><button className="primary" onClick={()=>void bulkArchive()}>{uiText("归档")} {batchTargets.length} {uiText("篇")}</button></Modal>}
  </div>;
}
function Modal({title,close,children}:{title:string;close:()=>void;children:React.ReactNode}){
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{ref.current?.showModal();return()=>ref.current?.close();},[]);
  return <dialog ref={ref} className="modal" onCancel={close} onClick={event=>{if(event.target!==ref.current)return;const r=ref.current.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)close();}}><div className="modal-heading"><h2>{title}</h2><button onClick={close} aria-label={uiText("关闭对话框")}>×</button></div>{children}</dialog>;
}

if (location.hash.startsWith('#/')) {
  location.replace(new URL('./legacy.html', location.href).href + location.hash);
} else {
  createRoot(document.getElementById('root')!).render(<App/>);
}
