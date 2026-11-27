"""Daily V2 orchestration, sharing the existing reader feed and source cache."""
from datetime import datetime, timedelta
import json
from pathlib import Path
import time

import requests

from recommendation_channels import digest, merge_pool, retrieve
from recommendation_evidence import PROMPT, context, figure_input, inventory, select, validate
from summary_language import summary_language
from triage_enrich import atomic_json


def load(path, default):
    return json.loads(path.read_text()) if path.exists() else default


class DailyRun:
    def __init__(self, config, day, root, cache):
        self.config = config
        self.day = day
        self.root = Path(root)
        self.cache = Path(cache)
        self.run = self.root/"archive"/"recommendation-v2"/day
        self.ledger = self.run/"budget.json"
        self.usage = load(self.ledger, {"calls":0,"tokens":0,"reserved_tokens":0,"search_requests":0})
        self.last_request = 0
        self.errors = []
        self.started = time.monotonic()

    def request(self, url, params):
        for attempt in range(2):
            if self.usage["search_requests"] >= self.config["daily_search_requests"]:
                raise RuntimeError("Daily retrieval request budget reached")
            time.sleep(max(0,self.last_request+3.1-time.monotonic()))
            self.last_request = time.monotonic()
            self.usage["search_requests"] += 1
            atomic_json(self.ledger,self.usage)
            response = requests.get(url,params=params,timeout=(8,25))
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
        if saved.get("signature")==signature and not saved["failures"]:
            return saved
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
        lanes,failures,ambiguous = retrieve(self.config,start,end,self.request,self.memo)
        lanes["global"] = global_papers
        # A transient failure must not drop the successful candidates of a prior attempt.
        pool = merge_pool(lanes,self.config)
        if saved.get("signature")==signature and failures and saved.get("papers"):
            pool = saved["papers"]
        counts = {k:len({p["canonical_id"] for p in lane}) for k,lane in lanes.items()}
        ids = {k:{p["canonical_id"] for p in lane} for k,lane in lanes.items()}
        unique = {k:len(group-set().union(*(ids[t] for t in ids if t!=k))) for k,group in ids.items()}
        payload = {"signature":signature,"start":start.isoformat(),"end":end.isoformat(),
                   "counts":counts,"unique":unique,"deduplicated":len(set.union(*ids.values())),
                   "ambiguous":ambiguous,"failures":failures,"papers":pool}
        atomic_json(path,payload)
        if not failures and end.isoformat()>=last.get("through",""):
            atomic_json(cursor,{"through":end.isoformat()})
        return payload

    def review(self, paper, client):
        rows = inventory(paper,self.cache/"sources")
        locations = context(rows)
        if not locations:
            raise ValueError("no usable source passages")
        viewed,image = figure_input(locations,self.cache/"v2-images") if self.config.get("vision_input") else (None,None)
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
            if u["calls"]>=self.config["daily_api_calls"] or u["tokens"]+u["reserved_tokens"]+reserve>self.config["daily_tokens"]:
                raise RuntimeError("V2 daily API/token budget reached")
            u["calls"]+=1
            u["reserved_tokens"]+=reserve
            atomic_json(self.ledger,u)
            content = [{"type":"text","text":query},{"type":"image_url","image_url":{"url":image}}] if image else query
            response = client.chat([{"role":"system","content":system},{"role":"user","content":content}],
                                   response_format={"type":"json_object"})
            actual = response.get("tokens",{}).get("total")
            if type(actual) is int and actual>0:
                u["tokens"]+=actual
                u["reserved_tokens"]-=reserve
                atomic_json(self.ledger,u)
            if response.get("finish_reason")=="length":
                raise ValueError("truncated evaluation")
            cached = json.loads(response["content"])
        result = validate(cached,locations,viewed)
        if not path.exists():
            atomic_json(path,cached)
        return result

    def finish(self, pool, legacy, candidate_feed, client):
        from llm import LLMClient
        evaluator = LLMClient(client.api_key,client.model,client.base_url)
        evaluator.max_attempts = 1
        evaluator.kwargs = {**client.kwargs,"max_tokens":1800}
        enriched = {p["paper_key"]:p for p in candidate_feed}
        papers = [{**p,**enriched.get(p["paper_key"],{}),"retrieval_sources":p["retrieval_sources"]} for p in pool["papers"]]
        for p in papers:
            if self.config.get("evaluate"):
                try:
                    p["evaluation_v2"] = self.review(p,evaluator)
                except Exception as exc:
                    self.errors.append({"paper":p["paper_key"],"stage":"evaluation","reason":type(exc).__name__})
        recommended = select(papers,self.config["max_recommendations"])
        lookup = {p["paper_key"]:p for p in papers}
        activate = self.config.get("select_v2") and not self.config.get("shadow_mode")
        # Never publish an empty replacement solely because all analyses failed.
        if activate and self.errors and not recommended:
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
                      elapsed_seconds=round(time.monotonic()-self.started,2))
        atomic_json(self.run/"observation.json",report)
        atomic_json(self.run/"evaluated.json",papers)
        print("V2 observation:", json.dumps(report,ensure_ascii=False),flush=True)
        return {**legacy,"papers":output,"recommendation_mode":"v2" if activate else "legacy",
                "quality_screened":True}
