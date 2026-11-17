import { createElement } from 'react';
import { assetUrl } from '../assetUrl.js';
import { alignedDoorImage, originalNextArrow } from '../data/doorStates.js';
import content from './data/content.json';

const standard = { closed: '/assets/33dea9ce-f866-42c5-a391-67e14772f796.png', open: '/assets/987c9697-34df-47b7-868f-5643ee0dc192.png' };
const pixel = { closed: '/assets/5feb869b-3dcb-486f-b24f-1ff1813d45bc.png', open: '/assets/57a1e8d3-40b1-4340-8afc-aec07384dfd3.png' };

export default function FinalLayers({ layer, scene, activeDoor, actions, reveal }) {
  if (layer.textKey) {
    const text = content[layer.textKey];
    const offset = reveal.offsets[layer.textKey];
    if (offset != null) return <span aria-label={text}>{Array.from(text).map((letter, i) =>
      <span key={i} aria-hidden="true" className={`ending-letter${offset + i < reveal.visible ? ' is-visible' : ''}`}>{letter}</span>)}</span>;
    return text;
  }
  const { tag, children, ...props } = layer;
  const id = props['data-node-id'];
  const name = props['data-name'] ?? '';
  if (['noise', 'warning'].includes(scene.kind) && tag === 'img' && props.src === originalNextArrow) return null;
  if (['32:718', '32:720'].includes(id)) return null;
  if (['choice', 'topics'].includes(scene.kind) && /^(열린 문|닫힌 문|문 )/.test(name)) {
    const index = scene.kind === 'topics' ? (name === '문 3' ? 1 : 0) : name.startsWith('열린') ? 1 : 0;
    const special = scene.id === '32:1382';
    const rect = scene.kind === 'topics' ? [index ? 1475 : 1183, 540, 276, 356]
      : special ? [index ? 1212 : 564, 701, 143, 206] : [index ? 1210 : 561, 708, 149, 193];
    const pair = { ...(special ? pixel : standard), rect };
    const open = index === activeDoor;
    return <div {...props} data-door-index={index} data-door-state={open ? 'open' : 'closed'}
      style={{ left: rect[0], top: rect[1], width: rect[2], height: rect[3] }}>
      <img className="interactive-door-image" style={alignedDoorImage(pair, open)} src={assetUrl(open ? pair.open : pair.closed)} alt="" />
    </div>;
  }
  const action = name === 'home 1' ? actions.home : name === 'sound 1' || name === 'sound X 1' ? actions.sound
    : name === 'start 2 1' ? actions.start : null;
  if (tag === 'img') {
    props.src = assetUrl(props.src);
    props.draggable = false;
    props.onError = actions.assetError;
  }
  if (action) {
    props.className += ' image-button';
    props.type = 'button';
    props.onClick = action;
    props['aria-label'] = name === 'home 1' ? '처음으로' : name === 'start 2 1' ? '게임 시작' : name === 'sound 1' ? '소리 켜기' : '소리 끄기';
  }
  return createElement(action ? 'button' : tag === 'a' ? 'div' : tag, props,
    ...children.map((child, i) => <FinalLayers key={i} layer={child} scene={scene} activeDoor={activeDoor} actions={actions} reveal={reveal} />));
}
