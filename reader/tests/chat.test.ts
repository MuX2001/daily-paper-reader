import {test} from 'node:test';
import assert from 'node:assert/strict';
import {chat,chatMessages,fulltextPath,paperContext} from '../src/chat.ts';
import type {Paper} from '../src/domain.ts';
const config={endpoint:'https://model.example/v1',model:'test',apiKey:'secret'};
test('full context is preserved and abstract fallback is honest',async()=>{
 const context={content:'Full paper '+('body '.repeat(2000)),fulltext:true};
 assert.ok(chatMessages(context,[{role:'user',content:'Question'}])[1].content.endsWith(context.content));
 const fallback=await paperContext({title:'Title',abstract:'Only abstract'} as Paper);
 assert.equal(fallback.fulltext,false);assert.match(chatMessages(fallback,[])[0].content,/Only title and abstract/);
 assert.equal(fulltextPath('./docs/../secret.txt'),undefined);
 assert.equal(fulltextPath('./docs/%2e%2e/secret.txt'),undefined);
});
test('SSE partial chunks and exact context transmitted',async()=>{
 const original=globalThis.fetch;let sent:any;
 try{
  const content='正文 '.repeat(3000)+'References';
  globalThis.fetch=async (_url,options)=>{sent=JSON.parse(String(options?.body));return new Response(new ReadableStream({start(controller){for(const text of ['data: {"choices":[{"delta":{"cont','ent":"回答"}}]}\r\n','data: {"choices":[{"delta":{},"finish_reason":"stop"}]}\n','data: [DONE]\n'])controller.enqueue(new TextEncoder().encode(text));controller.close();}}));};
  const result=await chat(config,{content,fulltext:true},[{role:'user',content:'问题'}],()=>{},new AbortController().signal);
  assert.equal(result,'回答');assert.ok(sent.messages[1].content.endsWith(content));
 }finally{globalThis.fetch=original;}
});
test('truncated streams and oversized context cannot claim success',async()=>{
 const original=globalThis.fetch;
 try{
  globalThis.fetch=async()=>new Response('data: {"choices":[{"delta":{"content":"partial"}}]}\n');
  await assert.rejects(()=>chat(config,{content:'paper',fulltext:false},[],()=>{},new AbortController().signal),/中断/);
  await assert.rejects(()=>chat(config,{content:'x'.repeat(360000),fulltext:true},[],()=>{},new AbortController().signal),/未截断/);
 }finally{globalThis.fetch=original;}
});
