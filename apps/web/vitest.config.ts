import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: 'node',
    env: {
      DATABASE_URL: 'postgresql://pot:pot_dev_password@localhost:5432/proofoftransfer',
      ETHERSCAN_API_KEY: 'test-key',
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['src/**/__tests__/*.unit.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          include: ['src/**/__tests__/*.integration.test.ts'],
          setupFiles: ['src/__tests__/setup.integration.ts'],
          pool: 'forks',
          testTimeout: 120_000,
          fileParallelism: false,
          sequence: {
            concurrent: false,
          },
        },
      },
    ],
  },
})
