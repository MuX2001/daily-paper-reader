import {language} from './language.ts';
import {english} from './en.ts';
export function t(key:string,...values:unknown[]):string {
 const text=language()==='en'?english[key]??key:key==='待精读按钮'?'待精读':key;
 return text.replace(/\{(\d+)\}/g,(match,index)=>Number(index)<values.length?String(values[Number(index)]):match);
}
