import json
from pathlib import Path
import sys
from types import SimpleNamespace
import pytest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'src'))
from recommendation_quality import DEFAULTS, assess, score
from reader_catalog import build_catalog


def test_exact_scoring_and_gates():
    for m,g,h,expected in [(5,5,0,(10,True)),(4,5,1,(8.4,True)),(2,5,0,(7.6,False)),(5,2,0,(6.4,False)),(0,0,4,(0,False))]:
        assert score(dict(problem_match=m,information_gain=g,hype_penalty=h),DEFAULTS)==expected
    with pytest.raises(ValueError):score(dict(problem_match=True,information_gain=5,hype_penalty=0),DEFAULTS)


def test_cached_evidence_and_empty_daily_catalog(tmp_path):
    calls=[]
    def generate(*args,**kwargs):
        calls.append(1)
        return {'parsed':{'results':[dict(id='p1',problem_match=2,information_gain=3,hype_penalty=0,penalties=[],evidence='E1',reason='Incremental')]}}
    client=SimpleNamespace(model='test',base_url='test',kwargs={},chat_structured=generate)
    papers=[dict(paper_key='arxiv:test',original_id='test',title='Example',abstract='Reports a small improvement.')]
    assert not assess(papers,{},client,tmp_path)['arxiv:test']['eligible']
    assert assess(papers,{},client,tmp_path)['arxiv:test']['scope']=='abstract' and len(calls)==1
    out=tmp_path/'docs/data';(out/'daily').mkdir(parents=True)
    (out/'daily/20261127.json').write_text(json.dumps({'run_id':'20261127','schema_version':1,'papers':[],'quality_screened':True}))
    assert build_catalog(tmp_path,out)[0]['count']==0


def test_penalty_requires_two_real_passage_references(tmp_path):
    row = dict(id='p1', problem_match=4, information_gain=4, hype_penalty=1,
               reason='The measured scope is narrower.', evidence='E2')
    defect = dict(kind='unsupported_claim', claim='E1', support='missing',
                  explanation='Evaluation covers only a single setting.')
    prompts = []

    def generate(messages, **kwargs):
        prompts.append(messages[0]['content'])
        support = 'missing' if len(prompts) == 1 else 'E2'
        return {'parsed': {'results': [{**row, 'penalties': [{**defect, 'support': support}]}]}}

    client = SimpleNamespace(model='test', base_url='test', kwargs={}, chat_structured=generate)
    paper = dict(paper_key='arxiv:test', original_id='test', title='General control',
                 abstract='Tests in a single setting.')
    result = assess([paper], {}, client, tmp_path)['arxiv:test']
    assert len(prompts) == 2 and 'p1' in prompts[1]
    assert result['penalties'][0]['support'] == paper['abstract']
    assert result['final_score'] == 7.2
