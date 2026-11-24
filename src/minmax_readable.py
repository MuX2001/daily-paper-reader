"""Opt-in readable cards; default daily generation remains unchanged pending review."""
import hashlib
import json
from pathlib import Path
import re
from minmax import excerpts,restore_omitted_lines
from triage_enrich import atomic_json
from reader_fulltext import get_fulltext

PROMPT=Path(__file__).with_name('minmax_readable_prompt.txt').read_text()
LIMITS={'tldr':45,'problem_delta':70,'evidence':80,'caveats':60,'where_to_look':40}
BANNED=('本文针对','痛点','提出了一种','创新性','端到端框架','有效解决了','显著提升','取得了优异性能','值得注意的是','综合来看','极具潜力')
MISSING='所选片段未说明'
FIELDS=(*LIMITS,'method_steps','tags')
CARD_SCHEMA={'type':'object','properties':{**{k:{'type':'string','maxLength':v} for k,v in LIMITS.items()},'method_steps':{'type':'array','maxItems':4,'items':{'type':'string','maxLength':40}},'tags':{'type':'array','minItems':2,'maxItems':4,'items':{'type':'string','maxLength':12}}},'required':list(FIELDS),'additionalProperties':False}
QUOTE={'type':'object','properties':{k:{'type':['string','null']} for k in ('source_id','quote')},'required':['source_id','quote'],'additionalProperties':False}
SCHEMA={'type':'object','properties':{'card':CARD_SCHEMA,'citations':{'type':'object','properties':{k:QUOTE for k in (*LIMITS,'method_steps')},'required':[*LIMITS,'method_steps'],'additionalProperties':False}},'required':['card','citations'],'additionalProperties':False}


def context(text):
    # Exact source slices, ordered by purpose. Bounds are character budgets,
    # not a claim that every provider uses the same tokenizer.
    stop=re.search(r'(?im)^\s*(?:references|bibliography)\s*$',text)
    body=text[:stop.start()] if stop else text
    candidates=[(0,min(len(body),4800))]
    method=re.search(r'(?im)^.{0,12}(?:method(?:ology)?|model architecture|approach|design|system overview)\b[^\n]*',body)
    if method:
        tail=body[method.end():]
        end=re.search(r'(?im)^.{0,12}(?:experiments?|results|evaluation|conclusions?)\b',tail)
        method_end=method.end()+end.start() if end else min(len(body),method.end()+14000)
        candidates.append((method.start(),min(method.start()+1400,method_end)))
        # Numbered subsections in HTML text/PDF layout; keep each heading and
        # its opening prose, not the entire derivation.
        for m in re.finditer(r'(?m)^\s*\d+\.\d+(?:\.\d+)?\s*[^\n]*\n',body[method.start():method_end]):
            start=method.start()+m.start();candidates.append((start,min(start+900,method_end)))
    for m in re.finditer(r'(?im)^\s*(?:figure|fig\.|table)\s*\d+[^\n]*',body):
        candidates.append((m.start(),min(m.start()+850,len(body))))
    endings=[]
    for m in re.finditer(r'(?im)^.{0,12}(?:conclusions?|limitations?)\b[^\n]*',body):
        endings.append((m.start(),min(m.start()+1400,len(body))))
    # Reserve room for concluding scope/limitations rather than spending all
    # context on a long table list. Split around dense formula-only lines.
    out=[];covered=[]
    def add(spans,budget):
        for start,end in spans:
            for a,b in sorted(covered):
                if a<=start<b:start=b
                if start<a<end:end=a
            if start>=end or budget<=0:continue
            end=min(end,start+budget)
            segment=body[start:end]
            pieces=re.split(r'(?m)^\s*\$[^\n]{100,}\$\s*$',segment)
            cursor=start
            for piece in pieces:
                if piece.strip():
                    offset=body.find(piece,cursor,end)
                    out.append({'id':f'E{len(out)+1}','start':offset,'end':offset+len(piece),'text':piece})
                    covered.append((offset,offset+len(piece)))
                    cursor=offset+len(piece)
            budget-=end-start
    add(candidates,12000);add(endings,2000)
    return out


def validate(value,parts):
    if not isinstance(value,dict) or set(value)!={'card','citations'}:raise ValueError('Readable envelope mismatch')
    card=value['card'];quotes=value['citations']
    if not isinstance(card,dict) or set(card)!=set(FIELDS):raise ValueError('Readable fields mismatch')
    if not isinstance(quotes,dict) or set(quotes)!=set((*LIMITS,'method_steps')):raise ValueError('Missing citations')
    for k,limit in LIMITS.items():
        if not isinstance(card[k],str) or not card[k].strip() or len(card[k])>limit:raise ValueError(f'Length/type: {k}')
    steps=card['method_steps'];tags=card['tags']
    if not isinstance(steps,list) or len(steps) not in (0,3,4) or any(not isinstance(v,str) or not v.strip() or len(v)>40 for v in steps):raise ValueError('Invalid method steps')
    if not isinstance(tags,list) or not 2<=len(tags)<=4 or any(not isinstance(v,str) or not v.strip() or len(v)>12 for v in tags) or len(set(tags))!=len(tags):raise ValueError('Invalid tags')
    if sum(len(card[k]) for k in LIMITS if k!='tldr')+sum(map(len,steps))>400:raise ValueError('Card too long')
    prose=' '.join([*(card[k] for k in LIMITS),*steps,*tags])
    if any(w in prose for w in (*BANNED,'原文未提','全文没有','**','##')):raise ValueError('Banned prose')
    if len(re.findall(r'[。！？!?]',card['tldr'].rstrip('。')))>0:raise ValueError('TLDR must be one sentence')
    sources={p['id']:p['text'] for p in parts}
    for k,c in quotes.items():
        if not isinstance(c,dict) or set(c)!={'source_id','quote'}:raise ValueError('Invalid citation')
        missing=card[k]==MISSING or (k=='method_steps' and not steps)
        if missing:
            if any(v is not None for v in c.values()):raise ValueError('Missing claim with citation')
            continue
        if not isinstance(c['quote'],str) or not c['quote'].strip() or not isinstance(c['source_id'],str):raise ValueError('Missing evidence: '+k)
        source=sources.get(c['source_id'],'');q=c['quote']
        if q not in source:
            tokens=re.findall(r'[A-Za-z0-9_]+|[^\s]',q)
            m=re.search(r'\s*'.join(re.escape(w) for w in tokens),source)
            q=m.group() if m else restore_omitted_lines(q,source)
        if not 8<=len(q)<=1200 or q not in source:raise ValueError('Unverifiable citation: '+k)
        c['quote']=q
    return value


def enrich(paper,client,root,fetcher=get_fulltext):
    text,meta=fetcher(paper['original_id'],Path(root)/'sources');parts=context(text)
    payload={'paper_key':paper['paper_key'],'title':paper['title'],'excerpts':parts}
    identity={'input':payload,'prompt':PROMPT,'schema':SCHEMA,'model':client.model,'endpoint':client.base_url,'options':client.kwargs,'version':'readable-v1'}
    key=hashlib.sha256(json.dumps(identity,ensure_ascii=False,sort_keys=True).encode()).hexdigest();path=Path(root)/'readable'/f'{key}.json'
    reused=False
    if path.exists():value=validate(json.loads(path.read_text())['result'],parts);reused=True
    else:
        response=client.chat_structured([{'role':'system','content':PROMPT},{'role':'user','content':json.dumps(payload,ensure_ascii=False)}],schema_name='readable_card',schema=SCHEMA,allow_validation_fallback=False)
        if response.get('parse_error') or response.get('refusal') or response.get('finish_reason')=='length':raise ValueError('Incomplete readable response')
        value=validate(response.get('parsed'),parts);atomic_json(path,{'result':value,'identity':identity,'tokens':response.get('tokens')})
    mapping={'delta':'problem_delta','steps':'method_steps','evidence':'evidence','constraints':'caveats','landmarks':'where_to_look'}
    claims={}
    for old,new in mapping.items():
        t=value['card'][new];t='\n'.join(f'{i+1}) {v}' for i,v in enumerate(t)) if isinstance(t,list) else t
        claims[old]={'text':t,**value['citations'][new]}
    return {**paper,'tldr':value['card']['tldr'],'minmax':{'status':'ready','format':'readable-v1','readable':value['card'],'citations':value['citations'],'source':meta,'excerpts':parts,'cache_key':key,**claims},'content_status':'minmax'},reused
