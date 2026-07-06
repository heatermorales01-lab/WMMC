import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withBlockTrabajador } from '@/lib/auth';
import { handleError, AppError } from '@/lib/errors';
import { QUOTATION_INCLUDE, recalcularTotalesCotizacion } from '@/lib/quotation-helpers';

export const POST = withBlockTrabajador(async (req, { params }) => {
  try {
    const { serviceId, montoManual } = await req.json();
    if (!serviceId) throw new AppError('serviceId es requerido', 400);
    const q = await prisma.quotation.findUnique({ where: { id: params.id } });
    if (!q) throw new AppError('Cotización no encontrada', 404);
    if (q.estado === 'APROBADA') throw new AppError('No se pueden modificar cotizaciones aprobadas', 400);

    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    if (!service) throw new AppError('Servicio no encontrado', 404);

    const subtotal = montoManual != null ? Number(montoManual) : Number(service.precioBase);

      await prisma.$transaction(async (tx: any) => {

          console.log("=== DATOS A INSERTAR ===");
          console.log({
              quotationId: params.id,
              serviceId,
              subtotal,
              montoManual: montoManual != null ? Number(montoManual) : null,
          });


        await tx.quotationService.create({
            data: {
                quotationId: params.id,
                serviceId,
                subtotal,
                montoManual: montoManual != null ? Number(montoManual) : null,
            },
        });
      await recalcularTotalesCotizacion(tx, params.id);
    });

    const updated = await prisma.quotation.findUnique({ where: { id: params.id }, include: QUOTATION_INCLUDE });
    return NextResponse.json({ ok: true, data: updated }, { status: 201 });
  } catch (e) { return handleError(e); }
});
