import { defineConfig, devices } from '@playwright/test'
import { LAUNCH_OPTIONS } from './e2e/config'

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  timeout: 120_000,
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3005',
    trace: 'on-first-retry',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    launchOptions: {
      slowMo: Number(process.env.SLOW_MO) || 0,
      ...LAUNCH_OPTIONS,
    },
    viewport: null,
  },
  projects: [
    {
      name: 'static',
      testMatch: [
        'home.spec.ts',
        'claim-details.spec.ts',
        'proof-details.spec.ts',
        'create-claim.spec.ts',
      ],
      use: { ...devices['Desktop Chrome'], viewport: null, deviceScaleFactor: undefined },
    },
    {
      name: 'wallet',
      testMatch: ['wallet-flow.spec.ts', 'flows.spec.ts', 'verify-proof.spec.ts'],
      // dappwright manages its own chromium context with MetaMask extension
    },
  ],
  webServer: {
    command: 'pnpm dev',
    port: 3005,
    reuseExistingServer: !process.env.CI,
  },
})
