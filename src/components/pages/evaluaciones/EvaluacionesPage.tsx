'use client';
import { useState } from 'react';
import { ClipboardCheck, ClipboardList, Settings2 } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import WorkerExams from './WorkerExams';
import AdminReview from './AdminReview';
import ExamBuilder from './ExamBuilder';

// Trabajadores y empleados: ven y completan exámenes, y consultan su
// resultado una vez revisado. Solo el administrador evalúa: bandeja de
// revisión + constructor de exámenes reutilizables.
export default function EvaluacionesPage() {
  const { isAdmin, user } = useAuthStore();
  const [tab, setTab] = useState<'mis' | 'revision' | 'examenes'>(isAdmin ? 'revision' : 'mis');

  const tabs = isAdmin
    ? [
        { id: 'revision', label: 'Revisión', icon: ClipboardCheck },
        { id: 'examenes', label: 'Exámenes', icon: Settings2 },
      ]
    : [{ id: 'mis', label: 'Mis evaluaciones', icon: ClipboardList }];

  return (
    <div className="space-y-5">
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2">
          <ClipboardCheck size={22} className="text-wood-500" /> Evaluaciones
        </h1>
        <p className="text-sm text-slate-500">Bienvenido, {user?.nombre}</p>
      </div>

      <div className="flex gap-1 border-b overflow-x-auto">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id as any)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
              tab === id ? 'border-wood-500 text-wood-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {!isAdmin && <WorkerExams />}
      {isAdmin && tab === 'revision' && <AdminReview />}
      {isAdmin && tab === 'examenes' && <ExamBuilder />}
    </div>
  );
}
