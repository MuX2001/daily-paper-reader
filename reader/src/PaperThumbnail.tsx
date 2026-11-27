import {t as uiText} from './i18n/messages.ts';
import {useRef,useState} from 'react';
import {safeURL,thumbnailURL,type Paper} from './domain';
export function PaperThumbnail({thumbnail}:{thumbnail:Paper['thumbnail']}){
 const [failedURL,setFailedURL]=useState<string|null>(null);
 const dialog=useRef<HTMLDialogElement>(null);
 const [opened,setOpened]=useState(false);
 const [largeFailed,setLargeFailed]=useState(false);
 if(!thumbnail)return null;
 const url=thumbnailURL(thumbnail.url);if(!url)return null;
 const label=thumbnail.kind==='figure1'?'Figure 1':thumbnail.kind==='first_page'?uiText("PDF 首页"):uiText("论文配图");
 const failed=failedURL===url;
 const original=thumbnail.kind==='figure1'&&safeURL(thumbnail.source_url);
 return <div className="paper-thumbnail">
   <button className="figure-trigger" title={thumbnail.evidence||label} disabled={failed} onClick={()=>{setOpened(true);dialog.current?.showModal();}}>
     {failed?<span className="thumbnail-unavailable">{uiText("预览不可用")}</span>:<img className="thumbnail" src={url} alt={label} onError={()=>setFailedURL(url)}/>}
     <span className="thumbnail-label">{label}</span>
   </button>
   <dialog ref={dialog} className="figure-lightbox" aria-label={label} onClick={e=>{if(e.target===e.currentTarget)dialog.current?.close();}}>
     <button autoFocus aria-label={uiText('关闭')} onClick={()=>dialog.current?.close()}>× <kbd>Esc</kbd></button>
     {opened&&<img src={original&&!largeFailed?original:url} alt={label} onError={()=>setLargeFailed(true)}/>}
   </dialog>
 </div>;
}
