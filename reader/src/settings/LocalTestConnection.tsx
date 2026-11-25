import {t as uiText} from '../i18n/messages.ts';
import {useEffect,useState} from 'react';
export function LocalTestConnection({connect}:{connect:(url:string,key:string)=>void}){
 const [config,setConfig]=useState<{url:string;key:string}|null>(null);
 useEffect(()=>{if(!['localhost','127.0.0.1','[::1]'].includes(location.hostname))return;
 const controller=new AbortController();fetch('./local-reader-config.json',{cache:'no-store',signal:controller.signal}).then(r=>r.ok?r.json():null).then(data=>{if(data&&['localhost','127.0.0.1','[::1]'].includes(new URL(data.url).hostname)&&typeof data.key==='string')setConfig(data);}).catch(()=>{});return()=>controller.abort();},[]);
 return <details className="settings-card"><summary>{uiText("开发者选项")}</summary><p className="settings-warning">{uiText("本地测试库与线上不互通，切换后需要使用独立的本地账户。")}</p>{config?<button onClick={()=>connect(config.url,config.key)}>{uiText("连接本地测试库")}</button>:<p>{uiText("当前没有可用的本地测试配置。")}</p>}</details>;
}
