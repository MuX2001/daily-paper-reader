import {Fragment,useEffect,useRef,type ReactNode} from 'react';

type MathRenderer={render:(tex:string,node:HTMLElement,options:Record<string,unknown>)=>void};
declare global {interface Window {katex?:MathRenderer}}
let loading:Promise<MathRenderer>|undefined;
function loadMath(){
  if(window.katex)return Promise.resolve(window.katex);
  if(!loading)loading=new Promise<MathRenderer>((resolve,reject)=>{
    const base='./app/vendor/katex/0.16.9/dist/';
    if(!document.querySelector('link[data-reader-math]')){
      const css=document.createElement('link');css.rel='stylesheet';css.href=base+'katex.min.css';
      css.dataset.readerMath='';document.head.append(css);
    }
    const script=document.createElement('script');script.src=base+'katex.min.js';
    script.onload=()=>window.katex?resolve(window.katex):reject(Error('KaTeX unavailable'));
    script.onerror=()=>{loading=undefined;script.remove();reject(Error('KaTeX unavailable'));};
    document.head.append(script);
  });
  return loading;
}
function Formula({tex,display}:{tex:string;display:boolean}){
  const ref=useRef<HTMLSpanElement>(null);
  useEffect(()=>{
    let active=true;
    loadMath().then(engine=>{
      if(active&&ref.current)engine.render(tex,ref.current,{displayMode:display,trust:false,throwOnError:false,maxExpand:500});
    }).catch(()=>{if(active&&ref.current)ref.current.textContent=tex;});
    return ()=>{active=false;};
  },[tex,display]);
  return <span className={display?'display-formula':'inline-formula'} ref={ref}>{tex}</span>;
}
function inline(text:string){
  const pattern=/(`+[^`\n]*`+|\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|(?<!\\)\$(?!\s)[^$\n]+?(?<!\\)\$|\*\*[^*\n]+\*\*)/g;
  return text.split(pattern).map((part,i)=>{
    if(i%2===0)return part;
    if(part.startsWith('`'))return <code key={i}>{part.replace(/^`+|`+$/g,'')}</code>;
    if(part.startsWith('**'))return <strong key={i}>{part.slice(2,-2)}</strong>;
    const display=part.startsWith('$$')||part.startsWith('\\[');
    const n=display||part.startsWith('\\(')?2:1;
    return <Formula key={i} tex={part.slice(n,-n)} display={display}/>;
  });
}

// Blocks are rendered as React text nodes. Fences and display math consume
// their entire block before list markers or Markdown emphasis are interpreted.
export function PaperText({text}:{text:string}){
  const lines=text.replace(/\r\n/g,'\n').split('\n'),blocks:ReactNode[]=[];
  let i=0;
  const list=/^\s*(?:(\d+)[.)、]|([-*+]))\s+(.+)/;
  while(i<lines.length){
    const start=i,line=lines[i++];if(!line.trim())continue;
    const fence=line.match(/^\s*(`{3,}|~{3,})/);
    if(fence){
      const contents=[];
      while(i<lines.length&&!lines[i].trimStart().startsWith(fence[1]))contents.push(lines[i++]);
      if(i<lines.length)i++;
      blocks.push(<pre key={start}><code>{contents.join('\n')}</code></pre>);continue;
    }
    const opener=line.trimStart().match(/^(\$\$|\\\[)/);
    if(opener){
      const close=opener[1]==='$$'?'$$':'\\]';let content=line.trimStart().slice(2);
      while(i<lines.length&&!content.includes(close))content+='\n'+lines[i++];
      const end=content.indexOf(close);
      blocks.push(end<0?<p key={start}>{opener[1]+content}</p>:
        <div key={start}><Formula tex={content.slice(0,end)} display/>{inline(content.slice(end+2))}</div>);
      continue;
    }
    if(/^\s*1[)）、]/.test(line)&&!/[\x60$\\]/.test(line)){
      const parts=line.split(/[；;]\s*(?=\d+[)）、])/);
      if(parts.length>1&&parts.every((s,k)=>s.trimStart().match(/^(\d+)[)）、]/)?.[1]===String(k+1))){
        blocks.push(<ol key={start}>{parts.map((v,k)=><li key={k}>{inline(v.replace(/^\s*\d+[)）、]\s*/,''))}</li>)}</ol>);
        continue;
      }
    }
    const item=line.match(list);
    if(item){
      const Tag=item[1]?'ol':'ul';
      const items=[item[3]];
      while(i<lines.length){
        const next=lines[i].match(list);
        if(!next||Boolean(next[1])!==Boolean(item[1]))break;
        items.push(next[3]);i++;
      }
      blocks.push(<Tag key={start} start={item[1]?Number(item[1]):undefined}>{items.map((v,k)=><li key={k}>{inline(v)}</li>)}</Tag>);continue;
    }
    const paragraph=[line];
    while(i<lines.length&&lines[i].trim()&&!list.test(lines[i])&&!/^\s*(?:`{3}|~{3}|\$\$|\\\[)/.test(lines[i]))paragraph.push(lines[i++]);
    blocks.push(<p key={start}>{inline(paragraph.join('\n'))}</p>);
  }
  return <Fragment>{blocks}</Fragment>;
}
