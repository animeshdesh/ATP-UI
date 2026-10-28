/* The mock clinic's people and roles, shared by every app's in-memory mocks (D-012). */
import type { Person, RoleKey } from '../../types';

export const PEOPLE: Record<string, Person> = {
  Sameer: {
    key: 'Sameer',
    fullName: 'Dr. Sameer Ushkewar',
    shortName: 'Sameer U.',
    initials: 'SU',
  },
  RY: { key: 'RY', fullName: 'Dr. Rushikesh Yannawar', shortName: 'Rushikesh Y.', initials: 'RY' },
  RP: { key: 'RP', fullName: 'Dr. Rushikesh Patil', shortName: 'Rushikesh P.', initials: 'RP' },
  Santosh: {
    key: 'Santosh',
    fullName: 'Dr. Santosh Bhalerao',
    shortName: 'Santosh B.',
    initials: 'SB',
  },
  Anjali: {
    key: 'Anjali',
    fullName: 'Dr. Anjali Deshmukh',
    shortName: 'Anjali D.',
    initials: 'AD',
  },
  Pooja: { key: 'Pooja', fullName: 'Pooja Shinde', shortName: 'Pooja S.', initials: 'PS' },
  Clinic: {
    key: 'Clinic',
    fullName: 'Clinic account',
    shortName: 'Clinic account',
    initials: 'CA',
  },
  CA: {
    key: 'CA',
    fullName: 'Kulkarni & Associates',
    shortName: 'Kulkarni & Assoc.',
    initials: 'KA',
  },
};

export const ROLE_LABEL: Record<RoleKey, string> = {
  owner: 'Owner',
  therapist: 'Therapist',
  frontdesk: 'Front desk',
  ca: 'CA (read-only)',
};

/** Signed-in user per role in the mock. */
export const USER_FOR_ROLE: Record<RoleKey, string> = {
  owner: 'Sameer',
  therapist: 'Anjali',
  frontdesk: 'Pooja',
  ca: 'CA',
};
