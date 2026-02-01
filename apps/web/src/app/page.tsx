import { AppHeader } from '@/components/layout/app-header'
import { ClaimsList } from '@/components/features/claims/claims-list'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="container mx-auto px-6 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 border-l-8 border-accent pl-6">
            <h2 className="text-5xl font-bold uppercase leading-tight text-foreground">
              ALL CLAIMS
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Browse and generate proofs for existing transfer claims
            </p>
          </div>

          <ClaimsList />
        </div>
      </main>
    </div>
  )
}
