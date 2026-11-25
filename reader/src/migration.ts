import {t as uiText} from './i18n/messages.ts';
import {getClient} from './api';
import type {MigrationRow} from './migrationPlan';
export async function importMigration(userId:string,rows:MigrationRow[]){
  const client=getClient();if(!client)throw new Error(uiText("尚未配置云端账户"));
  let imported=0;
  for(let i=0;i<rows.length;i+=50){
    if(getClient()!==client)throw new Error(uiText("云端项目已切换，已导入 {0} 条，剩余迁移已停止。", imported));
    const {data,error}=await client.from('paper_states').upsert(rows.slice(i,i+50).map(row=>({...row,user_id:userId})),{onConflict:'user_id,paper_key',ignoreDuplicates:true}).select('paper_key');
    if(error)throw new Error(uiText("已导入 {0} 条，后续失败：{1}。可安全重试，不覆盖云端已有状态。", imported, error.message));
    imported+=data.length;
  }
  return imported;
}
