import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdmin } from '@/lib/auth';
import { handleError, AppError } from '@/lib/errors';

export const PATCH = withAdmin(async (req, { params }) => {
  try {
    const { precioBase } = await req.json();
    const ft = await prisma.furnitureType.update({ where: { id: params.id }, data: { precioBase: Number(precioBase) } });
    return NextResponse.json({ ok: true, data: ft });
  } catch (e) { return handleError(e); }
});

export const DELETE = withAdmin(async (_req, { params }) => {
  try {
    const usageCount = await prisma.quotationItem.count({ where: { furnitureTypeId: params.id } });
    if (usageCount > 0) throw new AppError(`No se puede eliminar: está usado en ${usageCount} cotización(es)`, 409);
    await (prisma as any).materialFurniturePrice.deleteMany({ where: { furnitureTypeId: params.id } });
    await prisma.furnitureType.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true, message: 'Tipo de mueble eliminado' });
  } catch (e) { return handleError(e); }
});
