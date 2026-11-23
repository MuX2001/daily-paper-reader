/** Stop queued work when its account/project is no longer active. In-flight
 * writes may finish on the original account, but never update the new view. */
export async function scopedBatch<T,R>(items:T[],active:()=>boolean,write:(item:T)=>Promise<R>,accept:(result:R)=>void) {
  let completed=0;
  for(const item of items){
    if(!active())return {completed,stopped:true};
    const result=await write(item);
    completed++;
    if(!active())return {completed,stopped:true};
    accept(result);
  }
  return {completed,stopped:false};
}
