import { AppHeader } from '@/components/layout/app-header'
import { CreateClaimForm } from '@/components/features/claims/create-claim-form'

export default function CreateClaimPage() {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="container mx-auto px-6 py-12">
        <div className="mx-auto max-w-4xl">
          <div className="mb-12 border-l-8 border-accent pl-6">
            <h2 className="text-5xl font-bold uppercase leading-tight text-foreground">
              CREATE CLAIM
            </h2>
          </div>

          <CreateClaimForm />
        </div>
      </main>
    </div>
  )
}
