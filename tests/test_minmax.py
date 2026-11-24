import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import Mock
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'src'))
from minmax import excerpts,validate,enrich,FIELDS
from triage_export import merge_records

class MinMaxTests(unittest.TestCase):
    def test_extract_cache_and_evidence(self):
        text='Title\nIntroduction\nWe use a fixed dataset and compare to baseline A.\n'+'text '*1000+'\nConclusion\nLimits apply to small inputs.\nTable 1: measured performance.'
        p={'paper_key':'arxiv:1706.03762v1','original_id':'1706.03762v1','source':'arxiv','title':'Title','score':8,'tags':[]}
        parts=excerpts(text)
        self.assertLessEqual(sum(len(x['text']) for x in parts),18000)
        self.assertTrue(all(x['text']==text[x['start']:x['end']] for x in parts))
        value={'paper_key':p['paper_key'],'title_zh':'标题',**{k:dict(text=None,quote=None,source_id=None) for k in FIELDS}}
        value['delta']={'text':'作者使用固定数据集与基线A比较','quote':'We use a fixed dataset and compare to baseline A.','source_id':'E1'}
        client=Mock(model='test',base_url='https://example.org',kwargs={})
        client.chat_structured.return_value={'parsed':value}
        fetch=lambda *_:(text,{'format':'html','source_url':'https://arxiv.org/html/1706.03762v1'})
        with tempfile.TemporaryDirectory() as root:
            first,reused=enrich(p,client,root,fetcher=fetch)
            self.assertFalse(reused)
            self.assertEqual(enrich(p,client,root,False,fetch)[1],True)
            self.assertEqual(client.chat_structured.call_count,1)
            self.assertEqual(merge_records([first,p])[0]['minmax']['status'],'ready')
            changed=dict(p,title='Changed title')
            self.assertIsNone(enrich(changed,client,root,False,fetch)[0])
        value['delta']['quote']='Invented result'
        with self.assertRaises(ValueError):validate(value,p,parts)
    def test_identity_length_and_null_contract(self):
        p={'paper_key':'p'};v={'paper_key':'p','title_zh':'标题',**{k:dict(text=None,quote=None,source_id=None) for k in FIELDS}}
        validate(v,p,[])
        v['delta']={'text':'x'*401,'quote':'long enough quote','source_id':'E1'}
        with self.assertRaises(ValueError):validate(v,p,[{'id':'E1','text':'long enough quote'}])
        v['delta']={'text':'unknown','quote':None,'source_id':None}
        with self.assertRaises(ValueError):validate(v,p,[])

    def test_numbered_inline_steps_normalize_without_inventing_steps(self):
        p={'paper_key':'p'};v={'paper_key':'p','title_zh':'标题',**{k:dict(text=None,quote=None,source_id=None) for k in FIELDS}}
        v['steps']={'text':'1) 输入；2) 编码；3) 输出','quote':'An exact method quotation.','source_id':'E1'}
        parts=[{'id':'E1','text':'An exact method quotation.'}]
        self.assertEqual(len(validate(v,p,parts)['steps']['text'].splitlines()),3)
        v['steps']['text']='This is just prose.'
        with self.assertRaises(ValueError):validate(v,p,parts)
