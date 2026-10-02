'use client';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { contractApi } from '@/lib/api';
import { Modal, FormGroup, Spinner } from '@/components/ui';

interface Props {
    projectId: string;
    onClose: () => void;
}

interface Accesorio { nombre: string; monto: number; imagen?: File | null }

export default function GenerateContractModal({ projectId, onClose }: Props) {
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

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

    const [imagenDescripcionGeneral, setImagenDescripcionGeneral] = useState<File | null>(null);
    const [imagenesDescripcionVisual, setImagenesDescripcionVisual] = useState<File[]>([]);
    const [imagenMuestraColorExterior, setImagenMuestraColorExterior] = useState<File | null>(null);
    const [imagenMuestraColorInterior, setImagenMuestraColorInterior] = useState<File | null>(null);

    useEffect(() => {
        contractApi.prefill(projectId)
            .then((d) => {
                setForm((p) => ({
                    ...p,
                    consumidorNombre: d.consumidorNombre || '',
                    consumidorDomicilio: d.consumidorDomicilio || '',
                    domicilioEntrega: d.domicilioEntrega || '',
                    fechaEntregaEstimada: d.fechaEntregaEstimada || '',
                    valorTotal: String(d.valorTotal ?? ''),
                    anticipo60: String(d.anticipo60 ?? ''),
                    pagoInstalacion30: String(d.pagoInstalacion30 ?? ''),
                    pagoFinal10: String(d.pagoFinal10 ?? ''),
                }));
                setAccesorios(d.accesorios || []);
            })
            .catch(() => toast.error('No se pudieron precargar los datos — puedes llenarlo manualmente'))
            .finally(() => setLoading(false));
    }, [projectId]);

    const set = (field: keyof typeof form, value: string) => setForm((p) => ({ ...p, [field]: value }));

    const updateAccesorio = (i: number, field: 'nombre' | 'monto', value: string) => {
        setAccesorios((prev) => prev.map((a, idx) => idx === i ? { ...a, [field]: field === 'monto' ? Number(value) || 0 : value } : a));
    };
    const setAccesorioImagen = (i: number, file: File | null) => {
        setAccesorios((prev) => prev.map((a, idx) => idx === i ? { ...a, imagen: file } : a));
    };
    const addAccesorio = () => setAccesorios((prev) => [...prev, { nombre: '', monto: 0, imagen: null }]);
    const removeAccesorio = (i: number) => setAccesorios((prev) => prev.filter((_, idx) => idx !== i));
    const totalAccesorios = accesorios.reduce((acc, a) => acc + Number(a.monto || 0), 0);

    const handleGenerate = async () => {
        if (!form.consumidorNombre.trim()) { toast.error('El nombre del consumidor es requerido'); return; }
        setGenerating(true);
        try {
            const fd = new FormData();
            Object.entries(form).forEach(([k, v]) => fd.append(k, v));
            fd.append('accesorios', JSON.stringify(accesorios.map(({ nombre, monto }) => ({ nombre, monto }))));
            accesorios.forEach((a, i) => { if (a.imagen) fd.append(`accesorioImagen_${i}`, a.imagen); });
            if (imagenDescripcionGeneral) fd.append('imagenDescripcionGeneral', imagenDescripcionGeneral);
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
                <p className="text-xs text-slate-500">
                    Estos valores se precargan como sugerencia, pero puedes editar cualquiera antes de generar —
                    nada de lo que cambies aquí se guarda en el cliente ni en el proyecto, solo se usa para este PDF.
                </p>

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

                <p className="text-xs font-semibold text-slate-500 pt-1">Colores</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <FormGroup label="Color exterior"><input className="input" value={form.colorExterior} onChange={(e) => set('colorExterior', e.target.value)} /></FormGroup>
                    <FormGroup label="Color interior"><input className="input" value={form.colorInterior} onChange={(e) => set('colorInterior', e.target.value)} /></FormGroup>
                    <FormGroup label="Sobre"><input className="input" value={form.colorSobre} onChange={(e) => set('colorSobre', e.target.value)} /></FormGroup>
                    <FormGroup label="Tapeta exterior (opcional)"><input className="input" value={form.colorTapetaExterior} onChange={(e) => set('colorTapetaExterior', e.target.value)} /></FormGroup>
                    <FormGroup label="Tapeta interior (opcional)"><input className="input" value={form.colorTapetaInterior} onChange={(e) => set('colorTapetaInterior', e.target.value)} /></FormGroup>
                </div>

                <p className="text-xs font-semibold text-slate-500 pt-1">Valor y forma de pago (₡)</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <FormGroup label="Valor total"><input type="number" className="input" value={form.valorTotal} onChange={(e) => set('valorTotal', e.target.value)} /></FormGroup>
                    <FormGroup label="Anticipo (60%)"><input type="number" className="input" value={form.anticipo60} onChange={(e) => set('anticipo60', e.target.value)} /></FormGroup>
                    <FormGroup label="Antes de instalar (30%)"><input type="number" className="input" value={form.pagoInstalacion30} onChange={(e) => set('pagoInstalacion30', e.target.value)} /></FormGroup>
                    <FormGroup label="Final (10%)"><input type="number" className="input" value={form.pagoFinal10} onChange={(e) => set('pagoFinal10', e.target.value)} /></FormGroup>
                </div>

                <div>
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-slate-500">Accesorios</p>
                        <button type="button" className="btn-ghost btn-sm" onClick={addAccesorio}>+ Agregar</button>
                    </div>
                    <div className="space-y-2 mt-2">
                        {accesorios.map((a, i) => (
                            <div key={i} className="flex gap-2 items-center flex-wrap">
                                <input className="input flex-1 min-w-[140px]" placeholder="Nombre" value={a.nombre} onChange={(e) => updateAccesorio(i, 'nombre', e.target.value)} />
                                <input type="number" className="input w-28" placeholder="Monto" value={a.monto} onChange={(e) => updateAccesorio(i, 'monto', e.target.value)} />
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <FormGroup label="Fecha estimada de entrega">
                        <input className="input" placeholder="Ej: 15 de marzo del 2027" value={form.fechaEntregaEstimada} onChange={(e) => set('fechaEntregaEstimada', e.target.value)} />
                    </FormGroup>
                    <FormGroup label="Domicilio de entrega">
                        <input className="input" value={form.domicilioEntrega} onChange={(e) => set('domicilioEntrega', e.target.value)} />
                    </FormGroup>
                </div>

                <p className="text-xs font-semibold text-slate-500 pt-1">Imágenes (opcionales)</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <FormGroup label="Descripción general del proyecto">
                        <input type="file" accept="image/*" className="input" onChange={(e) => setImagenDescripcionGeneral(e.target.files?.[0] || null)} />
                    </FormGroup>
                    <FormGroup label="Descripción visual (hasta 2 imágenes)">
                        <input type="file" accept="image/*" multiple className="input" onChange={(e) => setImagenesDescripcionVisual(Array.from(e.target.files || []).slice(0, 2))} />
                    </FormGroup>
                    <FormGroup label="Muestra color exterior">
                        <input type="file" accept="image/*" className="input" onChange={(e) => setImagenMuestraColorExterior(e.target.files?.[0] || null)} />
                    </FormGroup>
                    <FormGroup label="Muestra color interior">
                        <input type="file" accept="image/*" className="input" onChange={(e) => setImagenMuestraColorInterior(e.target.files?.[0] || null)} />
                    </FormGroup>
                </div>

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