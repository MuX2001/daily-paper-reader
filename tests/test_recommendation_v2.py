import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
from datetime import date

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"src"))
import yaml
from recommendation_channels import atom_records, author_match, allocate, merge_pool, retrieve
from recommendation_evidence import validate, select
from recommendation_v2 import DailyRun
from reader_fulltext import html_text
from triage_export import project_paper


def paper(n, version=1):
    return project_paper({"id":f"2601.{n:05}v{version}","title":f"Method {n}", "source":"arxiv"})


def config():
    return yaml.safe_load((ROOT/"config.yaml").read_text())["pipeline"]["recommendation_v2"]


def judgment(quote):
    return {"dimensions":{"idea":4,"experiment":1,"engineering":None,"insight":2,"visualization":4},
            "highlights":[{"dimension":"idea","description":"Reusable transform","excerpt":quote,
                           "limitation":"Requires symmetry","transferability":"Can simplify inference","evidence_ids":["S1.p1"]}],
            "claim_evidence_gap":{"present":False,"reason":None}}


class V2Tests(unittest.TestCase):
    def test_allocation(self):
        lanes={"global":[paper(n) for n in range(30)],"targeted":[],"exploration":[paper(1,2),paper(101),paper(102)]}
        selected=merge_pool(lanes,config())
        self.assertEqual(len(selected),15)
        self.assertEqual(len({p["canonical_id"] for p in selected}),15)
        self.assertTrue({101,102}.issubset({int(p["original_id"][5:10]) for p in selected}))
        shared=next(p for p in selected if p["version"]==2)
        self.assertEqual({s["channel"] for s in shared["retrieval_sources"]},{"global","exploration"})
        self.assertEqual(allocate(lanes,{"global":1},0),[])

    def test_identity(self):
        raw={"credits":[{"name":"Alex Example","affiliations":["Example Lab"]}]}
        self.assertIsNone(author_match(raw,{"name":"Alex Example"}))
        self.assertEqual(author_match(raw,{"name":"A Example","aliases":["Alex Example"],"affiliations":["Example Lab"]}),"confirmed_affiliation")
        self.assertIsNone(author_match(raw,{"name":"Another Example","affiliations":["Example Lab"]}))

    def test_retrieval(self):
        sample=b"""<feed xmlns="http://www.w3.org/2005/Atom"><entry><id>https://arxiv.org/abs/2601.00001v2</id><title>Experimental design for calibration</title><summary>Protocol</summary><author><name>Example</name></author><category term="stat.ME"/></entry></feed>"""
        c=config()
        c["profiles"]=c["profiles"][2:3]
        c["tracking"]=[{"name":"Example","accept_name_only":True}]
        lanes,failures,_=retrieve(c,date(2026,1,2),date(2026,1,2),lambda *args:type("Response",(),{"content":sample})(),lambda key,f:f())
        self.assertFalse(failures)
        self.assertEqual(lanes["exploration"][0]["match"]["mode"],"open_ended")
        self.assertEqual(lanes["targeted"][0]["version"],2)
        with self.assertRaises(ValueError):
            atom_records(b"<html/>")

    def test_evidence(self):
        q="The bound holds only for x ≤ −2."
        locations={"S1.p1":{"text":q,"kind":"paragraph","url":"https://arxiv.org/html/2601.00001v1#S1.p1"}}
        ev=validate(judgment(q),locations)
        self.assertIsNone(ev["dimensions"]["visualization"])
        p={**paper(1),"retrieval_sources":[],"evaluation_v2":ev}
        self.assertEqual(select([p],1),[p])
        for corrupted in (q.replace("≤","≥"), q.replace("−",""),"Unrelated text here"):
            bad=validate(judgment(corrupted),locations)
            self.assertFalse(bad["highlights"][0]["verified"])
            self.assertNotIn("locations",bad["highlights"][0])
            self.assertFalse(select([{**p,"evaluation_v2":bad}],8))

    def test_structured_source(self):
        raw='<article><section id="S1"><h2>Results</h2><div class="ltx_para" id="p">Long evidence sentence. '+('word '*920)+'</div><figure id="F1"><figcaption>Figure 1. Caption only.</figcaption></figure><figure id="T1"><figcaption>Table 1</figcaption><table><tr><td>42</td></tr></table></figure></section><h2>References</h2></article>'
        rows=[]
        html_text(raw,"2601.00001v1",rows)
        self.assertEqual({r["id"] for r in rows},{"S1","p","T1"})
        self.assertEqual(next(r for r in rows if r["id"]=="T1")["kind"],"table")

    def test_budget_and_cache(self):
        q="The bound holds only for x ≤ −2."
        class Client:
            kwargs={"max_tokens":1000}
            base_url="fixture"
            model="fixture"
            def chat(self,*a,**kw):
                return {"content":json.dumps(judgment(q)),"tokens":{"total":52}}
        with tempfile.TemporaryDirectory() as directory, patch("recommendation_v2.inventory",return_value=[{"id":"S1.p1","kind":"paragraph","text":q,"url":None}]):
            c={**config(),"daily_api_calls":1,"exploration":False}
            run=DailyRun(c,"20260102",directory,directory)
            result=run.review(paper(1),Client())
            self.assertTrue(result["highlights"][0]["verified"])
            replay=DailyRun(c,"20260102",directory,directory)
            self.assertEqual(replay.review(paper(1),Client()),result)
            self.assertEqual(replay.usage["tokens"],52)
            with self.assertRaises(RuntimeError):
                replay.review(paper(2),Client())

    def test_catchup(self):
        with tempfile.TemporaryDirectory() as directory:
            run=DailyRun({**config(),"exploration":False},"20260110",directory,directory)
            run.run.parent.mkdir(parents=True)
            (run.run.parent/"retrieved-through.json").write_text('{"through":"2026-01-03"}')
            pool=run.prepare([paper(1)])
            self.assertEqual((pool["start"],pool["end"]),("2026-01-04","2026-01-06"))
            self.assertEqual(run.prepare([paper(1)]),pool)


if __name__=="__main__":
    unittest.main()
