import { ProofGenerator } from "@/components/proof-generator";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <main className="container py-8">
        <ProofGenerator />
      </main>
    </div>
  );
}
