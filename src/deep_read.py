"""On-demand exact-version deep reading. Never called by the daily triage loop."""
from __future__ import annotations
import argparse
from contextlib import contextmanager
from datetime import datetime,timezone
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import unicodedata

from reader_fulltext import get_fulltext
from deep_read_config import resolve_config, generation_options
from reader_identity import validate_id, validate_request_id
from triage_enrich import atomic_json
from deep_read_chunks import (plan_segments,extract_evidence,extraction_identity,
                              synthesis_input)

SECTIONS={'problem':'问题定义与假设','method':'核心公式与方法拆解','experiments':'Baseline 对比与消融实验','limitations':'局限性与复现风险','reading':'阅读与复现路线'}
PROMPT=Path(__file__).with_name('deep_read_prompt.txt').read_text(encoding='utf-8')
SECTION_SCHEMA={'type':'object','properties':{'markdown':{'type':'string'},'evidence':{'type':'array','items':{'type':'string'}}},'required':['markdown','evidence'],'additionalProperties':False}
SCHEMA={'type':'object','properties':{'title':{'type':'string'},'authors':{'type':'array','items':{'type':'string'}},'sections':{'type':'object','properties':{k:SECTION_SCHEMA for k in SECTIONS},'required':list(SECTIONS),'additionalProperties':False}},'required':['title','authors','sections'],'additionalProperties':False}
SYNTHESIS_PROMPT=PROMPT.replace(
    'Read the complete, version-specific paper supplied',
    'Read the version-specific extracted evidence supplied',
).replace(
    'If data, formulas or ablations are absent, explicitly say they were not reported; never invent them.',
    'If data, formulas or ablations are absent from extracted evidence, explicitly say the extracted evidence cannot establish them. Never infer that the paper did not report them; never invent them.',
)


@contextmanager
def request_lock(path):
    path.parent.mkdir(parents=True,exist_ok=True)
    with path.open('a') as handle:
        fcntl.flock(handle,fcntl.LOCK_EX)
        try: yield
        finally: fcntl.flock(handle,fcntl.LOCK_UN)


def validate_note(note,text):
    if not isinstance(note,dict) or not isinstance(note.get('title'),str) or not note['title'].strip():
        raise ValueError('Deep reading title is missing')
    if not isinstance(note.get('authors'),list) or not all(isinstance(a,str) for a in note['authors']):
        raise ValueError('Invalid authors')
    # Ground bibliographic strings as well as analysis quotations. This checks
    # occurrence, not authorship: it must not be advertised as catalog verification.
    # Limit to the opening text so a name in the bibliography cannot qualify.
    def normalize(value):
        return ' '.join(unicodedata.normalize('NFKC',value).split())
    opening=normalize(text[:8000])
    if normalize(note['title']) not in opening:
        raise ValueError('Deep reading title cannot be verified in the opening text')
    if any(not a.strip() or normalize(a) not in opening for a in note['authors']):
        raise ValueError('Deep reading authors cannot be verified in the opening text')
    sections=note.get('sections')
    if not isinstance(sections,dict) or set(sections)!=set(SECTIONS): raise ValueError('Missing deep reading sections')
    for key,section in sections.items():
        if not isinstance(section,dict) or not isinstance(section.get('markdown'),str) or len(section['markdown'].strip())<40:
            raise ValueError(f'Incomplete deep reading section: {key}')
        evidence=section.get('evidence')
        if not isinstance(evidence,list) or not evidence or any(not isinstance(q,str) or len(q.strip())<8 or q not in text for q in evidence):
            raise ValueError(f'Unverifiable deep reading evidence: {key}')
    return note


def render_note(paper_id,note,meta,model,coverage=None):
    import yaml
    front={'paper_key':f'arxiv:{paper_id}','arxiv_id':paper_id,'version':int(paper_id.rsplit('v',1)[1]),'title':note['title'],'authors':note['authors'],'tags':['paper','to-read'],'venue':None,'status':'to-read','pdf':f'https://arxiv.org/pdf/{paper_id}','code':None,'date':datetime.now(timezone.utc).date().isoformat(),'model':model,'source_hash':meta['sha256'],'source_url':meta['source_url'],'input_scope':'fulltext'}
    if coverage:
        front.update(input_scope=coverage['mode'],input_coverage=coverage)
    body='---\n'+yaml.safe_dump(front,allow_unicode=True,sort_keys=False)+'---\n\n# '+note['title']+'\n\n'
    body+='> 基于指定版本全文生成；模型分析需结合原文复核。标题与作者仅核验在原文开头出现，不代表独立书目认证。\n\n'
    if not note['authors']: body+='> 未能从全文确认作者，请按原文补充。\n\n'
    if coverage and coverage['mode']=='fulltext_chunked':
        body+=f'> 长文分段精读：{coverage["segments"]} 段、{coverage["covered_characters"]}/{coverage["characters"]} 字符已送入证据提取，最终笔记基于压缩证据合成。输入覆盖不代表全部结论均被提取；未出现的结果不能据此判定原文没有报告。\n\n'
    for key,title in SECTIONS.items():
        section=note['sections'][key]
        body+=f'## {title}\n\n{section["markdown"].strip()}\n\n'
        body+='原文证据：\n\n'+'\n\n'.join('> '+quote.replace('\n','\n> ') for quote in section['evidence'])+'\n\n'
    from obsidian_sync import managed_note
    return managed_note(body)


def run(paper_id,request_id,cache_dir,output_dir,client,max_chars=350_000,fetcher=get_fulltext):
    validate_id(paper_id)
    validate_request_id(request_id)
    cache_dir=Path(cache_dir);output=Path(output_dir);output.mkdir(parents=True,exist_ok=True)
    status_path=output/'status.json'
    status={'request_id':request_id,'paper_id':paper_id,'status':'running'}
    atomic_json(status_path,status)
    try:
        with request_lock(cache_dir/(hashlib.sha256(paper_id.encode()).hexdigest()+'.lock')):
            print('正在获取指定版本全文…',flush=True)
            text,meta=fetcher(paper_id,cache_dir/'sources')
            print(f'全文已就绪：{len(text)} 字符',flush=True)
            segments=plan_segments(text,max_chars) if len(text)>max_chars else None
            identity={'paper_id':paper_id,'source_hash':meta['sha256'],'prompt':PROMPT,'schema':SCHEMA,'model':client.model,'endpoint':client.base_url,'generation':generation_options(client.model,client.base_url)}
            if segments:identity.update(extraction=extraction_identity(),segments=segments,max_chars=max_chars,synthesis_prompt=SYNTHESIS_PROMPT)
            key=hashlib.sha256(json.dumps(identity,sort_keys=True).encode()).hexdigest()
            cache=cache_dir/'notes'/f'{key}.json'
            reused=cache.exists()
            coverage={'mode':'fulltext','segments':1,'characters':len(text),'covered_characters':len(text)}
            if reused:
                saved=json.loads(cache.read_text())
                note=validate_note(saved['note'],text)
                coverage=saved.get('coverage',coverage)
                if segments:
                    atomic_json(output/'evidence.json',{'paper_id':paper_id,'source_hash':meta['sha256'],
                                'coverage':coverage,'segments':saved['records']})
            else:
                prompt=PROMPT
                content=f'Exact arXiv version: {paper_id}\n\n{text}'
                records=None
                if segments:
                    def progress(done,total,characters):
                        status.update(stage='extracting',completed_segments=done,total_segments=total,covered_characters=characters)
                        atomic_json(status_path,status)
                    records,coverage=extract_evidence(text,segments,client,cache_dir,paper_id,progress)
                    atomic_json(output/'evidence.json',{'paper_id':paper_id,'source_hash':meta['sha256'],'coverage':coverage,'segments':records})
                    content=synthesis_input(paper_id,text,records,max_chars)
                    prompt=SYNTHESIS_PROMPT
                    status.update(stage='synthesizing');atomic_json(status_path,status)
                print(f'正在生成精读笔记：{client.model}',flush=True)
                result=client.chat_structured([{'role':'system','content':prompt},{'role':'user','content':content}],schema_name='deep_read_note',schema=SCHEMA)
                if result.get('finish_reason')=='length':
                    raise ValueError('模型输出达到上限，笔记未完成；已停止，不会自动重复付费生成。Flash 可使用非思考模式，思考模型需要更大的输出预算。')
                if result.get('parse_error') or result.get('refusal') or result.get('finish_reason')=='length': raise ValueError('Model did not return a complete deep reading note')
                note=validate_note(result.get('parsed'),text)
                if records:
                    allowed={q for record in records for section in record['sections'].values() for q in section['evidence']}
                    if any(q not in allowed for section in note['sections'].values() for q in section['evidence']):
                        raise ValueError('Synthesis cited evidence absent from segment records')
                atomic_json(cache,{'note':note,'identity':identity,'tokens':result.get('tokens'),'coverage':coverage,'records':records})
            filename=paper_id.replace('/','_')+'.md'
            temporary=output/(filename+'.pending');temporary.write_text(render_note(paper_id,note,meta,client.model,coverage),encoding='utf-8');temporary.replace(output/filename)
            status.update(status='succeeded',stage='complete',note=filename,cache_key=key,reused=reused,source=meta,coverage=coverage)
            atomic_json(status_path,status)
            return status
    except Exception as exc:
        # Keep any earlier complete note; report this attempt's failure separately.
        status.update(status='failed',error=str(exc))
        atomic_json(status_path,status)
        raise


def main():
    from llm import LLMClient
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--arxiv-id',required=True)
    parser.add_argument('--request-id',required=True)
    parser.add_argument('--cache-dir',type=Path,required=True)
    parser.add_argument('--output-dir',type=Path,required=True)
    parser.add_argument('--max-chars',type=int,default=350_000)
    args=parser.parse_args()
    validate_id(args.arxiv_id);validate_request_id(args.request_id)
    try:
        key,model,endpoint=resolve_config(os.environ)
    except ValueError as exc:
        atomic_json(args.output_dir/'status.json',{'request_id':args.request_id,'paper_id':args.arxiv_id,'status':'failed','stage':'configuration','error':str(exc)})
        raise
    client=LLMClient(key,model,endpoint);client.kwargs.update(generation_options(model,endpoint))
    run(args.arxiv_id,args.request_id,args.cache_dir,args.output_dir,client,args.max_chars)


if __name__=='__main__': main()
