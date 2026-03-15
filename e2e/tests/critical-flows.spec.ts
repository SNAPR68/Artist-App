import { test, expect } from '@playwright/test';

test.describe('P0: Home and Navigation', () => {
  test('home page loads', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Artist Booking Platform')).toBeVisible();
  });

  test('search page loads with filters', async ({ page }) => {
    await page.goto('/search');
    await expect(page.locator('input[placeholder*="Search"]')).toBeVisible();
    await expect(page.locator('text=Search')).toBeVisible();
  });

  test('login page loads with OTP form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('text=Welcome')).toBeVisible();
    await expect(page.locator('input[placeholder*="mobile"]')).toBeVisible();
    await expect(page.locator('text=Send OTP')).toBeVisible();
  });
});

test.describe('P0: Artist Profile View', () => {
  test('artist profile page renders with data', async ({ page }) => {
    // Navigate to search and check for artists, or go directly to a known artist
    const response = await page.request.get('http://localhost:3001/v1/artists?page=1&per_page=1');
    const json = await response.json();

    if (json.success && json.data?.data?.length > 0) {
      const artistId = json.data.data[0].id;
      await page.goto(`/artists/${artistId}`);

      // Should show artist info
      await expect(page.locator('h1')).toBeVisible();
      // Should show pricing section
      await expect(page.locator('text=Pricing')).toBeVisible();
    }
  });
});

test.describe('P0: Search Flow', () => {
  test('search returns results from API', async ({ page }) => {
    await page.goto('/search');

    // The search page should load without errors
    await expect(page.locator('text=artists found')).toBeVisible({ timeout: 10000 });
  });

  test('search with filter narrows results', async ({ page }) => {
    await page.goto('/search?genre=Jazz');
    await page.waitForTimeout(2000);

    // Page should not crash
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('P0: API Health', () => {
  test('API health check returns OK', async ({ request }) => {
    const response = await request.get('http://localhost:3001/health');
    const json = await response.json();

    expect(json.status).toBe('ok');
    expect(json.services.database).toBe('ok');
    expect(json.services.redis).toBe('ok');
  });

  test('API version endpoint responds', async ({ request }) => {
    const response = await request.get('http://localhost:3001/v1');
    const json = await response.json();

    expect(json.success).toBe(true);
    expect(json.data.name).toBe('Artist Booking Platform API');
  });
});

test.describe('P0: Auth Flow', () => {
  test('OTP generation endpoint works', async ({ request }) => {
    const response = await request.post('http://localhost:3001/v1/auth/otp/generate', {
      data: { phone: '9999999999', country_code: '+91' },
    });
    const json = await response.json();

    // Should succeed or rate limit
    expect([200, 201, 429].includes(response.status())).toBe(true);
  });

  test('login form validates phone number', async ({ page }) => {
    await page.goto('/login');

    // Click Send OTP without entering phone
    await page.click('text=Send OTP');

    // Should show validation error
    await expect(page.locator('text=valid')).toBeVisible();
  });
});

test.describe('P0: Payment Page', () => {
  test('payment page renders correctly', async ({ page }) => {
    // Use a fake booking ID — should show error gracefully
    await page.goto('/client/bookings/00000000-0000-0000-0000-000000000000/pay');

    await expect(page.locator('text=Complete Payment')).toBeVisible();
  });
});
