import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withBlockTrabajador } from '@/lib/auth';
import { handleError, AppError } from '@/lib/errors';
import { QUOTATION_INCLUDE } from '@/lib/quotation-helpers';

export const PATCH = withBlockTrabajador(async (req, { params }) => {
  try {
    const { estado } = await req.json();
    const q = await prisma.quotation.findUnique({ where: { id: params.id } });
    if (!q) throw new AppError('Cotización no encontrada', 404);

    let updateData: any = { estado };

    if (estado === 'APROBADA') {
      const existingSale = await (prisma as any).sale.findFirst({ where: { quotationId: params.id } });
      if (!existingSale) {
        const updatedQ = await prisma.quotation.update({ where: { id: params.id }, data: updateData });
        await (prisma as any).sale.create({
          data: { projectId: updatedQ.projectId, quotationId: params.id, total: updatedQ.total },
        });
        await prisma.project.update({ where: { id: updatedQ.projectId }, data: { estado: 'EN_PROCESO' } });
        const final = await prisma.quotation.findUnique({ where: { id: params.id }, include: QUOTATION_INCLUDE });
        return NextResponse.json({ ok: true, data: final });
      }
    }

    const updated = await prisma.quotation.update({ where: { id: params.id }, data: updateData, include: QUOTATION_INCLUDE });
    return NextResponse.json({ ok: true, data: updated });
  } catch (e) { return handleError(e); }
});
