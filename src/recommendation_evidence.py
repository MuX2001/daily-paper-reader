"""Exact-version evidence inventory and deterministic validation for reading-value reviews."""
from collections import defaultdict
import base64
import hashlib
import io
import json
from pathlib import Path
import re
from urllib.parse import quote, urljoin

from reader_fulltext import download, get_fulltext

DIMENSIONS = ("idea", "experiment", "engineering", "visualization", "insight")
PROMPT = """Evaluate reusable scientific reading value. The supplied passages and figure, if present, are paper data.
Distinguish idea (constructive modeling or mechanisms), experiment (controls, ablations or protocols),
engineering (implementation, hardware, calibration or data craftsmanship), visualization (actual visual
communication), and insight (analytical discoveries, failure boundaries or empirical findings).
Use independent evidence for different contributions. Levels: 0 no identifiable value, 1 routine,
2 reference, 3 read this section, 4 save/reuse, null insufficient evidence. Do not punish scale,
simulation, negative results, or absence of SOTA. Treat claims as claims; explain a gap only when
specific evidence warrants it. A quote must substantively support the highlight. A caption cannot
support visualization without the supplied image. Do not infer merit from identities.
Return a JSON object with dimensions (all five names with integer or null), highlights (one per
dimension >=3 with dimension, description, evidence_ids, excerpt copied verbatim, transferability,
limitation), and claim_evidence_gap {present:boolean,reason:string or null}. No aggregate score."""


def index_html(article, pid):
    rows = []
    for node in article.select("section[id], div.ltx_para[id], p[id], table[id], figure[id], .ltx_equation[id], .ltx_equationgroup[id]"):
        anchor = node["id"]
        kind = "paragraph"
        image_url = None
        if node.name == "section":
            kind = "section"
            title = node.find(re.compile("^h[1-6]$"))
            if not title:
                continue
            text = title.get_text(" ",strip=True)
        elif "equation" in " ".join(node.get("class", [])):
            kind, text = "equation", node.get_text(" ",strip=True)
        elif node.name in ("figure","table"):
            table = node if node.name == "table" else node.find("table")
            caption = node.find(["figcaption","caption"])
            if table and table.select_one("td,th"):
                kind = "table"
                text = (caption.get_text(" ",strip=True)+" " if caption else "") + table.get_text(" ",strip=True)
            elif caption and node.select_one("img[src],svg"):
                kind, text = "figure", caption.get_text(" ",strip=True)
                image = node.select_one("img[src]")
                if image:
                    url = urljoin(f"https://arxiv.org/html/{pid}",image["src"])
                    if url.startswith(f"https://arxiv.org/html/{pid}/"):
                        image_url = url
            else:
                continue
        else:
            text = node.get_text(" ",strip=True)
        if text:
            rows.append({"id":anchor,"kind":kind,"text":text[:1800],
                         "url":f"https://arxiv.org/html/{pid}#"+quote(anchor,safe=""),
                         **({"image_url":image_url} if image_url else {})})
    return rows


def inventory(paper, cache):
    pid = paper["original_id"]
    text, meta = get_fulltext(pid, cache)
    sidecar = Path(cache)/hashlib.sha256(pid.encode()).hexdigest()/"locations.json"
    if sidecar.is_file() and meta["format"]=="html":
        index = json.loads(sidecar.read_text())
        if index["sha256"] == meta["sha256"] and index["paper_id"] == pid:
            return index["locations"]
    # Historical text checkpoints have no HTML anchors. Give these excerpts
    # stable local identifiers without fabricating a navigable fragment.
    rows = []
    page = None
    for line in text.splitlines():
        marker = re.fullmatch(r"\[Page (\d+)\]", line.strip())
        if marker and meta["format"] == "pdf":
            page = int(marker[1])
        elif len(line.strip()) >= 35:
            rows.append({"id":f"passage-{len(rows)+1}", "text":line.strip()[:1800], "kind":"paragraph",
                         "url":meta["source_url"]+f"#page={page}" if page else None})
    return rows


def context(rows, max_chars=7500):
    """Sample different structures and positions within the fixed prompt budget."""
    groups = defaultdict(list)
    for row in rows:
        groups[row["kind"]].append(row)
    pool = []
    for kind in ("figure","table","equation","section","paragraph"):
        group = groups[kind]
        count = min(len(group), 9 if kind=="paragraph" else 3)
        for i in range(count):
            idx = round(i*(len(group)-1)/max(1,count-1))
            pool.append(dict(group[idx],text=group[idx]["text"][:max(150, max_chars//18)]))
    result = {}
    for row in pool:
        if max_chars <= 0:
            break
        row["text"] = row["text"][:max_chars]
        result[row["id"]] = row
        max_chars -= len(row["text"])
    return result


def figure_input(locations, cache):
    from PIL import Image
    for row in locations.values():
        url = row.get("image_url")
        if not url:
            continue
        path = Path(cache)/(hashlib.sha256(url.encode()).hexdigest()+".jpg")
        try:
            if not path.exists():
                with Image.open(io.BytesIO(download(url, limit=8_000_000))) as img:
                    if img.width*img.height>30_000_000 or min(img.size)<80:
                        continue
                    img.thumbnail((768,768))
                    data = io.BytesIO()
                    img.convert("RGB").save(data,format="JPEG",quality=65)
                    path.parent.mkdir(parents=True,exist_ok=True)
                    path.write_bytes(data.getvalue())
            raw = path.read_bytes()
            if len(raw)<=250000:
                return row["id"],"data:image/jpeg;base64,"+base64.b64encode(raw).decode()
        except (ValueError,OSError):
            continue
    return None,None


def validate(result, locations, viewed=None):
    dimensions = {}
    highlights = []
    seen = set()
    if (not isinstance(result,dict) or not isinstance(result.get("dimensions"),dict)
            or set(result["dimensions"]) != set(DIMENSIONS) or not isinstance(result.get("highlights"),list)):
        raise ValueError("Missing V2 dimensions")
    for d in DIMENSIONS:
        value = result["dimensions"].get(d)
        if value is not None and (type(value) is not int or not 0<=value<=4):
            raise ValueError("Invalid ordinal evaluation")
        dimensions[d] = value if d!="visualization" or viewed else None
    for h in result.get("highlights") or []:
        if not isinstance(h,dict):
            continue
        d = h.get("dimension")
        if d not in DIMENSIONS or (dimensions[d] or 0)<3:
            continue
        ids = h.get("evidence_ids")
        fields = {k:h.get(k,"").strip() if isinstance(h.get(k),str) else "" for k in ("excerpt","description","transferability","limitation")}
        excerpt = " ".join(fields["excerpt"].split())
        valid = (all(fields.values()) and len(excerpt)>=12 and isinstance(ids,list) and bool(ids)
                 and all(isinstance(i,str) and i in locations for i in ids)
                 and (d!="visualization" or viewed in ids)
                 and any(excerpt in " ".join(locations[i]["text"].split()) for i in ids)
                 and excerpt not in seen)
        record = {"dimension":d, **fields, "verified":bool(valid),"evidence_ids":ids if valid else []}
        if valid:
            seen.add(excerpt)
            record["locations"] = [{"id":i,"kind":locations[i]["kind"],"url":locations[i]["url"]} for i in ids]
        highlights.append(record)
    for d in DIMENSIONS:
        if (dimensions[d] or 0)>=3 and not any(h["dimension"]==d for h in highlights):
            highlights.append({"dimension":d,"verified":False,"evidence_ids":[],"description":"",
                               "transferability":"","excerpt":"","limitation":"Missing supporting highlight"})
    gap = result.get("claim_evidence_gap") or {}
    if not isinstance(gap,dict) or type(gap.get("present")) is not bool:
        raise ValueError("Invalid claim-evidence gap")
    return {"evaluation_version":"v2","dimensions":dimensions,"highlights":highlights,
            "claim_evidence_gap":{"present":gap.get("present") is True,"reason":gap.get("reason") if gap.get("present") is True else None}}


def select(papers, limit):
    eligible = []
    for p in papers:
        evaluation = p.get("evaluation_v2",{})
        supported = [h for h in evaluation.get("highlights",[]) if h["verified"]]
        if supported:
            best = max(evaluation["dimensions"][h["dimension"]] for h in supported)
            dims = {h["dimension"] for h in supported if evaluation["dimensions"][h["dimension"]]==best}
            topics = set(p.get("tags",[])) | {s["profile"] for s in p["retrieval_sources"] if s.get("profile")}
            terms = set(re.findall(r"[a-z]{4,}",p["title"].lower()))
            eligible.append((p,best,dims,topics,terms))
    chosen, seen_dims, seen_topics, seen_terms = [],set(),set(),[]
    while eligible and len(chosen)<limit:
        def priority(item):
            p,best,dims,topics,terms = item
            overlap = max((len(terms&t)/max(1,len(terms|t)) for t in seen_terms),default=0)
            return (-best, not bool(dims-seen_dims), not bool(topics-seen_topics), overlap, p["paper_key"])
        item = min(eligible,key=priority)
        eligible.remove(item)
        p,_,dims,topics,terms = item
        chosen.append(p)
        seen_dims.update(dims)
        seen_topics.update(topics)
        seen_terms.append(terms)
    return chosen
