import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { sessionKey, type Role, type Scope, type UpdateMember } from '@atp/core';
import type {
  AppointmentPatch,
  ConvertInquiry,
  InquiryRequest,
  InquiryStatus,
  NewAppointment,
  NewBranch,
  NewPackage,
  NewPatient,
  NewPayment,
  PatientNote,
  StatusChange,
  NewTimeOff,
  WorkingHours,
} from '@/domain/types';
import { api } from './index';

export const qk = {
  session: sessionKey,
  branches: ['branches'] as const,
  therapists: ['therapists'] as const,
  hours: (memberId: string) => ['hours', memberId] as const,
  timeOff: ['time-off'] as const,
  calendar: (from: string, to: string) => ['calendar', from, to] as const,
  freeSlots: (q: { therapistId: string; branchId: string; date: string; duration: number }) =>
    ['free-slots', q] as const,
  inquiries: (status?: InquiryStatus) => ['inquiries', status ?? 'all'] as const,
  inquiryCounts: ['inquiries', 'counts'] as const,
  patients: (q: string, pending = false) => ['patients', q, pending] as const,
  patient: (id: string) => ['patient', id] as const,
  notes: (patientId: string) => ['notes', patientId] as const,
  publicClinic: (slug: string) => ['public-clinic', slug] as const,
  permissionCatalog: ['permission-catalog'] as const,
  roles: ['roles'] as const,
  members: ['members'] as const,
  invites: ['invites'] as const,
};

// --- reads --------------------------------------------------------------------------------------

export const useBranches = () =>
  useQuery({ queryKey: qk.branches, queryFn: api.listBranches, staleTime: 5 * 60_000 });

export const useTherapists = () =>
  useQuery({ queryKey: qk.therapists, queryFn: api.listTherapists, staleTime: 5 * 60_000 });

export const useWorkingHours = (memberId: string | null) =>
  useQuery({
    queryKey: qk.hours(memberId ?? ''),
    queryFn: () => api.getWorkingHours(memberId!),
    enabled: !!memberId,
  });

export const useTimeOff = () => useQuery({ queryKey: qk.timeOff, queryFn: api.listTimeOff });

export const useCalendar = (from: string, to: string) =>
  useQuery({ queryKey: qk.calendar(from, to), queryFn: () => api.getCalendar({ from, to }) });

export const useFreeSlots = (
  q: { therapistId: string; branchId: string; date: string; duration: number } | null,
) =>
  useQuery({
    queryKey: qk.freeSlots(q ?? { therapistId: '', branchId: '', date: '', duration: 0 }),
    queryFn: () => api.getFreeSlots(q!),
    enabled: !!q?.therapistId && !!q.branchId && !!q.date,
    staleTime: 0,
  });

export const useInquiries = (status?: InquiryStatus, enabled = true) =>
  useQuery({ queryKey: qk.inquiries(status), queryFn: () => api.listInquiries(status), enabled });

export const useInquiryCounts = (enabled = true) =>
  useQuery({
    queryKey: qk.inquiryCounts,
    queryFn: api.inquiryCounts,
    enabled,
    refetchInterval: 60_000,
  });

/** `pending`: only patients who owe (D-052; Owner and Front desk). */
export const usePatients = (q = '', pending = false) =>
  useQuery({
    queryKey: qk.patients(q, pending),
    queryFn: () => api.listPatients(q, { pending }),
  });

export const usePatient = (id: string) =>
  useQuery({ queryKey: qk.patient(id), queryFn: () => api.getPatient(id) });

export const useNotes = (patientId: string, enabled = true) =>
  useQuery({ queryKey: qk.notes(patientId), queryFn: () => api.listNotes(patientId), enabled });

export const usePublicClinic = (slug: string) =>
  useQuery({ queryKey: qk.publicClinic(slug), queryFn: () => api.getPublicClinic(slug), retry: 1 });

// --- writes -------------------------------------------------------------------------------------

/** Anything that changes the schedule: calendar, free slots, patient summaries. */
const scheduleChanged = (qc: QueryClient) =>
  Promise.all([
    qc.invalidateQueries({ queryKey: ['calendar'] }),
    qc.invalidateQueries({ queryKey: ['free-slots'] }),
    qc.invalidateQueries({ queryKey: ['patients'] }),
    qc.invalidateQueries({ queryKey: ['patient'] }),
  ]);

export function useCreateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: NewAppointment) => api.createAppointment(v),
    onSettled: () => scheduleChanged(qc),
  });
}

export function useUpdateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: AppointmentPatch }) =>
      api.updateAppointment(id, patch),
    onSettled: () => scheduleChanged(qc),
  });
}

export function useSetStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, change }: { id: string; change: StatusChange }) =>
      api.setAppointmentStatus(id, change),
    onSettled: () => scheduleChanged(qc),
  });
}

export function useUpdateInquiry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...v
    }: {
      id: string;
      status: 'new' | 'contacted' | 'closed';
      closeReason?: 'not_interested' | 'duplicate' | 'wrong_number' | 'other';
    }) => api.updateInquiry(id, v),
    onSettled: () => qc.invalidateQueries({ queryKey: ['inquiries'] }),
  });
}

export function useConvertInquiry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...v }: ConvertInquiry & { id: string }) => api.convertInquiry(id, v),
    onSettled: () =>
      Promise.all([qc.invalidateQueries({ queryKey: ['inquiries'] }), scheduleChanged(qc)]),
  });
}

export function useCreatePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: NewPatient) => api.createPatient(v),
    onSettled: () => qc.invalidateQueries({ queryKey: ['patients'] }),
  });
}

export function useUpdatePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<NewPatient> }) =>
      api.updatePatient(id, patch),
    onSettled: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: ['patients'] }),
        qc.invalidateQueries({ queryKey: ['patient'] }),
      ]),
  });
}

export function useCreateNote(patientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: Pick<PatientNote, 'kind' | 'body' | 'appointmentId'>) =>
      api.createNote(patientId, v),
    onSettled: () => qc.invalidateQueries({ queryKey: qk.notes(patientId) }),
  });
}

export function useSellPackage(patientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: NewPackage) => api.sellPackage(patientId, v),
    onSettled: () => scheduleChanged(qc),
  });
}

export function useRecordPayment(patientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: NewPayment) => api.recordPayment(patientId, v),
    // Payments change dues on the profile and in the list (D-052).
    onSettled: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: qk.patient(patientId) }),
        qc.invalidateQueries({ queryKey: ['patients'] }),
      ]),
  });
}

export function useSetWorkingHours(memberId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rows: WorkingHours[]) => api.setWorkingHours(memberId, rows),
    onSettled: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: ['hours'] }),
        qc.invalidateQueries({ queryKey: ['free-slots'] }),
      ]),
  });
}

export function useCreateTimeOff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: NewTimeOff) => api.createTimeOff(v),
    onSettled: () =>
      Promise.all([qc.invalidateQueries({ queryKey: qk.timeOff }), scheduleChanged(qc)]),
  });
}

export function useDeleteTimeOff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteTimeOff(id),
    onSettled: () =>
      Promise.all([qc.invalidateQueries({ queryKey: qk.timeOff }), scheduleChanged(qc)]),
  });
}

export function useSaveBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...v }: Partial<NewBranch> & { id?: string; archived?: boolean }) =>
      id ? api.updateBranch(id, v) : api.createBranch(v as NewBranch),
    onSettled: () => qc.invalidateQueries({ queryKey: qk.branches }),
  });
}

export const useSubmitInquiry = (slug: string) =>
  useMutation({ mutationFn: (v: InquiryRequest) => api.submitInquiry(slug, v) });

/** Helpers for screens that read the working hours of every therapist (calendar grey-out). */
export const useAllHours = (memberIds: string[]) =>
  useQuery({
    queryKey: ['hours', 'all', memberIds],
    queryFn: async () =>
      Object.fromEntries(
        await Promise.all(
          memberIds.map(async (id) => [id, await api.getWorkingHours(id).catch(() => [])] as const),
        ),
      ) as Record<string, WorkingHours[]>,
    enabled: memberIds.length > 0,
  });

// --- users & roles (D-051) ----------------------------------------------------------------------

export const usePermissionCatalog = () =>
  useQuery({ queryKey: qk.permissionCatalog, queryFn: api.listPermissions, staleTime: Infinity });
export const useRoles = () => useQuery({ queryKey: qk.roles, queryFn: api.listRoles });
export const useMembers = () => useQuery({ queryKey: qk.members, queryFn: api.listMembers });
export const useInvites = () => useQuery({ queryKey: qk.invites, queryFn: api.listInvites });

/** One matrix cell. Optimistic, rolled back on error (e.g. scope_own_not_supported). */
export function useSetRolePermission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { roleId: string; key: string; scope: Scope }) =>
      api.updateRolePermissions(v.roleId, { [v.key]: v.scope }),
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: qk.roles });
      const prev = qc.getQueryData<Role[]>(qk.roles);
      qc.setQueryData<Role[]>(qk.roles, (roles) =>
        roles?.map((r) => {
          if (r.id !== v.roleId) return r;
          const permissions = { ...r.permissions };
          if (v.scope === 'none') delete permissions[v.key];
          else permissions[v.key] = v.scope;
          return { ...r, permissions };
        }),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(qk.roles, ctx?.prev),
    onSettled: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: qk.roles }),
        qc.invalidateQueries({ queryKey: qk.session }),
        qc.invalidateQueries({ queryKey: qk.therapists }),
      ]),
  });
}

export function useCreateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createRole,
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.roles }),
  });
}

export function useCreateInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createInvite,
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.invites }),
  });
}

export function useRevokeInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.revokeInvite,
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.invites }),
  });
}

/** Name and/or roles. Own roles change the session's permissions; names show in pickers. */
export function useUpdateMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { memberId: string } & UpdateMember) => {
      const { memberId, ...body } = v;
      return api.updateMember(memberId, body);
    },
    onSuccess: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: qk.members }),
        qc.invalidateQueries({ queryKey: qk.roles }),
        qc.invalidateQueries({ queryKey: qk.session }),
        qc.invalidateQueries({ queryKey: qk.therapists }),
      ]),
  });
}

/** Deactivated members also drop out of the therapist pickers. */
export function useSetMemberActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { memberId: string; active: boolean }) =>
      api.setMemberActive(v.memberId, v.active),
    onSuccess: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: qk.members }),
        qc.invalidateQueries({ queryKey: qk.therapists }),
      ]),
  });
}
