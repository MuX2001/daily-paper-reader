import {t as uiText} from './i18n/messages.ts';
import {safeURL,type Paper} from './domain.ts';
import {bibtex,citationDate} from './citation.ts';

export function noteFilename(p:Paper):string {
  // Encode disallowed characters, including the escape marker, reversibly.
  return p.paper_key.replace(/[^A-Za-z0-9._-]/gu,c=>'~'+c.codePointAt(0)!.toString(16)+'~');
}
export function noteMarkdown(p:Paper,personalNote=''):string {
  const url=safeURL(p.url),pdf=safeURL(p.pdf_url),code=safeURL(p.code_url);
  const fields={paper_key:p.paper_key,title:p.title,authors:p.authors||[],source:p.source,
    arxiv_id:p.source==='arxiv'?p.original_id:null,version:p.version??null,venue:p.venue??null,
    publication_date:citationDate(p)||null,publication_date_precision:p.source==='arxiv'?'day':p.publication_date_precision||null,
    tags:p.narrative?.tags||p.tags,status:'triage-card',url:url||null,pdf:pdf||null,code:code||null,note_type:'triage'};
  const links=[[uiText("原文"),url],['PDF',pdf],[uiText("代码"),code]].filter(([,value])=>value).map(([label,value])=>`- ${label}：<${value!.replaceAll('<','%3C').replaceAll('>','%3E')}>`).join('\n');
  const breakdown=([['problem',uiText("研究问题")],['method',uiText("核心方法")],['results',uiText("实验结果")]] as const).map(([key,label])=>`### ${label}\n\n${p.breakdown?.[key]||uiText("尚无可核验内容")}`).join('\n\n');
  const skeleton=p.narrative?`### ${uiText("背景与问题")}\n\n${p.narrative.context_and_problem}\n\n### ${uiText("核心做法与直觉")}\n\n${p.narrative.core_approach.map((part,i)=>`${i+1}. ${part}`).join('\n\n')}\n\n${p.narrative.experimental_results?'### '+uiText('实验与硬证据')+'\n\n'+p.narrative.experimental_results+'\n\n### '+uiText('局限、代价与图表路标')+'\n\n'+(p.narrative.caveats_and_pointers||''):'### '+uiText('实验结果与局限')+'\n\n'+(p.narrative.results_and_reality_check||'')}`:p.minmax?.status==='ready'?Object.entries({delta:uiText("解决什么问题"),steps:uiText("具体怎么做"),evidence:uiText("实验结果"),constraints:uiText("局限和成本"),landmarks:uiText("相关图表")}).map(([key,label])=>`### ${label}\n\n${p.minmax?.[key as 'delta']?.text||uiText("未说明")}`).join('\n\n'):uiText("暂无总结。");
  const citation=bibtex(p);
  // A title may itself contain backticks; use a fence longer than any content run.
  const fence='`'.repeat(Math.max(3,...[...citation.matchAll(/`+/g)].map(m=>m[0].length+1)));
  return `---\n${Object.entries(fields).map(([key,value])=>`${key}: ${JSON.stringify(value)}`).join('\n')}\n---\n\n# ${p.title}\n\n> ${uiText("待读卡片，未执行全文精读。")}\n\n## ${uiText("原文与资源")}\n\n${links||uiText("尚无可核验原文链接")}\n\n## ${uiText("论文速览")}\n\n${skeleton}\n\n## ${uiText("核心亮点")}\n\n${p.narrative?.card_hook||p.tldr||uiText("尚未生成速览")}\n\n${p.narrative||p.minmax?.status==='ready'?'':breakdown}\n\n## ${uiText("推荐理由")}\n\n${p.reason||uiText("尚无推荐理由")}\n\n## ${uiText("原始摘要")}\n\n${p.abstract||uiText("摘要缺失")}\n\n## BibTeX\n\n${fence}bibtex\n${citation}${fence}\n\n## ${uiText("阅读笔记")}\n\n${personalNote}\n`;
}
export function obsidianFolder(value:string):string {
  const folder=value.trim().replaceAll('\\','/');
  if(folder.startsWith('/')||/^[A-Za-z]:/.test(folder)||/[\u0000-\u001f\u007f]/.test(folder))throw new Error(uiText("收件箱目录请填写 vault 内的相对路径，例如 Papers/Inbox"));
  const parts=folder.split('/').filter(Boolean);
  if(parts.some(p=>p==='.'||p==='..'))throw new Error(uiText("收件箱目录不能包含 . 或 .. 路径段"));
  return parts.join('/');
}
export function exportFilename(p:Paper,naming='stable-id'):string {
  if(naming==='stable-id')return noteFilename(p);
  const title=p.title.normalize('NFKC').replace(/[<>:"/\\|?*\u0000-\u001f]/g,'-').replace(/\s+/g,' ').trim().replace(/[. ]+$/,'').slice(0,80)||'Paper';
  const date=citationDate(p);
  const prefix=naming==='date-title'?(date&&/^\d{4}-\d{2}-\d{2}$/.test(date)?date:uiText("日期未知")):(p.source==='arxiv'?p.original_id.replaceAll('/','-'):p.source);
  return `${prefix}-${title}-${noteFilename(p)}`;
}
export function obsidianURI(p:Paper,vault:string,personalNote='',folder='Inbox',naming='stable-id'):string|null {
  if(!vault.trim())throw new Error(uiText("请先设置 Obsidian vault 名称"));
  const directory=obsidianFolder(folder);
  const uri=`obsidian://new?vault=${encodeURIComponent(vault.trim())}&file=${encodeURIComponent((directory?directory+'/':'')+exportFilename(p,naming))}&content=${encodeURIComponent(noteMarkdown(p,personalNote))}`;
  // Conservative delivery limit, measured after URI encoding. No overwrite flag.
  return uri.length<=8000?uri:null;
}
