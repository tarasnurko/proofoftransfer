import { test, expect } from './fixtures'

const BASE_URL = 'http://localhost:3005'

test.describe('Wallet flow', () => {
  test('connects MetaMask wallet', async ({ page, wallet }) => {
    await page.goto(BASE_URL)

    // Click connect wallet button in the app
    await page.getByRole('button', { name: /connect/i }).first().click()

    // Click MetaMask option in the modal
    await page.getByText(/metamask/i).first().click({ timeout: 10_000 })

    // Approve connection in MetaMask
    await wallet.approve()

    await expect(page.getByText(/0x[a-fA-F0-9]{4}\.\.\./).first()).toBeVisible({ timeout: 15_000 })
  })
})
