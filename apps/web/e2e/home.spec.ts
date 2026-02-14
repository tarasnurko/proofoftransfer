import { test, expect } from '@playwright/test'
import { loadFixtures, type TestFixtures } from './helpers/fixtures'

let fixtures: TestFixtures

test.beforeAll(() => {
  fixtures = loadFixtures()
})

test.describe('Home page', () => {
  test('displays paginated claims', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('heading', { name: 'Transfer Claims' })).toBeVisible()

    // 15 claims total, page size 10
    await expect(page.getByText('Showing 1 to 10 of 15 claims')).toBeVisible()

    // Should see 10 claim cards on page 1
    const viewButtons = page.getByRole('link', { name: /view details/i })
    await expect(viewButtons).toHaveCount(10)
  })

  test('pagination works', async ({ page }) => {
    // Navigate directly to page 2
    await page.goto('/?page=2')

    await expect(page.getByText('Showing 11 to 15 of 15 claims')).toBeVisible()

    const viewButtons = page.getByRole('link', { name: /view details/i })
    await expect(viewButtons).toHaveCount(5)

    // Click page 1 to go back
    await page.getByRole('button', { name: '1' }).click()
    await expect(page.getByText('Showing 1 to 10 of 15 claims')).toBeVisible({ timeout: 10_000 })
  })

  test('search filters by message', async ({ page }) => {
    await page.goto('/')

    const searchInput = page.getByPlaceholder(/search/i)
    await searchInput.fill('Ethereum claim')

    // Wait for debounced search to apply
    await expect(page.getByText(/showing.*of.*8.*claims/i)).toBeVisible({ timeout: 5000 })

    // All visible claims should be Ethereum
    for (let i = 1; i <= 8; i++) {
      // Only first page (10 items max) but there are only 8
      await expect(page.getByText(`Ethereum claim #${i}`).first()).toBeVisible()
    }
  })

  test('search filters by address', async ({ page }) => {
    await page.goto('/')

    const tokenAddress = fixtures.tokens.tst.address
    const searchInput = page.getByPlaceholder(/search/i)
    await searchInput.fill(tokenAddress)

    // Should show claims with this token address (8 Ethereum claims)
    await expect(page.getByText(/showing.*of.*8.*claims/i)).toBeVisible({ timeout: 5000 })
  })

  test('search shows empty state', async ({ page }) => {
    await page.goto('/')

    const searchInput = page.getByPlaceholder(/search/i)
    await searchInput.fill('nonexistent-claim-xyz-12345')

    await expect(page.getByText('No Matches Found')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('Try adjusting your search or filters')).toBeVisible()
  })

  test('chain filter works', async ({ page }) => {
    await page.goto('/')

    // Open chain filter dropdown
    const chainSelect = page.locator('button').filter({ hasText: 'All Chains' })
    await chainSelect.click()
    await page.getByRole('option', { name: 'Ethereum' }).click()

    // Should only show Ethereum claims (8)
    await expect(page.getByText(/showing.*of.*8.*claims/i)).toBeVisible({ timeout: 5000 })

    // Switch to Base
    await page.locator('button').filter({ hasText: 'Ethereum' }).click()
    await page.getByRole('option', { name: 'Base' }).click()

    // Should only show Base claims (7)
    await expect(page.getByText(/showing.*of.*7.*claims/i)).toBeVisible({ timeout: 5000 })
  })

  test('chain filter + search combined', async ({ page }) => {
    await page.goto('/')

    // Filter by Ethereum chain
    const chainSelect = page.locator('button').filter({ hasText: 'All Chains' })
    await chainSelect.click()
    await page.getByRole('option', { name: 'Ethereum' }).click()

    // Then search for specific claim
    const searchInput = page.getByPlaceholder(/search/i)
    await searchInput.fill('Ethereum claim #1')

    await expect(page.getByText('Showing 1 to 1 of 1 claims')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('Ethereum claim #1').first()).toBeVisible()
  })

  test('sort newest first (default)', async ({ page }) => {
    await page.goto('/')

    // Default sort is newest first — last created claim should appear first
    // Claims are created in order: Ethereum #1-8, Base #1-7
    // Newest = Base #7 — should be visible on page 1
    await expect(page.getByText('Base claim #7').first()).toBeVisible()
  })

  test('sort oldest first', async ({ page }) => {
    await page.goto('/')

    // Change sort to oldest first
    const sortSelect = page.locator('button').filter({ hasText: 'Newest First' })
    await sortSelect.click()
    await page.getByRole('option', { name: 'Oldest First' }).click()

    // Oldest = Ethereum claim #1
    await expect(page.getByText('Ethereum claim #1').first()).toBeVisible({ timeout: 5000 })
  })

  test('sort most proofs', async ({ page }) => {
    await page.goto('/')

    const sortSelect = page.locator('button').filter({ hasText: 'Newest First' })
    await sortSelect.click()
    await page.getByRole('option', { name: 'Most Proofs' }).click()

    // claims[0] (Ethereum claim #1) has 3 proofs, should be first
    // Verify first card has "3 Proofs" badge
    await page.waitForTimeout(1000)
    const firstProofBadge = page.getByText('3 Proofs').first()
    await expect(firstProofBadge).toBeVisible({ timeout: 5000 })
  })

  test('sort least proofs', async ({ page }) => {
    await page.goto('/')

    const sortSelect = page.locator('button').filter({ hasText: 'Newest First' })
    await sortSelect.click()
    await page.getByRole('option', { name: 'Least Proofs' }).click()

    // Claims with 0 proofs should be first
    await page.waitForTimeout(1000)
    const firstProofBadge = page.getByText('0 Proofs').first()
    await expect(firstProofBadge).toBeVisible({ timeout: 5000 })
  })

  test('navigate to claim details', async ({ page }) => {
    await page.goto('/')

    const viewButton = page.getByRole('link', { name: /view details/i }).first()
    await viewButton.click()

    await expect(page).toHaveURL(/\/claims\//)
    await expect(page.getByRole('heading', { name: 'Claim Details' })).toBeVisible()
  })

  test('navigate to create', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('link', { name: /create claim/i }).click()

    await expect(page).toHaveURL('/create')
    await expect(page.getByRole('heading', { name: 'Create Claim' })).toBeVisible()
  })
})
