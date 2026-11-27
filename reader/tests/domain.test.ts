import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getCanonicalArxivUrl, filterPapers, emptyState, safeURL, type Paper } from '../src/domain.ts';
import {noteMarkdown} from '../src/notes.ts';
const paper = {paper_key:'arxiv:1234.56789v2',original_id:'1234.56789v2',title:'A paper',source:'arxiv',tags:['robot'],abstract:'abstract',tldr:null,reason:null,url:'https://arxiv.org/abs/1234.56789v2',pdf_url:null,code_url:null} as Paper;
test('independent states and search',()=>{
 const state={...emptyState(paper.paper_key),starred:true,read_at:'2026-11-24'};
 assert.equal(filterPapers([paper],{[paper.paper_key]:state},'starred','robot').length,1);
 assert.equal(filterPapers([paper],{[paper.paper_key]:{...state,dismissed_at:'2026-11-24'}},'inbox','').length,0);
 assert.equal(filterPapers([paper],{[paper.paper_key]:{...state,dismissed_at:'2026-11-24'}},'archive','').length,1);
});
test('untrusted URLs cannot execute code or contain credentials',()=>{
 assert.equal(safeURL('javascript:alert(1)'),undefined);
 assert.equal(safeURL('https://user:secret@example.org'),undefined);
 assert.equal(safeURL(paper.url),paper.url);
});
test('markdown export keeps exact version and escapes yaml title',()=>{
 const markdown=noteMarkdown({...paper,title:'Title\nstatus: injected'});
 assert.ok(markdown.includes('title: "Title\\nstatus: injected"'));
 assert.ok(markdown.includes('arxiv_id: "1234.56789v2"'));
 assert.ok(!markdown.includes('legacy.html'));
});

test('library merges runs by exact version without collapsing versions',async()=>{
 const {mergeLibrary}=await import('../src/domain.ts');
 const a={...paper,score:7,tags:['a']},b={...paper,score:9,tags:['b'],fulltext_path:'./docs/date/paper.txt'};
 const result=mergeLibrary([{schema_version:1,run_id:'a',papers:[a]},{schema_version:1,run_id:'b',papers:[b,{...a,paper_key:'arxiv:1234.56789v3'}]}]);
 assert.equal(result.length,2);assert.equal(result[0].score,9);assert.deepEqual(result[0].tags,['a','b']);
 assert.equal(result[0].fulltext_path,b.fulltext_path);
});

test('canonical arXiv clipboard URL preserves versions and source precedence',()=>{
 const abs='https://arxiv.org/abs/';
 assert.equal(getCanonicalArxivUrl({arxiv_id:'arXiv:2611.12345v2',id:'0704.0001'}),abs+'2611.12345v2');
 assert.equal(getCanonicalArxivUrl({id:'0704.0001'}),abs+'0704.0001');
 assert.equal(getCanonicalArxivUrl({url:'https://export.arxiv.org/pdf/math.GT/0309136v2.pdf?download=1#page=3'}),abs+'math.GT/0309136v2');
 assert.equal(getCanonicalArxivUrl({source:'arxiv',original_id:'hep-th/9901001'}),abs+'hep-th/9901001');
 const pdf='https://openreview.net/pdf?id=2611.12345';
 assert.equal(getCanonicalArxivUrl({url:'https://openreview.net/forum?id=abc',pdf_url:pdf}),pdf);
 assert.equal(getCanonicalArxivUrl({url:'https://example.org/abs/2611.12345'}),'https://example.org/abs/2611.12345');
 assert.equal(getCanonicalArxivUrl({}),undefined);
});
