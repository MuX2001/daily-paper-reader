import {useState} from 'react';
export function SecretField({label,value,onChange}:{label:string;value:string;onChange:(v:string)=>void}){
 const [show,setShow]=useState(false);
 return <label>{label}<span className="settings-secret"><input aria-label={label} type={show?'text':'password'} autoComplete="off" value={value} onChange={e=>onChange(e.target.value)}/><button type="button" aria-label={`${show?'隐藏':'显示'}${label}`} aria-pressed={show} onClick={()=>setShow(!show)}><svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>{show&&<path d="m3 3 18 18"/>}</svg>{show?'隐藏':'显示'}</button></span></label>;
}
