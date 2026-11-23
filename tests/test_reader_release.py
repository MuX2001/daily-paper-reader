from pathlib import Path
import importlib.util
import tempfile
import unittest
from unittest.mock import Mock,patch

spec=importlib.util.spec_from_file_location('reader_release',Path(__file__).resolve().parents[1]/'scripts/stage_reader_release.py')
release=importlib.util.module_from_spec(spec);spec.loader.exec_module(release)

class ReaderReleaseTests(unittest.TestCase):
    def test_existing_default_branch_root_required(self):
        session=Mock();meta=Mock();meta.json.return_value={'default_branch':'main'};pages=Mock();pages.json.return_value={'build_type':'legacy','source':{'branch':'main','path':'/'},'html_url':'https://example.org/'};session.get.side_effect=[meta,pages]
        with self.assertRaises(ValueError):release.validate_pages('owner/repo','dev','token',session)
        session.get.side_effect=[meta,pages]
        self.assertEqual(release.validate_pages('owner/repo','main','token',session),'https://example.org/')
        session.put.assert_not_called();session.post.assert_not_called()
    def test_stage_preserves_source_and_legacy(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder)/'source';build=Path(folder)/'build';(root/'reader').mkdir(parents=True);(build/'app/reader-assets').mkdir(parents=True);(build/'docs/data').mkdir(parents=True)
            (root/'reader/index.html').write_text('source entry');(root/'legacy.html').write_text('archive')
            (build/'index.html').write_text('compiled entry');(build/'app/reader-assets/app.js').write_text('compiled js')
            with patch.object(release.subprocess,'check_output',return_value='abc123\n'):release.stage(root,build)
            self.assertEqual((root/'index.html').read_text(),'compiled entry')
            self.assertEqual((root/'reader/index.html').read_text(),'source entry')
            self.assertEqual((root/'legacy.html').read_text(),'archive')
