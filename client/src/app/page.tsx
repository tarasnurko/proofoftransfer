import { ChangeThemeButton } from "@/components/change-theme-button";
import { WalletConnect } from "@/components/wallet-connect";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center gap-8 py-32 px-16 bg-white dark:bg-black sm:items-start">
        <div className="flex items-center justify-between w-full">
          <h1 className="text-2xl font-bold">Transfer Prover</h1>
          <ChangeThemeButton />
        </div>

        <div className="w-full">
          <WalletConnect />
        </div>
      </main>
    </div>
  );
}
