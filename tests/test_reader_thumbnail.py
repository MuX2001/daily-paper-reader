import io
from pathlib import Path
import sys
import tempfile
import unittest
from PIL import Image
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'src'))
from reader_thumbnail import preview

class ReaderThumbnailTests(unittest.TestCase):
    def test_version_relative_figure_url(self):
        html=b'<article><figure><img src="1706.03762v7/Figures/model.png"><figcaption>Figure 1: Architecture</figcaption></figure></article>'
        buffer=io.BytesIO();Image.new('RGB',(100,100),'white').save(buffer,format='PNG')
        calls=[]
        def fetch(url,**kwargs):
            calls.append(url)
            return html if url.endswith('v7') else buffer.getvalue()
        with tempfile.TemporaryDirectory() as folder:
            p=Path(folder)/'preview.webp';result=preview('1706.03762v7',p,fetch)
            self.assertEqual(result['kind'],'figure1')
            self.assertEqual(calls[-1],'https://arxiv.org/html/1706.03762v7/Figures/model.png')
            with Image.open(p) as image:
                self.assertEqual(image.format,'WEBP')
