# Synpress E2E Status

## Current State

**Synpress 4.1.2** (latest) + **MetaMask 13.13.1** (Manifest V3).

### What Works

- Static UI tests (home, claim details, proof details, create claim) — all pass
- Global setup: Anvil + ERC20 deploy + mint + DB seed
- Test fixtures and helpers

### What's Blocked

Wallet-dependent tests (`wallet` project) are blocked by a known Synpress bug:
- [synpress-io/synpress#1308](https://github.com/synpress-io/synpress/issues/1308) — MetaMask 13.x MV3 setup hangs after onboarding
- MetaMask MV3 service worker doesn't initialize properly in Playwright
- Cache build completes but wallet data doesn't persist on restore
- No fix or ETA from maintainers

### Running Tests

```bash
# Static tests only (works)
pnpm --filter web test:e2e -- --project=static

# Wallet tests (blocked by Synpress #1308)
pnpm --filter web test:e2e -- --project=wallet

# All tests
pnpm --filter web test:e2e
```

## File Layout

```
e2e/
  wallet-setup/
    basic.setup.ts          # Synpress wallet cache setup (importWallet + onboarding-complete-done)
  fixtures.ts               # Synpress MetaMask fixtures (shared by all wallet tests)
  flows.spec.ts             # Full flow: create claim → generate proof → verify → self-verify rejection
  wallet-flow.spec.ts       # Basic wallet connect tests
  home.spec.ts              # Home page static tests
  claim-details.spec.ts     # Claim details static tests
  proof-details.spec.ts     # Proof details static tests
  create-claim.spec.ts      # Create claim static tests
  global-setup.ts           # Anvil + deploy + DB seed
  global-teardown.ts        # Cleanup
  helpers/
    db.ts                   # DB seed/truncate helpers
    fixtures.ts             # Test data loading
```
