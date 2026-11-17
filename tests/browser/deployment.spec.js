import { test, expect } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { scenes } from '../../src/data/story.js';

test('production build loads fonts and game images from a GitHub Pages repository path', async ({ page }) => {
  const root = resolve('dist');
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.ttf': 'font/ttf' };
  const server = createServer(async (request, response) => {
    const path = new URL(request.url, 'http://localhost').pathname;
    if (!path.startsWith('/GetYa/')) { response.writeHead(404).end(); return; }
    const file = resolve(root, decodeURIComponent(path.slice('/GetYa/'.length)) || 'index.html');
    if (!file.startsWith(root + sep)) { response.writeHead(404).end(); return; }
    try {
      const content = await readFile(file);
      response.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' }).end(content);
    } catch { response.writeHead(404).end(); }
  });
  await new Promise(accept => server.listen(0, '127.0.0.1', accept));
  try {
    const failed = [];
    page.on('response', response => { if (response.status() >= 400 && !response.url().endsWith('/favicon.ico')) failed.push(response.url()); });
    await page.goto(`http://127.0.0.1:${server.address().port}/GetYa/?version=mvp`);
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map(image => image.decode()));
    });
    expect(await page.evaluate(() => [...document.fonts].every(font => font.status === 'loaded'))).toBe(true);
    await page.getByRole('button', { name: '게임 시작', exact: true }).first().click();
    await page.getByRole('button', { name: '진로 이야기 시작', exact: true }).click();
    await expect(page.locator('.game-stage')).toHaveAttribute('data-scene-id', '1:1054');
    await page.getByRole('button', { name: '다음 대사', exact: true }).click();
    await page.getByRole('button', { name: '다음 대사', exact: true }).click();
    await page.getByRole('button', { name: scenes['1:1441'].choices[0].label, exact: true }).hover();
    await page.evaluate(() => Promise.all([...document.images].map(image => image.decode())));
    expect(await page.locator('.visual-layers img').evaluateAll(images => images.every(image => new URL(image.src).pathname.startsWith('/GetYa/') && image.naturalWidth > 0))).toBe(true);
    expect(failed).toEqual([]);
  } finally { await new Promise(accept => server.close(accept)); }
});
