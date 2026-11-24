import React,{useRef,useState} from 'react';
import {safeURL,type Paper} from './domain';
import {noteFilename} from './notes';
import {readingMaterial,readingPrompt} from './readingMaterial';

export function ReadingMaterial({paper,personalNote}:{paper:Paper;personalNote:string}) {
  const [message,setMessage]=useState('');
  const field=useRef<HTMLTextAreaElement>(null);
  const pdf=safeURL(paper.pdf_url),original=safeURL(paper.url);
  const prompt=readingPrompt(paper);
  return <section aria-label="聊天客户端精读">
    <h3>交给聊天客户端精读</h3>
    <p className="muted">打开原文下载 PDF，附到你常用的聊天客户端，再粘贴精读提示词。无需配置本站 API。</p>
    <div className="export-actions">
      {(pdf||original)&&<a href={pdf||original} target="_blank" rel="noreferrer">{pdf?'打开论文 PDF':'打开原文页面'}</a>}
      <button onClick={async()=>{try{await navigator.clipboard.writeText(prompt);setMessage('精读提示词已复制，请同时附上对应版本的论文 PDF。');}catch{field.current?.focus();field.current?.select();setMessage('浏览器未允许复制，已选中提示词，请按 Ctrl+C（Mac：⌘C）。');}}}>复制精读提示词</button>
      <button onClick={()=>{const href=URL.createObjectURL(new Blob([readingMaterial(paper,personalNote)],{type:'text/markdown;charset=utf-8'}));const a=document.createElement('a');a.href=href;a.download=noteFilename(paper)+'-reading-material.md';a.click();setTimeout(()=>URL.revokeObjectURL(href),1000);setMessage('已下载精读材料，内含提示词、论文信息和当前笔记；请另外附上 PDF 全文。');}}>下载精读材料</button>
    </div>
    {!pdf&&!original&&<p>此条目缺少原文链接，请按论文标题查找并核对版本。</p>}
    <label>精读提示词<textarea ref={field} readOnly rows={5} value={prompt}/></label>
    <p className="muted">下载的是准备材料，不含 PDF 全文，也不是模型生成的深度笔记。</p>
    {message&&<p role="status">{message}</p>}
  </section>;
}
