import {test} from 'node:test';
import assert from 'node:assert/strict';
import {rememberedSecrets,exportPreferences,storeValues} from '../src/settings/config.ts';
import {exportFilename,obsidianURI} from '../src/notes.ts';
import type {Paper} from '../src/domain.ts';
function memory(){const map=new Map<string,string>();return {getItem:(k:string)=>map.get(k)??null,setItem:(k:string,v:string)=>{map.set(k,v);},removeItem:(k:string)=>{map.delete(k);}} as Storage;}
test('secret persistence requires explicit per-service opt in and ignores damaged flags',()=>{
 const s=memory();s.setItem('dpr.chat.api_key','old');s.setItem('dpr.github.token','token');
 assert.equal(rememberedSecrets(s).apiKey,'');s.setItem('dpr.settings.remember_secrets','{"chat":true,"github":false}');assert.equal(rememberedSecrets(s).apiKey,'old');assert.equal(rememberedSecrets(s).token,'');s.setItem('dpr.settings.remember_secrets','invalid');assert.equal(rememberedSecrets(s).apiKey,'');
});
test('export defaults preserve existing vault users and malformed settings fall back safely',()=>{
 const s=memory();assert.equal(exportPreferences(s).exportMode,'markdown');s.setItem('dpr.obsidian.vault','Research');assert.equal(exportPreferences(s).exportMode,'both');s.setItem('dpr.settings.export_mode','markdown');assert.equal(exportPreferences(s).exportMode,'markdown');s.setItem('dpr.obsidian.naming','../../bad');assert.equal(exportPreferences(s).naming,'stable-id');
});
test('failed storage writes roll back earlier settings',()=>{
 const s=memory();s.setItem('first','old');const original=s.setItem;s.setItem=(k,v)=>{if(k==='broken')throw new Error('quota');original(k,v);};assert.throws(()=>storeValues({first:'new',broken:'value'},s),/无法保存/);assert.equal(s.getItem('first'),'old');
});
test('human readable export names retain exact identities and do not invent a date',()=>{
 const p={paper_key:'arxiv:1706.03762v7',original_id:'1706.03762v7',source:'arxiv',title:'Bad:/title?',published:null,authors:[],tags:[],breakdown:{}} as unknown as Paper;
 assert.ok(exportFilename(p,'date-title').startsWith('日期未知-'));assert.ok(!exportFilename(p,'date-title').includes('/'));const other={...p,paper_key:'arxiv:1706.03762v8',original_id:'1706.03762v8'};assert.notEqual(exportFilename(p,'date-title'),exportFilename(other,'date-title'));
 const uri=obsidianURI(p,'Research','','Papers','id-title');assert.equal(new URL(uri!).searchParams.get('file'),'Papers/'+exportFilename(p,'id-title'));
});
