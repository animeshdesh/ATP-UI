import { useDeferredValue, useState } from 'react';
import { ChevronRight, Search, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useSession } from '@atp/core';
import { Avatar, Button, Loading } from '@atp/ui';
import { usePatients } from '@/api/queries';
import { useBranch } from '@/app/branch';
import { usePageHeader } from '@/app/header';
import type { PatientSummary } from '@/domain/types';
import { formatPhone, initialsOf } from '@/lib/contact';
import { dateOf, relativeDay } from '@/lib/time';
import { useTherapistMap, whenLabel } from '@/features/calendar/common';
import { NewPatientSheet } from './NewPatientSheet';

const pkgLeft = (p: PatientSummary) =>
  p.activePackage ? `${p.activePackage.sessionsTotal - p.activePackage.sessionsUsed} left` : null;

/** Patient list and search by name or phone (PRD §6.3). */
export function PatientsPage() {
  const { can } = useSession();
  const navigate = useNavigate();
  const branch = useBranch();
  const therapists = useTherapistMap();
  const [q, setQ] = useState('');
  const query = useDeferredValue(q.trim());
  const [adding, setAdding] = useState(false);
  const { data = [], isPending } = usePatients(query);
  const rows = data.filter(
    (p) => branch.current === 'all' || p.branchId === branch.current || !p.branchId,
  );
  const canAdd = can('patients.manage');

  usePageHeader({
    title: 'Patients',
    subtitle: `${rows.length} ${rows.length === 1 ? 'patient' : 'patients'}`,
    action: canAdd
      ? { label: 'New patient', icon: UserPlus, onClick: () => setAdding(true) }
      : undefined,
  });

  const open = (p: PatientSummary) => navigate(`/patients/${p.id}`);
  const last = (p: PatientSummary) =>
    p.lastVisit ? relativeDay(dateOf(p.lastVisit)) : 'No visits yet';

  return (
    <>
      <div className="flex flex-col gap-3.5">
        <label className="flex items-center gap-2.5 border-2 border-ink bg-white px-3 lg:max-w-[420px]">
          <Search aria-hidden size={17} />
          <input
            aria-label="Search patients"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name or phone"
            className="min-h-12 min-w-0 flex-1 border-0 bg-transparent text-base outline-none"
          />
        </label>

        {isPending ? (
          <Loading label="Loading patients" />
        ) : !rows.length ? (
          <div className="flex flex-col items-start gap-3 py-4 text-sm text-neutral-700">
            {query ? `No patient matches “${query}”.` : 'No patients yet.'}
            {canAdd && (
              <Button variant="outline" icon={UserPlus} onClick={() => setAdding(true)}>
                New patient
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="flex flex-col border-2 border-ink bg-white lg:hidden">
              {rows.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => open(p)}
                  className="flex items-center gap-3 border-0 border-b border-rule bg-white px-3.5 py-3 text-left text-ink last:border-b-0 hover:bg-accent-100"
                >
                  <Avatar initials={initialsOf(p.fullName)} size={40} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate font-bold">{p.fullName}</span>
                      {pkgLeft(p) && (
                        <span className="border border-ink bg-accent-100 px-1.5 text-[11px] font-bold whitespace-nowrap">
                          {pkgLeft(p)}
                        </span>
                      )}
                    </span>
                    <span className="block text-xs text-neutral-700 tabular">
                      {formatPhone(p.phone)}
                    </span>
                    <span className="block truncate text-xs text-neutral-700">
                      Last {last(p).toLowerCase()}
                      {p.nextAppointment && ` · Next ${whenLabel(p.nextAppointment.startsAt)}`}
                    </span>
                  </span>
                  <ChevronRight aria-hidden size={18} className="text-neutral-600" />
                </button>
              ))}
            </div>

            <table className="hidden w-full border-collapse border-2 border-ink bg-white text-sm lg:table">
              <thead>
                <tr className="border-b-2 border-ink text-left">
                  {['Patient', 'Phone', 'Last', 'Next appointment', 'Package'].map((h) => (
                    <th key={h} className="px-3 py-2.5 kicker font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => open(p)}
                    className="cursor-pointer border-b border-rule last:border-b-0 hover:bg-canvas"
                  >
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <Avatar initials={initialsOf(p.fullName)} size={34} />
                        <div className="min-w-0">
                          <div className="font-bold">{p.fullName}</div>
                          <div className="truncate text-xs text-neutral-700">
                            {[p.age && `${p.age} y`, p.chiefComplaint].filter(Boolean).join(' · ')}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap tabular">
                      {formatPhone(p.phone)}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{last(p)}</td>
                    <td className="px-3 py-2.5">
                      {p.nextAppointment ? (
                        <>
                          <div className="font-semibold">
                            {whenLabel(p.nextAppointment.startsAt)}
                          </div>
                          <div className="text-xs text-neutral-700">
                            {therapists.short(p.nextAppointment.therapistId)}
                          </div>
                        </>
                      ) : (
                        <span className="text-neutral-600">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {p.activePackage ? (
                        <span className="font-semibold">
                          {p.activePackage.name} · {pkgLeft(p)}
                        </span>
                      ) : (
                        <span className="text-neutral-600">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
      {adding && (
        <NewPatientSheet
          onClose={() => setAdding(false)}
          onSaved={(id) => {
            setAdding(false);
            navigate(`/patients/${id}`);
          }}
        />
      )}
    </>
  );
}
