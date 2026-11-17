"""Convert captured Figma JSX to React layout data and ordinary CSS.

No screenshot is used as a game asset. Source layer IDs are retained for review.
Run again only when updating the captured design context.
"""
import hashlib
import html
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import shutil

ROOT = Path(__file__).resolve().parent.parent
SOURCES = {p.stem.replace('-', ':'): p.read_text() for p in sorted((ROOT / 'design/final/contexts').glob('*.txt'))}
OUT = ROOT / 'src/final/data'
OUT.mkdir(parents=True, exist_ok=True)
classes = {}
content = {}
assets = {}


def css_value(value):
    value = value.replace('_', ' ')
    # CSS calc requires whitespace around binary + and -.
    if value.startswith('calc('):
        value = re.sub(r'(?<=[%\d])([+-])(?=\d)', r' \1 ', value)
    return value


def declarations(token):
    fixed = {
        'absolute': 'position:absolute', 'relative': 'position:relative',
        'contents': 'display:contents', 'block': 'display:block', 'flex': 'display:flex',
        'flex-none': 'flex:none', 'items-center': 'align-items:center',
        'justify-center': 'justify-content:center', 'bg-white': 'background:#fff',
        'border': 'border-width:1px', 'border-5': 'border-width:5px', 'border-14': 'border-width:14px',
        'cursor-pointer': 'cursor:pointer', 'flex-col': 'flex-direction:column',
        'overflow-clip': 'overflow:clip', 'text-left': 'text-align:left',
        'underline': 'text-decoration-line:underline', 'decoration-solid': 'text-decoration-style:solid',
        'decoration-from-font': 'text-decoration-thickness:from-font',
        '[text-underline-position:from-font]': 'text-underline-position:from-font',
        '-scale-y-100': '--scale-y:-1',
        'border-black': 'border-color:#000', 'border-solid': 'border-style:solid',
        'max-w-none': 'max-width:none', 'mb-0': 'margin-bottom:0',
        'not-italic': 'font-style:normal', 'object-cover': 'object-fit:cover',
        'object-contain': 'object-fit:contain', 'overflow-hidden': 'overflow:hidden',
        'pointer-events-none': 'pointer-events:none',
        'text-black': 'color:#000', 'text-white': 'color:#fff',
        'text-center': 'text-align:center', 'font-bold': 'font-weight:700',
        'font-normal': 'font-weight:400', 'font-medium': 'font-weight:400',
        'whitespace-nowrap': 'white-space:nowrap', 'whitespace-pre': 'white-space:pre',
        'whitespace-pre-wrap': 'white-space:pre-wrap',
        '[word-break:break-word]': 'overflow-wrap:break-word',
        '-translate-x-1/2': '--tx:-50%', '-translate-y-1/2': '--ty:-50%',
        'rotate-180': '--rotation:180deg', 'rotate-90': '--rotation:90deg',
    }
    if token in fixed:
        return fixed[token]
    if token.startswith("font-['"):
        return 'font-family:Mona12;font-weight:' + ('700' if ':Bold' in token else '400')
    match = re.fullmatch(r'(h|w|size|left|right|top|bottom|inset|bg|text|leading|tracking|rounded|border)-(.+)', token)
    if not match:
        raise ValueError('Unconverted design class: ' + token)
    prop, value = match.groups()
    value = {'0': '0px', '1/2': '50%', '1/4': '25%', 'full': '100%'}.get(value, value)
    if value.startswith('['):
        value = value[1:-1]
    value = css_value(value)
    if prop == 'border': return 'border-color:' + value
    if prop == 'text' and value.startswith('#'): return 'color:' + value
    if prop == 'size':
        return f'width:{value};height:{value}'
    prop = {'h': 'height', 'w': 'width', 'bg': 'background', 'text': 'font-size',
            'leading': 'line-height', 'tracking': 'letter-spacing', 'rounded': 'border-radius'}.get(prop, prop)
    return f'{prop}:{value}'


def class_name(source):
    # One native CSS rule per complete layer style avoids utility dependencies.
    if source not in classes:
        name = 'final-layer-' + str(len(classes))
        tokens = source.split()
        rules = [declarations(token) for token in tokens]
        if any('translate' in token or token.startswith('rotate-') or token == '-scale-y-100' for token in tokens):
            tx = '-50%' if '-translate-x-1/2' in tokens else '0px'
            ty = '-50%' if '-translate-y-1/2' in tokens else '0px'
            rotation = '180deg' if 'rotate-180' in tokens else '90deg' if 'rotate-90' in tokens else '0deg'
            sy = '-1' if '-scale-y-100' in tokens else '1'
            rules.append(f'transform:translate({tx},{ty}) rotate({rotation}) scaleY({sy})')
        classes[source] = (name, ';'.join(rules))
    return classes[source][0]


class LayerParser(HTMLParser):
    def __init__(self, frame):
        super().__init__(convert_charrefs=True)
        self.frame = frame
        self.stack = []
        self.root = None

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        node = {'tag': tag, 'children': []}
        if 'classname' in attrs:
            node['className'] = class_name(attrs['classname'])
        for key in ['data-node-id', 'data-name', 'alt', 'src']:
            if key in attrs:
                node[key] = attrs[key]
        if self.stack:
            self.stack[-1]['children'].append(node)
        else:
            self.root = node
        self.stack.append(node)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        self.handle_endtag(tag)

    def handle_endtag(self, tag):
        assert self.stack[-1]['tag'] == tag, (self.frame, tag)
        self.stack.pop()

    def handle_data(self, value):
        if not value.strip() or not self.stack:
            return
        # Keep deliberate spaces inside a line, strip JSX source indentation.
        value = re.sub(r'\s*\n\s*', ' ', value).strip() if '\n' in value else value
        key = self.frame.replace(':', '-') + '-' + str(len(content))
        content[key] = value
        self.stack[-1]['children'].append({'textKey': key})


frames = {}
for frame, source in SOURCES.items():
    if frame in ['1:1194', '1:1282']:
        continue  # Share the completed opening and tutorial between both stories.
    variables = dict(re.findall(r'const (\w+) = "(https://www\.figma\.com/api/mcp/asset/[^"]+)";', source))
    jsx = source.split('return (', 1)[1].rsplit(');', 1)[0].strip()
    jsx = re.sub(r'\{`([^`]*)`\}', lambda m: html.escape(m[1]), jsx)
    for variable, url in variables.items():
        file_name = url.rsplit('/', 1)[-1]
        assets[url] = file_name
        jsx = jsx.replace('src={' + variable + '}', 'src="/assets/' + file_name + '"')
    parser = LayerParser(frame)
    parser.feed(jsx)
    assert not parser.stack, frame
    frames[frame] = parser.root

(OUT / 'layouts.json').write_text(json.dumps(frames, ensure_ascii=False, indent=2))
(OUT / 'content.json').write_text(json.dumps(content, ensure_ascii=False, indent=2))
(ROOT / 'design/final/asset-manifest.json').write_text(json.dumps(assets, indent=2))
(ROOT / 'src/final/design.css').write_text('/* Generated from captured Figma layer styles. */\n' + '\n'.join(
    '.' + name + '{' + value + '}' for name, value in classes.values()) + '\n')

fonts = ROOT / 'public/fonts'
fonts.mkdir(parents=True, exist_ok=True)
for name in ['Mona12.ttf', 'Mona12-Bold.ttf']:
    shutil.copy2(ROOT / 'MonaFont-ttf/Mona/01 Main' / name, fonts / name)
licenses = fonts / 'LICENSE'
shutil.copytree(ROOT / 'MonaFont-ttf/LICENSE', licenses, dirs_exist_ok=True)
print(f'Imported {len(frames)} screens, {len(content)} text fragments, {len(assets)} asset references.')
