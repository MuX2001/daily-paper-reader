import gzip
import json
import os
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
from candidate_archive import record, finalize


class ArchiveTests(unittest.TestCase):
    def test_retry_versions_queries_and_selection(self):
        with tempfile.TemporaryDirectory() as root, patch.dict(os.environ, DPR_CANDIDATE_ARCHIVE_DIR=root, GITHUB_RUN_ID="123"):
            papers = [{"id": "2611.12345v1", "title": "First"},
                      {"id": "2611.12345v2", "title": "Second"}]
            cfg = {"keywords": ["robot"], "api_key": "private", "url": "private"}
            record("global", "q1", papers, cfg)
            record("global", "q1", papers, cfg)
            record("global", "q2", [], cfg, status="failed")
            finalize([{"paper_key": "arxiv:2611.12345v2"}])
            with gzip.open(next(Path(root).glob("*.gz")), "rt") as source:
                rows = [json.loads(line) for line in source]
            self.assertEqual(len(rows), 2)
            values = next(r for r in rows if r["query"] == "q1")
            self.assertEqual(values["config"]["configuration"], {"keywords": ["robot"]})
            self.assertEqual([p["selected"] for p in values["candidates"]], [False, True])
            self.assertEqual(values["candidates"][0]["canonical_id"], values["candidates"][1]["canonical_id"])
            self.assertEqual(next(r for r in rows if r["query"] == "q2")["status"], "failed")
            record("global", "q1", papers, {"keywords": ["changed"]})
            with gzip.open(next(Path(root).glob("*.gz")), "rt") as source:
                self.assertEqual(len(list(source)), 3)

    def test_failure_does_not_stop_caller(self):
        with tempfile.NamedTemporaryFile() as file, patch.dict(os.environ, DPR_CANDIDATE_ARCHIVE_DIR=file.name):
            record("global", "q", [], {})
            finalize([])
