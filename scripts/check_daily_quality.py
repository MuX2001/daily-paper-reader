"""Compare the published scores to the daily rubric without editing the feed."""
import argparse
import csv
import json
import os
import sys
from pathlib import Path
import yaml

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'src'))
from local_env import load_local_env
from llm import LLMClient
from recommendation_quality import assess
from triage_enrich import atomic_json


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--feed',type=Path,required=True)
    parser.add_argument('--output-dir',type=Path,required=True)
    parser.add_argument('--reviews',type=Path,help='Use existing validated production reviews without model calls')
    args=parser.parse_args()
    papers=json.loads(args.feed.read_text())['papers']
    if args.reviews:
        results=json.loads(args.reviews.read_text())
        usage={'usage_this_run':{}, 'responses_this_run':0}
    else:
        load_local_env()
        client=LLMClient(os.getenv('TRIAGE_API_KEY') or os.environ['DEEPSEEK_API_KEY'],os.getenv('TRIAGE_MODEL') or os.environ['DEEPSEEK_MODEL'],os.getenv('TRIAGE_BASE_URL') or os.environ['DEEPSEEK_BASE_URL'])
        client.kwargs.update(max_tokens=4096,thinking={'type':'disabled'})
        client.max_attempts=1
        results=assess(papers,yaml.safe_load((ROOT/'config.yaml').read_text()),client,args.output_dir)
        usage={'usage_this_run':client._cum_tokens,'responses_this_run':client._call_index}
    if set(results)!={p['paper_key'] for p in papers}:
        raise ValueError('Reviewed papers must exactly match the original batch')
    ranking=sorted(results,key=lambda k:(-results[k]['final_score'],k))
    records=[]
    for old_rank,paper in enumerate(papers,1):
        key=paper['paper_key']
        new_rank=ranking.index(key)+1
        records.append(dict(results[key],old_rank=old_rank,old_score=paper['score'],
                            new_rank=new_rank,rank_change=old_rank-new_rank,title=paper['title']))
    atomic_json(args.output_dir/'comparison.json',{'results':records,**usage})
    columns=('title','old_score','old_rank','problem_match','information_gain','hype_penalty',
             'final_score','new_rank','rank_change','eligible','scope','reason','evidence')
    with (args.output_dir/'scores.csv').open('w',encoding='utf-8-sig',newline='') as out:
        writer=csv.DictWriter(out,fieldnames=columns,extrasaction='ignore')
        writer.writeheader()
        writer.writerows(records)


if __name__=='__main__':main()
