import { test, expect } from '@playwright/test';
import { scenes } from '../../src/data/story.js';
import { mkdir } from 'node:fs/promises';
import geometry from '../../src/data/doorGeometry.json' with { type: 'json' };

async function doorFrame(page, index) {
  const image = page.locator(`[data-door-index="${index}"] img`);
  await image.evaluate(img => img.decode());
  const { source, box } = await image.evaluate(img => {
    const rect = img.getBoundingClientRect();
    return { source: new URL(img.src).pathname, box: { x: rect.x, y: rect.y, width: rect.width, height: rect.height } };
  });
  const { width, height, frame: [x, y, w, h] } = geometry[source];
  return { x: box.x + x * box.width / width, y: box.y + y * box.height / height,
    width: w * box.width / width, height: h * box.height / height };
}

async function waitForAssets(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map(img => img.decode().catch(() => {})));
  });
  const invalid = await page.locator('.visual-layers img').evaluateAll(images => images.filter(img => {
    const rect = img.getBoundingClientRect();
    return !img.complete || img.naturalWidth === 0 || rect.width <= 0 || rect.height <= 0;
  }).map(img => img.src));
  expect(invalid).toEqual([]);
}

test('all 16 choice paths reach their ending; original assets render and restart works', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const seen = new Set();
  await mkdir('artifacts/screenshots', { recursive: true });
  await page.goto('/');
  await waitForAssets(page);
  await page.screenshot({ path: 'artifacts/screenshots/start.png' });
  await expect(page.locator('#password')).toBeEditable();
  await page.locator('#nickname').fill('지구인');
  for (const topic of [0, 1]) {
    for (let sequence = 0; sequence < 8; sequence++) {
      await expect(page.locator('.game-stage')).toHaveAttribute('data-scene-id', '1:295');
      await page.getByRole('button', { name: '게임 시작', exact: true }).first().click();
      await page.getByRole('button', { name: topic === 0 ? '진로 이야기 시작' : '친구 이야기 시작', exact: true }).click();
      await expect(page.locator('.game-stage')).not.toHaveAttribute('data-scene-id', '1:404');
      let choiceNumber = 0;
      for (let count = 0; count < 35; count++) {
        const id = await page.locator('.game-stage').getAttribute('data-scene-id');
        const scene = scenes[id];
        if (!seen.has(id)) {
          await waitForAssets(page);
          if (scene.next && scene.kind !== 'result') {
            const button = await page.getByRole('button', { name: '다음 대사', exact: true }).boundingBox();
            const arrow = await page.locator('.next-arrow-control > .pixel-next-arrow').boundingBox();
            expect(Math.abs(button.x + button.width / 2 - arrow.x - arrow.width / 2)).toBeLessThan(0.1);
            expect(Math.abs(button.y + button.height / 2 - arrow.y - arrow.height / 2)).toBeLessThan(0.1);
          }
          await page.screenshot({ path: `artifacts/screenshots/scene-${id.replace(':', '-')}.png` });
          seen.add(id);
        }
        if (scene.kind === 'ending') {
          expect(id).toBe(topic === 0 ? '1:1752' : '1:793');
          await page.getByRole('button', { name: '다시 하기', exact: true }).click();
          break;
        }
        if (scene.kind === 'choice') {
          const index = (sequence >> choiceNumber++) & 1;
          await page.getByRole('button', { name: scene.choices[index].label, exact: true }).click();
        } else {
          await page.getByRole('button', { name: scene.kind === 'result' ? '엔딩 보기' : '다음 대사', exact: true }).click();
        }
        await expect(page.locator('.game-stage')).not.toHaveAttribute('data-scene-id', id);
      }
      await expect(page.locator('.game-stage')).toHaveAttribute('data-scene-id', '1:295');
      await expect(page.locator('#nickname')).toHaveValue('');
    }
  }
  expect(seen.size).toBe(38); // Opening and shared topic selection are checked separately.
  expect(errors).toEqual([]);
});

test('Mona fonts, home, keyboard controls, pending audio and smaller viewports', async ({ page }) => {
  await page.goto('/');
  await waitForAssets(page);
  const fonts = await page.evaluate(() => [...document.fonts].map(font => ({ family: font.family, status: font.status })));
  expect(fonts.every(font => font.family === 'Mona12' && font.status === 'loaded')).toBe(true);
  await page.getByRole('button', { name: '소리 켜기', exact: true }).click();
  await expect(page.getByText('배경음악과 효과음은 준비 중입니다.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: '게임 시작', exact: true }).first().click();
  await waitForAssets(page);
  await page.screenshot({ path: 'artifacts/screenshots/tutorial.png' });
  await page.getByRole('button', { name: '친구 이야기 시작', exact: true }).click();
  await expect(page.locator('.game-stage')).toHaveAttribute('data-scene-id', '1:155');
  await page.keyboard.press('Enter');
  await expect(page.locator('.game-stage')).toHaveAttribute('data-scene-id', '1:225');
  await page.getByRole('button', { name: '처음으로', exact: true }).click();
  await expect(page.locator('.game-stage')).toHaveAttribute('data-scene-id', '1:295');
  for (const viewport of [{ width: 844, height: 390 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    // Resizing emits an event; wait for React to apply the new stage scale.
    await expect.poll(async () => {
      const bounds = await page.locator('.game-stage').boundingBox();
      return Math.round(bounds.width);
    }).toBe(Math.round(Math.min(viewport.width / 1920, viewport.height / 1080) * 1920));
    const rect = await page.locator('.game-stage').boundingBox();
    expect(rect.x).toBeGreaterThanOrEqual(-1);
    expect(rect.y).toBeGreaterThanOrEqual(-1);
    expect(rect.x + rect.width).toBeLessThanOrEqual(viewport.width + 1);
    expect(rect.y + rect.height).toBeLessThanOrEqual(viewport.height + 1);
    await waitForAssets(page);
    await page.screenshot({ path: `artifacts/screenshots/start-${viewport.width}.png` });
  }
});

test('closed doors open on hover, focus and click; input offsets and pixel arrows are applied', async ({ page }) => {
  await page.goto('/');
  await page.locator('#nickname').fill('지구인');
  await page.locator('#password').fill('test-password');
  for (const field of ['#nickname', '#password']) {
    expect(await page.locator(field).evaluate(input => getComputedStyle(input).left)).toBe('830px');
  }
  await page.getByRole('button', { name: '게임 시작', exact: true }).first().click();
  await page.getByRole('button', { name: '진로 이야기 시작', exact: true }).click();
  await expect(page.locator('.game-stage')).toHaveAttribute('data-scene-id', '1:1054');
  await expect(page.locator('.pixel-next-arrow')).toHaveCount(1);
  await waitForAssets(page);
  await page.screenshot({ path: 'artifacts/screenshots/pixel-arrow.png' });
  await page.getByRole('button', { name: '다음 대사', exact: true }).click();
  await page.getByRole('button', { name: '다음 대사', exact: true }).click();
  await expect(page.locator('.game-stage')).toHaveAttribute('data-scene-id', '1:1441');
  const first = page.getByRole('button', { name: scenes['1:1441'].choices[0].label, exact: true });
  const second = page.getByRole('button', { name: scenes['1:1441'].choices[1].label, exact: true });
  await page.mouse.move(0, 0);
  await expect(page.locator('[data-door-state="closed"]')).toHaveCount(2);
  const closedFrame = await doorFrame(page, 0);
  const badge = await page.locator('.pixel-progress').evaluate(node => ({ color: getComputedStyle(node).backgroundColor, shape: getComputedStyle(node).clipPath }));
  expect(badge.color).toBe('rgb(185, 232, 76)');
  expect(badge.shape).toContain('polygon');
  await waitForAssets(page);
  await page.screenshot({ path: 'artifacts/screenshots/doors-closed.png' });
  await first.hover();
  await expect(page.locator('[data-door-index="0"]')).toHaveAttribute('data-door-state', 'open');
  const openFrame = await doorFrame(page, 0);
  for (const axis of ['x', 'y', 'width', 'height']) expect(Math.abs(openFrame[axis] - closedFrame[axis])).toBeLessThan(0.1);
  await expect(page.locator('[data-door-index="1"]')).toHaveAttribute('data-door-state', 'closed');
  await second.hover();
  await expect(page.locator('[data-door-index="0"]')).toHaveAttribute('data-door-state', 'closed');
  await expect(page.locator('[data-door-index="1"]')).toHaveAttribute('data-door-state', 'open');
  await waitForAssets(page);
  await page.screenshot({ path: 'artifacts/screenshots/door-hover.png' });
  await page.mouse.move(0, 0);
  await expect(page.locator('[data-door-state="closed"]')).toHaveCount(2);
  await first.focus();
  await expect(page.locator('[data-door-index="0"]')).toHaveAttribute('data-door-state', 'open');
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-door-index="0"]')).toHaveAttribute('data-door-state', 'open');
  await expect(page.locator('.game-stage')).toHaveAttribute('data-scene-id', '1:864');
});

test('friend dialogue is left aligned and pixel doors keep their frame when opened', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '게임 시작', exact: true }).first().click();
  const tutorialClosed = await doorFrame(page, 1);
  await page.getByRole('button', { name: '친구 이야기 시작', exact: true }).hover();
  const tutorialOpen = await doorFrame(page, 1);
  for (const axis of ['x', 'y', 'width', 'height']) expect(Math.abs(tutorialOpen[axis] - tutorialClosed[axis])).toBeLessThan(0.1);
  await page.getByRole('button', { name: '친구 이야기 시작', exact: true }).click();
  await expect(page.locator('.game-stage')).toHaveAttribute('data-scene-id', '1:155');
  for (const id of ['1:155', '1:225']) {
    const centered = await page.locator('.intro-dialogue').evaluate(node => {
      const css = getComputedStyle(node);
      return { align: css.textAlign, vertical: css.justifyContent };
    });
    expect(centered).toEqual({ align: 'left', vertical: 'center' });
    await waitForAssets(page);
    await page.screenshot({ path: `artifacts/screenshots/left-friend-${id.replace(':', '-')}.png` });
    const arrow = await page.locator('.next-arrow-control > .pixel-next-arrow').boundingBox();
    // Click inside the bubble, away from the icon itself, in the expanded target.
    await page.mouse.click(arrow.x + arrow.width / 2 - 40, arrow.y + arrow.height / 2 - 20);
    await expect(page.locator('.game-stage')).not.toHaveAttribute('data-scene-id', id);
  }
  await page.mouse.move(0, 0);
  const closed = await doorFrame(page, 1);
  await page.getByRole('button', { name: scenes['1:564'].choices[1].label, exact: true }).hover();
  const open = await doorFrame(page, 1);
  for (const axis of ['x', 'y', 'width', 'height']) expect(Math.abs(open[axis] - closed[axis])).toBeLessThan(0.1);
  await waitForAssets(page);
  await page.screenshot({ path: 'artifacts/screenshots/aligned-pixel-door.png' });
});

test('career introduction uses the same left aligned bubble and nearby clicks advance', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '게임 시작', exact: true }).first().click();
  await page.getByRole('button', { name: '진로 이야기 시작', exact: true }).click();
  await expect(page.locator('.game-stage')).toHaveAttribute('data-scene-id', '1:1054');
  for (const id of ['1:1054', '1:1124']) {
    await expect(page.locator('.intro-dialogue')).toHaveCSS('text-align', 'left');
    const arrow = await page.locator('.next-arrow-control > .pixel-next-arrow').boundingBox();
    await page.mouse.click(arrow.x + arrow.width / 2 - 40, arrow.y + arrow.height / 2 - 20);
    await expect(page.locator('.game-stage')).not.toHaveAttribute('data-scene-id', id);
  }
});
