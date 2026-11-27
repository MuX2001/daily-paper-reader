"""Bounded, evidence-grounded extraction for final selected papers only."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
from triage_enrich import atomic_json
from reader_fulltext import get_fulltext

from summary_language import prompt_for, summary_language

PROMPT=Path(__file__).with_name('minmax_prompt.txt').read_text()
FIELDS=('delta','steps','evidence','constraints','landmarks')
CLAIM={'type':'object','properties':{k:{'type':['string','null']} for k in ('text','quote','source_id')},'required':['text','quote','source_id'],'additionalProperties':False}
SCHEMA={'type':'object','properties':{'paper_key':{'type':'string'},'title_zh':{'type':'string'},**{k:CLAIM for k in FIELDS}},'required':['paper_key','title_zh',*FIELDS],'additionalProperties':False}


def active_prompt():
    return prompt_for(PROMPT, 'Keep paper_key unchanged and copy the original title into title_zh. Every claim including steps is a JSON object containing exactly three strings: text, quote, source_id. Never output an array. Use the required_output_shape in the input. Use null for all three if unsupported. Quote 8–800 characters verbatim. Use 3–4 numbered lines for steps. Use 15 words for delta, 3 short numbered lines of 12 words each for steps, and 20 words each for evidence, constraints and landmarks. Target 110 words overall; copy quotes separately and avoid repeating them in the claims.')


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


def restore_omitted_lines(quote,source):
    """Restore up to three omitted whole lines; never fuzzy-match changed words.

    Models sometimes omit table-caption boilerplate. Return the unique exact
    contiguous source span, including missing lines, or leave it unverified.
    """
    wanted=quote.splitlines();lines=source.splitlines();matches=set()
    if len(wanted)<2:return quote
    for start,line in enumerate(lines):
        if line!=wanted[0]:continue
        pos=start;skipped=0
        for target in wanted[1:]:
            found=next((j for j in range(pos+1,min(len(lines),pos+5)) if lines[j]==target),None)
            if found is None:break
            skipped+=found-pos-1;pos=found
            if skipped>3:break
        else:
            span='\n'.join(lines[start:pos+1])
            if len(span)<=800 and span in source:matches.add(span)
    return next(iter(matches)) if len(matches)==1 else quote


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
        source=sources.get(c['source_id'],'')
        if c['quote'] not in source:
            # HTML/PDF line wrapping is not a factual difference. Restore the
            # exact source spelling; never normalize words, numbers or case.
            pattern=r'\s+'.join(re.escape(word) for word in c['quote'].split())
            match=re.search(pattern,source) if pattern else None
            c['quote']=match.group() if match else restore_omitted_lines(c['quote'],source)
        if not 8<=len(c['quote'])<=800 or c['quote'] not in source:raise ValueError(f'Unsupported evidence: {field}')
        if field=='steps':
            # Accept numbered steps on one line without weakening step count.
            normalized=re.sub(r'[；;]\s*(?=[1-4][).、])','\n',c['text'])
            lines=normalized.splitlines()
            if not 3<=len(lines)<=4 or any(not re.match(rf'^\s*{i}[).、]',line) for i,line in enumerate(lines,1)):
                raise ValueError('Method needs 3–4 numbered steps')
            c['text']=normalized
        size+=len(c['text'])
    limit=1800 if summary_language()=='en' else 400
    if size>limit:raise ValueError(f'Card exceeds {limit} characters')
    return value


def enrich(paper,client,root,allow_new=True,fetcher=get_fulltext):
    if paper.get('source')!='arxiv':raise ValueError('Exact-version source retrieval not supported')
    text,meta=fetcher(paper['original_id'],Path(root)/'sources')
    parts=excerpts(text)
    payload={'paper_key':paper['paper_key'],'title':paper['title'],'excerpts':parts}
    if summary_language()=='en':
        payload['required_output_shape']={'paper_key':paper['paper_key'],'title_zh':paper['title'],**{k:{'text':None,'quote':None,'source_id':None} for k in FIELDS}}
    identity={'input':payload,'prompt':active_prompt(),'schema':SCHEMA,'model':client.model,'endpoint':client.base_url,'options':client.kwargs,'version':1}
    key=hashlib.sha256(json.dumps(identity,sort_keys=True,ensure_ascii=False).encode()).hexdigest()
    path=Path(root)/'minmax'/f'{key}.json';result=None
    if path.exists():
        try:result=validate(json.loads(path.read_text())['result'],paper,parts)
        except (ValueError,KeyError,TypeError):pass
    reused=result is not None
    if not reused:
        if not allow_new:return None,False
        response=client.chat_structured([{'role':'system','content':active_prompt()},{'role':'user','content':json.dumps(payload,ensure_ascii=False)}],schema_name='minmax_card',schema=SCHEMA,allow_validation_fallback=False)
        if response.get('parse_error') or response.get('refusal') or response.get('finish_reason')=='length':raise ValueError('Incomplete model output')
        result=validate(response.get('parsed'),paper,parts)
        atomic_json(path,{'result':result,'identity':identity})
    card={'status':'ready','input_scope':'selected_excerpts','source':meta,'excerpts':parts,'cache_key':key,**{k:result[k] for k in FIELDS}}
    return {**paper,'title_zh':result['title_zh'],'minmax':card,'tldr':result['delta']['text'] or paper.get('tldr'),'content_status':'minmax'},reused


def enrich_feed(path,root,client,max_new=50,enricher=enrich):
    feed=json.loads(Path(path).read_text());calls=0;failures=0
    # Never expand the final list; process highest-ranked cards first.
    for i in sorted(range(len(feed['papers'])),key=lambda i:-(feed['papers'][i].get('score') or 0)):
        p=feed['papers'][i]
        try:
            result,reused=enricher(p,client,root,allow_new=calls<max_new)
            if result is None:
                if p.get('minmax',{}).get('status')!='ready':p['minmax']={'status':'deferred','reason':'本轮生成预算已用完'}
            else:
                result.pop('analysis_error',None)
                result.pop('partial_narrative',None)
                feed['papers'][i]=result;calls+=not reused
        except Exception as exc:
            # Count failed attempts conservatively toward the budget too.
            calls+=1;failures+=1
            if getattr(exc,'sections',None) and not p.get('narrative'):
                p['partial_narrative']=exc.sections
            p['analysis_error']={'stage':'source' if isinstance(exc,ValueError) and 'verified complete text' in str(exc) else 'analysis','reason':str(exc)[:400] if isinstance(exc,ValueError) else type(exc).__name__}
            if not p.get('narrative') and p.get('minmax',{}).get('status')!='ready':
                p['content_status']='partial'
                p['minmax']={'status':'unavailable','reason':('此来源尚未接入已核验全文抽取，请打开原文' if p.get('source')!='arxiv' else '原文获取或事实抽取失败；未以摘要冒充原文分析')}
            print(f"{p['paper_key']}: {type(exc).__name__}",flush=True)
        atomic_json(path,feed)
    atomic_json(Path(root)/'minmax-report.json',{'papers_attempted':calls,'model_responses':getattr(client,'_call_index',0),'tokens':getattr(client,'_cum_tokens',{}),'failures':failures,'papers':len(feed['papers'])})
    return feed


def main():
    from llm import LLMClient
    p=argparse.ArgumentParser();p.add_argument('--feed',required=True);p.add_argument('--cache-dir',required=True);p.add_argument('--max-new',type=int,default=50);p.add_argument('--style',choices=['classic','readable','narrative'],default='classic');p.add_argument('--quality-config',type=Path);a=p.parse_args()
    if a.max_new<0:raise ValueError('Negative budget')
    key=os.getenv('TRIAGE_API_KEY') or os.getenv('DEEPSEEK_API_KEY');model=os.getenv('TRIAGE_MODEL') or os.getenv('DEEPSEEK_MODEL')
    endpoint=os.getenv('TRIAGE_BASE_URL') or os.getenv('DEEPSEEK_BASE_URL') or 'https://api.deepseek.com'
    if not key or not model:raise ValueError('Configure TRIAGE/DEEPSEEK API key and model')
    client=LLMClient(key,model,endpoint);client.max_attempts=1;client.kwargs.update(max_tokens=4096,temperature=0)
    # Short output still benefits from reasoning for evidence alignment.
    from urllib.parse import urlsplit
    if urlsplit(endpoint).hostname=='api.deepseek.com':
        client.kwargs.pop('temperature',None)
        if a.style=='narrative':client.kwargs.update(max_tokens=4096,thinking={'type':'disabled'})
        else:client.kwargs.update(max_tokens=65536,thinking={'type':'enabled'},reasoning_effort='high')
    if a.style=='narrative':
        from minmax_narrative import enrich as selected_enricher
    elif a.style=='readable':
        from minmax_readable import enrich as selected_enricher
    else:selected_enricher=enrich
    v2_run = pool = None
    if a.quality_config:
        import yaml
        config = yaml.safe_load(a.quality_config.read_text())
        v2_config = config.get("pipeline", {}).get("recommendation_v2", {})
        if v2_config.get("enabled"):
            try:
                from recommendation_v2 import DailyRun
                original_feed = json.loads(Path(a.feed).read_text())
                v2_run = DailyRun(v2_config, original_feed["run_id"], a.quality_config.resolve().parent, a.cache_dir)
                pool = v2_run.prepare(original_feed["papers"])
                if not v2_config["shadow_mode"]:
                    atomic_json(a.feed, {**original_feed, "papers":pool["papers"]})
            except Exception as exc:
                print(f"V2 preparation unavailable: {type(exc).__name__}: {exc}", flush=True)
                v2_run = None
    feed=enrich_feed(a.feed,a.cache_dir,client,a.max_new,enricher=selected_enricher)
    if a.quality_config:
        import yaml
        from recommendation_quality import assess,settings
        config=yaml.safe_load(a.quality_config.read_text())
        enriched_candidates = list(feed['papers'])
        reviews=assess(feed['papers'],config,client,a.cache_dir)
        ranked=[]
        for paper in feed['papers']:
            review=reviews[paper['paper_key']]
            if review['eligible']:
                ranked.append({**paper,'screening_score':paper['score'],'score':review['final_score'],'quality':review,'reason':review['reason']})
        ranked.sort(key=lambda p:(-p['score'],p['paper_key']))
        feed.update(papers=ranked[:settings(config)['daily_cap']],quality_screened=True)
        atomic_json(Path(a.cache_dir)/'quality'/f"{feed['run_id']}-reviews.json",reviews)
        atomic_json(a.feed,feed)
        atomic_json(Path(a.cache_dir)/'quality'/f"{feed['run_id']}-usage.json",{'responses':client._call_index,'tokens':client._cum_tokens,'eligible':len(ranked),'published':len(feed['papers'])})
        if v2_run is not None:
            try:
                final_feed = v2_run.finish(pool, feed, enriched_candidates, client)
                atomic_json(a.feed, final_feed)
            except Exception as exc:
                print(f"V2 unavailable; retaining screened feed: {type(exc).__name__}: {exc}", flush=True)

if __name__=='__main__':main()
