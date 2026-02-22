import { test as base, BrowserContext, Page } from '@playwright/test'
import dappwright, { Dappwright, MetaMaskWallet } from '@tenkeylabs/dappwright'

const SEED_PHRASE = 'test test test test test test test test test test test junk'

let sharedContext: BrowserContext

export const test = base.extend<
  { context: BrowserContext; wallet: Dappwright; page: Page },
  { walletContext: BrowserContext }
>({
  walletContext: [
    async ({}, use) => {
      if (!sharedContext) {
        const [, , context] = await dappwright.bootstrap('', {
          wallet: 'metamask',
          version: MetaMaskWallet.recommendedVersion,
          seed: SEED_PHRASE,
          headless: false,
        })
        sharedContext = context
      }
      await use(sharedContext)
    },
    { scope: 'worker' },
  ],

  context: async ({ walletContext }, use) => {
    await use(walletContext)
  },

  wallet: async ({ context }, use) => {
    const wallet = await dappwright.getWallet('metamask', context)
    await use(wallet)
  },

  page: async ({ context }, use) => {
    const appPage = await context.newPage()
    await use(appPage)
    await appPage.close()
  },
})

export const { expect } = test
