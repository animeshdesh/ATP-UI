import type { AuditRow, Tone } from '@atp/core';
import { parseTimestamp } from '@atp/core';
import { inr } from '@/lib/money';

export interface AuditView {
  action: 'Created' | 'Edited' | 'Deleted';
  tone: Tone;
  entity: string;
  changes: Array<{ field: string; before?: string; after: string }>;
  at: string;
  by: string;
}

/** Tables shown in the filter, in the order the API logs them (backend D-016). */
export const AUDIT_TABLES: Array<{ value: string; label: string }> = [
  { value: '', label: 'Everything' },
  { value: 'transactions', label: 'Entries' },
  { value: 'clinic_members', label: 'Members' },
  { value: 'member_roles', label: 'Member roles' },
  { value: 'roles', label: 'Roles' },
  { value: 'role_permissions', label: 'Permissions' },
  { value: 'invites', label: 'Invites' },
  { value: 'profiles', label: 'Profiles' },
  { value: 'clinics', label: 'Clinic' },
];

const TABLE_LABEL: Record<string, string> = {
  transactions: 'Entry',
  clinic_members: 'Member',
  member_roles: 'Member role',
  roles: 'Role',
  role_permissions: 'Permission',
  invites: 'Invite',
  profiles: 'Profile',
  clinics: 'Clinic',
};

/** Bookkeeping columns that say nothing to a reader. */
const HIDDEN = new Set([
  'id',
  'clinic_id',
  'created_at',
  'updated_at',
  'user_id',
  'role_id',
  'member_id',
  'token_hash',
  'created_by',
]);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Ids (single or arrays) mean nothing to a reader; the entity line already names the row. */
const isOpaque = (v: unknown) =>
  (typeof v === 'string' && UUID.test(v)) ||
  (Array.isArray(v) && v.length > 0 && v.every((x) => typeof x === 'string' && UUID.test(x)));
const shown = (k: string, v: unknown) => !HIDDEN.has(k) && !k.endsWith('_id') && !isOpaque(v);

const humanField = (k: string) =>
  k
    .replace(/_paise$/, '')
    .replace(/_at$/, '')
    .replace(/_/g, ' ');

function formatValue(key: string, v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  if (key.endsWith('_paise') && typeof v === 'number') return inr(v);
  if (key.endsWith('_at') && typeof v === 'string') return formatAt(v);
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

export function formatAt(ts: string): string {
  const d = parseTimestamp(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Kolkata',
  });
}

function entityName(row: AuditRow): string {
  const r = (row.after ?? row.before ?? {}) as Record<string, unknown>;
  const s = (k: string) => (typeof r[k] === 'string' && r[k] ? String(r[k]) : '');
  switch (row.tableName) {
    case 'transactions':
      return [s('type') === 'income' ? 'Income' : 'Expense', s('category')]
        .filter(Boolean)
        .join(' · ');
    case 'role_permissions':
      return ['Permission', s('role'), s('permission_key')].filter(Boolean).join(' · ');
    default:
      return [
        TABLE_LABEL[row.tableName] ?? row.tableName,
        s('display_name') || s('name') || s('full_name'),
      ]
        .filter(Boolean)
        .join(' · ');
  }
}

/** Raw audit row (table, action, before/after jsonb) → one readable log line. */
export function describeAudit(row: AuditRow): AuditView {
  const before = (row.before ?? {}) as Record<string, unknown>;
  const after = (row.after ?? {}) as Record<string, unknown>;
  const softDeleted = row.tableName === 'transactions' && !before.deleted_at && !!after.deleted_at;

  let changes: AuditView['changes'];
  if (row.action === 'update') {
    changes = Object.keys(after)
      .filter(
        (k) =>
          shown(k, after[k] ?? before[k]) && JSON.stringify(before[k]) !== JSON.stringify(after[k]),
      )
      .map((k) => ({
        field: humanField(k),
        before: formatValue(k, before[k]),
        after: formatValue(k, after[k]),
      }));
  } else {
    const src = row.action === 'delete' ? before : after;
    const summary = Object.entries(src)
      .filter(
        ([k, v]) =>
          shown(k, v) &&
          v !== null &&
          v !== '' &&
          !['type', 'category', 'role', 'name', 'display_name'].includes(k),
      )
      .map(([k, v]) => formatValue(k, v));
    changes = summary.length ? [{ field: '', after: summary.join(' · ') }] : [];
  }

  const action =
    softDeleted || row.action === 'delete'
      ? 'Deleted'
      : row.action === 'insert'
        ? 'Created'
        : 'Edited';
  if (softDeleted) changes = [{ field: '', after: 'Soft-deleted' }];
  return {
    action,
    tone: action === 'Created' ? 'accent' : action === 'Edited' ? 'warn' : 'danger',
    entity: entityName(row),
    changes,
    at: formatAt(row.at),
    by: row.actor?.name ?? 'System',
  };
}
