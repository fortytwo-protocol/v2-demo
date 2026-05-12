import type { ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { wagmiConfig } from "./lib/wagmi";
import { UrlStateProvider } from "./lib/url-state";
import { EnvironmentProvider } from "./lib/environment";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
});

export function Providers({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <EnvironmentProvider>
          <UrlStateProvider>{children}</UrlStateProvider>
        </EnvironmentProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
