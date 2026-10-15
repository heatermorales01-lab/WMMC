'use client';
import { useEffect, useRef, useState } from 'react';
import { ClipboardCheck, ArrowLeft, CheckCircle2, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { examsApi } from '@/lib/api';
import { Spinner, Confirm, EmptyState } from '@/components/ui';

function fmtFecha(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' });
}

const ESTADO_LABEL: Record<string, { texto: string; clase: string }> = {
  EN_PROGRESO: { texto: 'En progreso', clase: 'badge-warning' },
  ENVIADO: { texto: 'Enviado', clase: 'badge-info' },
  EN_REVISION: { texto: 'Pendiente de revisión', clase: 'badge-info' },
  REVISADO: { texto: 'Revisado', clase: 'badge-success' },
};

// ─── Pantalla de resultado (solo cuando el admin ya revisó) ───
function ResultadoIntento({ attemptId, onBack }: { attemptId: string; onBack: () => void }) {
  const [data, setData] = useState<any>(null);
  useEffect(() => { examsApi.myAttempt(attemptId).then(setData); }, [attemptId]);
  if (!data) return <div className="flex justify-center py-10"><Spinner /></div>;

  return (
    <div className="space-y-4">
      <button className="btn-ghost btn-sm" onClick={onBack}><ArrowLeft size={15} /> Volver</button>
      <div className="card card-body space-y-4">
        <h2 className="font-display font-bold text-slate-900">{data.examNombre}</h2>
        {data.estado !== 'REVISADO' ? (
          <div className="rounded-xl bg-slate-50 border p-5 text-center space-y-1">
            <Clock className="mx-auto text-slate-400" size={28} />
            <p className="font-semibold text-slate-700">Tu examen fue enviado el {fmtFecha(data.fechaEnvio)}</p>
            <p className="text-sm text-slate-500">Está pendiente de revisión por un administrador. Podrás ver tu resultado aquí cuando termine.</p>
          </div>
        ) : (
          <>
            <div className="rounded-xl bg-green-50 border border-green-200 p-5 text-center">
              <p className="text-sm text-green-700 font-semibold">Nota final</p>
              <p className="text-4xl font-bold text-green-700">{data.notaFinal} <span className="text-lg font-semibold">/ {data.puntajeMaximo}</span></p>
              <p className="text-xs text-slate-500 mt-1">Revisado el {fmtFecha(data.fechaRevision)}{data.evaluador ? ` por ${data.evaluador}` : ''}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="rounded-lg border p-3"><p className="text-xs text-slate-500">Preguntas de selección</p><p className="font-bold text-slate-800">{data.puntajeAutomatico}</p></div>
              <div className="rounded-lg border p-3"><p className="text-xs text-slate-500">Preguntas abiertas</p><p className="font-bold text-slate-800">{data.puntajeManual}</p></div>
            </div>
            {data.observacionesEvaluador && (
              <div className="rounded-lg border p-4">
                <p className="text-xs font-semibold text-slate-500 mb-1">Observaciones del evaluador</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{data.observacionesEvaluador}</p>
              </div>
            )}
            <p className="text-xs text-slate-400">Esta nota es teórica y no autoriza por sí sola a operar maquinaria; la competencia práctica la verifica una persona autorizada.</p>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Formulario del examen ───
function TomarExamen({ examId, onBack }: { examId: string; onBack: () => void }) {
  const [loading, setLoading] = useState(true);
  const [exam, setExam] = useState<any>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [puesto, setPuesto] = useState('');
  const [respuestas, setRespuestas] = useState<Record<string, { opcionId?: string | null; texto?: string }>>({});
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [seccionIdx, setSeccionIdx] = useState(0);
  const [terminado, setTerminado] = useState<string | null>(null);
  const timers = useRef<Record<string, any>>({});

  useEffect(() => {
    examsApi.take(examId).then((d) => {
      setExam(d.exam);
      if (d.intento) {
        setAttemptId(d.intento.id);
        setPuesto(d.intento.puesto || '');
        const map: any = {};
        d.intento.respuestas.forEach((r: any) => { map[r.questionId] = { opcionId: r.opcionId, texto: r.textoRespuesta || '' }; });
        setRespuestas(map);
      }
    }).catch((err) => { toast.error(err.response?.data?.error || 'No se pudo cargar el examen'); onBack(); })
      .finally(() => setLoading(false));
  }, [examId]);

  const iniciar = async () => {
    if (!puesto.trim()) { toast.error('Indica tu puesto para comenzar'); return; }
    try {
      const res = await examsApi.startAttempt(examId, puesto.trim());
      setAttemptId(res.data.id);
    } catch (err: any) { toast.error(err.response?.data?.error || 'No se pudo iniciar'); }
  };

  // Autoguardado por pregunta (opciones al instante, texto con debounce).
  const guardar = (questionId: string, valor: { opcionId?: string | null; texto?: string }, inmediato: boolean) => {
    setRespuestas((p) => ({ ...p, [questionId]: valor }));
    if (!attemptId) return;
    const enviar = () => examsApi.saveAnswer(attemptId, { questionId, opcionId: valor.opcionId || null, textoRespuesta: valor.texto ?? null })
      .catch(() => toast.error('No se pudo guardar tu respuesta; revisa tu conexión'));
    clearTimeout(timers.current[questionId]);
    if (inmediato) enviar(); else timers.current[questionId] = setTimeout(enviar, 800);
  };

  const respondida = (p: any) => {
    const r = respuestas[p.id];
    return p.tipo === 'SELECCION_UNICA' ? !!r?.opcionId : !!r?.texto?.trim();
  };

  if (loading) return <div className="flex justify-center py-10"><Spinner /></div>;
  if (!exam) return null;
  if (terminado) return <ResultadoIntento attemptId={terminado} onBack={onBack} />;

  // Paso previo: puesto + instrucciones
  if (!attemptId) {
    return (
      <div className="space-y-4">
        <button className="btn-ghost btn-sm" onClick={onBack}><ArrowLeft size={15} /> Volver</button>
        <div className="card card-body space-y-4">
          <h2 className="font-display font-bold text-slate-900">{exam.nombre}</h2>
          {exam.duracionMinutos && <p className="text-sm text-slate-500">Duración sugerida: {exam.duracionMinutos} minutos</p>}
          {exam.instrucciones && <p className="text-sm text-slate-700 whitespace-pre-wrap">{exam.instrucciones}</p>}
          <div>
            <label className="label">Puesto <span className="text-danger">*</span></label>
            <input className="input" value={puesto} onChange={(e) => setPuesto(e.target.value)} placeholder="Ej: Operario de enchapadora" />
          </div>
          <button className="btn-primary justify-center" onClick={iniciar}>Comenzar examen</button>
        </div>
      </div>
    );
  }

  const todas = exam.secciones.flatMap((s: any) => s.preguntas);
  const contestadas = todas.filter(respondida).length;
  const sinResponder = todas.length - contestadas;
  const seccion = exam.secciones[seccionIdx];

  const enviar = async () => {
    setEnviando(true);
    try {
      const res = await examsApi.submit(attemptId);
      toast.success(res.message);
      setConfirmando(false);
      setTerminado(attemptId);
    } catch (err: any) { toast.error(err.response?.data?.error || 'No se pudo enviar'); }
    finally { setEnviando(false); }
  };

  return (
    <div className="space-y-4">
      <div className="card card-body space-y-2 sticky top-0 z-10">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display font-bold text-slate-900 truncate">{exam.nombre}</h2>
          <span className="text-xs text-slate-500 whitespace-nowrap">{contestadas}/{todas.length} respondidas</span>
        </div>
        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
          <div className="h-full bg-wood-500 transition-all" style={{ width: `${todas.length ? (contestadas / todas.length) * 100 : 0}%` }} />
        </div>
        <div className="flex gap-1 overflow-x-auto">
          {exam.secciones.map((s: any, i: number) => {
            const pend = s.preguntas.filter((p: any) => !respondida(p)).length;
            return (
              <button key={s.id} onClick={() => setSeccionIdx(i)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap border ${i === seccionIdx ? 'bg-wood-500 text-white border-wood-500' : 'bg-white text-slate-600'}`}>
                {s.nombre}{pend > 0 && <span className="ml-1 text-amber-500">•{pend}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {seccion && (
        <div className="space-y-3">
          <h3 className="font-display font-bold text-slate-800">{seccion.nombre}{seccion.opcional && <span className="ml-2 text-xs font-normal text-slate-400">(práctica, no suma a la nota)</span>}</h3>
          {seccion.preguntas.map((p: any, i: number) => (
            <div key={p.id} className="card card-body space-y-3">
              <div className="flex justify-between gap-3">
                <p className="text-sm font-semibold text-slate-800">{i + 1}. {p.enunciado}</p>
                {!seccion.opcional && <span className="text-xs text-slate-400 whitespace-nowrap">{p.puntaje} pts</span>}
              </div>
              {p.tipo === 'SELECCION_UNICA' ? (
                <div className="space-y-2">
                  {p.opciones.map((o: any) => (
                    <label key={o.id} className={`flex items-start gap-2 rounded-lg border p-3 text-sm cursor-pointer ${respuestas[p.id]?.opcionId === o.id ? 'border-wood-500 bg-wood-50' : 'hover:bg-slate-50'}`}>
                      <input type="radio" name={p.id} className="mt-0.5" checked={respuestas[p.id]?.opcionId === o.id}
                        onChange={() => guardar(p.id, { opcionId: o.id }, true)} />
                      <span>{o.texto}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <textarea className="input min-h-[110px]" placeholder="Escribe tu respuesta. Si no la conoces, indícalo."
                  value={respuestas[p.id]?.texto || ''} onChange={(e) => guardar(p.id, { texto: e.target.value }, false)} />
              )}
            </div>
          ))}
          <div className="flex justify-between">
            <button className="btn-secondary" disabled={seccionIdx === 0} onClick={() => setSeccionIdx(seccionIdx - 1)}>Anterior</button>
            {seccionIdx < exam.secciones.length - 1
              ? <button className="btn-primary" onClick={() => setSeccionIdx(seccionIdx + 1)}>Siguiente sección</button>
              : <button className="btn-primary" onClick={() => setConfirmando(true)}>Enviar examen</button>}
          </div>
        </div>
      )}

      {confirmando && (
        <Confirm
          message={sinResponder > 0
            ? `Tienes ${sinResponder} pregunta(s) sin responder. Una vez enviado no podrás modificar tus respuestas. ¿Enviar de todos modos?`
            : 'Una vez enviado no podrás modificar tus respuestas. ¿Enviar el examen?'}
          onConfirm={enviar}
          onCancel={() => setConfirmando(false)}
          loading={enviando}
        />
      )}
    </div>
  );
}

// ─── Lista "Mis exámenes" ───
export default function WorkerExams() {
  const [exams, setExams] = useState<any[] | null>(null);
  const [vista, setVista] = useState<{ tipo: 'tomar'; examId: string } | { tipo: 'resultado'; attemptId: string } | null>(null);

  const cargar = () => examsApi.available().then(setExams);
  useEffect(() => { cargar(); }, [vista]);

  if (vista?.tipo === 'tomar') return <TomarExamen examId={vista.examId} onBack={() => setVista(null)} />;
  if (vista?.tipo === 'resultado') return <ResultadoIntento attemptId={vista.attemptId} onBack={() => setVista(null)} />;
  if (!exams) return <div className="flex justify-center py-10"><Spinner /></div>;
  if (exams.length === 0) {
    return <EmptyState icon={<ClipboardCheck size={28} />} title="No hay evaluaciones disponibles" description="Cuando el administrador publique una evaluación, aparecerá aquí." />;
  }

  return (
    <div className="space-y-3">
      {exams.map((e) => {
        const u = e.ultimoIntento;
        return (
          <div key={e.id} className="card card-body flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-display font-bold text-slate-900">{e.nombre}</h3>
              {e.descripcion && <p className="text-sm text-slate-500">{e.descripcion}</p>}
              <p className="text-xs text-slate-400 mt-1">{e.duracionMinutos ? `${e.duracionMinutos} min · ` : ''}{e.puntajeMaximo} puntos</p>
              {u && (
                <p className="text-xs mt-2">
                  <span className={ESTADO_LABEL[u.estado].clase}>{ESTADO_LABEL[u.estado].texto}</span>
                  {u.estado === 'REVISADO' && <span className="ml-2 font-semibold text-slate-700 inline-flex items-center gap-1"><CheckCircle2 size={13} className="text-green-600" /> {u.notaFinal}/{u.puntajeMaximo}</span>}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              {u && u.estado !== 'EN_PROGRESO' && (
                <button className="btn-secondary btn-sm" onClick={() => setVista({ tipo: 'resultado', attemptId: u.id })}>
                  {u.estado === 'REVISADO' ? 'Ver resultado' : 'Ver estado'}
                </button>
              )}
              {(!u || u.estado === 'EN_PROGRESO' || u.estado === 'REVISADO') && (
                <button className="btn-primary btn-sm" onClick={() => setVista({ tipo: 'tomar', examId: e.id })}>
                  {u?.estado === 'EN_PROGRESO' ? 'Continuar' : u ? 'Repetir examen' : 'Comenzar'}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
