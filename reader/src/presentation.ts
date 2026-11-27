import {t as uiText} from './i18n/messages.ts';
import type {Paper,CatalogEntry} from './domain.ts';
export function displayTitle(value:string){return value.replace(/--+/g,'–').replace(/([A-Za-z0-9])([\p{Script=Han}])/gu,'$1 $2').replace(/([\p{Script=Han}])([A-Za-z0-9])/gu,'$1 $2').replace(/\s+/g,' ').trim()}
export const cardHook=(paper:Paper)=>paper.narrative?.card_hook||paper.partial_narrative?.card_hook||paper.tldr||'';
export function runLabel(run:CatalogEntry){const title=run.title||run.run_id;const chars=Array.from(title);return uiText("{0} · {1} 篇", chars.length>20?chars.slice(0,19).join('')+'…':title, run.count)}
export const sameText=(a:string|null|undefined,b:string|null|undefined)=>!!a&&!!b&&a.replace(/\s/g,'')===b.replace(/\s/g,'');

export function displayTags(paper:Paper) {
  const tags=new Map<string,string>();
  for(const raw of paper.narrative?.tags?.length?paper.narrative.tags:paper.tags||[]){
    const label=raw.trim().replace(/^(?:(?:keyword|query|topic):\s*)+/i,'').trim();
    if(label&&!tags.has(label.toLowerCase()))tags.set(label.toLowerCase(),label);
    if(tags.size===4)break;
  }
  return [...tags.values()];
}
