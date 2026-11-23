import {test} from 'node:test';
import assert from 'node:assert/strict';
import {legacyBackup} from '../src/legacyBackup.ts';

test('legacy cloud backup requires explicit owner and never merges owners',()=>{
 const raw=[{github_username:'alice',paper_id:'paper-v1',status:'good'},{github_username:'bob',paper_id:'paper-v1',status:'bad'}];
 const pending=legacyBackup(raw);assert.deepEqual(pending.owners,['alice','bob']);assert.deepEqual(pending.states,{});
 assert.equal(legacyBackup(raw,'alice').states['paper-v1'],'good');
 assert.throws(()=>legacyBackup(raw,'missing'));
});
test('backup duplicates with conflicting states are skipped regardless of row order',()=>{
 const raw=['good','bad','good'].map(status=>({github_username:'alice',paper_id:'same',status}));
 for(const rows of [raw,[...raw].reverse()]){const parsed=legacyBackup(rows,'alice');assert.deepEqual(parsed.conflicts,['same']);assert.equal(Object.keys(parsed.states).length,0);}
 assert.throws(()=>legacyBackup([{paper_id:'paper',status:'good'}]));
 const local={'paper-v1':true};assert.equal(legacyBackup(local).states,local);
 const dangerous=legacyBackup([{github_username:'alice',paper_id:'__proto__',status:'good'}],'alice');
 assert.equal(dangerous.states.__proto__,'good');assert.equal(Object.getPrototypeOf(dangerous.states),null);
});
