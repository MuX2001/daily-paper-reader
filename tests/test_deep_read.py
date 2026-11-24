import os
import subprocess
import hashlib
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import Mock
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'src'))
from deep_read import run,SECTIONS,validate_note
from reader_fulltext import validate_id,validate_fulltext


class DeepReadTests(unittest.TestCase):
    def setUp(self):
        self.text='Title: quoted\nAuthor\n'+('We compare to baseline using a fixed evaluation protocol. '*100)+'\nReferences\nA citation.'
        self.meta={'sha256':hashlib.sha256(self.text.encode()).hexdigest(),'source_url':'https://arxiv.org/html/1706.03762v7'}
        self.note={'title':'Title: quoted','authors':['Author'],'sections':{key:{'markdown':'这是根据论文全文生成的分析。'*5,'evidence':['We compare to baseline using a fixed evaluation protocol.']} for key in SECTIONS}}
        self.client=Mock(model='flagship',base_url='https://example.org')
        self.client.chat_structured.return_value={'parsed':self.note}
        self.fetcher=lambda *_:(self.text,self.meta)

    def test_version_and_fulltext_required(self):
        for value in ('1706.03762','../../etc/passwd','1706.03762v0'):
            with self.assertRaises(ValueError):validate_id(value)
        with self.assertRaises(ValueError):validate_fulltext('abstract only')
        with self.assertRaises(ValueError):validate_fulltext('text '*2000)

    def test_success_cache_and_obsidian_frontmatter(self):
        with tempfile.TemporaryDirectory() as folder:
            cache=Path(folder)/'cache';out=Path(folder)/'out'
            first=run('1706.03762v7','request_001',cache,out,self.client,fetcher=self.fetcher)
            second=run('1706.03762v7','request_002',cache,out,self.client,fetcher=self.fetcher)
            self.assertEqual(first['status'],'succeeded');self.assertTrue(second['reused'])
            self.client.chat_structured.assert_called_once()
            markdown=(out/first['note']).read_text()
            self.assertIn('status: to-read',markdown);self.assertIn('arxiv_id: 1706.03762v7',markdown)
            self.assertIn('## Baseline 对比与消融实验',markdown)

    def test_invalid_evidence_never_completes_or_caches(self):
        with tempfile.TemporaryDirectory() as folder:
            self.note['sections']['experiments']['evidence']=['Invented result: 99%']
            with self.assertRaises(ValueError):run('1706.03762v7','request_001',Path(folder)/'cache',Path(folder)/'out',self.client,fetcher=self.fetcher)
            self.assertEqual(json.loads((Path(folder)/'out/status.json').read_text())['status'],'failed')
            self.assertFalse((Path(folder)/'cache/notes').exists())

    def test_context_budget_does_not_truncate_or_call_model(self):
        with tempfile.TemporaryDirectory() as folder:
            with self.assertRaises(ValueError):run('1706.03762v7','request_001',Path(folder)/'cache',Path(folder)/'out',self.client,max_chars=100,fetcher=self.fetcher)
            self.client.chat_structured.assert_not_called()

    def test_metadata_accepts_wrapped_original_strings(self):
        text=self.text.replace('Title: quoted','Title:\n quoted').replace('Author','Ａuthor')
        validate_note(self.note,text)

    def test_metadata_rejects_invention_and_bibliography_only_names(self):
        for field,value in [('title','Invented title'),('authors',['Invented Author']),('authors',[' '])]:
            with self.subTest(field=field,value=value):
                note={**self.note,field:value}
                with self.assertRaises(ValueError):validate_note(note,self.text)
        note={**self.note,'authors':['Bibliography Author']}
        with self.assertRaises(ValueError):
            validate_note(note,self.text+' padding '*1000+'Bibliography Author')

    def test_invalid_metadata_preserves_previous_note_and_does_not_cache(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder);out=root/'out';out.mkdir()
            old=out/'1706.03762v7.md';old.write_text('Previous complete note')
            self.note['title']='Invented title'
            with self.assertRaises(ValueError):
                run('1706.03762v7','request_001',root/'cache',out,self.client,fetcher=self.fetcher)
            self.assertEqual(old.read_text(),'Previous complete note')
            self.assertFalse((root/'cache/notes').exists())
            self.assertEqual(json.loads((out/'status.json').read_text())['status'],'failed')

    def test_missing_model_configuration_produces_downloadable_failure_status(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder)
            env={k:v for k,v in os.environ.items() if not k.startswith(('DEEP_READ_','DEEPSEEK_'))}
            result=subprocess.run([sys.executable,str(Path(__file__).resolve().parents[1]/'src/deep_read.py'),'--arxiv-id','1706.03762v7','--request-id','request_001','--cache-dir',str(root/'cache'),'--output-dir',str(root/'output')],env=env,capture_output=True,text=True)
            self.assertNotEqual(result.returncode,0)
            status=json.loads((root/'output/status.json').read_text())
            self.assertEqual(status['status'],'failed')
            self.assertEqual(status['stage'],'configuration')
            self.assertFalse((root/'cache').exists())
