import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'
import { test as base, chromium, BrowserContext, Page } from '@playwright/test'
import dappwright, { Dappwright, MetaMaskWallet } from '@tenkeylabs/dappwright'
import { LAUNCH_OPTIONS } from './config'

const SEED_PHRASE = 'test test test test test test test test test test test junk'
const PERSIST_WALLET = process.env.PERSIST_WALLET === 'true'
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PROFILE_DIR = path.resolve(__dirname, '../node_modules/.cache/wallet-profile')
const PROFILE_META = path.join(PROFILE_DIR, '.meta.json')

let sharedContext: BrowserContext

// dappwright hardcodes its own args and ignores options.args, so we patch
// launchPersistentContext to inject the same window size args used by static tests.
// Node.js module cache guarantees dappwright uses the same chromium object.
async function bootstrapWithWindowSize() {
  const original = chromium.launchPersistentContext.bind(chromium)

  // Warm start: reuse existing MetaMask profile (local dev only)
  if (PERSIST_WALLET && fs.existsSync(PROFILE_META)) {
    try {
      const { extensionPath } = JSON.parse(fs.readFileSync(PROFILE_META, 'utf-8'))
      if (fs.existsSync(extensionPath)) {
        const context = await original(PROFILE_DIR, {
          headless: false,
          args: [
            `--disable-extensions-except=${extensionPath}`,
            `--load-extension=${extensionPath}`,
            ...LAUNCH_OPTIONS.args,
          ],
        })
        // Unlock MetaMask (locked after browser restart)
        const wallet = await dappwright.getWallet('metamask', context)
        await wallet.unlock()
        return context
      }
    } catch {
      // Corrupted meta or missing extension — fall through to cold start
    }
  }

  // Cold start: full dappwright bootstrap
  let capturedExtPath: string | undefined
  ;(chromium as any).launchPersistentContext = async (userDataDir: string, options: any = {}) => {
    const dir = PERSIST_WALLET ? PROFILE_DIR : userDataDir
    const extArg = options.args?.find((a: string) => a.startsWith('--load-extension='))
    if (extArg) capturedExtPath = extArg.split('=')[1]
    return original(dir, { ...options, args: [...(options.args ?? []), ...LAUNCH_OPTIONS.args] })
  }

  try {
    const [, , context] = await dappwright.bootstrap('', {
      wallet: 'metamask',
      version: MetaMaskWallet.recommendedVersion,
      seed: SEED_PHRASE,
      headless: false,
    })

    // Save extension path for warm starts
    if (PERSIST_WALLET && capturedExtPath) {
      fs.mkdirSync(path.dirname(PROFILE_META), { recursive: true })
      fs.writeFileSync(PROFILE_META, JSON.stringify({ extensionPath: capturedExtPath }))
    }

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
