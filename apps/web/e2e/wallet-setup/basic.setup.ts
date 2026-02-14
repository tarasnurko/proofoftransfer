import { defineWalletSetup } from '@synthetixio/synpress'
import { MetaMask } from '@synthetixio/synpress/playwright'

const SEED_PHRASE = 'test test test test test test test test test test test junk'
const PASSWORD = 'Tester@1234'

export default defineWalletSetup(PASSWORD, async (context, walletPage) => {
  const metamask = new MetaMask(context, walletPage, PASSWORD)
  await metamask.importWallet(SEED_PHRASE)
  // Synpress bug: importWallet doesn't click final "Done" button on MetaMask 13.x
  // Without this, cache restores to "Your wallet is ready!" screen instead of home
  await walletPage.getByTestId('onboarding-complete-done').click()
})
