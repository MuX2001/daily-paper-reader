import type {Paper} from './domain';
const labels={delta:'问题与精确增量',steps:'方法骨架',evidence:'实证硬证据',constraints:'边界与代价',landmarks:'原文路标'} as const;
export function MinMaxCard({paper}:{paper:Paper}){
 const card=paper.minmax;
 return <section aria-label="最小可重建分析"><h3>最小可重建分析</h3>{card?.status==='ready'?<><p className="muted">依据选取的原文片段抽取；未说明不代表全文没有。引句可核对，但不等于结论已被独立验证。</p>{Object.entries(labels).map(([key,label])=>{const claim=card[key as keyof typeof labels];const source=card.excerpts?.find(e=>e.id===claim?.source_id);return <div key={key}><h4>{label}</h4><p style={{whiteSpace:'pre-line'}}>{claim?.text||'未说明'}</p>{claim?.quote&&<details><summary>查看原文依据 · {claim.source_id}</summary><blockquote>{claim.quote}</blockquote><small>{card.source?.format} 文本字符 {source?.start}–{source?.end}</small></details>}</div>;})}</>:<p>{card?.reason||'尚未生成原文分析缓存；历史论文不会自动重新计费。'}</p>}</section>;
}
