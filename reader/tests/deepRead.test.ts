import {test} from 'node:test';
import assert from 'node:assert/strict';
import {dispatchDeepRead,pollDeepRead,recoverDeepRead} from '../src/deepRead.ts';
const config={repository:'owner/repo',ref:'dev',token:'test-token'};
test('dispatch exact version then correlate 204 response by request id',async()=>{
 const original=globalThis.fetch;let body:Record<string,any>={};
 try{
  globalThis.fetch=async (_url,options)=>{body=JSON.parse(String(options?.body));return new Response(null,{status:204});};
  const task=await dispatchDeepRead(config,'1706.03762v7');
  assert.equal(body.inputs.arxiv_id,'1706.03762v7');assert.equal(body.inputs.request_id,task.requestId);
  globalThis.fetch=async()=>Response.json({workflow_runs:[{id:9,display_title:'Other request',status:'completed',conclusion:'success'},{id:10,display_title:`Deep read ${task.requestId} · 1706.03762v7`,status:'in_progress',html_url:'https://github.com/owner/repo/actions/runs/10'}]});
  const fetchRun=globalThis.fetch;globalThis.fetch=async(url,options)=>{assert.ok(String(url).startsWith('https://api.github.com/repos/owner/repo/'));assert.ok(String(url).includes('branch=dev'));return fetchRun(url,options);};
  const running=await pollDeepRead({...config,repository:'other/repo',ref:'main'},task);assert.equal(running.runId,10);assert.equal(running.status,'running');
  globalThis.fetch=async()=>Response.json({id:10,status:'completed',conclusion:'failure',html_url:running.url});
  assert.equal((await pollDeepRead(config,running)).status,'failed');
 }finally{globalThis.fetch=original;}
});
test('unversioned ids fail before network access',async()=>{
 await assert.rejects(()=>dispatchDeepRead(config,'1706.03762'),/明确 arXiv 版本/);
});

test('recovery searches bounded pages by exact version and branch without dispatching',async()=>{
 const original=globalThis.fetch;let calls=0;
 try{
  globalThis.fetch=async(url,options)=>{
   assert.equal(options?.method,'GET');calls++;
   if(calls===1)return Response.json({workflow_runs:Array.from({length:100},()=>({display_title:'Deep read request_001 · 1706.03762v6',head_branch:'dev'}))});
   assert.ok(String(url).includes('page=2'));
   return Response.json({workflow_runs:[{id:22,display_title:'Deep read request_002 · 1706.03762v7',head_branch:'main'},{id:23,display_title:'Deep read request_003 · 1706.03762v7',head_branch:'dev',status:'completed',conclusion:'success',html_url:'https://github.com/owner/repo/actions/runs/23'}]});
  };
  const task=await recoverDeepRead(config,'1706.03762v7');assert.equal(task?.runId,23);assert.equal(task?.status,'succeeded');assert.equal(calls,2);
  calls=0;globalThis.fetch=async()=>{calls++;return Response.json({workflow_runs:Array.from({length:100},()=>({display_title:'Other'}))});};
  assert.equal(await recoverDeepRead(config,'1706.03762v7'),null);assert.equal(calls,3);
 }finally{globalThis.fetch=original;}
});
