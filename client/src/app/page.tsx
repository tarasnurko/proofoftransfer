import { ChangeThemeButton } from "@/components/change-theme-button";
import { Button } from "../components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center gap-8 py-32 px-16 bg-white dark:bg-black sm:items-start">
        <div className="flex items-center gap-4">
          <Button>Button</Button>
          <ChangeThemeButton />
        </div>
      </main>
    </div>
  );
}
