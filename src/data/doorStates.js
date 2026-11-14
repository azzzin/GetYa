import geometry from './doorGeometry.json';

// Existing, unmodified closed/open door assets exported from Figma.
const standard = {
  closed: '/assets/33dea9ce-f866-42c5-a391-67e14772f796.png',
  open: '/assets/987c9697-34df-47b7-868f-5643ee0dc192.png',
};
const pixel = {
  closed: '/assets/5feb869b-3dcb-486f-b24f-1ff1813d45bc.png',
  open: '/assets/57a1e8d3-40b1-4340-8afc-aec07384dfd3.png',
};

export const doorStates = {};
for (const [left, right] of [
  ['1:606', '1:607'], ['1:628', '1:629'], ['1:1461', '1:1462'],
  ['1:1483', '1:1484'], ['1:1505', '1:1506'],
]) {
  doorStates[left] = { ...standard, index: 0, rect: [561, 708, 149, 193] };
  doorStates[right] = { ...standard, index: 1, rect: [1210, 708, 149, 193] };
}
doorStates['1:585'] = { ...pixel, index: 0, rect: [564, 701, 143, 206] };
doorStates['1:584'] = { ...pixel, index: 1, rect: [1212, 701, 143, 206] };
doorStates['1:473'] = { ...standard, index: 0, rect: [1183, 540, 276, 356] };
doorStates['1:474'] = { ...standard, index: 1, rect: [1475, 540, 276, 356] };

export function alignedDoorImage(door, open) {
  const closed = geometry[door.closed];
  const current = geometry[open ? door.open : door.closed];
  const [, , width, height] = door.rect;
  const scale = Math.min(width / closed.width, height / closed.height);
  const [cx, cy, cw, ch] = closed.frame;
  const [x, y, w, h] = current.frame;
  // Match the visible frame rather than the PNG canvas, whose padding differs.
  const scaleX = cw * scale / w;
  const scaleY = ch * scale / h;
  return {
    left: (width - closed.width * scale) / 2 + cx * scale - x * scaleX,
    top: (height - closed.height * scale) / 2 + cy * scale - y * scaleY,
    width: current.width * scaleX,
    height: current.height * scaleY,
    objectFit: 'fill',
  };
}

export const originalNextArrow = '/assets/02a27adf-0843-4cc7-8e51-cd8dc6fe9088.svg';
