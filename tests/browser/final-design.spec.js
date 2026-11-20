import { test, expect } from '@playwright/test';
import scenes from '../../src/final/data/scenes.json' with { type: 'json' };
import { mkdir } from 'node:fs/promises';

async function ready(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map(img => img.decode().catch(() => {})));
  });
  expect(await page.locator('.visual-layers img').evaluateAll(images => images.every(img => img.complete && img.naturalWidth > 0))).toBe(true);
}

test('final prototype paths reach both endings, including the added fourth career choice', async ({ page }) => {
  test.setTimeout(240_000);
  const seen = new Set();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await mkdir('artifacts/final', { recursive: true });
  for (const [topic, choices, ending] of [['진로', 4, '32:2309'], ['친구', 3, '32:2193']]) {
    for (let path = 0; path < 2 ** choices; path++) {
      await page.goto('/?typing=off');
      await page.getByRole('button', { name: '게임 시작', exact: true }).first().click();
      for (const id of ['37:2595', '37:2617', '37:2639', '37:2661', '37:2683']) {
        await expect(page.locator('.game-stage')).toHaveAttribute('data-scene-id', id);
        await page.getByRole('button', { name: '다음 대사', exact: true }).click();
      }
      await page.getByRole('button', { name: topic, exact: true }).click();
      await expect(page.locator('.game-stage')).not.toHaveAttribute('data-scene-id', '32:826');
      let choiceIndex = 0;
      for (let step = 0; step < 45; step++) {
        const id = await page.locator('.game-stage').getAttribute('data-scene-id');
        if (!seen.has(id)) {
          await ready(page);
          await page.screenshot({ path: `artifacts/final/${id.replace(':', '-')}.png` });
          seen.add(id);
        }
        if (id === ending) break;
        const scene = scenes[id];
        if (['noise', 'warning'].includes(scene.kind)) {
          await expect(page.locator('.game-stage')).not.toHaveAttribute('data-scene-id', id);
          continue;
        } else if (scene.kind === 'choice') {
          const index = (path >> choiceIndex++) & 1;
          await page.locator(`[data-link-id="${scene.links[index].id}"]`).click();
        } else {
          // Prefer the authored end-result button, otherwise the full bubble/frame.
          const authored = scene.links.find(link => link.label === '엔딩 보기');
          await (authored ? page.locator(`[data-link-id="${authored.id}"]`) : page.getByRole('button', { name: '다음 대사', exact: true })).click();
        }
        await expect(page.locator('.game-stage')).not.toHaveAttribute('data-scene-id', id);
      }
      await expect(page.locator('.game-stage')).toHaveAttribute('data-scene-id', ending);
      expect(choiceIndex).toBe(choices);
    }
  }
  expect(errors).toEqual([]);
  expect(seen.size).toBeGreaterThan(40);
});

test('epilogue, review entry and local review list are interactive without storing passwords', async ({ page }) => {
  await page.goto('/?typing=off');
  await page.getByLabel('Username', { exact: true }).fill('  별빛 지구인  ');
  await page.getByLabel('Pw', { exact: true }).fill('do-not-store-this');
  await page.getByRole('button', { name: '게임 시작', exact: true }).first().click();
  const stage = page.locator('.game-stage');
  const next = page.getByRole('button', { name: '다음 대사', exact: true });
  const logo = page.getByRole('img', { name: 'Get-Ya!', exact: true });
  for (const id of ['37:2595', '37:2617', '37:2639', '37:2661', '37:2683']) {
    await expect(stage).toHaveAttribute('data-scene-id', id);
    await expect(logo).toBeVisible();
    await next.click();
  }
  await page.getByRole('button', { name: '친구', exact: true }).click();
  await expect(stage).not.toHaveAttribute('data-scene-id', '32:826');
  for (let step = 0; step < 45; step++) {
    const id = await stage.getAttribute('data-scene-id');
    if (id === '32:2193') break;
    const scene = scenes[id];
    if (scene.kind === 'choice') {
      await page.locator(`[data-link-id="${scene.links[0].id}"]`).click();
    } else if (!['noise', 'warning'].includes(scene.kind)) {
      const endingButton = scene.links.find(link => link.label === '엔딩 보기');
      await (endingButton ? page.getByRole('button', { name: endingButton.label, exact: true }) : next).click();
    }
    await expect(stage).not.toHaveAttribute('data-scene-id', id);
  }
  await page.getByRole('button', { name: '에필로그 보기', exact: true }).click();
  for (const id of ['32:1029', '32:1113', '32:1193']) {
    await expect(page.locator('.game-stage')).toHaveAttribute('data-scene-id', id);
    await ready(page);
    await page.screenshot({ path: `artifacts/final/${id.replace(':', '-')}.png` });
    await page.getByRole('button', { name: '다음 대사', exact: true }).click();
  }
  await page.getByRole('button', { name: '후기 남기기', exact: true }).click();
  await ready(page);
  await page.screenshot({ path: 'artifacts/final/review-empty.png' });
  await page.getByRole('textbox', { name: '서술형 후기' }).fill('내 선택은 내가 고민해 보겠습니다.');
  const choices = page.getByRole('group', { name: '게임에서 가장 좋았던 점은 무엇인가요?' }).getByRole('checkbox');
  await choices.nth(0).check();
  await choices.nth(1).check();
  await expect(choices.nth(2)).toBeDisabled();
  await page.getByRole('checkbox', { name: '유저네임과 서술형 후기를 이 전시 화면에 보여주기' }).check();
  await page.getByRole('button', { name: '등록', exact: true }).click();
  await expect(page.getByText('내 선택은 내가 고민해 보겠습니다.', { exact: true })).toBeVisible();
  await expect(page.getByRole('article').getByText('별빛 지구인', { exact: true })).toBeVisible();
  await expect(logo).toHaveAttribute('src', /get-ya-logo\.svg$/);
  expect(await logo.evaluate(img => img.complete && img.naturalWidth === 234)).toBe(true);
  await expect(page.getByText('LOGO', { exact: true })).toHaveCount(0);
  await page.goto('/?scene=32:2441');
  await expect(page.getByRole('article').getByText('별빛 지구인', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('getya.final.exhibition-reviews.v1')))
    .not.toContain('do-not-store-this');
});

test('start screen and both doors render, noise automatically clears, no audio is requested', async ({ page }) => {
  const audioRequests = [];
  page.on('request', request => { if (/\.(mp3|wav|ogg)(\?|$)/.test(request.url())) audioRequests.push(request.url()); });
  await page.goto('/');
  await ready(page);
  await page.screenshot({ path: 'artifacts/final/start.png' });
  await page.getByLabel('Username', { exact: true }).fill('테스트 지구인');
  await page.getByLabel('Pw', { exact: true }).fill('do-not-store-this');
  await page.getByRole('button', { name: '게임 시작', exact: true }).first().click();
  for (const id of ['37:2595', '37:2617', '37:2639', '37:2661', '37:2683']) {
    await expect(page.locator('.game-stage')).toHaveAttribute('data-scene-id', id);
    await page.getByRole('button', { name: '다음 대사', exact: true }).click();
  }
  await page.mouse.move(0, 0);
  await expect(page.locator('[data-door-state="closed"]')).toHaveCount(2);
  await page.getByRole('button', { name: '친구', exact: true }).hover();
  await expect(page.locator('[data-door-index="1"]')).toHaveAttribute('data-door-state', 'open');
  await page.goto('/?scene=32:2426&typing=off');
  for (const id of ['32:2426', '32:2422', '32:1927']) {
    await expect(page.locator('.game-stage')).toHaveAttribute('data-scene-id', id);
    await ready(page);
    await page.screenshot({ path: `artifacts/final/${id.replace(':', '-')}.png` });
    await expect(page.getByRole('button', { name: '다음 대사', exact: true })).toHaveCount(0);
    await expect(page.locator('.game-stage')).not.toHaveAttribute('data-scene-id', id);
  }
  await expect(page.locator('.game-stage')).toHaveAttribute('data-scene-id', '32:1851');
  expect(audioRequests).toEqual([]);
});

for (const [topic, ids] of [
  ['friend', ['32:2426', '32:2422', '32:1927', '32:1851']],
  ['career', ['32:2437', '32:2433', '32:2430', '32:1930']],
]) {
  test(`${topic} TV sequence advances without clicks and stops at the ending`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`/?scene=${ids[0]}&typing=off`);
    for (const id of ids) await expect(page.locator('.game-stage')).toHaveAttribute('data-scene-id', id);
    // A later automatic transition must not advance the ending dialogue itself.
    await expect(async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await expect(page.locator('.game-stage')).toHaveAttribute('data-scene-id', ids.at(-1));
    }).toPass({ timeout: 2000 });
  });
}

test('leaving static cancels its scheduled transition', async ({ page }) => {
  await page.goto('/?scene=32:2426&typing=off');
  await page.getByRole('button', { name: '처음으로', exact: true }).click();
  await page.waitForTimeout(2200);
  await expect(page.locator('.game-stage')).toHaveAttribute('data-scene-id', '32:703');
});

test('long public exhibition comments grow in separate bubbles and can be scrolled', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('getya.final.exhibition-reviews.v1', JSON.stringify([
    { id: 'long', body: '길게 작성한 후기입니다. '.repeat(140), share: true },
    { id: 'short', body: '두 번째 후기입니다.', share: true },
    { id: 'private', body: '공개하지 않은 글입니다.', share: false },
  ])));
  await page.goto('/?scene=32:2441');
  const list = page.getByRole('region', { name: '후기 목록' });
  const bubbles = list.getByRole('article');
  await expect(bubbles).toHaveCount(2);
  expect(await bubbles.first().evaluate(node => node.offsetHeight)).toBeGreaterThan(
    await bubbles.last().evaluate(node => node.offsetHeight),
  );
  const scrollbar = page.getByRole('slider', { name: '후기 스크롤' });
  await expect(scrollbar).toHaveValue('0');
  await page.getByRole('button', { name: '후기 아래로' }).click();
  await expect(scrollbar).toHaveValue('120');
  await page.getByRole('button', { name: '후기 위로' }).click();
  await expect(scrollbar).toHaveValue('0');
  const bounds = await scrollbar.boundingBox();
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + 25);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2, { steps: 6 });
  await page.mouse.up();
  await expect.poll(() => list.evaluate(node => node.scrollTop)).toBeGreaterThan(120);
  await scrollbar.press('Home');
  await expect(scrollbar).toHaveValue('0');
  await bubbles.last().scrollIntoViewIfNeeded();
  await expect.poll(async () => Number(await scrollbar.inputValue())).toBeGreaterThan(0);
  await scrollbar.press('Home');
  await expect(scrollbar).toHaveValue('0');
  await page.screenshot({ path: 'artifacts/final/review-scrollbar.png' });
});

test('shared review form can be tried without persisting the response', async ({ page }) => {
  await page.route('https://getya.example/**', async route => {
    const url = new URL(route.request().url());
    const response = await route.fetch({ url: 'http://127.0.0.1:5173' + url.pathname + url.search });
    await route.fulfill({ response });
  });
  await page.goto('https://getya.example/?scene=32:905');
  await expect(page.getByText('컨펌용 · 응답을 저장하거나 전송하지 않습니다.')).toBeVisible();
  await page.getByRole('textbox', { name: '서술형 후기' }).fill('공유용 작성 체험');
  await page.getByRole('button', { name: '등록', exact: true }).click();
  await expect(page.getByText('공유용 작성 체험')).toBeVisible();
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
});

test('career ending opens the epilogue and uses the pixel dialogue arrow', async ({ page }) => {
  await page.goto('/?scene=32:2309&typing=off');
  const stage = page.locator('.game-stage');
  await expect(page.locator('[data-node-id="32:2407"]')).toHaveText('에필로그 보기');
  await expect(page.getByRole('button', { name: '후기 남기기', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '에필로그 보기', exact: true }).click();
  await expect(stage).toHaveAttribute('data-scene-id', '32:1029');

  const arrow = stage.locator('.pixel-next-arrow');
  await expect(arrow).toBeVisible();
  await expect(arrow).toHaveCSS('clip-path', /^polygon\(/);
  await expect(arrow.locator('xpath=../../..')).toHaveCSS('transform', /^matrix\(-1, 0, 0, -1,/);
  await page.getByRole('button', { name: '다음 대사', exact: true }).click();
  await expect(stage).toHaveAttribute('data-scene-id', '32:1113');
});
