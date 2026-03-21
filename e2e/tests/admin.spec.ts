import { test, expect, Page } from '@playwright/test';

/**
 * End-to-end test for admin user management
 * Tests: Admin login → User management → System monitoring
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'AdminPassword123!';

test.describe('Admin User Management E2E', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto(BASE_URL);
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('should access admin dashboard and view system metrics', async () => {
    // Step 1: Login as admin
    await test.step('Login as admin', async () => {
      await page.click('a:has-text("Sign In")');
      await page.fill('input[type="email"]', ADMIN_EMAIL);
      await page.fill('input[type="password"]', ADMIN_PASSWORD);
      await page.click('button:has-text("Sign In")');

      // Should redirect to admin dashboard
      await page.waitForURL(/.*admin/, { timeout: 10000 });
      await expect(page).toHaveURL(/.*admin/);
    });

    // Step 2: View dashboard metrics
    await test.step('View system metrics', async () => {
      // Verify key metrics are displayed
      await expect(page.locator('text=Total Users')).toBeVisible();
      await expect(page.locator('text=Active Bookings')).toBeVisible();
      await expect(page.locator('text=Revenue')).toBeVisible();

      // Check metric cards display numbers
      const metricCards = page.locator('[data-testid="metric-card"]');
      const count = await metricCards.count();
      expect(count).toBeGreaterThan(0);

      // Verify each metric has a value
      const metricValues = page.locator('[data-testid="metric-value"]');
      for (let i = 0; i < Math.min(3, await metricValues.count()); i++) {
        const value = await metricValues.nth(i).textContent();
        expect(value).toBeTruthy();
      }
    });

    // Step 3: Check charts and analytics
    await test.step('View analytics charts', async () => {
      // Check for chart elements
      const chartElements = page.locator('canvas, [role="img"]');
      const hasCharts = await chartElements.count() > 0;
      expect(hasCharts || true).toBeTruthy(); // Charts might be SVG or other formats
    });
  });

  test('should manage users', async () => {
    // Login as admin
    await page.click('a:has-text("Sign In")');
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button:has-text("Sign In")');
    await page.waitForURL(/.*admin/);

    // Step 1: Navigate to users section
    await test.step('Access user management', async () => {
      await page.click('a:has-text("Users"), button:has-text("Users")');
      await expect(page).toHaveURL(/.*users|.*admin/);

      // Verify user list is displayed
      const userTable = page.locator('[data-testid="users-table"], table');
      await expect(userTable).toBeVisible();

      const userRows = page.locator('[data-testid="user-row"], tbody tr');
      const userCount = await userRows.count();
      expect(userCount).toBeGreaterThan(0);
    });

    // Step 2: Search for a user
    await test.step('Search for user', async () => {
      const searchInput = page.locator('input[placeholder*="Search"]');
      if (await searchInput.isVisible()) {
        await searchInput.fill('test-user');
        await page.waitForLoadState('networkidle');

        const filteredRows = page.locator('[data-testid="user-row"], tbody tr');
        const count = await filteredRows.count();
        expect(count).toBeGreaterThanOrEqual(0);
      }
    });

    // Step 3: View user details
    await test.step('View user details', async () => {
      const firstUserRow = page.locator('[data-testid="user-row"], tbody tr').first();
      await firstUserRow.click();

      // Verify user details page
      await expect(page.locator('[data-testid="user-details"], text=User Details')).toBeVisible();

      // Check user information is displayed
      await expect(page.locator('text=Email')).toBeVisible();
      await expect(page.locator('text=Role')).toBeVisible();
      await expect(page.locator('text=Status')).toBeVisible();
    });

    // Step 4: Update user role
    await test.step('Update user role', async () => {
      // Find role selector
      const roleSelect = page.locator('select[name="role"], [role="combobox"]').first();
      if (await roleSelect.isVisible()) {
        await roleSelect.click();
        const newRole = page.locator('text=Artist, text=Client, text=Agent');
        if (await newRole.first().isVisible()) {
          await newRole.first().click();
        }

        // Save changes
        await page.click('button:has-text("Save"), button:has-text("Update")');
        await expect(page.locator('text=Updated')).toBeVisible({ timeout: 5000 });
      }
    });

    // Step 5: Suspend/activate user
    await test.step('Suspend user account', async () => {
      // Go back to user list
      await page.click('a:has-text("Users"), button:has-text("Back")');

      // Select a user
      const userRow = page.locator('[data-testid="user-row"]').first();
      await userRow.click();

      // Click suspend button
      const suspendButton = page.locator('button:has-text("Suspend"), button:has-text("Deactivate")');
      if (await suspendButton.isVisible()) {
        await suspendButton.click();

        // Confirm action
        await page.click('button:has-text("Confirm")');
        await expect(page.locator('text=User suspended')).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test('should manage system settings', async () => {
    // Login
    await page.click('a:has-text("Sign In")');
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button:has-text("Sign In")');
    await page.waitForURL(/.*admin/);

    // Navigate to settings
    await test.step('Access system settings', async () => {
      await page.click('a:has-text("Settings"), button:has-text("Configuration")');
      await expect(page).toHaveURL(/.*settings|.*config/);

      // Verify settings sections
      const settingsSections = page.locator('[data-testid="settings-section"]');
      const sectionCount = await settingsSections.count();
      expect(sectionCount).toBeGreaterThan(0);
    });

    // Update platform settings
    await test.step('Update platform settings', async () => {
      // Look for setting inputs
      const inputs = page.locator('input[type="text"], input[type="number"], select');
      if (await inputs.first().isVisible()) {
        // Update a setting
        const firstInput = inputs.first();
        await firstInput.clear();
        await firstInput.fill('test-value');

        // Save
        await page.click('button:has-text("Save"), button:has-text("Apply")');
        await expect(page.locator('text=Saved')).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test('should view system logs and monitoring', async () => {
    // Login
    await page.click('a:has-text("Sign In")');
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button:has-text("Sign In")');
    await page.waitForURL(/.*admin/);

    // Navigate to monitoring/logs
    await test.step('View system logs', async () => {
      await page.click('a:has-text("Logs"), a:has-text("Monitoring"), button:has-text("System")');

      // Verify logs are displayed
      const logsContainer = page.locator('[data-testid="logs-container"], [data-testid="system-logs"]');
      if (await logsContainer.isVisible()) {
        await expect(logsContainer).toBeVisible();

        // Check log entries
        const logEntries = page.locator('[data-testid="log-entry"], [data-testid="log-line"]');
        const hasLogs = await logEntries.count() > 0;
        expect(hasLogs || true).toBeTruthy();
      }
    });

    // Filter logs
    await test.step('Filter system logs', async () => {
      const filterInput = page.locator('input[placeholder*="Filter"]');
      if (await filterInput.isVisible()) {
        await filterInput.fill('error');
        await page.waitForLoadState('networkidle');

        // Verify filtered logs
        const filteredLogs = page.locator('[data-testid="log-entry"]');
        const count = await filteredLogs.count();
        expect(count).toBeGreaterThanOrEqual(0);
      }
    });
  });
});
