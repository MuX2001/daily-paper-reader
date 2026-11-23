import { cp, mkdir, access } from 'node:fs/promises';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
const out = process.env.DPR_WEB_OUTPUT_DIR || resolve(homedir(), 'workspace/runs/daily-paper-reader/web-build');
await mkdir(out, {recursive:true});
for (const item of ['legacy.html','app','docs','.nojekyll']) {
  await cp(item, resolve(out,item), {recursive:true});
}
for (const item of ['config.yaml', 'secret.private', 'CNAME']) {
  try { await access(item); } catch { continue; }
  await cp(item, resolve(out,item));
}
execFileSync(process.env.PYTHON || 'python3', ['src/reader_catalog.py','--output',resolve(out,'docs/data')], {stdio:'inherit'});
