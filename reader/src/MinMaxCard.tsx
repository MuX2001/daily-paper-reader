import type {Paper} from './domain';
export function MinMaxCard({paper}:{paper:Paper}){
 const n=paper.narrative,c=paper.minmax,r=c?.readable,b=paper.breakdown;
 const blocks=[
   ['背景与卡点',n?.context_and_problem||r?.problem_delta||c?.delta?.text||b?.problem],
   ['核心做法与直觉',n?.core_approach||r?.method_steps||c?.steps?.text||b?.method],
   [n?.results_and_reality_check&&!n.experimental_results?'实验结果与局限':'实验与硬证据',n?.experimental_results||n?.results_and_reality_check||r?.evidence||c?.evidence?.text||b?.results],
   ['局限、代价与图表路标',n?.caveats_and_pointers||[r?.caveats||c?.constraints?.text,r?.where_to_look||c?.landmarks?.text].filter(Boolean).join('\n')]
 ] as const;
 return <section aria-label="论文速览" className="bento-grid narrative-summary">{blocks.map(([label,value])=>value&&<section className="bento-card" key={label}><h3>{label}</h3>{Array.isArray(value)?<ol>{value.map((part,i)=><li key={i}>{part}</li>)}</ol>:<p>{value}</p>}</section>)}</section>;
}
