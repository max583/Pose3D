import { expect, test } from '@playwright/test';

const CANVAS_SELECTOR = 'canvas';

type Point = { x: number; y: number };

test('FootController right-foot gizmo accepts left drag in focus mode and undo', async ({ page }) => {
  await openNormalCollapsedFrontView(page);
  await selectElementAny(page, [
    { x: 356, y: 465 },
    { x: 350, y: 465 },
    { x: 344, y: 465 },
    { x: 356, y: 470 },
    { x: 338, y: 465 },
  ], 'Правая стопа');

  await enterFocusMode(page);
  const canvas = page.locator(CANVAS_SELECTOR);
  const beforeDrag = await canvas.screenshot();

  await dragPath(page, [
    { x: 343, y: 452 },
    { x: 365, y: 438 },
    { x: 386, y: 429 },
    { x: 405, y: 425 },
  ]);

  const afterDrag = await canvas.screenshot();
  expect(buffersDiffer(beforeDrag, afterDrag)).toBe(true);

  await page.keyboard.press('Control+Z');
  await page.waitForTimeout(350);
  const afterUndo = await canvas.screenshot();
  expect(buffersDiffer(afterDrag, afterUndo)).toBe(true);
});

test('PelvisController root gizmo accepts left drag in focus mode and undo', async ({ page }) => {
  await openNormalCollapsedFrontView(page);
  await selectElement(page, { x: 314, y: 310 }, 'Таз');

  await enterFocusMode(page);
  const canvas = page.locator(CANVAS_SELECTOR);
  const beforeDrag = await canvas.screenshot();

  await dragPath(page, [
    { x: 300, y: 318 },
    { x: 300, y: 292 },
    { x: 300, y: 266 },
    { x: 300, y: 240 },
  ]);

  const afterDrag = await canvas.screenshot();
  expect(buffersDiffer(beforeDrag, afterDrag)).toBe(true);

  await page.keyboard.press('Control+Z');
  await page.waitForTimeout(350);
  const afterUndo = await canvas.screenshot();
  expect(buffersDiffer(afterDrag, afterUndo)).toBe(true);
});

async function openNormalCollapsedFrontView(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await expect(page).toHaveTitle(/PoseFlow Editor/);
  await expect(page.locator(CANVAS_SELECTOR)).toBeVisible();
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(700);

  const collapse = page.locator('.sidebar-collapse');
  if (await collapse.count()) {
    await collapse.click();
    await expect(page.locator('.sidebar')).toHaveCount(0);
    await expect(page.locator('.sidebar-restore')).toHaveCount(1);
  }

  await clickCameraButton(page, 'Front View');
}

async function clickCameraButton(page: import('@playwright/test').Page, title: string): Promise<void> {
  const button = page.locator(`button[title="${title}"]`);
  await expect(button).toHaveCount(1);
  await button.click();
  await page.waitForTimeout(700);
}

async function selectElement(
  page: import('@playwright/test').Page,
  point: Point,
  expectedLabel: string,
): Promise<void> {
  await page.mouse.click(point.x, point.y);
  await expect(page.locator('.selected-element-info')).toContainText(expectedLabel);
}

async function selectElementAny(
  page: import('@playwright/test').Page,
  points: Point[],
  expectedLabel: string,
): Promise<void> {
  for (const point of points) {
    await page.mouse.click(point.x, point.y);
    await page.waitForTimeout(250);
    const label = page.locator('.selected-element-info');
    if (await label.count()) {
      const text = await label.textContent();
      if (text?.includes(expectedLabel)) return;
    }
  }

  await expect(page.locator('.selected-element-info')).toContainText(expectedLabel);
}

async function enterFocusMode(page: import('@playwright/test').Page): Promise<void> {
  await page.keyboard.press('F11');
  await expect(page.locator('.app-focus-mode')).toBeVisible();
  await expect(page.locator('.camera-controls')).toHaveCount(0);
  await page.waitForTimeout(700);
}

async function dragPath(page: import('@playwright/test').Page, path: Point[]): Promise<void> {
  const [start, ...rest] = path;
  await page.mouse.move(start.x, start.y);
  await page.mouse.down({ button: 'left' });
  for (const point of rest) {
    await page.mouse.move(point.x, point.y, { steps: 8 });
  }
  await page.mouse.up({ button: 'left' });
  await page.waitForTimeout(500);
}

function buffersDiffer(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) return true;
  return !a.equals(b);
}
