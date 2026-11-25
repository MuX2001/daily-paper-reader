import {t as uiText} from './i18n/messages.ts';
import {errorMessage} from './errors';
import {useEffect,useRef,useState} from 'react';
import type {Paper} from './domain';
import {chat,paperContext,type ChatConfig,type ChatMessage,type PaperContext} from './chat';
export function ChatPanel({paper,config,configure,messages,save,close}:{messages:ChatMessage[];save:(m:ChatMessage[])=>void;close:()=>void;paper:Paper;config:ChatConfig;configure:()=>void}){
  const [context,setContext]=useState<PaperContext|null>(null);
  const [question,setQuestion]=useState(''),[answer,setAnswer]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const active=useRef<AbortController|null>(null);
  useEffect(()=>{const controller=new AbortController();paperContext(paper,controller.signal).then(setContext).catch(e=>{if(!controller.signal.aborted)setError(errorMessage(e));});return()=>{controller.abort();active.current?.abort();};},[paper.paper_key,paper.fulltext_path]);
  async function send(){
    if(!config.apiKey){configure();return;}
    if(!context||!question.trim()||busy)return;
    const controller=new AbortController();active.current=controller;setBusy(true);setError('');setAnswer('');
    const next:ChatMessage[]=[...messages,{role:'user',content:question.trim()}];
    try{const response=await chat(config,context,next,setAnswer,controller.signal);if(controller.signal.aborted)return;save([...next,{role:'assistant',content:response}]);setQuestion('');setAnswer('');}
    catch(e){setError(controller.signal.aborted?uiText("已停止；未完成的回答不加入对话。"):errorMessage(e));setAnswer('');}
    finally{setBusy(false);active.current=null;}
  }
  return <aside className="chat-panel split-chat"><header><h3>{uiText("AI 问答")}</h3><button title={uiText("清空对话")} aria-label={uiText("清空对话")} disabled={busy||!messages.length} onClick={()=>save([])}>⌫</button><button aria-label={uiText("关闭问答")} onClick={close}>× <kbd>Esc</kbd></button></header><strong className="chat-title" title={paper.title}>{paper.title}</strong>{!config.apiKey&&<div><p>{uiText("请先配置聊天 API Key。")}</p><button onClick={configure}>{uiText("前往设置配置")}</button></div>}<div className="chat-suggestions">{[uiText("追问核心公式细节"),uiText("实验基线公平吗？"),uiText("复现有什么坑？")].map(q=><button key={q} onClick={()=>setQuestion(q)}>{q}</button>)}</div><p className="context-status">{!context?uiText("正在检查全文…"):context.fulltext?uiText("已载入指定版本全文 · {0} 字符", context.content.length.toLocaleString()):uiText("标题、摘要与缓存总结 · 未载入全文")}</p>{context?.reason&&<p className="muted">{context.reason}</p>}<div className="chat-history" aria-live="polite">{messages.map((m,i)=><div className={'chat-message '+m.role} key={i}><strong>{m.role==='user'?uiText("你"):'AI'}</strong><p>{m.content}</p></div>)}{answer&&<div className="chat-message assistant"><strong>{uiText("AI · 正在生成")}</strong><p>{answer}</p></div>}</div>{error&&<p role="alert" className="chat-error">{error}</p>}<textarea aria-label={uiText("向论文提问")} placeholder={uiText("这篇论文的核心假设是什么？")} value={question} onChange={e=>setQuestion(e.target.value)} rows={3}/><div className="chat-controls"><button className="primary" disabled={!context||busy||!question.trim()} onClick={()=>void send()}>{uiText("发送问题")}</button>{busy&&<button onClick={()=>active.current?.abort()}>{uiText("停止")}</button>}</div><p className="muted">{uiText("每篇论文的对话保存在当前页面。问题将发送到你配置的模型端点。")}</p></aside>;
}
