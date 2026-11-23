import copy
import unittest
from src.reader_feedback_eval import compare,fingerprint


class FeedbackEvaluationTests(unittest.TestCase):
    def setUp(self):
        self.snapshot={'candidates':[{'paper_key':key,'title':key,'abstract':'Synthetic only','tags':[tag]} for key,tag in [('a:v1','planning'),('b:v1','planning'),('c:v1','robotics'),('d:v1','vision')]],
                       'label_source':'human','labels':{'a:v1':1,'b:v1':0,'c:v1':1},'feedback_context_ids':['previous:v1']}
        digest=fingerprint(self.snapshot['candidates'])
        self.base={'candidate_sha256':digest,'ranking':['a:v1','b:v1','c:v1','d:v1'],'usage':{'tokens':100,'cost':1,'currency':'USD'}}
        self.new={'candidate_sha256':digest,'ranking':['c:v1','d:v1','b:v1','a:v1'],'usage':{'tokens':120,'cost':2,'currency':'USD'}}

    def test_partial_labels_and_turnover_are_explicit(self):
        result=compare(self.snapshot,self.base,self.new,2)
        self.assertEqual(result['label_coverage'],.75)
        self.assertEqual(result['baseline']['precision_among_judged'],.5)
        self.assertEqual(result['feedback']['unjudged_selected'],1)
        self.assertEqual(result['feedback']['precision_among_judged'],1)
        self.assertEqual(result['feedback']['missed_labeled_positives'],1)
        self.assertEqual(result['lost_labeled_positives'],['a:v1'])
        self.assertEqual(result['gained_labeled_positives'],['c:v1'])
        self.assertEqual(result['delta']['cost'],1)
        self.assertEqual(result['delta']['unique_tags'],1)

    def test_snapshot_mismatch_duplicates_and_label_leakage_are_rejected(self):
        for change in ['abstract','ranking','model_labels','leakage']:
            with self.subTest(change=change):
                snapshot=copy.deepcopy(self.snapshot);new=copy.deepcopy(self.new)
                if change=='abstract':snapshot['candidates'][0]['abstract']='Different model input'
                if change=='ranking':new['ranking']=['a:v1']*4
                if change=='model_labels':snapshot['label_source']='model'
                if change=='leakage':snapshot['feedback_context_ids']=['a:v1']
                with self.assertRaises(ValueError):compare(snapshot,self.base,new)

    def test_unknown_cost_and_empty_judgments_are_not_zero(self):
        self.new['usage']={}
        result=compare(self.snapshot,self.base,self.new,1)
        self.assertIsNone(result['delta']['cost']);self.assertIsNone(result['delta']['tokens'])
        self.snapshot['labels']={'b:v1':0}
        result=compare(self.snapshot,self.base,self.new,1)
        self.assertIsNone(result['feedback']['precision_among_judged'])
        self.assertIsNone(result['feedback']['recall_of_labeled_positives'])
        self.new['usage']={'cost':2,'currency':'EUR'}
        self.assertIsNone(compare(self.snapshot,self.base,self.new)['delta']['cost'])

    def test_candidate_order_does_not_change_identity(self):
        self.assertEqual(fingerprint(self.snapshot['candidates']),fingerprint(list(reversed(self.snapshot['candidates']))))
