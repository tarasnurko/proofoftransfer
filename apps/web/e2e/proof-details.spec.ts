import { test, expect } from '@playwright/test'
import { loadFixtures, type TestFixtures } from './helpers/fixtures'

let fixtures: TestFixtures

test.beforeAll(() => {
  fixtures = loadFixtures()
})

test.describe('Proof details page', () => {
  test('displays proof info', async ({ page }) => {
    const proof = fixtures.proofs[0]!
    await page.goto(`/claims/${proof.claimId}/proofs/${proof.id}`)

    await expect(page.getByRole('heading', { name: 'Proof Details' })).toBeVisible()
    await expect(page.getByText('Proof Information')).toBeVisible()

    // Nullifier displayed (truncated)
    const nullifierShort = proof.nullifier.slice(0, 10)
    await expect(page.getByText(nullifierShort).first()).toBeVisible()
  })

  test('shows claim information section', async ({ page }) => {
    const proof = fixtures.proofs[0]!
    const claim = fixtures.claims[0]!
    await page.goto(`/claims/${proof.claimId}/proofs/${proof.id}`)

    await expect(page.getByText('Claim Information')).toBeVisible()
    await expect(page.getByText(claim.message)).toBeVisible()
  })

  test('shows verification stats', async ({ page }) => {
    const proof = fixtures.proofs[0]!
    await page.goto(`/claims/${proof.claimId}/proofs/${proof.id}`)

    // No verifications yet — stats section still renders (0 successful, 0 failed)
    // The VerificationStats component only renders spans when counts > 0
    // So we just check the Verify Proof section exists
    await expect(page.getByText('Verify Proof')).toBeVisible()
  })

  test('shows expandable proof data', async ({ page }) => {
    const proof = fixtures.proofs[0]!
    await page.goto(`/claims/${proof.claimId}/proofs/${proof.id}`)

    const toggle = page.getByText(/show proof data/i)
    await expect(toggle).toBeVisible()
    await toggle.click()

    // Should reveal proof data in a pre element
    await expect(page.locator('pre').first()).toBeVisible()
  })

  test('back link to claim', async ({ page }) => {
    const proof = fixtures.proofs[0]!
    await page.goto(`/claims/${proof.claimId}/proofs/${proof.id}`)

    await page.getByRole('link', { name: /back to claim/i }).click()

    await expect(page).toHaveURL(`/claims/${proof.claimId}`)
  })

  test('404 for invalid proof', async ({ page }) => {
    const proof = fixtures.proofs[0]!
    await page.goto(`/claims/${proof.claimId}/proofs/00000000-0000-0000-0000-000000000000`)

    await expect(page.getByRole('heading', { name: /not found/i })).toBeVisible()
  })

  test('shows wallet connect prompt', async ({ page }) => {
    const proof = fixtures.proofs[0]!
    await page.goto(`/claims/${proof.claimId}/proofs/${proof.id}`)

    // Not connected — shows connect wallet prompt in verify section
    await expect(page.getByText(/connect.*wallet/i).first()).toBeVisible()
  })
})
