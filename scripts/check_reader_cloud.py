"""Real Auth + Data API checks, restricted to a disposable loopback Supabase.

Pass a private JSON file from `supabase status -o json`. Never logs credentials.
The reader schema must already be applied to this local project's database.
"""
import argparse
import json
from pathlib import Path
import secrets
from urllib.parse import urlsplit
import requests


def verify(connection):
    url=connection.get('API_URL','').rstrip('/')
    parsed=urlsplit(url)
    if parsed.hostname not in ('127.0.0.1','localhost','::1') or parsed.scheme not in ('http','https'):
        raise ValueError('Integration verifier only accepts a disposable loopback project')
    anon=connection['ANON_KEY'];admin=connection['SERVICE_ROLE_KEY']
    users=[]
    session=requests.Session()
    session.trust_env=False
    def request(method,path,key,token=None,**kwargs):
        return session.request(method,url+path,headers={'apikey':key,'Authorization':'Bearer '+(token or key),**kwargs.pop('headers',{})},timeout=30,**kwargs)
    def success(response):
        if not response.ok:raise AssertionError(f'Local Supabase returned HTTP {response.status_code}')
        return response.json() if response.content else None
    try:
        tokens=[]
        for _ in range(2):
            email=f'reader-test-{secrets.token_hex(8)}@example.test';password=secrets.token_urlsafe(24)
            user=success(request('POST','/auth/v1/admin/users',admin,json={'email':email,'password':password,'email_confirm':True}))
            users.append(user['id'])
            token=success(request('POST','/auth/v1/token?grant_type=password',anon,json={'email':email,'password':password}))
            assert token['user']['id']==user['id']
            tokens.append(token)
        token=tokens[0]['access_token'];other=tokens[1]['access_token']
        paper='arxiv:1706.03762v7'
        endpoint='/rest/v1/paper_states'
        row=success(request('POST',endpoint,anon,token,json={'user_id':users[0],'paper_key':paper,'note_text':'Private integration note','starred':True,'revision':999},headers={'Prefer':'return=representation'}))[0]
        assert row['revision']==1
        assert success(request('GET',endpoint,anon,other,params={'select':'*'}))==[]
        assert not request('GET',endpoint,anon,params={'select':'*'}).ok
        assert not request('POST',endpoint,anon,other,json={'user_id':users[0],'paper_key':'forged:identity'}).ok
        updated=success(request('PATCH',endpoint,anon,token,params={'paper_key':'eq.'+paper,'revision':'eq.1'},json={'note_text':'Second device edit'},headers={'Prefer':'return=representation'}))
        assert len(updated)==1 and updated[0]['revision']==2 and updated[0]['starred']
        stale=success(request('PATCH',endpoint,anon,token,params={'paper_key':'eq.'+paper,'revision':'eq.1'},json={'note_text':'Stale overwrite'},headers={'Prefer':'return=representation'}))
        assert stale==[]
        refreshed=success(request('POST','/auth/v1/token?grant_type=refresh_token',anon,json={'refresh_token':tokens[0]['refresh_token']}))
        rows=success(request('GET',endpoint,anon,refreshed['access_token'],params={'select':'paper_key,note_text,revision'}))
        assert rows==[{'paper_key':paper,'note_text':'Second device edit','revision':2}]
        cross_update=success(request('PATCH',endpoint,anon,other,params={'paper_key':'eq.'+paper},json={'note_text':'Cross-user overwrite'},headers={'Prefer':'return=representation'}))
        assert cross_update==[]
        oversized=request('PATCH',endpoint,anon,token,params={'paper_key':'eq.'+paper},json={'note_text':'x'*50001})
        assert not oversized.ok
        print('PASS: real Auth login/refresh, anonymous and cross-user isolation, private note writes, stale revision rejection, note size constraint')
    finally:
        failures=[]
        for user_id in users:
            response=request('DELETE','/auth/v1/admin/users/'+user_id,admin)
            if not response.ok:failures.append(response.status_code)
        session.close()
        if failures:raise RuntimeError(f'Temporary account cleanup failed: HTTP {failures}')


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--connection',type=Path,required=True)
    args=parser.parse_args()
    verify(json.loads(args.connection.read_text()))
