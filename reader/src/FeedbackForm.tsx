import {t as uiText} from './i18n/messages.ts';
import {useState} from 'react';
import {feedbackTypes,feedbackDraft} from './feedback';
export function FeedbackForm(){
 const [types,setTypes]=useState<string[]>([]),[title,setTitle]=useState(''),[body,setBody]=useState(''),[confirmed,setConfirmed]=useState(false),[error,setError]=useState('');
 return <form className="feedback-form" onSubmit={event=>{event.preventDefault();try{const url=feedbackDraft(types,title,body,confirmed);window.open(url,'_blank','noopener,noreferrer');setError('');}catch(e){setError(String(e));}}}>
 <fieldset><legend>{uiText("反馈类型（可多选）")}</legend>{feedbackTypes.map(type=><label key={type}><input type="checkbox" checked={types.includes(type)} onChange={event=>setTypes(old=>event.target.checked?[...old,type]:old.filter(t=>t!==type))}/>{uiText(type)}</label>)}</fieldset>
 <label>{uiText("标题")}<input value={title} maxLength={180} onChange={event=>setTitle(event.target.value)}/></label>
 <label>{uiText("反馈内容")}<textarea value={body} rows={7} maxLength={6000} onChange={event=>setBody(event.target.value)}/></label>
 <label className="public-confirm"><input type="checkbox" checked={confirmed} onChange={event=>setConfirmed(event.target.checked)}/>{uiText("我已知晓：提交后，内容将以我的 GitHub 身份公开发布。")}</label>
 {error&&<p role="alert">{error}</p>}<p className="muted">{uiText("将打开 GitHub 草稿页，由你检查后提交。")}</p><button className="primary" type="submit">{uiText("前往 GitHub 检查反馈")}</button></form>;
}
