'use client';
import { useEffect, useState } from 'react';
import { ArrowLeft, ShieldAlert, ClipboardCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { examsApi } from '@/lib/api';
import { Spinner, Confirm, EmptyState } from '@/components/ui';

function fmtFecha(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' });
}

const ESTADO: Record<string, { texto: string; clase: string }> = {
  EN_PROGRESO: { texto: 'En progreso', clase: 'badge-warning' },
  ENVIADO: { texto: 'Enviado', clase: 'badge-info' },
  EN_REVISION: { texto: 'Por revisar', clase: 'badge-warning' },
  REVISADO: { texto: 'Revisado', clase: 'badge-success' },
};

// ─── Pantalla de revisión de un intento ───
function RevisarIntento({ attemptId, onBack }: { attemptId: string; onBack: () => void }) {
  const [data, setData] = useState<any>(null);
  const [notas, setNotas] = useState<Record<string, { puntaje: string; obs: string }>>({});
  const [guardando, setGuardando] = useState<string | null>(null);
  const [resultadoPractica, setResultadoPractica] = useState('');
  const [obsPractica, setObsPractica] = useState('');
  const [obsGenerales, setObsGenerales] = useState('');
  const [confirmando, setConfirmando] = useState(false);
  const [finalizando, setFinalizando] = useState(false);

  const cargar = () => examsApi.review(attemptId).then((d) => {
    setData(d);
    const n: any = {};
    d.secciones.forEach((s: any) => s.preguntas.forEach((p: any) => {
      if (p.tipo === 'ABIERTA') n[p.id] = { puntaje: p.respuesta?.calificada ? String(p.respuesta.puntajeObtenido) : '', obs: p.respuesta?.observacionEvaluador || '' };
    }));
    setNotas((prev) => ({ ...n, ...prev }));
    setResultadoPractica(d.resultadoPractica || '');
    setObsPractica(d.observacionesPractica || '');
    setObsGenerales(d.observacionesEvaluador || '');
  });
  useEffect(() => { cargar(); }, [attemptId]);

  if (!data) return <div className="flex justify-center py-10"><Spinner /></div>;
  const revisado = data.estado === 'REVISADO';

  const calificar = async (p: any) => {
    const n = notas[p.id];
    if (!n || n.puntaje === '' || isNaN(Number(n.puntaje))) { toast.error('Escribe un puntaje'); return; }
    setGuardando(p.id);
    try {
      await examsApi.grade(attemptId, { questionId: p.id, puntajeObtenido: Number(n.puntaje), observacionEvaluador: n.obs });
      toast.success('Calificación guardada');
      await cargar();
    } catch (err: any) { toast.error(err.response?.data?.error || 'Error al guardar'); }
    finally { setGuardando(null); }
  };

  const contables = data.secciones.filter((s: any) => !s.opcional).flatMap((s: any) => s.preguntas);
  const abiertas = contables.filter((p: any) => p.tipo === 'ABIERTA');
  const pendientes = abiertas.filter((p: any) => !p.respuesta?.calificada).length;

  // Puntajes en vivo (mientras se califica): automático + manual ya asignado.
  const auto = contables.filter((p: any) => p.tipo === 'SELECCION_UNICA').reduce((a: number, p: any) => a + (p.respuesta?.calificada ? Number(p.respuesta.puntajeObtenido || 0) : 0), 0);
  const manual = abiertas.reduce((a: number, p: any) => a + (p.respuesta?.calificada ? Number(p.respuesta.puntajeObtenido || 0) : 0), 0);
  const pendientePts = abiertas.filter((p: any) => !p.respuesta?.calificada).reduce((a: number, p: any) => a + Number(p.puntaje), 0);

  const finalizar = async () => {
    setFinalizando(true);
    try {
      const res = await examsApi.finalize(attemptId, { resultadoPractica, observacionesPractica: obsPractica, observacionesEvaluador: obsGenerales });
      toast.success(res.message);
      onBack();
    } catch (err: any) { toast.error(err.response?.data?.error || 'No se pudo finalizar'); }
    finally { setFinalizando(false); setConfirmando(false); }
  };

  return (
    <div className="space-y-4">
      <button className="btn-ghost btn-sm" onClick={onBack}><ArrowLeft size={15} /> Volver a la bandeja</button>

      <div className="card card-body space-y-3">
        <div className="flex flex-wrap justify-between gap-2">
          <div>
            <h2 className="font-display font-bold text-slate-900">{data.examNombre}</h2>
            <p className="text-sm text-slate-600">{data.trabajador}{data.puesto ? ` · ${data.puesto}` : ''}</p>
            <p className="text-xs text-slate-400">Enviado: {fmtFecha(data.fechaEnvio)}{revisado ? ` · Revisado: ${fmtFecha(data.fechaRevision)}${data.evaluador ? ` por ${data.evaluador}` : ''}` : ''}</p>
          </div>
          <span className={ESTADO[data.estado].clase + ' h-fit'}>{ESTADO[data.estado].texto}</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg border p-3"><p className="text-xs text-slate-500">Automática</p><p className="font-bold">{revisado ? data.puntajeAutomatico : auto}</p></div>
          <div className="rounded-lg border p-3"><p className="text-xs text-slate-500">Pendiente por calificar</p><p className="font-bold text-amber-600">{revisado ? 0 : pendientePts}</p></div>
          <div className="rounded-lg border p-3 bg-slate-50"><p className="text-xs text-slate-500">Nota final</p><p className="font-bold">{revisado ? `${data.notaFinal}/${data.puntajeMaximo}` : 'Pendiente'}</p></div>
        </div>
        {!revisado && <p className="text-xs text-slate-500">La nota final no se considera definitiva hasta calificar todas las respuestas abiertas ({pendientes} pendiente{pendientes === 1 ? '' : 's'}; manual asignado hasta ahora: {manual}).</p>}
      </div>

      {data.secciones.map((s: any) => (
        <div key={s.id} className="space-y-3">
          <h3 className="font-display font-bold text-slate-800">{s.nombre}{s.opcional && <span className="ml-2 text-xs font-normal text-slate-400">(opcional, no suma a la nota)</span>}</h3>
          {s.preguntas.map((p: any, i: number) => {
            const r = p.respuesta;
            const correcta = p.opciones.find((o: any) => o.esCorrecta);
            return (
              <div key={p.id} className={`card card-body space-y-3 ${p.criticaSeguridad ? 'border-red-300' : ''}`}>
                <div className="flex justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-800">{i + 1}. {p.enunciado}</p>
                  <span className="text-xs text-slate-400 whitespace-nowrap">{p.puntaje} pts</span>
                </div>
                {p.criticaSeguridad && (
                  <p className="text-xs font-semibold text-red-600 flex items-center gap-1"><ShieldAlert size={14} /> Pregunta crítica de seguridad: revisa con atención. La nota no autoriza a operar maquinaria.</p>
                )}

                {p.tipo === 'SELECCION_UNICA' ? (
                  <div className="space-y-1.5">
                    {p.opciones.map((o: any) => {
                      const elegida = r?.opcionId === o.id;
                      return (
                        <div key={o.id} className={`rounded-lg border px-3 py-2 text-sm ${o.esCorrecta ? 'border-green-300 bg-green-50' : elegida ? 'border-red-300 bg-red-50' : ''}`}>
                          {o.texto}
                          {o.esCorrecta && <span className="ml-2 text-xs text-green-700 font-semibold">clave</span>}
                          {elegida && <span className="ml-2 text-xs font-semibold text-slate-600">← respuesta del trabajador</span>}
                        </div>
                      );
                    })}
                    {!r?.opcionId && <p className="text-xs text-amber-600">Sin responder</p>}
                    <p className="text-xs text-slate-500">Puntaje automático: {r?.puntajeObtenido ?? 0}/{p.puntaje}{correcta ? '' : ' (sin clave definida)'}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="rounded-lg border bg-slate-50 p-3 text-sm whitespace-pre-wrap">
                      {r?.textoRespuesta?.trim() ? r.textoRespuesta : <span className="text-amber-600">Sin responder</span>}
                    </div>
                    {p.guiaEvaluador && <p className="text-xs text-slate-500"><span className="font-semibold">Guía para evaluador:</span> {p.guiaEvaluador}</p>}
                    {revisado ? (
                      <p className="text-sm"><span className="font-semibold">{r?.puntajeObtenido ?? 0}/{p.puntaje}</span>{r?.observacionEvaluador ? ` — ${r.observacionEvaluador}` : ''}</p>
                    ) : (
                      <div className="flex flex-wrap items-start gap-2">
                        <input type="number" min={0} max={p.puntaje} step="0.5" className="input w-24" placeholder={`0–${p.puntaje}`}
                          value={notas[p.id]?.puntaje ?? ''} onChange={(e) => setNotas((n) => ({ ...n, [p.id]: { ...n[p.id], puntaje: e.target.value } }))} />
                        <input className="input flex-1 min-w-[200px]" placeholder="Observación (opcional)"
                          value={notas[p.id]?.obs ?? ''} onChange={(e) => setNotas((n) => ({ ...n, [p.id]: { ...n[p.id], obs: e.target.value } }))} />
                        <button className="btn-secondary btn-sm" disabled={guardando === p.id} onClick={() => calificar(p)}>
                          {guardando === p.id ? <Spinner size="sm" /> : r?.calificada ? 'Actualizar' : 'Guardar'}
                        </button>
                        {r?.calificada && <span className="text-xs text-green-600 self-center">✓ calificada</span>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}

      <div className="card card-body space-y-3">
        <h3 className="font-display font-bold text-slate-800">Cierre de la revisión</h3>
        <div>
          <label className="label">Casos prácticos realizados</label>
          <select className="input" disabled={revisado} value={resultadoPractica} onChange={(e) => setResultadoPractica(e.target.value)}>
            <option value="">Sin indicar</option><option value="SI">Sí</option><option value="NO">No</option><option value="N/A">No aplica</option>
          </select>
        </div>
        <div>
          <label className="label">Observaciones de la parte práctica</label>
          <textarea className="input min-h-[80px]" disabled={revisado} value={obsPractica} onChange={(e) => setObsPractica(e.target.value)} />
        </div>
        <div>
          <label className="label">Observaciones y necesidades de capacitación</label>
          <textarea className="input min-h-[80px]" disabled={revisado} value={obsGenerales} onChange={(e) => setObsGenerales(e.target.value)} />
        </div>
        {!revisado && (
          <button className="btn-primary justify-center" disabled={pendientes > 0} onClick={() => setConfirmando(true)}
            title={pendientes > 0 ? 'Califica todas las respuestas abiertas primero' : ''}>
            Finalizar revisión y publicar resultado
          </button>
        )}
      </div>

      {confirmando && (
        <Confirm message="Al finalizar, el trabajador podrá ver su nota y tus observaciones. ¿Continuar?" onConfirm={finalizar} onCancel={() => setConfirmando(false)} loading={finalizando} />
      )}
    </div>
  );
}

// ─── Bandeja de intentos ───
export default function AdminReview() {
  const [items, setItems] = useState<any[] | null>(null);
  const [filtro, setFiltro] = useState('EN_REVISION');
  const [abierto, setAbierto] = useState<string | null>(null);

  useEffect(() => {
    if (abierto) return;
    setItems(null);
    examsApi.attempts(filtro ? { estado: filtro } : undefined).then(setItems);
  }, [filtro, abierto]);

  if (abierto) return <RevisarIntento attemptId={abierto} onBack={() => setAbierto(null)} />;

  return (
    <div className="space-y-3">
      <div className="flex gap-1 overflow-x-auto">
        {[['EN_REVISION', 'Por revisar'], ['REVISADO', 'Revisadas'], ['EN_PROGRESO', 'En progreso'], ['', 'Todas']].map(([v, l]) => (
          <button key={v} onClick={() => setFiltro(v)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border whitespace-nowrap ${filtro === v ? 'bg-wood-500 text-white border-wood-500' : 'bg-white text-slate-600'}`}>{l}</button>
        ))}
      </div>
      {!items ? <div className="flex justify-center py-10"><Spinner /></div> : items.length === 0 ? (
        <EmptyState icon={<ClipboardCheck size={28} />} title="No hay evaluaciones en esta lista" />
      ) : (
        <div className="card table-wrap">
          <table className="table">
            <thead><tr><th>Trabajador</th><th>Examen</th><th>Enviado</th><th>Estado</th><th>Nota</th><th></th></tr></thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id}>
                  <td><p className="font-semibold">{a.trabajador}</p><p className="text-xs text-slate-400">{a.puesto || ''}</p></td>
                  <td>{a.examNombre}</td>
                  <td>{fmtFecha(a.fechaEnvio)}</td>
                  <td><span className={ESTADO[a.estado].clase}>{ESTADO[a.estado].texto}</span></td>
                  <td>{a.estado === 'REVISADO' ? `${a.notaFinal}/${a.puntajeMaximo}` : '—'}</td>
                  <td>{a.estado !== 'EN_PROGRESO' && <button className="btn-secondary btn-sm" onClick={() => setAbierto(a.id)}>{a.estado === 'REVISADO' ? 'Ver' : 'Revisar'}</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
