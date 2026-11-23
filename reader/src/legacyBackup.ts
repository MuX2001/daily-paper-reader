/** Parse an explicitly selected backup; never fetch the legacy public table. */
export function legacyBackup(raw:unknown,owner=''){
 if(!raw||typeof raw!=='object')throw new Error('备份必须是旧状态对象或 user_read_state 导出数组');
 if(!Array.isArray(raw))return {states:raw as Record<string,unknown>,owners:[] as string[],conflicts:[] as string[]};
 if(raw.some(row=>!row||typeof row!=='object'||typeof row.github_username!=='string'||!row.github_username.trim()||typeof row.paper_id!=='string'||!row.paper_id||typeof row.status!=='string'))throw new Error('云端备份每行必须包含 github_username、paper_id、status');
 const owners=[...new Set(raw.map(row=>row.github_username as string))].sort();
 if(!owner)return {states:{},owners,conflicts:[] as string[]};
 if(!owners.includes(owner))throw new Error('所选用户名不在此备份中');
 const states:Record<string,unknown>=Object.create(null),conflicts=new Set<string>();
 for(const row of raw.filter(row=>row.github_username===owner)){
  if(conflicts.has(row.paper_id))continue;
  if(Object.hasOwn(states,row.paper_id)&&states[row.paper_id]!==row.status){
   delete states[row.paper_id];conflicts.add(row.paper_id);
  }else states[row.paper_id]=row.status;
 }
 return {states,owners,conflicts:[...conflicts]};
}
