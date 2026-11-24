"""Opt-in narrative summaries; sample review never replaces published classic cards."""
import hashlib
import json
import re
from pathlib import Path
import warnings
from minmax_readable import context
from reader_fulltext import get_fulltext
from triage_enrich import atomic_json

PROMPT=Path(__file__).with_name('minmax_narrative_prompt.txt').read_text()
FIELDS=('card_hook','context_and_problem','core_approach','results_and_reality_check','tags')
SCHEMA={'type':'object','properties':{k:({'type':'array','items':{'type':'string'},'minItems':2,'maxItems':4} if k in ('core_approach','tags') else {'type':'string'}) for k in FIELDS},'required':list(FIELDS),'additionalProperties':False}
BANNED=('提出了一种创新性框架','有效解决了','显著提升了','取得了优异性能','值得注意的是','本文针对','痛点')


def narrative_context(text):
    # Keep the methods in sequence, including qualifications at paragraph ends.
    # Supplement with the existing caption/conclusion selection; do not alter
    # the exact-version downloader or classic daily input.
    abstract=re.search(r'(?im)^\s*abstract\s*$',text)
    start=abstract.start() if abstract else 0
    end=min(len(text),start+18000)
    if end<len(text):
        boundary=re.search(r'\n\s*\n|\n',text[end:end+600])
        if boundary:end+=boundary.end()
    spans=[(start,end),*((p['start'],p['end']) for p in context(text))]
    merged=[]
    for a,b in sorted(spans):
        if merged and a<=merged[-1][1]:merged[-1]=(merged[-1][0],max(b,merged[-1][1]))
        else:merged.append((a,b))
    return [{'id':f'E{i+1}','start':a,'end':b,'text':text[a:b]} for i,(a,b) in enumerate(merged)]


def validate(value):
    if not isinstance(value,dict) or set(value)!=set(FIELDS):raise ValueError('Narrative fields mismatch')
    for k in ('card_hook','context_and_problem','results_and_reality_check'):
        if not isinstance(value[k],str) or not value[k].strip() or len(value[k])>700:raise ValueError('Invalid narrative field: '+k)
    for k in ('core_approach','tags'):
        xs=value[k]
        if not isinstance(xs,list) or not 2<=len(xs)<=4 or any(not isinstance(x,str) or not x.strip() or len(x)>(450 if k=='core_approach' else 20) for x in xs):raise ValueError('Invalid narrative list: '+k)
    body=value['context_and_problem']+''.join(value['core_approach'])+value['results_and_reality_check']
    if len(body)>1200:raise ValueError('Narrative too long')
    if not 450<=len(body)<=650:warnings.warn(f'Narrative length {len(body)} outside soft target 450–650')
    if value['card_hook'] in body:raise ValueError('Repeated card hook')
    if any(w in body+value['card_hook'] for w in BANNED):raise ValueError('Academic filler in narrative')
    return value


def enrich(paper,client,root,allow_new=True,fetcher=get_fulltext):
    if paper.get('source')!='arxiv':raise ValueError('Exact-version arXiv source required')
    text,meta=fetcher(paper['original_id'],Path(root)/'sources');parts=narrative_context(text)
    payload={'paper_key':paper['paper_key'],'title':paper['title'],'abstract':paper.get('abstract'),'excerpts':parts}
    identity={'input':payload,'prompt':PROMPT,'schema':SCHEMA,'model':client.model,'endpoint':client.base_url,'options':client.kwargs,'version':'narrative-v1'}
    key=hashlib.sha256(json.dumps(identity,ensure_ascii=False,sort_keys=True).encode()).hexdigest();path=Path(root)/'narrative'/f'{key}.json'
    reused=path.exists()
    if reused:value=validate(json.loads(path.read_text())['result'])
    else:
        if not allow_new:return None,False
        response=client.chat_structured([{'role':'system','content':PROMPT},{'role':'user','content':json.dumps(payload,ensure_ascii=False)}],schema_name='narrative_card',schema=SCHEMA,allow_validation_fallback=False)
        if response.get('parse_error') or response.get('refusal') or response.get('finish_reason')=='length':raise ValueError('Incomplete narrative response')
        value=validate(response.get('parsed'));atomic_json(path,{'result':value,'identity':identity,'tokens':response.get('tokens')})
    return {**paper,'narrative':value,'narrative_provenance':{'source':meta,'cache_key':key,'input_scope':'selected_excerpts','model':client.model}},reused
