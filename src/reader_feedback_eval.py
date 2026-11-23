"""Compare saved rankings against held-out human labels without model calls."""
from __future__ import annotations
import argparse
import hashlib
import json
import math
from pathlib import Path


def fingerprint(candidates):
    return hashlib.sha256(json.dumps(sorted(candidates,key=lambda p:p['paper_key']),
                                    sort_keys=True,ensure_ascii=False,separators=(',',':'),allow_nan=False).encode()).hexdigest()


def compare(snapshot,baseline,feedback,k=20):
    if type(k) is not int or k<1:raise ValueError('top-k must be a positive integer')
    candidates=snapshot.get('candidates')
    if not isinstance(candidates,list) or not candidates:raise ValueError('A fixed candidate snapshot is required')
    index={}
    for paper in candidates:
        if not isinstance(paper,dict) or not isinstance(paper.get('paper_key'),str) or not paper['paper_key'] or paper['paper_key'] in index:
            raise ValueError('Candidate identities must be nonempty and unique')
        if not isinstance(paper.get('tags',[]),list) or any(not isinstance(t,str) for t in paper.get('tags',[])):
            raise ValueError('Candidate tags must be strings')
        index[paper['paper_key']]=paper
    digest=fingerprint(candidates)
    if snapshot.get('label_source')!='human':raise ValueError('Human labels are required; model scores are not ground truth')
    labels=snapshot.get('labels');training=snapshot.get('feedback_context_ids')
    if not isinstance(labels,dict) or not labels:raise ValueError('No held-out human labels supplied')
    if not isinstance(training,list) or any(not isinstance(p,str) for p in training):raise ValueError('Declare feedback_context_ids, including an empty list if unused')
    if set(training)&set(labels):raise ValueError('Evaluation labels overlap feedback examples; use held-out labels')
    if any(key not in index or type(value) is not int or value not in (0,1) for key,value in labels.items()):
        raise ValueError('Labels must identify candidates and use 0/1 human relevance')
    keys=set(index);positives={key for key,value in labels.items() if value==1}
    results={};selections={}
    for name,run in [('baseline',baseline),('feedback',feedback)]:
        if run.get('candidate_sha256')!=digest:raise ValueError('Ranking does not match the fixed candidate snapshot')
        ranking=run.get('ranking')
        if not isinstance(ranking,list) or any(not isinstance(key,str) for key in ranking) or len(ranking)!=len(keys) or set(ranking)!=keys:
            raise ValueError('Both rankings must contain every candidate exactly once')
        selected=ranking[:k];selections[name]=set(selected)
        judged=[key for key in selected if key in labels];hits=sum(labels[key] for key in judged)
        tags={tag for key in selected for tag in index[key].get('tags',[]) if tag}
        usage=run.get('usage') or {}
        if not isinstance(usage,dict):raise ValueError('Usage must be an object')
        tokens=usage.get('tokens');cost=usage.get('cost');currency=usage.get('currency')
        if tokens is not None and (type(tokens) is not int or tokens<0):raise ValueError('Invalid token usage')
        if cost is not None and (type(cost) not in (int,float) or not math.isfinite(cost) or cost<0 or not isinstance(currency,str) or not currency.strip()):
            raise ValueError('Cost requires a nonnegative finite amount and currency')
        results[name]={'selected':len(selected),'judged_selected':len(judged),'positive_hits':hits,
                       'negative_hits':len(judged)-hits,'unjudged_selected':len(selected)-len(judged),
                       'precision_among_judged':hits/len(judged) if judged else None,
                       'recall_of_labeled_positives':hits/len(positives) if positives else None,
                       'missed_labeled_positives':len(positives)-hits,'unique_tags':len(tags),
                       'tokens':tokens,'cost':cost,'currency':currency if cost is not None else None}
    before=results['baseline'];after=results['feedback']
    numeric=['positive_hits','negative_hits','missed_labeled_positives','unique_tags','tokens']
    delta={name:after[name]-before[name] if after[name] is not None and before[name] is not None else None for name in numeric}
    delta['cost']=after['cost']-before['cost'] if before['cost'] is not None and after['cost'] is not None and before['currency']==after['currency'] else None
    delta['currency']=before['currency'] if delta['cost'] is not None else None
    return {'candidate_sha256':digest,'candidates':len(keys),'labeled':len(labels),'label_coverage':len(labels)/len(keys),
            'top_k':k,**results,'delta':delta,
            'lost_labeled_positives':sorted((selections['baseline']-selections['feedback'])&positives),
            'gained_labeled_positives':sorted((selections['feedback']-selections['baseline'])&positives),
            'interpretation':'Descriptive held-out comparison only; unknown labels are not negatives. Tag count is not semantic diversity. No statistical significance or quality improvement is asserted.'}


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--snapshot',type=Path,required=True)
    parser.add_argument('--baseline',type=Path)
    parser.add_argument('--feedback',type=Path)
    parser.add_argument('--output',type=Path)
    parser.add_argument('--top-k',type=int,default=20)
    parser.add_argument('--fingerprint',action='store_true')
    args=parser.parse_args();snapshot=json.loads(args.snapshot.read_text())
    if args.fingerprint:print(fingerprint(snapshot['candidates']));return
    if not args.baseline or not args.feedback or not args.output:parser.error('comparison requires --baseline, --feedback and --output')
    report=compare(snapshot,json.loads(args.baseline.read_text()),json.loads(args.feedback.read_text()),args.top_k)
    from triage_enrich import atomic_json
    atomic_json(args.output,report)
    print(f'Compared {report["candidates"]} candidates; {report["labeled"]} human labels; no model calls')


if __name__=='__main__':main()
