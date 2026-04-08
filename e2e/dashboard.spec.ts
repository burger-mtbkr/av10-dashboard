import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test('should load the dashboard page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Home Theater Status|Marantz AV10 Status/);
  });

  test('should show the app title in the header', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h4')).toContainText('Marantz AV10 Status');
  });

  test('should display connection status chips', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/AVR Connected|AVR Disconnected/)).toBeVisible();
    await expect(page.getByText(/Live|Offline/)).toBeVisible();
  });

  test('should render all dashboard cards', async ({ page }) => {
    await page.goto('/');

    // Wait for the page to fully render
    await page.waitForLoadState('networkidle');

    // Check all card titles are visible
    await expect(page.getByText('Speaker Configuration')).toBeVisible();
    await expect(page.getByText('Volume', { exact: true })).toBeVisible();
    await expect(page.getByText('Smart Select', { exact: true })).toBeVisible();
    await expect(page.getByText('Video Signal')).toBeVisible();
    await expect(page.getByText('Audio Signal')).toBeVisible();
    await expect(page.getByText('Subwoofer Settings')).toBeVisible();
    await expect(page.getByText('System Info')).toBeVisible();
  });

  test('should use dark theme', async ({ page }) => {
    await page.goto('/');

    // Check that the body has a dark background
    const bgColor = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });
    // Dark theme should have low luminance
    expect(bgColor).not.toBe('rgb(255, 255, 255)');
  });
});

test.describe('Responsive Design', () => {
  test('should render properly on mobile viewport', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile only');
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Cards should stack vertically on mobile
    await expect(page.getByText('Speaker Configuration')).toBeVisible();
    await expect(page.getByText('Volume', { exact: true })).toBeVisible();
  });
});

test.describe('API Health', () => {
  test('should return health status from API', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.status).toBe('ok');
    expect(body.timestamp).toBeTruthy();
  });

  test('should return settings from API', async ({ request }) => {
    const response = await request.get('/api/settings');
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.title).toBeTruthy();
    expect(body.defaultLanguage).toBe('en');
  });

  test('should return status from API', async ({ request }) => {
    const response = await request.get('/api/status');
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body).toHaveProperty('power');
    expect(body).toHaveProperty('volume');
    expect(body).toHaveProperty('muted');
    expect(body).toHaveProperty('input');
    expect(body).toHaveProperty('speakers');
    expect(body).toHaveProperty('video');
    expect(body).toHaveProperty('audio');
  });
});
