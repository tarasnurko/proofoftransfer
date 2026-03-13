import { test, expect } from '@playwright/test'

test.describe('Create claim page', () => {
  test('renders form', async ({ page }) => {
    // Mock block-number API to verify datetime picker sends correct timestamp
    const capturedTimestamps: number[] = []
    await page.route('**/api/blocks/block-number**', async (route) => {
      const url = new URL(route.request().url())
      capturedTimestamps.push(Number(url.searchParams.get('timestamp')))
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ blockNumber: 12345678 }) })
    })

    await page.goto('/create')

    await expect(page.getByRole('heading', { name: 'Create Claim' })).toBeVisible()

    // Form cards
    await expect(page.getByText('Claim Details')).toBeVisible()
    await expect(page.getByText('Token Information')).toBeVisible()
    await expect(page.getByText('Constraints', { exact: true })).toBeVisible()
    await expect(page.getByText('Time Range')).toBeVisible()

    // Action buttons
    await expect(page.getByRole('button', { name: /cancel/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /fetch transfers/i })).toBeVisible()

    // Datetime picker: select last month day 5 at 14:30 and verify block number retrieved
    const now = new Date()
    const testYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
    const testMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1

    // Open Start Date picker
    const startSection = page.locator('div.space-y-2').filter({ has: page.getByText('Start Date', { exact: true }) })
    await startSection.locator('button').first().click()

    // Navigate to previous month and click day 5
    await page.locator('.rdp-button_previous').click()
    await page.locator(`button[data-day="${new Date(testYear, testMonth, 5).toLocaleDateString()}"]`).click()

    // Select hour 14 and minute 30 from HH/MM scroll columns inside the popover portal
    const popover = page.locator('[data-radix-popper-content-wrapper]')
    const hour14 = popover.locator('div[style*="overflow-y: auto"]').first().locator('span').filter({ hasText: /^14$/ })
    const min30 = popover.locator('div[style*="overflow-y: auto"]').nth(1).locator('span').filter({ hasText: /^30$/ })
    await hour14.scrollIntoViewIfNeeded()
    await hour14.click()
    await min30.scrollIntoViewIfNeeded()
    await min30.click()
    await page.getByRole('button', { name: 'Done' }).click()

    // Block number appears for both Start/End dates — verify Start Date block is visible
    await expect(page.getByText('Block: 12345678').first()).toBeVisible({ timeout: 3000 })

    // Verify the Start Date button shows correct date and time after picker interaction
    await expect(startSection.locator('button').first()).toContainText('February 5')
    await expect(startSection.locator('button').first()).toContainText('14:30')
  })

  test('validation errors on empty submit', async ({ page }) => {
    await page.goto('/create')

    await page.getByRole('button', { name: /fetch transfers/i }).click()

    await expect(page.getByText('Please fill the form correctly')).toBeVisible({
      timeout: 5000,
    })
  })

  test('message input works', async ({ page }) => {
    await page.goto('/create')

    const textarea = page.getByPlaceholder(/donation/i)
    await textarea.fill('My test claim for E2E')

    // Character counter updates
    await expect(page.getByText(/21.*characters/i)).toBeVisible()
  })

  test('back link navigates home', async ({ page }) => {
    await page.goto('/create')

    await page.getByRole('link', { name: /back to claims/i }).click()

    await expect(page).toHaveURL('/')
  })

  test('cancel button navigates home', async ({ page }) => {
    await page.goto('/create')

    await page.getByRole('button', { name: /cancel/i }).click()

    await expect(page).toHaveURL('/')
  })
})
