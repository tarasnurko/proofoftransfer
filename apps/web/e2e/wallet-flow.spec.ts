import { test, expect } from './fixtures'

const BASE_URL = 'http://localhost:3005'

test.describe('Wallet flow', () => {
  test('connects MetaMask wallet', async ({ page, wallet }) => {
    await page.goto(BASE_URL)

    const addressText = page.getByText(/0x[a-fA-F0-9]{4}\.\.\./).first()
    const connectBtn = page.getByRole('button', { name: 'Connect Wallet' })

    // Wallet may already be connected (site permissions persist across tests)
    await expect(addressText.or(connectBtn)).toBeVisible({ timeout: 15_000 })

    if (await connectBtn.isVisible().catch(() => false)) {
      await connectBtn.click()
      try {
        await page.getByText(/metamask/i).first().click({ timeout: 10_000 })
        await wallet.approve()
      } catch {
        // Wallet might auto-connect without showing modal
      }
    }

    await expect(addressText).toBeVisible({ timeout: 15_000 })
  })
})
