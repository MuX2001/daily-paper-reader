import {t as uiText} from '../i18n/messages.ts';
import type {SettingsConfig} from './config';
import {errorMessage} from '../errors';
export function repoURL(repository:string){if(!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository))throw new Error(uiText("仓库请填写 owner/repository，不包含网址"));return `https://github.com/${repository}`;}
async function jsonRequest(url:string,options:RequestInit,secrets:string[]=[]){
 let response:Response;try{response=await fetch(url,{...options,signal:AbortSignal.timeout(20000)});}catch(e){throw new Error(e instanceof DOMException&&e.name==='TimeoutError'?uiText("连接超时，请稍后重试"):uiText("网络请求失败，可能是网络或浏览器跨域限制；请检查服务地址。"));}
 const data=await response.json().catch(()=>null);
 if(!response.ok){let detail=errorMessage(data?.error||data||uiText("服务未提供错误详情"));for(const secret of secrets)if(secret)detail=detail.replaceAll(secret,uiText("[已隐藏]"));throw new Error(uiText("请求失败 ({0})：{1}", response.status, detail.slice(0,500)));}return data;
}
export async function testChat(c:SettingsConfig){
 let url:URL;try{url=new URL(c.endpoint);}catch{throw new Error(uiText("模型地址格式无效"));}
 if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash)throw new Error(uiText("模型端点必须是无凭据和查询参数的 HTTPS 地址"));
 if(!c.apiKey.trim()||!c.model.trim())throw new Error(uiText("请填写模型 ID 和 API Key"));
 const data=await jsonRequest(c.endpoint.replace(/\/$/,'').replace(/\/chat\/completions$/,'')+'/chat/completions',{method:'POST',headers:{Authorization:`Bearer ${c.apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({model:c.model,messages:[{role:'user',content:'Reply with OK only.'}],max_tokens:32,stream:false,...(url.hostname==='api.deepseek.com'?{thinking:{type:'disabled'}}:{})})},[c.apiKey]);
 if(typeof data?.choices?.[0]?.message?.content!=='string'||!data.choices[0].message.content.trim())throw new Error(uiText("连接可达，但未收到有效模型回答"));
 return uiText("模型已返回有效回答。测试没有保存设置。");
}
export async function testGithub(c:SettingsConfig){
 repoURL(c.repository);if(!c.token.trim()||!c.branch.trim())throw new Error(uiText("请填写任务分支和 GitHub Token"));
 const options={headers:{Authorization:`Bearer ${c.token}`,Accept:'application/vnd.github+json'}};
 await jsonRequest('https://api.github.com/user',options,[c.token]);
 const base=`https://api.github.com/repos/${c.repository}`;
 await jsonRequest(base,options,[c.token]);await jsonRequest(`${base}/branches/${encodeURIComponent(c.branch)}`,options,[c.token]);
 const workflow=await jsonRequest(`${base}/actions/workflows/daily-paper-reader.yml`,options,[c.token]);
 if(workflow?.state!=='active')throw new Error(uiText("工作流尚未启用，请到 GitHub Actions 检查"));
 return uiText("身份、仓库、分支和工作流可访问。Actions 写权限需实际研究任务确认；未触发任务。");
}
