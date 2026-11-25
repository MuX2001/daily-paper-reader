import {t as uiText} from './i18n/messages.ts';
export function ArchiveIcon(){return <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M4 9h16v11H4zM3 4h18v5H3zM9 13h6"/></svg>}
export function StarButton({starred,busy,compact=false,onClick}:{starred:boolean;busy:boolean;compact?:boolean;onClick:()=>void}){
 return <button className="star-button" title={starred?uiText("移出待精读 (s)"):uiText("加入待精读 (s)")} aria-label={starred?uiText("移出待精读"):uiText("加入待精读")} aria-pressed={starred} disabled={busy} onClick={onClick}><svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill={starred?'currentColor':'none'} stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z"/></svg>{!compact&&<span>{starred?uiText("已待精读"):uiText("待精读按钮")} <kbd>s</kbd></span>}</button>;
}
