import {useState} from 'react';
import prompt from '../../../src/deep_read_prompt.txt?raw';
import {repoURL} from './validation';
import {readSetting,storeValues} from './config';
import {errorMessage} from '../errors';
const presets=[{name:'DeepSeek 官方 · Pro',model:'deepseek-v4-pro',url:'https://api.deepseek.com'},{name:'DeepSeek 官方 · Flash',model:'deepseek-flash',url:'https://api.deepseek.com'},{name:'硅基流动',model:'',url:'https://api.siliconflow.cn/v1'},{name:'OpenAI',model:'',url:'https://api.openai.com/v1'},{name:'自定义',model:'',url:''}];
const preferenceKey='dpr.deep_read.reference';
function loadReference(){
 try{const value=JSON.parse(readSetting(preferenceKey)||'null');const index=presets.findIndex(p=>p.name===value?.preset);
 if(index>=0&&typeof value.model==='string'&&typeof value.url==='string')return {index,model:index<2?presets[index].model:value.model,url:index<2?presets[index].url:value.url};
 }catch{/* invalid preferences use the initial reference */}
 return {index:0,model:presets[0].model,url:presets[0].url};
}
export function DeepReadReference({repository,branch}:{repository:string;branch:string}){
 const [reference,setReference]=useState(loadReference),[message,setMessage]=useState(''),[saveError,setSaveError]=useState('');
 const {index,model,url}=reference;
 function remember(next:typeof reference){
  setReference(next);
  try{storeValues({[preferenceKey]:JSON.stringify({preset:presets[next.index].name,model:next.model,url:next.url})});setSaveError('');}
  catch(e){setSaveError(errorMessage(e));}
 }
 let repo='';try{repo=repoURL(repository);}catch{/* disabled link */}
 async function copy(value:string){try{await navigator.clipboard.writeText(value);setMessage('已复制');}catch{setMessage('浏览器未允许复制，请选中文字手动复制。');}}
 return <><section className="settings-card"><h3>GitHub Secrets 配置助手 <small>本机记住选择 · 云端模型以 Secrets 为准</small></h3><p className="settings-info">精读自动复用仓库已有的 DEEPSEEK_API_KEY，无需重复创建密钥。论文页的“精读模型”下拉框决定本次使用 Flash、Pro 或云端配置。下方仅供其他服务或专用密钥配置参考。</p>
 <label>精读服务预设<select value={index} onChange={e=>{const i=Number(e.target.value);remember({index:i,model:presets[i].model,url:presets[i].url});}}>{presets.map((p,i)=><option value={i} key={p.name}>{p.name}</option>)}</select></label>
 {saveError?<p role="alert" className="settings-result failure">未能记住此选择：{saveError}</p>:<p className="muted">选择和参考值自动保存在当前浏览器，重新打开或刷新后保留。不是云端配置回读。</p>}
 {index>=2&&<div><label>参考模型 ID<input value={model} onChange={e=>remember({...reference,model:e.target.value})}/></label><label>参考 Base URL<input value={url} onChange={e=>remember({...reference,url:e.target.value})}/></label></div>}
 <div className="settings-variables">{[['DEEP_READ_MODEL',model],['DEEP_READ_BASE_URL',url],['DEEP_READ_API_KEY','填写该服务商的 API Key']].map(([name,value])=><div key={name}><code>{name}</code><button onClick={()=>void copy(name)} aria-label={`复制 ${name} 变量名`}>复制变量名</button><code>{value||'尚未填写'}</code>{name!=='DEEP_READ_API_KEY'&&<button disabled={!value} onClick={()=>void copy(value)} aria-label={`复制 ${name} 值`}>复制值</button>}</div>)}</div>
 {repo?<a href={`${repo}/settings/secrets/actions`} target="_blank" rel="noreferrer">前往 GitHub Secrets 配置 ↗</a>:<p>请先填写有效的 GitHub 仓库名。</p>}<p className="muted">如果仓库还没有密钥：打开上方链接，点 New repository secret，Name 填 DEEPSEEK_API_KEY，Secret 粘贴 DeepSeek 密钥，再点 Add secret。网页聊天密钥不会自动上传。</p></section>
 <details className="settings-card"><summary>查看当前精读提示词（只读）</summary><div className="settings-actions"><button onClick={()=>void copy(prompt)}>复制提示词</button>{repo&&branch&&<a href={`${repo}/blob/${encodeURIComponent(branch)}/src/deep_read_prompt.txt`} target="_blank" rel="noreferrer">在 GitHub 查看源文件 ↗</a>}</div><p className="muted">与后端共用此模板；长文先分段提取证据再合成。</p><textarea aria-label="自动精读提示词" value={prompt} readOnly rows={12} className="settings-prompt"/></details>{message&&<p role="status">{message}</p>}</>;
}
