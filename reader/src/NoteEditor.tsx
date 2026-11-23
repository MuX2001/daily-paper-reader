export interface NoteDraft {text:string;base:string}
export function NoteEditor({saved,draft,edit,discard,save,busy,loggedIn}:{saved:string;draft?:NoteDraft;edit:(draft:NoteDraft)=>void;discard:()=>void;save:()=>void;busy:boolean;loggedIn:boolean}){
 const text=draft?.text??saved;
 const conflict=!!draft&&draft.base!==saved&&draft.text!==saved;
 const dirty=text!==saved;
 return <section className="note-editor"><h3>个人阅读笔记</h3><p className="muted">{loggedIn?'仅当前账户可见，保存后跨设备同步。':'访客草稿仅保留在当前页面；登录会跳转，请先下载，登录后再导入内容。'} 切换论文保留草稿，关闭页面前请保存或下载。</p><textarea aria-label="个人阅读笔记" value={text} maxLength={50000} rows={7} onChange={e=>edit({text:e.target.value,base:draft?.base??saved})}/>{conflict&&<div role="alert"><p>云端笔记已变更。草稿仍保留，请比较后选择；不会自动覆盖。</p><details><summary>查看云端内容</summary><pre>{saved||'（空笔记）'}</pre></details><button onClick={()=>edit({text,base:saved})}>保留草稿并准备替换云端</button></div>}<div className="note-controls"><button disabled={busy||!dirty||conflict} onClick={save}>{loggedIn?'保存笔记':'下载草稿并前往登录'}</button>{draft&&<button disabled={busy} onClick={discard}>采用云端内容</button>}<span role="status">{dirty?'草稿未保存':'与云端一致'} · {text.length}/50000</span></div></section>;
}
