"""Bounded, exact-version arXiv retrieval shared by deep reading and previews."""
from __future__ import annotations
import hashlib
import re
from pathlib import Path
from urllib.parse import urlsplit
import requests
from triage_enrich import atomic_json

from reader_identity import ARXIV_VERSION, validate_id


def download(url, limit=40_000_000, session=requests):
    """No implicit redirects to unverified hosts or versions."""
    parsed=urlsplit(url)
    if parsed.scheme != 'https' or parsed.netloc != 'arxiv.org':
        raise ValueError('Only official arxiv.org downloads are supported')
    with session.get(url,stream=True,timeout=(15,90),allow_redirects=False) as response:
        response.raise_for_status()
        if 300 <= response.status_code < 400:
            raise ValueError('Official URL redirected; exact version requires verification')
        size=0; chunks=[]
        for chunk in response.iter_content(65536):
            size+=len(chunk)
            if size>limit: raise ValueError('Download exceeds configured size limit')
            chunks.append(chunk)
        return b''.join(chunks)


def validate_fulltext(text):
    if len(text.strip())<4000:
        raise ValueError('Full text is too short for deep reading')
    lower=text.lower()
    if any(error in lower[:1000] for error in ('access denied','has been withdrawn','captcha','service unavailable')):
        raise ValueError('Received an error page instead of a paper')
    if not re.search(r'\b(references|bibliography)\b',lower):
        raise ValueError('Full text lacks a references section; refusing incomplete deep reading')
    return text


def html_text(raw):
    from bs4 import BeautifulSoup
    soup=BeautifulSoup(raw,'html.parser')
    article=soup.select_one('article.ltx_document') or soup.find('article')
    if not article: raise ValueError('HTML does not contain an arXiv article')
    for tag in article.select('script,style,nav'): tag.decompose()
    for math in article.find_all('math'):
        tex=math.get('alttext') or math.get('alt')
        if tex: math.replace_with(f' ${tex}$ ')
    return validate_fulltext(article.get_text('\n',strip=True))


def pdf_text(raw):
    import fitz
    if not raw.lstrip().startswith(b'%PDF-'): raise ValueError('Expected a PDF document')
    with fitz.open(stream=raw,filetype='pdf') as document:
        if document.page_count>300: raise ValueError('PDF exceeds page budget')
        text='\n\n'.join(f'\n[Page {i+1}]\n'+page.get_text() for i,page in enumerate(document))
    return validate_fulltext(text)


def get_fulltext(paper_id, cache_dir, downloader=download):
    validate_id(paper_id)
    cache=Path(cache_dir)/hashlib.sha256(paper_id.encode()).hexdigest()
    meta_path=cache/'source.json'; text_path=cache/'fulltext.txt'
    if meta_path.exists() and text_path.exists():
        import json
        meta=json.loads(meta_path.read_text()); text=validate_fulltext(text_path.read_text())
        if meta.get('paper_id')==paper_id and meta.get('sha256')==hashlib.sha256(text.encode()).hexdigest():
            return text,meta
    errors=[]
    for kind,extract in [('html',html_text),('pdf',pdf_text)]:
        url=f'https://arxiv.org/{kind}/{paper_id}'
        try:
            text=extract(downloader(url))
            meta={'paper_id':paper_id,'source_url':url,'format':kind,'sha256':hashlib.sha256(text.encode()).hexdigest(),'characters':len(text)}
            cache.mkdir(parents=True,exist_ok=True)
            temp=cache/'fulltext.pending';temp.write_text(text,encoding='utf-8');temp.replace(text_path)
            atomic_json(meta_path,meta)
            return text,meta
        except (ValueError,requests.RequestException) as exc:
            errors.append(f'{kind}: {exc}')
    raise ValueError('No verified complete text: '+'; '.join(errors))
