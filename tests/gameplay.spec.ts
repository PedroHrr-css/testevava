import { test, expect, type Page } from '@playwright/test';

async function newCareer(page: Page) {
  await page.goto('/');
  await page.locator('#manager-name').fill('Teste 3D');
  await page.locator('#start').click();
  await page.locator('[data-view="overview"]').click();
}

async function startMatch(page: Page) {
  await page.locator('[data-action="watch"]').click();
  await page.locator('[data-order="A"]').click();
  for (let step = 0; step < 9; step++) {
    if (await page.locator('[data-start]').count()) break;
    const side = page.locator('[data-side="attack"]');
    if (await side.count()) await side.click();
    else await page.locator('[data-map]:not(:disabled)').first().click();
  }
  await page.locator('[data-start]').click();
}

test('3D replay: camera modes, player switching, pause, audio, skip, save and mobile layout', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await newCareer(page);
  const before = await page.evaluate(() => JSON.parse(localStorage.getItem('tactical-career-v3')!));
  await startMatch(page);
  await expect(page.locator('.sim-canvas canvas')).toBeVisible();
  await expect(page.locator('.sim-pause')).toBeEnabled();
  await expect(page.locator('.sim-canvas')).toHaveAttribute('data-renderer', 'three');
  await expect(page.locator('.sim-status')).toContainText('ROUND 1');
  await page.locator('.sim-pause').click();
  await expect(page.locator('.sim-pause')).toHaveText('CONTINUAR');
  await page.locator('.sim-view-mode').selectOption('2d');
  await expect(page.locator('.sim-plan-view')).toBeVisible();
  await expect(page.locator('[data-plan-unit]')).toHaveCount(10);
  await page.locator('[data-plan-unit="9"]').click();
  await expect(page.locator('[data-roster="9"]')).toHaveAttribute('aria-pressed','true');
  await page.locator('.sim-camera-reset').click();
  await page.locator('.sim-view-mode').selectOption('3d');
  await expect(page.locator('.sim-canvas canvas')).toBeVisible();
  const pausedClock = await page.locator('.spike-clock').textContent();
  await page.waitForTimeout(400);
  await expect(page.locator('.spike-clock')).toHaveText(pausedClock!);
  await page.locator('.sim-player-prev').click();
  await expect(page.locator('[data-roster="9"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('.sim-player-next').click();
  await expect(page.locator('[data-roster="0"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('.sim-camera-reset').click();
  await page.locator('[data-roster="0"]').click();
  await expect(page.locator('[data-roster="0"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.sim-zoom')).toHaveValue('2');
  await expect(page.locator('.sim-canvas')).toHaveAttribute('data-camera-mode', 'follow');
  await expect(page.locator('.sim-player-card')).toBeVisible();
  await expect(page.locator('.sim-minimap')).toBeVisible();
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'test-results/match-follow-3d.png' });
  await page.locator('.sim-camera-mode').selectOption('player');
  await expect(page.locator('.sim-canvas')).toHaveAttribute('data-camera-mode', 'player');
  await expect(page.locator('.sim-reticle')).toBeVisible();
  await page.screenshot({ path: 'test-results/match-player-3d.png' });
  await page.locator('.sim-player-next').click();
  await expect(page.locator('[data-roster="1"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.sim-canvas')).toHaveAttribute('data-camera-mode', 'player');
  await page.locator('.sim-rotate-left').click();
  const canvas = await page.locator('.sim-canvas canvas').boundingBox();
  await page.mouse.move(canvas!.x + canvas!.width / 2, canvas!.y + canvas!.height / 2);
  await page.mouse.down();
  await page.mouse.move(canvas!.x + canvas!.width / 2 + 60, canvas!.y + canvas!.height / 2 + 25, { steps: 6 });
  await page.mouse.up();
  await expect(page.locator('[data-roster="1"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('.sim-camera-reset').click();
  await expect(page.locator('.sim-zoom')).toHaveValue('1');
  await expect(page.locator('.sim-canvas')).toHaveAttribute('data-camera-mode', 'tactical');
  await expect(page.locator('.sim-reticle')).toBeHidden();
  await page.locator('.sim-audio').click();
  await expect(page.locator('.sim-audio')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('.sim-speed').selectOption('4');
  await page.locator('.sim-pause').click();
  await expect(page.locator('.sim-feed > div').first()).toBeVisible({ timeout: 15_000 });
  await page.keyboard.press('Escape');
  await expect(page.locator('.sim-pause')).toHaveText('CONTINUAR');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.sim-canvas canvas')).toBeVisible();
  await page.screenshot({ path: 'test-results/match-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.screenshot({ path: 'test-results/match-desktop.png', fullPage: true });
  await page.locator('.sim-finish').click();
  await expect(page.locator('.match-overlay')).toHaveCount(0);
  const after = await page.evaluate(() => JSON.parse(localStorage.getItem('tactical-career-v3')!));
  expect(after.week).toBe(before.week + 1);
  expect(after.wins + after.losses).toBe(1);
  expect(after.players[0].stats.maps).toBeGreaterThanOrEqual(2);
  await page.reload();
  await expect(page.locator('.week')).toContainText('02');
  expect(errors).toEqual([]);
});

test('A failed 3D map load can still finish the match and save the result', async ({ page }) => {
  await newCareer(page);
  await page.route('**/*-plan.png', route => route.abort());
  await startMatch(page);
  await expect(page.locator('.sim-status')).toContainText('Não foi possível carregar o campo');
  await page.locator('.sim-finish').click();
  await expect(page.locator('.match-overlay')).toHaveCount(0);
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem('tactical-career-v3')!));
  expect(state.week).toBe(2);
  expect(state.wins + state.losses).toBe(1);
});

test('Skipping during loading completes the career once and removes the canvas', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/navigation.json', async route => {
    await new Promise(resolve => setTimeout(resolve, 500));
    await route.continue();
  });
  await newCareer(page);
  await startMatch(page);
  await page.locator('.sim-finish').click();
  await page.waitForTimeout(1000);
  await expect(page.locator('.match-overlay, .sim-canvas canvas')).toHaveCount(0);
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem('tactical-career-v3')!));
  expect(state.week).toBe(2);
  expect(state.wins + state.losses).toBe(1);
  expect(errors).toEqual([]);
});

test('1x gives time to read the action, and 4x accelerates the same replay', async ({page}) => {
  await newCareer(page);await startMatch(page);await expect(page.locator('.sim-canvas canvas')).toBeVisible();
  await page.locator('.sim-pause').click();await page.clock.install();
  await page.locator('.sim-pause').click();await page.clock.runFor(5000);
  await expect(page.locator('.sim-status')).toContainText('ROUND 1');
  const before=await page.locator('.sim-roster button b').allTextContents();expect(before.every(s=>s==='0 / 0')).toBe(true);
  await page.locator('.sim-speed').selectOption('4');await page.clock.runFor(10000);
  const after=await page.locator('.sim-roster button b').allTextContents();expect(after.some(s=>s!=='0 / 0')).toBe(true);
  await page.locator('.sim-finish').click();
});
