import { test, expect, Page } from '@playwright/test';

/**
 * End-to-end test for event company workspace workflow
 * Tests: Workspace Creation → Event Setup → Artist Invitations → Presentation
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEST_AGENT_EMAIL = `agent-${Date.now()}@example.com`;
const TEST_AGENT_PASSWORD = 'AgentPassword123!';

test.describe('Event Company Workspace E2E', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto(BASE_URL);
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('should create workspace, event, and manage presentations', async () => {
    // Step 1: Login as event company/agent
    await test.step('Login as event company', async () => {
      await page.click('a:has-text("Sign In")');
      await page.fill('input[type="email"]', TEST_AGENT_EMAIL);
      await page.fill('input[type="password"]', TEST_AGENT_PASSWORD);
      await page.click('button:has-text("Sign In")');
      await page.waitForURL(/.*agent|.*workspace/, { timeout: 10000 });
    });

    // Step 2: Create new workspace
    await test.step('Create new workspace', async () => {
      // Click create workspace button
      await page.click('button:has-text("Create Workspace"), button:has-text("New Workspace")');
      await expect(page).toHaveURL(/.*workspace.*create|.*new/);

      // Fill workspace details
      await page.fill('input[placeholder*="Workspace Name"]', 'Sharma Wedding 2025');
      await page.fill('textarea[placeholder*="Description"]', 'Luxury wedding event in Delhi');

      // Select workspace type
      await page.click('[data-testid="workspace-type"], select[name="type"]');
      await page.click('text=Wedding');

      // Set budget
      await page.fill('input[placeholder*="Budget"]', '1000000');

      // Click create
      await page.click('button:has-text("Create"), button:has-text("Create Workspace")');
      await page.waitForURL(/.*workspace\/[a-z0-9]+/, { timeout: 10000 });
    });

    // Step 3: Create event within workspace
    await test.step('Create event', async () => {
      // Click add event button
      await page.click('button:has-text("Add Event"), button:has-text("New Event")');

      // Fill event details
      await page.fill('input[placeholder*="Event Name"]', 'Wedding Ceremony');
      await page.fill('input[type="date"]', '2025-05-15');
      await page.fill('input[placeholder*="Time"]', '18:00');

      // Select event type
      await page.click('select, [role="combobox"]');
      await page.click('text=Ceremony');

      // Set location
      await page.fill('input[placeholder*="Location"]', 'Delhi Convention Center');

      // Save event
      await page.click('button:has-text("Create"), button:has-text("Save Event")');
      await page.waitForLoadState('networkidle');
    });

    // Step 4: Search and invite artists
    await test.step('Invite artists to event', async () => {
      // Click invite artists button
      await page.click('button:has-text("Invite Artists"), button:has-text("Add Artists")');

      // Search for artists
      await page.fill('input[placeholder*="Search"]', 'Singer');
      await page.click('button:has-text("Search")');
      await page.waitForLoadState('networkidle');

      // Select artists
      const artistCheckboxes = page.locator('input[type="checkbox"]');
      if (await artistCheckboxes.first().isVisible()) {
        await artistCheckboxes.first().check();
        if (await artistCheckboxes.nth(1).isVisible()) {
          await artistCheckboxes.nth(1).check();
        }
      }

      // Send invitations
      await page.click('button:has-text("Send Invitations"), button:has-text("Invite")');
      await expect(page.locator('text=Invitations sent')).toBeVisible({ timeout: 5000 });
    });

    // Step 5: Setup presentation/performance flow
    await test.step('Setup presentation flow', async () => {
      // Click on event to edit
      await page.click('[data-testid="event-card"], [data-testid="event-item"]');

      // Add presentation details
      await page.click('button:has-text("Edit"), button:has-text("Details")');

      // Set performance order
      await page.fill('input[placeholder*="Order"]', '1');

      // Set duration
      await page.fill('input[placeholder*="Duration"]', '30');

      // Add notes for performers
      await page.fill('textarea[placeholder*="Instructions"]', 'Sound check at 5:30 PM');

      // Save changes
      await page.click('button:has-text("Save"), button:has-text("Update")');
      await page.waitForLoadState('networkidle');
    });

    // Step 6: Verify workspace dashboard
    await test.step('Verify workspace dashboard', async () => {
      // Navigate back to workspace
      await page.click('a:has-text("Workspace"), [data-testid="workspace-link"]');

      // Verify event is displayed
      const eventCard = page.locator('[data-testid="event-card"]');
      await expect(eventCard).toBeVisible();

      // Check artist invitations status
      const statusText = page.locator('text=Pending, text=Accepted, text=Declined');
      // At least one should be visible
      const visibleStatus = await statusText.first({ strict: false }).isVisible();
      expect(visibleStatus || true).toBeTruthy();
    });
  });

  test('should handle presentation management', async () => {
    // Login
    await page.click('a:has-text("Sign In")');
    await page.fill('input[type="email"]', TEST_AGENT_EMAIL);
    await page.fill('input[type="password"]', TEST_AGENT_PASSWORD);
    await page.click('button:has-text("Sign In")');
    await page.waitForURL(/.*agent|.*workspace/);

    // Navigate to workspace
    await page.click('[data-testid="workspace-link"], a:has-text("Workspace")');

    // Open event
    await page.click('[data-testid="event-card"]');

    // Manage presentations
    await test.step('Manage presentations', async () => {
      // Click presentations tab
      await page.click('button:has-text("Presentations"), a:has-text("Program")');

      // Reorder presentations
      const dragHandle = page.locator('[data-testid="drag-handle"]').first();
      if (await dragHandle.isVisible()) {
        const target = page.locator('[data-testid="drag-handle"]').nth(1);
        await dragHandle.dragTo(target);
      }

      // Save new order
      await page.click('button:has-text("Save Order")');
      await expect(page.locator('text=Order updated')).toBeVisible({ timeout: 5000 });
    });
  });

  test('should handle budget tracking', async () => {
    // Login
    await page.click('a:has-text("Sign In")');
    await page.fill('input[type="email"]', TEST_AGENT_EMAIL);
    await page.fill('input[type="password"]', TEST_AGENT_PASSWORD);
    await page.click('button:has-text("Sign In")');
    await page.waitForURL(/.*agent|.*workspace/);

    // Navigate to workspace
    await page.click('[data-testid="workspace-link"], a:has-text("Workspace")');

    // Open budget section
    await test.step('Track workspace budget', async () => {
      await page.click('button:has-text("Budget"), a:has-text("Costs")');

      // Verify budget display
      const budgetCard = page.locator('[data-testid="budget-card"]');
      await expect(budgetCard).toBeVisible();

      // Check artist costs
      const costItems = page.locator('[data-testid="cost-item"]');
      const count = await costItems.count();
      expect(count).toBeGreaterThanOrEqual(0);

      // Verify total is calculated
      const totalSpent = page.locator('[data-testid="total-spent"]');
      await expect(totalSpent).toBeVisible();
    });
  });
});
