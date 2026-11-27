"""Produce an offline, explicitly synthetic V2 publication fixture on CI."""
import argparse
import json
from pathlib import Path
import sys
from tempfile import TemporaryDirectory
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"src"))
import yaml
from llm import LLMClient
from reader_catalog import build_catalog
from recommendation_v2 import DailyRun
from triage_enrich import atomic_json
from triage_export import project_paper


def main(output):
    config = yaml.safe_load((ROOT/"config.yaml").read_text())["pipeline"]["recommendation_v2"]
    config.update(exploration=False,targeted=False,shadow_mode=False,select_v2=True)
    p = project_paper({"id":"2601.00001v1","source":"arxiv","title":"Synthetic evaluation fixture"})
    passage = "A paired experiment holds the random seeds fixed across both conditions."
    evaluation = {"dimensions":{"idea":None,"experiment":3,"engineering":None,"visualization":None,"insight":None},
                  "highlights":[{"dimension":"experiment","evidence_ids":["p1"],"description":"Paired protocol",
                                 "excerpt":passage,"transferability":"Repeat paired trials","limitation":"Synthetic fixture"}],
                  "claim_evidence_gap":{"present":False,"reason":None}}
    with TemporaryDirectory() as folder:
        run = DailyRun(config,"20260102",folder,folder)
        pool = run.prepare([p])
        client = LLMClient("offline","fixture","https://fixture.invalid")
        with patch("recommendation_v2.inventory",return_value=[{"id":"p1","text":passage,"url":None,"kind":"paragraph"}]), \
             patch.object(LLMClient,"chat",return_value={"content":json.dumps(evaluation),"tokens":{}}):
            feed=run.finish(pool,{"run_id":run.day,"schema_version":1,"papers":[]},[p],client)
        assert len(feed["papers"])==1 and feed["papers"][0]["evaluation_v2"]["highlights"][0]["verified"]
        atomic_json(output/"daily"/(run.day+".json"),feed)
        build_catalog(Path(folder),output)
        assert json.loads((output/"catalog.json").read_text())["runs"][0]["count"]==1


if __name__=="__main__":
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output",type=Path)
    main(parser.parse_args().output)
