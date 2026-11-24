export interface MinMaxClaim {text:string|null;quote:string|null;source_id:string|null}
export interface ReadableCard {tldr:string;problem_delta:string;method_steps:string[];evidence:string;caveats:string;where_to_look:string;tags:string[]}
export interface MinMax {readable?:ReadableCard;format?:string;status:string;reason?:string;input_scope?:string;source?:{source_url:string;format:string};excerpts?:{id:string;start:number;end:number;text:string}[];delta?:MinMaxClaim;steps?:MinMaxClaim;evidence?:MinMaxClaim;constraints?:MinMaxClaim;landmarks?:MinMaxClaim}
export interface Paper {
  minmax?:MinMax; minmax_candidate?:MinMax;
  venue?: string | null;
  publication_date?: string | null; publication_date_precision?: string | null;
  work_id?: string; fulltext_path?: string; reading_path?: string; legacy_routes?: string[];
  paper_key: string; original_id: string; canonical_id: string; source: string; version: number | null;
  title: string; title_zh: string | null; abstract: string | null; authors: string[]; published: string | null;
  url: string | null; pdf_url: string | null; score: number | null; reason: string | null; tldr: string | null;
  tags: string[]; breakdown: {problem: string | null; method: string | null; results: string | null};
  thumbnail: {url: string; kind: string; evidence?:string} | null; code_url: string | null; content_status: string;
}
export interface PaperState { note_text?: string; legacy_status?: string; legacy_imported_at?: string; paper_key: string; starred: boolean; read_at: string | null; dismissed_at: string | null; feedback: number; revision: number }
export type StatePatch = Partial<Pick<PaperState, 'starred' | 'read_at' | 'dismissed_at' | 'feedback' | 'note_text'>>;
export type View = 'inbox' | 'starred' | 'topics' | 'archive' | 'manage';
export interface Feed { schema_version: number; run_id: string; papers: Paper[] }
export interface CatalogEntry {run_id:string;count:number;path:string;title?:string;kind?:string}
export interface Catalog { schema_version: number; runs: CatalogEntry[]; topics?:CatalogEntry[]; conferences?:CatalogEntry[]; migration?:{unresolved_conference_routes?:string[]} }
export const emptyState = (key: string): PaperState => ({paper_key:key, starred:false, read_at:null, dismissed_at:null, feedback:0, revision:0});
export function safeURL(value: string | null | undefined): string | undefined {
  if (!value) return;
  try { const url = new URL(value); if (['https:', 'http:'].includes(url.protocol) && !url.username && !url.password) return url.href; } catch { /* missing URL */ }
}
export function filterPapers(papers: Paper[], states: Record<string, PaperState>, view: View, query: string) {
  const q = query.trim().toLowerCase();
  return papers.filter(p => {
    const s = states[p.paper_key] || emptyState(p.paper_key);
    const included = view === 'starred' ? s.starred && !s.dismissed_at : view === 'archive' ? !!s.dismissed_at : !s.dismissed_at;
    return included && (!q || [p.title,p.title_zh,p.abstract,...p.tags].filter(Boolean).join(' ').toLowerCase().includes(q));
  });
}
export function editableTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && !!target.closest('input,textarea,select,[contenteditable="true"],[role="textbox"]');
}
export function thumbnailURL(value: string | undefined): string | undefined {
  if(value && /^\.\/docs\/data\/previews\/[a-f0-9]{24}\.webp$/.test(value))return value;
  return safeURL(value);
}

export function mergeLibrary(feeds: Feed[]): Paper[] {
  const records=new Map<string,Paper>();
  for(const feed of feeds)for(const p of feed.papers){
    const old=records.get(p.paper_key);
    if(!old){records.set(p.paper_key,p);continue;}
    const preferred=(p.score??-1)>(old.score??-1)?p:old;
    records.set(p.paper_key,{...preferred,tags:[...new Set([...old.tags,...p.tags])],
      minmax_candidate:p.minmax_candidate||old.minmax_candidate,minmax:p.minmax?.status==='ready'?p.minmax:old.minmax||p.minmax,fulltext_path:old.fulltext_path||p.fulltext_path,legacy_routes:[...new Set([...(old.legacy_routes||[]),...(p.legacy_routes||[])])]});
  }
  return [...records.values()].sort((a,b)=>(b.score??-1)-(a.score??-1)||a.paper_key.localeCompare(b.paper_key));
}
