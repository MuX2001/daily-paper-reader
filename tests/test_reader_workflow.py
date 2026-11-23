"""Execute the actual pre-install workflow validator without site packages."""
from pathlib import Path
import os
import subprocess
import sys
import tempfile
import unittest
import yaml

ROOT=Path(__file__).resolve().parents[1]

class ReaderWorkflowTests(unittest.TestCase):
    def test_deep_read_validation_bootstraps_without_dependencies(self):
        workflow=yaml.safe_load((ROOT/'.github/workflows/deep-read.yml').read_text())
        step=next(s for s in workflow['jobs']['read']['steps'] if s.get('id')=='input')
        script=step['run'].split("<<'PY'\n",1)[1].rsplit('\nPY',1)[0]
        with tempfile.TemporaryDirectory() as folder:
            output=Path(folder)/'outputs'
            env={**os.environ,'PYTHONPATH':str(ROOT/'src'),'PAPER_ID':'1706.03762v7','REQUEST_ID':'request_001','GITHUB_OUTPUT':str(output)}
            result=subprocess.run([sys.executable,'-S','-c',script],env=env,capture_output=True,text=True)
            self.assertEqual(result.returncode,0,result.stderr)
            self.assertRegex(output.read_text(),r'^key=[a-f0-9]{64}\n$')
            saved=output.read_text()
            for field,value in [('PAPER_ID','1706.03762'),('PAPER_ID','../../etc/passwd'),('REQUEST_ID','x\nmalicious=value')]:
                result=subprocess.run([sys.executable,'-S','-c',script],env={**env,field:value},capture_output=True,text=True)
                self.assertNotEqual(result.returncode,0)
                self.assertEqual(output.read_text(),saved)
