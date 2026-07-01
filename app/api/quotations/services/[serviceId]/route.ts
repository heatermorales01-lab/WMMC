import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withBlockTrabajador } from '@/lib/auth';
import { handleError, AppError } from '@/lib/errors';
import { recalcularTotalesCotizacion } from '@/lib/quotation-helpers';

export const DELETE = withBlockTrabajador(async (_req, { params }) => {
  try {
    const qs = await (prisma as any).quotationService.findUnique({ where: { id: params.serviceId } });
    if (!qs) throw new AppError('Servicio no encontrado', 404);
    await prisma.$transaction(async (tx: any) => {
      await tx.quotationService.delete({ where: { id: params.serviceId } });
      await recalcularTotalesCotizacion(tx, qs.quotationId);
    });
    return NextResponse.json({ ok: true, message: 'Servicio eliminado de la cotización' });
  } catch (e) { return handleError(e); }
});
