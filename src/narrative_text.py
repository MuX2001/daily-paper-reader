"""Validate decoded model strings without rewriting Markdown or TeX."""
import re

MATH = re.compile(r'\$\$.*?\$\$|(?<!\\)\$.*?(?<!\\)\$|\\\(.*?\\\)|\\\[.*?\\\]', re.S)
# Unescaped JSON commands such as \tau, \nabla, and \rho can decode to
# whitespace followed by the rest of the command. Only flag these in math.
BROKEN_COMMAND = re.compile(r'(?:\tau\b|\nabla\b|\rho\b|\theta\b)')


def validate_prose(text):
    if re.search(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', text):
        raise ValueError('Control character in narrative text')
    for math in MATH.finditer(text):
        if BROKEN_COMMAND.search(math.group()):
            raise ValueError('Likely damaged LaTeX escape in math')
