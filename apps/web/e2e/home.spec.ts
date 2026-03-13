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

    // "reward" appears in 3 Ethereum claims
    await searchInput.fill('reward')
    await expect(page.getByText('Showing 1 to 3 of 3 claims')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('DAO contributor received at least 3 weekly reward transfers').first()).toBeVisible()
    await expect(page.getByText('Prove I received liquidity rewards during Q1 2025').first()).toBeVisible()
    await expect(page.getByText(/Staking reward distribution/).first()).toBeVisible()

    // "salary" appears in only 1 claim
    await searchInput.fill('salary')
    await expect(page.getByText('Showing 1 to 1 of 1 claims')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('Monthly salary payment proof for remote contractor Jan–Mar 2025').first()).toBeVisible()
  })

  test('search filters by token address', async ({ page }) => {
    await page.goto('/')

    const tokenAddress = fixtures.tokens.tst.address
    const searchInput = page.getByPlaceholder(/search/i)
    await searchInput.fill(tokenAddress)

    // Should show claims with TST token address (6 Ethereum claims use TST)
    await expect(page.getByText(/showing.*of.*6.*claims/i)).toBeVisible({ timeout: 5000 })
  })

  test('search filters by shared counterparty address shows multiple', async ({ page }) => {
    await page.goto('/')

    const searchInput = page.getByPlaceholder(/search/i)
    await searchInput.fill(fixtures.counterpartyShared)

    // 5 Ethereum + 7 Base = 12 claims share this counterparty
    await expect(page.getByText(/showing.*of.*12.*claims/i)).toBeVisible({ timeout: 5000 })
  })

  test('search filters by unique counterparty address shows one', async ({ page }) => {
    await page.goto('/')

    const searchInput = page.getByPlaceholder(/search/i)
    await searchInput.fill(fixtures.counterpartyUnique)

    // Only 1 Ethereum claim has this unique counterparty (devguild.eth)
    await expect(page.getByText('Showing 1 to 1 of 1 claims')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(/open-source grant payment/).first()).toBeVisible()
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
    await searchInput.fill('donated 100 TST')

    await expect(page.getByText('Showing 1 to 1 of 1 claims')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('Prove I donated 100 TST to the public goods fund').first()).toBeVisible()
  })

  test('sort newest first (default)', async ({ page }) => {
    await page.goto('/')

    // Default sort is newest first — last created claim should appear first
    // Claims are created in order: Ethereum 1-8, Base 1-7
    // Newest = last Base claim
    await expect(page.getByText(/Base ecosystem early adopter/).first()).toBeVisible()
  })

  test('sort oldest first', async ({ page }) => {
    await page.goto('/')

    // Change sort to oldest first
    const sortSelect = page.locator('button').filter({ hasText: 'Newest First' })
    await sortSelect.click()
    await page.getByRole('option', { name: 'Oldest First' }).click()

    // Oldest = first Ethereum claim
    await expect(page.getByText('Prove I donated 100 TST to the public goods fund').first()).toBeVisible({ timeout: 5000 })
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
