import {safeURL, type Paper} from './domain.ts';

// Conference submission timestamps are not publication dates.
export function citationDate(p:Paper):string|undefined {
  const date=p.source==='arxiv'?p.published:p.publication_date;
  const precision=p.source==='arxiv'?'day':p.publication_date_precision;
  const length=precision==='day'?10:precision==='month'?7:precision==='year'?4:0;
  if(!date||!length)return;
  const value=date.slice(0,length);
  if(!/^\d{4}(?:-(?:0[1-9]|1[0-2])(?:-(?:0[1-9]|[12]\d|3[01]))?)?$/.test(value))return;
  return value;
}
export function citationFields(p:Paper):[string,string][] {
  const fields:[string,string][]=[['citation_title',p.title]];
  for(const author of p.authors||[])if(author.trim())fields.push(['citation_author',author]);
  const date=citationDate(p), url=safeURL(p.url), pdf=safeURL(p.pdf_url);
  if(date)fields.push(['citation_date',date]);
  if(url)fields.push(['citation_public_url',url]);
  if(pdf)fields.push(['citation_pdf_url',pdf]);
  if(p.abstract)fields.push(['citation_abstract',p.abstract]);
  return fields;
}
export function installCitation(p:Paper|undefined,doc:Document=document):()=>void {
  const nodes:HTMLMetaElement[]=[];
  if(p)for(const [name,content] of citationFields(p)){
    const node=doc.createElement('meta');node.name=name;node.content=content;
    node.dataset.readerCitation='true';doc.head.appendChild(node);nodes.push(node);
  }
  // Notify Zotero Connector when SPA selection changes.
  doc.dispatchEvent(new Event('ZoteroItemUpdated',{bubbles:true}));
  return ()=>nodes.forEach(node=>node.remove());
}
function tex(value:string):string {
  const escapes:Record<string,string>={'\\':'\\textbackslash{}','{':'\\{','}':'\\}','%':'\\%','&':'\\&','#':'\\#','_':'\\_','$':'\\$','~':'\\textasciitilde{}','^':'\\textasciicircum{}'};
  return value.replace(/[\\{}%&#_$~^]/g,c=>escapes[c]).replace(/[\r\n\t]+/g,' ');
}
export function bibtex(p:Paper):string {
  const fields:[string,string][]=[['title',tex(p.title)]];
  if(p.authors?.length)fields.push(['author',p.authors.map(a=>`{${tex(a)}}`).join(' and ')]);
  const date=citationDate(p),url=safeURL(p.url)||safeURL(p.pdf_url);
  if(date)fields.push(['year',date.slice(0,4)]);
  if(url)fields.push(['url',tex(url)]);
  if(p.source==='arxiv')fields.push(['archivePrefix','arXiv'],['eprint',tex(p.original_id)]);
  return `@misc{${p.paper_key.replace(/[^A-Za-z0-9_.:-]/g,'_')},\n${fields.map(([key,value])=>`  ${key} = {${value}}`).join(',\n')}\n}\n`;
}
export function downloadCitation(p:Paper) {
  const url=URL.createObjectURL(new Blob([bibtex(p)],{type:'application/x-bibtex;charset=utf-8'}));
  const link=document.createElement('a');link.href=url;link.download=p.paper_key.replace(/[^A-Za-z0-9_.-]/g,'_')+'.bib';link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
