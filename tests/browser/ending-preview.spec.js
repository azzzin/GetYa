import { test, expect } from '@playwright/test';

async function clickBubble(page) {
  const rect = await page.getByRole('button', { name: '다음 대사', exact: true }).boundingBox();
  // Left side of the speech bubble, well away from the triangle at bottom right.
  await page.mouse.click(rect.x + rect.width * 0.25, rect.y + rect.height * 0.4);
}

for (const route of ['career', 'friend']) {
  test(`${route} local ending reveals characters and supports skip without advancing`, async ({ page }) => {
    const ids = route === 'career' ? ['1:1624', '1:1688', '1:1752'] : ['1:665', '1:729', '1:793'];
    await page.goto(`/?endingPreview=${route}`);
    await expect(page.locator('.game-stage')).toHaveAttribute('data-scene-id', ids[0]);
    await expect(page.locator('.ending-preview-bar')).toBeVisible();
    await expect.poll(() => page.locator('.ending-letter.is-visible').count()).toBeGreaterThan(0);
    const total = await page.locator('.ending-letter').count();
    const partial = await page.locator('.ending-letter.is-visible').count();
    expect(partial).toBeLessThan(total);
    await page.screenshot({ path: `artifacts/screenshots/ending-${route}-typing.png` });
    await expect.poll(() => page.locator('.ending-letter.is-visible').count()).toBeGreaterThan(partial);
    await clickBubble(page);
    await expect(page.locator('.game-stage')).toHaveAttribute('data-scene-id', ids[0]);
    await expect(page.locator('.game-stage')).toHaveAttribute('data-typing', 'false');
    await expect(page.locator('.ending-letter.is-visible')).toHaveCount(total);
    await page.waitForTimeout(180);
    await expect(page.locator('.ending-letter.is-visible')).toHaveCount(total);
    await page.screenshot({ path: `artifacts/screenshots/ending-${route}-complete.png` });
    await clickBubble(page);
    await expect(page.locator('.game-stage')).toHaveAttribute('data-scene-id', ids[1]);
    await expect(page.locator('.game-stage')).toHaveAttribute('data-typing', 'true');
    await page.keyboard.press('Enter');
    await expect(page.locator('.game-stage')).toHaveAttribute('data-typing', 'false');
    await page.keyboard.press('Enter');
    await expect(page.locator('.game-stage')).toHaveAttribute('data-scene-id', ids[2]);
    await expect(page.locator('.game-stage')).toHaveAttribute('data-typing', 'true');
    await page.keyboard.press('Enter');
    await expect(page.locator('.game-stage')).toHaveAttribute('data-typing', 'false');
    await page.getByRole('button', { name: '다시 하기', exact: true }).click();
    await expect(page.locator('.game-stage')).toHaveAttribute('data-scene-id', '1:295');
    await expect(page.locator('.ending-letter')).toHaveCount(0);
  });
}

test('regular local play starts normally without the ending preview', async ({ page }) => {
  await page.goto('/?version=mvp');
  await expect(page.locator('.game-stage')).toHaveAttribute('data-scene-id', '1:295');
  await expect(page.locator('.ending-preview-bar')).toHaveCount(0);
});
