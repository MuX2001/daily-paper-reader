import {t} from './i18n/messages';
import {cardHook,displayTags,sameText} from './presentation';
import {citationDate} from './citation';
import {safeURL,thumbnailURL,type Paper} from './domain';
import {PaperThumbnail} from './PaperThumbnail';

export function PaperOverview({paper,feedback,busy,vote,downloadPDF}:{
  paper:Paper;feedback:number;busy:boolean;vote:(value:number)=>void;downloadPDF:()=>void
}){
  const context=paper.narrative?.context_and_problem||paper.minmax?.readable?.problem_delta||paper.breakdown?.problem;
  const reason=paper.recommendation_reason||paper.reason;
  const hook=cardHook(paper);
  const summary=sameText(hook,context)
    ? [reason,paper.tldr].find(text=>text&&!sameText(text,context))||t('详见下方背景与卡点。')
    : hook;
  const figure=thumbnailURL(paper.thumbnail?.url);
  const metadata=<dl className="overview-meta">
    {[['Authors',paper.authors?.join(', ')],['Date',citationDate(paper)],['Venue',paper.venue||paper.source],['Score',paper.score?.toFixed(1)],['Tags',displayTags(paper).join(' · ')]].map(([label,value])=>value&&
      <div key={label} className={label==='Authors'||label==='Tags'?'meta-wide':''}><dt>{label}</dt><dd title={value}>{value}</dd></div>)}
    {safeURL(paper.pdf_url)&&<div><dt>PDF</dt><dd><a href={safeURL(paper.pdf_url)} target="_blank" rel="noreferrer">{t('预览')}</a> · <button className="pdf-download" onClick={downloadPDF}>{t('下载')}</button></dd></div>}
    {safeURL(paper.code_url)&&<div><dt>Code</dt><dd><a href={safeURL(paper.code_url)} target="_blank" rel="noreferrer">{t('代码仓库')}</a></dd></div>}
  </dl>;
  return <section className={'overview'+(figure?' with-figure':'')}>
    <div className="overview-copy">
      {summary&&<><h3>{t('一句话总览')}</h3><p className="overview-hook" title={summary}>{summary}</p></>}
      {figure&&metadata}
      <div className="feedback"><span title={reason||undefined}>{reason&&!sameText(reason,summary)&&!sameText(reason,context)?reason:t('推荐有帮助吗？')}</span>
        {([1,-1] as const).map(value=><button key={value} aria-label={t(value===1?'推荐有帮助':'不感兴趣')} aria-pressed={feedback===value} disabled={busy} onClick={()=>vote(feedback===value?0:value)}>{value===1?'＋':'−'}</button>)}
      </div>
    </div>
    {figure?<PaperThumbnail key={paper.paper_key} thumbnail={paper.thumbnail}/>:metadata}
  </section>;
}
