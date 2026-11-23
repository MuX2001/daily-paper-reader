import type {Paper,PaperState} from './domain';
export interface MigrationRow {paper_key:string;read_at:string;starred:boolean;dismissed_at:string|null;feedback:number;legacy_status:string;legacy_imported_at:string}
export function planMigration(raw:unknown,papers:Paper[],states:Record<string,PaperState>,now:string){
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('旧记录必须是 ID 到状态的对象');
  const aliases=new Map<string,Set<string>>();
  for(const paper of papers)for(const key of [paper.paper_key,paper.original_id,...(paper.legacy_routes||[])]){
    if(!aliases.has(key))aliases.set(key,new Set());aliases.get(key)!.add(paper.paper_key);
  }
  const conflicts=new Set<string>();const rows=new Map<string,MigrationRow>();const skipped:{id:string;reason:string}[]=[];
  for(const [id,value] of Object.entries(raw)){
    const status=value===true?'read':value;
    if(typeof status!=='string'||!['read','good','blue','orange','bad'].includes(status)){skipped.push({id,reason:'不支持的旧状态'});continue;}
    const keys=aliases.get(id);
    if(!keys||keys.size!==1){skipped.push({id,reason:keys?'版本或来源存在歧义':'当前目录中缺少精确版本'});continue;}
    const paper_key=[...keys][0];
    if(states[paper_key]){skipped.push({id,reason:'云端已有状态，保持原样'});continue;}
    if(conflicts.has(paper_key)){skipped.push({id,reason:'同篇旧别名状态冲突'});continue;}
    const previous=rows.get(paper_key);
    if(previous&&previous.legacy_status!==status){skipped.push({id,reason:'同篇旧别名状态冲突'});rows.delete(paper_key);conflicts.add(paper_key);continue;}
    rows.set(paper_key,{paper_key,read_at:now,starred:status==='good',dismissed_at:status==='bad'?now:null,feedback:0,legacy_status:status,legacy_imported_at:now});
  }
  return {rows:[...rows.values()],skipped};
}
