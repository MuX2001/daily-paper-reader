import {test} from 'node:test';
import assert from 'node:assert/strict';
import {scopedBatch} from '../src/scopedBatch.ts';
test('account switch during a pending archive stops remaining writes and old UI updates',async()=>{
 let active=true;let release!:(value:number)=>void;const writes:number[]=[],updates:number[]=[];
 const task=scopedBatch([1,2,3],()=>active,async item=>{writes.push(item);return new Promise<number>(resolve=>{release=resolve;});},value=>updates.push(value));
 active=false;release(1);
 assert.deepEqual(await task,{completed:1,stopped:true});assert.deepEqual(writes,[1]);assert.deepEqual(updates,[]);
});
test('archive preserves successful progress then stops on conflict',async()=>{
 const updates:number[]=[];const writes:number[]=[];
 await assert.rejects(scopedBatch([1,2,3],()=>true,async item=>{writes.push(item);if(item===2)throw new Error('revision conflict');return item;},value=>updates.push(value)),/revision conflict/);
 assert.deepEqual(updates,[1]);assert.deepEqual(writes,[1,2]);
});
