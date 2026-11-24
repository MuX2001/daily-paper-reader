import {test} from 'node:test';
import assert from 'node:assert/strict';
import {errorMessage} from '../src/errors.ts';
test('plain PostgREST errors preserve message and point to missing state schema',()=>{
 const message=errorMessage({code:'PGRST205',message:"Could not find the table 'public.paper_states' in the schema cache",details:null,hint:null});
 assert.match(message,/paper_states/);assert.match(message,/SQL Editor/);assert.match(message,/不是邮箱或密码错误/);assert.doesNotMatch(message,/\[object Object\]/);
 assert.equal(errorMessage({message:'Invalid login credentials',code:'invalid_credentials'}),'Invalid login credentials [invalid_credentials]');
});
test('error formatting uses known text fields, not arbitrary response or credentials',()=>{
 assert.equal(errorMessage(new Error('Network unavailable')),'Network unavailable');
 assert.equal(errorMessage({msg:'Provider disabled',error_code:'validation_failed'}),'Provider disabled [validation_failed]');
 assert.equal(errorMessage({message:'Failure',access_token:'secret',response:{key:'secret'}}),'Failure');
 assert.doesNotMatch(errorMessage({}),/object Object/);
});
