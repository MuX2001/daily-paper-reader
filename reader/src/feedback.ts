export const feedbackTypes=['功能新增','BUG反馈','体验问题','论文 / 会议数据','其他'] as const;
export function feedbackDraft(types:string[],title:string,body:string,confirmed:boolean):string {
 const selected=feedbackTypes.filter(type=>types.includes(type));
 const cleanTitle=title.trim().replace(/\s+/g,' ').replace(/^\[[^\]]*\]\s*/u,'');
 if(!selected.length||!cleanTitle||!body.trim())throw new Error('请选择反馈类型，并填写标题和内容。');
 if(!confirmed)throw new Error('请确认内容将公开发布。');
 const params=new URLSearchParams({title:`[${selected.join('|')}] ${cleanTitle}`,body:body.trim()});
 // Preserve the project's existing feedback destination. The user reviews and
 // submits on GitHub; the reader does not request a token or publish an issue.
 return 'https://github.com/ziwenhahaha/daily-paper-reader/issues/new?'+params.toString();
}
