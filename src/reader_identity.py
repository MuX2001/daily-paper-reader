"""Standard-library-only validation used before installing workflow dependencies."""
import re

ARXIV_VERSION = re.compile(r'(?:\d{4}\.\d{4,5}|[A-Za-z.-]+/\d{7})v[1-9]\d*')


def validate_id(paper_id):
    if not isinstance(paper_id,str) or not ARXIV_VERSION.fullmatch(paper_id):
        raise ValueError('An explicit arXiv version is required (for example 1706.03762v7)')
    return paper_id


def validate_request_id(request_id):
    if not isinstance(request_id,str) or not re.fullmatch(r'[A-Za-z0-9_-]{8,80}',request_id):
        raise ValueError('Invalid request ID')
    return request_id
