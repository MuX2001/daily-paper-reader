"""Offline projection of published conference pages, with explicit identities only."""
import hashlib
import json
import re
from urllib.parse import urlsplit, parse_qs
import yaml
from triage_export import project_paper, merge_records
from triage_enrich import atomic_json


def conference_catalog(root, destination):
    entries=[]
    skipped=[]
    for folder in sorted((root/'docs/conference').glob('*')):
        if not folder.is_dir():continue
        records=[]
        for path in sorted(folder.glob('*.md')):
            text=path.read_text(encoding='utf-8')
            match=re.match(r'^---\s*\n(.*?)\n---\s*\n',text,re.S)
            if not match:continue
            meta=yaml.safe_load(match.group(1))
            if not isinstance(meta,dict) or meta.get('selection_source')!='conference_retrieval':continue
            pid=meta.get('original_id');link=meta.get('original_url')
            # Old pages lack IDs in YAML. Only the explicitly labelled original link
            # may establish one; a lossy filename/title is not identity evidence.
            if not link:
                old=re.search(r'^- OpenReview：\[(https?://[^\]\s]+)\]\(',text,re.M)
                link=old.group(1) if old else None
            if not pid and link:
                url=urlsplit(link)
                if url.hostname=='openreview.net' and url.path=='/forum':
                    ids=parse_qs(url.query).get('id',[])
                    if len(ids)==1 and re.fullmatch(r'[A-Za-z0-9_-]+',ids[0]):pid=ids[0]
            source=meta.get('source')
            if not isinstance(pid,str) or not pid or not isinstance(source,str) or not source or not meta.get('title'):
                skipped.append(path.relative_to(root/'docs').as_posix());continue
            abstract=re.search(r'^## Abstract\s*\n(.*?)(?=\n## |\n---|\Z)',text[match.end():],re.S|re.M)
            authors=meta.get('authors_list',[])
            raw={'id':pid,'source':source,'title':meta['title'],'title_cn':meta.get('title_zh'),
                 'authors':authors if isinstance(authors,list) else [],'link':link,'pdf_url':meta.get('pdf'),
                 'abstract':abstract.group(1).strip() if abstract else None,
                 'llm_score':meta.get('score'),'llm_evidence':meta.get('evidence'),'llm_tldr':meta.get('tldr'),
                 'tags':meta.get('tags',[]),'publication_date':str(meta['publication_date']) if meta.get('publication_date') else None,
                 'publication_date_precision':meta.get('publication_date_precision')}
            record=project_paper(raw)
            route=path.relative_to(root/'docs').with_suffix('').as_posix()
            record.update(reading_path='./legacy.html#/'+route,legacy_routes=[route])
            fulltext=path.with_suffix('.txt')
            if fulltext.exists():
                body=fulltext.read_text(errors='replace')
                if len(body)>4000 and re.search(r'\b(references|bibliography)\b',body,re.I):record['fulltext_path']='./docs/'+route+'.txt'
            records.append(record)
        if records:
            run_id='conference-'+hashlib.sha256(folder.name.encode()).hexdigest()[:16]
            relative='conferences/'+run_id+'.json'
            records=merge_records(records)
            atomic_json(destination/relative,{'schema_version':1,'run_id':run_id,'papers':records})
            entries.append({'run_id':run_id,'title':folder.name,'kind':'conference','count':len(records),'path':relative})
    return entries,skipped
