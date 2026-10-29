/* Patients app on the real API (backend L9–L12, docs/V2.md). Same signatures as mock/patients.ts. */
import { http, unwrap } from '@atp/core';
import type { PushSubscriptionBody } from '@/domain/types';
import type {
  CreateInvite,
  CreatedInvite,
  Invite,
  Member,
  PermissionDef,
  Role,
  Scope,
  UpdateMember,
} from '@atp/core';
import type {
  Appointment,
  AppointmentPatch,
  Branch,
  CalendarData,
  ConvertInquiry,
  ConvertResult,
  Inquiry,
  InquiryCounts,
  InquiryRequest,
  InquiryStatus,
  NewAppointment,
  NewBranch,
  NewPackage,
  NewPatient,
  NewPatientNote,
  NewPayment,
  NewTimeOff,
  Package,
  Patient,
  PatientNote,
  PatientProfile,
  PatientSummary,
  Payment,
  PublicClinic,
  StatusChange,
  Therapist,
  TimeOff,
  UpdateBranch,
  UpdateInquiry,
  UpdatePatient,
  WorkingHours,
} from '@/domain/types';

const path = (id: string) => ({ params: { path: { id } } });

export const realPatients = {
  // --- public (no session) -------------------------------------------------------------------
  getPublicClinic: (slug: string): Promise<PublicClinic> =>
    unwrap(http.GET('/v1/public/clinics/{slug}', { params: { path: { slug } } })),

  submitInquiry: (slug: string, v: InquiryRequest): Promise<{ ok: true }> =>
    unwrap(
      http.POST('/v1/public/clinics/{slug}/inquiries', { params: { path: { slug } }, body: v }),
    ),

  // --- branches, therapists, availability -----------------------------------------------------
  listBranches: (): Promise<Branch[]> => unwrap(http.GET('/v1/branches')),
  createBranch: (v: NewBranch): Promise<Branch> => unwrap(http.POST('/v1/branches', { body: v })),
  updateBranch: (id: string, v: UpdateBranch): Promise<Branch> =>
    unwrap(http.PATCH('/v1/branches/{id}', { ...path(id), body: v })),

  listTherapists: (): Promise<Therapist[]> => unwrap(http.GET('/v1/therapists')),
  getWorkingHours: (memberId: string): Promise<WorkingHours[]> =>
    unwrap(http.GET('/v1/members/{id}/working-hours', path(memberId))),
  setWorkingHours: (memberId: string, rows: WorkingHours[]): Promise<WorkingHours[]> =>
    unwrap(http.PUT('/v1/members/{id}/working-hours', { ...path(memberId), body: rows })),

  listTimeOff: (): Promise<TimeOff[]> => unwrap(http.GET('/v1/time-off')),
  createTimeOff: (v: NewTimeOff): Promise<TimeOff> =>
    unwrap(http.POST('/v1/time-off', { body: v })),
  async deleteTimeOff(id: string): Promise<void> {
    await unwrap(http.DELETE('/v1/time-off/{id}', path(id)));
  },

  getFreeSlots: (q: {
    therapistId: string;
    branchId: string;
    date: string;
    duration: number;
  }): Promise<string[]> =>
    unwrap(http.GET('/v1/availability/free-slots', { params: { query: q } })),

  // --- calendar ---------------------------------------------------------------------------------
  getCalendar: (q: { from: string; to: string }): Promise<CalendarData> =>
    unwrap(http.GET('/v1/calendar', { params: { query: q } })),
  createAppointment: (v: NewAppointment): Promise<Appointment> =>
    unwrap(http.POST('/v1/appointments', { body: v })),
  updateAppointment: (id: string, v: AppointmentPatch): Promise<Appointment> =>
    unwrap(http.PATCH('/v1/appointments/{id}', { ...path(id), body: v })),
  setAppointmentStatus: (id: string, v: StatusChange): Promise<Appointment> =>
    unwrap(http.POST('/v1/appointments/{id}/status', { ...path(id), body: v })),

  // --- inquiries --------------------------------------------------------------------------------
  listInquiries: (status?: InquiryStatus): Promise<Inquiry[]> =>
    unwrap(http.GET('/v1/inquiries', { params: { query: status ? { status } : {} } })),
  inquiryCounts: (): Promise<InquiryCounts> => unwrap(http.GET('/v1/inquiries/counts')),
  updateInquiry: (id: string, v: UpdateInquiry): Promise<Inquiry> =>
    unwrap(http.PATCH('/v1/inquiries/{id}', { ...path(id), body: v })),
  convertInquiry: (id: string, v: ConvertInquiry): Promise<ConvertResult> =>
    unwrap(http.POST('/v1/inquiries/{id}/convert', { ...path(id), body: v })),

  // --- patients ---------------------------------------------------------------------------------
  listPatients: (q = '', opts: { pending?: boolean } = {}): Promise<PatientSummary[]> =>
    unwrap(
      http.GET('/v1/patients', {
        params: { query: { ...(q && { q }), ...(opts.pending && { pending: 'true' as const }) } },
      }),
    ),
  createPatient: (v: NewPatient): Promise<Patient> =>
    unwrap(http.POST('/v1/patients', { body: v })),
  updatePatient: (id: string, v: UpdatePatient): Promise<Patient> =>
    unwrap(http.PATCH('/v1/patients/{id}', { ...path(id), body: v })),
  getPatient: (id: string): Promise<PatientProfile> =>
    unwrap(http.GET('/v1/patients/{id}', path(id))),

  listNotes: (patientId: string): Promise<PatientNote[]> =>
    unwrap(http.GET('/v1/patients/{id}/notes', path(patientId))),
  createNote: (patientId: string, v: NewPatientNote): Promise<PatientNote> =>
    unwrap(http.POST('/v1/patients/{id}/notes', { ...path(patientId), body: v })),

  sellPackage: (patientId: string, v: NewPackage): Promise<Package> =>
    unwrap(http.POST('/v1/patients/{id}/packages', { ...path(patientId), body: v })),
  recordPayment: (patientId: string, v: NewPayment): Promise<Payment> =>
    unwrap(http.POST('/v1/patients/{id}/payments', { ...path(patientId), body: v })),

  // --- new-request notifications (L16, D-054) ----------------------------------------------------
  getPushKey: async (): Promise<string | null> =>
    (await unwrap(http.GET('/v1/public/push/key'))).publicKey,
  savePushSubscription: async (v: PushSubscriptionBody): Promise<void> => {
    await unwrap(http.PUT('/v1/push/subscription', { body: v }));
  },
  deletePushSubscription: async (endpoint: string): Promise<void> => {
    await unwrap(http.DELETE('/v1/push/subscription', { body: { endpoint } }));
  },

  // --- users & roles (L2; managed here since D-051) ---------------------------------------------
  listPermissions: (): Promise<PermissionDef[]> => unwrap(http.GET('/v1/permissions')),
  listRoles: (): Promise<Role[]> => unwrap(http.GET('/v1/roles')),
  createRole: (name: string): Promise<Role> =>
    unwrap(http.POST('/v1/roles', { body: { name, description: '', permissions: {} } })),
  updateRolePermissions: (roleId: string, permissions: Record<string, Scope>): Promise<Role> =>
    unwrap(http.PATCH('/v1/roles/{id}', { ...path(roleId), body: { permissions } })),

  listMembers: (): Promise<Member[]> => unwrap(http.GET('/v1/members')),
  setMemberActive: (memberId: string, active: boolean): Promise<Member> =>
    unwrap(
      active
        ? http.POST('/v1/members/{id}/reactivate', path(memberId))
        : http.POST('/v1/members/{id}/deactivate', path(memberId)),
    ),
  updateMember: (memberId: string, v: UpdateMember): Promise<Member> =>
    unwrap(http.PATCH('/v1/members/{id}', { ...path(memberId), body: v })),
  listInvites: (): Promise<Invite[]> => unwrap(http.GET('/v1/invites')),
  createInvite: (input: CreateInvite): Promise<CreatedInvite> =>
    unwrap(http.POST('/v1/invites', { body: input })),
  revokeInvite: async (id: string): Promise<void> => {
    await unwrap(http.DELETE('/v1/invites/{id}', path(id)));
  },
};
