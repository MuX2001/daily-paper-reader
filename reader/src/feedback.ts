import {repositoryLinks} from './repository.ts';
import {t as uiText} from './i18n/messages.ts';
export const feedbackTypes=['功能新增','BUG反馈','体验问题','论文 / 会议数据','其他'] as const;
export function feedbackDraft(types:string[],title:string,body:string,confirmed:boolean):string {
 const selected=feedbackTypes.filter(type=>types.includes(type));
 const cleanTitle=title.trim().replace(/\s+/g,' ').replace(/^\[[^\]]*\]\s*/u,'');
 if(!selected.length||!cleanTitle||!body.trim())throw new Error(uiText("请选择反馈类型，并填写标题和内容。"));
 if(!confirmed)throw new Error(uiText("请确认内容将公开发布。"));
 const params=new URLSearchParams({title:`[${selected.join('|')}] ${cleanTitle}`,body:body.trim()});
 return repositoryLinks().issues+'?'+params.toString();
}
