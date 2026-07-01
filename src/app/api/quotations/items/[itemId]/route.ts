import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withBlockTrabajador } from '@/lib/auth';
import { handleError, AppError } from '@/lib/errors';
import { recalcularTotalesCotizacion } from '@/lib/quotation-helpers';

export const DELETE = withBlockTrabajador(async (_req, { params }) => {
  try {
    const item = await prisma.quotationItem.findUnique({ where: { id: params.itemId } });
    if (!item) throw new AppError('Item no encontrado', 404);
    const q = await prisma.quotation.findUnique({ where: { id: item.quotationId } });
    if (q?.estado === 'APROBADA') throw new AppError('No se pueden modificar cotizaciones aprobadas', 400);
    await prisma.$transaction(async (tx: any) => {
      await tx.quotationItemExtra.deleteMany({ where: { quotationItemId: params.itemId } });
      await tx.quotationItem.delete({ where: { id: params.itemId } });
      await recalcularTotalesCotizacion(tx, item.quotationId);
    });
    return NextResponse.json({ ok: true, message: 'Item eliminado' });
  } catch (e) { return handleError(e); }
});
