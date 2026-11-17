import { test, expect } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

test('published root serves the latest design and preserves the MVP comparison', async ({ page }) => {
  const root = resolve('dist');
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.ttf': 'font/ttf' };
  const server = createServer(async (request, response) => {
    const path = new URL(request.url, 'http://localhost').pathname;
    if (!path.startsWith('/GetYa/')) { response.writeHead(404).end(); return; }
    const relative = decodeURIComponent(path.slice('/GetYa/'.length));
    const file = resolve(root, relative.endsWith('/') || !relative ? relative + 'index.html' : relative);
    if (!file.startsWith(root + sep)) { response.writeHead(404).end(); return; }
    try { response.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' }).end(await readFile(file)); }
    catch { response.writeHead(404).end(); }
  });
  await new Promise(accept => server.listen(0, '127.0.0.1', accept));
  try {
    const origin = `http://127.0.0.1:${server.address().port}/GetYa/`;
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin + '?version=mvp');
    await expect(page.locator('.game-stage')).toHaveAttribute('data-scene-id', '1:295');
    await page.goto(origin);
    await expect(page.locator('.game-stage')).toHaveAttribute('data-scene-id', '32:703');
    await page.getByRole('button', { name: '게임 시작', exact: true }).first().click();
    await page.getByRole('button', { name: '친구', exact: true }).click();
    await expect(page.locator('.game-stage')).toHaveAttribute('data-scene-id', '32:403');
    await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(img => img.decode())); });
    expect(await page.evaluate(() => [...document.images].every(img => img.naturalWidth > 0))).toBe(true);
    expect(errors).toEqual([]);
  } finally { await new Promise(accept => server.close(accept)); }
});
