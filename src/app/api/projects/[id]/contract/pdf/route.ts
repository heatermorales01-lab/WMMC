import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withBlockTrabajador } from '@/lib/auth';
import { handleError, AppError } from '@/lib/errors';
import { generateContractPDF, ContractData, ContractImage } from '@/lib/services/contract-pdf.service';

// GET — valores SUGERIDOS para precargar el formulario. Son solo un punto
// de partida editable; nada de lo que el usuario cambie en el formulario
// se vuelve a guardar aquí ni en ningún otro lado.
export const GET = withBlockTrabajador(async (_req, { params }) => {
    try {
        const project = await prisma.project.findUnique({
            where: { id: params.id },
            include: { client: true },
        });
        if (!project) throw new AppError('Proyecto no encontrado', 404);

        // Todas las cotizaciones del proyecto, con su desglose completo — así
        // el formulario puede dejar elegir cuál usar (para la descripción
        // general automática) sin tener que ir y volver al servidor.
        const quotations = await prisma.quotation.findMany({
            where: { projectId: params.id },
            orderBy: { version: 'desc' },
            include: {
                quotationItems: {
                    include: {
                        furnitureType: true,
                        material: true,
                        quotationItemExtras: { include: { extra: true } },
                    },
                },
            },
        });

        const quotationsForForm = quotations.map((q) => ({
            id: q.id,
            version: q.version,
            estado: q.estado,
            total: Number(q.total),
            items: q.quotationItems.map((item: any) => ({
                nombre: item.nombrePersonalizado || item.furnitureType?.nombre || 'Mueble',
                material: item.material?.nombre || '',
                cantidad: item.cantidad,
                precioUnitario: Number(item.precioUnitario),
                subtotal: Number(item.subtotal),
            })),
        }));

        const quotation = quotations.find((q) => q.estado === 'APROBADA') || quotations[0];

        const schedule = await (prisma as any).paymentSchedule.findMany({ where: { projectId: params.id } }).catch(() => []);

        const total = quotation ? Number(quotation.total) : 0;
        const accesorios = (quotation?.quotationItems || []).flatMap((item: any) =>
            (item.quotationItemExtras || []).map((ex: any) => ({ nombre: ex.extra.nombre, monto: Number(ex.subtotal) }))
        );
        const totalAccesorios = accesorios.reduce((acc: number, a: any) => acc + a.monto, 0);

        return NextResponse.json({
            ok: true,
            data: {
                consumidorNombre: project.client?.nombre || '',
                consumidorCedula: '', // no existe en Client — se escribe en el formulario cada vez
                consumidorDomicilio: project.client?.direccion || project.ubicacion || '',
                domicilioEntrega: project.ubicacion || '',
                fechaEntregaEstimada: project.fechaInstalacionTentativa
                    ? new Date(project.fechaInstalacionTentativa).toLocaleDateString('es-CR')
                    : '',
                valorTotal: total,
                anticipo60: Math.round(total * 0.6),
                pagoInstalacion30: Math.round(total * 0.3),
                pagoFinal10: Math.round(total * 0.1),
                accesorios,
                totalAccesorios,
                schedule, // referencia informativa por si ya tienes un cronograma propio cargado
                quotations: quotationsForForm,
                quotationIdPorDefecto: quotation?.id || null,
            },
        });
    } catch (e) { return handleError(e); }
});

// POST — recibe el formulario COMPLETO (multipart/form-data: texto + imágenes)
// y devuelve el PDF ya armado. No escribe nada en la base de datos ni en
// ningún almacenamiento — todo vive solo dentro de esta solicitud.
export const POST = withBlockTrabajador(async (req, { params }) => {
    try {
        const formData = await req.formData();

        const getStr = (key: string) => (formData.get(key) as string) || '';
        const getNum = (key: string) => Number(formData.get(key) || 0);

        const readImage = async (key: string): Promise<ContractImage | undefined> => {
            const file = formData.get(key) as File | null;
            if (!file || file.size === 0) return undefined;
            return { buffer: Buffer.from(await file.arrayBuffer()), mimeType: file.type || 'image/jpeg' };
        };

        const readImages = async (key: string): Promise<ContractImage[]> => {
            const files = formData.getAll(key) as File[];
            const out: ContractImage[] = [];
            for (const file of files) {
                if (file && file.size > 0) out.push({ buffer: Buffer.from(await file.arrayBuffer()), mimeType: file.type || 'image/jpeg' });
            }
            return out;
        };

        let accesorios: { nombre: string; monto: number }[] = [];
        try {
            accesorios = JSON.parse(getStr('accesorios') || '[]');
        } catch {
            accesorios = [];
        }

        // Una imagen opcional por accesorio — el frontend la manda como
        // "accesorioImagen_<índice>", emparejada por posición con `accesorios`.
        const referenciasVisuales: { nombre: string; imagen: ContractImage }[] = [];
        for (let i = 0; i < accesorios.length; i++) {
            const img = await readImage(`accesorioImagen_${i}`);
            if (img) referenciasVisuales.push({ nombre: accesorios[i].nombre || `Accesorio ${i + 1}`, imagen: img });
        }

        const descripcionGeneralModo = (getStr('descripcionGeneralModo') || 'manual') as 'manual' | 'cotizacion';
        let cotizacionDesglose: ContractData['cotizacionDesglose'] = undefined;
        if (descripcionGeneralModo === 'cotizacion') {
            try {
                cotizacionDesglose = JSON.parse(getStr('cotizacionDesglose') || 'null') || undefined;
            } catch {
                cotizacionDesglose = undefined;
            }
        }

        const data: ContractData = {
            consumidorNombre: getStr('consumidorNombre'),
            consumidorCedula: getStr('consumidorCedula'),
            consumidorDomicilio: getStr('consumidorDomicilio'),
            colorExterior: getStr('colorExterior'),
            colorInterior: getStr('colorInterior'),
            colorSobre: getStr('colorSobre'),
            colorTapetaExterior: getStr('colorTapetaExterior'),
            colorTapetaInterior: getStr('colorTapetaInterior'),
            valorTotal: getNum('valorTotal'),
            anticipo60: getNum('anticipo60'),
            pagoInstalacion30: getNum('pagoInstalacion30'),
            pagoFinal10: getNum('pagoFinal10'),
            accesorios,
            totalAccesorios: accesorios.reduce((acc, a) => acc + Number(a.monto || 0), 0),
            fechaEntregaEstimada: getStr('fechaEntregaEstimada'),
            domicilioEntrega: getStr('domicilioEntrega'),
            observacionesGenerales: getStr('observacionesGenerales'),
            descripcionGeneralModo,
            cotizacionDesglose,
            imagenDescripcionGeneral: await readImage('imagenDescripcionGeneral'),
            imagenesDescripcionVisual: await readImages('imagenesDescripcionVisual'),
            imagenMuestraColorExterior: await readImage('imagenMuestraColorExterior'),
            imagenMuestraColorInterior: await readImage('imagenMuestraColorInterior'),
            referenciasVisuales,
        };

        const pdf = await generateContractPDF(data);

        return new NextResponse(new Uint8Array(pdf), {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="Contrato-${(data.consumidorNombre || 'cliente').replace(/[^a-zA-Z0-9]/g, '-')}.pdf"`,
            },
        });
    } catch (e) { return handleError(e); }
});