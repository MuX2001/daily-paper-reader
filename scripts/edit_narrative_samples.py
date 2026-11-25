"""One explicit Flash editing pass on existing sample drafts; never changes feeds."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import sys
import time
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'src'))
from llm import LLMClient
from minmax_narrative import SCHEMA,validate
from triage_enrich import atomic_json

PROMPT='''你是论文导读的中文编辑。下面是已抽取的草稿，不是让你重新解释论文。只能改写和删减已有事实，不能新增任何数字、动机、结论、局限或开源声明。
请把它编辑成读者一分钟能读完的版本。保留原JSON六个字段，card_hook写一句自然完整中文约60字，专用于列表。
预览正文总计550–750字符（包含字母数字和标点），不要超过750。分配：context_and_problem约120字符；core_approach恰好3段、每段约80字符；experimental_results约150字符、caveats_and_pointers约120字符。总共约650字符。删掉枝节来控制篇幅，不能删光连接词、主语或压成电报体。
背景交代具体任务和原有困难。方法只保留主流程，每段用完整句子讲动作和已有的设计原因；删掉层数/投影次数等非必要参数、型号材料名、引脚电路、有限元的中间数字。把taxel等自造/小众词写成“传感单元”等具体含义，通用技术术语可保留。
结果保留一两组最有判断价值的对照，保留实验条件和平均/RMSE等口径，不能把RNN的逐位置串行计算套到CNN上，也不能把“只用注意力替代循环和卷积”写成没有前馈层。不能把训练并行推广成推理并行，不能把某任务收益推广到所有任务。不要把“这些方法需要专门训练”泛化成所有方法相同；不要用“只有”“唯一”“全都”等无充分范围限定的绝对断言。把不必要的推断删掉。
原稿若没有明确局限，可保留“所给片段未说明”，不要补造。保留1–2个原稿已有图表路标，删掉其余编号。
只输出完整合法JSON：card_hook字符串、context_and_problem字符串、core_approach三个非空字符串的数组、experimental_results字符串、caveats_and_pointers字符串、tags数组。不要任何其他说明，也不要照抄以上占位文字。'''


def edit(value,client):
    response=client.chat_structured([{'role':'system','content':PROMPT},{'role':'user','content':json.dumps(value,ensure_ascii=False)}],schema_name='edited_narrative',schema=SCHEMA,allow_validation_fallback=False)
    if response.get('parse_error') or response.get('finish_reason')=='length' or response.get('refusal'):raise ValueError('Incomplete edited response')
    result=validate(response.get('parsed'))
    before=set(re.findall(r'\d+(?:\.\d+)?',json.dumps(value,ensure_ascii=False)))
    after=set(re.findall(r'\d+(?:\.\d+)?',json.dumps(result,ensure_ascii=False)))
    if not after.issubset(before):raise ValueError('Editor introduced numbers')
    count=len(result['context_and_problem']+''.join(result['core_approach'])+result['experimental_results']+result['caveats_and_pointers'])
    if not 550<=count<=750:raise ValueError(f'Edited length outside target: {count}')
    return result,response.get('tokens'),count


def main():
    p=argparse.ArgumentParser();p.add_argument('--draft-dirs',type=Path,nargs='+',required=True);p.add_argument('--output',type=Path,required=True);a=p.parse_args()
    drafts={}
    for directory in a.draft_dirs:
        for path in directory.rglob('*-new.json'):
            value=json.loads(path.read_text())
            if value.get('narrative'):drafts[value['original_id']]=(path,value)
    if len(drafts)!=3:raise ValueError('Expected three valid existing drafts')
    client=LLMClient(os.environ['DEEPSEEK_API_KEY'],'deepseek-flash','https://api.deepseek.com');client.max_attempts=1;client.kwargs.update(max_tokens=65536,thinking={'type':'enabled'},reasoning_effort='high')
    report=[]
    for id,(path,paper) in sorted(drafts.items()):
        item={'id':id};start=time.monotonic()
        try:
            key=hashlib.sha256(json.dumps({'draft':paper['narrative'],'prompt':PROMPT,'schema':SCHEMA,'model':client.model,'options':client.kwargs},ensure_ascii=False,sort_keys=True).encode()).hexdigest();cache=a.output/'cache'/f'{key}.json'
            if cache.exists():saved=json.loads(cache.read_text());result,tokens,count=saved['result'],saved['tokens'],saved['characters']
            else:
                result,tokens,count=edit(paper['narrative'],client);atomic_json(cache,{'result':result,'tokens':tokens,'characters':count})
            new={**paper,'narrative':result,'narrative_provenance':{**paper['narrative_provenance'],'editing_model':client.model,'editing_cache_key':key}}
            atomic_json(a.output/(id+'-new.json'),new);atomic_json(a.output/(id+'-old.json'),json.loads(path.with_name(path.name.replace('-new.json','-old.json')).read_text()))
            item.update(status='succeeded',characters=count,tokens=tokens)
            print(id,json.dumps(result,ensure_ascii=False),flush=True)
        except Exception as e:item.update(status='failed',error=str(e) if isinstance(e,ValueError) else type(e).__name__)
        item['seconds']=round(time.monotonic()-start,2);report.append(item);atomic_json(a.output/'report.json',report);print(json.dumps(item,ensure_ascii=False),flush=True)
    if any(x['status']!='succeeded' for x in report):raise SystemExit(1)

if __name__=='__main__':main()
