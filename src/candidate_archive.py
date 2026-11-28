"""Best-effort metadata archive of bounded retrieval results, without model calls."""
from contextlib import contextmanager
from datetime import datetime, timezone
import gzip
import hashlib
import json
import os
from pathlib import Path
import re
import tempfile


def fingerprint(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, ensure_ascii=False).encode()).hexdigest()


def safe_config(value):
    if isinstance(value, dict):
        return {k: safe_config(v) for k, v in value.items()
                if not re.search(r"key|secret|token|password|credential|url|endpoint", k, re.I) or k == "keywords"}
    if isinstance(value, list):
        return [safe_config(v) for v in value]
    return value


@contextmanager
def archive_file():
    root = os.getenv("DPR_CANDIDATE_ARCHIVE_DIR")
    if not root:
        yield None
        return
    import fcntl
    folder = Path(root)
    folder.mkdir(parents=True, exist_ok=True)
    week = datetime.now(timezone.utc).strftime("%G-W%V")
    path = folder / (week + ".jsonl.gz")
    with (folder / ".lock").open("a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        records = {}
        if path.exists():
            with gzip.open(path, "rt", encoding="utf-8") as source:
                records = {row["record_id"]: row for row in map(json.loads, source)}
        yield records
        fd, temporary = tempfile.mkstemp(dir=folder, suffix=".tmp")
        os.close(fd)
        try:
            with gzip.open(temporary, "wt", encoding="utf-8") as output:
                for key in sorted(records):
                    output.write(json.dumps(records[key], ensure_ascii=False) + "\n")
            os.replace(temporary, path)
            manifest = {"schema_version": 1, "scope": "bounded_subscription_candidates",
                        "week": week, "records": len(records), "compressed_bytes": path.stat().st_size,
                        "sha256": hashlib.sha256(path.read_bytes()).hexdigest()}
            (folder / (week + ".index.json")).write_text(json.dumps(manifest), encoding="utf-8")
        finally:
            if os.path.exists(temporary):
                os.unlink(temporary)


def record(channel, query, papers, config, window=None, limit=None, status="success"):
    try:
        snapshot = safe_config(config)
        runtime = {key: os.environ[key] for key in (
            "DPR_FILTER_PROFILE_TAG", "DPR_V2_GLOBAL_WINDOW",
            "DPR_DISPATCH_RERANK_PROFILE") if key in os.environ}
        snapshot = {"configuration": snapshot, "runtime": runtime}
        version = fingerprint(snapshot)
        query_id = fingerprint(query)
        run = os.getenv("GITHUB_RUN_ID") or os.getenv("DPR_RUN_DATE", "local")
        key = fingerprint([run, channel, query_id, version, window])
        now = datetime.now(timezone.utc).isoformat()
        with archive_file() as records:
            if records is None:
                return
            previous = records.get(key, {})
            candidates = {}
            for p in papers:
                pid = str(p.get("original_id") or p.get("id") or p.get("paper_id") or "")
                if not pid:
                    continue
                source = p.get("source") or "arxiv"
                canonical = p.get("canonical_id") or source + ":" + (re.sub(r"v\d+$", "", pid) if source == "arxiv" else pid)
                match = re.search(r"v(\d+)$", pid) if source == "arxiv" else None
                identity = source + ":" + pid
                candidates[identity] = {
                    "canonical_id": canonical, "version": int(match[1]) if match else p.get("version"),
                    "paper_key": identity, "published_at": p.get("published"),
                    "updated_at": p.get("updated"), "retrieved_at": previous.get("retrieved_at", now),
                    "title": p.get("title"), "abstract": p.get("abstract"),
                    "authors": p.get("authors", []), "categories": p.get("categories", []),
                    "retrieval_sources": [channel], "query_id": query_id,
                    "retrieval_config_version": version, "legacy_score": p.get("llm_score"),
                    "selected": None}
            records[key] = {"record_id": key, "run_id": run, "schema_version": 1,
                            "retrieved_at": previous.get("retrieved_at", now),
                            "last_attempt_at": now, "status": status, "channel": channel,
                            "query_id": query_id, "query": query, "window": window,
                            "return_limit": limit, "returned_count": len(papers),
                            "retrieval_config_version": version, "config": snapshot,
                            "candidates": list(candidates.values())}
    except Exception as exc:
        print(f"::warning::Candidate archive failed ({type(exc).__name__})", flush=True)


def finalize(papers):
    try:
        selected = {p["paper_key"] for p in papers}
        run = os.getenv("GITHUB_RUN_ID") or os.getenv("DPR_RUN_DATE", "local")
        with archive_file() as records:
            if records is None:
                return
            for record in records.values():
                if record["run_id"] == run:
                    for candidate in record["candidates"]:
                        candidate["selected"] = candidate["paper_key"] in selected
    except Exception as exc:
        print(f"::warning::Candidate selection archive failed ({type(exc).__name__})", flush=True)


def capture_global(path, channel, config):
    try:
        data = json.loads(Path(path).read_text())
        papers = {str(p.get("id") or p.get("paper_id")): p for p in data.get("papers", [])}
        for query in data.get("queries", []):
            ids = query.get("sim_scores") or {}
            record(channel, query, [papers[pid] for pid in ids if pid in papers],
                   config, window={"effective": data.get("window") or os.getenv("DPR_V2_GLOBAL_WINDOW"),
                                   "configured": safe_config(config.get("arxiv_paper_setting", {})),
                                   "run_date": os.getenv("DPR_RUN_DATE"),
                                   "coverage": "bounded; effective window may be unavailable"},
                   limit=None)
    except Exception as exc:
        record(channel, {}, [], config, status="failed")
        print(f"::warning::Candidate retrieval snapshot unavailable ({type(exc).__name__})", flush=True)
