import copy
import sys
from pathlib import Path
import unittest
import json
import tempfile
from types import SimpleNamespace
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'src'))
from minmax_readable import validate,context,enrich,LIMITS,MISSING
from minmax import enrich_feed

class ReadableTests(unittest.TestCase):
    def setUp(self):
        self.quote='We encode inputs and predict outputs using measured forces.'
        self.parts=[{'id':'E1','text':self.quote}]
        self.value={'card':{'tldr':'先编码输入，再预测输出。','problem_delta':'把测到的力用于预测。','method_steps':['读取输入','编码输入','预测输出'],'evidence':MISSING,'caveats':MISSING,'where_to_look':MISSING,'tags':['力传感','编码']},'citations':{k:({'source_id':None,'quote':None} if k in ('evidence','caveats','where_to_look') else {'source_id':'E1','quote':self.quote}) for k in (*LIMITS,'method_steps')}}
    def test_valid_and_banned_length(self):
        validate(copy.deepcopy(self.value),self.parts)
        for field,text in [('tldr','本文针对测力问题。'),('problem_delta','x'*71),('caveats','原文未提'),('tldr','不训练不微调就能控制机器人。')]:
            v=copy.deepcopy(self.value);v['card'][field]=text
            with self.assertRaises(ValueError):validate(v,self.parts)
    def test_citations_and_steps_required(self):
        v=copy.deepcopy(self.value);v['citations']['tldr']['quote']='A fabricated result is not evidence.'
        with self.assertRaises(ValueError):validate(v,self.parts)
        v=copy.deepcopy(self.value);v['card']['method_steps']=['一步']
        with self.assertRaises(ValueError):validate(v,self.parts)

    def test_average_success_rate_is_not_banned(self):
        v=copy.deepcopy(self.value);v['card']['tldr']='五任务平均成功率93.8%'
        validate(v,self.parts)
        v['card']['tldr']='五任务均成功率93.8%'
        with self.assertRaises(ValueError):validate(v,self.parts)

    def test_cache_replay_and_zero_budget_preserve_published_card(self):
        calls=[]
        def generate(*args,**kwargs):
            calls.append(1)
            return {'parsed':copy.deepcopy(self.value),'finish_reason':'stop'}
        client=SimpleNamespace(model='test',base_url='https://example.invalid',kwargs={},chat_structured=generate)
        paper={'source':'arxiv','original_id':'1706.03762v7','paper_key':'arxiv:1706.03762v7','title':'Sample'}
        fetcher=lambda *args:(self.quote,{'format':'html','source_url':'https://arxiv.org/html/1706.03762v7'})
        with tempfile.TemporaryDirectory() as root:
            new,reused=enrich(paper,client,root,fetcher=fetcher)
            self.assertFalse(reused)
            self.assertTrue(enrich(paper,client,root,allow_new=False,fetcher=fetcher)[1])
            client.kwargs={'changed_prompt_option':True}
            self.assertEqual(enrich(paper,client,root,allow_new=False,fetcher=fetcher),(None,False))
            self.assertEqual(len(calls),1)
            path=Path(root)/'feed.json';path.write_text(json.dumps({'papers':[new]}))
            result=enrich_feed(path,root,client,0,enricher=lambda *args,**kwargs:(None,False))
            self.assertEqual(result['papers'][0]['minmax'],new['minmax'])
    def test_bounded_exact_slices(self):
        text='Title\nAbstract\n'+('Opening prose. '*500)+'\nMethod\n3.1\nEncoding\n'+('Encode inputs. '*100)+'\nFigure 1: model\n'+('caption '*50)+'\nConclusion\nWe report limitations.\nReferences\n'
        parts=context(text)
        self.assertLessEqual(sum(len(p['text']) for p in parts),12000)
        self.assertTrue(all(p['text']==text[p['start']:p['end']] for p in parts))
        self.assertTrue(any('limitations' in p['text'] for p in parts))

    def test_math_spacing_does_not_change_tokens(self):
        v=copy.deepcopy(self.value);v['citations']['tldr']['quote']='Use $d_{k}$-dimensional vectors.'
        source='Use\n$d_{k}$\n-dimensional vectors.'
        for k,c in v['citations'].items():
            if c['quote'] and k!='tldr':c['quote']=source
        self.assertEqual(validate(v,[{'id':'E1','text':source}])['citations']['tldr']['quote'],source)
        v['citations']['tldr']['quote']='Use $d_{v}$-dimensional vectors.'
        with self.assertRaises(ValueError):validate(v,[{'id':'E1','text':source}])
