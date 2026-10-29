import { createContext, use, type ReactNode } from 'react';

/** Per-app copy on the shared sign-in screens. */
export interface Brand {
  /** e.g. "ATP Rehab Clinic OS"; shown as "<product> · staff only". */
  product: string;
  /** Large line on the desktop brand panel. */
  headline: string;
  /** Optional line under the sign-in form. */
  note?: string;
  /** Home-screen name, for the install tip (e.g. "ATP Money"). */
  appName: string;
}

const BrandContext = createContext<Brand>({ product: 'ATP Rehab', headline: '', appName: 'ATP' });

export function BrandProvider({ brand, children }: { brand: Brand; children: ReactNode }) {
  return <BrandContext value={brand}>{children}</BrandContext>;
}

export const useBrand = () => use(BrandContext);
