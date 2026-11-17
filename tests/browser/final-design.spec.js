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
  test.setTimeout(180_000);
  const seen = new Set();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await mkdir('artifacts/final', { recursive: true });
  for (const [topic, choices, ending] of [['진로', 4, '32:2309'], ['친구', 3, '32:2193']]) {
    for (let path = 0; path < 2 ** choices; path++) {
      await page.goto('/?typing=off');
      await page.getByRole('button', { name: '게임 시작', exact: true }).first().click();
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
  await page.goto('/?scene=32:2193&typing=off');
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
  await page.getByRole('textbox', { name: 'AI 과의존에 대한 내 생각' }).fill('내 선택은 내가 고민해 보겠습니다.');
  await page.getByRole('button', { name: '등록', exact: true }).click();
  await expect(page.getByText('내 선택은 내가 고민해 보겠습니다.', { exact: true })).toBeVisible();
  await expect(page.getByText('컨펌용 미리보기', { exact: false })).toBeVisible();
  await page.reload();
  // Reload follows the explicit scene query from this test, so inspect persistence directly.
  expect(await page.evaluate(() => localStorage.getItem('getya.final.local-reviews.v1'))).toContain('내 선택은 내가 고민해 보겠습니다.');
  expect(await page.evaluate(() => Object.keys(localStorage).some(key => /password|token/i.test(key)))).toBe(false);
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
