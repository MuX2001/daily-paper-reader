import {t} from '../i18n/messages';
import {seal} from './seal';
import sodiumURL from '../../../app/vendor/libsodium/0.7.10/dist/modules/libsodium.js?url';
import wrapperURL from '../../../app/vendor/libsodium-wrappers/0.7.9/dist/modules/libsodium-wrappers.js?url';
import type {GitHubConfig} from '../github';
export const permissionsMessage='当前 GitHub Token 缺少 Secrets: Read and write 权限（仅 config.yaml 非敏感配置可保存）。请编辑 Fine-grained PAT 勾选 Actions、Contents、Secrets 三项 Read and write 权限。';
const secretNames=['DEEPSEEK_API_KEY','TRIAGE_API_KEY','SILICONFLOW_API_KEY','RERANK_API_KEY'];
let loading:Promise<void>|undefined;
function script(url:string){return new Promise<void>((resolve,reject)=>{
  const el=document.createElement('script');el.src=url;el.onload=()=>resolve();el.onerror=()=>reject(new Error(t('未能加载密钥加密组件')));document.head.append(el);
});}
async function request(c:GitHubConfig,path:string,options:RequestInit={}){
  if(!/^[\w.-]+\/[\w.-]+$/.test(c.repository)||!c.token||c.ref!=='dev')throw new Error(t('请先保存仓库、dev 分支和 Token'));
  const r=await fetch('https://api.github.com/repos/'+c.repository+'/actions/secrets'+path,{...options,headers:{Authorization:'Bearer '+c.token,Accept:'application/vnd.github+json','Content-Type':'application/json'}});
  if(r.status===403)throw new Error(t(permissionsMessage));
  if(!r.ok)throw new Error(t('GitHub Secrets 请求失败 ({0})',r.status));
  return r;
}
export async function listSecrets(c:GitHubConfig){
  const dates:Record<string,string>={};
  for(let page=1;;page++){
    const {secrets}=await (await request(c,'?per_page=100&page='+page)).json();
    for(const entry of secrets)if(secretNames.includes(entry.name))dates[entry.name]=entry.updated_at.slice(0,10);
    if(secrets.length<100)return dates;
  }
}
export async function putSecret(c:GitHubConfig,name:string,value:string){
  if(!secretNames.includes(name)||!value.trim())throw new Error(t('无效的密钥字段'));
  const {key,key_id}=await (await request(c,'/public-key')).json();
  if(!window.sodium){
    loading??=script(sodiumURL).then(()=>script(wrapperURL)).catch(err=>{loading=undefined;throw err;});
    await loading;
  }
  if(!window.sodium)throw new Error(t('未能加载密钥加密组件'));
  const encrypted_value=await seal(window.sodium,key,value.trim());
  await request(c,'/'+name,{method:'PUT',body:JSON.stringify({encrypted_value,key_id})});
}
