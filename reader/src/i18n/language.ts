export type Language='zh'|'en';
let sessionChoice:Language|undefined;
export function language():Language {
  if(typeof window==='undefined')return 'zh';
  try {
    const saved=localStorage.getItem('ui_lang');
    if(saved==='zh'||saved==='en')return saved;
  } catch { /* Browser storage may be disabled. */ }
  return sessionChoice??(navigator.language.toLowerCase().startsWith('zh')?'zh':'en');
}
export function setLanguage(value:Language){
  sessionChoice=value;
  try{localStorage.setItem('ui_lang',value);}catch{/* The choice still lasts for this page. */}
  window.dispatchEvent(new Event('reader-language'));
}
