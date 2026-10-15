'use client';
import { useEffect, useState } from 'react';
import { ArrowLeft, Plus, Pencil, Trash2, ShieldAlert, ClipboardCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { examsApi } from '@/lib/api';
import { Spinner, Modal, FormGroup, Confirm, EmptyState } from '@/components/ui';

type Opcion = { texto: string; esCorrecta: boolean };
const PREGUNTA_VACIA = { id: '', tipo: 'SELECCION_UNICA', enunciado: '', puntaje: '', guiaEvaluador: '', criticaSeguridad: false, opciones: [{ texto: '', esCorrecta: true }, { texto: '', esCorrecta: false }] as Opcion[] };

// ─── Editor de un examen (secciones y preguntas) ───
function EditorExamen({ examId, onBack }: { examId: string; onBack: () => void }) {
  const [exam, setExam] = useState<any>(null);
  const [seccionModal, setSeccionModal] = useState<{ id?: string; nombre: string; opcional: boolean } | null>(null);
  const [preguntaModal, setPreguntaModal] = useState<{ sectionId: string; q: typeof PREGUNTA_VACIA } | null>(null);
  const [borrar, setBorrar] = useState<{ tipo: 'seccion' | 'pregunta'; id: string } | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cargar = () => examsApi.get(examId).then(setExam);
  useEffect(() => { cargar(); }, [examId]);
  if (!exam) return <div className="flex justify-center py-10"><Spinner /></div>;

  const guardarSeccion = async () => {
    if (!seccionModal?.nombre.trim()) { toast.error('Escribe el nombre'); return; }
    setGuardando(true);
    try {
      if (seccionModal.id) await examsApi.updateSection(seccionModal.id, { nombre: seccionModal.nombre, opcional: seccionModal.opcional });
      else await examsApi.addSection(examId, { nombre: seccionModal.nombre, opcional: seccionModal.opcional });
      setSeccionModal(null); await cargar();
    } catch (err: any) { toast.error(err.response?.data?.error || 'Error'); }
    finally { setGuardando(false); }
  };

  const guardarPregunta = async () => {
    if (!preguntaModal) return;
    const q = preguntaModal.q;
    const payload = {
      tipo: q.tipo, enunciado: q.enunciado, puntaje: Number(q.puntaje), guiaEvaluador: q.guiaEvaluador, criticaSeguridad: q.criticaSeguridad,
      opciones: q.tipo === 'SELECCION_UNICA' ? q.opciones.filter((o) => o.texto.trim()) : undefined,
    };
    setGuardando(true);
    try {
      if (q.id) await examsApi.updateQuestion(q.id, payload);
      else await examsApi.addQuestion(preguntaModal.sectionId, payload);
      setPreguntaModal(null); await cargar();
    } catch (err: any) { toast.error(err.response?.data?.error || 'Error'); }
    finally { setGuardando(false); }
  };

  const confirmarBorrado = async () => {
    if (!borrar) return;
    try {
      if (borrar.tipo === 'seccion') await examsApi.removeSection(borrar.id); else await examsApi.removeQuestion(borrar.id);
      setBorrar(null); await cargar();
    } catch (err: any) { toast.error(err.response?.data?.error || 'Error'); }
  };

  const total = exam.secciones.filter((s: any) => !s.opcional).reduce((a: number, s: any) => a + s.preguntas.reduce((b: number, p: any) => b + p.puntaje, 0), 0);

  return (
    <div className="space-y-4">
      <button className="btn-ghost btn-sm" onClick={onBack}><ArrowLeft size={15} /> Volver a exámenes</button>
      <div className="card card-body flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display font-bold text-slate-900">{exam.nombre}</h2>
          <p className="text-xs text-slate-500">{exam.activo ? 'Publicado' : 'Borrador'} · puntaje total que cuenta: {total}</p>
        </div>
        <button className="btn-primary btn-sm" onClick={() => setSeccionModal({ nombre: '', opcional: false })}><Plus size={14} /> Sección</button>
      </div>

      {exam.secciones.length === 0 && <EmptyState icon={<ClipboardCheck size={28} />} title="Aún no hay secciones" description="Agrega una sección (ej. Herramientas) y luego sus preguntas." />}

      {exam.secciones.map((s: any) => (
        <div key={s.id} className="card">
          <div className="card-header">
            <div>
              <h3 className="font-display font-bold text-slate-900">{s.nombre}</h3>
              <p className="text-xs text-slate-400">{s.preguntas.length} pregunta(s){s.opcional ? ' · opcional, no suma a la nota' : ''}</p>
            </div>
            <div className="flex gap-1">
              <button className="btn-secondary btn-sm" onClick={() => setPreguntaModal({ sectionId: s.id, q: { ...PREGUNTA_VACIA, opciones: PREGUNTA_VACIA.opciones.map((o) => ({ ...o })) } })}><Plus size={13} /> Pregunta</button>
              <button className="btn-ghost btn-sm p-1" onClick={() => setSeccionModal({ id: s.id, nombre: s.nombre, opcional: s.opcional })}><Pencil size={13} /></button>
              <button className="btn-ghost btn-sm p-1 text-danger" onClick={() => setBorrar({ tipo: 'seccion', id: s.id })}><Trash2 size={13} /></button>
            </div>
          </div>
          <div className="divide-y">
            {s.preguntas.map((p: any, i: number) => (
              <div key={p.id} className="px-5 py-3 flex justify-between gap-3">
                <div className="text-sm">
                  <p className="font-semibold text-slate-800">{i + 1}. {p.enunciado}</p>
                  <p className="text-xs text-slate-400">
                    {p.tipo === 'SELECCION_UNICA' ? 'Selección única' : 'Abierta'} · {p.puntaje} pts
                    {p.criticaSeguridad && <span className="ml-2 text-red-600 inline-flex items-center gap-1"><ShieldAlert size={11} /> crítica de seguridad</span>}
                  </p>
                  {p.tipo === 'SELECCION_UNICA' && (
                    <ul className="mt-1 text-xs text-slate-500">
                      {p.opciones.map((o: any) => <li key={o.id} className={o.esCorrecta ? 'text-green-700 font-semibold' : ''}>{o.esCorrecta ? '✓' : '·'} {o.texto}</li>)}
                    </ul>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button className="btn-ghost btn-sm p-1" onClick={() => setPreguntaModal({ sectionId: s.id, q: { id: p.id, tipo: p.tipo, enunciado: p.enunciado, puntaje: String(p.puntaje), guiaEvaluador: p.guiaEvaluador || '', criticaSeguridad: p.criticaSeguridad, opciones: p.opciones.length ? p.opciones.map((o: any) => ({ texto: o.texto, esCorrecta: o.esCorrecta })) : PREGUNTA_VACIA.opciones.map((o) => ({ ...o })) } })}><Pencil size={13} /></button>
                  <button className="btn-ghost btn-sm p-1 text-danger" onClick={() => setBorrar({ tipo: 'pregunta', id: p.id })}><Trash2 size={13} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {seccionModal && (
        <Modal title={seccionModal.id ? 'Editar sección' : 'Nueva sección'} onClose={() => setSeccionModal(null)} size="sm">
          <div className="space-y-4">
            <FormGroup label="Nombre" required><input className="input" value={seccionModal.nombre} onChange={(e) => setSeccionModal({ ...seccionModal, nombre: e.target.value })} /></FormGroup>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={seccionModal.opcional} onChange={(e) => setSeccionModal({ ...seccionModal, opcional: e.target.checked })} /> Sección opcional (no suma a la nota, ej. casos prácticos)</label>
            <div className="flex justify-end gap-2"><button className="btn-secondary" onClick={() => setSeccionModal(null)}>Cancelar</button><button className="btn-primary" disabled={guardando} onClick={guardarSeccion}>{guardando ? <Spinner size="sm" /> : 'Guardar'}</button></div>
          </div>
        </Modal>
      )}

      {preguntaModal && (
        <Modal title={preguntaModal.q.id ? 'Editar pregunta' : 'Nueva pregunta'} onClose={() => setPreguntaModal(null)} size="lg">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormGroup label="Tipo">
                <select className="input" value={preguntaModal.q.tipo} onChange={(e) => setPreguntaModal({ ...preguntaModal, q: { ...preguntaModal.q, tipo: e.target.value } })}>
                  <option value="SELECCION_UNICA">Selección única</option><option value="ABIERTA">Abierta</option>
                </select>
              </FormGroup>
              <FormGroup label="Puntaje" required><input type="number" step="0.5" min={0} className="input" value={preguntaModal.q.puntaje} onChange={(e) => setPreguntaModal({ ...preguntaModal, q: { ...preguntaModal.q, puntaje: e.target.value } })} /></FormGroup>
            </div>
            <FormGroup label="Enunciado" required><textarea className="input min-h-[80px]" value={preguntaModal.q.enunciado} onChange={(e) => setPreguntaModal({ ...preguntaModal, q: { ...preguntaModal.q, enunciado: e.target.value } })} /></FormGroup>

            {preguntaModal.q.tipo === 'SELECCION_UNICA' && (
              <div className="space-y-2">
                <p className="label">Opciones (marca la correcta)</p>
                {preguntaModal.q.opciones.map((o, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input type="radio" name="correcta" checked={o.esCorrecta} onChange={() => setPreguntaModal({ ...preguntaModal, q: { ...preguntaModal.q, opciones: preguntaModal.q.opciones.map((x, j) => ({ ...x, esCorrecta: j === i })) } })} />
                    <input className="input flex-1" placeholder={`Opción ${i + 1}`} value={o.texto} onChange={(e) => setPreguntaModal({ ...preguntaModal, q: { ...preguntaModal.q, opciones: preguntaModal.q.opciones.map((x, j) => j === i ? { ...x, texto: e.target.value } : x) } })} />
                    {preguntaModal.q.opciones.length > 2 && <button className="btn-ghost btn-sm p-1 text-danger" onClick={() => setPreguntaModal({ ...preguntaModal, q: { ...preguntaModal.q, opciones: preguntaModal.q.opciones.filter((_, j) => j !== i) } })}><Trash2 size={13} /></button>}
                  </div>
                ))}
                <button className="btn-secondary btn-sm" onClick={() => setPreguntaModal({ ...preguntaModal, q: { ...preguntaModal.q, opciones: [...preguntaModal.q.opciones, { texto: '', esCorrecta: false }] } })}><Plus size={13} /> Opción</button>
              </div>
            )}

            <FormGroup label="Guía para el evaluador (solo la ve el administrador)"><textarea className="input min-h-[70px]" value={preguntaModal.q.guiaEvaluador} onChange={(e) => setPreguntaModal({ ...preguntaModal, q: { ...preguntaModal.q, guiaEvaluador: e.target.value } })} /></FormGroup>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={preguntaModal.q.criticaSeguridad} onChange={(e) => setPreguntaModal({ ...preguntaModal, q: { ...preguntaModal.q, criticaSeguridad: e.target.checked } })} /> Pregunta crítica de seguridad (obliga a revisión del evaluador)</label>
            <div className="flex justify-end gap-2"><button className="btn-secondary" onClick={() => setPreguntaModal(null)}>Cancelar</button><button className="btn-primary" disabled={guardando} onClick={guardarPregunta}>{guardando ? <Spinner size="sm" /> : 'Guardar'}</button></div>
          </div>
        </Modal>
      )}

      {borrar && <Confirm message={borrar.tipo === 'seccion' ? '¿Eliminar la sección y todas sus preguntas?' : '¿Eliminar esta pregunta?'} onConfirm={confirmarBorrado} onCancel={() => setBorrar(null)} />}
    </div>
  );
}

// ─── Lista de exámenes ───
export default function ExamBuilder() {
  const [exams, setExams] = useState<any[] | null>(null);
  const [editando, setEditando] = useState<string | null>(null);
  const [nuevo, setNuevo] = useState<{ nombre: string; descripcion: string; instrucciones: string; duracionMinutos: string } | null>(null);
  const [borrar, setBorrar] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cargar = () => examsApi.list().then(setExams);
  useEffect(() => { if (!editando) cargar(); }, [editando]);

  if (editando) return <EditorExamen examId={editando} onBack={() => setEditando(null)} />;
  if (!exams) return <div className="flex justify-center py-10"><Spinner /></div>;

  const crear = async () => {
    if (!nuevo?.nombre.trim()) { toast.error('Escribe el nombre'); return; }
    setGuardando(true);
    try {
      const res = await examsApi.create(nuevo);
      setNuevo(null); setEditando(res.data.id);
    } catch (err: any) { toast.error(err.response?.data?.error || 'Error'); }
    finally { setGuardando(false); }
  };

  const toggle = async (id: string) => {
    try { const res = await examsApi.toggle(id); toast.success(res.message); cargar(); }
    catch (err: any) { toast.error(err.response?.data?.error || 'Error'); }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end"><button className="btn-primary btn-sm" onClick={() => setNuevo({ nombre: '', descripcion: '', instrucciones: '', duracionMinutos: '' })}><Plus size={14} /> Nuevo examen</button></div>
      {exams.length === 0 && <EmptyState icon={<ClipboardCheck size={28} />} title="No hay exámenes" description="Crea el primero o carga el examen inicial con el script de seed." />}
      {exams.map((e) => (
        <div key={e.id} className="card card-body flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display font-bold text-slate-900">{e.nombre} <span className="text-xs font-normal text-slate-400">v{e.version}</span></h3>
            <p className="text-xs text-slate-500">{e.totalSecciones} secciones · {e.totalPreguntas} preguntas · {e.puntajeMaximo} pts · {e.totalIntentos} intento(s)</p>
            <span className={e.activo ? 'badge-success' : 'badge-neutral'}>{e.activo ? 'Publicado' : 'Borrador'}</span>
          </div>
          <div className="flex gap-2">
            <button className="btn-secondary btn-sm" onClick={() => setEditando(e.id)}><Pencil size={13} /> Editar</button>
            <button className="btn-secondary btn-sm" onClick={() => toggle(e.id)}>{e.activo ? 'Despublicar' : 'Publicar'}</button>
            {e.totalIntentos === 0 && <button className="btn-ghost btn-sm p-1 text-danger" onClick={() => setBorrar(e.id)}><Trash2 size={14} /></button>}
          </div>
        </div>
      ))}

      {nuevo && (
        <Modal title="Nuevo examen" onClose={() => setNuevo(null)} size="md">
          <div className="space-y-4">
            <FormGroup label="Nombre" required><input className="input" value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} /></FormGroup>
            <FormGroup label="Descripción"><input className="input" value={nuevo.descripcion} onChange={(e) => setNuevo({ ...nuevo, descripcion: e.target.value })} /></FormGroup>
            <FormGroup label="Instrucciones para el trabajador"><textarea className="input min-h-[90px]" value={nuevo.instrucciones} onChange={(e) => setNuevo({ ...nuevo, instrucciones: e.target.value })} /></FormGroup>
            <FormGroup label="Duración sugerida (minutos)"><input type="number" className="input" value={nuevo.duracionMinutos} onChange={(e) => setNuevo({ ...nuevo, duracionMinutos: e.target.value })} /></FormGroup>
            <div className="flex justify-end gap-2"><button className="btn-secondary" onClick={() => setNuevo(null)}>Cancelar</button><button className="btn-primary" disabled={guardando} onClick={crear}>{guardando ? <Spinner size="sm" /> : 'Crear y agregar preguntas'}</button></div>
          </div>
        </Modal>
      )}
      {borrar && <Confirm message="¿Eliminar este examen?" onConfirm={async () => { try { await examsApi.remove(borrar); setBorrar(null); cargar(); } catch (err: any) { toast.error(err.response?.data?.error || 'Error'); } }} onCancel={() => setBorrar(null)} />}
    </div>
  );
}
