'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Truck, CreditCard, Plus, Pencil, Trash2, Clock, Users, Wrench, HelpCircle, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { calendarApi, projectsApi } from '@/lib/api';
import type { CalendarEvent } from '@/types';
import { formatCRC } from '@/types';
import { PageLoader, Spinner, Confirm } from '@/components/ui';
import { useAuthStore } from '@/store/auth.store';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DIAS  = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

const TIPO_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  INSTALACION: { label: 'Instalación',   icon: <Truck size={13} />,      color: 'text-blue-700',   bg: 'bg-blue-100'   },
  COBRO:       { label: 'Cobro',         icon: <CreditCard size={13} />, color: 'text-green-700',  bg: 'bg-green-100'  },
  MEDICION:    { label: 'Medición',      icon: <Wrench size={13} />,     color: 'text-purple-700', bg: 'bg-purple-100' },
  TALLER:      { label: 'Taller',        icon: <Wrench size={13} />,     color: 'text-orange-700', bg: 'bg-orange-100' },
  REUNION:     { label: 'Reunión',       icon: <Users size={13} />,      color: 'text-teal-700',   bg: 'bg-teal-100'   },
  OTRO:        { label: 'Otro',          icon: <HelpCircle size={13} />, color: 'text-slate-600',  bg: 'bg-slate-100'  },
};

function parseLocalDate(d: string): Date {
  const [y, m, day] = d.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, day);
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// ─── Modal de crear / editar evento ─────────────────
const TIPOS_CUSTOM = ['MEDICION', 'TALLER', 'REUNION', 'OTRO'] as const;
const AUDIENCIAS = [
    { value: 'TODOS', label: 'Todo el personal' },
    { value: 'ADMIN', label: 'Solo administradores' },
    { value: 'ADMIN_EMPLEADOS', label: 'Administración y empleados' },
    { value: 'ADMIN_TRABAJADORES', label: 'Administración y taller' },
] as const;

type TipoCustom = typeof TIPOS_CUSTOM[number];

const emptyForm = {
    titulo: '',
    descripcion: '',
    fecha: '',
    tipo: 'REUNION' as TipoCustom,
    projectId: '',
    audiencia: 'TODOS',
};

function EventModal({ event, onClose, onSaved }: {
  event?: CalendarEvent;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(() =>
    event
      ? {
          titulo: event.title,
          descripcion: event.description || '',
          fecha: event.date.slice(0, 10),
          tipo: event.type as TipoCustom,
              projectId: event.projectId || '',
              audiencia: event.audiencia || 'TODOS',
        }
      : { ...emptyForm }
  );
  const [projects, setProjects] = useState<{ id: string; nombreProyecto: string }[]>([]);
    const [saving, setSaving] = useState(false);
    const { isAdmin } = useAuthStore();


  useEffect(() => {
    projectsApi.list().then((list) => setProjects(list));
  }, []);

  const save = async () => {
    if (!form.titulo.trim()) { toast.error('El título es requerido'); return; }
    if (!form.fecha) { toast.error('La fecha es requerida'); return; }
    setSaving(true);
    try {
      if (event?.dbId) {
          await calendarApi.updateEvent(event.dbId, { ...form, projectId: form.projectId || undefined, audiencia: form.audiencia });
        toast.success('Evento actualizado');
      } else {
          await calendarApi.createEvent({ ...form, projectId: form.projectId || undefined,audiencia: form.audiencia });
        toast.success('Evento creado');
      }
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-display font-bold text-slate-900">{event ? 'Editar evento' : 'Nuevo evento'}</h2>
          <button className="btn-ghost btn-sm" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="label">Tipo de evento</label>
            <div className="grid grid-cols-2 gap-2">
              {TIPOS_CUSTOM.map((t) => {
                const cfg = TIPO_CONFIG[t];
                return (
                  <button key={t} type="button"
                    onClick={() => setForm((p) => ({ ...p, tipo: t }))}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border text-sm font-medium transition-colors ${
                      form.tipo === t
                        ? `${cfg.bg} ${cfg.color} border-current`
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}>
                    {cfg.icon} {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="label">Título <span className="text-red-400">*</span></label>
            <input className="input" value={form.titulo} onChange={(e) => setForm((p) => ({ ...p, titulo: e.target.value }))}
              placeholder="Ej: Medición casa García" />
          </div>
          <div>
            <label className="label">Fecha <span className="text-red-400">*</span></label>
            <input type="date" className="input" value={form.fecha} onChange={(e) => setForm((p) => ({ ...p, fecha: e.target.value }))} />
          </div>
          <div>
            <label className="label">Proyecto relacionado (opcional)</label>
            <select className="input" value={form.projectId} onChange={(e) => setForm((p) => ({ ...p, projectId: e.target.value }))}>
              <option value="">Sin proyecto</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.nombreProyecto}</option>)}
            </select>
                  </div>
                  {isAdmin && (
                      <div>
                          <label className="label">Visible para</label>

                          <select
                              className="input"
                              value={form.audiencia}
                              onChange={(e) =>
                                  setForm((p) => ({
                                      ...p,
                                      audiencia: e.target.value,
                                  }))
                              }
                          >
                              {AUDIENCIAS.map((a) => (
                                  <option key={a.value} value={a.value}>
                                      {a.label}
                                  </option>
                              ))}
                          </select>
                      </div>
                  )}
          <div>
            <label className="label">Descripción (opcional)</label>
            <textarea className="input" rows={2} value={form.descripcion} onChange={(e) => setForm((p) => ({ ...p, descripcion: e.target.value }))}
              placeholder="Notas adicionales..." />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 pb-5">
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? <Spinner size="sm" /> : event ? 'Guardar cambios' : 'Crear evento'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Chip de evento en celda del calendario ──────────
function EventChip({ event }: { event: CalendarEvent }) {
  const cfg = TIPO_CONFIG[event.type] || TIPO_CONFIG.OTRO;
  const inner = (
    <span className={`block text-[10px] leading-tight px-1.5 py-0.5 rounded truncate ${cfg.bg} ${cfg.color}`}>
      {event.title}
    </span>
  );
  if (event.projectId && !event.editable) {
    return <Link href={`/proyectos/${event.projectId}`}>{inner}</Link>;
  }
  return inner;
}

export default function CalendarPage() {
  const { isAdmin, isTrabajador } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [cursor, setCursor] = useState(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1); });
  const [modalEvent, setModalEvent] = useState<CalendarEvent | 'new' | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CalendarEvent | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    setLoading(true);
    calendarApi.events().then(setEvents).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async () => {
    if (!deleteTarget?.dbId) return;
    setDeleting(true);
    try {
      await calendarApi.deleteEvent(deleteTarget.dbId);
      toast.success('Evento eliminado');
      setDeleteTarget(null);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al eliminar');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <PageLoader />;

  const year  = cursor.getFullYear();
  const month = cursor.getMonth();
  const today = new Date();
  const firstDayOfMonth = new Date(year, month, 1);
  const startOffset  = firstDayOfMonth.getDay();
  const daysInMonth  = new Date(year, month + 1, 0).getDate();

  const cells: { date: Date; inMonth: boolean }[] = [];
  for (let i = 0; i < startOffset; i++) cells.push({ date: new Date(year, month, 1 - (startOffset - i)), inMonth: false });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ date: new Date(year, month, d), inMonth: true });
  while (cells.length < 42) { const last = cells[cells.length-1].date; const next = new Date(last); next.setDate(next.getDate()+1); cells.push({ date: next, inMonth: false }); }

  const eventsForDay = (date: Date) => events.filter((e) => sameDay(parseLocalDate(e.date), date));

  const upcoming = events
    .map((e) => ({ ...e, _date: parseLocalDate(e.date) }))
    .filter((e) => {
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      return e._date >= todayStart && (isAdmin || e.type !== 'COBRO');
    })
    .sort((a, b) => a._date.getTime() - b._date.getTime())
    .slice(0, 10);

  return (
    <div className="space-y-5">
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2">
          <CalendarIcon size={22} className="text-wood-500" /> Calendario
        </h1>
        <button className="btn-primary" onClick={() => setModalEvent('new')}>
          <Plus size={15} /> Nuevo evento
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">
        {/* Calendario mensual */}
        <div className="card">
          <div className="card-header">
            <button className="btn-ghost btn-sm" onClick={() => setCursor(new Date(year, month - 1, 1))}><ChevronLeft size={16} /></button>
            <h2 className="font-display font-bold text-slate-900">{MESES[month]} {year}</h2>
            <button className="btn-ghost btn-sm" onClick={() => setCursor(new Date(year, month + 1, 1))}><ChevronRight size={16} /></button>
          </div>
          <div className="grid grid-cols-7 border-b text-center">
            {DIAS.map((d) => <div key={d} className="py-2 text-xs font-semibold text-slate-400">{d}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {cells.map(({ date, inMonth }, i) => {
              const dayEvents = eventsForDay(date);
              const isToday = sameDay(date, today);
              return (
                <div key={i} className={`min-h-20 border-b border-r p-1 ${i % 7 === 6 ? 'border-r-0' : ''} ${!inMonth ? 'bg-slate-50' : ''}`}>
                  <p className={`text-xs font-semibold mb-1 w-5 h-5 flex items-center justify-center ${isToday ? 'rounded-full bg-wood-500 text-white' : inMonth ? 'text-slate-700' : 'text-slate-300'}`}>
                    {date.getDate()}
                  </p>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 3).map((e) => <EventChip key={e.id} event={e} />)}
                    {dayEvents.length > 3 && <p className="text-[10px] text-slate-400 px-1">+{dayEvents.length - 3}</p>}
                  </div>
                </div>
              );
            })}
          </div>
          {/* Leyenda */}
          <div className="flex flex-wrap gap-3 px-4 py-3 border-t text-xs text-slate-500">
            {Object.entries(TIPO_CONFIG).map(([tipo, cfg]) => (
              (isAdmin || !['COBRO'].includes(tipo)) &&
              <span key={tipo} className="flex items-center gap-1.5">
                <span className={`w-3 h-3 rounded ${cfg.bg} inline-block`} /> {cfg.label}
              </span>
            ))}
          </div>
        </div>

        {/* Panel lateral — próximos eventos */}
        <div className="card card-body flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-slate-900 flex items-center gap-2">
              <Clock size={16} className="text-wood-500" /> Próximos
            </h2>
          </div>
          {upcoming.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">Sin eventos próximos</p>
          ) : (
            <div className="space-y-2">
              {upcoming.map((e) => {
                const cfg = TIPO_CONFIG[e.type] || TIPO_CONFIG.OTRO;
                return (
                  <div key={e.id} className={`flex items-start gap-3 p-2.5 rounded-lg ${cfg.bg} relative group`}>
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${cfg.color} bg-white/60`}>
                      {cfg.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${cfg.color}`}>{e.title}</p>
                      {e.description && <p className="text-xs text-slate-500 truncate">{e.description}</p>}
                      <p className="text-xs text-slate-400">
                        {e._date.toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' })}
                        {e.projectName && <span className="ml-1">· {e.projectName}</span>}
                      </p>
                      {isAdmin && e.monto && (
                        <p className="text-xs font-semibold text-green-700">{formatCRC(e.monto)}</p>
                      )}
                    </div>
                    {e.editable && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button className="btn-ghost btn-sm p-1" onClick={() => setModalEvent(e)} title="Editar"><Pencil size={11} /></button>
                        <button className="btn-ghost btn-sm p-1 text-danger" onClick={() => setDeleteTarget(e)} title="Eliminar"><Trash2 size={11} /></button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal crear/editar */}
      {modalEvent && (
        <EventModal
          event={modalEvent === 'new' ? undefined : modalEvent}
          onClose={() => setModalEvent(null)}
          onSaved={load}
        />
      )}

      {/* Confirmar eliminación */}
      {deleteTarget && (
        <Confirm
          message={`¿Eliminar el evento "${deleteTarget.title}"?`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleting}
        />
      )}
    </div>
  );
}
