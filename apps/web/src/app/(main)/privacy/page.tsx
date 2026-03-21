import type { Metadata } from 'next'
import { PageContainer } from '@/components/layout/page-container'
import { BackLink } from '@/components/shared/back-link'
import { PageHeader } from '@/components/shared/page-header'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy Policy for Proof of Transfer',
}

export default function PrivacyPage() {
  return (
    <PageContainer>
      <div className="mb-4">
        <BackLink href="/" label="Back to Claims" />
      </div>

      <PageHeader title="Privacy Policy" />

      <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
        <p className="text-muted-foreground">Last updated: March 16, 2026</p>

        <section className="space-y-3">
          <h2 className="text-2xl font-bold uppercase">1. Overview</h2>
          <p>
            Proof of Transfer is designed to be privacy-preserving. We never store the wallet
            addresses of provers or verifiers. This policy explains what data we do process and
            why.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-bold uppercase">2. What We Store</h2>
          <ul className="list-disc space-y-1 pl-6">
            <li>
              <strong>Claims</strong> — claim messages, constraints, token and counterparty
              addresses, merkle roots. All user-provided and publicly visible.
            </li>
            <li>
              <strong>Proofs</strong> — ZK proof bytes, public inputs, and nullifiers. Nullifiers
              are pseudonymous identifiers derived from your wallet signature — they are designed
              to be computationally infeasible to reverse to a wallet address.
            </li>
            <li>
              <strong>Verifications</strong> — verification results (pass/fail) and verifier
              nullifiers.
            </li>
            <li>
              <strong>Transfers</strong> — copies of publicly available blockchain transfer data
              (sender, recipient, amounts, transaction hashes) fetched from block explorer APIs.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-bold uppercase">3. What We Do Not Store</h2>
          <ul className="list-disc space-y-1 pl-6">
            <li>Prover or verifier wallet addresses — never sent to or stored on the server.
              Note: transfer records contain sender and recipient addresses from public blockchain
              data, and claims include a counterparty address — these are already publicly
              available on-chain.</li>
            <li>EIP-712 signatures — processed entirely in your browser</li>
            <li>Email addresses, names, or account credentials — no accounts exist</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-bold uppercase">4. Cookies</h2>
          <p>
            We use functional cookies only (wallet connection state via wagmi) to maintain your
            wallet session across page loads. No analytics or tracking cookies are used.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-bold uppercase">5. IP Addresses</h2>
          <p>
            IP addresses are used in-memory for rate limiting to prevent abuse. They are not
            persisted to any database or log file.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-bold uppercase">6. Third-Party Services</h2>
          <p>The Service relies on external services that may process your data:</p>
          <ul className="list-disc space-y-1 pl-6">
            <li>
              <strong>Reown (WalletConnect)</strong> — wallet connection. Subject to{' '}
              <a
                href="https://reown.com/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold underline hover:opacity-80"
              >
                Reown&apos;s privacy policy
              </a>
            </li>
            <li>
              <strong>Etherscan / block explorer APIs</strong> — fetching public transfer data
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-bold uppercase">7. Data Retention</h2>
          <p>
            Claims, proofs, and verifications are stored indefinitely as they are part of the
            public record of the Service. Transfer data is retained as long as the associated claim
            exists. There is currently no self-service deletion mechanism — contact us if you need
            data removed.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-bold uppercase">8. Your Rights</h2>
          <p>
            Depending on your jurisdiction, you may have the right to access, correct, or delete
            your data. Since we do not store wallet addresses or personal accounts, most data in our
            system is either public blockchain data or pseudonymous (nullifiers). Contact us to
            exercise your rights.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-bold uppercase">9. Contact</h2>
          <p>
            For privacy-related questions, open an issue on our{' '}
            <a
              href="https://github.com/tarasnurko/transferproover"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold underline hover:opacity-80"
            >
              GitHub repository
            </a>
            .
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-bold uppercase">10. Changes</h2>
          <p>
            We may update this policy at any time. Changes will be reflected by updating the
            &quot;Last updated&quot; date above.
          </p>
        </section>
      </div>
    </PageContainer>
  )
}
