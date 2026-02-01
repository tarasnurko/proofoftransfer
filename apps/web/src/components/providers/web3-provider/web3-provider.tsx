"use client";

import { ReactNode, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, cookieToInitialState, type Config } from "wagmi";
import { createAppKit } from "@reown/appkit/react";
import { mainnet } from "@reown/appkit/networks";
import { wagmiConfig, networks, projectId, wagmiAdapter } from "@/config";

const metadata = {
  name: "Proof of Transfer",
  description: "Proof of Transfer Application",
  url:
    typeof window !== "undefined"
      ? window.location.origin
      : "https://proofoftransfer.xyz",
  icons: ["/icon.png"],
};

if (projectId) {
  createAppKit({
    adapters: [wagmiAdapter],
    projectId: projectId!,
    networks: networks,
    defaultNetwork: mainnet,
    metadata,
    // themeMode: "",
    enableCoinbase: false,
    enableReconnect: false,
    features: {
      analytics: false,
      email: false,
      socials: false,
    },
    themeVariables: {
      // '--w3m-font-family': 'var(--font-sans), sans-serif',
      // '--w3m-accent': '#000000',
    },
  });
}

export function Web3Provider({
  children,
  cookies,
}: {
  children: ReactNode;
  cookies: string | null;
}) {
  const [queryClient] = useState(() => new QueryClient());
  const initialState = cookieToInitialState(wagmiConfig as Config, cookies);

  return (
    <WagmiProvider config={wagmiConfig as Config} initialState={initialState}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
