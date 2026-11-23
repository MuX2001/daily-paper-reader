from pathlib import Path
import sys
import tempfile
import unittest
import json
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'src'))
from reader_conferences import conference_catalog

class ConferenceCatalogTests(unittest.TestCase):
    def test_explicit_identity_and_legacy_link_fallback_without_date_guessing(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder);pages=root/'docs/conference/icml-2025';pages.mkdir(parents=True)
            base='---\ntitle: Original title\nsource: ICML-2025-Accepted\nselection_source: conference_retrieval\nscore: 8\ndate: 2024-01-01\n'
            (pages/'new.md').write_text(base+'original_id: ExactID\noriginal_url: https://openreview.net/forum?id=ExactID\nauthors_list: [Alice, Bob]\npublication_date: 2025\npublication_date_precision: year\n---\n## Abstract\nFull original abstract.\n\n## Summary\nText')
            (pages/'old.md').write_text(base+'---\n## Abstract\nOld abstract.\n\n## Summary\n- OpenReview：[https://openreview.net/forum?id=OldID](https://openreview.net/forum?id=OldID)')
            (pages/'unknown.md').write_text(base+'---\n## Abstract\nCannot infer ID from filename.\n')
            entries,skipped=conference_catalog(root,root/'output')
            self.assertEqual(len(entries),1);self.assertEqual(entries[0]['count'],2)
            self.assertEqual(skipped,['conference/icml-2025/unknown.md'])
            papers=json.loads((root/'output'/entries[0]['path']).read_text())['papers']
            records={p['original_id']:p for p in papers}
            self.assertEqual(records['ExactID']['authors'],['Alice','Bob'])
            self.assertEqual(records['ExactID']['publication_date'],'2025')
            self.assertIsNone(records['OldID']['published'])
            self.assertIsNone(records['OldID']['publication_date'])
            self.assertEqual(records['OldID']['abstract'],'Old abstract.')
            self.assertTrue(records['ExactID']['reading_path'].endswith('/new'))
            self.assertEqual(conference_catalog(root,root/'output')[0],entries)
