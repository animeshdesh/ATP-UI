import { createContext, use, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export interface PageAction {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
}

export interface PageHeader {
  title: string;
  /** Desktop subtitle, under the title. */
  subtitle?: string;
  /** Mobile title and kicker, when they differ (e.g. "Today" vs "Calendar"). */
  mobileTitle?: string;
  mobileSubtitle?: string;
  /** Desktop top-bar button; also what the mobile add button does on this screen. */
  action?: PageAction;
}

const HeaderContext = createContext<{
  header: PageHeader;
  setHeader: (h: PageHeader) => void;
} | null>(null);

export function HeaderProvider({ children }: { children: ReactNode }) {
  const [header, setHeader] = useState<PageHeader>({ title: '' });
  return <HeaderContext value={{ header, setHeader }}>{children}</HeaderContext>;
}

export const useHeaderState = () => {
  const v = use(HeaderContext);
  if (!v) throw new Error('useHeaderState outside HeaderProvider');
  return v.header;
};

/** Screens set the shell's title, subtitle and main action. */
export function usePageHeader(h: PageHeader) {
  const setHeader = use(HeaderContext)?.setHeader;
  const { title, subtitle, mobileTitle, mobileSubtitle, action } = h;
  // The action's handler is usually inline; call the latest one without re-publishing the header.
  const latest = useRef(action);
  useLayoutEffect(() => {
    latest.current = action;
  });
  const label = action?.label;
  const icon = action?.icon;
  useLayoutEffect(() => {
    setHeader?.({
      title,
      subtitle,
      mobileTitle,
      mobileSubtitle,
      action: label && icon ? { label, icon, onClick: () => latest.current?.onClick() } : undefined,
    });
  }, [setHeader, title, subtitle, mobileTitle, mobileSubtitle, label, icon]);
}
