// Exercise the exact browser encryption function with the bundled UMD libraries.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {chromium} from '@playwright/test';
import {seal} from '../src/settings/seal.ts';

const browser=await chromium.launch({headless:true});
try {
const page=await browser.newPage();
for(const path of ['libsodium/0.7.10/dist/modules/libsodium.js','libsodium-wrappers/0.7.9/dist/modules/libsodium-wrappers.js']){
  await page.addScriptTag({content:readFileSync(new URL('../../app/vendor/'+path,import.meta.url),'utf8')});
}
const python=process.env.PYTHON||'python3';
const pair=JSON.parse(execFileSync(python,['-c','from nacl.public import PrivateKey; import base64,json; k=PrivateKey.generate(); print(json.dumps([base64.b64encode(bytes(x)).decode() for x in (k,k.public_key)]))']));
const value=randomBytes(32).toString('hex');
await page.addScriptTag({content:'window.sealForTest = '+seal.toString()});
const ciphertext=await page.evaluate(([pk,text])=>window.sealForTest(window.sodium,pk,text),[pair[1],value]);
const decrypted=execFileSync(python,['-c','from nacl.public import PrivateKey,SealedBox; from base64 import b64decode; import json,sys; k,msg=json.load(sys.stdin); print(SealedBox(PrivateKey(b64decode(k))).decrypt(b64decode(msg)).decode())'],{input:JSON.stringify([pair[0],ciphertext]),encoding:'utf8'});
assert.equal(decrypted.trim(),value);
console.log('Browser sealed box verified with PyNaCl');
} finally { await browser.close(); }
