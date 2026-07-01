import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withBlockTrabajador } from '@/lib/auth';
import { handleError, AppError } from '@/lib/errors';
import { QUOTATION_INCLUDE, recalcularTotalesCotizacion } from '@/lib/quotation-helpers';

export const PATCH = withBlockTrabajador(async (req, { params }) => {
  try {
    const { incluirIva } = await req.json();
    const q = await prisma.quotation.findUnique({ where: { id: params.id } });
    if (!q) throw new AppError('Cotización no encontrada', 404);
    if (q.estado === 'APROBADA') throw new AppError('No se pueden modificar cotizaciones aprobadas', 400);
    await prisma.$transaction(async (tx: any) => {
      await tx.quotation.update({ where: { id: params.id }, data: { incluirIva: Boolean(incluirIva) } });
      await recalcularTotalesCotizacion(tx, params.id);
    });
    const updated = await prisma.quotation.findUnique({ where: { id: params.id }, include: QUOTATION_INCLUDE });
    return NextResponse.json({ ok: true, data: updated });
  } catch (e) { return handleError(e); }
});
