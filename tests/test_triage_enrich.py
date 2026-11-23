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
