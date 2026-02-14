import { test, expect } from './fixtures'
import { loadFixtures } from './helpers/fixtures'

test('full UI flow: create claim → generate proof → verify → self-verify rejection', async ({
  page,
  metamask,
}) => {
  test.setTimeout(600_000) // 10 min total

  const fixtures = loadFixtures()
  let createdClaimId: string
  let proofPageUrl: string

  // Add Sender account immediately — MetaMask page is fresh here
  // After this, Sender (account[1]) is active. Step 1 doesn't need wallet so it's fine.
  await metamask.addNewAccount('Sender')

  // ── Step 1: Create Claim ──

  await test.step('Create claim with real transfers', async () => {
    await page.goto('/create')
    await expect(page.getByRole('heading', { name: 'Create Claim' })).toBeVisible()

    await page.locator('#message').fill('E2E test claim for transfer verification')
    await page.locator('#tokenAddress').fill(fixtures.tokens.tst.address)
    await expect(page.getByText('Test Token (TST)')).toBeVisible({ timeout: 10_000 })
    await page.locator('#recipientAddress').fill(fixtures.recipient)

    // Intercept load-transfers (Etherscan unavailable for Anvil)
    await page.route('**/api/claims/load-transfers', async (route) => {
      const transfers = fixtures.tstTransfers.map((t, i) => ({
        id: crypto.randomUUID(),
        chainId: 1,
        txHash: t.hash,
        logIndex: i,
        blockNumber: Number(t.blockNumber),
        blockTimestamp: Number(t.timeStamp),
        senderAddress: t.from.toLowerCase(),
        recipientAddress: t.to.toLowerCase(),
        tokenAddress: fixtures.tokens.tst.address.toLowerCase(),
        amount: t.value,
        createdAt: new Date().toISOString(),
      }))

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ transfers }),
      })
    })

    await page.getByRole('button', { name: 'Fetch Transfers' }).click()
    await expect(page.getByText('Transfers Preview')).toBeVisible({ timeout: 10_000 })

    await page.getByRole('button', { name: 'Create Claim' }).click()
    await expect(page).toHaveURL('/', { timeout: 30_000 })

    const searchInput = page.getByPlaceholder(/search/i)
    await searchInput.fill('E2E test claim for transfer verification')
    await expect(page.getByText('Showing 1 to 1 of 1 claims')).toBeVisible({ timeout: 10_000 })

    const viewLink = page.getByRole('link', { name: /view details/i }).first()
    await viewLink.waitFor({ state: 'visible' })
    await viewLink.click()
    await expect(page).toHaveURL(/\/claims\//, { timeout: 15_000 })

    createdClaimId = page.url().split('/claims/')[1]!.split(/[/?#]/)[0]!
    expect(createdClaimId).toBeTruthy()
  })

  // ── Step 2: Generate Proof ──

  await test.step('Generate ZK proof for the claim', async () => {
    // Sender account already added at test start — switch to it
    await metamask.switchAccount('Sender')

    await page.goto(`/claims/${createdClaimId}`)
    await expect(page.getByRole('heading', { name: 'Claim Details' })).toBeVisible()

    // Connect wallet via Generate Proof card
    await page.getByRole('button', { name: 'Connect Wallet' }).click()
    await page.getByText(/metamask/i).first().click({ timeout: 10_000 })
    await metamask.connectToDapp()

    await expect(page.getByText('Connected:')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('button', { name: 'Sign Claim' })).toBeVisible({ timeout: 30_000 })

    // Pre-switch to Ethereum Mainnet to avoid popup during EIP-712 signing
    await metamask.switchNetwork('Ethereum Mainnet')

    // Sign the claim (EIP-712)
    await page.getByRole('button', { name: 'Sign Claim' }).click()
    await metamask.confirmSignature()
    await expect(page.getByText('Claim Signed')).toBeVisible({ timeout: 30_000 })

    // Generate proof (ZK circuit — slow)
    await page.getByRole('button', { name: 'Generate Proof' }).click()
    await expect(page.getByText('Proof generated and submitted!')).toBeVisible({ timeout: 300_000 })

    // Navigate to proof page
    const proofLink = page.locator(`a[href^="/claims/${createdClaimId}/proofs/"]`).first()
    await expect(proofLink).toBeVisible({ timeout: 10_000 })
    await proofLink.click()
    await expect(page).toHaveURL(/\/proofs\//, { timeout: 10_000 })

    proofPageUrl = page.url()
    expect(proofPageUrl.split('/proofs/')[1]!.split(/[/?#]/)[0]!).toBeTruthy()
  })

  // ── Step 3: Verify Proof (different account) ──

  await test.step('Verify proof from different account', async () => {
    // Switch to Account 1 (not the prover) — stays in same browser context
    await metamask.switchAccount('Account 1')

    await page.goto(proofPageUrl)
    await expect(page.getByRole('heading', { name: 'Proof Details' })).toBeVisible()

    // Wallet may still be connected from step 2, or may need reconnection
    const connectBtn = page.getByRole('button', { name: 'Connect Wallet to Verify' })
    const signVerifyBtn = page.getByRole('button', { name: 'Sign & Verify Proof' })

    await expect(connectBtn.or(signVerifyBtn)).toBeVisible({ timeout: 15_000 })

    if (await connectBtn.isVisible()) {
      await connectBtn.click()
      await page.getByText(/metamask/i).first().click({ timeout: 10_000 })
      await metamask.connectToDapp()
      await expect(signVerifyBtn).toBeVisible({ timeout: 15_000 })
    }

    // Fetch transfers from blockchain
    await page.getByRole('button', { name: 'Fetch Transfers' }).click()
    await expect(page.getByText(/transfers fetched/i)).toBeVisible({ timeout: 15_000 })

    // Ensure on Ethereum Mainnet for signing
    await metamask.switchNetwork('Ethereum Mainnet')

    // Sign & Verify
    await page.getByRole('button', { name: 'Sign & Verify Proof' }).click()
    await metamask.confirmSignature()

    await expect(page.getByText('Proof verified successfully!')).toBeVisible({ timeout: 60_000 })
  })

  // ── Step 4: Self-verification rejection ──

  await test.step('Reject self-verification', async () => {
    // Switch to Sender (the prover)
    await metamask.switchAccount('Sender')

    await page.goto(proofPageUrl)
    await expect(page.getByRole('heading', { name: 'Proof Details' })).toBeVisible()

    // Wallet may still be connected or may need reconnection
    const connectBtn = page.getByRole('button', { name: 'Connect Wallet to Verify' })
    const signVerifyBtn = page.getByRole('button', { name: 'Sign & Verify Proof' })

    await expect(connectBtn.or(signVerifyBtn)).toBeVisible({ timeout: 15_000 })

    if (await connectBtn.isVisible()) {
      await connectBtn.click()
      await page.getByText(/metamask/i).first().click({ timeout: 10_000 })
      await metamask.connectToDapp()
      await expect(signVerifyBtn).toBeVisible({ timeout: 15_000 })
    }

    // Fetch transfers
    await page.getByRole('button', { name: 'Fetch Transfers' }).click()
    await expect(page.getByText(/transfers fetched/i)).toBeVisible({ timeout: 15_000 })

    // Ensure on Ethereum Mainnet
    await metamask.switchNetwork('Ethereum Mainnet')

    // Sign & Verify — should derive same nullifier as proof
    await page.getByRole('button', { name: 'Sign & Verify Proof' }).click()
    await metamask.confirmSignature()

    // Should show self-verification error
    await expect(page.getByText('Cannot verify your own proof')).toBeVisible({ timeout: 30_000 })
  })
})
