import {useEffect,useState} from 'react';
import {feed} from './api';
import type {CatalogEntry,PaperState} from './domain';

export function ReadingProgress({runs,states}:{runs:CatalogEntry[];states:Record<string,PaperState>}){
  const [days,setDays]=useState<Record<string,string[]>>({});
  const [failed,setFailed]=useState(false);
  const today=new Date();
  const dateKey=(d:Date)=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('');
  const monday=new Date(today.getFullYear(),today.getMonth(),today.getDate()-(today.getDay()+6)%7);
  const offset=(n:number)=>new Date(monday.getFullYear(),monday.getMonth(),monday.getDate()+n);
  const first=dateKey(offset(-77)),last=dateKey(today);
  useEffect(()=>{
    const control=new AbortController();
    async function load(){
      const entries=runs.filter(r=>/^\d{8}$/.test(r.run_id)&&r.run_id>=first&&r.run_id<=last);
      const data:Record<string,string[]>={};
      for(const r of entries){
        const batch=await feed(r.path,control.signal);
        data[r.run_id]=batch.papers.map(p=>p.paper_key);
      }
      if(!control.signal.aborted){setDays(data);setFailed(false);}
    }
    load().catch(()=>{if(!control.signal.aborted)setFailed(true);});
    return ()=>control.abort();
  },[runs,first,last]);
  const count=(keys:string[])=>{
    let starred=0,archived=0;
    for(const key of new Set(keys)){if(states[key]?.dismissed_at)archived++;else if(states[key]?.starred)starred++;}
    return {starred,archived,total:starred+archived};
  };
  const keys=days[last]||[],done=count(keys).total,size=new Set(keys).size;
  const weeks=Array.from({length:12},(_,i)=>{
    const start=offset((i-11)*7),end=offset((i-11)*7+6);
    const stats=count(Object.entries(days).filter(([day])=>day>=dateKey(start)&&day<=dateKey(end)).flatMap(([,ids])=>ids));
    const short=(d:Date)=>dateKey(d).slice(4,6)+'/'+dateKey(d).slice(6);
    return {...stats,label:short(start)+' - '+short(end)+'：处理 '+stats.total+' 篇（待精读 '+stats.starred+' · 归档 '+stats.archived+'）'};
  });
  return <section className="reading-progress" aria-label="阅读进度">{failed?<small>暂时无法读取日报进度</small>:<>
    <div className="progress-today"><svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true"><circle cx="16" cy="16" r="13" fill="none" stroke="#e1e9e5" strokeWidth="3"/><circle cx="16" cy="16" r="13" fill="none" stroke="#276246" strokeWidth="3" pathLength="100" strokeDasharray={(size?100*done/size:0)+' 100'} transform="rotate(-90 16 16)"/></svg><div>今日进度 {done} / {size}<small>{!size?'今日暂无日报':done===size?'今日已清空':'还剩 '+(size-done)+' 篇待扫'}</small></div></div>
    <header title="按论文所属日报周统计">近 12 周 <span>本周 {weeks[11].total} 篇</span></header>
    <div className="heat-grid">{weeks.map(w=><span key={w.label} tabIndex={0} aria-label={w.label} title={w.label} style={{background:['#e8eeea','#afcebc','#71a788','#306a4d'][w.total===0?0:w.total<4?1:w.total<10?2:3]}}/>)}</div></>}</section>;
}
