import json
from pathlib import Path
import sys
import tempfile
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'src'))
from reader_feedback import feedback_context

class ReaderFeedbackTests(unittest.TestCase):
    def test_scoped_and_bounded_preference_not_exclusion(self):
        with tempfile.TemporaryDirectory() as folder:
            p=Path(folder)/'feedback.json'
            examples=[{'title':f'A{i}','abstract':'Evidence','tags':['query:planning'],'feedback':1} for i in range(10)]
            examples+=[{'title':'Unrelated','abstract':'Other','tags':['query:biology'],'feedback':-1}]
            p.write_text(json.dumps({'version':1,'examples':examples}))
            text=feedback_context([{'tag':'query:planning:composite'}],p)
            self.assertIn('A4',text);self.assertNotIn('A5',text);self.assertNotIn('Unrelated',text)
            self.assertIn('NOT a topic exclusion',text)
            self.assertEqual(feedback_context([{'tag':'keyword:physics'}],p),'')
