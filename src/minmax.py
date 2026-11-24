"""Bounded, evidence-grounded extraction for final selected papers only."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
from triage_enrich import atomic_json
from reader_fulltext import get_fulltext

PROMPT=Path(__file__).with_name('minmax_prompt.txt').read_text()
FIELDS=('delta','steps','evidence','constraints','landmarks')
CLAIM={'type':'object','properties':{k:{'type':['string','null']} for k in ('text','quote','source_id')},'required':['text','quote','source_id'],'additionalProperties':False}
SCHEMA={'type':'object','properties':{'paper_key':{'type':'string'},'title_zh':{'type':'string'},**{k:CLAIM for k in FIELDS}},'required':['paper_key','title_zh',*FIELDS],'additionalProperties':False}


def excerpts(text):
    # Exact offsets remain verifiable for HTML text and page-marked PDF fallback.
    # Prioritize the opening, conclusions, method/experiment sections and captions.
    spans=[(0,min(4500,len(text)))]
    patterns=[(r'(?im)^.{0,16}(?:conclusions?|limitations?)\b[^\n]*',1800),
              (r'(?im)^\s*(?:Figure|Fig\.|Table)\s*\d+[^\n]*',750),
              (r'(?im)^.{0,16}(?:method(?:ology)?|approach|architecture|experiments?|results|ablation)\b[^\n]*',2200)]
    for pattern,size in patterns:
        for match in re.finditer(pattern,text):
            spans.append((match.start(),min(len(text),match.start()+size)))
    result=[];budget=18000;covered=[]
    for start,end in spans:
        for a,b in sorted(covered):
            if a<=start<b:start=b
            if start<a<end:end=a
        if start>=end or budget<=0:continue
        end=min(end,start+budget)
        result.append({'id':f'E{len(result)+1}','start':start,'end':end,'text':text[start:end]})
        covered.append((start,end));budget-=end-start
    return result


def validate(value,paper,parts):
    if not isinstance(value,dict) or set(value)!=set(SCHEMA['required']) or value['paper_key']!=paper['paper_key']:
        raise ValueError('Min-Max identity/schema mismatch')
    if not isinstance(value['title_zh'],str) or not value['title_zh'].strip():raise ValueError('Missing title')
    sources={p['id']:p['text'] for p in parts};size=0
    for field in FIELDS:
        c=value[field]
        if not isinstance(c,dict) or set(c)!= {'text','quote','source_id'}:raise ValueError('Invalid claim')
        if all(v is None for v in c.values()):continue
        if not all(isinstance(v,str) and v.strip() for v in c.values()):raise ValueError('Incomplete evidence')
        if c['source_id'] not in sources or not 8<=len(c['quote'])<=800 or c['quote'] not in sources[c['source_id']]:raise ValueError(f'Unsupported evidence: {field}')
        if field=='steps':
            # Accept numbered steps on one line without weakening step count.
            normalized=re.sub(r'[；;]\s*(?=[1-4][).、])','\n',c['text'])
            lines=normalized.splitlines()
            if not 3<=len(lines)<=4 or any(not re.match(rf'^\s*{i}[).、]',line) for i,line in enumerate(lines,1)):
                raise ValueError('Method needs 3–4 numbered steps')
            c['text']=normalized
        size+=len(c['text'])
    if size>400:raise ValueError('Card exceeds 400 characters')
    return value


def enrich(paper,client,root,allow_new=True,fetcher=get_fulltext):
    if paper.get('source')!='arxiv':raise ValueError('Exact-version source retrieval not supported')
    text,meta=fetcher(paper['original_id'],Path(root)/'sources')
    parts=excerpts(text)
    payload={'paper_key':paper['paper_key'],'title':paper['title'],'excerpts':parts}
    identity={'input':payload,'prompt':PROMPT,'schema':SCHEMA,'model':client.model,'endpoint':client.base_url,'options':client.kwargs,'version':1}
    key=hashlib.sha256(json.dumps(identity,sort_keys=True,ensure_ascii=False).encode()).hexdigest()
    path=Path(root)/'minmax'/f'{key}.json';result=None
    if path.exists():
        try:result=validate(json.loads(path.read_text())['result'],paper,parts)
        except (ValueError,KeyError,TypeError):pass
    reused=result is not None
    if not reused:
        if not allow_new:return None,False
        response=client.chat_structured([{'role':'system','content':PROMPT},{'role':'user','content':json.dumps(payload,ensure_ascii=False)}],schema_name='minmax_card',schema=SCHEMA,allow_validation_fallback=False)
        if response.get('parse_error') or response.get('refusal') or response.get('finish_reason')=='length':raise ValueError('Incomplete model output')
        result=validate(response.get('parsed'),paper,parts)
        atomic_json(path,{'result':result,'identity':identity})
    card={'status':'ready','input_scope':'selected_excerpts','source':meta,'excerpts':parts,'cache_key':key,**{k:result[k] for k in FIELDS}}
    return {**paper,'title_zh':result['title_zh'],'minmax':card,'tldr':result['delta']['text'] or paper.get('tldr'),'content_status':'minmax'},reused


def enrich_feed(path,root,client,max_new=50):
    feed=json.loads(Path(path).read_text());calls=0;failures=0
    # Never expand the final list; process highest-ranked cards first.
    for i in sorted(range(len(feed['papers'])),key=lambda i:-(feed['papers'][i].get('score') or 0)):
        p=feed['papers'][i]
        try:
            result,reused=enrich(p,client,root,allow_new=calls<max_new)
            if result is None:p['minmax']={'status':'deferred','reason':'本轮生成预算已用完'}
            else:feed['papers'][i]=result;calls+=not reused
        except Exception as exc:
            # Count failed attempts conservatively toward the budget too.
            calls+=1;failures+=1
            if p.get('minmax',{}).get('status')!='ready':p['minmax']={'status':'unavailable','reason':('此来源尚未接入已核验全文抽取，请打开原文' if p.get('source')!='arxiv' else '原文获取或事实抽取失败；未以摘要冒充原文分析')}
            print(f"{p['paper_key']}: {type(exc).__name__}",flush=True)
        atomic_json(path,feed)
    atomic_json(Path(root)/'minmax-report.json',{'model_requests_upper_bound':calls,'failures':failures,'papers':len(feed['papers'])})
    return feed


def main():
    from llm import LLMClient
    p=argparse.ArgumentParser();p.add_argument('--feed',required=True);p.add_argument('--cache-dir',required=True);p.add_argument('--max-new',type=int,default=50);a=p.parse_args()
    if a.max_new<0:raise ValueError('Negative budget')
    key=os.getenv('TRIAGE_API_KEY') or os.getenv('DEEPSEEK_API_KEY');model=os.getenv('TRIAGE_MODEL') or os.getenv('DEEPSEEK_MODEL')
    endpoint=os.getenv('TRIAGE_BASE_URL') or os.getenv('DEEPSEEK_BASE_URL') or 'https://api.deepseek.com'
    if not key or not model:raise ValueError('Configure TRIAGE/DEEPSEEK API key and model')
    client=LLMClient(key,model,endpoint);client.max_attempts=1;client.kwargs.update(max_tokens=4096,temperature=0)
    # Short output still benefits from reasoning for evidence alignment.
    from urllib.parse import urlsplit
    if urlsplit(endpoint).hostname=='api.deepseek.com':
        client.kwargs.pop('temperature',None)
        client.kwargs.update(max_tokens=65536,thinking={'type':'enabled'},reasoning_effort='high')
    enrich_feed(a.feed,a.cache_dir,client,a.max_new)

if __name__=='__main__':main()
