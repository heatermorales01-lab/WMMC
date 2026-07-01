import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withBlockTrabajador } from '@/lib/auth';
import { handleError, AppError } from '@/lib/errors';
import { QUOTATION_INCLUDE } from '@/lib/quotation-helpers';

export const GET = withBlockTrabajador(async (_req, { params }) => {
  try {
    const q = await prisma.quotation.findUnique({ where: { id: params.id }, include: QUOTATION_INCLUDE });
    if (!q) throw new AppError('Cotización no encontrada', 404);
    return NextResponse.json({ ok: true, data: q });
  } catch (e) { return handleError(e); }
});

export const DELETE = withBlockTrabajador(async (_req, { params }) => {
  try {
    await prisma.$transaction(async (tx: any) => {
      const q = await tx.quotation.findUnique({ where: { id: params.id } });
      if (!q) throw new AppError('Cotización no encontrada', 404);
      if (q.estado === 'APROBADA') throw new AppError('No se puede eliminar una cotización aprobada', 400);
      const items = await tx.quotationItem.findMany({ where: { quotationId: params.id } });
      for (const item of items) {
        await tx.quotationItemExtra.deleteMany({ where: { quotationItemId: item.id } });
      }
      await tx.quotationItem.deleteMany({ where: { quotationId: params.id } });
      await tx.quotationService.deleteMany({ where: { quotationId: params.id } });
      const sale = await tx.sale.findFirst({ where: { quotationId: params.id } });
      if (sale) {
        const payments = await tx.payment.findMany({ where: { saleId: sale.id } });
        for (const p of payments) {
          if (p.receiptId) await tx.receipt.delete({ where: { id: p.receiptId } });
        }
        await tx.payment.deleteMany({ where: { saleId: sale.id } });
        await tx.paymentSchedule.deleteMany({ where: { projectId: q.projectId } });
        await tx.sale.delete({ where: { id: sale.id } });
      }
      await tx.quotation.delete({ where: { id: params.id } });
    });
    return NextResponse.json({ ok: true, message: 'Cotización eliminada' });
  } catch (e) { return handleError(e); }
});
