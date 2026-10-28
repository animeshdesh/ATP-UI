/*
 * Mock entry point for tests. Every backend level now has a contract-shaped mock:
 * L2: l2.ts · L3: ledger.ts · L4–L7: finance.ts.
 */
import { resetMockFinance } from './finance';
import { resetMockL2 } from '@atp/core/mock';
import { resetMockLedger } from './ledger';

/** Test hook: restore seed state of every mock. */
export function resetMockDb() {
  resetMockL2();
  resetMockLedger();
  resetMockFinance();
}
