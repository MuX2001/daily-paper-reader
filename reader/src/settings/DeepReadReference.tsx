import {useState} from 'react';
import prompt from '../../../src/deep_read_prompt.txt?raw';
import {repoURL} from './validation';
const presets=[{name:'DeepSeek 官方 · Pro',model:'deepseek-v4-pro',url:'https://api.deepseek.com'},{name:'DeepSeek 官方 · Flash',model:'deepseek-flash',url:'https://api.deepseek.com'},{name:'硅基流动',model:'',url:'https://api.siliconflow.cn/v1'},{name:'OpenAI',model:'',url:'https://api.openai.com/v1'},{name:'自定义',model:'',url:''}];
export function DeepReadReference({repository,branch}:{repository:string;branch:string}){
 const [index,setIndex]=useState(0),[model,setModel]=useState(presets[0].model),[url,setURL]=useState(presets[0].url),[message,setMessage]=useState('');
 let repo='';try{repo=repoURL(repository);}catch{/* disabled link */}
 async function copy(value:string){try{await navigator.clipboard.writeText(value);setMessage('已复制');}catch{setMessage('浏览器未允许复制，请选中文字手动复制。');}}
 return <><section className="settings-card"><h3>云端模型配置 <small>在 GitHub 仓库中生效</small></h3><p className="settings-info">这里只提供配置参考，网页不会修改 GitHub Secrets。请复制变量到仓库中保存。</p>
 <label>精读服务预设<select value={index} onChange={e=>{const i=Number(e.target.value);setIndex(i);setModel(presets[i].model);setURL(presets[i].url);}}>{presets.map((p,i)=><option value={i} key={p.name}>{p.name}</option>)}</select></label>
 {index>=2&&<div><label>参考模型 ID<input value={model} onChange={e=>setModel(e.target.value)}/></label><label>参考 Base URL<input value={url} onChange={e=>setURL(e.target.value)}/></label></div>}
 <div className="settings-variables">{[['DEEP_READ_MODEL',model],['DEEP_READ_BASE_URL',url],['DEEP_READ_API_KEY','填写该服务商的 API Key']].map(([name,value])=><div key={name}><code>{name}</code><button onClick={()=>void copy(name)} aria-label={`复制 ${name} 变量名`}>复制变量名</button><code>{value||'尚未填写'}</code>{name!=='DEEP_READ_API_KEY'&&<button disabled={!value} onClick={()=>void copy(value)} aria-label={`复制 ${name} 值`}>复制值</button>}</div>)}</div>
 {repo?<a href={`${repo}/settings/secrets/actions`} target="_blank" rel="noreferrer">前往 GitHub Secrets 配置 ↗</a>:<p>请先填写有效的 GitHub 仓库名。</p>}<p className="muted">云端 Secrets 是否有效，需要实际精读任务验证。</p></section>
 <details className="settings-card"><summary>查看当前精读提示词（只读）</summary><div className="settings-actions"><button onClick={()=>void copy(prompt)}>复制提示词</button>{repo&&branch&&<a href={`${repo}/blob/${encodeURIComponent(branch)}/src/deep_read_prompt.txt`} target="_blank" rel="noreferrer">在 GitHub 查看源文件 ↗</a>}</div><p className="muted">与后端共用此模板；长文先分段提取证据再合成。</p><textarea aria-label="自动精读提示词" value={prompt} readOnly rows={12} className="settings-prompt"/></details>{message&&<p role="status">{message}</p>}</>;
}
