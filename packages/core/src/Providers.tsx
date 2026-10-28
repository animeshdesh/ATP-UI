import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '@atp/ui';
import { BrandProvider, type Brand } from './brand';
import { SessionProvider } from './session';

export const makeQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
    },
  });

export function Providers({
  client,
  brand,
  children,
}: {
  client: QueryClient;
  brand: Brand;
  children: ReactNode;
}) {
  return (
    <QueryClientProvider client={client}>
      <BrandProvider brand={brand}>
        <ToastProvider>
          <SessionProvider>{children}</SessionProvider>
        </ToastProvider>
      </BrandProvider>
    </QueryClientProvider>
  );
}
