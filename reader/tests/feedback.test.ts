import {test} from 'node:test';
import assert from 'node:assert/strict';
import {feedbackDraft} from '../src/feedback.ts';
test('feedback types have canonical order and exact separators, body has no generated template',()=>{
 const url=new URL(feedbackDraft(['体验问题','功能新增','功能新增'],' [旧前缀]  My title ','Only my feedback',true));
 assert.equal(url.searchParams.get('title'),'[功能新增|体验问题] My title');assert.equal(url.searchParams.get('body'),'Only my feedback');
 assert.equal(url.pathname,'/ziwenhahaha/daily-paper-reader/issues/new');
 assert.throws(()=>feedbackDraft(['体验问题'],'Title','Body',false),/公开/);
 assert.throws(()=>feedbackDraft([],'Title','Body',true),/请选择/);
});
