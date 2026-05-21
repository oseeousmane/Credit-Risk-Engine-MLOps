import { test, expect } from '@playwright/test';

test.describe('Credit Risk Workflow E2E', () => {

  test('Origination -> Score -> Decision Workflow', async ({ page }) => {
    // 1. Navigate to Client Portal Origination Wizard
    await page.goto('/en/client-portal/applications/new');
    
    // Expect the page to have the wizard title
    await expect(page.locator('h2').filter({ hasText: 'New Facility Request' })).toBeVisible();

    // Fill out the wizard (Facility Stage)
    await page.fill('input[placeholder="e.g. 5000000"]', '10000000'); // Requested Amount
    await page.fill('input[placeholder="e.g. 60"]', '36'); // Tenor
    await page.click('button:has-text("Next: Business Info")');

    // Business Stage
    await page.fill('input[placeholder="e.g. 15000000"]', '25000000'); // Revenue
    await page.fill('input[placeholder="e.g. 5"]', '10'); // Years in Business
    await page.click('button:has-text("Next: Financials")');

    // Financials Stage
    await page.fill('input[placeholder="e.g. 2500000"]', '4000000'); // EBITDA
    await page.fill('input[placeholder="e.g. 1000000"]', '2000000'); // Total Debt
    await page.click('button:has-text("Next: Documents")');

    // Documents Stage (Wait for upload simulation or click next)
    await page.click('button:has-text("Review Application")');

    // Review Stage (Submit)
    // Intercept the submission request to mock if necessary, but assuming local backend is up
    await Promise.all([
      // page.waitForResponse(resp => resp.url().includes('/applications') && resp.status() === 201),
      page.click('button:has-text("Submit to Credit Committee")')
    ]);

    // Check redirection to the success state or application detail
    await expect(page.locator('text=Application Submitted').or(page.locator('text=ReqId'))).toBeVisible();

    // 2. Navigate to Internal Dashboard (Analyst View)
    await page.goto('/en/pipeline');
    
    // Check if pipeline is visible
    await expect(page.locator('h1').filter({ hasText: 'Pipeline' })).toBeVisible();

    // Assuming the first item in the table is the one we just submitted
    // Click the first row to view application details
    await page.locator('table tbody tr').first().click();

    // Wait for application detail page to load
    await expect(page.locator('h2').filter({ hasText: 'Facility Request' })).toBeVisible();

    // 3. Scoring (Check if ML model scored it)
    // The UI should show a PD and Risk Level
    await expect(page.locator('text=Probability of Default')).toBeVisible();

    // 4. Decisioning
    // Click the "Approve" button
    await page.click('button:has-text("Approve Facility")');
    
    // Optionally fill a justification modal if there is one
    const justificationInput = page.locator('textarea[placeholder*="justification"]');
    if (await justificationInput.isVisible()) {
      await justificationInput.fill('E2E Automated Approval Test');
      await page.click('button:has-text("Confirm Decision")');
    }

    // Verify final status is Approved
    await expect(page.locator('span:has-text("APPROVED")').first()).toBeVisible();
  });

});
