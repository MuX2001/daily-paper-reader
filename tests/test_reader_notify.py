import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import Mock
import requests
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'src'))
from reader_notify import notify

class ReaderNotifyTests(unittest.TestCase):
    def test_digest_deduplicates_and_unknown_does_not_auto_retry(self):
        with tempfile.TemporaryDirectory() as folder:
            feed=Path(folder)/'feed.json';feed.write_text(json.dumps({'run_id':'20261124','papers':[{'score':9},{'score':6}]}))
            session=Mock();session.post.return_value.status_code=200;session.post.return_value.json.return_value={'code':0}
            args=(feed,'https://example.org/reader/','https://open.feishu.cn/open-apis/bot/v2/hook/test',Path(folder)/'ledger')
            self.assertEqual(notify(*args,session=session)['status'],'sent')
            self.assertEqual(notify(*args,session=session)['status'],'already_sent')
            session.post.assert_called_once()
            feed.write_text(json.dumps({'run_id':'20261125','papers':[]}));session.post.side_effect=requests.Timeout()
            with self.assertRaisesRegex(ValueError,'unknown'):notify(*args,session=session)
            calls=session.post.call_count
            with self.assertRaisesRegex(ValueError,'unknown'):notify(*args,session=session)
            self.assertEqual(session.post.call_count,calls)
