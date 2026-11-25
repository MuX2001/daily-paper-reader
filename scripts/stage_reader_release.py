"""Stage a compiled reader in an existing branch-root GitHub Pages repository.
Does not change Pages configuration, commit, push or send notifications.
"""
from pathlib import Path
import argparse
import json
import os
import shutil
import subprocess
import requests


def validate_pages(repository,branch,token,session=requests):
    if branch != 'dev':
        raise ValueError('Reader release requires the dev branch')
    headers={'Authorization':f'Bearer {token}','Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'}
    base=f'https://api.github.com/repos/{repository}'
    metadata=session.get(base,headers=headers,timeout=30);metadata.raise_for_status()
    pages=session.get(base+'/pages',headers=headers,timeout=30);pages.raise_for_status();config=pages.json()
    source=config.get('source',{})
    if branch!=metadata.json()['default_branch'] or source.get('branch')!=branch or source.get('path')!='/' or config.get('build_type') not in ('legacy',None):
        raise ValueError('Reader release requires the already-configured default-branch root Pages site; no settings were changed')
    return config['html_url']


def stage(root,build):
    root=Path(root).resolve();build=Path(build).resolve()
    if not (root/'reader/index.html').is_file():raise ValueError('Canonical reader source entry is missing')
    if not (build/'index.html').is_file() or not (build/'app/reader-assets').is_dir():raise ValueError('Compiled reader bundle is missing')
    if root==build or root in build.parents:raise ValueError('Build output must be outside the source checkout')
    shutil.copy2(build/'index.html',root/'index.html')
    # Keep prior asset hashes for clients with an older cached HTML entry.
    shutil.copytree(build/'app/reader-assets',root/'app/reader-assets',dirs_exist_ok=True)
    if (build/'docs/data').is_dir():shutil.copytree(build/'docs/data',root/'docs/data',dirs_exist_ok=True)
    (root/'docs/data/release.json').write_text(json.dumps({'source_sha':subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip(),'compiled':True})+'\n')


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--build',type=Path,required=True);args=parser.parse_args()
    repo=os.environ['GITHUB_REPOSITORY'];branch=os.environ['GITHUB_REF_NAME']
    if repo=='ziwenhahaha/daily-paper-reader':raise ValueError('Do not publish personalized data in the upstream repository')
    url=validate_pages(repo,branch,os.environ['GITHUB_TOKEN']);stage(Path(__file__).resolve().parents[1],args.build)
    with open(os.environ['GITHUB_OUTPUT'],'a') as output:output.write('site_url='+url+'\n')
