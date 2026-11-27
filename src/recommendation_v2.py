"""Daily V2 orchestration, sharing the existing reader feed and source cache."""
from datetime import datetime, timedelta, timezone
import json
import os
import re
from pathlib import Path
import time
try:
    import resource
except ImportError:  # Windows local debug
    resource = None

import requests

from llm import LLMClient
from recommendation_channels import digest, merge_pool, retrieve
from recommendation_evidence import PROMPT, context, figure_input, inventory, select, selected_preview, validate
from summary_language import summary_language
from triage_enrich import atomic_json


def load(path, default):
    return json.loads(path.read_text()) if path.exists() else default


def global_window(day, settings, paper_settings, checkpoint):
    end = datetime.strptime(day,"%Y%m%d").date()
    through = load(checkpoint,{}).get("through")
    if through:
        start = datetime.fromisoformat(through).date()+timedelta(days=1)
        if start < end-timedelta(days=max(1,int(paper_settings.get("days_window",9)))-1):
            if settings["shadow_mode"]:
                # Do not advance over an unsearched gap in the legacy baseline.
                return None,None
            stop = min(end,start+timedelta(days=max(1,int(settings["catch_up_days"]))))
            return (start.isoformat(),stop.isoformat()),(stop-timedelta(days=1)).isoformat()
    return None,max(through or "",(end-timedelta(days=1)).isoformat())


class SourceUnavailable(ValueError):
    pass


class ContentClient(LLMClient):
    """Charge every actual format/retry call for active-mode legacy content."""
    def __init__(self, client, run):
        super().__init__(client.api_key,client.model,client.base_url)
        self.kwargs = dict(client.kwargs)
        self.max_attempts = 1
        self.run = run

    def chat(self, messages, response_format=None):
        reserve = len(json.dumps([messages,response_format],ensure_ascii=False).encode())+self.kwargs["max_tokens"]+256
        usage = self.run.usage.setdefault("active_content",{"calls":0,"tokens":0,"reserved_tokens":0})
        self.run.reserve(usage,reserve,self.run.config["active_content_calls"],self.run.config["active_content_tokens"])
        response = super().chat(messages,response_format)
        self.run.settle(usage,reserve,response)
        return response


class DailyRun:
    def __init__(self, config, day, root, cache, accounting_day=None):
        self.config = config
        self.day = day
        self.root = Path(root)
        self.cache = Path(cache)
        self.run = self.root/"archive"/"recommendation-v2"/day
        self.ledger = self.run.parent/(accounting_day or day)/"budget.json"
        self.usage = load(self.ledger, {"calls":0,"tokens":0,"reserved_tokens":0,"search_requests":0})
        self.last_request = 0
        self.errors = []
        self.started = time.monotonic()

    def reserve(self, usage, tokens, max_calls, max_tokens):
        if usage["calls"]>=max_calls or usage["tokens"]+usage["reserved_tokens"]+tokens>max_tokens:
            raise RuntimeError("Daily API/token budget reached")
        usage["calls"] += 1
        usage["reserved_tokens"] += tokens
        atomic_json(self.ledger,self.usage)

    def settle(self, usage, reserve, response):
        actual = response.get("tokens",{}).get("total")
        if type(actual) is int and actual>0:
            usage["tokens"] += actual
            usage["reserved_tokens"] -= reserve
            atomic_json(self.ledger,self.usage)

    def admit(self, pool, require_all=False):
        admitted = self.usage.setdefault("full_text_versions",[])
        remaining = max(0,self.config["full_text_candidates"]-len(admitted))
        additional = [p["paper_key"] for p in pool if p["paper_key"] not in admitted]
        if require_all and len(additional)>remaining:
            raise RuntimeError("Recovery exceeds today's remaining full-text allowance")
        admitted.extend(additional[:remaining])
        atomic_json(self.ledger,self.usage)
        return [p for p in pool if p["paper_key"] in admitted]

    def request(self, url, params):
        for attempt in range(2):
            if self.usage["search_requests"] >= self.config["daily_search_requests"]:
                raise RuntimeError("Daily retrieval request budget reached")
            time.sleep(max(0,self.last_request+3.1-time.monotonic()))
            self.last_request = time.monotonic()
            self.usage["search_requests"] += 1
            atomic_json(self.ledger,self.usage)
            try:
                response = requests.get(url,params=params,timeout=(8,25))
            except (requests.Timeout,requests.ConnectionError):
                if attempt==0:
                    continue
                raise
            if attempt == 0 and response.status_code in (429,502,503,504):
                retry = response.headers.get("Retry-After","3")
                if retry.isdecimal() and int(retry)<=30:
                    time.sleep(int(retry))
                    continue
            response.raise_for_status()
            return response

    def memo(self, key, fetch):
        path = self.cache/"v2-retrieval"/(key+".json")
        if path.exists():
            return load(path,None)
        rows = fetch()
        atomic_json(path,rows)
        return rows

    def prepare(self, global_papers):
        signature = digest([self.config,[(p["paper_key"],p.get("score")) for p in global_papers]])
        path = self.run/"pool.json"
        saved = load(path,{})
        if saved.get("signature")==signature and not saved["failures"] and "full_text_versions" in self.usage:
            return {**saved,"papers":self.admit(saved["papers"])}
        # Complete UTC dates avoid marking the remainder of today's submissions seen.
        end = datetime.strptime(self.day,"%Y%m%d").date()-timedelta(days=1)
        cursor = self.run.parent/"retrieved-through.json"
        last = load(cursor,{})
        start = end
        if last.get("through") and last["through"]<end.isoformat():
            start = datetime.fromisoformat(last["through"]).date()+timedelta(days=1)
        if saved.get("signature")==signature:
            start = datetime.fromisoformat(saved["start"]).date()
        end = min(end,start+timedelta(days=max(1,self.config["catch_up_days"])-1))
        lanes = {"targeted":[],"exploration":[],"global":global_papers}
        failures, ambiguous = [], 0
        through = None
        for offset in range((end-start).days+1):
            day = start+timedelta(days=offset)
            daily,errors,count = retrieve(self.config,day,day,self.request,self.memo)
            ambiguous += count
            failures.extend(f"{day}: {error}" for error in errors)
            if not failures:
                through = day.isoformat()
            for channel,rows in daily.items():
                for row in rows:
                    row["match"]["search_date"] = day.isoformat()
                lanes[channel].extend(rows)
        if end>start:
            from recommendation_channels import balance_exploration
            for channel in ("targeted","exploration"):
                lanes[channel].sort(key=lambda p:(-p["match"]["preliminary"],p["paper_key"]))
            lanes["exploration"] = balance_exploration(lanes["exploration"],self.config)
        pool = merge_pool(lanes,self.config)
        # A manual retry or changed input on the same day shares the original
        # full-text allowance, even if a previously unavailable lane recovers.
        pool = self.admit(pool)
        counts = {k:len({p["canonical_id"] for p in lane}) for k,lane in lanes.items()}
        ids = {k:{p["canonical_id"] for p in lane} for k,lane in lanes.items()}
        unique = {k:len(group-set().union(*(ids[t] for t in ids if t!=k))) for k,group in ids.items()}
        payload = {"signature":signature,"start":start.isoformat(),"end":end.isoformat(),
                   "counts":counts,"unique":unique,"deduplicated":len(set.union(*ids.values())),
                   "ambiguous":ambiguous,"failures":failures,"papers":pool}
        atomic_json(path,payload)
        if through and through>=last.get("through",""):
            atomic_json(cursor,{"through":through})
        return payload

    def review(self, paper, client):
        try:
            rows = inventory(paper,self.cache/"sources")
        except (ValueError,OSError,requests.RequestException) as exc:
            raise SourceUnavailable(f"Exact-version source unavailable ({type(exc).__name__})") from exc
        locations = context(rows)
        if not locations:
            raise ValueError("no usable source passages")
        viewed,image = figure_input(locations,self.cache/"v2-images") if self.config.get("vision_input") else (None,None)
        if self.config.get("vision_input") and not image:
            viewed,image = selected_preview(paper,self.root,locations)
        supplied = {i:{"kind":r["kind"],"text":r["text"]} for i,r in locations.items()}
        query = json.dumps({"title":paper["title"],"passages":supplied,"visible_image":viewed},ensure_ascii=False)
        system = PROMPT+" Output language: "+summary_language()
        key = digest([paper["paper_key"],system,query,digest(image),client.model,client.base_url,dict(client.kwargs)])
        path = self.run.parent/"reviews"/(key+".json")
        cached = load(path,None)
        if cached is None:
            # UTF-8 byte length upper-bounds text tokens for the supported byte BPE
            # models. Reserve output, message framing and a bounded image allowance.
            reserve = len((query+system).encode())+int(client.kwargs["max_tokens"])+256+(4096 if image else 0)
            u = self.usage
            self.reserve(u,reserve,self.config["daily_api_calls"],self.config["daily_tokens"])
            content = [{"type":"text","text":query},{"type":"image_url","image_url":{"url":image}}] if image else query
            response = client.chat([{"role":"system","content":system},{"role":"user","content":content}],
                                   response_format={"type":"json_object"})
            self.settle(u,reserve,response)
            if response.get("finish_reason")=="length":
                raise ValueError("truncated evaluation")
            cached = json.loads(response["content"])
        result = validate(cached,locations,viewed)
        if not path.exists():
            atomic_json(path,cached)
        return result

    def finish(self, pool, legacy, candidate_feed, client):
        evaluator = LLMClient(client.api_key,client.model,client.base_url)
        evaluator.max_attempts = 1
        evaluator.kwargs = {**client.kwargs,"max_tokens":1800}
        enriched = {p["paper_key"]:p for p in candidate_feed}
        papers = [{**p,**enriched.get(p["paper_key"],{}),"retrieval_sources":p["retrieval_sources"]} for p in pool["papers"]]
        for p in papers:
            p.pop("evaluation_v2",None)
            if self.config.get("evaluate"):
                try:
                    p["evaluation_v2"] = self.review(p,evaluator)
                except Exception as exc:
                    self.errors.append({"paper":p["paper_key"],"stage":"source" if isinstance(exc,SourceUnavailable) else "evaluation","reason":str(exc)[:160] if isinstance(exc,(ValueError,RuntimeError)) else type(exc).__name__})
        recommended = select(papers,self.config["max_recommendations"])
        lookup = {p["paper_key"]:p for p in papers}
        activate = self.config.get("select_v2") and not self.config.get("shadow_mode")
        # Never publish an empty replacement solely because all analyses failed.
        if activate and (not self.config.get("evaluate") or (self.errors or pool["failures"]) and not recommended):
            activate = False
        if activate:
            output = recommended
        else:
            output = []
            for p in legacy["papers"]:
                other = lookup.get(p["paper_key"],{})
                output.append({**p,"retrieval_sources":other.get("retrieval_sources",[{"channel":"global"}]),
                               **({"evaluation_v2":other["evaluation_v2"]} if "evaluation_v2" in other else {})})
        legacy_ids = [p["paper_key"] for p in legacy["papers"]]
        selected_ids = [p["paper_key"] for p in recommended]
        highlights = [h for p in papers for h in p.get("evaluation_v2",{}).get("highlights",[])]
        report = {k:v for k,v in pool.items() if k not in ("papers","signature")}
        report.update(run_id=self.day,reviewed=len([p for p in papers if "evaluation_v2" in p]),
                      pool_size=len(papers),shadow=self.config["shadow_mode"],legacy=legacy_ids,recommended=selected_ids,
                      overlap=len(set(legacy_ids)&set(selected_ids)),usage=self.usage,errors=self.errors,
                      verified=sum(h["verified"] for h in highlights),unverified=sum(not h["verified"] for h in highlights),
                      peak_rss_kib=resource.getrusage(resource.RUSAGE_SELF).ru_maxrss if resource else None,
                      elapsed_seconds=round(time.monotonic()-self.started,2))
        atomic_json(self.run/"observation.json",report)
        atomic_json(self.run/"evaluated.json",papers)
        print("V2 observation:", json.dumps(report,ensure_ascii=False),flush=True)
        return {**legacy,"papers":output,"recommendation_mode":"v2" if activate else "legacy",
                "quality_screened":True}


def feedback_metrics(observation, votes, k):
    """Summarize explicit, held-out votes. Unreviewed papers remain unknown."""
    if k<1 or votes.get("label_source")!="human":
        raise ValueError("Provide explicit held-out human labels and positive K")
    labels = votes["labels"]
    if any(type(v) is not int or v not in (-1,1) for v in labels.values()):
        raise ValueError("Labels must be explicit +1/-1 votes")
    if set(labels).intersection(votes["feedback_context_ids"]):
        raise ValueError("Feedback used during ranking cannot serve as a held-out label")
    metrics = {}
    for name,other in (("legacy","recommended"),("recommended","legacy")):
        ranked = observation[name][:k]
        judged = [p for p in ranked if p in labels]
        useful = {p for p in judged if labels[p]==1}
        metrics[name] = {"shown":len(ranked),"judged":len(judged),
                         "useful_precision_at_k":len(useful)/len(ranked) if ranked and len(judged)==len(ranked) else None,
                         "useful_among_judged":len(useful)/len(judged) if judged else None,
                         "low_value_among_judged":sum(labels[p]==-1 for p in judged)/len(judged) if judged else None,
                         "unique_useful":sorted(useful-set(observation[other][:k]))}
        cost = votes.get("measured_cost",{}).get(name)
        if cost is not None and useful and len(judged)==len(ranked):
            metrics[name]["cost_per_useful"] = {"amount":cost["amount"]/len(useful),"currency":cost["currency"]}
    return metrics


def recover(root, day, cache):
    """Resume an existing pool under today's allowance, with no new retrieval."""
    import yaml
    from reader_catalog import build_catalog
    if not re.fullmatch(r"\d{8}",day):
        raise ValueError("Recovery requires an eight-digit saved run date")
    cfg = yaml.safe_load((root/"config.yaml").read_text())["pipeline"]["recommendation_v2"]
    if not cfg.get("enabled") or not cfg.get("evaluate"):
        raise ValueError("V2 evaluation is disabled")
    today = datetime.now(timezone.utc).strftime("%Y%m%d")
    run = DailyRun(cfg,day,root,cache,accounting_day=today)
    pool = load(run.run/"pool.json",None)
    path = root/"docs"/"data"/"daily"/(day+".json")
    feed = load(path,None)
    if not pool or not feed or not feed.get("quality_screened"):
        raise ValueError("Missing stored V2 pool or screened daily feed")
    pool["papers"] = run.admit(pool["papers"],require_all=True)
    client = LLMClient(os.getenv("TRIAGE_API_KEY") or os.environ["DEEPSEEK_API_KEY"],
                       os.getenv("TRIAGE_MODEL") or os.environ["DEEPSEEK_MODEL"],
                       os.getenv("TRIAGE_BASE_URL") or os.getenv("DEEPSEEK_BASE_URL") or "https://api.deepseek.com")
    client.kwargs.update(temperature=0,thinking={"type":"disabled"},max_tokens=4096)
    if client.base_url.rstrip("/")=="https://api.deepseek.com":
        client.kwargs.pop("temperature",None)
    candidates = load(run.run/"evaluated.json",[]) + feed["papers"]
    updated = run.finish(pool,feed,candidates,client)
    atomic_json(path,updated)
    build_catalog(root,root/"docs/data")


if __name__=="__main__":
    import argparse
    parser=argparse.ArgumentParser(description="Compare saved daily rankings using explicit held-out feedback")
    sub=parser.add_subparsers(dest="command",required=True)
    metrics=sub.add_parser("feedback")
    metrics.add_argument("observation",type=Path)
    metrics.add_argument("votes",type=Path)
    metrics.add_argument("--k",type=int,default=8)
    recovery=sub.add_parser("recover")
    recovery.add_argument("day")
    recovery.add_argument("--root",type=Path,default=Path(__file__).resolve().parents[1])
    recovery.add_argument("--cache-dir",type=Path,default=Path(".local-runs/triage-cache"))
    arguments=parser.parse_args()
    if arguments.command=="recover":
        recover(arguments.root,arguments.day,arguments.cache_dir)
    else:
        print(json.dumps(feedback_metrics(load(arguments.observation,{}),load(arguments.votes,{}),arguments.k),indent=2))
