from pathlib import Path
import sys
import json
import tempfile
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'src'))
from reader_catalog import build_catalog,local_route

class ReaderCatalogTests(unittest.TestCase):
    def test_analysis_reused_across_dates_only_for_exact_version(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder);dest=root/'output';(dest/'daily').mkdir(parents=True)
            base={'paper_key':'arxiv:1706.03762v7','source':'arxiv','original_id':'1706.03762v7','title_zh':None}
            older={'schema_version':1,'run_id':'20261123','papers':[dict(base),dict(base,paper_key='arxiv:1706.03762v6',original_id='1706.03762v6')]}
            newer={'schema_version':1,'run_id':'20261124','title':'已验证样本','papers':[dict(base,minmax={'status':'ready','delta':{'text':'verified'}})]}
            for feed in (older,newer):(dest/'daily'/f"{feed['run_id']}.json").write_text(json.dumps(feed))
            entries=build_catalog(root,dest)
            self.assertEqual(entries[0]['title'],'已验证样本')
            records=json.loads((dest/'daily/20261123.json').read_text())['papers']
            self.assertEqual(records[0]['minmax']['delta']['text'],'verified')
            self.assertNotIn('minmax',records[1])

    def test_existing_feed_survives_archive_eviction_and_matches_exact_text_version(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder);dest=root/'output';(dest/'daily').mkdir(parents=True)
            (root/'docs/20261124').mkdir(parents=True)
            route='20261124/paper-v2'
            (root/'docs/20261124/_daily_state.json').write_text(json.dumps({'papers':[{'paper_id':'1234.56789v2','route':route}]}))
            (root/'docs'/f'{route}.txt').write_text('Body text. '*500+'References')
            feed={'schema_version':1,'run_id':'20261124','papers':[{'original_id':'1234.56789v1','title_zh':None},{'original_id':'1234.56789v2','title_zh':None}]}
            (dest/'daily/20261124.json').write_text(json.dumps(feed))
            entries=build_catalog(root,dest);self.assertEqual(len(entries),1)
            result=json.loads((dest/'daily/20261124.json').read_text())['papers']
            self.assertNotIn('fulltext_path',result[0]);self.assertEqual(result[1]['fulltext_path'],'./docs/'+route+'.txt')
            self.assertIsNone(local_route(root,'../secret'))

    def test_topic_fixed_list_exports_without_models(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder);run='20261124-abcdef012345';path=root/'docs/starter-pack'/run;path.mkdir(parents=True)
            state={'manifest':{'profile':{'tag':'Planning'},'mode':'90','status':'complete'},'selection':{'selection_complete':True,'papers':[{'id':'1234.56789v2','title':'Example','abstract':'Abstract','source':'arxiv','score':8}]}}
            (path/'task-state.json').write_text(json.dumps(state))
            build_catalog(root,root/'output')
            catalog=json.loads((root/'output/catalog.json').read_text())
            self.assertEqual(catalog['topics'][0]['count'],1)
            topic=json.loads((root/'output/topics'/f'{run}.json').read_text())
            self.assertEqual(topic['papers'][0]['paper_key'],'arxiv:1234.56789v2')
            self.assertIsNone(topic['topic']['guide'])

    def test_published_history_recovers_missing_feed_without_recommendation_cache(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder);path=root/'docs/20261124';path.mkdir(parents=True)
            route='20261124/paper-v2'
            (path/'_daily_state.json').write_text(json.dumps({'papers':[{'paper_id':'1234.56789v2','route':route,'title':'Original','score':8,'tags':[{'kind':'query','label':'robot'}]}]}))
            (path/'papers.meta.json').write_text(json.dumps({'papers':[{'paper_id':route,'source':'arxiv','title_en':'Original','abstract_en':'Published abstract','date':'2026-11-20','pdf':'https://arxiv.org/pdf/1234.56789v2','tldr':'Existing overview'}]}))
            destination=root/'output'
            build_catalog(root,destination)
            feed=json.loads((destination/'daily/20261124.json').read_text())
            self.assertEqual(feed['papers'][0]['paper_key'],'arxiv:1234.56789v2')
            self.assertEqual(feed['papers'][0]['abstract'],'Published abstract')
            self.assertEqual(feed['papers'][0]['tags'],['query:robot'])
            self.assertEqual(feed['papers'][0]['legacy_routes'],[route])
            build_catalog(root,destination)
            self.assertEqual(len(json.loads((destination/'daily/20261124.json').read_text())['papers']),1)

    def test_source_namespaces_prevent_wrong_fulltext_and_topics_reuse_exact_version(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder);path=root/'docs/20261124';path.mkdir(parents=True)
            route='20261124/paper';pid='1234.56789v2'
            (path/'_daily_state.json').write_text(json.dumps({'papers':[{'paper_id':pid,'route':route}]}))
            (path/'papers.meta.json').write_text(json.dumps({'papers':[{'paper_id':route,'source':'arxiv'}]}))
            (path/'paper.txt').write_text('Full paper body. '*400+'References')
            dest=root/'output';(dest/'daily').mkdir(parents=True)
            (dest/'daily/20261124.json').write_text(json.dumps({'schema_version':1,'run_id':'20261124','papers':[{'source':'icml','original_id':pid}]}))
            run='20261124-abcdef012345';topic=root/'docs/starter-pack'/run;topic.mkdir(parents=True)
            (topic/'task-state.json').write_text(json.dumps({'selection':{'selection_complete':True,'papers':[{'id':pid,'source':'arxiv','title':'Exact','score':8}]}}))
            build_catalog(root,dest)
            self.assertNotIn('fulltext_path',json.loads((dest/'daily/20261124.json').read_text())['papers'][0])
            result=json.loads((dest/'topics'/f'{run}.json').read_text())['papers'][0]
            self.assertEqual(result['fulltext_path'],'./docs/'+route+'.txt')
