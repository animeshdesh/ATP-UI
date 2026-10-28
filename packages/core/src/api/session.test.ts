import { describe, expect, it } from 'vitest';
import type { Me } from '../types';
import {
  initials,
  parseIdentifier,
  parseTimestamp,
  roleKeyFrom,
  sessionFromMe,
  shortName,
} from './session';

const me = (active: Me['activeClinic']): Me => ({
  user: {
    id: 'u1',
    fullName: 'Dr. Sameer Ushkewar',
    email: 'owner@atp.local',
    phone: '+919822041736',
  },
  clinics: [
    { id: 'c1', name: 'ATP Rehab', memberId: 'm1' },
    { id: 'c2', name: 'ATP Kothrud', memberId: 'm2' },
  ],
  activeClinic: active,
});

describe('parseIdentifier', () => {
  it('accepts email and Indian phone numbers in E.164', () => {
    expect(parseIdentifier(' Owner@ATP.local ')).toEqual({ email: 'owner@atp.local' });
    expect(parseIdentifier('98220 41736')).toEqual({ phone: '+919822041736' });
    expect(parseIdentifier('+91 98220-41736')).toEqual({ phone: '+919822041736' });
    expect(parseIdentifier('919822041736')).toEqual({ phone: '+919822041736' });
  });
  it('rejects anything else', () => {
    expect(parseIdentifier('sameer')).toBeNull();
    expect(parseIdentifier('12345')).toBeNull();
    expect(parseIdentifier('a@b')).toBeNull();
  });
  it('rejects phones while phone sign-in is off', () => {
    expect(parseIdentifier('98220 41736', { phone: false })).toBeNull();
    expect(parseIdentifier('a@b.in', { phone: false })).toEqual({ email: 'a@b.in' });
  });
});

describe('sessionFromMe', () => {
  it('maps the active clinic, roles and permissions', () => {
    const s = sessionFromMe(
      me({
        id: 'c1',
        name: 'ATP Rehab',
        memberId: 'm1',
        roles: [{ id: 'r1', name: 'Therapist' }],
        permissions: { 'finance.entry.create': 'own', 'finance.entry.view': 'own' },
      }),
    );
    expect(s).toMatchObject({
      user: { key: 'u1', fullName: 'Dr. Sameer Ushkewar', shortName: 'Sameer U.', initials: 'SU' },
      role: 'therapist',
      roleLabel: 'Therapist',
      clinicId: 'c1',
      clinicName: 'ATP Rehab',
    });
  });
  it('asks for a clinic when none is active', () => {
    expect(sessionFromMe(me(null))).toEqual({
      pickClinic: [
        { id: 'c1', name: 'ATP Rehab', memberId: 'm1' },
        { id: 'c2', name: 'ATP Kothrud', memberId: 'm2' },
      ],
      userName: 'Dr. Sameer Ushkewar',
    });
  });
});

describe('helpers', () => {
  it('derives the closest default role, falling back on permissions for custom roles', () => {
    expect(roleKeyFrom(['Front desk'], {})).toBe('frontdesk');
    expect(roleKeyFrom(['Partner'], { 'finance.settlement.manage': 'all' })).toBe('owner');
    expect(roleKeyFrom(['Consultant'], { 'finance.entry.create': 'own' })).toBe('therapist');
    expect(roleKeyFrom(['Auditor'], { 'audit.view': 'all' })).toBe('ca');
  });
  it('builds initials and short names', () => {
    expect(initials('Pooja Shinde')).toBe('PS');
    expect(initials('Kulkarni & Associates')).toBe('KA');
    expect(shortName('Pooja Shinde')).toBe('Pooja S.');
  });
  it('parses Postgres text timestamps', () => {
    expect(parseTimestamp('2026-10-14 05:42:52.177971+00').toISOString()).toBe(
      '2026-10-14T05:42:52.177Z',
    );
    expect(parseTimestamp('2026-10-14T11:12:00+05:30').toISOString()).toBe(
      '2026-10-14T05:42:00.000Z',
    );
  });
});
