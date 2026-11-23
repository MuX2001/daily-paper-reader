import {test} from 'node:test';
import assert from 'node:assert/strict';
import {bibtex,citationFields,citationDate} from '../src/citation.ts';
import type {Paper} from '../src/domain.ts';
const paper={paper_key:'arxiv:1706.03762v7',original_id:'1706.03762v7',source:'arxiv',title:'A {test} & 50%',authors:['Alice Smith','Team and Co'],published:'2017-06-12T12:00:00Z',url:'https://arxiv.org/abs/1706.03762v7',pdf_url:'javascript:alert(1)'} as Paper;
test('citations retain exact version, authors and escaped text without unsafe PDF',()=>{
 const fields=citationFields(paper);assert.equal(fields.filter(([k])=>k==='citation_author').length,2);
 assert.equal(fields.some(([k])=>k==='citation_pdf_url'),false);
 const text=bibtex(paper);assert.ok(text.includes('eprint = {1706.03762v7}'));assert.ok(text.includes('A \\{test\\} \\& 50\\%'));
 assert.ok(text.includes('{Alice Smith} and {Team and Co}'));assert.ok(text.includes('year = {2017}'));
});
test('conference citations never substitute submission dates or invent date precision',()=>{
 const conference={...paper,source:'icml'};
 assert.equal(citationDate(conference),undefined);assert.ok(!bibtex(conference).includes('year ='));
 assert.equal(citationDate({...conference,publication_date:'2024-07-21',publication_date_precision:'year'}),'2024');
 assert.equal(citationDate({...conference,publication_date:'2024-07-21',publication_date_precision:'unknown'}),undefined);
});
