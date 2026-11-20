import { test, expect } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import scenes from '../../src/final/data/scenes.json' with { type: 'json' };

test('production build plays from the public URL and does not persist review responses', async ({ page }) => {
  const root = resolve('dist');
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.ttf': 'font/ttf' };
  const server = createServer(async (request, response) => {
    const path = new URL(request.url, 'http://localhost').pathname;
    if (!path.startsWith('/GetYa/')) { response.writeHead(404).end(); return; }
    const relative = decodeURIComponent(path.slice('/GetYa/'.length));
    const file = resolve(root, relative.endsWith('/') || !relative ? relative + 'index.html' : relative);
    if (!file.startsWith(root + sep)) { response.writeHead(404).end(); return; }
    try {
      const body = await readFile(file);
      response.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' }).end(body);
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise(accept => server.listen(0, '127.0.0.1', accept));
  try {
    const origin = 'https://getya.example/GetYa/';
    await page.route('https://getya.example/**', async route => {
      const url = new URL(route.request().url());
      const response = await route.fetch({
        url: `http://127.0.0.1:${server.address().port}${url.pathname}${url.search}`,
      });
      await route.fulfill({ response });
    });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin + '?version=mvp');
    await expect(page.locator('.game-stage')).toHaveAttribute('data-scene-id', '1:295');
    await page.goto(origin + '?typing=off');
    await expect(page.locator('.game-stage')).toHaveAttribute('data-scene-id', '32:703');
    await page.getByRole('button', { name: '게임 시작', exact: true }).first().click();
    for (const id of ['37:2595', '37:2617', '37:2639', '37:2661', '37:2683']) {
      await expect(page.locator('.game-stage')).toHaveAttribute('data-scene-id', id);
      await page.getByRole('button', { name: '다음 대사', exact: true }).click();
    }
    await page.getByRole('button', { name: '친구', exact: true }).click();
    await expect(page.locator('.game-stage')).toHaveAttribute('data-scene-id', '32:403');
    await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(img => img.decode())); });
    expect(await page.evaluate(() => [...document.images].every(img => img.naturalWidth > 0))).toBe(true);
    const stage = page.locator('.game-stage');
    for (let step = 0; step < 45; step++) {
      const id = await stage.getAttribute('data-scene-id');
      if (id === '32:2193') break;
      const scene = scenes[id];
      if (scene.kind === 'choice') {
        await page.locator(`[data-link-id="${scene.links[0].id}"]`).click();
      } else if (!['warning', 'noise'].includes(scene.kind)) {
        await page.getByRole('button', { name: '다음 대사', exact: true }).click();
      }
      await expect(stage).not.toHaveAttribute('data-scene-id', id);
    }
    await page.getByRole('button', { name: '후기 남기기', exact: true }).click();
    await expect(page.getByText('컨펌용 · 응답을 저장하거나 전송하지 않습니다.')).toBeVisible();
    await page.getByRole('textbox', { name: '서술형 후기' }).fill('검토용 테스트 후기');
    await page.getByRole('button', { name: '등록', exact: true }).click();
    await expect(page.getByText('검토용 테스트 후기', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);
    expect(errors).toEqual([]);
  } finally { await new Promise(accept => server.close(accept)); }
});
