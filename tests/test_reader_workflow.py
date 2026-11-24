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

    def test_model_configuration_reuses_existing_secret_and_respects_selection(self):
        from src.deep_read_config import resolve_config
        existing={'DEEPSEEK_API_KEY':'test-only','DEEPSEEK_MODEL':'deepseek-v4-pro'}
        self.assertEqual(resolve_config({**existing,'DEEP_READ_MODEL_CHOICE':'deepseek-flash'}),('test-only','deepseek-flash','https://api.deepseek.com'))
        self.assertEqual(resolve_config({**existing,'DEEP_READ_MODEL_CHOICE':'deepseek-v4-pro'})[1],'deepseek-v4-pro')
        self.assertEqual(resolve_config({'DEEPSEEK_API_KEY':'test-only'})[1],'deepseek-flash')
        with self.assertRaisesRegex(ValueError,'新服务'):
            resolve_config({**existing,'DEEP_READ_BASE_URL':'https://other.example/v1'})
        with self.assertRaisesRegex(ValueError,'官方端点'):
            resolve_config({'DEEP_READ_API_KEY':'custom','DEEP_READ_BASE_URL':'https://other.example/v1','DEEP_READ_MODEL_CHOICE':'deepseek-flash'})
        self.assertEqual(resolve_config({'DEEP_READ_API_KEY':'custom','DEEP_READ_BASE_URL':'https://other.example/v1','DEEP_READ_MODEL':'custom-model'})[1],'custom-model')

    def test_missing_secrets_reach_actionable_runtime_failure_without_dependencies(self):
        workflow=yaml.safe_load((ROOT/'.github/workflows/deep-read.yml').read_text())
        events=workflow.get('on',workflow.get(True))
        self.assertTrue(all(not item.get('required') for item in events['workflow_call']['secrets'].values()))
        with tempfile.TemporaryDirectory() as folder:
            env={k:v for k,v in os.environ.items() if not k.startswith(('DEEP_READ_','DEEPSEEK_'))}
            env.update(RUNNER_TEMP=folder,GITHUB_STEP_SUMMARY=str(Path(folder)/'summary'),PAPER_ID='1706.03762v7',REQUEST_ID='request_001')
            result=subprocess.run([sys.executable,'-S',str(ROOT/'src/deep_read_config.py')],env=env,capture_output=True,text=True)
            self.assertNotEqual(result.returncode,0)
            import json
            status=json.loads((Path(folder)/'deep-read-output/status.json').read_text())
            self.assertEqual(status['stage'],'configuration')
            self.assertIn('New repository secret',status['error'])
            self.assertIn('DEEPSEEK_API_KEY',(Path(folder)/'summary').read_text())
