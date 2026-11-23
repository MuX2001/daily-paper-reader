from pathlib import Path
import sys
import json
import tempfile
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'src'))
from reader_catalog import build_catalog,local_route

class ReaderCatalogTests(unittest.TestCase):
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
