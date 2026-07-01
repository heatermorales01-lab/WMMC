import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdmin } from '@/lib/auth';
import { handleError, AppError } from '@/lib/errors';

export const PATCH = withAdmin(async (req, { params }) => {
  try {
    const { precioM2 } = await req.json();
    const ct = await prisma.countertopType.update({ where: { id: params.id }, data: { precioM2: Number(precioM2) } });
    return NextResponse.json({ ok: true, data: ct });
  } catch (e) { return handleError(e); }
});

export const DELETE = withAdmin(async (_req, { params }) => {
  try {
    const count = await prisma.quotationItem.count({ where: { countertopTypeId: params.id } });
    if (count > 0) throw new AppError(`No se puede eliminar: usado en ${count} cotización(es)`, 409);
    await prisma.countertopType.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true, message: 'Tipo de sobre eliminado' });
  } catch (e) { return handleError(e); }
});
