import { expect, test } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const CANVAS_SELECTOR = 'canvas';
const VIEWPORT_URL = '/?focus=1';

test('focus mode opens a clean 3D viewport for automation', async ({ page }) => {
  await page.goto(VIEWPORT_URL);
  await expect(page).toHaveTitle(/PoseFlow Editor/);

  await expect(page.locator('.app-focus-mode')).toBeVisible();
  await expect(page.locator('.app-header')).toHaveCount(0);
  await expect(page.locator('.sidebar')).toHaveCount(0);
  await expect(page.locator('.sidebar-restore')).toHaveCount(0);
  await expect(page.locator('.camera-controls')).toHaveCount(0);
  await expect(page.locator('.btn-show-export-frame')).toHaveCount(0);
  await expect(page.locator('.status-bar')).toHaveCount(0);

  const canvas = page.locator(CANVAS_SELECTOR);
  await expect(canvas).toBeVisible();
});

test('F11 toggles focus mode panels without persisting sidebar state', async ({ page }) => {
  const initialViewport = page.viewportSize();
  await page.goto('/');
  await expect(page).toHaveTitle(/PoseFlow Editor/);
  await expect(page.locator('.app-focus-mode')).toHaveCount(0);
  await expect(page.locator('.sidebar, .sidebar-restore')).toHaveCount(1);

  await page.keyboard.press('F11');
  await page.setViewportSize({ width: 1600, height: 900 });
  await expect(page.locator('.app-focus-mode')).toBeVisible();
  await expect(page.locator('.sidebar')).toHaveCount(0);
  await expect(page.locator('.sidebar-restore')).toHaveCount(0);
  await expect(page.locator('.camera-controls')).toHaveCount(0);
  await expect(page.locator('.status-bar')).toHaveCount(0);

  await page.keyboard.press('F11');
  if (initialViewport) {
    await page.setViewportSize(initialViewport);
  }
  await expect(page.locator('.app-focus-mode')).toHaveCount(0);
  await expect(page.locator('.sidebar, .sidebar-restore')).toHaveCount(1);
  await expectElementInsideViewport(page, CANVAS_SELECTOR);
  await expectElementInsideViewport(page, '.camera-controls');
});

test('3D viewport accepts wheel zoom, right-button orbit and middle-button pan', async ({ page }, testInfo) => {
  await page.goto(VIEWPORT_URL);
  await expect(page).toHaveTitle(/PoseFlow Editor/);

  const canvas = page.locator(CANVAS_SELECTOR);
  await expect(canvas).toBeVisible();

  await page.waitForLoadState('domcontentloaded');
  await waitForCanvasToRender(page);

  const before = await canvas.screenshot();
  await saveArtifact(testInfo.outputPath('01-initial-canvas.png'), before);

  await page.mouse.move(315, 470);
  await page.mouse.wheel(0, -1_800);
  await page.waitForTimeout(250);
  const afterZoom = await canvas.screenshot();
  await saveArtifact(testInfo.outputPath('02-after-wheel-zoom.png'), afterZoom);
  expect(buffersDiffer(before, afterZoom)).toBe(true);

  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  const startX = box!.x + box!.width * 0.5;
  const startY = box!.y + box!.height * 0.5;
  const endX = box!.x + box!.width * 0.82;
  const endY = box!.y + box!.height * 0.72;

  await page.mouse.move(startX, startY);
  await page.mouse.down({ button: 'right' });
  await page.mouse.move(endX, endY, { steps: 14 });
  await page.mouse.up({ button: 'right' });
  await page.waitForTimeout(250);
  const afterOrbit = await canvas.screenshot();
  await saveArtifact(testInfo.outputPath('03-after-right-orbit.png'), afterOrbit);
  expect(buffersDiffer(afterZoom, afterOrbit)).toBe(true);

  await page.mouse.move(startX, startY);
  await page.mouse.down({ button: 'middle' });
  await page.mouse.move(startX, box!.y + box!.height * 0.22, { steps: 10 });
  await page.mouse.up({ button: 'middle' });
  await page.waitForTimeout(250);
  const afterPan = await canvas.screenshot();
  await saveArtifact(testInfo.outputPath('04-after-middle-pan.png'), afterPan);
  expect(buffersDiffer(afterOrbit, afterPan)).toBe(true);
});

async function waitForCanvasToRender(page: import('@playwright/test').Page): Promise<void> {
  await expect.poll(async () => {
    return page.locator(CANVAS_SELECTOR).count();
  }).toBe(1);

  await page.waitForTimeout(500);
}

async function saveArtifact(path: string, data: Buffer): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, data);
}

function buffersDiffer(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) return true;
  return !a.equals(b);
}

async function expectElementInsideViewport(page: import('@playwright/test').Page, selector: string): Promise<void> {
  const box = await page.locator(selector).boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width + 1);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport!.height + 1);
}
