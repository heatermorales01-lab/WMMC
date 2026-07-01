import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdmin } from '@/lib/auth';
import { handleError, AppError } from '@/lib/errors';

export const DELETE = withAdmin(async (_req, { params }) => {
  try {
    const usageCount = await prisma.quotationItem.count({ where: { materialId: params.id } });
    if (usageCount > 0) throw new AppError(`No se puede eliminar: está usado en ${usageCount} cotización(es)`, 409);
    await (prisma as any).materialFurniturePrice.deleteMany({ where: { materialId: params.id } });
    await prisma.material.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true, message: 'Material eliminado' });
  } catch (e) { return handleError(e); }
});
