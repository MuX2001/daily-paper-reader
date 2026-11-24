import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parse} from 'yaml';
import {noteMarkdown,noteFilename,obsidianURI,obsidianFolder} from '../src/notes.ts';
import type {Paper} from '../src/domain.ts';
const paper={paper_key:'arxiv:1706.03762v7',original_id:'1706.03762v7',version:7,source:'arxiv',title:'Title: quoted',authors:['Alice'],tags:['nlp'],published:'2017-06-12',url:'https://arxiv.org/abs/1706.03762v7',pdf_url:null,code_url:null,breakdown:{problem:'Known problem',method:null,results:null}} as Paper;
test('triage note exports metadata, exact-version BibTeX and source without claiming deep reading',()=>{
 const markdown=noteMarkdown(paper);const meta=parse(markdown.split('---\n')[1]);
 assert.deepEqual(meta.authors,['Alice']);assert.equal(meta.version,7);assert.equal(meta.pdf,null);assert.equal(meta.url,paper.url);
 assert.ok(markdown.includes('eprint = {1706.03762v7}'));assert.ok(markdown.includes('未执行全文精读'));assert.ok(markdown.includes('Known problem'));
});
test('Obsidian inbox supports nested folders and vault root, rejecting filesystem paths',()=>{
 const uri=obsidianURI(paper,'vault','','研究/Papers & Inbox');assert.ok(uri);
 assert.equal(new URL(uri).searchParams.get('file'),'研究/Papers & Inbox/'+noteFilename(paper));
 assert.equal(new URL(obsidianURI(paper,'vault','','')!).searchParams.get('file'),noteFilename(paper));
 assert.equal(obsidianFolder('Papers\\Inbox/'),'Papers/Inbox');
 for(const path of ['/tmp/notes','C:\\Notes','../Inbox','Papers/../Inbox','Papers/./Inbox','bad\npath'])assert.throws(()=>obsidianFolder(path));
});
test('Obsidian delivery encodes vault and content, never overwrites, and falls back on encoded size',()=>{
 const uri=obsidianURI(paper,'科研 & papers');assert.ok(uri);const params=new URL(uri).searchParams;
 assert.equal(params.get('vault'),'科研 & papers');assert.equal(params.get('content'),noteMarkdown(paper));assert.equal(params.get('file'),'Inbox/'+noteFilename(paper));assert.equal(params.has('overwrite'),false);
 assert.equal(obsidianURI({...paper,abstract:'中文'.repeat(1000)},'vault'),null);
 assert.notEqual(noteFilename({...paper,paper_key:'a:b'}),noteFilename({...paper,paper_key:'a~3a~b'}));
 assert.throws(()=>obsidianURI(paper,' '),/vault/);
});
