import {test} from 'node:test';
import assert from 'node:assert/strict';
import {planMigration} from '../src/migrationPlan.ts';
import type {Paper,PaperState} from '../src/domain.ts';
const paper={paper_key:'arxiv:1234.56789v2',original_id:'1234.56789v2',legacy_routes:['date/slug','other/slug']} as Paper;
test('legacy labels retain meaning without inventing negative feedback',()=>{
 const plan=planMigration({'date/slug':'good'},[paper],{},'2026-11-24T00:00:00Z');
 assert.equal(plan.rows[0].starred,true);assert.equal(plan.rows[0].feedback,0);assert.equal(plan.rows[0].legacy_status,'good');
 assert.equal(planMigration({'1234.56789v1':'good'},[paper],{},'now').rows.length,0);
});
test('existing cloud state and conflicting aliases never get overwritten',()=>{
 const cloud={[paper.paper_key]:{paper_key:paper.paper_key,revision:2} as PaperState};
 assert.equal(planMigration({'date/slug':'bad'},[paper],cloud,'now').rows.length,0);
 const conflict=planMigration({'date/slug':'good','other/slug':'bad','1234.56789v2':'good'},[paper],{},'now');
 assert.equal(conflict.rows.length,0);assert.ok(conflict.skipped.length>=2);
});
