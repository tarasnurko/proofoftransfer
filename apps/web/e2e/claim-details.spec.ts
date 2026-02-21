import { test, expect } from '@playwright/test'
import { loadFixtures, type TestFixtures } from './helpers/fixtures'

let fixtures: TestFixtures

test.beforeAll(() => {
  fixtures = loadFixtures()
})

test.describe('Claim details page', () => {
  test('displays claim info', async ({ page }) => {
    // claims[0] = "Ethereum claim #1", chainId=1, TST token
    const claim = fixtures.claims[0]!
    await page.goto(`/claims/${claim.id}`)

    await expect(page.getByRole('heading', { name: 'Claim Details' })).toBeVisible()
    await expect(page.getByText(claim.message).first()).toBeVisible()

    // Token name visible
    await expect(page.getByText(fixtures.tokens.tst.name).first()).toBeVisible()

    // Chain badge visible
    await expect(page.getByText('Ethereum').first()).toBeVisible()

    // Recipient address visible (truncated)
    const recipientShort = fixtures.recipient.slice(0, 6)
    await expect(page.getByText(recipientShort).first()).toBeVisible()
  })

  test('shows correct proof count', async ({ page }) => {
    // claims[0] has 3 proofs
    const claim = fixtures.claims[0]!
    await page.goto(`/claims/${claim.id}`)

    await expect(page.getByText('3 Proofs')).toBeVisible()
  })

  test('shows transfers section', async ({ page }) => {
    const claim = fixtures.claims[0]!
    await page.goto(`/claims/${claim.id}`)

    await expect(page.getByText('Transfers').first()).toBeVisible()
    await expect(page.getByText(/transfer.*matching this claim/i)).toBeVisible()
  })

  test('shows proofs section', async ({ page }) => {
    const claim = fixtures.claims[0]!
    await page.goto(`/claims/${claim.id}`)

    await expect(page.getByText('Submitted Proofs')).toBeVisible()
    await expect(page.getByText(/3 proofs? submitted/i)).toBeVisible()
  })

  test('back link navigates home', async ({ page }) => {
    const claim = fixtures.claims[0]!
    await page.goto(`/claims/${claim.id}`)

    const backLink = page.getByRole('link', { name: /back to claims/i })
    await backLink.click()

    await page.waitForURL('/', { timeout: 15_000 })
  })

  test('404 for invalid claim', async ({ page }) => {
    await page.goto('/claims/00000000-0000-0000-0000-000000000000')

    await expect(page.getByRole('heading', { name: /not found/i })).toBeVisible()
  })

  test('shows generate proof section', async ({ page }) => {
    const claim = fixtures.claims[0]!
    await page.goto(`/claims/${claim.id}`)

    await expect(page.getByText('Generate Proof')).toBeVisible()
    // Not connected — shows connect wallet prompt
    await expect(page.getByText(/connect.*wallet/i).first()).toBeVisible()
  })

  test('claim with 1 proof shows singular', async ({ page }) => {
    // claims[1] has 1 proof
    const claim = fixtures.claims[1]!
    await page.goto(`/claims/${claim.id}`)

    await expect(page.getByText('1 Proof')).toBeVisible()
  })

  test('claim with 0 proofs shows no proofs', async ({ page }) => {
    // claims[2] has 0 proofs
    const claim = fixtures.claims[2]!
    await page.goto(`/claims/${claim.id}`)

    // No proof badge
    await expect(page.getByText(/\d+ Proof/)).not.toBeVisible()

    // Proofs section shows empty state
    await expect(page.getByRole('heading', { name: 'No Proofs' })).toBeVisible()
  })
})
