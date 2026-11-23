"""Build a public reader catalog offline; never call a model or paper service."""
from pathlib import Path
import argparse
import json
import re
from triage_export import export_feed, project_paper
from triage_enrich import atomic_json


def local_route(root, route):
    if not isinstance(route,str) or not route or '\\' in route or route.startswith('/'):
        return None
    if any(part in ('..','.') for part in route.split('/')):return None
    path=(root/'docs'/route).resolve()
    return route if path.is_relative_to((root/'docs').resolve()) else None


def reading_index(root):
    index={}
    for state_path in (root/'docs').glob('*/_daily_state.json'):
        state=json.loads(state_path.read_text())
        meta_path=state_path.parent/'papers.meta.json'
        metadata=json.loads(meta_path.read_text()) if meta_path.exists() else {}
        by_route={p.get('paper_id'):p for p in metadata.get('papers',[])}
        for item in state.get('papers',[]):
            pid=item.get('paper_id');route=local_route(root,item.get('route'))
            if not pid or not route:continue
            meta=by_route.get(route,{})
            # The state ID retains the version; never match by title or strip vN.
            record={'route':route,'title_zh':meta.get('title_zh') or meta.get('zh_title')}
            path=root/'docs'/(route+'.txt')
            if path.exists():
                text=path.read_text(errors='replace')
                if len(text)>4000 and re.search(r'\b(references|bibliography)\b',text,re.I):
                    record['fulltext_path']='./docs/'+route+'.txt'
            index.setdefault(str(pid),[]).append(record)
    return index



def topic_catalog(root, destination):
    entries=[]
    for state_path in sorted((root/'docs/starter-pack').glob('*/task-state.json')):
        state=json.loads(state_path.read_text());manifest=state.get('manifest',{});selection=state.get('selection',{})
        run_id=state_path.parent.name
        if not re.fullmatch(r'\d{8}-[a-f0-9]{12}',run_id) or not selection.get('selection_complete'):continue
        selected=selection.get('papers',[])
        if len(selected)>100:raise ValueError('Topic selection exceeds fixed final-list budget')
        records=[]
        for original in selected:
            raw=dict(original)
            raw['llm_score']=raw.get('score')
            raw['llm_evidence']=raw.get('reason') or raw.get('evidence')
            raw['llm_tldr']=raw.get('tldr')
            raw['title_cn']=raw.get('zh_title') or raw.get('title_zh')
            raw['source']=raw.get('source') or raw.get('retrieval_source')
            raw['link']=raw.get('link') or raw.get('url') or raw.get('official_url')
            record=project_paper(raw)
            record['work_id']=original.get('canonical_id') or original.get('id')
            records.append(record)
        guide_path=state_path.parent/'guide.json'
        guide=json.loads(guide_path.read_text()) if guide_path.exists() else None
        if guide:
            from starter_pack_guide import validate_guide
            guide=validate_guide(guide,selected)
        title=str(manifest.get('profile',{}).get('tag') or run_id)
        path='topics/'+run_id+'.json'
        atomic_json(destination/path,{'schema_version':1,'run_id':run_id,'papers':records,'topic':{'title':title,'mode':manifest.get('mode'),'status':manifest.get('status'),'windows':manifest.get('windows',{}),'description':manifest.get('profile',{}).get('description',''),'guide':guide}})
        entries.append({'run_id':run_id,'title':title,'count':len(records),'path':path,'kind':'topic'})
    return entries

def build_catalog(root: Path, destination: Path):
    entries={}
    for folder in sorted((root/'archive').glob('*/recommend')):
        run_id=folder.parent.name
        if not re.fullmatch(r'\d{8}(?:-\d{8})?',run_id):continue
        inputs=sorted(folder.glob('*.standard.json')) or sorted(folder.glob('*.skims.json'))
        for source in inputs:export_feed(source,destination/'daily'/f'{run_id}.json',run_id)
    routes=reading_index(root)
    # Include published feeds even if their retrieval cache/archive was evicted.
    for output in sorted((destination/'daily').glob('*.json')):
        feed=json.loads(output.read_text());run_id=feed['run_id']
        if feed.get('schema_version')!=1:raise ValueError('Unsupported reader feed')
        for paper in feed['papers']:
            matches=routes.get(paper['original_id'],[])
            if matches:
                match=next((r for r in matches if r.get('fulltext_path')),matches[0])
                paper['reading_path']='./legacy.html#/'+match['route']
                paper['legacy_routes']=[r['route'] for r in matches]
                paper['fulltext_path']=match.get('fulltext_path')
                if not paper.get('title_zh'):paper['title_zh']=match.get('title_zh')
        atomic_json(output,feed)
        if feed['papers']:entries[run_id]={'run_id':run_id,'count':len(feed['papers']),'path':f'daily/{run_id}.json'}
    records=sorted(entries.values(),key=lambda e:e['run_id'],reverse=True)
    atomic_json(destination/'catalog.json',{'schema_version':1,'runs':records,'topics':topic_catalog(root,destination)})
    return records


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[1])
    parser.add_argument('--output',type=Path,required=True)
    args=parser.parse_args();entries=build_catalog(args.root,args.output)
    print(f'Exported {len(entries)} recommendation runs')
