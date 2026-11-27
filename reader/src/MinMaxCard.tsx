import {PaperText} from './PaperText';
import {t as uiText} from './i18n/messages.ts';
import {useLayoutEffect,useRef,useState} from 'react';
import type {Paper} from './domain';
function SummaryBlock({label,value}:{label:string;value:string|string[]}){
 const body=useRef<HTMLDivElement>(null);
 const [long,setLong]=useState(false),[expanded,setExpanded]=useState(false);
 useLayoutEffect(()=>{
   const node=body.current;
   if(!node)return;
   const measure=()=>{
     const style=getComputedStyle(node);
     const visibleHeight=Number(style.getPropertyValue('--summary-limit'))*parseFloat(style.lineHeight);
     setLong(node.scrollHeight>visibleHeight+1);
   };
   const observer=new ResizeObserver(measure);
   observer.observe(node);measure();
   return ()=>observer.disconnect();
 },[value]);
 return <section className="bento-card"><header><h3>{label}</h3>
   {long&&<button aria-expanded={expanded} aria-label={uiText(expanded?'收起 {0}':'展开 {0}',label)} onClick={()=>setExpanded(!expanded)}>{expanded?'−':'＋'}</button>}
 </header><div ref={body} className={'summary-body'+(expanded?' expanded':'')}>
   {Array.isArray(value)?<ol>{value.map((part,i)=><li key={i}><PaperText text={part}/></li>)}</ol>:<PaperText text={value}/>}
 </div></section>;
}
export function MinMaxCard({paper}:{paper:Paper}){
 const n=paper.narrative||paper.partial_narrative,c=paper.minmax,r=c?.readable,b=paper.breakdown;
 const blocks=[
   [uiText("背景与卡点"),n?.context_and_problem||r?.problem_delta||c?.delta?.text||b?.problem],
   [uiText("核心做法与直觉"),n?.core_approach||r?.method_steps||c?.steps?.text||b?.method],
   [n?.results_and_reality_check&&!n.experimental_results?uiText("实验结果与局限"):uiText("实验与硬证据"),n?.experimental_results||n?.results_and_reality_check||r?.evidence||c?.evidence?.text||b?.results],
   [uiText("局限、代价与图表路标"),n?.caveats_and_pointers||[r?.caveats||c?.constraints?.text,r?.where_to_look||c?.landmarks?.text].filter(Boolean).join('\n')]
 ] as const;
 const seen=new Set<string>();
 return <section aria-label={uiText("论文速览")} className="bento-grid narrative-summary">{blocks.map(([label,value])=>{
   const normalized=(Array.isArray(value)?value.join(' '):value||'').replace(/\s+/g,' ').trim();
   const display=!normalized?uiText('此项缺少已核验内容。'):seen.has(normalized)?uiText('此项与前文重复，暂缺独立证据。'):value!;
   seen.add(normalized);
   return <SummaryBlock key={label} label={label} value={display}/>;
 })}</section>;
}
