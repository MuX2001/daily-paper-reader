import {useState} from 'react';
import {thumbnailURL,type Paper} from './domain';
export function PaperThumbnail({thumbnail}:{thumbnail:Paper['thumbnail']}){
 const [failedURL,setFailedURL]=useState<string|null>(null);
 if(!thumbnail)return null;
 const url=thumbnailURL(thumbnail.url);if(!url)return null;
 const label=thumbnail.kind==='figure1'?'Figure 1':thumbnail.kind==='first_page'?'PDF 首页':'论文配图';
 const failed=failedURL===url;
 return <span className="paper-thumbnail" title={thumbnail.evidence||label}>{failed?<span className="thumbnail-unavailable">预览不可用</span>:<img className="thumbnail" src={url} alt={label} loading="lazy" onError={()=>setFailedURL(url)}/>}<span className="thumbnail-label">{label}</span></span>;
}
