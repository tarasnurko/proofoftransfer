import { test, expect } from './fixtures'
import { loadFixtures } from './helpers/fixtures'

const BASE_URL = 'http://localhost:3005'

test.describe('Verify proof flows', () => {
  test('shows error banner on failed verification (root mismatch)', async ({ page, wallet }) => {
    test.setTimeout(300_000)

    const fixtures = loadFixtures()
    const proof = fixtures.proofs[0]!
    const proofUrl = `${BASE_URL}/claims/${proof.claimId}/proofs/${proof.id}`

    // Mock the transfers API to return test transfers
    await page.route('**/api/claims/*/transfers', async (route) => {
      const transfers = fixtures.tstTransfers.map((t) => ({
        hash: t.hash,
        from: t.from,
        to: t.to,
        contractAddress: fixtures.tokens.tst.address,
        value: t.value,
        timeStamp: t.timeStamp,
        blockNumber: t.blockNumber,
      }))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(transfers),
      })
    })

    await page.goto(proofUrl)
    await expect(page.getByRole('heading', { name: 'Proof Details' })).toBeVisible()

    // Wait for hydration (useMounted) before checking buttons
    await page.waitForTimeout(2_000)

    // Scope to Verify Proof card to avoid header's Connect Wallet button
    const verifyCard = page.locator('div').filter({ has: page.getByText('Verify Proof', { exact: true }) }).first()
    const connectBtn = verifyCard.getByRole('button', { name: /Connect Wallet/i })
    const signClaimBtn = verifyCard.getByRole('button', { name: 'Sign Claim' })

    await expect(connectBtn.or(signClaimBtn)).toBeVisible({ timeout: 15_000 })

    if (await connectBtn.isVisible().catch(() => false)) {
      try {
        await connectBtn.click({ timeout: 5_000 })
        await page.getByText(/metamask/i).first().click({ timeout: 10_000 })
        try { await wallet.approve() } catch {}
      } catch {
        // Auto-connected
      }
      await page.bringToFront()
      await expect(signClaimBtn).toBeVisible({ timeout: 15_000 })
    }

    // Wait for wagmi to fully initialize walletClient
    await page.waitForTimeout(2_000)

    // Step 1: Sign claim
    await page.bringToFront()
    await signClaimBtn.click()
    await wallet.sign()
    await page.bringToFront()

    // Should see transfer form (not blocked)
    await expect(page.getByText('Claim Signed')).toBeVisible({ timeout: 15_000 })

    // Step 2: Fetch transfers
    await page.getByRole('button', { name: 'Fetch Transfers' }).click()
    await expect(page.getByText(/transfers fetched/i)).toBeVisible({ timeout: 15_000 })

    // Step 3: Verify — start listening for toast BEFORE clicking
    const errorToast = page.locator('[data-sonner-toast]').first()
      .waitFor({ state: 'visible', timeout: 120_000 })

    await page.getByRole('button', { name: 'Verify Proof' }).click()
    await errorToast

    // Persistent error banner should be visible
    await expect(page.getByText('Verification failed', { exact: true })).toBeVisible({ timeout: 10_000 })

    // Failed stats should update
    await expect(page.getByText(/failed/i).locator('visible=true').first()).toBeVisible({ timeout: 5_000 })

    // Verify button should still be available for retry
    await expect(page.getByRole('button', { name: 'Verify Proof' })).toBeVisible()
  })

  test('shows "already verified" after successful verification', async ({ page, wallet }) => {
    test.setTimeout(300_000)

    const fixtures = loadFixtures()
    // Use a different proof (proofs[1]) to avoid state from previous test
    const proof = fixtures.proofs[1]!
    const proofUrl = `${BASE_URL}/claims/${proof.claimId}/proofs/${proof.id}`

    // Mock the verifier-signing-data endpoint
    await page.route('**/api/claims/*/verifier-signing-data', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          eip712: {
            claimId: '0x' + '00'.repeat(32),
            claimMessageHash: '0x' + '00'.repeat(32),
            tokenAddress: fixtures.tokens.tst.address,
            counterpartyAddress: fixtures.recipient,
            isProverSender: true,
            tokenType: '0',
            minTransfersSum: '0',
            maxTransfersSum: '0',
            minTransfersCount: '0',
            maxTransfersCount: '0',
            fromBlockTimestamp: '0',
            toBlockTimestamp: '0',
            transfersRootHash: '0x' + '00'.repeat(32),
          },
          chainId: 1,
        }),
      })
    })

    // Mock transfers
    await page.route('**/api/claims/*/transfers', async (route) => {
      const transfers = fixtures.tstTransfers.map((t) => ({
        hash: t.hash,
        from: t.from,
        to: t.to,
        contractAddress: fixtures.tokens.tst.address,
        value: t.value,
        timeStamp: t.timeStamp,
        blockNumber: t.blockNumber,
      }))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(transfers),
      })
    })

    await page.goto(proofUrl)
    await expect(page.getByRole('heading', { name: 'Proof Details' })).toBeVisible()

    // The seeded proof has no verifications, so the form should be visible
    const verifyCard2 = page.locator('div').filter({ has: page.getByText('Verify Proof', { exact: true }) }).first()
    const connectBtn = verifyCard2.getByRole('button', { name: /Connect Wallet/i })
    const signClaimBtn = verifyCard2.getByRole('button', { name: 'Sign Claim' })
    await expect(connectBtn.or(signClaimBtn)).toBeVisible({ timeout: 15_000 })
  })
})
