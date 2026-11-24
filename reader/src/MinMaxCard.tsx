import type {Paper} from './domain';
const labels={delta:'破局点',steps:'做法骨架',evidence:'硬证据',constraints:'排雷与代价',landmarks:'直达图表'} as const;
export function MinMaxCard({paper}:{paper:Paper}){
 const card=paper.minmax;
 return <section aria-label="最小可重建分析"><h3>最小可重建分析</h3>{card?.status==='ready'?<><p className="muted">依据选取的原文片段抽取；未说明不代表全文没有。引句可核对，但不等于结论已被独立验证。</p>{Object.entries(labels).map(([key,label])=>{const claim=card[key as keyof typeof labels];const source=card.excerpts?.find(e=>e.id===claim?.source_id);return <div className="minmax-block" key={key}><h4>{label}</h4>{key==='steps'&&card.readable?<ol>{card.readable.method_steps.length?card.readable.method_steps.map((step,i)=><li key={i}>{step}</li>):<li>所选片段未说明</li>}</ol>:<p style={{whiteSpace:'pre-line'}}>{claim?.text||'未说明'}</p>}{claim?.quote&&<details><summary>查看原文依据 · {claim.source_id}</summary><blockquote>{claim.quote}</blockquote><small>{card.source?.format} 文本字符 {source?.start}–{source?.end}</small></details>}</div>;})}</>:<p>{card?.reason||'尚未生成原文分析缓存；历史论文不会自动重新计费。'}</p>}</section>;
}
