import json
import hashlib
import io
from pathlib import Path
import sys
import tempfile
import unittest
from PIL import Image
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'src'))
from reader_thumbnail import preview, enrich_previews

class ReaderThumbnailTests(unittest.TestCase):
    def test_version_relative_figure_url(self):
        html=b'<article><figure><img src="1706.03762v7/Figures/model.png"><figcaption>Figure 2: Architecture</figcaption></figure></article>'
        buffer=io.BytesIO();Image.new('RGB',(600,300),'white').save(buffer,format='PNG')
        calls=[]
        def fetch(url,**kwargs):
            calls.append(url)
            return html if url.endswith('v7') else buffer.getvalue()
        with tempfile.TemporaryDirectory() as folder:
            p=Path(folder)/'preview.webp';result=preview('1706.03762v7',p,'Figure 2',fetch)
            self.assertEqual(result['kind'],'selected')
            self.assertEqual(calls[-1],'https://arxiv.org/html/1706.03762v7/Figures/model.png')
            with Image.open(p) as image:
                self.assertEqual(image.format,'WEBP')

    def test_failed_preview_backoff_expiry_and_explicit_retry(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder);feed=root/'feed.json';images=root/'images'
            feed.write_text(json.dumps({'papers':[{'source':'arxiv','original_id':'1706.03762v7','narrative':{'selected_figure':{'figure_id':'Figure 2'}}}]}))
            calls=[]
            def fail(pid,path,target):calls.append(pid);raise ValueError('Temporarily unavailable')
            enrich_previews(feed,images,now=100,extractor=fail)
            result=enrich_previews(feed,images,now=200,extractor=fail)
            self.assertEqual(len(calls),1);self.assertEqual(result['papers'][0]['thumbnail_retry_after'],21700)
            enrich_previews(feed,images,now=200,retry_failed=True,extractor=fail);self.assertEqual(len(calls),2)
            enrich_previews(feed,images,now=21801,extractor=fail);self.assertEqual(len(calls),3)

    def test_valid_success_reused_but_corrupt_image_and_metadata_recover(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder);feed=root/'feed.json';images=root/'images'
            feed.write_text(json.dumps({'papers':[{'source':'arxiv','original_id':'1706.03762v7','narrative':{'selected_figure':{'figure_id':'Figure 2'}}}]}))
            calls=[]
            def generate(pid,path,target):
                calls.append(pid);path.parent.mkdir(parents=True,exist_ok=True)
                Image.new('RGB',(10,10),'white').save(path,format='WEBP')
                return {'kind':'selected','figure_id':target,'evidence':target,'source_url':'https://arxiv.org/html/'+pid+'/fig.png'}
            first=enrich_previews(feed,images,now=100,extractor=generate)
            enrich_previews(feed,images,now=200,extractor=generate);self.assertEqual(len(calls),1)
            key=hashlib.sha256(b'1706.03762v7:Figure 2:semantic-v1').hexdigest()[:24]
            (images/(key+'.webp')).write_bytes(b'broken')
            enrich_previews(feed,images,now=300,extractor=generate);self.assertEqual(len(calls),2)
            (images/(key+'.json')).write_text('{broken')
            result=enrich_previews(feed,images,now=400,extractor=generate);self.assertEqual(len(calls),3)
            self.assertEqual(first['papers'][0]['thumbnail'],result['papers'][0]['thumbnail'])
            self.assertNotIn('image_sha256',result['papers'][0]['thumbnail'])


def test_pdf_vector_crop_and_refusal_for_text_only(tmp_path):
    import fitz
    from reader_thumbnail import pdf_figure
    import pytest
    with fitz.open() as doc:
        page=doc.new_page()
        page.insert_text((60,60),'Header')
        page.draw_rect(fitz.Rect(60,130,260,230),fill=(0.2,0.6,0.4))
        page.insert_text((60,252),'Figure 2. Optimizer architecture')
        page.insert_text((320,250),'Other column text')
        image,_,pn,clip=pdf_figure(doc,'Figure 2')
        assert pn==1 and image.width>500 and clip[2]<300 and clip[1]>100
        with pytest.raises(ValueError):pdf_figure(doc,'Figure 3')
    feed=tmp_path/'feed.json'
    feed.write_text(json.dumps({'papers':[{'source':'arxiv','original_id':'1706.03762v7','thumbnail':{'kind':'first_page'}}]}))
    result=enrich_previews(feed,tmp_path/'images',extractor=lambda *_:pytest.fail('No selection should not make a request'))
    assert result['papers'][0]['thumbnail'] is None
