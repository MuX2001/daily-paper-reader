import {test} from 'node:test';
import assert from 'node:assert/strict';
import {configureCloud,loadStates} from '../src/api.ts';
test('state pagination cannot continue into a newly configured project',async()=>{
 const original=globalThis.fetch;let release!:(response:Response)=>void;let started!:()=>void;
 const ready=new Promise<void>(resolve=>{started=resolve;});const urls:string[]=[];
 try{
  globalThis.fetch=async input=>{urls.push(String(input));started();return new Promise<Response>(resolve=>{release=resolve;});};
  configureCloud('https://scope-one.supabase.co','sb_publishable_test');
  const request=loadStates('00000000-0000-0000-0000-000000000001');
  const rejected=assert.rejects(request,/云端配置已变更/);
  await ready;
  configureCloud('https://scope-two.supabase.co','sb_publishable_test');
  release(Response.json(Array.from({length:500},(_,i)=>({paper_key:`arxiv:${i}`}))));
  await rejected;
  assert.equal(urls.length,1);assert.ok(urls[0].startsWith('https://scope-one.supabase.co/'));
 }finally{configureCloud('','');globalThis.fetch=original;}
});
