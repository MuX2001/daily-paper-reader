"""Offline, version-preserving projection of Step 5 recommendations (no LLM calls)."""
from __future__ import annotations
from summary_language import summary_language

import argparse
import json
import math
import os
from pathlib import Path
import re
import tempfile
from urllib.parse import urlsplit


def optional_text(value):
    return value.strip() or None if isinstance(value, str) else None


def public_url(value):
    value = optional_text(value)
    if not value:
        return None
    parsed = urlsplit(value)
    return value if parsed.scheme in ('http', 'https') and parsed.hostname and not parsed.username and not parsed.password else None


def tags(value):
    return sorted({v.strip() for v in value if isinstance(v, str) and v.strip()}) if isinstance(value, list) else []


def project_paper(paper):
    if not isinstance(paper, dict):
        raise ValueError('Recommendation must be an object')
    pid = optional_text(paper.get('id')) or optional_text(paper.get('paper_id'))
    title = optional_text(paper.get('title'))
    if not pid or not title:
        raise ValueError('Recommendation requires original ID and title')
    arxiv = re.fullmatch(r'(?:\d{4}\.\d{4,5}|[a-zA-Z.-]+/\d{7})(?:v(\d+))?', pid)
    source = optional_text(paper.get('source')) or ('arxiv' if arxiv else None)
    if not source:
        raise ValueError('Non-arXiv records require an explicit source')
    score = paper.get('llm_score')
    if score is not None and (isinstance(score, bool) or not isinstance(score, (int, float)) or not math.isfinite(score) or not 0 <= score <= 10):
        raise ValueError('llm_score must be finite and between 0 and 10')
    canonical = re.sub(r'v\d+$', '', pid) if source == 'arxiv' and arxiv else pid
    return {
        'paper_key': f'{source}:{pid}', 'original_id': pid,
        'canonical_id': f'{source}:{canonical}', 'source': source,
        'version': int(arxiv.group(1)) if source == 'arxiv' and arxiv and arxiv.group(1) else None,
        'title': title, 'title_zh': title if summary_language()=='en' else optional_text(paper.get('title_cn')),
        'abstract': optional_text(paper.get('abstract')),
        'authors': [name for a in (paper.get('authors') or [])
                    if (name := optional_text(a if isinstance(a, str) else a.get('name') if isinstance(a, dict) else None))],
        'venue': optional_text(paper.get('venue')),
        'publication_date': optional_text(paper.get('publication_date')),
        'publication_date_precision': optional_text(paper.get('publication_date_precision')),
        'published': optional_text(paper.get('published')),
        'url': public_url(paper.get('link')), 'pdf_url': public_url(paper.get('pdf_url')),
        'score': score, 'reason': optional_text(paper.get('llm_evidence_en')) if summary_language()=='en' else optional_text(paper.get('llm_evidence_cn')) or optional_text(paper.get('llm_evidence')),
        'tldr': optional_text(paper.get('llm_tldr_en')) if summary_language()=='en' else optional_text(paper.get('llm_tldr_cn')) or optional_text(paper.get('llm_tldr')),
        'tags': tags(paper.get('tags')) + tags(paper.get('llm_tags')),
        # These fields require a subsequent evidence-validated enrichment stage.
        'breakdown': {'problem': None, 'method': None, 'results': None},
        'code_url': None, 'thumbnail': None, 'content_status': 'incomplete',
    }


def merge_records(records):
    merged = {}
    for record in records:
        key = record['paper_key']
        old = merged.get(key)
        if old:
            combined_tags = sorted(set(old['tags']) | set(record['tags']))
            if (old['score'] if old['score'] is not None else -1) > (record['score'] if record['score'] is not None else -1):
                record = dict(old)
            else:
                record = dict(record)
            record['tags'] = combined_tags
            # Rebuilding the offline catalog must not erase verified enrichment.
            if old.get('content_status') in ('triage','minmax') and all(old.get(k) == record.get(k) for k in ('paper_key','title','abstract')):
                for field in ('title_zh','tldr','breakdown','evidence','code_url','thumbnail','content_status','triage_cache_key','input_scope','minmax','minmax_candidate','narrative','narrative_provenance'):
                    if field in old: record[field] = old[field]
        else:
            record = dict(record, tags=sorted(set(record['tags'])))
        merged[key] = record
    return sorted(merged.values(), key=lambda p: (-(p['score'] if p['score'] is not None else -1), p['paper_key']))


def build_feed(payload, run_id, previous=None):
    if not re.fullmatch(r'\d{8}(?:-\d{8})?', run_id):
        raise ValueError('Invalid run date token')
    if not isinstance(payload, dict):
        raise ValueError('Recommendation payload must be an object')
    records = []
    if previous is not None:
        if previous.get('schema_version') != 1 or previous.get('run_id') != run_id:
            raise ValueError('Existing feed schema/run mismatch')
        records.extend(previous['papers'])
    for group in ('deep_dive', 'quick_skim'):
        if group not in payload or not isinstance(payload[group], list):
            raise ValueError(f'Missing or invalid {group}')
        records.extend(project_paper(p) for p in payload[group])
    return {'schema_version': 1, 'run_id': run_id, 'papers': merge_records(records)}


def export_feed(input_path, output_path, run_id):
    output_path = Path(output_path)
    previous = json.loads(output_path.read_text()) if output_path.exists() else None
    result = build_feed(json.loads(Path(input_path).read_text()), run_id, previous)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8', dir=output_path.parent, delete=False) as handle:
            temporary = handle.name
            json.dump(result, handle, ensure_ascii=False, indent=2, allow_nan=False)
            handle.write('\n')
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, output_path)
    finally:
        if temporary and os.path.exists(temporary):
            os.unlink(temporary)
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', required=True)
    parser.add_argument('--output', required=True)
    parser.add_argument('--run-id', required=True)
    args = parser.parse_args()
    export_feed(args.input, args.output, args.run_id)


if __name__ == '__main__':
    main()
