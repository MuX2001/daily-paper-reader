import os
import sys
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"src"))
from unittest.mock import patch

from minmax import active_prompt
from triage_enrich import cache_key


class SummaryLanguageTests(unittest.TestCase):
    def test_language_changes_prompt_and_cache(self):
        paper = {'paper_key': 'example:v1', 'title': 'A paper', 'abstract': 'An abstract.'}
        with patch.dict(os.environ, SUMMARY_LANG='zh'):
            default_key = cache_key(paper, 'model', 'endpoint')
            assert 'compact Chinese decision card' in active_prompt()
        with patch.dict(os.environ, SUMMARY_LANG='en'):
            assert cache_key(paper, 'model', 'endpoint') != default_key
            assert 'plain English' in active_prompt()
            assert 'quote' in active_prompt()
