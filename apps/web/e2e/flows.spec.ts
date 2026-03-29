import { test, expect } from './fixtures'
import { loadFixtures } from './helpers/fixtures'
import { BASE_URL } from './config'

// HD index 1 from seed "test test test test test test test test test test test junk"
// dappwright.createAccount is broken on MetaMask 13.x (missing add-multichain-account-button),
// so we import the private key directly instead.
const SENDER_PK = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d'

test('full UI flow: create claim → generate proof → verify → self-verify rejection', async ({
  page,
  wallet,
}) => {
  test.setTimeout(600_000) // 10 min total

  const fixtures = loadFixtures()
  let createdClaimId: string
  let proofPageUrl: string

  // Import Sender account (HD index 1 from same seed as MetaMask).
  // May already exist from previous run — ignore duplicate error.
  try { await wallet.importPK(SENDER_PK) } catch {}
  await wallet.switchAccount('Account 2')

  // ── Step 1: Create Claim ──

  await test.step('Create claim with real transfers', async () => {
    await page.bringToFront()

    // Mock ENS resolution (runs on mainnet, unavailable for Anvil)
    await page.route('**/api/ens/resolve**', async (route) => {
      const url = new URL(route.request().url())
      const input = url.searchParams.get('input') ?? ''
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { address: input, ensName: null } }),
      })
    })

    // Intercept load-transfers (Etherscan unavailable for Anvil)
    await page.route('**/api/claims/load-transfers', async (route) => {
      const transfers = fixtures.tstTransfers.map((t) => ({
        id: crypto.randomUUID(),
        chainId: 1,
        txHash: t.hash,
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

    await page.goto(`${BASE_URL}/create`)
    await expect(page.getByRole('heading', { name: 'Create Claim' })).toBeVisible()

    await page.locator('#message').fill('E2E test claim for transfer verification')
    await page.locator('#tokenAddress').fill(fixtures.tokens.tst.address)
    await expect(page.getByText('Test Token (TST)')).toBeVisible({ timeout: 10_000 })
    await page.locator('#counterpartyAddress').fill(fixtures.recipient)

    // Wait for 500ms debounce + ENS resolution to settle
    await page.waitForResponse('**/api/ens/resolve**')

    await page.getByRole('button', { name: 'Fetch Transfers' }).click()
    await expect(page.getByText('Transfers Preview')).toBeVisible({ timeout: 10_000 })

    await page.getByRole('button', { name: 'Create Claim' }).click()

    // Wait for redirect or capture diagnostics on failure
    try {
      await expect(page).toHaveURL(`${BASE_URL}/`, { timeout: 60_000 })
    } catch {
      await page.screenshot({ path: 'test-results/create-claim-failure.png' })
      const toasts = await page.locator('[data-sonner-toast]').allTextContents().catch(() => ['no toasts'])
      throw new Error(`Create Claim did not redirect. URL: ${page.url()}, Toasts: ${toasts.join('; ')}`)
    }

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
    await wallet.switchAccount('Account 2')

    await page.bringToFront()
    await page.goto(`${BASE_URL}/claims/${createdClaimId}`)
    await expect(page.getByRole('heading', { name: 'Claim Details' })).toBeVisible()

    // Force disconnect any auto-reconnected wallet (PERSIST_WALLET may reconnect as wrong account)
    await page.evaluate(async () => {
      const provider = (window as any).ethereum
      if (provider) {
        try { await provider.request({ method: 'wallet_revokePermissions', params: [{ eth_accounts: {} }] }) } catch {}
      }
      localStorage.removeItem('wagmi.store')
      localStorage.removeItem('wagmi.recentConnectorId')
    })
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Claim Details' })).toBeVisible()
    await page.waitForTimeout(2_000)

    // Connect wallet as Account 2
    const connectedText = page.getByText('Connected:')
    const connectWalletBtn = page.getByRole('button', { name: 'Connect Wallet' })
    await expect(connectWalletBtn.first()).toBeVisible({ timeout: 15_000 })

    // Use last() to target the Generate Proof card button (not the header one)
    await connectWalletBtn.last().click()
    await page.getByText(/metamask/i).first().click({ timeout: 10_000 })
    try { await wallet.approve() } catch {}
    await page.bringToFront()

    await expect(connectedText).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('button', { name: 'Sign Claim' })).toBeVisible({ timeout: 30_000 })

    // Sign the claim (EIP-712) — listen for toast BEFORE signing
    const claimSignedToast = page.getByText('Claim Signed', { exact: true })
      .waitFor({ state: 'visible', timeout: 60_000 })
    await page.bringToFront()
    await page.getByRole('button', { name: 'Sign Claim' }).click()
    await wallet.sign()
    await page.bringToFront()
    await claimSignedToast

    // Add a public note to the proof
    await page.getByPlaceholder('Add a public note').fill('E2E test proof message')

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

    // Verify message is displayed on proof page
    await expect(page.getByText('E2E test proof message')).toBeVisible({ timeout: 10_000 })
  })

  // ── Step 3: Self-verification rejection ──
  // (Must run BEFORE third-party verify — successful verification sets alreadyVerified,
  //  which hides the verify form on subsequent page loads.)

  await test.step('Reject self-verification', async () => {
    // Account 2 (the prover) is already active from Step 2
    await wallet.switchAccount('Account 2')

    await page.bringToFront()
    await page.goto(proofPageUrl)
    await expect(page.getByRole('heading', { name: 'Proof Details' })).toBeVisible()

    // Wait for hydration (useMounted) — wallet is already connected from Step 2,
    // but the component briefly shows "Connect Wallet" before hydration settles.
    await page.waitForTimeout(2_000)

    // Scope to Verify Proof card
    const verifyCard = page.locator('div').filter({ has: page.getByText('Verify Proof', { exact: true }) }).first()
    const signClaimBtn = verifyCard.getByRole('button', { name: 'Sign Claim' })
    await expect(signClaimBtn).toBeVisible({ timeout: 15_000 })

    // Wait for wagmi to fully initialize walletClient
    await page.waitForTimeout(2_000)

    // Sign claim — prover signing triggers self-verify block message
    await signClaimBtn.click()
    await wallet.sign()
    await page.bringToFront()

    // Should see blocking message instead of transfer form
    await expect(page.getByText('Cannot Verify Own Proof')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('The prover cannot verify their own proof')).toBeVisible()
  })

  // ── Step 4: Verify Proof (different account) ──

  await test.step('Verify proof from different account', async () => {
    // Switch to Account 1 (not the prover)
    // MetaMask per-site permissions mean Account 2 stays "connected" even after UI switch.
    // Revoke MetaMask permissions + clear wagmi state so the page starts fully disconnected.
    await page.bringToFront()
    await page.evaluate(async () => {
      // Revoke MetaMask's per-site account permissions
      const provider = (window as any).ethereum
      if (provider) {
        try { await provider.request({ method: 'wallet_revokePermissions', params: [{ eth_accounts: {} }] }) } catch {}
      }
      localStorage.removeItem('wagmi.store')
      localStorage.removeItem('wagmi.recentConnectorId')
    })

    await wallet.switchAccount('Account 1')
    await page.bringToFront()
    await page.goto(proofPageUrl)
    await expect(page.getByRole('heading', { name: 'Proof Details' })).toBeVisible()

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
        // Wallet auto-connected — button detached, proceed
      }
      await page.bringToFront()
      await expect(signClaimBtn).toBeVisible({ timeout: 15_000 })
    }

    // Wait for wagmi to fully initialize walletClient after page navigation
    await page.waitForTimeout(2_000)

    // Step 1: Sign claim to derive verifier identity
    await page.bringToFront()
    await signClaimBtn.click()
    await wallet.sign()
    await page.bringToFront()

    // Should see "Claim Signed" and transfer form (not blocked)
    await expect(page.getByText('Claim Signed')).toBeVisible({ timeout: 15_000 })

    // Step 2: Fetch transfers from blockchain
    await page.getByRole('button', { name: 'Fetch Transfers' }).click()
    await expect(page.getByText(/transfers fetched/i)).toBeVisible({ timeout: 15_000 })

    // Step 3: Verify proof
    // Listen for ANY toast BEFORE clicking to capture the actual result
    const anyToast = page.locator('[data-sonner-toast]').first()
      .waitFor({ state: 'visible', timeout: 120_000 })

    await page.getByRole('button', { name: 'Verify Proof' }).click()

    await anyToast
    await page.bringToFront()
    const toastText = await page.locator('[data-sonner-toast]').first().textContent().catch(() => 'none')

    if (!toastText?.includes('Proof verified successfully')) {
      await page.screenshot({ path: 'test-results/verify-proof-failure.png' })
      throw new Error(`Verify proof failed with toast: "${toastText}"`)
    }

    // Also check permanent text appeared
    await expect(page.getByText('Verification Successful')).toBeVisible({ timeout: 10_000 })
  })
})
