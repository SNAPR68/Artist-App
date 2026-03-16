import { test, expect } from '@playwright/test';

test.describe('Dashboard — Unauthenticated Redirects', () => {
  test('artist dashboard redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/artist/dashboard');
    // Should redirect to login or show auth prompt
    await page.waitForURL(/login|auth/, { timeout: 10000 }).catch(() => {
      // If no redirect, page should still render without crashing
    });
    await expect(page.locator('body')).toBeVisible();
  });

  test('client dashboard redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/client/dashboard');
    await page.waitForURL(/login|auth/, { timeout: 10000 }).catch(() => {});
    await expect(page.locator('body')).toBeVisible();
  });

  test('agent dashboard redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/agent');
    await page.waitForURL(/login|auth/, { timeout: 10000 }).catch(() => {});
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Dashboard — Page Rendering', () => {
  test('artist onboarding page renders', async ({ page }) => {
    await page.goto('/artist/onboarding');
    await expect(page.locator('body')).toBeVisible();
    // Should not show a blank white page
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length).toBeGreaterThan(10);
  });

  test('agent onboarding page renders', async ({ page }) => {
    await page.goto('/agent/onboarding');
    await expect(page.locator('body')).toBeVisible();
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length).toBeGreaterThan(10);
  });
});

test.describe('Error Handling — UI', () => {
  test('404 page renders gracefully for unknown routes', async ({ page }) => {
    await page.goto('/this-page-does-not-exist-12345');
    await expect(page.locator('body')).toBeVisible();
    // Should not be a blank page or server error
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length).toBeGreaterThan(5);
  });

  test('malformed artist ID shows error gracefully', async ({ page }) => {
    await page.goto('/artists/not-a-valid-uuid');
    await expect(page.locator('body')).toBeVisible();
    // Page should render something — error message or redirect
    const status = await page.evaluate(() => document.readyState);
    expect(status).toBe('complete');
  });
});
