'use client';
import { useEffect, useState } from 'react';
import { Clock, LogIn, LogOut, Calendar, Users, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { timesheetApi, usersApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { formatCRC } from '@/types';
import { PageLoader, Spinner, Modal, FormGroup, Confirm, MoneyInput } from '@/components/ui';

// ─── Helpers ─────────────────────────────────────────
function formatTime(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' });
}
function formatDate(dateString: string): string {
    const [y, m, d] = dateString.slice(0, 10).split("-").map(Number);

    return new Date(y, m - 1, d).toLocaleDateString("es-CR", {
        weekday: "short",
        day: "2-digit",
        month: "short",
    });
}
function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
// Convierte una fecha UTC (string o Date) al formato "YYYY-MM-DDTHH:mm" en hora LOCAL
// que necesita el input type="datetime-local". Sin esto, el input muestra hora UTC
// en lugar de la hora real con la que el trabajador marcó.
function toLocalDatetimeInput(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  // Ajustamos al offset local para que el input muestre la hora del dispositivo
  const offset = d.getTimezoneOffset() * 60000;
  const local = new Date(d.getTime() - offset);
  return local.toISOString().slice(0, 16);
}

// ─── Widget de fichaje (empleado/trabajador) ─────────
// ─── Configuración visual de cada tipo de descanso ───
const BREAK_CONFIG = {
  desayuno: { label: 'Desayuno', emoji: '☕', startField: 'desayunoInicio', endField: 'desayunoFin', policyKey: 'DESAYUNO' },
  almuerzo: { label: 'Almuerzo', emoji: '🍽️', startField: 'almuerzoInicio', endField: 'almuerzoFin', policyKey: 'ALMUERZO' },
  cafe:     { label: 'Café',     emoji: '☕', startField: 'cafeInicio',     endField: 'cafeFin',     policyKey: 'CAFE' },
} as const;
type BreakType = keyof typeof BREAK_CONFIG;
const BREAK_ORDER: BreakType[] = ['desayuno', 'almuerzo', 'cafe'];

// ─── Widget de fichaje (empleado/trabajador) ─────────
function ClockWidget() {
  const [entry, setEntry] = useState<any>(null);
  const [minutosPermitidos, setMinutosPermitidos] = useState<Record<string, number>>({ DESAYUNO: 20, ALMUERZO: 40, CAFE: 10 });
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [elapsedStr, setElapsedStr] = useState('');
  const [breakElapsedStr, setBreakElapsedStr] = useState('');

    const load = () => {
        timesheetApi.today().then((res: any) => {

            console.log("ENTRY DEL BACKEND");
            console.log(res.data);

            setEntry(res.data);

            if (res.minutosPermitidos)
                setMinutosPermitidos(res.minutosPermitidos);

        }).finally(() => setLoading(false));
    };

  useEffect(() => { load(); }, []);

  const fase: string = entry?.fase || 'SIN_INICIAR';
  const activeBreak: BreakType | null =
    fase === 'EN_DESAYUNO' ? 'desayuno' : fase === 'EN_ALMUERZO' ? 'almuerzo' : fase === 'EN_CAFE' ? 'cafe' : null;

  // Contador de jornada total (mientras está trabajando o en descanso)
  useEffect(() => {
    if (!entry || entry.horaSalida) { setElapsedStr(''); return; }
    const update = () => {
      const ms = Date.now() - new Date(entry.horaEntrada).getTime();
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      setElapsedStr(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [entry]);

  // Contador específico del descanso activo, con aviso de exceso
  useEffect(() => {
    if (!activeBreak || !entry) { setBreakElapsedStr(''); return; }
    const cfg = BREAK_CONFIG[activeBreak];
    const startVal = entry[cfg.startField];
    if (!startVal) { setBreakElapsedStr(''); return; }
    const update = () => {
      const ms = Date.now() - new Date(startVal).getTime();
      const m = Math.floor(ms / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      setBreakElapsedStr(`${m}:${String(s).padStart(2,'0')}`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [activeBreak, entry]);

  const handleAction = async (action: () => Promise<any>) => {
    setWorking(true);
    try {
      const res = await action();
      toast.success(res.message);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al registrar');
    } finally {
      setWorking(false);
    }
  };

  const handleClockIn = () => handleAction(() => timesheetApi.clockIn());
  const handleClockOut = () => handleAction(() => timesheetApi.clockOut(entry.id));
  const handleStartBreak = (tipo: BreakType) => handleAction(() => timesheetApi.startBreak(entry.id, tipo));
  const handleEndBreak = (tipo: BreakType) => handleAction(() => timesheetApi.endBreak(entry.id, tipo));

  if (loading) return <div className="flex justify-center py-6"><Spinner /></div>;

  const breakDone = (tipo: BreakType) => !!entry?.[BREAK_CONFIG[tipo].endField];
  const breakStarted = (tipo: BreakType) => !!entry?.[BREAK_CONFIG[tipo].startField];
  const breakDuration = (tipo: BreakType) => {
    const cfg = BREAK_CONFIG[tipo];
    const start = entry?.[cfg.startField];
    const end = entry?.[cfg.endField];
    if (!start || !end) return null;
    return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
  };

  return (
    <div className="card card-body space-y-5">
      <h2 className="font-display font-bold text-slate-900 flex items-center gap-2">
        <Clock size={18} className="text-wood-500" /> Mi jornada de hoy
      </h2>

      {/* Estado / cronómetro principal */}
      <div className={`rounded-xl p-5 text-center ${
        fase === 'TRABAJANDO' ? 'bg-green-50 border border-green-200' :
        activeBreak ? 'bg-amber-50 border border-amber-200' :
        fase === 'FINALIZADO' ? 'bg-slate-50 border' : 'bg-slate-50 border'
      }`}>
        {fase === 'SIN_INICIAR' && <p className="text-slate-400 py-2">Sin registro hoy</p>}

        {fase === 'TRABAJANDO' && (
          <>
            <p className="text-green-600 font-semibold mb-1">Trabajando</p>
            <p className="font-mono text-3xl font-bold text-green-700">{elapsedStr}</p>
            <p className="text-sm text-slate-500 mt-1">Entrada: {formatTime(entry.horaEntrada)}</p>
          </>
        )}

        {activeBreak && (
          <>
            <p className="text-amber-600 font-semibold mb-1">
              {BREAK_CONFIG[activeBreak].emoji} En {BREAK_CONFIG[activeBreak].label.toLowerCase()}
            </p>
            <p className="font-mono text-3xl font-bold text-amber-700">{breakElapsedStr}</p>
            <p className="text-xs text-slate-500 mt-1">
              {minutosPermitidos[BREAK_CONFIG[activeBreak].policyKey]} min incluidos en la jornada paga
            </p>
          </>
        )}

        {fase === 'FINALIZADO' && (
          <>
            <p className="text-slate-500 font-semibold mb-1">Jornada completada</p>
            <p className="text-2xl font-bold text-slate-800">{Number(entry.horasTrabajadas).toFixed(2)} h pagas</p>
            <p className="text-sm text-slate-500 mt-1">
              {formatTime(entry.horaEntrada)} — {formatTime(entry.horaSalida)}
            </p>
            {entry.minutosExcedentes > 0 && (
              <p className="text-xs text-slate-500 mt-1">{entry.minutosExcedentes} min adicionales de descanso registrados</p>
            )}
          </>
        )}
      </div>

      {/* Línea de tiempo de descansos (solo visible si la jornada está activa o finalizada) */}
      {fase !== 'SIN_INICIAR' && (
        <div className="grid grid-cols-3 gap-2">
          {BREAK_ORDER.map((tipo) => {
            const cfg = BREAK_CONFIG[tipo];
            const done = breakDone(tipo);
            const started = breakStarted(tipo);
            const duration = breakDuration(tipo);
            const exceeded = duration != null && duration > minutosPermitidos[cfg.policyKey];
            return (
              <div key={tipo} className={`rounded-lg border p-2.5 text-center ${
                done ? (exceeded ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200') :
                started ? 'bg-amber-50 border-amber-300' : 'bg-white border-slate-200'
              }`}>
                <p className="text-lg">{cfg.emoji}</p>
                <p className="text-xs font-semibold text-slate-700">{cfg.label}</p>
                <p className="text-[10px] text-slate-400">{minutosPermitidos[cfg.policyKey]} min pagos</p>
                {done ? (
                  <p className={`text-xs font-bold mt-1 ${exceeded ? 'text-amber-600' : 'text-green-600'}`}>{duration}' {exceeded ? `(+${duration - minutosPermitidos[cfg.policyKey]}')` : '✓'}</p>
                ) : started ? (
                  <p className="text-xs font-bold text-amber-600 mt-1">En curso…</p>
                ) : (
                  <p className="text-xs text-slate-300 mt-1">Pendiente</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Botones de acción según fase */}
      <div className="flex flex-col gap-2">
        {fase === 'SIN_INICIAR' && (
          <button className="btn-primary justify-center" onClick={handleClockIn} disabled={working}>
            {working ? <Spinner size="sm" /> : <><LogIn size={15} /> Registrar entrada al trabajo</>}
          </button>
        )}

        {fase === 'TRABAJANDO' && (
          <>
            <div className="grid grid-cols-3 gap-2">
              {BREAK_ORDER.map((tipo) => (
                <button
                  key={tipo}
                  className="btn-secondary justify-center text-sm py-2"
                  onClick={() => handleStartBreak(tipo)}
                  disabled={working || breakDone(tipo)}
                  title={breakDone(tipo) ? `${BREAK_CONFIG[tipo].label} ya tomado hoy` : ''}
                >
                  {BREAK_CONFIG[tipo].emoji} {BREAK_CONFIG[tipo].label}
                </button>
              ))}
            </div>
            <button className="btn-danger justify-center mt-1" onClick={handleClockOut} disabled={working}>
              {working ? <Spinner size="sm" /> : <><LogOut size={15} /> Registrar salida del trabajo</>}
            </button>
          </>
        )}

        {activeBreak && (
          <button className="btn-primary justify-center" onClick={() => handleEndBreak(activeBreak)} disabled={working}>
            {working ? <Spinner size="sm" /> : <>Finalizar {BREAK_CONFIG[activeBreak].label.toLowerCase()}</>}
          </button>
        )}

        {fase === 'FINALIZADO' && (
          <p className="text-xs text-slate-400 text-center">Jornada registrada ✓</p>
        )}
      </div>
    </div>
  );
}

function MyHistory() {
  const [data, setData] = useState<{ entries: any[]; totalHoras: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState(() => new Date());

  const load = (date: Date) => {
    setLoading(true);
    const year = date.getFullYear();
    const month = date.getMonth();
    const desde = isoDate(new Date(year, month, 1));
    const hasta  = isoDate(new Date(year, month + 1, 0));
    timesheetApi.myHistory(desde, hasta).then(setData).finally(() => setLoading(false));
  };

  useEffect(() => { load(cursor); }, [cursor]);

  const label = cursor.toLocaleDateString('es-CR', { month: 'long', year: 'numeric' });

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center gap-3">
          <button className="btn-ghost btn-sm" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
            <ChevronLeft size={16} />
          </button>
          <h2 className="font-display font-bold text-slate-900 capitalize">{label}</h2>
          <button className="btn-ghost btn-sm" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
            <ChevronRight size={16} />
          </button>
        </div>
        {data && (
          <span className="text-sm font-semibold text-slate-700">{data.totalHoras} h totales</span>
        )}
      </div>
      {loading ? <div className="flex justify-center py-6"><Spinner /></div> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Fecha</th><th>Entrada</th><th>Salida</th><th>Horas</th><th>Observaciones</th></tr></thead>
            <tbody>
              {!data?.entries.length ? (
                <tr><td colSpan={5} className="text-center py-6 text-slate-400">Sin registros este mes</td></tr>
              ) : data.entries.map((e) => (
                <tr key={e.id}>
                  <td>{formatDate(e.fecha)}</td>
                  <td>{formatTime(e.horaEntrada)}</td>
                  <td>{formatTime(e.horaSalida)}</td>
                  <td className="font-semibold">{e.horasTrabajadas ? Number(e.horasTrabajadas).toFixed(2) : <span className="text-amber-500">Abierto</span>}</td>
                  <td className="text-slate-500 text-sm">{e.observaciones || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Panel administrador ──────────────────────────────
function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}
function endOfWeekDate(date: Date): Date {
  const start = startOfWeek(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return end;
}

// ─── Panel administrador ──────────────────────────────
function AdminPanel() {
  const [report, setReport] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekCursor, setWeekCursor] = useState(() => startOfWeek(new Date()));
  const [selectedUser, setSelectedUser] = useState('');
  const [editEntry, setEditEntry] = useState<any | null>(null);
  const [deleteEntry, setDeleteEntry] = useState<any | null>(null);
  const [editingWage, setEditingWage] = useState<{ userId: string; nombre: string; tarifaHora: string } | null>(null);
  const [savingWage, setSavingWage] = useState(false);
  const [working, setWorking] = useState(false);
  const [closingWeek, setClosingWeek] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [breakPolicy, setBreakPolicy] = useState<Record<string, number>>({ DESAYUNO: 20, ALMUERZO: 40, CAFE: 10 });
  const [editingPolicy, setEditingPolicy] = useState<Record<string, string> | null>(null);
  const [savingPolicy, setSavingPolicy] = useState(false);

  const weekEnd = endOfWeekDate(weekCursor);
  const desde = isoDate(weekCursor);
  const hasta = isoDate(weekEnd);
  const isCurrentWeek = isoDate(startOfWeek(new Date())) === desde;

  const load = () => {
    setLoading(true);
    Promise.all([
      timesheetApi.report({ userId: selectedUser || undefined, desde, hasta }),
      usersApi.list(),
      timesheetApi.breakPolicy(),
    ]).then(([repRes, usr, policy]) => {
      setReport(repRes.data);
      setUsers(usr.filter((u: any) => u.activo));
      setBreakPolicy(policy);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [desde, hasta, selectedUser]);

  const totalHorasSemana = report.reduce((acc, r) => acc + Number(r.totalHoras), 0);
  const hayRegistros = report.length > 0;
  const hayMarcacionesAbiertas = report.some((r) => r.entries.some((e: any) => !e.horaSalida));

  const handleSaveWage = async () => {
    if (!editingWage || !editingWage.tarifaHora) return;
    setSavingWage(true);
    try {
      await timesheetApi.setWage(editingWage.userId, Number(editingWage.tarifaHora));
      toast.success('Tarifa actualizada');
      setEditingWage(null);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error');
    } finally {
      setSavingWage(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editEntry) return;
    setWorking(true);
    // Los inputs datetime-local devuelven "YYYY-MM-DDTHH:mm" sin zona horaria.
    // Los convertimos a ISO con offset local para que el backend los guarde correctamente.
    const localToISO = (v: string) => {
      if (!v) return null;
      const d = new Date(v); // interpreta como local
      return isNaN(d.getTime()) ? null : d.toISOString();
    };
    try {
      await timesheetApi.updateEntry(editEntry.id, {
        horaEntrada: localToISO(editEntry.horaEntradaEdit),
        horaSalida: localToISO(editEntry.horaSalidaEdit),
        observaciones: editEntry.obsEdit,
      });
      toast.success('Registro actualizado');
      setEditEntry(null);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error');
    } finally {
      setWorking(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteEntry) return;
    setWorking(true);
    try {
      await timesheetApi.deleteEntry(deleteEntry.id);
      toast.success('Registro eliminado');
      setDeleteEntry(null);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error');
    } finally {
      setWorking(false);
    }
  };

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      await timesheetApi.downloadWeeklyReport(desde, hasta, `Reporte-Horario-${desde}.pdf`);
      toast.success('Reporte descargado');
    } catch (err: any) {
      toast.error(err.message || 'Error al generar el reporte');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleCloseWeek = async () => {
    setClosingWeek(true);
    try {
      const res = await timesheetApi.closeWeek(desde, hasta);
      toast.success(res.message || 'Semana cerrada');
      setConfirmClose(false);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al cerrar la semana');
    } finally {
      setClosingWeek(false);
    }
  };

  const handleSavePolicy = async () => {
    if (!editingPolicy) return;
    setSavingPolicy(true);
    try {
      const payload = {
        DESAYUNO: Number(editingPolicy.DESAYUNO),
        ALMUERZO: Number(editingPolicy.ALMUERZO),
        CAFE: Number(editingPolicy.CAFE),
      };
      const res = await timesheetApi.setBreakPolicy(payload);
      toast.success(res.message || 'Política actualizada');
      setBreakPolicy(res.data);
      setEditingPolicy(null);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al guardar');
    } finally {
      setSavingPolicy(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Navegación semanal + filtro */}
      <div className="card card-body">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex items-center gap-3">
            <button className="btn-ghost btn-sm" onClick={() => setWeekCursor(new Date(weekCursor.getFullYear(), weekCursor.getMonth(), weekCursor.getDate() - 7))}>
              <ChevronLeft size={16} />
            </button>
            <div>
              <p className="font-semibold text-slate-900">
                {weekCursor.toLocaleDateString('es-CR', { day: '2-digit', month: 'short' })} — {weekEnd.toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
              {isCurrentWeek && <p className="text-xs text-wood-600">Semana actual</p>}
            </div>
            <button className="btn-ghost btn-sm" onClick={() => setWeekCursor(new Date(weekCursor.getFullYear(), weekCursor.getMonth(), weekCursor.getDate() + 7))}>
              <ChevronRight size={16} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <select className="input py-1.5 text-sm w-52" value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)}>
              <option value="">Todos los empleados</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
            </select>
            <button
              className="btn-secondary btn-sm"
              onClick={() => setEditingPolicy({
                DESAYUNO: String(breakPolicy.DESAYUNO),
                ALMUERZO: String(breakPolicy.ALMUERZO),
                CAFE: String(breakPolicy.CAFE),
              })}
              title="Configurar minutos pagos de descansos"
            >
              ⚙️ Descansos
            </button>
          </div>
        </div>

        {/* Acciones de cierre */}
        <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t">
          <span className="text-sm text-slate-500">
            Total semana: <span className="font-bold text-slate-800">{totalHorasSemana.toFixed(2)} h</span>
          </span>
          <div className="flex-1" />
          <button className="btn-secondary btn-sm" onClick={handleDownloadPdf} disabled={!hayRegistros || downloadingPdf}>
            {downloadingPdf ? <Spinner size="sm" /> : 'Descargar reporte PDF'}
          </button>
          <button
            className="btn-primary btn-sm"
            onClick={() => setConfirmClose(true)}
            disabled={!hayRegistros || hayMarcacionesAbiertas}
            title={hayMarcacionesAbiertas ? 'Hay marcaciones sin salida registrada' : ''}
          >
            Cerrar semana
          </button>
        </div>
        {hayMarcacionesAbiertas && (
          <p className="text-xs text-amber-600 mt-2">
            Hay marcaciones sin hora de salida en esta semana. No se puede cerrar hasta que todas tengan salida registrada.
          </p>
        )}
        <p className="text-xs text-slate-400 mt-2">
          Al cerrar la semana se genera un resumen permanente por empleado (horas y salario) y los registros individuales se archivan, manteniendo liviana la base de datos sin perder el historial.
        </p>
      </div>

      {loading ? <div className="flex justify-center py-8"><Spinner /></div> : (
        <>
          {/* Resumen por usuario */}
          {report.map((row) => (
            <div key={row.user.id} className="card">
              <div className="card-header">
                <div>
                  <h3 className="font-display font-bold text-slate-900">{row.user.nombre}</h3>
                  <p className="text-xs text-slate-500">{row.user.correo}</p>
                </div>
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-700">
                      {row.totalHoras} h
                      {row.totalExcedente > 0 && <span className="text-slate-500 text-xs font-normal ml-1">· {row.totalExcedente}' adicionales de descanso</span>}
                    </p>
                    {row.tarifaHora ? (
                      <p className="text-xs text-slate-500">{formatCRC(row.tarifaHora)}/h = <span className="font-bold text-green-600">{formatCRC(row.salarioCalculado)}</span></p>
                    ) : (
                      <p className="text-xs text-slate-400">Sin tarifa configurada</p>
                    )}
                  </div>
                  <button
                    className="btn-secondary btn-sm"
                    onClick={() => setEditingWage({ userId: row.user.id, nombre: row.user.nombre, tarifaHora: String(row.tarifaHora || '') })}
                  >
                    <Pencil size={13} /> Tarifa
                  </button>
                </div>
              </div>

              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Fecha</th><th>Entrada</th><th>Desayuno</th><th>Almuerzo</th><th>Café</th><th>Salida</th><th>Horas pagas</th><th>Adicional</th><th></th></tr></thead>
                  <tbody>
                    {row.entries.map((e: any) => {
                      const breakCell = (inicio?: string, fin?: string) => {
                        if (!inicio) return <span className="text-slate-300">—</span>;
                        if (!fin) return <span className="text-amber-500 text-xs">{formatTime(inicio)} (abierto)</span>;
                        const mins = Math.round((new Date(fin).getTime() - new Date(inicio).getTime()) / 60000);
                        return <span className="text-xs">{formatTime(inicio)}-{formatTime(fin)} <span className="text-slate-400">({mins}')</span></span>;
                      };
                      return (
                        <tr key={e.id}>
                          <td>{formatDate(e.fecha)}</td>
                          <td>{formatTime(e.horaEntrada)}</td>
                          <td>{breakCell(e.desayunoInicio, e.desayunoFin)}</td>
                          <td>{breakCell(e.almuerzoInicio, e.almuerzoFin)}</td>
                          <td>{breakCell(e.cafeInicio, e.cafeFin)}</td>
                          <td>{formatTime(e.horaSalida)}</td>
                          <td className="font-semibold">{e.horasTrabajadas != null ? Number(e.horasTrabajadas).toFixed(2) : <span className="text-amber-500">Abierto</span>}</td>
                          <td>{e.minutosExcedentes > 0 ? <span className="text-amber-600 text-xs">+{e.minutosExcedentes}'</span> : <span className="text-slate-300">—</span>}</td>
                          <td>
                            <div className="flex gap-1">
                              <button className="btn-ghost btn-sm p-1" onClick={() => setEditEntry({
                                ...e,
                                horaEntradaEdit: toLocalDatetimeInput(e.horaEntrada),
                                horaSalidaEdit: toLocalDatetimeInput(e.horaSalida),
                                obsEdit: e.observaciones || '',
                              })} title="Editar">
                                <Pencil size={12} />
                              </button>
                              <button className="btn-ghost btn-sm p-1 text-danger" onClick={() => setDeleteEntry(e)} title="Eliminar">
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {report.length === 0 && (
            <div className="card card-body text-center py-10 text-slate-400">
              Sin registros para esta semana
            </div>
          )}
        </>
      )}

      {/* Modal editar tarifa */}
      {editingWage && (
        <Modal title={`Tarifa de ${editingWage.nombre}`} onClose={() => setEditingWage(null)} size="sm">
          <div className="space-y-4">
            <FormGroup label="Tarifa por hora (₡)" required>
              <MoneyInput value={editingWage.tarifaHora} onChange={(v) => setEditingWage((p) => p ? ({ ...p, tarifaHora: v }) : p)} placeholder="Ej: 3 000" />
            </FormGroup>
            <p className="text-xs text-slate-500">El salario calculado = horas trabajadas × tarifa/hora. Solo visible para el administrador.</p>
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => setEditingWage(null)}>Cancelar</button>
              <button className="btn-primary" onClick={handleSaveWage} disabled={savingWage}>
                {savingWage ? <Spinner size="sm" /> : 'Guardar tarifa'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal editar entrada */}
      {editEntry && (
        <Modal title="Editar registro" onClose={() => setEditEntry(null)} size="sm">
          <div className="space-y-4">
            <FormGroup label="Entrada">
              <input type="datetime-local" className="input" value={editEntry.horaEntradaEdit}
                onChange={(e) => setEditEntry((p: any) => ({ ...p, horaEntradaEdit: e.target.value }))} />
            </FormGroup>
            <FormGroup label="Salida">
              <input type="datetime-local" className="input" value={editEntry.horaSalidaEdit}
                onChange={(e) => setEditEntry((p: any) => ({ ...p, horaSalidaEdit: e.target.value }))} />
            </FormGroup>
            <FormGroup label="Observaciones">
              <input className="input" value={editEntry.obsEdit}
                onChange={(e) => setEditEntry((p: any) => ({ ...p, obsEdit: e.target.value }))} />
            </FormGroup>
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => setEditEntry(null)}>Cancelar</button>
              <button className="btn-primary" onClick={handleSaveEdit} disabled={working}>
                {working ? <Spinner size="sm" /> : 'Guardar'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {deleteEntry && (
        <Confirm
          message="¿Eliminar este registro de marcación?"
          onConfirm={handleDelete}
          onCancel={() => setDeleteEntry(null)}
          loading={working}
        />
      )}

      {confirmClose && (
        <Confirm
          message={`¿Cerrar la semana del ${weekCursor.toLocaleDateString('es-CR', { day: '2-digit', month: 'short' })} al ${weekEnd.toLocaleDateString('es-CR', { day: '2-digit', month: 'short' })}? Se generará un resumen permanente por empleado y los registros se archivarán. Te recomendamos descargar el PDF antes de cerrar.`}
          onConfirm={handleCloseWeek}
          onCancel={() => setConfirmClose(false)}
          loading={closingWeek}
        />
      )}

      {editingPolicy && (
        <Modal title="Minutos pagos por descanso" onClose={() => setEditingPolicy(null)} size="sm">
          <div className="space-y-4">
            <p className="text-xs text-slate-500">
              Tiempo de descanso incluido dentro de la jornada paga. Si un colaborador toma más tiempo, los minutos adicionales se registran y se ajustan al calcular el total de horas.
            </p>
            <FormGroup label="☕ Desayuno (minutos)" required>
              <input type="number" className="input" value={editingPolicy.DESAYUNO}
                onChange={(e) => setEditingPolicy((p) => p ? ({ ...p, DESAYUNO: e.target.value }) : p)} />
            </FormGroup>
            <FormGroup label="🍽️ Almuerzo (minutos)" required>
              <input type="number" className="input" value={editingPolicy.ALMUERZO}
                onChange={(e) => setEditingPolicy((p) => p ? ({ ...p, ALMUERZO: e.target.value }) : p)} />
            </FormGroup>
            <FormGroup label="☕ Café (minutos)" required>
              <input type="number" className="input" value={editingPolicy.CAFE}
                onChange={(e) => setEditingPolicy((p) => p ? ({ ...p, CAFE: e.target.value }) : p)} />
            </FormGroup>
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => setEditingPolicy(null)}>Cancelar</button>
              <button className="btn-primary" onClick={handleSavePolicy} disabled={savingPolicy}>
                {savingPolicy ? <Spinner size="sm" /> : 'Guardar'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}


// ─── PÁGINA PRINCIPAL ─────────────────────────────────
export default function TimesheetPage() {
  const { isAdmin, user } = useAuthStore();
  const [tab, setTab] = useState<'fichar' | 'historial' | 'reporte'>('fichar');

  const tabs = [
    { id: 'fichar', label: 'Marcar asistencia', icon: Clock },
    { id: 'historial', label: 'Mi historial', icon: Calendar },
    ...(isAdmin ? [{ id: 'reporte', label: 'Reporte admin', icon: Users }] : []),
  ] as const;

  return (
    <div className="space-y-5">
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2">
          <Clock size={22} className="text-wood-500" /> Control de Horario
        </h1>
        <p className="text-sm text-slate-500">Bienvenido, {user?.nombre}</p>
      </div>

      {/* Tabs */}
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

      {tab === 'fichar'    && <ClockWidget />}
      {tab === 'historial' && <MyHistory />}
      {tab === 'reporte'   && isAdmin && <AdminPanel />}
    </div>
  );
}
