'use client';
import { useEffect, useState } from 'react';
import { Plus, Trash2, CreditCard, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { paymentsApi } from '@/lib/api';
import type { PaymentSchedule } from '@/types';
import { formatCRC } from '@/types';
import { Spinner } from './ui';

interface Cuota {
  descripcion: string;
  porcentaje: number;
  fechaEstimada: string;
}

const PRESETS = [
  { label: '60 - 30 - 10', cuotas: [{ desc: 'Anticipo', pct: 60 }, { desc: 'Avance', pct: 30 }, { desc: 'Contra entrega', pct: 10 }] },
  { label: '50 - 50',      cuotas: [{ desc: 'Anticipo', pct: 50 }, { desc: 'Contra entrega', pct: 50 }] },
  { label: '100%',         cuotas: [{ desc: 'Pago total', pct: 100 }] },
  { label: '40 - 40 - 20', cuotas: [{ desc: 'Anticipo', pct: 40 }, { desc: 'Producción', pct: 40 }, { desc: 'Contra entrega', pct: 20 }] },
];

export default function PaymentSchedulePanel({
  projectId,
  totalVenta,
}: {
  projectId: string;
  totalVenta?: number;
}) {
  const [schedule, setSchedule]   = useState<PaymentSchedule[]>([]);
  const [loading, setLoading]     = useState(true);
  const [editing, setEditing]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [cuotas, setCuotas]       = useState<Cuota[]>([]);

  const load = async () => {
    try {
      const data = await paymentsApi.getSchedule(projectId);
      setSchedule(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [projectId]);

  const startEdit = () => {
    setCuotas(
      schedule.length > 0
        ? schedule.map((s) => ({
            descripcion: s.descripcion || '',
            porcentaje: Number(s.porcentaje),
            fechaEstimada: s.fechaEstimada?.split('T')[0] || '',
          }))
        : [{ descripcion: 'Anticipo', porcentaje: 60, fechaEstimada: '' }]
    );
    setEditing(true);
  };

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setCuotas(preset.cuotas.map((c) => ({
      descripcion: c.desc,
      porcentaje: c.pct,
      fechaEstimada: '',
    })));
  };

  const addCuota = () => {
    setCuotas((p) => [...p, { descripcion: '', porcentaje: 0, fechaEstimada: '' }]);
  };

  const removeCuota = (i: number) => {
    setCuotas((p) => p.filter((_, idx) => idx !== i));
  };

  const updateCuota = (i: number, field: keyof Cuota, value: string | number) => {
    setCuotas((p) => p.map((c, idx) => idx === i ? { ...c, [field]: value } : c));
  };

  const suma = cuotas.reduce((acc, c) => acc + Number(c.porcentaje), 0);
  const valid = Math.abs(suma - 100) < 0.01 && cuotas.every((c) => c.descripcion.trim());

  const handleSave = async () => {
    if (!valid) {
      toast.error('Los porcentajes deben sumar exactamente 100%');
      return;
    }
    setSaving(true);
    try {
      await paymentsApi.setSchedule(projectId, cuotas);
      toast.success('Plan de pagos guardado');
      setEditing(false);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al guardar plan');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-6"><Spinner /></div>;

  // ── VISTA (no editando) ───────────────────────────────
  if (!editing) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <CreditCard size={15} className="text-wood-500" /> Plan de pagos
          </p>
          <button className="btn-ghost btn-sm" onClick={startEdit}>
            {schedule.length === 0 ? 'Configurar' : 'Editar'}
          </button>
        </div>

        {schedule.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">
            Sin plan de pagos configurado
          </p>
        ) : (
          <div className="space-y-2">
            {schedule.map((s, i) => {
              const monto = totalVenta ? (totalVenta * Number(s.porcentaje)) / 100 : null;
              return (
                <div key={s.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border bg-white">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                    s.pagado ? 'bg-green-100' : 'bg-slate-100'
                  }`}>
                    {s.pagado
                      ? <CheckCircle2 size={14} className="text-green-600" />
                      : <span className="text-xs font-bold text-slate-500">{i + 1}</span>
                    }
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-800">{s.descripcion || `Cuota ${i + 1}`}</p>
                    {s.fechaEstimada && (
                      <p className="text-xs text-slate-400">
                        {new Date(s.fechaEstimada).toLocaleDateString('es-CR')}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-900">{Number(s.porcentaje)}%</p>
                    {monto && (
                      <p className="text-xs text-slate-500">{formatCRC(monto)}</p>
                    )}
                  </div>
                </div>
              );
            })}
            {/* Barra de total */}
            <div className="flex justify-between text-xs text-slate-400 px-1 pt-1">
              <span>{schedule.length} cuota{schedule.length !== 1 ? 's' : ''}</span>
              {totalVenta && <span>Total: {formatCRC(totalVenta)}</span>}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── EDITOR ────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700">Editar plan de pagos</p>
        <button className="btn-ghost btn-sm" onClick={() => setEditing(false)}>Cancelar</button>
      </div>

      {/* Presets */}
      <div>
        <p className="text-xs text-slate-400 mb-2">Esquemas predefinidos:</p>
        <div className="flex gap-2 flex-wrap">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-wood-50 hover:border-wood-300 hover:text-wood-700 transition-colors"
              onClick={() => applyPreset(p)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cuotas editables */}
      <div className="space-y-2">
        {cuotas.map((c, i) => (
          <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_80px_130px_32px] gap-2 items-center">
            <input
              className="input text-sm py-1.5"
              placeholder="Descripción (ej: Anticipo)"
              value={c.descripcion}
              onChange={(e) => updateCuota(i, 'descripcion', e.target.value)}
            />
            <div className="relative">
              <input
                type="number"
                min={0} max={100}
                className="input text-sm py-1.5 pr-6"
                value={c.porcentaje}
                onChange={(e) => updateCuota(i, 'porcentaje', Number(e.target.value))}
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">%</span>
            </div>
            <input
              type="date"
              className="input text-sm py-1.5"
              value={c.fechaEstimada}
              onChange={(e) => updateCuota(i, 'fechaEstimada', e.target.value)}
            />
            <button
              className="btn-ghost btn-sm text-danger p-1"
              onClick={() => removeCuota(i)}
              disabled={cuotas.length === 1}
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>

      {/* Suma y botones */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-3">
          <button className="btn-ghost btn-sm" onClick={addCuota}>
            <Plus size={13} /> Agregar cuota
          </button>
          <span className={`text-sm font-semibold ${
            Math.abs(suma - 100) < 0.01 ? 'text-green-600' : 'text-danger'
          }`}>
            Total: {suma}%
            {Math.abs(suma - 100) < 0.01 ? ' ✓' : ` (faltan ${100 - suma}%)`}
          </span>
        </div>
        <button
          className="btn-primary btn-sm"
          onClick={handleSave}
          disabled={!valid || saving}
        >
          {saving ? <Spinner size="sm" /> : 'Guardar plan'}
        </button>
      </div>
    </div>
  );
}
