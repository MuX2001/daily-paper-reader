export interface GitHubConfig { repository: string; ref: string; token: string }
export interface DeepTask { requestId: string; paperId: string; status: 'queued'|'running'|'succeeded'|'failed'; runId?: number; url?: string; error?: string }
function endpoint(config: GitHubConfig) {
  if(!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(config.repository)) throw new Error('请输入 owner/repository 格式的仓库名');
  if(!config.token || !config.ref.trim()) throw new Error('请填写 GitHub Token 和运行分支');
  return `https://api.github.com/repos/${config.repository}`;
}
async function request(config:GitHubConfig,path:string,body?:unknown) {
  const response=await fetch(endpoint(config)+path,{method:body?'POST':'GET',headers:{'Accept':'application/vnd.github+json','Authorization':`Bearer ${config.token}`,'X-GitHub-Api-Version':'2022-11-28',...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
  if(!response.ok)throw new Error(`GitHub 请求失败 (${response.status})，请检查仓库、分支与 Actions 权限`);
  return response.status===204?null:response.json();
}
export async function dispatchDeepRead(config:GitHubConfig,paperId:string):Promise<DeepTask>{
  if(!/^(?:\d{4}\.\d{4,5}|[A-Za-z.-]+\/\d{7})v[1-9]\d*$/.test(paperId))throw new Error('精读需要明确 arXiv 版本；不会自动替换为最新版本');
  const requestId=crypto.randomUUID();
  const data=await request(config,'/actions/workflows/deep-read.yml/dispatches',{ref:config.ref,inputs:{arxiv_id:paperId,request_id:requestId}});
  return {requestId,paperId,status:'queued',...(data?.workflow_run_id?{runId:data.workflow_run_id,url:data.html_url}:{})};
}
export async function pollDeepRead(config:GitHubConfig,task:DeepTask):Promise<DeepTask>{
  let run;
  if(task.runId)run=await request(config,`/actions/runs/${task.runId}`);
  else {
    const data=await request(config,`/actions/workflows/deep-read.yml/runs?event=workflow_dispatch&branch=${encodeURIComponent(config.ref)}&per_page=100`);
    run=data.workflow_runs.find((r:{display_title:string})=>r.display_title.includes(task.requestId));
  }
  if(!run)return task;
  const status=run.status==='completed'?(run.conclusion==='success'?'succeeded':'failed'):(run.status==='in_progress'?'running':'queued');
  return {...task,status,runId:run.id,url:run.html_url,...(status==='failed'?{error:`GitHub Actions: ${run.conclusion}，请查看运行日志`}:{})};
}
