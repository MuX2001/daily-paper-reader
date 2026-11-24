import React,{useState} from 'react';
import prompt from '../../src/deep_read_prompt.txt?raw';

const presets=[
  {label:'DeepSeek 官方 · Pro（先测试这个）',model:'deepseek-v4-pro',url:'https://api.deepseek.com'},
  {label:'DeepSeek 官方 · Flash',model:'deepseek-flash',url:'https://api.deepseek.com'},
  {label:'硅基流动（自行选择模型）',model:'',url:'https://api.siliconflow.cn/v1'},
  {label:'OpenAI（自行选择兼容模型）',model:'',url:'https://api.openai.com/v1'},
  {label:'其他 OpenAI 兼容服务',model:'',url:''},
];
export function DeepReadSetup({repository}:{repository:string}) {
  const [preset,setPreset]=useState(0),[model,setModel]=useState(presets[0].model),[url,setURL]=useState(presets[0].url);
  const repo=/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)?repository:null;
  return <section aria-label="精读模型配置向导">
    <label>精读服务预设<select value={preset} onChange={e=>{const i=Number(e.target.value);setPreset(i);setModel(presets[i].model);setURL(presets[i].url);}}>{presets.map((p,i)=><option key={p.label} value={i}>{p.label}</option>)}</select></label>
    <label>DEEP_READ_MODEL<input value={model} onChange={e=>setModel(e.target.value)} placeholder="填服务控制台中的完整模型 ID"/></label>
    <label>DEEP_READ_BASE_URL<input value={url} onChange={e=>setURL(e.target.value)} placeholder="OpenAI Chat Completions 兼容地址"/></label>
    <p>上面是配置参考，选择后不会自动修改云端模型。请在 GitHub 仓库的 Actions Secrets 中分别保存这两个值，并添加 DEEP_READ_API_KEY（该服务的密钥）。</p>
    {repo?<a href={`https://github.com/${repo}/settings/secrets/actions`} target="_blank" rel="noreferrer">打开此仓库的 Secrets 设置</a>:<p>填写下方 GitHub 仓库名后可打开其 Secrets 设置。</p>}
    <p className="muted">每项点击 New repository secret，Name 填变量名，Secret 填对应值，再点 Add secret。API Key 不需要填在本页面。模型须支持 Chat Completions 与 JSON 输出；预设不代表已完成真实调用验证。</p>
    <details><summary>查看自动精读实际使用的提示词</summary><p className="muted">此模板与后端共用；长文先分段提取证据，再按此结构合成。修改模板会使旧生成缓存失效。</p><textarea aria-label="自动精读提示词" value={prompt} readOnly rows={10}/></details>
  </section>;
}
