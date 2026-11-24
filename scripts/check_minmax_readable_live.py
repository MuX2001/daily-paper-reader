"""Three-paper paid candidate comparison; does not publish or replace daily data."""
import argparse
import json
import os
from pathlib import Path
import sys
import time
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'src'))
from llm import LLMClient
from minmax import enrich as old_enrich
from minmax_readable import enrich
from triage_enrich import atomic_json


def main():
    p=argparse.ArgumentParser();p.add_argument('--output',type=Path,required=True);a=p.parse_args()
    key=os.environ['DEEPSEEK_API_KEY']
    client=LLMClient(key,'deepseek-flash','https://api.deepseek.com');client.max_attempts=1
    client.kwargs.update(max_tokens=65536,thinking={'type':'enabled'},reasoning_effort='high')
    original=client.chat_structured;responses=[]
    def record(*args,**kwargs):
        result=original(*args,**kwargs)
        responses.append({k:str(result[k]) if k=='parse_error' else result.get(k) for k in ('content','parsed','tokens','finish_reason','parse_error') if k in result})
        atomic_json(a.output/'responses.json',responses);return result
    client.chat_structured=record
    samples=[('1706.03762v7','Attention Is All You Need'),('2610.28457v1','GPT-6-Astra Understands Touch and Outperform Vision--Tactile--Language--Action Models'),('2610.31472v1','VecTile: A Low-Cost Flexible Tactile Array for 3-DoF Force Sensing')]
    existing=json.loads(Path('docs/data/daily/20261124.json').read_text())['papers'];report=[]
    for id,title in samples:
        paper=next((p for p in existing if p['original_id']==id),dict(paper_key='arxiv:'+id,original_id=id,source='arxiv',title=title,score=None,tags=[]))
        start=time.monotonic();item={'id':id}
        try:
            # Old published baselines remain untouched. The third lacks one;
            # generate it with the old algorithm for a genuine comparison.
            if not paper.get('minmax'):paper,_=old_enrich(paper,client,a.output/'cache')
            atomic_json(a.output/(id+'-old.json'),paper)
            new,reused=enrich(paper,client,a.output/'cache')
            atomic_json(a.output/(id+'-new.json'),new)
            before=len(responses);enrich(paper,client,a.output/'cache')
            if before!=len(responses):raise AssertionError('Cache replay billed')
            item.update(status='succeeded',cache_verified=True)
            print(id,json.dumps(new['minmax']['readable'],ensure_ascii=False),flush=True)
        except Exception as e:item.update(status='failed',error=str(e) if isinstance(e,(ValueError,AssertionError)) else type(e).__name__)
        item['seconds']=round(time.monotonic()-start,2);report.append(item);atomic_json(a.output/'report.json',report);print(json.dumps(item,ensure_ascii=False),flush=True)
    if any(x['status']!='succeeded' for x in report):raise SystemExit(1)

if __name__=='__main__':main()
