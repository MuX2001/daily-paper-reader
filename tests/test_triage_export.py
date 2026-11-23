import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from src.triage_export import build_feed, export_feed


class TriageExportTest(unittest.TestCase):
    def payload(self, **overrides):
        return {'deep_dive': [dict(id='2610.00001v1', title='Example', llm_score=8, **overrides)], 'quick_skim': []}

    def test_version_identity_and_no_invented_content(self):
        payload = self.payload()
        payload['quick_skim'] = [dict(payload['deep_dive'][0], id='2610.00001v2')]
        records = build_feed(payload, '20261124')['papers']
        self.assertEqual(len(records), 2)
        self.assertEqual(records[0]['canonical_id'], records[1]['canonical_id'])
        self.assertNotEqual(records[0]['paper_key'], records[1]['paper_key'])
        self.assertIsNone(records[0]['breakdown']['results'])
        self.assertEqual(records[0]['content_status'], 'incomplete')

    def test_merge_preserves_higher_score_and_tags_and_empty_rerun(self):
        previous = build_feed(self.payload(tags=['a']), '20261124')
        payload = self.payload(tags=['b'])
        payload['deep_dive'][0]['llm_score'] = 7
        feed = build_feed(payload, '20261124', previous)
        self.assertEqual(feed['papers'][0]['score'], 8)
        self.assertEqual(feed['papers'][0]['tags'], ['a', 'b'])
        self.assertEqual(build_feed({'deep_dive': [], 'quick_skim': []}, '20261124', feed), feed)

    def test_whitelist_and_url_safety(self):
        record = build_feed(self.payload(secret='private', link='javascript:alert(1)'), '20261124')['papers'][0]
        self.assertNotIn('secret', record)
        self.assertIsNone(record['url'])

    def test_catalog_rebuild_preserves_enrichment_only_for_same_content(self):
        previous = build_feed(self.payload(abstract='original'), '20261124')
        previous['papers'][0].update(content_status='triage', title_zh='译文')
        same = build_feed(self.payload(abstract='original'), '20261124', previous)
        self.assertEqual(same['papers'][0]['title_zh'], '译文')
        changed = build_feed(self.payload(abstract='changed'), '20261124', previous)
        self.assertEqual(changed['papers'][0]['content_status'], 'incomplete')

    def test_invalid_data_fails(self):
        for value in (float('nan'), 11, True, '8'):
            payload = self.payload()
            payload['deep_dive'][0]['llm_score'] = value
            with self.assertRaises(ValueError):
                build_feed(payload, '20261124')
        with self.assertRaises(ValueError):
            build_feed({}, '20261124')
        with self.assertRaises(ValueError):
            build_feed(self.payload(), '../20261124')

    def test_failed_atomic_replace_preserves_previous_output(self):
        with tempfile.TemporaryDirectory() as folder:
            source, target = Path(folder)/'input.json', Path(folder)/'output.json'
            source.write_text(json.dumps(self.payload()))
            export_feed(source, target, '20261124')
            before = target.read_bytes()
            with patch('src.triage_export.os.replace', side_effect=OSError('failure')):
                with self.assertRaises(OSError):
                    export_feed(source, target, '20261124')
            self.assertEqual(target.read_bytes(), before)
            self.assertEqual(len(list(Path(folder).iterdir())), 2)

    def test_source_namespace(self):
        payload = {'deep_dive': [{'id': 'abc', 'title': 'A', 'source': 'iclr'}, {'id': 'abc', 'title': 'B', 'source': 'neurips'}], 'quick_skim': []}
        self.assertEqual(len(build_feed(payload, '20261124')['papers']), 2)
