import copy
import hashlib
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import Mock

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'src'))
from deep_read import run,SECTIONS
from deep_read_chunks import plan_segments,validate_digest,MAX_CHUNKS


QUOTE='We compare to baseline using a fixed evaluation protocol.'


class DeepReadChunkTests(unittest.TestCase):
    def setUp(self):
        self.text='Original title\nOriginal Author\n\n'+(QUOTE+'\n\n')*2000+'References\nCitation'
        self.meta={'sha256':hashlib.sha256(self.text.encode()).hexdigest(),'source_url':'https://arxiv.org/html/1706.03762v7'}
        self.digest={'sections':{k:{'analysis':'论文报告固定评测条件下的基线对比。','evidence':[QUOTE]} for k in SECTIONS}}
        self.note={'title':'Original title','authors':['Original Author'],'sections':{
            k:{'markdown':'这是基于分段提取证据的分析，仍需按原文复核。'*4,'evidence':[QUOTE]} for k in SECTIONS}}
        self.client=Mock(model='flagship',base_url='https://example.org')
        self.client.chat_structured.side_effect=lambda *args,**kwargs:{'parsed':copy.deepcopy(self.digest if kwargs['schema_name']=='deep_read_segment' else self.note)}

    def execute(self,root,request='request_001',out='output'):
        return run('1706.03762v7',request,root/'cache',root/out,self.client,max_chars=100000,fetcher=lambda *_:(self.text,self.meta))

    def test_partition_covers_all_input_without_gaps_or_overlap(self):
        spans=plan_segments(self.text,100000)
        self.assertEqual(''.join(self.text[a:b] for a,b in spans),self.text)
        self.assertLessEqual(len(spans),MAX_CHUNKS)
        self.assertEqual(spans[0][0],0);self.assertEqual(spans[-1][1],len(self.text))
        self.assertTrue(all(b==c for (_,b),(c,_) in zip(spans,spans[1:])))

    def test_long_paper_synthesizes_and_reuses_complete_note(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder);first=self.execute(root)
            count=len(plan_segments(self.text,100000))
            self.assertEqual(self.client.chat_structured.call_count,count+1)
            coverage=first['coverage']
            self.assertEqual(coverage['covered_characters'],len(self.text))
            self.assertEqual(coverage['mode'],'fulltext_chunked')
            self.assertIn('输入覆盖不代表全部结论均被提取',(root/'output'/first['note']).read_text())
            evidence=json.loads((root/'output/evidence.json').read_text())
            self.assertEqual(len(evidence['segments']),count)
            second=self.execute(root,'request_002','other-output')
            self.assertTrue(second['reused'])
            self.assertEqual(second['coverage'],coverage)
            self.assertEqual(json.loads((root/'other-output/evidence.json').read_text()),evidence)
            self.assertEqual(self.client.chat_structured.call_count,count+1)

    def test_segment_failure_resumes_without_repaying_completed_segments(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder)
            self.client.chat_structured.side_effect=[{'parsed':self.digest},RuntimeError('temporary failure')]
            with self.assertRaises(RuntimeError):self.execute(root)
            self.assertEqual(len(list((root/'cache/segments').glob('*.json'))),1)
            self.assertFalse((root/'cache/notes').exists())
            state=json.loads((root/'output/status.json').read_text())
            self.assertEqual(state['status'],'failed');self.assertEqual(state['completed_segments'],1)
            self.client.chat_structured.reset_mock()
            self.client.chat_structured.side_effect=lambda *a,**k:{'parsed':self.digest if k['schema_name']=='deep_read_segment' else self.note}
            result=self.execute(root,'request_002')
            self.assertEqual(result['coverage']['reused_segments'],1)
            self.assertEqual(self.client.chat_structured.call_count,len(plan_segments(self.text,100000)))

    def test_synthesis_failure_reuses_every_segment(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder)
            original=copy.deepcopy(self.note)
            self.note['sections']['experiments']['evidence']=['Original title']
            with self.assertRaisesRegex(ValueError,'absent from segment'):self.execute(root)
            self.assertFalse((root/'cache/notes').exists())
            self.note=original;self.client.chat_structured.reset_mock()
            result=self.execute(root,'request_002')
            self.client.chat_structured.assert_called_once()
            self.assertEqual(result['coverage']['reused_segments'],result['coverage']['segments'])

    def test_excessive_paper_rejected_before_paid_calls(self):
        with tempfile.TemporaryDirectory() as folder:
            self.text*=20
            with self.assertRaisesRegex(ValueError,'segment budget'):self.execute(Path(folder))
            self.client.chat_structured.assert_not_called()

    def test_digest_cannot_invent_quotes_or_exceed_budget(self):
        for patch in ({'evidence':['Invented experiment result']},{'analysis':'x'*801},{'evidence':[]},{'analysis':''}):
            with self.subTest(patch=patch):
                digest=copy.deepcopy(self.digest);digest['sections']['method'].update(patch)
                with self.assertRaises(ValueError):validate_digest(digest,self.text)
        empty={'sections':{k:{'analysis':'','evidence':[]} for k in SECTIONS}}
        validate_digest(empty,self.text)


if __name__=='__main__':unittest.main()
