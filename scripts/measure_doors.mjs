// Measure visible dark door-frame bounds, excluding transparent PNG padding.
import { chromium } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
const assets = [
  '33dea9ce-f866-42c5-a391-67e14772f796.png',
  '987c9697-34df-47b7-868f-5643ee0dc192.png',
  '5feb869b-3dcb-486f-b24f-1ff1813d45bc.png',
  '57a1e8d3-40b1-4340-8afc-aec07384dfd3.png',
];
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
try {
  const page = await browser.newPage();
  const geometry = {};
  for (const name of assets) {
    const bytes = await readFile(new URL('../public/assets/' + name, import.meta.url));
    geometry['/assets/' + name] = await page.evaluate(async src => {
      const image = new Image(); image.src = src; await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.width; canvas.height = image.height;
      const context = canvas.getContext('2d'); context.drawImage(image, 0, 0);
      const { data } = context.getImageData(0, 0, image.width, image.height);
      let left = image.width, top = image.height, right = 0, bottom = 0;
      for (let y = 0; y < image.height; y++) for (let x = 0; x < image.width; x++) {
        const i = (y * image.width + x) * 4;
        if (data[i + 3] > 200 && data[i] < 60 && data[i + 1] < 60 && data[i + 2] < 75) {
          left = Math.min(left, x); top = Math.min(top, y);
          right = Math.max(right, x); bottom = Math.max(bottom, y);
        }
      }
      return { width: image.width, height: image.height, frame: [left, top, right - left + 1, bottom - top + 1] };
    }, 'data:image/png;base64,' + bytes.toString('base64'));
  }
  await writeFile(new URL('../src/data/doorGeometry.json', import.meta.url), JSON.stringify(geometry, null, 2) + '\n');
  console.log(geometry);
} finally { await browser.close(); }
