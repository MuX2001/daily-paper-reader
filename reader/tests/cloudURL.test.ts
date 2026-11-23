import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cloudURL} from '../src/cloudURL.ts';
test('local Auth testing permits loopback HTTP only from a local page',()=>{
 assert.equal(cloudURL('http://127.0.0.1:54321','http://localhost:5173'),'http://127.0.0.1:54321');
 assert.equal(cloudURL('https://project.supabase.co/','https://reader.example'),'https://project.supabase.co');
 for(const target of ['http://127.0.0.1:54321','http://database.example'])assert.throws(()=>cloudURL(target,'https://reader.example'),/HTTPS/);
 for(const target of ['http://localhost.evil.example','https://user:password@project.supabase.co','https://project.supabase.co/rest/v1','https://project.supabase.co/?token=secret'])assert.throws(()=>cloudURL(target,'http://localhost:5173'));
});
