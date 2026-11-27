import {useState} from 'react';
import {PaperText} from './PaperText';
import {t} from './i18n/messages';
import {cardHook,displayTags,sameText} from './presentation';
import {citationDate} from './citation';
import {safeURL,thumbnailURL,type Paper} from './domain';
import {PaperThumbnail} from './PaperThumbnail';

export function PaperOverview({paper,feedback,busy,vote,downloadPDF}:{
  paper:Paper;feedback:number;busy:boolean;vote:(value:number)=>void;downloadPDF:()=>void
}){
  const context=paper.narrative?.context_and_problem||paper.partial_narrative?.context_and_problem||paper.minmax?.readable?.problem_delta||paper.breakdown?.problem;
  const reason=paper.recommendation_reason||paper.reason;
  const hook=cardHook(paper);
  const baselineSummary=sameText(hook,context)
    ? [reason,paper.tldr].find(text=>text&&!sameText(text,context))||t('详见下方背景与卡点。')
    : hook;
  const [failedFigure,setFailedFigure]=useState('');
  const figure=paper.thumbnail?.url!==failedFigure&&paper.thumbnail?.kind!=='first_page'&&thumbnailURL(paper.thumbnail?.url);
  const review=paper.evaluation_v2;
  const highlight=review?.highlights.filter(h=>h.verified).sort((a,b)=>(review.dimensions[b.dimension]??0)-(review.dimensions[a.dimension]??0))[0];
  const summary=highlight?.description||baselineSummary;
  const location=highlight?.locations?.[0];
  const provenance=Array.from(new Set(paper.retrieval_sources?.map(s=>[s.channel,s.profile].filter(Boolean).join(' · ')))).join(', ');
  const metadata=<dl className="overview-meta">
    {[['Authors',paper.authors?.join(', ')],['Date',citationDate(paper)],['Venue',paper.venue||paper.source],[review?'Legacy score':'Score',paper.score?.toFixed(1)],['Tags',displayTags(paper).join(' · ')],['Source',provenance]].map(([label,value])=>value&&
      <div key={label} className={label==='Authors'||label==='Tags'?'meta-wide':''}><dt>{label}</dt><dd title={value}>{value}</dd></div>)}
    {safeURL(paper.pdf_url)&&<div><dt>PDF</dt><dd><a href={safeURL(paper.pdf_url)} target="_blank" rel="noreferrer">{t('预览')}</a> · <button className="pdf-download" onClick={downloadPDF}>{t('下载')}</button></dd></div>}
    {safeURL(paper.code_url)&&<div><dt>Code</dt><dd><a href={safeURL(paper.code_url)} target="_blank" rel="noreferrer">{t('代码仓库')}</a></dd></div>}
  </dl>;
  return <section className={'overview'+(figure?' with-figure':'')}>
    <div className="overview-copy">
      {summary&&<><h3>{t('一句话总览')}</h3><div className="overview-hook" title={summary}><PaperText text={summary}/></div></>}
      {review&&<details className="v2-values"><summary>V2 · {Object.entries(review.dimensions).map(([key,value])=>key+' '+(value??'—')+(value!=null&&value>=3&&!review.highlights.some(h=>h.verified&&h.dimension===key)?'?':'')).join(' · ')}</summary>
        {highlight&&<p>{highlight.description} {highlight.transferability} · {highlight.limitation} {location&&(safeURL(location.url)?<a href={safeURL(location.url)} target="_blank" rel="noreferrer">{location.id}</a>:location.id)}</p>}
      </details>}
      {figure&&metadata}
      <div className="feedback"><span title={reason||undefined}>{reason&&!sameText(reason,summary)&&!sameText(reason,context)?reason:t('推荐有帮助吗？')}</span>
        {([1,-1] as const).map(value=><button key={value} aria-label={t(value===1?'推荐有帮助':'不感兴趣')} aria-pressed={feedback===value} disabled={busy} onClick={()=>vote(feedback===value?0:value)}>{value===1?'＋':'−'}</button>)}
      </div>
    </div>
    {figure?<PaperThumbnail key={paper.paper_key} thumbnail={paper.thumbnail} onUnavailable={()=>setFailedFigure(paper.thumbnail?.url||'')}/>:metadata}
  </section>;
}
