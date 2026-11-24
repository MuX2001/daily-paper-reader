import {useState} from 'react';
import type {Paper} from './domain';
import {noteMarkdown,noteFilename} from './notes';
export function ReadableComparison({paper,personalNote=''}:{paper:Paper;personalNote?:string}) {
 const [message,setMessage]=useState('');
 const next=paper.minmax_candidate?.readable;
 if(!next)return null;
 const old=paper.minmax;
 const candidate={...paper,minmax:paper.minmax_candidate,tldr:next.tldr};
 const rows=[['一句话',paper.tldr,next.tldr],['破局点',old?.delta?.text,next.problem_delta],['做法骨架',old?.steps?.text,next.method_steps.map((s,i)=>`${i+1}. ${s}`).join('\n')],['硬证据',old?.evidence?.text,next.evidence],['排雷与代价',old?.constraints?.text,next.caveats],['直达图表',old?.landmarks?.text,next.where_to_look],['标签',paper.tags.join('、'),next.tags.join('、')]];
 return <section aria-label="新旧文案对照" className="readable-comparison"><h3>新旧文案对照 · 待确认</h3><p className="muted">新版是实际模型输出，尚未替换每日默认卡片。右侧只展示短文案；证据可在下方展开。</p><table><thead><tr><th>内容</th><th>旧版</th><th>新版候选</th></tr></thead><tbody>{rows.map(([label,before,after])=><tr key={label}><th>{label}</th><td>{before||'未说明'}</td><td>{after||'所选片段未说明'}</td></tr>)}</tbody></table><div className="reading-actions"><button onClick={async()=>{try{await navigator.clipboard.writeText(noteMarkdown(candidate,personalNote));setMessage('已复制新版候选骨架');}catch{setMessage('复制失败，请使用下载按钮');}}}>复制新版骨架</button><button onClick={()=>{const href=URL.createObjectURL(new Blob([noteMarkdown(candidate,personalNote)],{type:'text/markdown;charset=utf-8'}));const a=document.createElement('a');a.href=href;a.download=noteFilename(paper)+'-readable-candidate.md';a.click();setTimeout(()=>URL.revokeObjectURL(href),1000);setMessage('已下载新版候选骨架');}}>下载新版骨架</button></div>{message&&<p role="status">{message}</p>}<details><summary>新版原文依据</summary>{(['delta','steps','evidence','constraints','landmarks'] as const).map(k=><blockquote key={k}>{paper.minmax_candidate?.[k]?.quote||'所选片段未说明'}</blockquote>)}</details></section>;
}
