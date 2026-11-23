import {test} from 'node:test';
import assert from 'node:assert/strict';
import {dispatchDeepRead,pollDeepRead} from '../src/deepRead.ts';
const config={repository:'owner/repo',ref:'dev',token:'test-token'};
test('dispatch exact version then correlate 204 response by request id',async()=>{
 const original=globalThis.fetch;let body:Record<string,any>={};
 try{
  globalThis.fetch=async (_url,options)=>{body=JSON.parse(String(options?.body));return new Response(null,{status:204});};
  const task=await dispatchDeepRead(config,'1706.03762v7');
  assert.equal(body.inputs.arxiv_id,'1706.03762v7');assert.equal(body.inputs.request_id,task.requestId);
  globalThis.fetch=async()=>Response.json({workflow_runs:[{id:9,display_title:'Other request',status:'completed',conclusion:'success'},{id:10,display_title:`Deep read ${task.requestId} · 1706.03762v7`,status:'in_progress',html_url:'https://github.com/owner/repo/actions/runs/10'}]});
  const running=await pollDeepRead(config,task);assert.equal(running.runId,10);assert.equal(running.status,'running');
  globalThis.fetch=async()=>Response.json({id:10,status:'completed',conclusion:'failure',html_url:running.url});
  assert.equal((await pollDeepRead(config,running)).status,'failed');
 }finally{globalThis.fetch=original;}
});
test('unversioned ids fail before network access',async()=>{
 await assert.rejects(()=>dispatchDeepRead(config,'1706.03762'),/明确 arXiv 版本/);
});
