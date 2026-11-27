"""Figure identifiers and bounded caption evidence shared by triage and extraction."""
import re

LABEL = re.compile(r'^\s*(?:figure|fig\.)\s+([A-Z]?\d+(?:\.\d+)*[a-z]?(?:\([a-z]\))?|[A-Z](?:\.\d+)?)(?=\s*[:.\s]|$)', re.I)
CAPTION = re.compile(r'(?im)^\s*(?:figure|fig\.)\s+([A-Z]?\d+(?:\.\d+)*[a-z]?(?:\([a-z]\))?|[A-Z](?:\.\d+)?)\s*[:.]\s*(?=\S)')


def figure_id(label):
    match=LABEL.match(label)
    return 'Figure '+match[1] if match else None


def caption_context(text):
    evidence={}
    for match in CAPTION.finditer(text):
        label='Figure '+match[1]
        if label in evidence:continue
        caption=text[match.end():match.end()+360].strip()
        reference=re.search(r'(?i)(?:as shown in|see|illustrated in|depicted in)\s+(?:figure|fig\.)\s*'+re.escape(match[1])+r'\b[^\n]{0,140}',text)
        evidence[label]={'caption':caption,'reference':reference[0] if reference else ''}
        if len(evidence)>=20:break
    return evidence
