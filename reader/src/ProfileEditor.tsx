import {t as uiText} from './i18n/messages.ts';
import type {Profile} from './github';

type Entry=string|Record<string,unknown>;
function entryValue(entry:Entry,field:string):string{
 if(typeof entry==='string')return field==='query'?'':entry;
 const keys=field==='keyword'?['keyword','text','expr']:['query','rewrite','rewrite_for_embedding','text','keyword','expr'];
 const value=keys.map(k=>entry[k]).find(v=>typeof v==='string'&&v);
 return typeof value==='string'?value:'';
}
export function ProfileEditor({draft,onChange,apply,cancel}:{draft:string;onChange:(value:string)=>void;apply:()=>void;cancel:()=>void}){
 let profile:Profile|null=null;
 try{const parsed=JSON.parse(draft);if(parsed&&typeof parsed==='object'&&!Array.isArray(parsed)
  &&(parsed.tag===undefined||typeof parsed.tag==='string')&&(parsed.description===undefined||typeof parsed.description==='string')
  &&['keywords','intent_queries','paper_sources'].every(k=>parsed[k]===undefined||Array.isArray(parsed[k])))profile=parsed;}catch{/* Advanced edits may temporarily be invalid. */}
 const change=(patch:Partial<Profile>)=>onChange(JSON.stringify({...profile,...patch},null,2));
 function editEntry(kind:'keywords'|'intent_queries',index:number,field:string,value:string){
  const entries=[...(profile?.[kind]||[])];const old=entries[index] as Entry;
  const next:Record<string,unknown>=typeof old==='string'?(kind==='keywords'?{keyword:old,query:old}:{query:old}):{...old};
  next[field]=value;delete next.embedding_cache;delete next._cache_ref;
  entries[index]=next;change({[kind]:entries});
 }
 return <section className="profile-editor"><h3>{uiText("编辑研究方向")}</h3><p className="muted">{uiText("英文关键词用于关键词检索，语义查询用于向量检索。应用后还需保存订阅，才会写入仓库。")}</p>
 {profile&&<div className="profile-fields">
  <label>{uiText("方向标识")}<input aria-label={uiText("方向标识")} value={profile.tag||''} onChange={e=>change({tag:e.target.value})}/></label>
  <label>{uiText("方向说明")}<textarea aria-label={uiText("方向说明")} value={profile.description||''} onChange={e=>change({description:e.target.value})} rows={2}/></label>
  <label>{uiText("论文来源（逗号分隔）")}<input value={Array.isArray(profile.paper_sources)?profile.paper_sources.join(', '):''} placeholder="arxiv" onChange={e=>change({paper_sources:e.target.value.split(',').map(v=>v.trim())})}/></label>
  {(['keywords','intent_queries'] as const).map(kind=><fieldset key={kind}><legend>{kind==='keywords'?uiText("关键词与语义改写"):uiText("独立语义查询")}</legend>
   {Array.isArray(profile![kind])&&profile![kind]!.map((item,index)=>{
    if(typeof item!=='string'&&(!item||typeof item!=='object'||Array.isArray(item)))return <p key={index} role="alert">{uiText("第")}{index+1}{uiText("项格式异常，请在高级 JSON 中修正。")}</p>;
    const entry=item as Entry;
    return <div className="profile-query" key={index}>
     {kind==='keywords'&&<label>{uiText("英文关键词")} {index+1}<input aria-label={uiText("英文关键词 {0}", index+1)} value={entryValue(entry,'keyword')} onChange={e=>editEntry(kind,index,'keyword',e.target.value)}/></label>}
     <label>{kind==='keywords'?uiText("语义改写"):uiText("独立语义查询")} {index+1}<textarea aria-label={`${kind==='keywords'?uiText("语义改写"):uiText("独立语义查询")} ${index+1}`} rows={2} value={typeof entry==='string'?entry:entryValue(entry,'query')} onChange={e=>editEntry(kind,index,'query',e.target.value)}/></label>
     <button onClick={()=>change({[kind]:profile![kind]!.filter((_,i)=>i!==index)})}>{uiText("移除")}{kind==='keywords'?uiText("关键词"):uiText("语义查询")} {index+1}</button>
    </div>;
   })}<button onClick={()=>change({[kind]:[...(profile![kind]||[]),kind==='keywords'?{keyword:'',query:''}:{query:''}]})}>{uiText("添加")}{kind==='keywords'?uiText("关键词"):uiText("语义查询")}</button>
  </fieldset>)}
 </div>}
 <details><summary>{uiText("高级 JSON（保留扩展字段）")}</summary><textarea aria-label={uiText("研究方向 JSON")} value={draft} onChange={e=>onChange(e.target.value)} rows={16}/></details>
 {!profile&&<p role="alert">{uiText("JSON 格式无效，请展开高级编辑修正。")}</p>}
 <button onClick={apply}>{uiText("应用编辑")}</button><button onClick={cancel}>{uiText("取消")}</button></section>;
}
