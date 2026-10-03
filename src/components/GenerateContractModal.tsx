'use client';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { contractApi } from '@/lib/api';
import { Modal, FormGroup, Spinner, MoneyInput } from '@/components/ui';

interface Props {
    projectId: string;
    onClose: () => void;
}

interface Accesorio { nombre: string; monto: number; imagen?: File | null }

interface CotizacionDesgloseItem {
    nombre: string;
    material: string;
    sobre?: string;
    dimensiones: string;
    descripcion?: string;
    cantidad: number;
    precioUnitario: number;
    subtotalMueble: number;
    subtotalConAccesorios: number;
    accesorios: { nombre: string; cantidad: number; subtotal: number }[];
}
interface CotizacionDesgloseServicio {
    nombre: string;
    cantidad: number;
    subtotal: number;
    precioPorUnidad?: number;
    esTransporte: boolean;
}
interface CotizacionDesglose {
    version: number;
    items: CotizacionDesgloseItem[];
    servicios: CotizacionDesgloseServicio[];
    subtotalMuebles: number;
    totalServicios: number;
    descuento?: number;
    descuentoMotivo?: string;
    incluirIva?: boolean;
    ivaMonto?: number;
    total: number;
}
interface QuotationOption { id: string; version: number; estado: string; total: number; desglose: CotizacionDesglose }

const DRAFT_KEY = (projectId: string) => `contrato-borrador-${projectId}`;

// Lo único que se guarda en el borrador local: texto y números. Las
// imágenes (File) no se pueden guardar en localStorage, así que esas
// siempre hay que volver a adjuntarlas si se recarga la página.
function getDraftableForm(form: any, accesorios: Accesorio[], descripcionGeneralModo: string, quotationIdSeleccionada: string) {
    return {
        form,
        accesorios: accesorios.map(({ nombre, monto }) => ({ nombre, monto })),
        descripcionGeneralModo,
        quotationIdSeleccionada,
    };
}

export default function GenerateContractModal({ projectId, onClose }: Props) {
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [hayBorrador, setHayBorrador] = useState(false);

    const [form, setForm] = useState({
        consumidorNombre: '',
        consumidorCedula: '',
        consumidorDomicilio: '',
        colorExterior: '',
        colorInterior: '',
        colorSobre: '',
        colorTapetaExterior: '',
        colorTapetaInterior: '',
        valorTotal: '',
        anticipo60: '',
        pagoInstalacion30: '',
        pagoFinal10: '',
        fechaEntregaEstimada: '',
        domicilioEntrega: '',
        observacionesGenerales: '',
    });
    const [accesorios, setAccesorios] = useState<Accesorio[]>([]);

    // Descripción general: manual (imagen) o automática (desde cotización)
    const [descripcionGeneralModo, setDescripcionGeneralModo] = useState<'manual' | 'cotizacion'>('manual');
    const [quotations, setQuotations] = useState<QuotationOption[]>([]);
    const [quotationIdSeleccionada, setQuotationIdSeleccionada] = useState('');

    const [imagenDescripcionGeneral, setImagenDescripcionGeneral] = useState<File | null>(null);
    const [imagenesDescripcionVisual, setImagenesDescripcionVisual] = useState<File[]>([]);
    const [imagenMuestraColorExterior, setImagenMuestraColorExterior] = useState<File | null>(null);
    const [imagenMuestraColorInterior, setImagenMuestraColorInterior] = useState<File | null>(null);

    const cargarPrefill = () => {
        setLoading(true);
        contractApi.prefill(projectId)
            .then((d) => {
                setForm((p) => ({
                    ...p,
                    consumidorNombre: d.consumidorNombre || '',
                    consumidorDomicilio: d.consumidorDomicilio || '',
                    domicilioEntrega: d.domicilioEntrega || '',
                    fechaEntregaEstimada: d.fechaEntregaEstimada || '',
                    valorTotal: String(Math.round(Number(d.valorTotal ?? 0))),
                    anticipo60: String(Math.round(Number(d.anticipo60 ?? 0))),
                    pagoInstalacion30: String(Math.round(Number(d.pagoInstalacion30 ?? 0))),
                    pagoFinal10: String(Math.round(Number(d.pagoFinal10 ?? 0))),
                }));
                setAccesorios((d.accesorios || []).map((a: any) => ({ ...a, imagen: null })));
                setQuotations(d.quotations || []);
                setQuotationIdSeleccionada(d.quotationIdPorDefecto || (d.quotations?.[0]?.id ?? ''));
            })
            .catch(() => toast.error('No se pudieron precargar los datos — puedes llenarlo manualmente'))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        const raw = localStorage.getItem(DRAFT_KEY(projectId));
        if (raw) {
            try {
                const draft = JSON.parse(raw);
                setForm(draft.form);
                setAccesorios((draft.accesorios || []).map((a: any) => ({ ...a, imagen: null })));
                setDescripcionGeneralModo(draft.descripcionGeneralModo || 'manual');
                setQuotationIdSeleccionada(draft.quotationIdSeleccionada || '');
                setHayBorrador(true);
            } catch {
                // borrador corrupto, se ignora
            }
        }
        // Siempre se trae la lista de cotizaciones del proyecto (no viaja en
        // el borrador), y si no había borrador, también precarga el resto.
        contractApi.prefill(projectId)
            .then((d) => {
                setQuotations(d.quotations || []);
                if (!raw) {
                    setForm((p) => ({
                        ...p,
                        consumidorNombre: d.consumidorNombre || '',
                        consumidorDomicilio: d.consumidorDomicilio || '',
                        domicilioEntrega: d.domicilioEntrega || '',
                        fechaEntregaEstimada: d.fechaEntregaEstimada || '',
                        valorTotal: String(Math.round(Number(d.valorTotal ?? 0))),
                        anticipo60: String(Math.round(Number(d.anticipo60 ?? 0))),
                        pagoInstalacion30: String(Math.round(Number(d.pagoInstalacion30 ?? 0))),
                        pagoFinal10: String(Math.round(Number(d.pagoFinal10 ?? 0))),
                    }));
                    setAccesorios((d.accesorios || []).map((a: any) => ({ ...a, imagen: null })));
                    setQuotationIdSeleccionada(d.quotationIdPorDefecto || (d.quotations?.[0]?.id ?? ''));
                }
            })
            .catch(() => { if (!raw) toast.error('No se pudieron precargar los datos — puedes llenarlo manualmente'); })
            .finally(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectId]);

    // Guarda el borrador en localStorage cada vez que algo cambia (solo
    // texto y números — las imágenes nunca se guardan ahí).
    useEffect(() => {
        if (loading) return;
        const data = getDraftableForm(form, accesorios, descripcionGeneralModo, quotationIdSeleccionada);
        localStorage.setItem(DRAFT_KEY(projectId), JSON.stringify(data));
    }, [form, accesorios, descripcionGeneralModo, quotationIdSeleccionada, loading, projectId]);

    const descartarBorrador = () => {
        localStorage.removeItem(DRAFT_KEY(projectId));
        setHayBorrador(false);
        cargarPrefill();
        toast.success('Borrador descartado, se recargaron los valores sugeridos');
    };

    const set = (field: keyof typeof form, value: string) => setForm((p) => ({ ...p, [field]: value }));

    // Al cambiar la cotización elegida para la descripción automática,
    // sincroniza también el valor total y los 3 pagos con esa cotización.
    // Siempre se redondea a colones enteros antes de tocar un MoneyInput.
    const handleSeleccionarCotizacion = (quotationId: string) => {
        setQuotationIdSeleccionada(quotationId);
        const q = quotations.find((x) => x.id === quotationId);
        if (!q) return;

        const totalEntero = Math.round(Number(q.desglose?.total ?? q.total ?? 0));
        setForm((p) => ({
            ...p,
            valorTotal: String(totalEntero),
            anticipo60: String(Math.round(totalEntero * 0.6)),
            pagoInstalacion30: String(Math.round(totalEntero * 0.3)),
            pagoFinal10: String(Math.round(totalEntero * 0.1)),
        }));
    };

    const updateAccesorio = (i: number, field: 'nombre' | 'monto', value: string | number) => {
        setAccesorios((prev) => prev.map((a, idx) => idx === i ? { ...a, [field]: field === 'monto' ? Number(value) || 0 : value } : a));
    };
    const setAccesorioImagen = (i: number, file: File | null) => {
        setAccesorios((prev) => prev.map((a, idx) => idx === i ? { ...a, imagen: file } : a));
    };
    const addAccesorio = () => setAccesorios((prev) => [...prev, { nombre: '', monto: 0, imagen: null }]);
    const removeAccesorio = (i: number) => setAccesorios((prev) => prev.filter((_, idx) => idx !== i));
    const totalAccesorios = accesorios.reduce((acc, a) => acc + Number(a.monto || 0), 0);

    const quotationSeleccionada = quotations.find((q) => q.id === quotationIdSeleccionada);

    const handleGenerate = async () => {
        if (!form.consumidorNombre.trim()) { toast.error('El nombre del consumidor es requerido'); return; }
        if (descripcionGeneralModo === 'cotizacion' && !quotationSeleccionada) {
            toast.error('Selecciona una cotización para la descripción general');
            return;
        }
        setGenerating(true);
        try {
            const fd = new FormData();
            Object.entries(form).forEach(([k, v]) => fd.append(k, v));
            fd.append('accesorios', JSON.stringify(accesorios.map(({ nombre, monto }) => ({ nombre, monto }))));
            accesorios.forEach((a, i) => { if (a.imagen) fd.append(`accesorioImagen_${i}`, a.imagen); });

            fd.append('descripcionGeneralModo', descripcionGeneralModo);
            if (descripcionGeneralModo === 'cotizacion' && quotationSeleccionada) {
                // El desglose ya viene completo (dimensiones, accesorios por mueble,
                // servicios/transporte, todo redondeado) desde el prefill — se manda tal cual.
                fd.append('cotizacionDesglose', JSON.stringify(quotationSeleccionada.desglose));
            } else if (imagenDescripcionGeneral) {
                fd.append('imagenDescripcionGeneral', imagenDescripcionGeneral);
            }

            imagenesDescripcionVisual.forEach((f) => fd.append('imagenesDescripcionVisual', f));
            if (imagenMuestraColorExterior) fd.append('imagenMuestraColorExterior', imagenMuestraColorExterior);
            if (imagenMuestraColorInterior) fd.append('imagenMuestraColorInterior', imagenMuestraColorInterior);

            const blob = await contractApi.generate(projectId, fd);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Contrato-${form.consumidorNombre.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            toast.success('Contrato generado');
            onClose();
        } catch (err: any) {
            toast.error('No se pudo generar el contrato');
        } finally {
            setGenerating(false);
        }
    };

    if (loading) {
        return (
            <Modal title="Generar contrato" onClose={onClose} size="lg">
                <div className="flex justify-center py-10"><Spinner /></div>
            </Modal>
        );
    }

    return (
        <Modal title="Generar contrato" onClose={onClose} size="lg">
            <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
                <div className="flex items-start justify-between gap-3">
                    <p className="text-xs text-slate-500">
                        Estos valores se precargan como sugerencia, pero puedes editar cualquiera antes de generar —
                        nada de lo que cambies aquí se guarda en el cliente ni en el proyecto, solo se usa para este PDF.
                    </p>
                    {hayBorrador && (
                        <button type="button" className="btn-ghost btn-sm whitespace-nowrap text-xs" onClick={descartarBorrador}>
                            🗑️ Descartar borrador
                        </button>
                    )}
                </div>
                <p className="text-[11px] text-slate-400 -mt-3">
                    Mientras llenas este formulario se guarda un borrador en este navegador — si cierras el modal sin
                    generar, al volver a abrirlo retoma donde quedaste (excepto las imágenes, hay que adjuntarlas de nuevo).
                </p>

                <hr className="border-slate-200" />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <FormGroup label="Nombre del Consumidor" required>
                        <input className="input" value={form.consumidorNombre} onChange={(e) => set('consumidorNombre', e.target.value)} />
                    </FormGroup>
                    <FormGroup label="Cédula del Consumidor">
                        <input className="input" value={form.consumidorCedula} onChange={(e) => set('consumidorCedula', e.target.value)} />
                    </FormGroup>
                </div>
                <FormGroup label="Domicilio del Consumidor">
                    <input className="input" value={form.consumidorDomicilio} onChange={(e) => set('consumidorDomicilio', e.target.value)} />
                </FormGroup>

                <hr className="border-slate-200" />

                <div>
                    <p className="text-xs font-semibold text-slate-500 mb-2">Descripción general del proyecto</p>
                    <div className="flex gap-4 mb-3">
                        <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                            <input type="radio" checked={descripcionGeneralModo === 'cotizacion'} onChange={() => setDescripcionGeneralModo('cotizacion')} />
                            Automático (desde cotización)
                        </label>
                        <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                            <input type="radio" checked={descripcionGeneralModo === 'manual'} onChange={() => setDescripcionGeneralModo('manual')} />
                            Manual (imagen)
                        </label>
                    </div>

                    {descripcionGeneralModo === 'cotizacion' ? (
                        quotations.length === 0 ? (
                            <p className="text-xs text-amber-600">Este proyecto no tiene cotizaciones todavía — usa el modo manual.</p>
                        ) : (
                            <>
                                <FormGroup label="Cotización a usar">
                                    <select className="input" value={quotationIdSeleccionada} onChange={(e) => handleSeleccionarCotizacion(e.target.value)}>
                                        {quotations.map((q) => (
                                            <option key={q.id} value={q.id}>v{q.version} — {q.estado} — ₡{q.total.toLocaleString('es-CR')}</option>
                                        ))}
                                    </select>
                                </FormGroup>
                                {quotationSeleccionada && (
                                    <div className="mt-2 border rounded-lg p-2 text-xs bg-slate-50 max-h-40 overflow-y-auto space-y-1">
                                        {quotationSeleccionada.desglose.items.map((it, i) => (
                                            <div key={i}>
                                                <div className="flex justify-between py-0.5">
                                                    <span>
                                                        {it.nombre} — {it.material}{it.sobre ? ` + ${it.sobre}` : ''} × {it.cantidad}
                                                        <span className="text-slate-400"> · {it.dimensiones}</span>
                                                    </span>
                                                    <span className="font-semibold">₡{it.subtotalConAccesorios.toLocaleString('es-CR')}</span>
                                                </div>
                                                {it.accesorios.map((ac, j) => (
                                                    <div key={j} className="flex justify-between py-0.5 pl-3 text-slate-500 italic">
                                                        <span>↳ {ac.nombre} × {ac.cantidad}</span>
                                                        <span>₡{ac.subtotal.toLocaleString('es-CR')}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        ))}
                                        {quotationSeleccionada.desglose.servicios.map((s, i) => (
                                            <div key={`svc-${i}`} className="flex justify-between py-0.5 border-t border-slate-200 pt-1 mt-1">
                                                <span>{s.esTransporte ? `${s.nombre} — ${s.cantidad} km` : `${s.nombre} × ${s.cantidad}`}</span>
                                                <span className="font-semibold">₡{s.subtotal.toLocaleString('es-CR')}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        )
                    ) : (
                        <FormGroup label="Imagen de descripción general">
                            <input type="file" accept="image/*" className="input" onChange={(e) => setImagenDescripcionGeneral(e.target.files?.[0] || null)} />
                        </FormGroup>
                    )}
                </div>

                <hr className="border-slate-200" />

                <p className="text-xs font-semibold text-slate-500">Colores</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <FormGroup label="Color exterior"><input className="input" value={form.colorExterior} onChange={(e) => set('colorExterior', e.target.value)} /></FormGroup>
                    <FormGroup label="Color interior"><input className="input" value={form.colorInterior} onChange={(e) => set('colorInterior', e.target.value)} /></FormGroup>
                    <FormGroup label="Sobre"><input className="input" value={form.colorSobre} onChange={(e) => set('colorSobre', e.target.value)} /></FormGroup>
                    <FormGroup label="Tapeta exterior (opcional)"><input className="input" value={form.colorTapetaExterior} onChange={(e) => set('colorTapetaExterior', e.target.value)} /></FormGroup>
                    <FormGroup label="Tapeta interior (opcional)"><input className="input" value={form.colorTapetaInterior} onChange={(e) => set('colorTapetaInterior', e.target.value)} /></FormGroup>
                </div>

                <hr className="border-slate-200" />

                <p className="text-xs font-semibold text-slate-500">Valor y forma de pago (₡)</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <FormGroup label="Valor total"><MoneyInput value={form.valorTotal} onChange={(v) => set('valorTotal', v)} placeholder="Ej: 3 000 000" /></FormGroup>
                    <FormGroup label="Anticipo (60%)"><MoneyInput value={form.anticipo60} onChange={(v) => set('anticipo60', v)} placeholder="Ej: 1 800 000" /></FormGroup>
                    <FormGroup label="Antes de instalar (30%)"><MoneyInput value={form.pagoInstalacion30} onChange={(v) => set('pagoInstalacion30', v)} placeholder="Ej: 900 000" /></FormGroup>
                    <FormGroup label="Final (10%)"><MoneyInput value={form.pagoFinal10} onChange={(v) => set('pagoFinal10', v)} placeholder="Ej: 300 000" /></FormGroup>
                </div>

                <hr className="border-slate-200" />

                <div>
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-slate-500">Accesorios</p>
                        <button type="button" className="btn-ghost btn-sm" onClick={addAccesorio}>+ Agregar</button>
                    </div>
                    <div className="space-y-2 mt-2">
                        {accesorios.map((a, i) => (
                            <div key={i} className="flex gap-2 items-center flex-wrap">
                                <input className="input flex-1 min-w-[140px]" placeholder="Nombre" value={a.nombre} onChange={(e) => updateAccesorio(i, 'nombre', e.target.value)} />
                                <div className="w-32"><MoneyInput value={String(a.monto)} onChange={(v) => updateAccesorio(i, 'monto', v)} placeholder="Monto" /></div>
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="input w-44 text-xs"
                                    title="Foto de referencia de este accesorio (opcional, para el Capítulo 13)"
                                    onChange={(e) => setAccesorioImagen(i, e.target.files?.[0] || null)}
                                />
                                <button type="button" className="btn-ghost btn-sm text-danger" onClick={() => removeAccesorio(i)}>✕</button>
                            </div>
                        ))}
                    </div>
                    <p className="text-xs text-slate-500 mt-2">Total accesorios: ₡{totalAccesorios.toLocaleString('es-CR')}</p>
                </div>

                <hr className="border-slate-200" />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <FormGroup label="Fecha estimada de entrega">
                        <input className="input" placeholder="Ej: 15 de marzo del 2027" value={form.fechaEntregaEstimada} onChange={(e) => set('fechaEntregaEstimada', e.target.value)} />
                    </FormGroup>
                    <FormGroup label="Domicilio de entrega">
                        <input className="input" value={form.domicilioEntrega} onChange={(e) => set('domicilioEntrega', e.target.value)} />
                    </FormGroup>
                </div>

                <hr className="border-slate-200" />

                <p className="text-xs font-semibold text-slate-500">Imágenes (opcionales — descripción visual y muestras de color)</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <FormGroup label="Descripción visual (hasta 2 imágenes)">
                        <input type="file" accept="image/*" multiple className="input" onChange={(e) => setImagenesDescripcionVisual(Array.from(e.target.files || []).slice(0, 2))} />
                    </FormGroup>
                    <div />
                    <FormGroup label="Muestra color exterior">
                        <input type="file" accept="image/*" className="input" onChange={(e) => setImagenMuestraColorExterior(e.target.files?.[0] || null)} />
                    </FormGroup>
                    <FormGroup label="Muestra color interior">
                        <input type="file" accept="image/*" className="input" onChange={(e) => setImagenMuestraColorInterior(e.target.files?.[0] || null)} />
                    </FormGroup>
                </div>

                <hr className="border-slate-200" />

                <FormGroup label="Observaciones generales (opcional)">
                    <textarea className="input" rows={3} value={form.observacionesGenerales} onChange={(e) => set('observacionesGenerales', e.target.value)} />
                </FormGroup>

                <div className="flex justify-end gap-2 pt-2">
                    <button className="btn-secondary" onClick={onClose}>Cancelar</button>
                    <button className="btn-primary" onClick={handleGenerate} disabled={generating}>
                        {generating ? <Spinner size="sm" /> : 'Generar contrato (PDF)'}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
