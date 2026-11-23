from pathlib import Path
import hashlib
import json
import sys
import tempfile
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'src'))
from reader_fulltext import get_fulltext,html_text,pdf_text

TEXT='This is the methods and evaluation body of the paper. '*100+'References\nBibliography.'
def html(version='1706.03762v7'):
    return f'<html><head><meta name="citation_arxiv_id" content="{version}"></head><body><article>{TEXT}</article></body></html>'.encode()

class ReaderFulltextTests(unittest.TestCase):
    def test_html_version_identity_and_formula_preservation(self):
        with self.assertRaisesRegex(ValueError,'different arXiv version'):html_text(html('1706.03762v6'),'1706.03762v7')
        body=html().replace(b'</article>',b'<math alttext="E=mc^2">ignored</math></article>')
        self.assertIn('$E=mc^2$',html_text(body,'1706.03762v7'))

    def test_broken_cache_refetches_and_valid_cache_is_reused(self):
        with tempfile.TemporaryDirectory() as folder:
            path=Path(folder)/hashlib.sha256(b'1706.03762v7').hexdigest();path.mkdir()
            (path/'source.json').write_text('{broken');(path/'fulltext.txt').write_text(TEXT)
            requests=[]
            def fetch(url):requests.append(url);return html()
            first=get_fulltext('1706.03762v7',folder,fetch)
            self.assertEqual(len(requests),1)
            self.assertEqual(get_fulltext('1706.03762v7',folder,fetch),first);self.assertEqual(len(requests),1)
            meta=json.loads((path/'source.json').read_text());meta['source_url']='https://arxiv.org/html/1706.03762v6';(path/'source.json').write_text(json.dumps(meta))
            get_fulltext('1706.03762v7',folder,fetch);self.assertEqual(len(requests),2)

    def test_pdf_wrong_version_and_invalid_pdf_are_explicit_failures(self):
        import fitz
        with fitz.open() as document:
            page=document.new_page();page.insert_text((30,30),'arXiv:1706.03762v6')
            with self.assertRaisesRegex(ValueError,'different arXiv version'):pdf_text(document.tobytes(),'1706.03762v7')
        with self.assertRaisesRegex(ValueError,'Unreadable PDF'):pdf_text(b'%PDF-1.7\nbroken','1706.03762v7')

    def test_failed_sources_never_create_a_completed_checkpoint(self):
        with tempfile.TemporaryDirectory() as folder:
            def fetch(url):return html('1706.03762v6') if '/html/' in url else b'%PDF-1.7\nbroken'
            with self.assertRaisesRegex(ValueError,'No verified complete text'):get_fulltext('1706.03762v7',folder,fetch)
            self.assertEqual(list(Path(folder).rglob('source.json')),[])
