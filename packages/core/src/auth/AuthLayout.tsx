import type { ReactNode } from 'react';
import { useBrand } from '../brand';
import { InstallHint } from '../pwa/InstallHint';

/** Accent brand panel on desktop, single column on mobile. */
export function AuthLayout({
  panel,
  mobileLogo,
  children,
}: {
  panel: ReactNode;
  mobileLogo: ReactNode;
  children: ReactNode;
}) {
  const brand = useBrand();
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <InstallHint appName={brand.appName} className="pt-[max(4px,env(safe-area-inset-top))]" />
      <div className="flex flex-1">
        <div className="hidden flex-1 flex-col justify-between bg-accent p-12 lg:flex">
          <div className="self-start bg-white p-5">
            <img src="/atp-logo.svg" alt="ATP Rehab" className="h-[120px]" />
          </div>
          {panel}
        </div>
        <main className="flex w-full max-w-[520px] flex-1 flex-col justify-center px-6 py-6 lg:px-14 lg:py-12">
          <div className="lg:hidden">{mobileLogo}</div>
          {children}
        </main>
      </div>
    </div>
  );
}
