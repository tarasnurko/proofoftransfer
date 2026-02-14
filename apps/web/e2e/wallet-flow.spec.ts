import { test, expect } from './fixtures'

test.describe('Wallet flow', () => {
  test('connects MetaMask wallet', async ({ page, metamask }) => {
    await page.goto('/')

    // Click connect wallet button in header
    await page.getByRole('button', { name: /connect wallet/i }).click()

    // AppKit modal should open — click MetaMask option
    // AppKit renders in a web component shadow DOM, so we use a broader selector
    await page.getByText(/metamask/i).first().click({ timeout: 10_000 })

    // Approve connection in MetaMask
    await metamask.connectToDapp()

    // Should show truncated address in header
    await expect(page.getByText(/0x[a-fA-F0-9]{4}\.\.\./).first()).toBeVisible({ timeout: 15_000 })
  })

  test('shows connect wallet prompt on claim details', async ({ page }) => {
    await page.goto('/')

    // Navigate to first claim
    await page.getByRole('link', { name: /view details/i }).first().click()
    await expect(page.getByRole('heading', { name: 'Claim Details' })).toBeVisible()

    // Generate Proof section should show connect wallet
    await expect(page.getByText(/connect.*wallet/i).first()).toBeVisible()
  })
})
