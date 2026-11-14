import { createElement } from 'react';
import content from '../data/content.json';
import { alignedDoorImage, doorStates, originalNextArrow } from '../data/doorStates.js';
import { assetUrl } from '../assetUrl.js';

// Render original Figma layers; all text remains editable in content.json.
export default function DesignLayers({ layer, phase, actions, onAssetError, activeDoor }) {
  if (layer.textKey) {
    const text = content[layer.textKey];
    return text === '1/4' && phase ? `${phase}/4` : text;
  }
  const { tag, children, ...attributes } = layer;
  const nodeId = attributes['data-node-id'];
  // Input text is replaced with actual accessible controls in App.
  if (nodeId === '1:310' || nodeId === '1:312') return null;
  const name = attributes['data-name'];
  const action = name === 'home 1' ? actions.home
    : name === 'sound 1' ? actions.soundOn
    : name === 'sound X 1' ? actions.soundOff
    : name === 'start 2 1' ? actions.start : null;
  const label = name === 'home 1' ? '처음으로'
    : name === 'sound 1' ? '소리 켜기'
    : name === 'sound X 1' ? '소리 끄기' : '게임 시작';
  const props = { ...attributes };
  if (['layer-10', 'layer-88'].includes(props.className)) props.className += ' pixel-progress';
  if (['1:223', '1:293', '1:1122', '1:1192'].includes(nodeId)) props.className += ' intro-dialogue';
  const door = doorStates[nodeId];
  if (door) {
    const open = activeDoor === door.index;
    const [left, top, width, height] = door.rect ?? [];
    return <div {...props} data-door-index={door.index} data-door-state={open ? 'open' : 'closed'}
      style={door.rect ? { left, top, width, height } : undefined}>
      <img className="interactive-door-image" src={assetUrl(open ? door.open : door.closed)}
        style={alignedDoorImage(door, open)} alt="" draggable={false} onError={onAssetError} />
    </div>;
  }
  if (tag === 'img' && props.src === originalNextArrow) {
    if (actions.next) return <button type="button" className={`${props.className} next-arrow-control`}
      aria-label="다음 대사" onClick={actions.next}>
      <span className="pixel-next-arrow" aria-hidden="true" />
    </button>;
    return <span className={`${props.className} pixel-next-arrow`} aria-hidden="true" />;
  }
  if (tag === 'img') {
    props.src = assetUrl(props.src);
    props.draggable = false;
    props.decoding = 'async';
    props.onError = onAssetError;
  }
  if (action) {
    props.type = 'button';
    props['aria-label'] = label;
    props.onClick = action;
    props.className += ' image-button';
  }
  return createElement(action ? 'button' : tag, props,
    ...children.map((child, index) => <DesignLayers key={index} layer={child} phase={phase} actions={actions} onAssetError={onAssetError} activeDoor={activeDoor} />));
}
