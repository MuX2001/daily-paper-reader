"""Small paid comparison, opt-in. Uses fixed publication dates and historical Global rankings."""
import argparse
from datetime import date, timedelta
import json
import os
from pathlib import Path
import shutil
import sys
import time

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"src"))
import yaml
from llm import LLMClient
from local_env import load_local_env
from recommendation_quality import assess
from recommendation_v2 import DailyRun
from triage_enrich import atomic_json
from triage_export import build_feed


def replay(output, sources, calls, offline):
    load_local_env()
    config = yaml.safe_load((ROOT/"config.yaml").read_text())
    config_v2 = {**config["pipeline"]["recommendation_v2"],"full_text_candidates":3,
                 "max_recommendations":2,"daily_api_calls":calls,"daily_tokens":65000,"daily_search_requests":4}
    client = LLMClient(os.getenv("TRIAGE_API_KEY") or os.environ["DEEPSEEK_API_KEY"],
                       os.getenv("TRIAGE_MODEL") or os.environ["DEEPSEEK_MODEL"],
                       os.getenv("TRIAGE_BASE_URL") or os.getenv("DEEPSEEK_BASE_URL") or "https://api.deepseek.com")
    client.max_attempts = 1
    client.kwargs.update(max_tokens=3000,thinking={"type":"disabled"})
    cache = output/"cache"
    shutil.copytree(sources,cache/"sources",dirs_exist_ok=True)
    feed = build_feed(json.loads((ROOT/"archive/20261127/recommend/arxiv_papers_20261127.standard.json").read_text()),"20261127")
    rows = []
    for day in (date(2026,11,18),date(2026,11,24)):
        started = time.monotonic()
        daily = [p for p in feed["papers"] if p["published"].startswith(day.isoformat())]
        # Independent runs intentionally use distinct state roots for each fixed window.
        run = DailyRun(config_v2,(day+timedelta(days=1)).strftime("%Y%m%d"),output/day.isoformat(),cache)
        pool = run.prepare(daily)
        ranks = {}
        for name,candidates in (("A",daily[:3]),("B",pool["papers"])):
            before = client._cum_tokens["total"]
            calls = client._call_index
            result = assess(candidates,config,client,cache)
            eligible = sorted((p for p in candidates if result[p["paper_key"]]["eligible"]),
                              key=lambda p:(-result[p["paper_key"]]["final_score"],p["paper_key"]))
            ranks[name] = {"analyzed":[p["paper_key"] for p in candidates],"recommended":[p["paper_key"] for p in eligible[:2]],
                           "tokens":client._cum_tokens["total"]-before,"responses":client._call_index-calls}
        run.finish(pool,{"run_id":run.day,"papers":[p for p in pool["papers"] if p["paper_key"] in ranks["B"]["recommended"]]},pool["papers"],client)
        obs = json.loads((run.run/"observation.json").read_text())
        ranks["C"] = {k:obs[k] for k in ("counts","unique","deduplicated","recommended","overlap","verified","unverified","usage","errors","failures")}
        rows.append({"date":day.isoformat(),"seconds":time.monotonic()-started,**ranks})
        atomic_json(output/("comparison-cached.json" if offline else "comparison.json"),rows)
        print(json.dumps(rows[-1],ensure_ascii=False),flush=True)


if __name__=="__main__":
    parser=argparse.ArgumentParser(description=__doc__)
    mode=parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--live",action="store_true",help="Allow a bounded real model and arXiv comparison")
    mode.add_argument("--cached",action="store_true",help="Forbid network calls during checkpoint replay")
    parser.add_argument("--output",required=True,type=Path)
    parser.add_argument("--sources",required=True,type=Path)
    parser.add_argument("--total-calls-per-date",type=int,choices=(3,6),default=3,help="Cumulative experiment allowance, including earlier runs")
    args=parser.parse_args()
    if args.cached:
        from unittest.mock import patch
        with patch("requests.sessions.Session.request",side_effect=AssertionError("Unexpected network call during replay")):
            replay(args.output,args.sources,args.total_calls_per_date,True)
    else:
        replay(args.output,args.sources,args.total_calls_per_date,False)
