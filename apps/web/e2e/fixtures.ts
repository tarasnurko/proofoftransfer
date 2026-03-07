import { test as base, chromium, BrowserContext, Page } from '@playwright/test'
import dappwright, { Dappwright, MetaMaskWallet } from '@tenkeylabs/dappwright'
import { LAUNCH_OPTIONS } from './config'

const SEED_PHRASE = 'test test test test test test test test test test test junk'

let sharedContext: BrowserContext

// dappwright hardcodes its own args and ignores options.args, so we patch
// launchPersistentContext to inject the same window size args used by static tests.
// Node.js module cache guarantees dappwright uses the same chromium object.
async function bootstrapWithWindowSize() {
  const original = chromium.launchPersistentContext.bind(chromium)
  ;(chromium as any).launchPersistentContext = async (userDataDir: string, options: any = {}) =>
    original(userDataDir, { ...options, args: [...(options.args ?? []), ...LAUNCH_OPTIONS.args] })

  try {
    const [, , context] = await dappwright.bootstrap('', {
      wallet: 'metamask',
      version: MetaMaskWallet.recommendedVersion,
      seed: SEED_PHRASE,
      headless: false,
    })
    return context
  } finally {
    ;(chromium as any).launchPersistentContext = original
  }
}

export const test = base.extend<
  { context: BrowserContext; wallet: Dappwright; page: Page },
  { walletContext: BrowserContext }
>({
  walletContext: [
    async ({}, use) => {
      if (!sharedContext) {
        sharedContext = await bootstrapWithWindowSize()
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
