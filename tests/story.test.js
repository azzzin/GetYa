import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { initialGame, gameReducer, scenes, START } from '../src/data/story.js';

const layouts = JSON.parse(readFileSync(new URL('../src/data/layouts.json', import.meta.url)));
const content = JSON.parse(readFileSync(new URL('../src/data/content.json', import.meta.url)));

test('every playable scene uses a captured Figma layout and every branch reaches an ending', () => {
  const reached = new Set();
  let endings = 0;
  function visit(id, path = new Set()) {
    assert.ok(scenes[id], `Missing target: ${id}`);
    assert.ok(layouts[id], `Missing Figma layout: ${id}`);
    assert.ok(!path.has(id), `Unexpected cycle at ${id}`);
    reached.add(id);
    const current = scenes[id];
    if (current.kind === 'ending') { endings++; return; }
    const targets = current.choices?.map(choice => choice.target) ?? [current.next];
    assert.ok(targets.every(Boolean), `Dead end at ${id}`);
    targets.forEach(target => visit(target, new Set([...path, id])));
  }
  visit(START);
  assert.equal(reached.size, Object.keys(scenes).length);
  assert.equal(endings, 16); // 2 topics × 2 choices × 2 choices × 2 choices
});

test('both initial choices show distinct reactions and converge at the next choice', () => {
  for (const [entry, merge] of [['1:564', '1:586'], ['1:1441', '1:1463']]) {
    const targets = scenes[entry].choices.map(choice => choice.target);
    assert.notEqual(targets[0], targets[1]);
    for (let id of targets) {
      while (id !== merge) {
        assert.ok(scenes[id].next, `No merge from ${id}`);
        id = scenes[id].next;
      }
    }
  }
});

test('restart clears route and history, invalid transitions preserve state', () => {
  let state = initialGame();
  state = gameReducer(state, { type: 'advance' });
  state = gameReducer(state, { type: 'advance', choiceIndex: 0 });
  assert.equal(state.route, 'career');
  assert.equal(state.history.length, 2);
  assert.equal(gameReducer(state, { type: 'advance', choiceIndex: 99 }), state);
  assert.deepEqual(gameReducer(state, { type: 'restart' }), initialGame());
});

test('all image and text references resolve locally with Mona font faces', () => {
  let imageReferences = 0;
  function inspect(layer) {
    if (layer.src) {
      assert.ok(layer.src.startsWith('/assets/'), layer.src);
      const path = new URL('../public' + layer.src, import.meta.url);
      assert.ok(existsSync(path), layer.src);
      assert.ok(statSync(path).size > 0, layer.src);
      imageReferences++;
    }
    if (layer.textKey) assert.equal(typeof content[layer.textKey], 'string');
    layer.children?.forEach(inspect);
  }
  Object.values(layouts).forEach(inspect);
  assert.ok(imageReferences > 400);
  const css = readFileSync(new URL('../src/figma.css', import.meta.url), 'utf8');
  assert.ok(!/Inter|Noto/.test(css));
  for (const font of ['Mona12.ttf', 'Mona12-Bold.ttf']) {
    assert.ok(statSync(new URL('../public/fonts/' + font, import.meta.url)).size > 0);
  }
});
