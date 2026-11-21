// Each choice and its consequences belong to the same chapter.
// The friend story has three choices and uses chapter four for its result.
const chapterScenes = [
  ['1382', '3', '51', '91', '363', '1404', '22', '66', '110', '378'],
  ['1436', '138', '319', '1544', '153', '335'],
  ['1576', '181', '303', '1598', '200', '228', '253', '278'],
  ['1717', '1777', '1630', '1750', '1823'],
];
export const chapters = new Map(chapterScenes.flatMap((ids, index) =>
  ids.map(id => [`32:${id}`, index + 1])));

// Animated layers from the introduction and the two choice-frame cameos.
const mascotLayers = new Set(['32:406', '32:476', '32:556', '32:626', '32:829', '32:1645']);
const speechLayers = new Set([
  '32:405', '32:471', '32:472', '32:475', '32:537', '32:538',
  '32:555', '32:621', '32:622', '32:625', '32:687', '32:688',
  '32:828', '32:894', '32:1542', '32:1543', '32:1701', '32:1702',
]);

export function nyaLayerClass(id) {
  if (id === '32:1458') return 'nya-entrance nya-entrance-group';
  if (mascotLayers.has(id)) return 'nya-entrance';
  if (speechLayers.has(id)) return 'nya-speech-entrance';
}
