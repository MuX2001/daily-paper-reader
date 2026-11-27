"""Compare the published scores to the daily rubric without editing the feed."""
import argparse
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
    args=parser.parse_args()
    load_local_env()
    papers=json.loads(args.feed.read_text())['papers']
    client=LLMClient(os.getenv('TRIAGE_API_KEY') or os.environ['DEEPSEEK_API_KEY'],os.getenv('TRIAGE_MODEL') or os.environ['DEEPSEEK_MODEL'],os.getenv('TRIAGE_BASE_URL') or os.environ['DEEPSEEK_BASE_URL'])
    client.kwargs.update(max_tokens=4096,thinking={'type':'disabled'});client.max_attempts=1
    results=assess(papers,yaml.safe_load((ROOT/'config.yaml').read_text()),client,args.output_dir)
    ranking=sorted(results,key=lambda k:(-results[k]['final_score'],k))
    records=[dict(results[p['paper_key']],old_rank=i,old_score=p['score'],new_rank=ranking.index(p['paper_key'])+1,title=p['title']) for i,p in enumerate(papers,1)]
    atomic_json(args.output_dir/'comparison.json',{'results':records,'usage_this_run':client._cum_tokens,'responses_this_run':client._call_index})


if __name__=='__main__':main()
