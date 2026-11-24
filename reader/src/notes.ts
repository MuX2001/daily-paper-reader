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
    tags:p.minmax?.readable?.tags||p.tags,status:'triage-card',url:url||null,pdf:pdf||null,code:code||null,note_type:'triage'};
  const links=[['原文',url],['PDF',pdf],['代码',code]].filter(([,value])=>value).map(([label,value])=>`- ${label}：<${value!.replaceAll('<','%3C').replaceAll('>','%3E')}>`).join('\n');
  const breakdown=([['problem','研究问题'],['method','核心方法'],['results','实验结果']] as const).map(([key,label])=>`### ${label}\n\n${p.breakdown?.[key]||'尚无可核验内容'}`).join('\n\n');
  const skeleton=p.minmax?.status==='ready'?Object.entries({delta:'破局点',steps:'做法骨架',evidence:'硬证据',constraints:'排雷与代价',landmarks:'直达图表'}).map(([key,label])=>{const c=p.minmax?.[key as 'delta'];return `### ${label}\n\n${key==='steps'&&p.minmax?.readable?(p.minmax.readable.method_steps.map((v,i)=>`${i+1}. ${v}`).join('\n')||'所选片段未说明'):(c?.text||'未说明')}${c?.quote&&!p.minmax?.readable?'\n\n原文依据（'+c.source_id+'）：'+c.quote:''}`;}).join('\n\n'):'尚无原文片段分析缓存；以下旧速览仅供参考。';
  const citation=bibtex(p);
  // A title may itself contain backticks; use a fence longer than any content run.
  const fence='`'.repeat(Math.max(3,...[...citation.matchAll(/`+/g)].map(m=>m[0].length+1)));
  if(p.minmax?.readable){
    const citations=Object.entries({delta:'破局点',steps:'做法骨架',evidence:'硬证据',constraints:'排雷与代价',landmarks:'直达图表'}).map(([k,label])=>{const c=p.minmax?.[k as 'delta'];return c?.quote?`### ${label} · ${c.source_id}\n\n> ${c.quote.replaceAll('\n','\n> ')}`:'';}).filter(Boolean).join('\n\n');
    return `---\n${Object.entries(fields).map(([k,v])=>`${k}: ${JSON.stringify(v)}`).join('\n')}\n---\n\n# ${p.title}\n\n**${p.minmax.readable.tldr}**\n\n> 依据选取片段的决策卡，不是全文精读。\n\n${skeleton}\n\n## 原文与资源\n\n${links}\n\n## 阅读笔记\n\n${personalNote}\n\n<details>\n<summary>原文依据与引用信息</summary>\n\n${citations}\n\n${fence}bibtex\n${citation}${fence}\n\n</details>\n`;
  }
  return `---\n${Object.entries(fields).map(([key,value])=>`${key}: ${JSON.stringify(value)}`).join('\n')}\n---\n\n# ${p.title}\n\n> 待读卡片，未执行全文精读。\n\n## 原文与资源\n\n${links||'尚无可核验原文链接'}\n\n## 最小可重建分析\n\n> 输入为选取的原文片段，不代表全文；未说明不等于原文未报告。\n\n${skeleton}\n\n## 核心亮点\n\n${p.tldr||'尚未生成速览'}\n\n${p.minmax?.readable?'':breakdown}\n\n## 推荐理由\n\n${p.reason||'尚无推荐理由'}\n\n## 原始摘要\n\n${p.abstract||'摘要缺失'}\n\n## BibTeX\n\n${fence}bibtex\n${citation}${fence}\n\n## 阅读笔记\n\n${personalNote}\n`;
}
export function obsidianFolder(value:string):string {
  const folder=value.trim().replaceAll('\\','/');
  if(folder.startsWith('/')||/^[A-Za-z]:/.test(folder)||/[\u0000-\u001f\u007f]/.test(folder))throw new Error('收件箱目录请填写 vault 内的相对路径，例如 Papers/Inbox');
  const parts=folder.split('/').filter(Boolean);
  if(parts.some(p=>p==='.'||p==='..'))throw new Error('收件箱目录不能包含 . 或 .. 路径段');
  return parts.join('/');
}
export function exportFilename(p:Paper,naming='stable-id'):string {
  if(naming==='stable-id')return noteFilename(p);
  const title=p.title.normalize('NFKC').replace(/[<>:"/\\|?*\u0000-\u001f]/g,'-').replace(/\s+/g,' ').trim().replace(/[. ]+$/,'').slice(0,80)||'Paper';
  const date=citationDate(p);
  const prefix=naming==='date-title'?(date&&/^\d{4}-\d{2}-\d{2}$/.test(date)?date:'日期未知'):(p.source==='arxiv'?p.original_id.replaceAll('/','-'):p.source);
  return `${prefix}-${title}-${noteFilename(p)}`;
}
export function obsidianURI(p:Paper,vault:string,personalNote='',folder='Inbox',naming='stable-id'):string|null {
  if(!vault.trim())throw new Error('请先设置 Obsidian vault 名称');
  const directory=obsidianFolder(folder);
  const uri=`obsidian://new?vault=${encodeURIComponent(vault.trim())}&file=${encodeURIComponent((directory?directory+'/':'')+exportFilename(p,naming))}&content=${encodeURIComponent(noteMarkdown(p,personalNote))}`;
  // Conservative delivery limit, measured after URI encoding. No overwrite flag.
  return uri.length<=8000?uri:null;
}
