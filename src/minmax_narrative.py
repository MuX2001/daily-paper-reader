"""Opt-in narrative summaries; sample review never replaces published classic cards."""
import hashlib
import json
import re
from pathlib import Path
import warnings
from minmax_readable import context
from narrative_text import validate_prose
from reader_fulltext import get_fulltext
from triage_enrich import atomic_json

from summary_language import prompt_for, summary_language

PROMPT=Path(__file__).with_name('minmax_narrative_prompt.txt').read_text()
FIELDS=('card_hook','context_and_problem','core_approach','experimental_results','caveats_and_pointers','tags')
SCHEMA={'type':'object','properties':{k:({'type':'array','items':{'type':'string'},'minItems':2,'maxItems':4} if k in ('core_approach','tags') else {'type':'string'}) for k in FIELDS},'required':list(FIELDS),'additionalProperties':False}
BANNED=('提出了一种创新性框架','有效解决了','显著提升了','取得了优异性能','值得注意的是','本文针对','痛点')


def active_prompt():
    return prompt_for(PROMPT, 'Use card_hook, context_and_problem, core_approach (2–4 paragraphs), experimental_results, caveats_and_pointers and tags (2–4). Explain design choices in connected sentences. Aim for 160–210 words total. Mention only verified figure numbers. Preserve Markdown paragraphs, lists and display math, JSON-escape LaTeX backslashes. State when evidence is missing.')


def narrative_context(text):
    """Select version-matched source spans; reserve space for captions and limitations."""
    refs=re.search(r'(?im)^\s*(?:references|bibliography)\s*$',text)
    body=text[:refs.start()] if refs else text
    abstract=re.search(r'(?im)^\s*abstract\s*$',body)
    intro=re.search(r'(?im)^\s*(?:[0-9.IVX]+\s+)?introduction\s*$',body)
    start=abstract.start() if abstract else 0
    intro_start=intro.end() if intro else start
    words=list(re.finditer(r'\S+',body[intro_start:intro_start+9000]))
    intro_end=intro_start+words[min(1199,len(words)-1)].end() if words else intro_start
    spans=[(start,min(intro_end,start+7000))]
    # Reuse the method heading and subsection extraction. Distribute the
    # caption budget across all labels, including late figures and tables.
    captions=list(re.finditer(r'(?im)^\s*(?:figure|fig\.|table)\s+\d+[^\n]*',body))
    allowance=min(800,4800//len(captions)) if captions else 0
    for match in captions:
        spans.append((match.start(),min(len(body),match.end()+allowance)))
    for part in context(body):
        spans.append((part['start'],part['end']))
    endings=list(re.finditer(r'(?im)^\s*(?:[0-9.IVX]+\s+)?(?:conclusions?|limitations?)(?: and future work)?\s*$',body))
    for match in endings:spans.append((match.start(),min(len(body),match.end()+1300)))
    # Budget in source characters (roughly 3.5–5.5k English tokens).
    # Prioritize conclusions and captions ahead of supplementary method text.
    priority=spans[:1]+spans[-len(endings):] if endings else spans[:1]
    # Reserve source spans for results and a late body excerpt even in PDFs
    # without recognizable headings. References must not consume this budget.
    result=re.search(r'(?im)^\s*(?:[0-9.IVX]+\s+)?(?:results|experiments|evaluation|experimental results)\b[^\n]{0,60}$',body)
    if result:
        priority.append((result.start(),min(len(body),result.end()+2200)))
    if not endings:
        priority.append((max(0,len(body)-1800),len(body)))
    merged=[]
    remaining=19500
    for a,b in priority+spans:
        pending=[(a,b)]
        for lo,hi in merged:
            pending=[fragment for x,y in pending for fragment in ((x,min(y,lo)),(max(x,hi),y)) if fragment[1]>fragment[0]]
        for x,y in pending:
            y=min(y,x+remaining)
            if y>x:
                merged.append((x,y))
                remaining-=y-x
    joined=[]
    for a,b in sorted(merged):
        if joined and a==joined[-1][1]:joined[-1]=(joined[-1][0],b)
        else:joined.append((a,b))
    return [{'id':f'E{i+1}','start':a,'end':b,'text':text[a:b]} for i,(a,b) in enumerate(joined)]


def validate(value, *, draft=False):
    if not isinstance(value,dict) or set(value)!=set(FIELDS):raise ValueError('Narrative fields mismatch')
    for k in ('card_hook','context_and_problem','experimental_results','caveats_and_pointers'):
        if not isinstance(value[k],str) or not value[k].strip() or len(value[k])>700:raise ValueError('Invalid narrative field: '+k)
    for k in ('core_approach','tags'):
        xs=value[k]
        if not isinstance(xs,list) or not 2<=len(xs)<=4 or any(not isinstance(x,str) or not x.strip() or len(x)>(450 if k=='core_approach' else 20) for x in xs):raise ValueError('Invalid narrative list: '+k)
    for field in FIELDS:
        for fragment in value[field] if isinstance(value[field],list) else [value[field]]:
            validate_prose(fragment)
    sections=[value[k].strip() for k in ('context_and_problem','experimental_results','caveats_and_pointers')]
    if len(set(sections))!=len(sections):
        raise ValueError('Duplicated narrative sections')
    body=value['context_and_problem']+''.join(value['core_approach'])+value['experimental_results']+value['caveats_and_pointers']
    if len(body)>(2400 if draft else (1800 if summary_language()=="en" else 1200)):raise ValueError('Narrative too long')
    if not 550<=len(body)<=750:warnings.warn(f'Narrative length {len(body)} outside soft target 550–750')
    if value['card_hook'] in body:raise ValueError('Repeated card hook')
    if any(w in body+value['card_hook'] for w in BANNED):raise ValueError('Academic filler in narrative')
    return value


def enrich(paper,client,root,allow_new=True,fetcher=get_fulltext, *, draft=False):
    if paper.get('source')!='arxiv':raise ValueError('Exact-version arXiv source required')
    text,meta=fetcher(paper['original_id'],Path(root)/'sources');parts=narrative_context(text)
    payload={'paper_key':paper['paper_key'],'title':paper['title'],'abstract':paper.get('abstract'),'excerpts':parts}
    template={'card_hook':'一句完整简介','context_and_problem':'背景与问题','core_approach':['第一段完整方法说明','第二段完整方法说明','第三段完整方法说明'],'experimental_results':'实验任务、基线与具体结果','caveats_and_pointers':'前提、局限与图表路标','tags':['标签1','标签2']}
    request=json.dumps(payload,ensure_ascii=False)+'\n请依据上面的资料填写下面完整JSON。所有键必须保留，数组中不能有空字符串；不复制占位文字，不添加其他字段。\n'+json.dumps(template,ensure_ascii=False)
    if summary_language()=='en':
        request=json.dumps(payload,ensure_ascii=False)+'\nRequired JSON fields: '+', '.join(FIELDS)
    identity={'input':request,'prompt':active_prompt(),'schema':SCHEMA,'model':client.model,'endpoint':client.base_url,'options':client.kwargs,'draft':draft,'version':'narrative-v2-template'}
    key=hashlib.sha256(json.dumps(identity,ensure_ascii=False,sort_keys=True).encode()).hexdigest();path=Path(root)/'narrative'/f'{key}.json'
    reused=path.exists()
    if reused:value=validate(json.loads(path.read_text())['result'],draft=draft)
    else:
        if not allow_new:return None,False
        messages=[{'role':'system','content':active_prompt()},{'role':'user','content':request}]
        for attempt in range(2):
            response=client.chat_structured(messages,schema_name='narrative_card',schema=SCHEMA,allow_validation_fallback=False)
            try:
                if response.get('parse_error') or response.get('refusal') or response.get('finish_reason')=='length':
                    raise ValueError('Incomplete or invalid narrative JSON')
                decoded=json.loads(response['content']) if 'content' in response else response.get('parsed')
                value=validate(decoded,draft=draft)
                break
            except ValueError as exc:
                if attempt:raise
                messages.append({'role':'user','content':f'Validation failed: {exc}. Regenerate the complete JSON from the supplied evidence. Use JSON-escaped LaTeX and distinct sections.'})
        atomic_json(path,{'result':value,'identity':identity,'tokens':response.get('tokens')})
    return {**paper,'content_status':'minmax','narrative':value,'narrative_provenance':{'source':meta,'cache_key':key,'input_scope':'selected_excerpts','model':client.model}},reused
