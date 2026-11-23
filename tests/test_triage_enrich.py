import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import Mock
from src.triage_enrich import cache_key, enrich_feed, enrich_paper


class TriageEnrichTests(unittest.TestCase):
    def setUp(self):
        self.paper={'paper_key':'arxiv:1234.56789v2','title':'Example','abstract':'We solve planning. Our method uses search.'}
        self.result={'paper_key':self.paper['paper_key'],'title_zh':'示例','tldr':'使用搜索解决规划。','problem':{'text':'规划','evidence':'We solve planning.'},'method':{'text':'搜索','evidence':'Our method uses search.'},'results':{'text':None,'evidence':None}}
        self.client=Mock(model='test',base_url='https://example.org')
        self.client.chat_structured.return_value={'parsed':self.result}

    def test_success_is_cached_and_navigation_not_in_key(self):
        with tempfile.TemporaryDirectory() as folder:
            enrich_paper(self.paper,self.client,folder)
            result=enrich_paper(dict(self.paper,tags=['new'],score=9),self.client,folder)
            self.assertEqual(self.client.chat_structured.call_count,1)
            self.assertIsNone(result['breakdown']['results'])
            self.assertEqual(result['content_status'],'triage')
            self.assertNotEqual(cache_key(self.paper,'test','https://example.org'),cache_key(dict(self.paper,paper_key='arxiv:1234.56789v1'),'test','https://example.org'))

    def test_unverifiable_claim_and_changed_id_are_not_cached(self):
        with tempfile.TemporaryDirectory() as folder:
            self.result['results']={'text':'提升20%','evidence':'improves 20%'}
            with self.assertRaises(ValueError): enrich_paper(self.paper,self.client,folder)
            self.assertEqual(list(Path(folder).iterdir()),[])
            self.result['paper_key']='arxiv:1234.56789v1'
            with self.assertRaises(ValueError): enrich_paper(self.paper,self.client,folder)

    def test_zero_budget_does_not_call_model(self):
        with tempfile.TemporaryDirectory() as folder:
            feed=Path(folder)/'feed.json';feed.write_text(json.dumps({'papers':[self.paper]}))
            enrich_feed(feed,Path(folder)/'cache',self.client,0)
            self.client.chat_structured.assert_not_called()

    def test_corrupt_cache_obeys_budget_then_repairs(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder);cache=root/'cache';cache.mkdir()
            saved=cache/f'{cache_key(self.paper,self.client.model,self.client.base_url)}.json'
            feed=root/'feed.json';feed.write_text(json.dumps({'papers':[self.paper]}))
            for corrupt in ('{broken',json.dumps({'cache_key':'wrong','result':self.result}),json.dumps({'cache_key':saved.stem,'result':{}})):
                saved.write_text(corrupt)
                enrich_feed(feed,cache,self.client,0)
                self.client.chat_structured.assert_not_called()
                report=json.loads((cache/'latest-run.json').read_text())
                self.assertEqual(report['status'],'partial');self.assertEqual(report['deferred'],1)
            enrich_feed(feed,cache,self.client,1)
            self.client.chat_structured.assert_called_once()
            self.assertEqual(json.loads(saved.read_text())['result'],self.result)
            enrich_feed(feed,cache,self.client,0)
            self.client.chat_structured.assert_called_once()
            report=json.loads((cache/'latest-run.json').read_text())
            self.assertEqual(report['cache_hits'],1);self.assertEqual(report['model_requests'],0)
            self.assertEqual(report['reported_tokens']['total'],0)

    def test_report_counts_returned_usage_without_guessing_cost_or_retry_usage(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder);feed=root/'feed.json';feed.write_text(json.dumps({'papers':[self.paper]}))
            self.client.chat_structured.return_value={'parsed':self.result,'tokens':{'prompt':100,'content':30,'reasoning':20,'total':150}}
            enrich_feed(feed,root/'cache',self.client,1,root/'report.json')
            report=json.loads((root/'report.json').read_text())
            self.assertEqual(report['status'],'succeeded');self.assertEqual(report['reported_tokens']['total'],150)
            self.assertEqual(report['model_requests'],1);self.assertTrue(report['usage_complete']);self.assertIsNone(report['cost'])
            self.assertGreaterEqual(report['elapsed_seconds'],0)

    def test_failure_preserves_prior_success_and_reports_unknown_usage(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder);feed=root/'feed.json';cache=root/'cache'
            second={**self.paper,'paper_key':'arxiv:1234.56789v3'}
            feed.write_text(json.dumps({'papers':[self.paper,second]}))
            self.client.chat_structured.side_effect=[{'parsed':self.result},RuntimeError('sensitive provider detail')]
            with self.assertRaises(RuntimeError):enrich_feed(feed,cache,self.client)
            report=json.loads((cache/'latest-run.json').read_text())
            self.assertEqual(report['status'],'failed');self.assertEqual(report['completed'],1)
            self.assertEqual(report['model_requests'],2);self.assertFalse(report['usage_complete'])
            self.assertEqual(report['items'][1]['error_type'],'RuntimeError')
            self.assertNotIn('sensitive',json.dumps(report))
            self.assertEqual(json.loads(feed.read_text())['papers'][0]['content_status'],'triage')
            self.client.chat_structured.side_effect=None
            self.client.chat_structured.return_value={'parsed':{**self.result,'paper_key':second['paper_key']}}
            self.client.chat_structured.reset_mock()
            enrich_feed(feed,cache,self.client,1)
            self.client.chat_structured.assert_called_once()
            report=json.loads((cache/'latest-run.json').read_text())
            self.assertEqual(report['cache_hits'],1);self.assertEqual(report['completed'],2)
