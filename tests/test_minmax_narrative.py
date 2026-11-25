import copy
import sys
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
import warnings
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'src'))
from minmax_narrative import validate,enrich

class NarrativeTests(unittest.TestCase):
    def setUp(self):
        self.value={'card_hook':'模型参考示范，再用触觉纠正动作。','context_and_problem':'接触操作需要触觉反馈。','core_approach':['作者先整理专家示范，提供操作参考。','执行时再观察接触状态，以便纠正动作。'],'caveats_and_pointers':'原文未说明。','experimental_results':'所给片段未说明实验数字。','tags':['触觉','机器人']}
    def test_short_grounded_output_is_warning_not_padding_or_rejection(self):
        with warnings.catch_warnings(record=True) as caught:
            warnings.simplefilter('always');self.assertEqual(validate(copy.deepcopy(self.value)),self.value)
        self.assertTrue(caught)
    def test_schema_filler_and_duplicate_hook(self):
        for patch in ({'tags':['one']},{'core_approach':['one']},{'context_and_problem':'本文针对机器人问题'},{'context_and_problem':self.value['card_hook']}):
            with warnings.catch_warnings():
                warnings.simplefilter('ignore')
                with self.assertRaises(ValueError):validate({**self.value,**patch})
    def test_cache_and_published_classic_remain_separate(self):
        paper={'source':'arxiv','original_id':'1706.03762v7','paper_key':'arxiv:1706.03762v7','title':'A paper','abstract':'Abstract','minmax':{'status':'ready','delta':{'text':'Old'}}}
        calls=[]
        def generate(*args,**kwargs):calls.append(1);return {'parsed':copy.deepcopy(self.value),'finish_reason':'stop'}
        client=SimpleNamespace(model='test',base_url='https://example.invalid',kwargs={},chat_structured=generate)
        with tempfile.TemporaryDirectory() as root,warnings.catch_warnings():
            warnings.simplefilter('ignore');fetcher=lambda *args:('Title\nAbstract\nBody',{'paper_id':paper['original_id']})
            new,reused=enrich(paper,client,root,fetcher=fetcher);self.assertFalse(reused);self.assertEqual(new['minmax'],paper['minmax']);self.assertNotIn('narrative',paper)
            self.assertTrue(enrich(paper,client,root,False,fetcher)[1]);self.assertEqual(len(calls),1)
            client.kwargs={'changed':True};self.assertEqual(enrich(paper,client,root,False,fetcher),(None,False));self.assertEqual(len(calls),1)
