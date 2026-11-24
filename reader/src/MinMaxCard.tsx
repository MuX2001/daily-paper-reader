import type {Paper} from './domain';
import {cardHook,sameText} from './presentation';
const labels={delta:'解决什么问题',steps:'具体怎么做',evidence:'实验结果',constraints:'局限和成本',landmarks:'相关图表'} as const;
export function MinMaxCard({paper}:{paper:Paper}){
 const card=paper.minmax,narrative=paper.narrative;
 if(narrative)return <section aria-label="论文速览" className="narrative-summary"><h3>背景与问题</h3><p>{narrative.context_and_problem}</p><h3>核心做法与直觉</h3><ol>{narrative.core_approach.map((part,i)=><li key={i}>{part}</li>)}</ol><h3>实验结果与局限</h3><p>{narrative.results_and_reality_check}</p></section>;
 return <section aria-label="论文速览"><h3>论文速览</h3>{card?.status==='ready'?Object.entries(labels).filter(([key])=>key!=='delta'||!sameText(card.delta?.text,cardHook(paper))).map(([key,label])=><div className="minmax-block" key={key}><h4>{label}</h4><p style={{whiteSpace:'pre-line'}}>{card[key as keyof typeof labels]?.text||'未说明'}</p></div>):<p>{card?.reason||'暂无总结，可先查看摘要或打开原文。'}</p>}</section>;
}
