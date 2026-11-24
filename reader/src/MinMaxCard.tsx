import type {Paper} from './domain';
const labels={delta:'解决什么问题',steps:'具体怎么做',evidence:'实验结果',constraints:'局限和成本',landmarks:'相关图表'} as const;
export function MinMaxCard({paper}:{paper:Paper}){
 const card=paper.minmax;
 return <section aria-label="论文速览"><h3>论文速览</h3>{card?.status==='ready'?Object.entries(labels).map(([key,label])=><div className="minmax-block" key={key}><h4>{label}</h4><p style={{whiteSpace:'pre-line'}}>{card[key as keyof typeof labels]?.text||'未说明'}</p></div>):<p>{card?.reason||'暂无总结，可先查看摘要或打开原文。'}</p>}</section>;
}
