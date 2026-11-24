import {errorMessage} from './errors';
import {useEffect,useRef,useState} from 'react';
import type {Paper} from './domain';
import {chat,paperContext,type ChatConfig,type ChatMessage,type PaperContext} from './chat';
export function ChatPanel({paper,config,configure}:{paper:Paper;config:ChatConfig;configure:()=>void}){
  const [context,setContext]=useState<PaperContext|null>(null),[messages,setMessages]=useState<ChatMessage[]>([]);
  const [question,setQuestion]=useState(''),[answer,setAnswer]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const active=useRef<AbortController|null>(null);
  useEffect(()=>{const controller=new AbortController();paperContext(paper,controller.signal).then(setContext).catch(e=>{if(!controller.signal.aborted)setError(errorMessage(e));});return()=>{controller.abort();active.current?.abort();};},[paper.paper_key,paper.fulltext_path]);
  async function send(){
    if(!config.apiKey){configure();return;}
    if(!context||!question.trim()||busy)return;
    const controller=new AbortController();active.current=controller;setBusy(true);setError('');setAnswer('');
    const next:ChatMessage[]=[...messages,{role:'user',content:question.trim()}];
    try{const response=await chat(config,context,next,setAnswer,controller.signal);setMessages([...next,{role:'assistant',content:response}]);setQuestion('');setAnswer('');}
    catch(e){setError(controller.signal.aborted?'已停止；未完成的回答不加入对话。':errorMessage(e));setAnswer('');}
    finally{setBusy(false);active.current=null;}
  }
  return <section className="chat-panel"><h3>与论文对话</h3><p className="context-status">{!context?'正在检查全文…':context.fulltext?`已载入指定版本全文 · ${context.content.length.toLocaleString()} 字符`:'仅标题与摘要 · 未载入完整论文'}</p>{context?.reason&&<p className="muted">{context.reason}</p>}<div className="chat-history" aria-live="polite">{messages.map((m,i)=><div className={'chat-message '+m.role} key={i}><strong>{m.role==='user'?'你':'AI'}</strong><p>{m.content}</p></div>)}{answer&&<div className="chat-message assistant"><strong>AI · 正在生成</strong><p>{answer}</p></div>}</div>{error&&<p role="alert" className="chat-error">{error}</p>}<textarea aria-label="向论文提问" placeholder="这篇论文的核心假设是什么？" value={question} onChange={e=>setQuestion(e.target.value)} rows={3}/><div className="chat-controls"><button className="primary" disabled={!context||busy||!question.trim()} onClick={()=>void send()}>发送问题</button>{busy&&<button onClick={()=>active.current?.abort()}>停止</button>}<button disabled={busy||!messages.length} onClick={()=>setMessages([])}>清空对话</button></div><p className="muted">对话仅保留在当前页面；切换论文会清空。问题将发送到你配置的模型端点。</p></section>;
}
