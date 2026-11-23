"""Optional bounded preview extraction for selected exact-version arXiv papers."""
from __future__ import annotations
import argparse
import hashlib
import io
import json
from pathlib import Path
import re
from urllib.parse import urljoin

from reader_fulltext import download, validate_id
from triage_enrich import atomic_json


def write_webp(image, output):
    from PIL import Image
    image=image.convert('RGB')
    image.thumbnail((640,480),Image.Resampling.LANCZOS)
    output=Path(output);output.parent.mkdir(parents=True,exist_ok=True)
    data=io.BytesIO()
    for quality in (75,55,35):
        data.seek(0);data.truncate()
        image.save(data,format='WEBP',quality=quality)
        if data.tell()<=160_000:break
    if data.tell()>160_000:raise ValueError('Preview exceeds size budget')
    temporary=output.with_suffix('.pending');temporary.write_bytes(data.getvalue());temporary.replace(output)


def preview(paper_id, output, downloader=download):
    from PIL import Image
    validate_id(paper_id)
    errors=[]
    try:
        from bs4 import BeautifulSoup
        url=f'https://arxiv.org/html/{paper_id}'
        soup=BeautifulSoup(downloader(url,limit=12_000_000),'html.parser')
        for figure in soup.find_all('figure'):
            caption=figure.find('figcaption')
            if not caption or not re.match(r'\s*Figure\s+1\s*[:.\s]',caption.get_text(' ',strip=True),re.I):continue
            img=figure.find('img',src=True)
            if not img:continue
            image_url=urljoin(url,img['src'])
            if not image_url.startswith(url+'/'):raise ValueError('Figure asset is outside the exact-version HTML directory')
            raw=downloader(image_url,limit=8_000_000)
            with Image.open(io.BytesIO(raw)) as image:
                if image.width*image.height>30_000_000:raise ValueError('Figure dimensions exceed budget')
                write_webp(image,output)
            return {'kind':'figure1','evidence':caption.get_text(' ',strip=True),'source_url':image_url}
        errors.append('Figure 1 unavailable in official HTML')
    except Exception as exc:
        errors.append(str(exc))
    import fitz
    pdf_url=f'https://arxiv.org/pdf/{paper_id}'
    raw=downloader(pdf_url)
    if not raw.lstrip().startswith(b'%PDF-'):raise ValueError('Preview download is not a PDF')
    with fitz.open(stream=raw,filetype='pdf') as document:
        if not document.page_count:raise ValueError('Empty PDF')
        page=document[0]
        scale=min(1.0,640/max(page.rect.width,page.rect.height))
        pix=page.get_pixmap(matrix=fitz.Matrix(scale,scale),alpha=False)
        write_webp(Image.frombytes('RGB',(pix.width,pix.height),pix.samples),output)
    return {'kind':'first_page','evidence':'Official PDF page 1 (not Figure 1)','source_url':pdf_url,'figure_fallback_reason':'; '.join(errors)}


def enrich_previews(feed_path, output_dir):
    feed_path=Path(feed_path);data=json.loads(feed_path.read_text());output_dir=Path(output_dir)
    for paper in data['papers']:
        if paper.get('source')!='arxiv':continue
        paper_id=paper['original_id'];key=hashlib.sha256(paper_id.encode()).hexdigest()[:24]
        image=output_dir/(key+'.webp');meta=output_dir/(key+'.json')
        try:
            if meta.exists() and image.exists():result=json.loads(meta.read_text())
            else:
                result=preview(paper_id,image)
                atomic_json(meta,result)
            paper['thumbnail']={**result,'url':f'./docs/data/previews/{key}.webp'}
            paper.pop('thumbnail_error',None)
        except Exception as exc:
            paper['thumbnail']=None;paper['thumbnail_error']=str(exc)
        atomic_json(feed_path,data)
    return data


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--feed',required=True);parser.add_argument('--output-dir',required=True)
    args=parser.parse_args();enrich_previews(args.feed,args.output_dir)
