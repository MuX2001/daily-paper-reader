import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loadConfig,saveProfiles,validateProfiles} from '../src/github.ts';
const config={repository:'owner/repo',ref:'dev',token:'test-token'};
test('subscription edits preserve unrelated YAML and send optimistic SHA',async()=>{
 const original=globalThis.fetch;let written:any;
 try{
  const yaml='# original comment\nmodels:\n  name: unchanged\nsubscriptions:\n  intent_profiles:\n    - tag: robot\n      keywords:\n        - keyword: robot manipulation\n          query: learning robot skills\n';
  globalThis.fetch=async(_url,options)=>{
   if(options?.method==='PUT'){written=JSON.parse(String(options.body));return Response.json({content:{sha:'next-sha'}});}
   return Response.json({encoding:'base64',content:btoa(yaml),sha:'original-sha'});
  };
  const snapshot=await loadConfig(config);
  const saved=await saveProfiles(config,snapshot,[{...snapshot.profiles[0],description:'机器人'}]);
  assert.equal(written.sha,'original-sha');assert.equal(written.branch,'dev');
  const text=new TextDecoder().decode(Uint8Array.from(atob(written.content),c=>c.charCodeAt(0)));
  assert.match(text,/# original comment/);assert.match(text,/name: unchanged/);assert.match(text,/keyword: robot manipulation/);assert.match(text,/query: learning robot skills/);assert.equal(saved.sha,'next-sha');
 }finally{globalThis.fetch=original;}
});
test('configuration conflicts are not silently overwritten',async()=>{
 const original=globalThis.fetch;try{globalThis.fetch=async()=>new Response(null,{status:409});await assert.rejects(()=>loadConfig(config),/其他任务修改/);}finally{globalThis.fetch=original;}
});
test('profile validation rejects malformed edits before writing but preserves legacy query shapes',()=>{
 const valid=[{tag:'robot',keywords:['robot skills',{text:'manipulation',query:'dexterous manipulation',note:'keep'}],intent_queries:[{text:'learning from demonstrations'}],custom:{keep:true}}];
 assert.equal(validateProfiles(valid),valid);
 for(const bad of [null,[],{tag:3},{tag:' robot '},{tag:'robot',keywords:[{}]},{tag:'robot',keywords:[{keyword:'x',query:3}]},{tag:'robot',intent_queries:['']},{tag:'robot',paper_sources:['']},{tag:'robot',enabled:'yes'}]){
  assert.throws(()=>validateProfiles([bad] as any));
 }
 assert.throws(()=>validateProfiles([{tag:'robot'},{tag:'robot'}]));
});

test('a saved main branch cannot dispatch work or write subscriptions in the reader repository',async()=>{
 const target={...config,repository:'MuX2001/daily-paper-reader',ref:'main'};
 const {github,dispatchWorkflow}=await import('../src/github.ts');
 await assert.rejects(github(target,'/contents/config.yaml','PUT',{}),/dev/);
 await assert.rejects(dispatchWorkflow(target,'daily-paper-reader.yml',{}),/dev/);
});
