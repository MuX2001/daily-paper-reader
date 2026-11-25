import {t as uiText} from './i18n/messages.ts';
import {useEffect,useState} from 'react';
import {readJSON} from './api';
import {safeURL,type CatalogEntry,type Feed} from './domain';
interface Guide {overview:{text:string;paper_ids:string[]};sections:{title:string;text:string;paper_ids:string[]}[];reading_order:{paper_id:string;reason:string;level:string}[]}
interface TopicFeed extends Feed {topic:{title:string;mode:string;status:string;description:string;guide:Guide|null}}
export function TopicsPanel({entries,open}:{entries:CatalogEntry[];open:(id:string,key?:string)=>void}){
  const [selected,setSelected]=useState(''),[data,setData]=useState<TopicFeed|null>(null),[error,setError]=useState(''),[notice,setNotice]=useState('');
  useEffect(()=>{
    const entry=entries.find(e=>e.run_id===selected);if(!entry){setData(null);return;}
    const controller=new AbortController();setData(null);setError('');
    readJSON<TopicFeed>('./docs/data/'+entry.path,controller.signal).then(setData).catch(e=>{if(!controller.signal.aborted)setError(String(e));});
    return()=>controller.abort();
  },[selected,entries]);
  function markdown(){if(!data)return '';return '# '+data.topic.title+'\n\n'+data.papers.map((p,i)=>`${i+1}. ${p.title}\n   ${safeURL(p.url)||safeURL(p.pdf_url)||uiText("外部原文链接缺失")}`).join('\n\n')+'\n';}
  function download(){const blob=new Blob([markdown()],{type:'text/markdown;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=selected+'.md';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  function references(ids:string[]){return <div className="guide-references">{ids.map(id=>{const p=data?.papers.find(p=>p.work_id===id||p.original_id===id);return p?<button key={id} onClick={()=>open(selected,p.paper_key)}>{p.title}</button>:<span key={id}>{uiText("引用缺失：")}{id}</span>;})}</div>;}
  return <section className="topics-panel"><div className="topic-cards">{entries.map(entry=><button key={entry.run_id} className={selected===entry.run_id?'topic-card active':'topic-card'} onClick={()=>setSelected(entry.run_id)}><span>{uiText("专题研究")}</span><h2>{entry.title}</h2><p>{entry.count} {uiText("篇固定名单")}</p><small>{entry.run_id.slice(0,8)}</small></button>)}{!entries.length&&<div className="empty"><h2>{uiText("尚无已发布专题")}</h2><p>{uiText("完成90天/365天回溯或入门包任务后，固定名单和导读会出现在这里。")}</p><a href="./legacy.html">{uiText("前往现有研究任务管理")}</a></div>}</div>{error&&<p role="alert">{error}</p>}{selected&&!data&&!error&&<p>{uiText("正在读取专题…")}</p>}{data&&<div className="topic-guide"><h2>{data.topic.title}</h2><p>{data.topic.description}</p><p className="muted">{uiText("模式：")}{data.topic.mode} {uiText("· 发布状态：")}{data.topic.status} {uiText("· 固定名单")} {data.papers.length} {uiText("篇")}</p><div className="topic-actions"><button className="primary" onClick={()=>open(selected)}>{uiText("阅读全部论文")}</button><button onClick={download}>{uiText("下载完整名单")}</button><button onClick={async()=>{try{await navigator.clipboard.writeText(markdown());setNotice(uiText("完整名单已复制"));}catch{setNotice(uiText("复制失败，请下载 Markdown"));}}}>{uiText("复制完整名单")}</button></div>{notice&&<p role="status">{notice}</p>}{data.topic.guide?<><h3>{uiText("研究问题")}</h3><p>{data.topic.guide.overview.text}</p>{references(data.topic.guide.overview.paper_ids)}{data.topic.guide.sections.map((section,i)=><section key={i}><h3>{section.title}</h3><p>{section.text}</p>{references(section.paper_ids)}</section>)}<h3>{uiText("建议阅读路线")}</h3><ol>{data.topic.guide.reading_order.map(item=><li key={item.paper_id}><p>{item.level} · {item.reason}</p>{references([item.paper_id])}</li>)}</ol></>:<p className="muted">{uiText("导读尚未生成；完整最终名单可直接阅读与导出。")}</p>}</div>}</section>;
}
