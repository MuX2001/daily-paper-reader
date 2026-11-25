import {t as uiText} from './i18n/messages.ts';
import {useEffect,useRef,useState} from 'react';
import type {Paper} from './domain';

import {readingPrompt} from './readingMaterial';
import {readSetting,storeValues} from './settings/config';
import {errorMessage} from './errors';
function PromptEditor({value,reset,save,close}:{value:string;reset:string;save:(v:string)=>void;close:()=>void}){
 const [draft,setDraft]=useState(value),[error,setError]=useState('');const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const previous=document.activeElement as HTMLElement|null;ref.current?.showModal();return()=>{ref.current?.close();previous?.focus();};},[]);
 return <dialog className="modal prompt-editor" ref={ref} onCancel={e=>{e.preventDefault();close();}} aria-labelledby="prompt-title"><div className="modal-heading"><h2 id="prompt-title">{uiText("编辑精读提示词")}</h2><button aria-label={uiText("关闭提示词编辑")} onClick={close}>×</button></div><p>{uiText("复制精读包时会使用这里保存的提示词。")}</p><label htmlFor="reading-prompt-draft">{uiText("精读提示词")}</label><textarea id="reading-prompt-draft" autoFocus rows={16} value={draft} onChange={e=>setDraft(e.target.value)}/>{error&&<p role="alert">{error}</p>}<div className="reading-actions"><button onClick={()=>setDraft(reset)}>{uiText("恢复默认提示词")}</button><button onClick={close}>{uiText("取消")}</button><button className="primary" onClick={()=>{try{if(!draft.trim())throw new Error(uiText("提示词不能为空"));save(draft);close();}catch(e){setError(errorMessage(e));}}}>{uiText("保存提示词")}</button></div></dialog>;
}
export function ReadingMaterial({paper}:{paper:Paper}) {
 const storageKey=`dpr.reading.prompt.${paper.paper_key}`;
 const [editing,setEditing]=useState(false);
 return <><button className="secondary-start" onClick={()=>setEditing(true)}>{uiText("编辑提示词")}</button>{editing&&<PromptEditor value={readSetting(storageKey)||readingPrompt(paper)} reset={readingPrompt(paper)} save={value=>{storeValues({[storageKey]:value});setEditing(false);}} close={()=>setEditing(false)}/>}</>;
}
