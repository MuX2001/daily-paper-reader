import copy
import sys
from pathlib import Path
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'src'))
from minmax_readable import validate,context,LIMITS,MISSING

class ReadableTests(unittest.TestCase):
    def setUp(self):
        self.quote='We encode inputs and predict outputs using measured forces.'
        self.parts=[{'id':'E1','text':self.quote}]
        self.value={'card':{'tldr':'先编码输入，再预测输出。','problem_delta':'把测到的力用于预测。','method_steps':['读取输入','编码输入','预测输出'],'evidence':MISSING,'caveats':MISSING,'where_to_look':MISSING,'tags':['力传感','编码']},'citations':{k:({'source_id':None,'quote':None} if k in ('evidence','caveats','where_to_look') else {'source_id':'E1','quote':self.quote}) for k in (*LIMITS,'method_steps')}}
    def test_valid_and_banned_length(self):
        validate(copy.deepcopy(self.value),self.parts)
        for field,text in [('tldr','本文针对测力问题。'),('problem_delta','x'*71),('caveats','原文未提')]:
            v=copy.deepcopy(self.value);v['card'][field]=text
            with self.assertRaises(ValueError):validate(v,self.parts)
    def test_citations_and_steps_required(self):
        v=copy.deepcopy(self.value);v['citations']['tldr']['quote']='A fabricated result is not evidence.'
        with self.assertRaises(ValueError):validate(v,self.parts)
        v=copy.deepcopy(self.value);v['card']['method_steps']=['一步']
        with self.assertRaises(ValueError):validate(v,self.parts)
    def test_bounded_exact_slices(self):
        text='Title\nAbstract\n'+('Opening prose. '*500)+'\nMethod\n3.1\nEncoding\n'+('Encode inputs. '*100)+'\nFigure 1: model\n'+('caption '*50)+'\nConclusion\nWe report limitations.\nReferences\n'
        parts=context(text)
        self.assertLessEqual(sum(len(p['text']) for p in parts),14000)
        self.assertTrue(all(p['text']==text[p['start']:p['end']] for p in parts))
        self.assertTrue(any('limitations' in p['text'] for p in parts))

    def test_math_spacing_does_not_change_tokens(self):
        v=copy.deepcopy(self.value);v['citations']['tldr']['quote']='Use $d_{k}$-dimensional vectors.'
        source='Use\n$d_{k}$\n-dimensional vectors.'
        for k,c in v['citations'].items():
            if c['quote'] and k!='tldr':c['quote']=source
        self.assertEqual(validate(v,[{'id':'E1','text':source}])['citations']['tldr']['quote'],source)
        v['citations']['tldr']['quote']='Use $d_{v}$-dimensional vectors.'
        with self.assertRaises(ValueError):validate(v,[{'id':'E1','text':source}])
