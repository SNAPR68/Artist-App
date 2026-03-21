import { test, expect, Page } from '@playwright/test';

/**
 * End-to-end test for artist onboarding flow
 * Tests: Signup → Profile Setup → Calendar Setup → Availability
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEST_ARTIST_EMAIL = `artist-${Date.now()}@example.com`;
const TEST_ARTIST_PASSWORD = 'ArtistPassword123!';

test.describe('Artist Onboarding E2E', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto(BASE_URL);
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('should complete artist onboarding: signup -> profile -> calendar -> availability', async () => {
    // Step 1: Navigate to signup
    await test.step('Navigate to artist signup', async () => {
      // Click signup link
      await page.click('a:has-text("Sign Up"), button:has-text("Get Started")');
      await expect(page).toHaveURL(/.*signup|.*register/);

      // Select artist role
      await page.click('text=I\'m an Artist');
      await page.waitForLoadState('networkidle');
    });

    // Step 2: Create account
    await test.step('Create artist account', async () => {
      // Fill signup form
      await page.fill('input[placeholder*="Email"], input[type="email"]', TEST_ARTIST_EMAIL);
      await page.fill('input[placeholder*="Password"], input[type="password"]', TEST_ARTIST_PASSWORD);
      await page.fill('input[placeholder*="Confirm"], input[placeholder*="password"]', TEST_ARTIST_PASSWORD);

      // Accept terms
      const checkbox = page.locator('input[type="checkbox"]');
      if (await checkbox.isVisible()) {
        await checkbox.check();
      }

      // Submit signup
      await page.click('button:has-text("Sign Up"), button:has-text("Create Account")');

      // Wait for redirect to onboarding
      await page.waitForURL(/.*onboarding|.*profile|.*setup/, { timeout: 10000 });
    });

    // Step 3: Complete profile setup
    await test.step('Complete artist profile', async () => {
      // Fill basic info
      await page.fill('input[placeholder*="First Name"]', 'Rajeev');
      await page.fill('input[placeholder*="Last Name"]', 'Kumar');

      // Add bio
      await page.fill('textarea[placeholder*="Bio"]', 'Professional singer with 10 years of experience in Bollywood');

      // Select genres
      await page.click('[data-testid="genre-select"], select[name="genres"]');
      await page.click('text=Bollywood');
      await page.click('text=Classical');

      // Add profile picture
      const fileInput = page.locator('input[type="file"]').first();
      if (await fileInput.isVisible()) {
        // Create a small test image
        const imagePath = '/tmp/test-artist.png';
        // For now, we'll skip file upload in test
      }

      // Click next/continue
      await page.click('button:has-text("Continue"), button:has-text("Next")');
      await page.waitForLoadState('networkidle');
    });

    // Step 4: Setup pricing and services
    await test.step('Configure pricing and services', async () => {
      // Set hourly rate
      await page.fill('input[placeholder*="Rate"], input[placeholder*="price"]', '5000');

      // Select service types
      const checkboxes = page.locator('input[type="checkbox"]');
      await checkboxes.first().check();

      // Add performance history
      await page.fill('textarea[placeholder*="Experience"]', '- Performed at 100+ weddings and events');

      // Click continue
      await page.click('button:has-text("Continue"), button:has-text("Next")');
      await page.waitForLoadState('networkidle');
    });

    // Step 5: Setup calendar and availability
    await test.step('Setup calendar and availability', async () => {
      // Enable availability calendar
      const calendarToggle = page.locator('[data-testid="calendar-toggle"], input[type="checkbox"][name="enable-calendar"]');
      if (await calendarToggle.isVisible()) {
        await calendarToggle.check();
      }

      // Set available days
      const mondayCheckbox = page.locator('input[value="monday"]');
      if (await mondayCheckbox.isVisible()) {
        await mondayCheckbox.check();
      }

      // Set time slots
      const startTime = page.locator('input[placeholder*="Start Time"], input[type="time"]').first();
      if (await startTime.isVisible()) {
        await startTime.fill('09:00');
      }

      const endTime = page.locator('input[placeholder*="End Time"], input[type="time"]').last();
      if (await endTime.isVisible()) {
        await endTime.fill('21:00');
      }

      // Mark calendar as setup
      await page.click('button:has-text("Continue"), button:has-text("Next")');
      await page.waitForLoadState('networkidle');
    });

    // Step 6: Verify onboarding completion
    await test.step('Verify onboarding completed', async () => {
      // Should redirect to artist dashboard
      await expect(page).toHaveURL(/.*artist.*|.*dashboard/);

      // Verify we're logged in
      const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign Out")');
      await expect(logoutButton).toBeVisible();

      // Verify profile data is saved
      const profileName = page.locator('text=Rajeev Kumar');
      await expect(profileName).toBeVisible({ timeout: 5000 });
    });
  });

  test('should handle calendar setup and time slots', async () => {
    // Navigate to onboarding
    await page.goto(`${BASE_URL}/onboarding/calendar`);

    // Set multiple time slots
    await test.step('Setup multiple time slots', async () => {
      // Add first slot
      await page.click('button:has-text("Add Time Slot")');
      const startInputs = page.locator('input[type="time"]');
      await startInputs.first().fill('09:00');
      await startInputs.nth(1).fill('12:00');

      // Add second slot
      await page.click('button:has-text("Add Time Slot")');
      const secondSlotInputs = page.locator('input[type="time"]');
      await secondSlotInputs.nth(2).fill('14:00');
      await secondSlotInputs.nth(3).fill('18:00');

      // Save slots
      await page.click('button:has-text("Save Availability")');

      // Verify save
      await expect(page.locator('text=Saved')).toBeVisible({ timeout: 5000 });
    });
  });

  test('should allow editing profile after onboarding', async () => {
    // Login as artist
    await page.click('a:has-text("Sign In")');
    await page.fill('input[type="email"]', TEST_ARTIST_EMAIL);
    await page.fill('input[type="password"]', TEST_ARTIST_PASSWORD);
    await page.click('button:has-text("Sign In")');
    await page.waitForURL(/.*artist/);

    // Navigate to profile settings
    await page.click('a:has-text("Settings"), a:has-text("Profile")');
    await expect(page).toHaveURL(/.*settings|.*profile/);

    // Edit profile
    await page.click('button:has-text("Edit")');

    // Update bio
    const bioField = page.locator('textarea[placeholder*="Bio"]');
    await bioField.fill('Updated: Professional singer with 15 years of experience');

    // Save changes
    await page.click('button:has-text("Save"), button:has-text("Update")');

    // Verify save
    await expect(page.locator('text=Updated')).toBeVisible({ timeout: 5000 });
  });
});
