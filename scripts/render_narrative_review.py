"""Render already-generated sample JSON as a local review artifact, never a feed."""
import argparse
import html
import json
from pathlib import Path


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--input',type=Path,required=True);parser.add_argument('--output',type=Path,required=True);args=parser.parse_args()
    args.output.mkdir(parents=True,exist_ok=True);cards=[];bundle=[]
    esc=lambda s:html.escape(str(s or '未说明'))
    fields={'delta':'解决什么问题','steps':'具体怎么做','evidence':'实验结果','constraints':'局限和成本','landmarks':'相关图表'}
    for path in sorted(args.input.glob('*-new.json')):
        new=json.loads(path.read_text());old=json.loads(path.with_name(path.name.replace('-new.json','-old.json')).read_text());n=new['narrative']
        body=n['context_and_problem']+''.join(n['core_approach'])+n['results_and_reality_check'];bundle.append({'arxiv_id':new['original_id'],'title':new['title'],'body_characters':len(body),'old':{'card_hook':old.get('tldr'),'minmax':{k:old.get('minmax',{}).get(k,{}).get('text') for k in fields}},'new':n})
        name=path.name.replace('-new.json','.json');(args.output/name).write_text(json.dumps(n,ensure_ascii=False,indent=2)+'\n')
        before='<h3>列表简介</h3><p>'+esc(old.get('tldr'))+'</p>'+''.join('<h3>'+label+'</h3><p>'+esc(old.get('minmax',{}).get(k,{}).get('text'))+'</p>' for k,label in fields.items())
        after='<h3>列表简介</h3><p>'+esc(n['card_hook'])+'</p><h3>背景与问题</h3><p>'+esc(n['context_and_problem'])+'</p><h3>核心做法与直觉</h3><ol>'+''.join('<li>'+esc(x)+'</li>' for x in n['core_approach'])+'</ol><h3>实验结果与局限</h3><p>'+esc(n['results_and_reality_check'])+'</p>'
        cards.append('<article><h2>'+esc(new['title'])+'</h2><p class="meta">'+esc(new['original_id'])+' · 正文 '+str(len(body))+' 字符 · '+esc(new.get('narrative_provenance',{}).get('model'))+'</p><div class="columns"><section><h2>旧版</h2>'+before+'</section><section><h2>新版候选</h2>'+after+'</section></div><details><summary>查看原始 JSON</summary><pre>'+esc(json.dumps(n,ensure_ascii=False,indent=2))+'</pre><a href="'+esc(name)+'" download>下载这篇 JSON</a></details></article>')
    if len(cards)!=3:raise ValueError('Three successful sample files are required for this review')
    (args.output/'comparison.json').write_text(json.dumps(bundle,ensure_ascii=False,indent=2)+'\n')
    (args.output/'index.html').write_text('''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>三篇总结对照</title><style>body{font:16px/1.85 system-ui,sans-serif;background:#f5f7f5;color:#284b3b;max-width:1320px;margin:32px auto;padding:0 20px}a{color:#285e45}h1{font-size:26px}h2{font-size:21px;line-height:1.5}h3{font-size:16px;margin-top:24px}article{background:white;border:1px solid #dce5de;border-radius:12px;padding:24px;margin:28px 0}.meta{font-size:13px;color:#6a7e70}.columns{display:grid;grid-template-columns:1fr 1fr;gap:32px}.columns section+section{border-left:1px solid #dce5de;padding-left:32px}p,li{white-space:pre-wrap;overflow-wrap:anywhere}li+li{margin-top:16px}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#f3f6f3;padding:20px;font-size:13px}details{margin-top:24px}summary{cursor:pointer}@media(max-width:720px){.columns{grid-template-columns:1fr;gap:20px}.columns section+section{border-left:0;border-top:1px solid #dce5de;padding:20px 0 0}body{padding:0 12px}article{padding:16px}}</style><h1>三篇总结对照</h1><p>这是实际模型输出的独立验收页，未替换工作台里的旧总结。下方保留完整原始 JSON。</p><p><a href="../">返回工作台</a> · <a href="comparison.json" download>下载全部新旧 JSON</a></p>'''+''.join(cards)+'</html>')

if __name__=='__main__':main()
