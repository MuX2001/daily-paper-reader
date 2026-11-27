"""Optional bounded preview extraction for selected exact-version arXiv papers."""
from __future__ import annotations
import argparse
import hashlib
import io
import json
from pathlib import Path
import re
import time
from urllib.parse import urljoin

from reader_fulltext import check_declared_version, download, validate_id
from figure_selection import figure_id
from triage_enrich import atomic_json


def write_webp(image, output):
    from PIL import Image
    image=image.convert('RGB')
    image.thumbnail((1800,1500),Image.Resampling.LANCZOS)
    output=Path(output);output.parent.mkdir(parents=True,exist_ok=True)
    data=io.BytesIO()
    for quality in (75,55,35):
        data.seek(0);data.truncate()
        image.save(data,format='WEBP',quality=quality)
        if data.tell()<=700_000:break
    if data.tell()>700_000:raise ValueError('Preview exceeds size budget')
    temporary=output.with_suffix('.pending');temporary.write_bytes(data.getvalue());temporary.replace(output)


def pdf_figure(document, target):
    import fitz
    from PIL import Image
    for page in document:
        blocks=page.get_text('blocks')
        for block in blocks:
            if figure_id(block[4])!=target or not re.match(r'^\s*(?:figure|fig\.)\s+[^\s:]+\s*[:.]',block[4],re.I):
                continue
            cap=fitz.Rect(block[:4]); mid=page.rect.width/2
            left=mid if cap.x0>mid else 16
            right=mid if cap.x1<=mid else page.rect.width-16
            top=max(25,page.rect.height*.035)
            # Stop at other captions or body paragraphs in the same column.
            for row in blocks:
                box=fitz.Rect(row[:4])
                if box.y1>cap.y0 or box.x1<left or box.x0>right:continue
                if figure_id(row[4]) or (box.width>150 and len(row[4].split())>=32):
                    top=max(top,box.y1)
            band=fitz.Rect(left,top,right,cap.y0)
            graphics=[fitz.Rect(x['bbox']) for x in page.get_image_info()]
            graphics.extend(x['rect'] for x in page.get_drawings())
            regions=[r for r in graphics if band.contains(r) and r.width+r.height>5]
            if not regions:continue
            clip=fitz.Rect(regions[0])
            for r in regions[1:]:clip.include_rect(r)
            if cap.y0-clip.y1>65 or clip.width<80 or clip.height<30:continue
            # Keep nearby text labels within the illustration.
            for row in blocks:
                box=fitz.Rect(row[:4])
                if band.contains(box) and (clip+(-10,-12,10,12)).intersects(box):clip.include_rect(box)
            clip=(clip+(-3,-3,3,3)) & band
            if clip.get_area()>page.rect.get_area()*.78:continue
            pix=page.get_pixmap(matrix=fitz.Matrix(3,3),clip=clip,alpha=False)
            return Image.frombytes('RGB',(pix.width,pix.height),pix.samples),block[4].strip(),page.number+1,list(clip)
    raise ValueError('No unambiguous graphical region next to the selected caption')


def preview(paper_id, output, target, downloader=download):
    from PIL import Image
    from bs4 import BeautifulSoup
    import fitz
    validate_id(paper_id)
    url=f'https://arxiv.org/html/{paper_id}'
    try:
        soup=BeautifulSoup(downloader(url,limit=12_000_000),'html.parser')
        for node in soup.select('link[rel="canonical"],meta[name="citation_arxiv_id"]'):
            check_declared_version(node.get('href') or node.get('content') or '',paper_id)
        for figure in soup.find_all('figure'):
            caption=figure.find('figcaption',recursive=False)
            if not caption or figure_id(caption.get_text(' ',strip=True))!=target:continue
            images=[];sources=[]
            for img in figure.select('img[src]'):
                image_url=urljoin(url,img['src'])
                if not image_url.startswith(url+'/'):raise ValueError('Image outside exact-version HTML')
                if re.search(r'(?:logo|icon|placeholder)',img['src'],re.I):continue
                with Image.open(io.BytesIO(downloader(image_url,limit=8_000_000))) as im:
                    if im.width*im.height>30_000_000:raise ValueError('Figure exceeds image budget')
                    if im.width<160 or im.height<80:continue
                    images.append(im.convert('RGB'));sources.append(image_url)
            if not images:break
            if len(images)==1:image=images[0]
            else:
                w=max(im.width for im in images);h=sum(im.height for im in images)
                if w*h>30_000_000:raise ValueError('Subfigures exceed image budget')
                image=Image.new('RGB',(w,h),'white');y=0
                for im in images:image.paste(im,(0,y));y+=im.height
            write_webp(image,output)
            return {'kind':'selected','figure_id':target,'format':'html','evidence':caption.get_text(' ',strip=True),'source_url':sources[0] if len(sources)==1 else None}
        raise ValueError('Selected figure has no usable exact-version HTML image')
    except Exception as exc:
        html_error=str(exc)
    pdf_url=f'https://arxiv.org/pdf/{paper_id}'
    raw=downloader(pdf_url)
    if not raw.lstrip().startswith(b'%PDF-'):raise ValueError('Preview download is not a PDF')
    with fitz.open(stream=raw,filetype='pdf') as document:
        if not document.page_count or document.page_count>300:raise ValueError('Unsupported page count')
        for marker in re.findall(r'arXiv:\s*((?:\d{4}\.\d{4,5}|[A-Za-z.-]+/\d{7})v[1-9]\d*)',document[0].get_text()):
            check_declared_version(marker,paper_id)
        image,caption,page,clip=pdf_figure(document,target)
        write_webp(image,output)
        return {'kind':'selected','figure_id':target,'format':'pdf','evidence':caption,'page':page,'clip':clip,'html_error':html_error}


def enrich_previews(feed_path, output_dir, *, retry_failed=False, now=None, extractor=preview):
    feed_path=Path(feed_path);data=json.loads(feed_path.read_text());output_dir=Path(output_dir)
    timestamp=time.time() if now is None else now
    for paper in data['papers']:
        if paper.get('source')!='arxiv':continue
        paper_id=paper['original_id']
        selection=(paper.get('narrative') or {}).get('selected_figure') or {}
        target=selection.get('figure_id')
        if not target:
            paper['thumbnail']=None
            paper['thumbnail_error']='No explanatory figure selected'
            paper.pop('thumbnail_retry_after',None)
            atomic_json(feed_path,data)
            continue
        key=hashlib.sha256(f'{paper_id}:{target}:semantic-v1'.encode()).hexdigest()[:24]
        image=output_dir/(key+'.webp');meta=output_dir/(key+'.json')
        cached={}
        if meta.exists():
            try:
                cached=json.loads(meta.read_text())
                if not isinstance(cached,dict) or cached.get('paper_id')!=paper_id:cached={}
            except (ValueError,OSError):pass
        retry_at=cached.get('retry_after')
        if (not retry_failed and cached.get('status')=='failed'
            and isinstance(retry_at,(int,float)) and timestamp<retry_at<=timestamp+21600):
            paper['thumbnail']=None;paper['thumbnail_error']=cached.get('error','Preview unavailable')
            paper['thumbnail_retry_after']=retry_at
            atomic_json(feed_path,data)
            continue
        try:
            reusable=False
            if cached.get('status')=='succeeded' and image.exists():
                reusable=(cached.get('image_sha256')==hashlib.sha256(image.read_bytes()).hexdigest()
                          and cached.get('kind')=='selected' and cached.get('figure_id')==target)
            if reusable:result=cached
            else:
                result=extractor(paper_id,image,target)
                checkpoint={**result,'paper_id':paper_id,'status':'succeeded',
                            'image_sha256':hashlib.sha256(image.read_bytes()).hexdigest()}
                atomic_json(meta,checkpoint)
            paper['thumbnail']={k:result[k] for k in ('kind','figure_id','format','evidence','source_url','page','clip') if k in result}
            paper['thumbnail']['url']=f'./docs/data/previews/{key}.webp'
            paper.pop('thumbnail_error',None);paper.pop('thumbnail_retry_after',None)
        except Exception as exc:
            error=str(exc);retry_at=timestamp+21600
            atomic_json(meta,{'paper_id':paper_id,'status':'failed','error':error,'retry_after':retry_at})
            paper['thumbnail']=None;paper['thumbnail_error']=f'{target}: {error}';paper['thumbnail_retry_after']=retry_at
        atomic_json(feed_path,data)
    return data


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--feed',required=True);parser.add_argument('--output-dir',required=True)
    parser.add_argument('--retry-failed',action='store_true',help='Retry failed previews before their six-hour cooldown expires')
    args=parser.parse_args();enrich_previews(args.feed,args.output_dir,retry_failed=args.retry_failed)
