import { describe, expect, it } from 'vitest';
import type { AuditRow } from '@/domain/types';
import { describeAudit } from './describe';

const row = (o: Partial<AuditRow>): AuditRow => ({
  id: '1',
  at: '2026-10-14 05:42:52+00',
  action: 'update',
  tableName: 'transactions',
  rowId: 't1',
  actor: { id: 'u', name: 'Rushikesh Patil' },
  before: null,
  after: null,
  ...o,
});

describe('describeAudit', () => {
  it('shows only changed, meaningful fields with money formatted', () => {
    const v = describeAudit(
      row({
        before: { type: 'expense', category: 'Consumables', amount_paise: 342000, updated_at: 'a' },
        after: { type: 'expense', category: 'Consumables', amount_paise: 324000, updated_at: 'b' },
      }),
    );
    expect(v).toMatchObject({
      action: 'Edited',
      tone: 'warn',
      entity: 'Expense · Consumables',
      changes: [{ field: 'amount', before: '₹3,420', after: '₹3,240' }],
      at: '14 Oct, 11:12',
      by: 'Rushikesh Patil',
    });
  });

  it('reports a soft delete as Deleted', () => {
    const v = describeAudit(
      row({
        before: { type: 'expense', category: 'Miscellaneous', deleted_at: null },
        after: { type: 'expense', category: 'Miscellaneous', deleted_at: '2026-10-11T13:00:00Z' },
      }),
    );
    expect(v.action).toBe('Deleted');
    expect(v.changes).toEqual([{ field: '', after: 'Soft-deleted' }]);
  });

  it('summarises inserts on other tables and system actors', () => {
    const v = describeAudit(
      row({
        action: 'insert',
        tableName: 'clinic_members',
        actor: null,
        after: { id: 'm', clinic_id: 'c', display_name: 'Pooja Shinde', status: 'active' },
      }),
    );
    expect(v).toMatchObject({
      action: 'Created',
      entity: 'Member · Pooja Shinde',
      changes: [{ after: 'active' }],
      by: 'System',
    });
  });
});

describe('describeAudit ids', () => {
  it('hides uuid values and *_id columns', () => {
    const v = describeAudit(
      row({
        action: 'insert',
        tableName: 'invites',
        after: {
          display_name: 'Dr. Neha Test',
          email: 'neha@atp.local',
          role_ids: ['3f86549d-96fe-4178-a1c1-73ae634d07a5'],
          invited_by: 'c21f7daa-ffce-4880-b118-6d8b7d0267c2',
          member_id: 'x',
        },
      }),
    );
    expect(v.entity).toBe('Invite · Dr. Neha Test');
    expect(v.changes).toEqual([{ field: '', after: 'neha@atp.local' }]);
  });
});
