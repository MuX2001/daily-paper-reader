import {useSyncExternalStore} from 'react';
import {language,setLanguage} from './language';
function subscribe(fn:()=>void){window.addEventListener('reader-language',fn);window.addEventListener('storage',fn);return ()=>{window.removeEventListener('reader-language',fn);window.removeEventListener('storage',fn);};}
export function useLanguage(){return useSyncExternalStore(subscribe,language);}
export function LanguageSwitch(){
 const current=useLanguage();
 return <span className="language-switch" aria-label="Language">{(['zh','en'] as const).map(id=><button key={id} lang={id} aria-pressed={current===id} onClick={()=>setLanguage(id)}>{id==='zh'?'中':'EN'}</button>)}</span>;
}
