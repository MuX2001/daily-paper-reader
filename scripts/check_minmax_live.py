"""Explicitly paid Min-Max smoke test. Outputs live outside the repository."""
import argparse
import json
import os
from pathlib import Path
import sys
import time
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'src'))
from llm import LLMClient
from minmax import enrich,FIELDS
from triage_enrich import atomic_json


def main():
    p=argparse.ArgumentParser();p.add_argument('--output',type=Path,required=True);a=p.parse_args()
    key=os.environ.get('DEEPSEEK_API_KEY')
    if not key:raise ValueError('Missing repository DEEPSEEK_API_KEY')
    # Only the official account endpoint; never forward this key to other services.
    client=LLMClient(key,'deepseek-flash','https://api.deepseek.com');client.max_attempts=1
    client.kwargs.update(max_tokens=65536,thinking={'type':'enabled'},reasoning_effort='high')
    original=client.chat_structured;responses=[]
    def record(*args,**kwargs):
        result=original(*args,**kwargs)
        responses.append({k:str(result[k]) if k=='parse_error' else result.get(k) for k in ('content','parsed','tokens','finish_reason','parse_error') if k in result})
        atomic_json(a.output/'responses.json',responses)
        return result
    client.chat_structured=record
    report=[]
    for id,title in [('1706.03762v7','Attention Is All You Need'),('2610.28457v1','GPT-6-Astra Understands Touch and Outperform Vision--Tactile--Language--Action Models')]:
        paper={'paper_key':'arxiv:'+id,'original_id':id,'source':'arxiv','title':title,'score':9,'tags':[]}
        start=time.monotonic();item={'id':id}
        try:
            result,reused=enrich(paper,client,a.output/'cache')
            atomic_json(a.output/(id+'.json'),result)
            item.update(status='succeeded',reused=reused,characters=sum(len(result['minmax'][k]['text'] or '') for k in FIELDS))
            print(json.dumps({k:result['minmax'][k] for k in FIELDS},ensure_ascii=False),flush=True)
            before=len(responses)
            _,reused=enrich(paper,client,a.output/'cache',allow_new=False)
            if not reused or len(responses)!=before:raise AssertionError('Cache replay called model')
            item['cache_verified']=True
        except Exception as exc:
            item.update(status='failed',error_type=type(exc).__name__,error=str(exc) if isinstance(exc,(ValueError,AssertionError)) else 'Source or provider request failed')
        item['seconds']=round(time.monotonic()-start,2);report.append(item)
        atomic_json(a.output/'report.json',report)
        print(json.dumps(item,ensure_ascii=False),flush=True)
    if any(x['status']!='succeeded' for x in report):raise SystemExit(1)

if __name__=='__main__':main()
