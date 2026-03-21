import { test, expect, Page } from '@playwright/test';

/**
 * End-to-end test for complete booking flow
 * Tests: Login → Search → Book → Pay → Review
 */

const TEST_USER_EMAIL = 'test-client@example.com';
const TEST_USER_PASSWORD = 'TestPassword123!';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Booking Flow E2E', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto(BASE_URL);
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('should complete full booking flow: login -> search -> book -> pay -> review', async () => {
    // Step 1: Login
    await test.step('Login to the platform', async () => {
      // Click on login button
      await page.click('a:has-text("Sign In")');
      await expect(page).toHaveURL(/.*login/);

      // Enter credentials
      await page.fill('input[type="email"]', TEST_USER_EMAIL);
      await page.fill('input[type="password"]', TEST_USER_PASSWORD);

      // Submit login
      await page.click('button:has-text("Sign In")');

      // Wait for redirect to dashboard
      await page.waitForURL(/.*client.*/, { timeout: 10000 });
      await expect(page).toHaveURL(/.*client/);
    });

    // Step 2: Search for artists
    await test.step('Search for available artists', async () => {
      // Navigate to search/discovery
      await page.click('a:has-text("Search")');
      await expect(page).toHaveURL(/.*search/);

      // Fill search form
      await page.fill('input[placeholder*="Search"]', 'Singer');
      await page.click('button:has-text("Search")');

      // Wait for search results
      await page.waitForLoadState('networkidle');
      const results = await page.locator('[data-testid="artist-card"]').count();
      expect(results).toBeGreaterThan(0);
    });

    // Step 3: Select an artist and initiate booking
    await test.step('Select artist and start booking', async () => {
      // Click first artist
      const firstArtist = page.locator('[data-testid="artist-card"]').first();
      await firstArtist.click();

      // Wait for artist profile to load
      await page.waitForURL(/.*artist.*/, { timeout: 5000 });

      // Click book now button
      await page.click('button:has-text("Book Now")');
      await expect(page).toHaveURL(/.*booking.*|.*checkout.*/);
    });

    // Step 4: Fill booking details
    await test.step('Fill booking details', async () => {
      // Fill event date
      await page.fill('input[type="date"]', '2025-06-15');

      // Fill duration
      await page.fill('input[placeholder*="Duration"]', '2');

      // Select event type
      await page.click('select, [role="combobox"]');
      await page.click('text=Wedding');

      // Fill event location
      await page.fill('input[placeholder*="Location"]', 'New Delhi');

      // Add notes
      await page.fill('textarea', 'Please bring your own sound system');

      // Click continue
      await page.click('button:has-text("Continue")');
      await page.waitForLoadState('networkidle');
    });

    // Step 5: Payment
    await test.step('Complete payment', async () => {
      // Verify we're on payment page
      expect(page.url()).toContain('payment') || expect(page.url()).toContain('checkout');

      // Fill payment details (using test card)
      // For Razorpay test mode
      const cardNumberInput = page.locator('input[placeholder*="Card"]').first();
      if (await cardNumberInput.isVisible()) {
        await cardNumberInput.fill('4111111111111111');
        await page.fill('input[placeholder*="Expiry"]', '12/25');
        await page.fill('input[placeholder*="CVV"]', '123');
      }

      // Click pay button
      await page.click('button:has-text("Pay"), button:has-text("Complete Payment")');

      // Wait for payment confirmation
      await page.waitForURL(/.*confirmation.*|.*success.*/, { timeout: 15000 });
    });

    // Step 6: Review booking
    await test.step('Verify booking confirmation', async () => {
      // Check for success message
      const successMessage = page.locator('[data-testid="success-message"]');
      await expect(successMessage).toBeVisible();

      // Verify booking details are displayed
      await expect(page.locator('text=Booking Confirmed')).toBeVisible();
      await expect(page.locator('text=Booking ID')).toBeVisible();

      // Check for booking reference
      const bookingId = await page.locator('[data-testid="booking-id"]').textContent();
      expect(bookingId).toBeTruthy();

      // Verify artist details are shown
      await expect(page.locator('text=Artist')).toBeVisible();
    });

    // Step 7: Verify booking in dashboard
    await test.step('Verify booking appears in dashboard', async () => {
      // Navigate to bookings
      await page.click('a:has-text("Bookings")');
      await expect(page).toHaveURL(/.*bookings/);

      // Check for recent booking
      const bookingCards = page.locator('[data-testid="booking-card"]');
      const count = await bookingCards.count();
      expect(count).toBeGreaterThan(0);

      // Verify booking status is "Confirmed"
      const statusText = await page.locator('[data-testid="booking-status"]').first().textContent();
      expect(statusText).toContain('Confirmed');
    });
  });

  test('should handle booking cancellation', async () => {
    // Login first
    await page.click('a:has-text("Sign In")');
    await page.fill('input[type="email"]', TEST_USER_EMAIL);
    await page.fill('input[type="password"]', TEST_USER_PASSWORD);
    await page.click('button:has-text("Sign In")');
    await page.waitForURL(/.*client.*/);

    // Navigate to bookings
    await page.click('a:has-text("Bookings")');
    await expect(page).toHaveURL(/.*bookings/);

    // Find and click cancel on most recent booking
    const firstBooking = page.locator('[data-testid="booking-card"]').first();
    await firstBooking.click();

    // Click cancel button
    await page.click('button:has-text("Cancel Booking")');

    // Confirm cancellation
    const confirmButton = page.locator('button:has-text("Confirm")');
    await confirmButton.click();

    // Verify cancellation
    await page.waitForURL(/.*bookings.*/, { timeout: 5000 });
    const statusAfterCancel = await page.locator('[data-testid="booking-status"]').first().textContent();
    expect(statusAfterCancel).toContain('Cancelled');
  });

  test('should handle booking modification', async () => {
    // Login
    await page.click('a:has-text("Sign In")');
    await page.fill('input[type="email"]', TEST_USER_EMAIL);
    await page.fill('input[type="password"]', TEST_USER_PASSWORD);
    await page.click('button:has-text("Sign In")');
    await page.waitForURL(/.*client.*/);

    // Navigate to bookings
    await page.click('a:has-text("Bookings")');

    // Open first booking
    const firstBooking = page.locator('[data-testid="booking-card"]').first();
    await firstBooking.click();

    // Click edit button
    await page.click('button:has-text("Edit")');

    // Modify event details
    await page.fill('input[type="date"]', '2025-07-20');
    await page.fill('input[placeholder*="Duration"]', '3');

    // Save changes
    await page.click('button:has-text("Save Changes")');

    // Verify update
    await page.waitForURL(/.*bookings.*/, { timeout: 5000 });
    expect(page.url()).toContain('bookings');
  });
});
