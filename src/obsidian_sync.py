"""Publish generated notes to an explicitly configured private GitHub vault repo."""
from __future__ import annotations
import argparse
import base64
import hashlib
import os
from pathlib import Path, PurePosixPath
import re
from urllib.parse import quote
import requests

MARKER=re.compile(r'<!-- DPR:GENERATED-END sha256=([a-f0-9]{64}) -->')


def managed_note(generated, user_notes='\n\n## 我的笔记\n\n'):
    return generated+f'<!-- DPR:GENERATED-END sha256={hashlib.sha256(generated.encode()).hexdigest()} -->'+user_notes


def merge_note(existing, new):
    old_marker=MARKER.search(existing);new_marker=MARKER.search(new)
    if not old_marker or not new_marker: raise ValueError('Existing note has no managed boundary; refusing to overwrite')
    generated=existing[:old_marker.start()]
    if hashlib.sha256(generated.encode()).hexdigest()!=old_marker.group(1):
        raise ValueError('Generated section was edited locally; resolve the conflict before syncing')
    return new[:new_marker.end()]+existing[old_marker.end():]


def sync_note(note_path,repository,branch,folder,token,session=requests):
    if not re.fullmatch(r'[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+',repository): raise ValueError('Invalid notes repository')
    path=PurePosixPath(folder)
    if path.is_absolute() or '..' in path.parts or not folder.strip():raise ValueError('Invalid notes folder')
    if not token or not branch:raise ValueError('Notes token and branch are required')
    headers={'Authorization':f'Bearer {token}','Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'}
    base=f'https://api.github.com/repos/{repository}'
    repo=session.get(base,headers=headers,timeout=30);repo.raise_for_status()
    if not repo.json().get('private'):raise ValueError('Automatic notes sync requires a private repository')
    note_path=Path(note_path);note=note_path.read_text()
    if not MARKER.search(note):raise ValueError('Note lacks generated-content boundary')
    dest=str(path/note_path.name);url=base+'/contents/'+quote(dest,safe='/')
    current=session.get(url,params={'ref':branch},headers=headers,timeout=30)
    sha=None
    if current.status_code!=404:
        current.raise_for_status();data=current.json();sha=data['sha']
        if data.get('encoding')!='base64':raise ValueError('Unsupported existing note encoding')
        existing=base64.b64decode(data['content']).decode()
        note=merge_note(existing,note)
        if note==existing:return {'status':'unchanged','path':dest}
    payload={'message':f'Update generated paper note {note_path.stem}\n\nCo-Authored-By: xixi <3495302215@qq.com>', 'content':base64.b64encode(note.encode()).decode(),'branch':branch}
    if sha:payload['sha']=sha
    response=session.put(url,headers=headers,json=payload,timeout=30);response.raise_for_status()
    return {'status':'synced','path':dest,'commit':response.json().get('commit',{}).get('sha')}


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--note',required=True);args=parser.parse_args()
    result=sync_note(args.note,os.environ.get('OBSIDIAN_NOTES_REPO',''),os.environ.get('OBSIDIAN_NOTES_BRANCH','main'),os.environ.get('OBSIDIAN_NOTES_FOLDER','Inbox'),os.environ.get('OBSIDIAN_NOTES_TOKEN',''))
    print(result)
