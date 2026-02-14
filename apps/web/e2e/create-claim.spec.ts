import { test, expect } from '@playwright/test'

test.describe('Create claim page', () => {
  test('renders form', async ({ page }) => {
    await page.goto('/create')

    await expect(page.getByRole('heading', { name: 'Create Claim' })).toBeVisible()

    // Form cards
    await expect(page.getByText('Claim Details')).toBeVisible()
    await expect(page.getByText('Token Information')).toBeVisible()
    await expect(page.getByText('Amount Constraints')).toBeVisible()
    await expect(page.getByText('Time Range')).toBeVisible()

    // Action buttons
    await expect(page.getByRole('button', { name: /cancel/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /fetch transfers/i })).toBeVisible()
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
