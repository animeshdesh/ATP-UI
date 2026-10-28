import { createContext, use, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuthedSession } from '@atp/core';
import { useBranches } from '@/api/queries';
import type { Branch } from '@/domain/types';

export type BranchFilter = string | 'all';

interface BranchValue {
  /** Sidebar / header picker: one branch or all of them. */
  current: BranchFilter;
  setCurrent: (b: BranchFilter) => void;
  branches: Branch[];
  /** Active (not archived) branches. */
  active: Branch[];
  byId: (id: string | null | undefined) => Branch | undefined;
  /** Branch for new records: the picked one, else the first active. */
  defaultId: string;
  matches: (branchId: string | null | undefined) => boolean;
}

const BranchContext = createContext<BranchValue | null>(null);

const storageKey = (userKey: string) => `atp.patients.branch.${userKey}`;
const read = (key: string): BranchFilter => {
  try {
    return localStorage.getItem(key) ?? 'all';
  } catch {
    return 'all';
  }
};

/** The picked branch is remembered per user on this device. */
export function BranchProvider({ children }: { children: ReactNode }) {
  const session = useAuthedSession();
  const key = storageKey(session.user.key);
  const [current, setState] = useState<BranchFilter>(() => read(key));
  const { data: branches = [] } = useBranches();

  useEffect(() => {
    try {
      localStorage.setItem(key, current);
    } catch {
      /* storage unavailable */
    }
  }, [key, current]);

  const value = useMemo<BranchValue>(() => {
    const active = branches.filter((b) => !b.archivedAt);
    const known = current === 'all' || active.some((b) => b.id === current);
    const cur = known ? current : 'all';
    return {
      current: cur,
      setCurrent: setState,
      branches,
      active,
      byId: (id) => branches.find((b) => b.id === id),
      defaultId: cur !== 'all' ? cur : (active[0]?.id ?? ''),
      matches: (id) => cur === 'all' || id === cur,
    };
  }, [branches, current]);
  return <BranchContext value={value}>{children}</BranchContext>;
}

export function useBranch() {
  const v = use(BranchContext);
  if (!v) throw new Error('useBranch outside BranchProvider');
  return v;
}
