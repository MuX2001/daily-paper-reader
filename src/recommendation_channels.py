"""Candidate retrieval and budget allocation for the daily reader."""
from collections import defaultdict
from datetime import timedelta
import os
from functools import lru_cache
import hashlib
import json
import math
import re
import unicodedata
from urllib.parse import unquote
import xml.etree.ElementTree as ET

import requests

from reader_identity import ARXIV_VERSION
from triage_export import project_paper

CHANNELS = ("exploration", "targeted", "global")
MODES = ("problem_driven", "open_ended")


# Adapted from SampsonML/arxiv-digest matching.py and crossover.py, 4a20d746.
# Copyright (c) 2026 Matt Wiemann, MIT. See LICENSE.arxiv-digest.
def normalize(text):
    decomposed = unicodedata.normalize("NFKD", text)
    stripped = "".join(ch for ch in decomposed if not unicodedata.combining(ch))
    return re.sub(r"[^a-z0-9]+", " ", stripped.lower()).strip()


@lru_cache(maxsize=4096)
def term_pattern(term):
    return re.compile(r"(?<![a-z0-9])" + re.escape(normalize(term)) + r"(?:s|es)?(?![a-z0-9])")


def phrase_hits(text, phrases):
    normalized = normalize(text)
    return [term for term in phrases if normalize(term) and term_pattern(term).search(normalized)]


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, ensure_ascii=False).encode()).hexdigest()


def quotas(limit, weights):
    if type(limit) is not int or limit < 0 or any(not math.isfinite(w) or w < 0 for w in weights.values()):
        raise ValueError("Invalid channel budget")
    total = sum(weights.values())
    if not total:
        return dict.fromkeys(weights, 0)
    raw = {k: limit*w/total for k, w in weights.items()}
    result = {k: math.floor(v) for k, v in raw.items()}
    for k in sorted(weights, key=lambda k: -(raw[k]-result[k]))[:limit-sum(result.values())]:
        result[k] += 1
    return result


def allocate(lanes, weights, limit):
    """Apply quotas first, then redistribute among nonempty enabled lanes."""
    shares = quotas(limit, weights)
    used = {}
    streams = {k: iter(lanes.get(k, ())) for k in weights if weights[k] > 0}

    def take(k):
        for item in streams[k]:
            key = item["canonical_id"]
            if key not in used:
                used[key] = item
                return True
        return False

    for k in streams:
        for _ in range(shares[k]):
            if not take(k):
                break
    while len(used) < limit:
        before = len(used)
        for k in streams:
            if len(used) < limit:
                take(k)
        if len(used) == before:
            break
    return list(used.values())


def merge_pool(lanes, config):
    evidence = defaultdict(list)
    newest = {}
    for channel, papers in lanes.items():
        for rank, p in enumerate(papers, 1):
            key = p["canonical_id"]
            provenance = {"channel":channel, "rank":rank, "version_id":p["original_id"], **p.get("match", {})}
            if provenance not in evidence[key]:
                evidence[key].append(provenance)
            if (key not in newest or (p.get("version") or 0) > (newest[key].get("version") or 0)
                    or (channel=="global" and p["paper_key"]==newest[key]["paper_key"])):
                newest[key] = p
    weights = {k:config["shares"][k] for k in CHANNELS}
    selected = allocate(lanes, weights, config["full_text_candidates"])
    return [{**newest[p["canonical_id"]], "retrieval_sources":evidence[p["canonical_id"]]} for p in selected]


def rotate(profiles, day):
    if profiles:
        n = day.toordinal() % len(profiles)
        return profiles[n:] + profiles[:n]
    return []


def identity_name(text):
    return " ".join(re.findall(r"[^\W_]+",unicodedata.normalize("NFKC",text).casefold(),re.UNICODE))


def author_match(paper, profile):
    names = {identity_name(n) for n in [profile.get("name", ""), *profile.get("aliases", [])] if n}
    affiliations = {identity_name(n) for n in profile.get("affiliations", []) if n}
    for author in paper["credits"]:
        name = identity_name(author["name"])
        affiliations_match = bool(affiliations.intersection(identity_name(a) for a in author["affiliations"]))
        if not profile.get("openalex_id") and (not names or name in names) and affiliations_match:
            return "confirmed_affiliation"
        if (not names or name in names) and profile.get("openalex_id") in author.get("openalex_ids", []):
            return "confirmed_id"
        if name and name in names:
            if not affiliations and not profile.get("openalex_id") and profile.get("accept_name_only") is True:
                return "configured_name"
    return None


def atom_records(raw):
    root = ET.fromstring(raw)
    ns = "{http://www.w3.org/2005/Atom}"
    if root.tag != ns+"feed":
        raise ValueError("Invalid arXiv response")
    rows = []
    for entry in root.findall(ns+"entry"):
        pid = unquote(entry.findtext(ns+"id", "")).split("/abs/")[-1]
        if not ARXIV_VERSION.fullmatch(pid):
            raise ValueError("arXiv returned an error or an unversioned paper")
        credits = [{"name":a.findtext(ns+"name", ""), "affiliations":[x.text or "" for x in a.findall("{http://arxiv.org/schemas/atom}affiliation")]} for a in entry.findall(ns+"author")]
        rows.append({"id":pid, "source":"arxiv", "title":" ".join(entry.findtext(ns+"title","").split()),
                     "abstract":" ".join(entry.findtext(ns+"summary","").split()), "credits":credits,
                     "authors":[a["name"] for a in credits], "categories":[c.get("term") for c in entry.findall(ns+"category")],
                     "published":entry.findtext(ns+"published"), "link":f"https://arxiv.org/abs/{pid}", "pdf_url":f"https://arxiv.org/pdf/{pid}"})
    return rows


def search(query, start, end, request):
    dates = f"submittedDate:[{start:%Y%m%d}0000 TO {end:%Y%m%d}2359]"
    response = request("https://export.arxiv.org/api/query", {"search_query":f"({query}) AND {dates}", "max_results":60, "sortBy":"submittedDate", "sortOrder":"descending"})
    return atom_records(response.content)


def quote(term):
    if not isinstance(term, str) or not term.strip() or any(c in term for c in '"\\\n'):
        raise ValueError("Invalid arXiv query term")
    return '"'+term.strip()+'"'


def openalex_params(params):
    key = os.getenv("OPENALEX_API_KEY")
    return {**params,"api_key":key} if key else params


def backfill_author(profile, start, end, request):
    author_id = profile.get("openalex_id","")
    if not re.fullmatch(r"A[1-9][0-9]+",author_id):
        raise ValueError("OpenAlex author ID must have the form A123")
    since = start-timedelta(days=min(30,max(0,int(profile.get("backfill_days",0)))))
    works = request("https://api.openalex.org/works",openalex_params({
        "filter":f"author.id:{author_id},from_publication_date:{since},to_publication_date:{end}",
        "per_page":25,"select":"doi,authorships","sort":"publication_date:desc"})).json()["results"]
    resolved = {}
    for work in works:
        doi = re.fullmatch(r"https://doi.org/10\.48550/arxiv\.(.+)",str(work.get("doi")),re.I)
        if not doi:
            continue
        pid = doi[1]
        if not ARXIV_VERSION.fullmatch(pid+"v1"):
            continue
        names = {identity_name(a["author"]["display_name"]) for a in work.get("authorships",[])
                 if a["author"]["id"].rsplit("/",1)[-1]==author_id}
        if names:
            resolved[pid] = names
    if not resolved:
        return []
    # Hydrate the latest exact version from the official arXiv Atom record.
    raw = request("https://export.arxiv.org/api/query",{"id_list":",".join(sorted(resolved)),"max_results":25})
    rows = []
    for paper in atom_records(raw.content):
        pid = paper["id"].rsplit("v",1)[0]
        if pid not in resolved or not str(since)<=str(paper["published"])[:10]<=str(end):
            continue
        for credit in paper["credits"]:
            if identity_name(credit["name"]) in resolved[pid]:
                credit["openalex_ids"] = [author_id]
        rows.append({**paper,"found_via":"openalex_backfill"})
    return rows


def resolve_author_ids(raw, request):
    # OpenAlex indexes unversioned works. Require the exact arXiv DOI and
    # match the author display name before attaching an identity to a credit.
    pid = raw["id"].rsplit("v",1)[0]
    doi = "10.48550/arxiv."+pid.lower()
    result = request("https://api.openalex.org/works/https://doi.org/"+doi, openalex_params({})).json()
    if str(result.get("doi")).lower() != "https://doi.org/"+doi:
        return
    for credit in raw["credits"]:
        matches = [row["author"]["id"].rsplit("/",1)[-1] for row in result.get("authorships", [])
                   if identity_name(row["author"]["display_name"]) == identity_name(credit["name"])]
        if len(matches) == 1:
            credit["openalex_ids"] = matches


def balance_exploration(papers, config):
    lanes = {k:[p for p in papers if p["match"]["mode"]==k] for k in MODES}
    reserved = quotas(config["full_text_candidates"], {k:config["shares"][k] for k in CHANNELS})["exploration"]
    first = allocate(lanes, {k:config["exploration_shares"][k] for k in MODES}, reserved)
    return first + [p for k in MODES for p in lanes[k] if p not in first and config["exploration_shares"][k]>0]


def retrieve(config, start, end, request, memo):
    """One rotated profile per exploration mode. Cache successful query windows."""
    lanes = defaultdict(list)
    failures = []
    ambiguous = 0

    def fetch(query):
        return memo(digest([query,start.isoformat(),end.isoformat()]), lambda:search(query,start,end,request))

    for mode in MODES if config.get("exploration") else ():
        group = rotate([p for p in config["profiles"] if p["mode"] == mode], end)
        if not group:
            continue
        profile = group[0]
        try:
            cats, phrases = profile["categories"], profile["phrases"]
            query = "("+" OR ".join("cat:"+quote(c) for c in cats)+") AND ("+" OR ".join("all:"+quote(p) for p in phrases)+")"
            for raw in fetch(query):
                hits = phrase_hits(raw["title"]+" "+raw["abstract"], phrases)
                if hits:
                    rank = min(2,len(hits)) + 0.5*bool(set(cats)&set(raw["categories"]))
                    lanes[mode].append({**project_paper(raw),"match":{"profile":profile["name"], "mode":mode,
                        "abstraction":profile["abstraction"], "phrases":hits, "category":raw["categories"], "preliminary":rank}})
        except (ValueError, requests.RequestException, ET.ParseError, RuntimeError) as exc:
            failures.append(f"{mode}: {type(exc).__name__}")
    for profile in rotate(config.get("tracking", []), end) if config.get("targeted") else ():
        try:
            terms = ["au:"+quote(n) for n in [profile.get("name"), *profile.get("aliases", [])] if n]
            if not terms:
                terms = ["all:"+quote(n) for n in profile.get("affiliations", [])]
            candidates = fetch(" OR ".join(terms)) if terms else []
            if profile.get("openalex_id") and profile.get("backfill_days",0):
                try:
                    candidates = candidates + memo(digest(["openalex",profile,start.isoformat(),end.isoformat()]),
                        lambda:backfill_author(profile,start,end,request))
                except (ValueError, requests.RequestException, ET.ParseError, RuntimeError) as exc:
                    failures.append(f"backfill: {type(exc).__name__}")
            elif not terms:
                raise ValueError("Tracking entry needs a name, affiliation or enabled author-ID backfill")
            for raw in candidates:
                if profile.get("openalex_id") and not author_match(raw, profile):
                    def resolved():
                        resolve_author_ids(raw, request)
                        return raw["credits"]
                    raw = dict(raw,credits=memo(digest(["authors",raw["id"]]),resolved))
                status = author_match(raw, profile)
                if not status:
                    ambiguous += 1
                    continue
                hits = phrase_hits(raw["title"]+" "+raw["abstract"], profile.get("phrases", []))
                lanes["targeted"].append({**project_paper(raw), "match":{"profile":profile.get("name") or profile.get("openalex_id") or profile["affiliations"][0],
                    "identity":status, "via":raw.get("found_via","arxiv_atom"), "phrases":hits,"preliminary":(2 if status.startswith("confirmed") else 0) + min(1,len(hits))}})
        except (ValueError, requests.RequestException, ET.ParseError, RuntimeError) as exc:
            failures.append(f"targeted: {type(exc).__name__}")
    for papers in lanes.values():
        papers.sort(key=lambda p:(-p["match"]["preliminary"],p["paper_key"]))
    # Retain every provenance record. Interleave both modes up to their
    # reserved slots before appending remaining candidates for redistribution.
    lanes["exploration"] = balance_exploration([p for k in MODES for p in lanes[k]],config)
    return {k:lanes[k] for k in ("targeted","exploration")}, failures, ambiguous
