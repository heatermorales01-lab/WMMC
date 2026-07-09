import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdmin } from '@/lib/auth';
import { handleError, AppError } from '@/lib/errors';

export const PUT = withAdmin(async (req, { params }) => {
  try {
    const { nombre, precio, unidad } = await req.json();
    const extra = await prisma.extra.update({ where: { id: params.id }, data: { nombre, precio: Number(precio), unidad } });
    return NextResponse.json({ ok: true, data: extra });
  } catch (e) { return handleError(e); }
});

export const DELETE = withAdmin(async (_req, { params }) => {
  try {
    const count = await prisma.quotationItemExtra.count({ where: { extraId: params.id } });
    if (count === 0) {
      await prisma.extra.delete({ where: { id: params.id } });
      return NextResponse.json({ ok: true, message: 'Extra eliminado permanentemente' });
    }
    const updated = await prisma.extra.update({ where: { id: params.id }, data: { activo: false } });
    return NextResponse.json({ ok: true, data: updated, message: `Usado en ${count} cotización(es), se desactivó para preservar historial.` });
  } catch (e) { return handleError(e); }
});
