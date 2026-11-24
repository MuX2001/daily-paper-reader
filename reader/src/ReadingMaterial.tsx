import React,{useEffect,useRef,useState} from 'react';
import {safeURL,type Paper} from './domain';
import {noteFilename} from './notes';
import {readingMaterial,readingPrompt} from './readingMaterial';
import {readSetting,storeValues} from './settings/config';
import {errorMessage} from './errors';
function PromptEditor({value,reset,save,close}:{value:string;reset:string;save:(v:string)=>void;close:()=>void}){
 const [draft,setDraft]=useState(value),[error,setError]=useState('');const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const previous=document.activeElement as HTMLElement|null;ref.current?.showModal();return()=>{ref.current?.close();previous?.focus();};},[]);
 return <dialog className="modal prompt-editor" ref={ref} onCancel={e=>{e.preventDefault();close();}} aria-labelledby="prompt-title"><div className="modal-heading"><h2 id="prompt-title">编辑精读提示词</h2><button aria-label="关闭提示词编辑" onClick={close}>×</button></div><p>用于交给聊天客户端的提示词，保存后复制和材料下载都会使用此版本。云端精读仍使用仓库模板。</p><label htmlFor="reading-prompt-draft">精读提示词</label><textarea id="reading-prompt-draft" autoFocus rows={16} value={draft} onChange={e=>setDraft(e.target.value)}/>{error&&<p role="alert">{error}</p>}<div className="reading-actions"><button onClick={()=>setDraft(reset)}>恢复默认提示词</button><button onClick={close}>取消</button><button className="primary" onClick={()=>{try{if(!draft.trim())throw new Error('提示词不能为空');save(draft);close();}catch(e){setError(errorMessage(e));}}}>保存提示词</button></div></dialog>;
}
export function ReadingMaterial({paper,personalNote}:{paper:Paper;personalNote:string}) {
 const storageKey=`dpr.reading.prompt.${paper.paper_key}`;
 const [message,setMessage]=useState(''),[editing,setEditing]=useState(false),[prompt,setPrompt]=useState(()=>readSetting(storageKey)||readingPrompt(paper));
 const pdf=safeURL(paper.pdf_url),original=safeURL(paper.url);
 return <section aria-label="聊天客户端精读"><h3>交给聊天客户端精读</h3><p className="muted">打开原文下载 PDF，附到你常用的聊天客户端，再粘贴精读提示词。无需配置本站 API。</p><div className="reading-actions">
 {(pdf||original)&&<a href={pdf||original} target="_blank" rel="noreferrer">{pdf?'打开论文 PDF':'打开原文页面'}</a>}
 <button onClick={()=>setEditing(true)}>编辑精读提示词</button>
 <button onClick={async()=>{try{await navigator.clipboard.writeText(prompt);setMessage('精读提示词已复制，请同时附上对应版本的论文 PDF。');}catch{setEditing(true);setMessage('浏览器未允许复制，请在编辑框中手动复制。');}}}>复制精读提示词</button>
 <button onClick={()=>{const href=URL.createObjectURL(new Blob([readingMaterial(paper,personalNote,prompt)],{type:'text/markdown;charset=utf-8'}));const a=document.createElement('a');a.href=href;a.download=noteFilename(paper)+'-reading-material.md';a.click();setTimeout(()=>URL.revokeObjectURL(href),1000);setMessage('已下载精读材料，包含当前提示词；请另外附上 PDF 全文。');}}>下载精读材料</button></div>
 {!pdf&&!original&&<p>此条目缺少原文链接，请按论文标题查找并核对版本。</p>}
 <p className="muted">准备材料不含 PDF 全文，也不是已生成的深度笔记。</p>{message&&<p role="status">{message}</p>}
 {editing&&<PromptEditor value={prompt} reset={readingPrompt(paper)} save={value=>{storeValues({[storageKey]:value});setPrompt(value);setMessage('此篇提示词已保存，复制和下载均使用修改后的内容。');}} close={()=>setEditing(false)}/>}
 </section>;
}
