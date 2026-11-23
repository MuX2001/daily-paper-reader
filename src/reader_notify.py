"""Optional Feishu daily digest, only after verified publication."""
from __future__ import annotations
import argparse
import hashlib
import json
import os
from pathlib import Path
from urllib.parse import urlsplit
import requests
from triage_enrich import atomic_json


def notify(feed_path,site_url,webhook,ledger_dir,session=requests,retry_unknown=False):
    if not webhook:return {'status':'disabled'}
    site=urlsplit(site_url);hook=urlsplit(webhook)
    if site.scheme!='https' or not site.netloc:raise ValueError('Notification requires the verified HTTPS site URL')
    if hook.scheme!='https' or hook.hostname!='open.feishu.cn' or not hook.path.startswith('/open-apis/bot/v2/hook/'):
        raise ValueError('Configure a Feishu custom-bot HTTPS webhook')
    feed=json.loads(Path(feed_path).read_text());papers=feed['papers']
    high=sum(isinstance(p.get('score'),(int,float)) and p['score']>=8 for p in papers)
    text=f'Daily Paper Reader · {feed["run_id"]}\n本次命中 {len(papers)} 篇，高相关 {high} 篇\n{site_url}'
    key=hashlib.sha256((webhook+'\n'+text).encode()).hexdigest()
    ledger=Path(ledger_dir)/(key+'.json')
    if ledger.exists():
        status=json.loads(ledger.read_text()).get('status')
        if status=='sent':return {'status':'already_sent'}
        if status=='unknown' and not retry_unknown:raise ValueError('Previous delivery outcome is unknown; check the destination before explicitly retrying')
    # Record before the network call: a crash after acceptance must not auto-resend.
    atomic_json(ledger,{'status':'unknown','run_id':feed['run_id']})
    try:
        response=session.post(webhook,json={'msg_type':'text','content':{'text':text}},timeout=20,allow_redirects=False)
        if response.status_code!=200:raise ValueError(f'Notification endpoint returned HTTP {response.status_code}')
        if response.json().get('code')!=0:raise ValueError('Notification provider rejected the digest')
    except requests.RequestException as exc:
        raise ValueError('Notification transport failed; delivery outcome is unknown') from None
    atomic_json(ledger,{'status':'sent','run_id':feed['run_id']})
    return {'status':'sent','count':len(papers),'high_relevance':high}


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--feed',required=True);parser.add_argument('--ledger-dir',required=True);parser.add_argument('--site-url',required=True);parser.add_argument('--publication-verified',action='store_true');parser.add_argument('--retry-unknown',action='store_true');args=parser.parse_args()
    if not args.publication_verified:raise ValueError('Publish and verify the current site before sending a digest')
    print(notify(args.feed,args.site_url,os.getenv('DPR_NOTIFY_FEISHU_WEBHOOK',''),args.ledger_dir,retry_unknown=args.retry_unknown))
