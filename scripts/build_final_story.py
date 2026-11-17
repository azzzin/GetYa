"""Create the final story graph from the actual Figma prototype connections."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
data = ROOT / 'src/final/data'
prototype = json.loads((ROOT / 'design/final/prototype.json').read_text())
interactions = json.loads((ROOT / 'design/final/interactions.json').read_text())
bounds = {n['id']: n['bounds'] for n in json.loads((ROOT / 'design/final/frame-bounds.json').read_text())}
layouts = json.loads((data / 'layouts.json').read_text())
content = json.loads((data / 'content.json').read_text())


def words(node):
    if 'textKey' in node:
        return content[node['textKey']]
    return ' '.join(words(child) for child in node.get('children', []))


scenes = {}
for frame in prototype['frames']:
    id = frame['id']
    if id not in layouts:
        continue
    name = frame['name']
    kind = 'dialogue'
    for term, value in [('선택지', 'choice'), ('노이즈', 'noise'), ('경고창', 'warning'), ('마지막 선택 후', 'result'), ('엔딩', 'ending'), ('에필로그', 'epilogue')]:
        if term in name:
            kind = value
    kind = {'32:703': 'start', '32:826': 'topics', '32:905': 'review', '32:2441': 'reviews'}.get(id, kind)
    captions = [words(n).strip() for n in layouts[id]['children'] if words(n).strip() and words(n).strip() not in ['LOGO', '1/4']]
    scene = {**frame, 'kind': kind, 'title': name, 'links': [], 'caption': ' '.join(captions)}
    origin = bounds[id]
    for interaction in interactions:
        if interaction['frame'] != id:
            continue
        for reaction in interaction['reactions']:
            for action in reaction.get('actions', []):
                target = action.get('destinationId')
                if target not in layouts:
                    continue
                box = interaction['bounds']
                scene['links'].append({
                    'id': interaction['id'], 'target': target,
                    'label': interaction.get('text', '').strip(),
                    'rect': [box['x'] - origin['x'], box['y'] - origin['y'], box['width'], box['height']],
                    'trigger': reaction['trigger']['type'],
                })
    scene['links'].sort(key=lambda link: link['rect'][0])
    if kind == 'choice':
        for i, link in enumerate(scene['links']):
            link['label'] = captions[i] if i < len(captions) else ('왼쪽 선택' if i == 0 else '오른쪽 선택')
    if len(scene['links']) == 1 and kind not in ['review', 'reviews', 'choice', 'topics']:
        scene['next'] = scene['links'][0]['target']
    scenes[id] = scene

# Explicit button semantics supplied by the designer, absent from the prototype.
scenes['32:1273']['links'] = [
    {'id': '32:1340', 'target': '32:826', 'label': '다시 하기', 'rect': [631, 851, 249, 104]},
    {'id': '32:1353', 'target': '32:905', 'label': '후기 남기기', 'rect': [1020, 851, 249, 104]},
]
# The next frame is not wired in the design. Keep it explicit for review.
scenes['32:1823']['next'] = '32:2437'
scenes['32:1823']['connectionNote'] = '사용자 확인: 엔딩 보기 → 노이즈 → 경고 → 진로 엔딩. 원본 프로토타입의 누락 연결을 보완.'
scenes['32:1823']['links'] = [{'id': '32:1836', 'target': '32:2437', 'label': '엔딩 보기', 'rect': [1430, 818, 360, 135]}]

(data / 'scenes.json').write_text(json.dumps(scenes, ensure_ascii=False, indent=2))
print(f'{len(scenes)} final scenes; {sum(len(s["links"]) for s in scenes.values())} explicit prototype/button links.')
