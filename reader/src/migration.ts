import {getClient} from './api';
import type {MigrationRow} from './migrationPlan';
export async function importMigration(userId:string,rows:MigrationRow[]){
  const client=getClient();if(!client)throw new Error('尚未配置云端账户');
  let imported=0;
  for(let i=0;i<rows.length;i+=50){
    const {data,error}=await client.from('paper_states').upsert(rows.slice(i,i+50).map(row=>({...row,user_id:userId})),{onConflict:'user_id,paper_key',ignoreDuplicates:true}).select('paper_key');
    if(error)throw new Error(`已导入 ${imported} 条，后续失败：${error.message}。可安全重试，不覆盖云端已有状态。`);
    imported+=data.length;
  }
  return imported;
}
