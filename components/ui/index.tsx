'use client';
import { ReactNode } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import type { ProjectStatus, QuotationStatus } from '@/types';

// ─── BADGE DE ESTADO PROYECTO ──────────────────────────
const PROJECT_BADGE: Record<string, string> = {
  COTIZACION: 'badge-info',
  APROBADO:   'badge-success',
  PRODUCCION: 'badge-warning',
  INSTALACION:'badge-warning',
  FINALIZADO: 'badge bg-slate-700 text-white',
  CANCELADO:  'badge-danger',
};

const PROJECT_LABELS: Record<string, string> = {
  COTIZACION: 'Cotización', APROBADO: 'Aprobado', PRODUCCION: 'Producción',
  INSTALACION: 'Instalación', FINALIZADO: 'Finalizado', CANCELADO: 'Cancelado',
};

export function ProjectBadge({ status }: { status: ProjectStatus }) {
  return <span className={PROJECT_BADGE[status]}>{PROJECT_LABELS[status]}</span>;
}

// ─── BADGE DE ESTADO COTIZACIÓN ────────────────────────
const QUOT_BADGE: Record<string, string> = {
  BORRADOR: 'badge-neutral', ENVIADA: 'badge-info',
  APROBADA: 'badge-success', RECHAZADA: 'badge-danger',
};
const QUOT_LABELS: Record<string, string> = {
  BORRADOR: 'Borrador', ENVIADA: 'Enviada', APROBADA: 'Aprobada', RECHAZADA: 'Rechazada',
};

export function QuotationBadge({ status }: { status: QuotationStatus }) {
  return <span className={QUOT_BADGE[status]}>{QUOT_LABELS[status]}</span>;
}

// ─── SPINNER ───────────────────────────────────────────
export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const s = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-10 w-10' }[size];
  return (
    <div className={`${s} animate-spin rounded-full border-2 border-slate-200 border-t-wood-500`} />
  );
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <Spinner size="lg" />
    </div>
  );
}

// ─── MODAL ─────────────────────────────────────────────
export function Modal({
  title, children, onClose, size = 'md',
}: {
  title: string; children: ReactNode; onClose: () => void; size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white rounded-xl shadow-xl w-full ${widths[size]} max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-display font-bold text-slate-900">{title}</h2>
          <button onClick={onClose} className="btn-ghost p-1 rounded-lg">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-4">{children}</div>
      </div>
    </div>
  );
}

// ─── CONFIRM ───────────────────────────────────────────
export function Confirm({
  message, onConfirm, onCancel, loading,
}: {
  message: string; onConfirm: () => void; onCancel: () => void; loading?: boolean;
}) {
  return (
    <Modal title="Confirmar acción" onClose={onCancel} size="sm">
      <div className="flex flex-col gap-4">
        <div className="flex gap-3 items-start">
          <AlertTriangle className="text-warning shrink-0 mt-0.5" size={20} />
          <p className="text-sm text-slate-700">{message}</p>
        </div>
        <div className="flex justify-end gap-2">
          <button className="btn-secondary" onClick={onCancel}>Cancelar</button>
          <button className="btn-danger" onClick={onConfirm} disabled={loading}>
            {loading ? <Spinner size="sm" /> : 'Confirmar'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── EMPTY STATE ───────────────────────────────────────
export function EmptyState({ icon, title, description, action }: {
  icon: ReactNode; title: string; description?: string; action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
      <div className="p-4 bg-slate-100 rounded-full text-slate-400">{icon}</div>
      <p className="font-semibold text-slate-700">{title}</p>
      {description && <p className="text-sm text-slate-500 max-w-xs">{description}</p>}
      {action}
    </div>
  );
}

// ─── STATS CARD ────────────────────────────────────────
export function StatCard({ label, value, icon, color = 'wood' }: {
  label: string; value: string | number; icon: ReactNode; color?: string;
}) {
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={`p-3 rounded-lg bg-${color}-100 text-${color}-600`}>{icon}</div>
      <div>
        <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">{label}</p>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
}

// ─── FORM GROUP ────────────────────────────────────────
export function FormGroup({ label, error, children, required }: {
  label: string; error?: string; children: ReactNode; required?: boolean;
}) {
  return (
    <div>
      <label className="label">
        {label}{required && <span className="text-danger ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

// ─── MONEY INPUT ────────────────────────────────────────
export { MoneyInput } from './MoneyInput';
