import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdmin } from '@/lib/auth';
import { handleError, AppError } from '@/lib/errors';

export const PUT = withAdmin(async (req, { params }) => {
  try {
    const { nombre, precioBase } = await req.json();
    const svc = await prisma.service.update({ where: { id: params.id }, data: { nombre, precioBase: Number(precioBase) } });
    return NextResponse.json({ ok: true, data: svc });
  } catch (e) { return handleError(e); }
});

export const DELETE = withAdmin(async (_req, { params }) => {
  try {
    const count = await (prisma as any).quotationService.count({ where: { serviceId: params.id } });
    if (count === 0) {
      await prisma.service.delete({ where: { id: params.id } });
      return NextResponse.json({ ok: true, message: 'Servicio eliminado permanentemente' });
    }
    const updated = await prisma.service.update({ where: { id: params.id }, data: { activo: false } });
    return NextResponse.json({ ok: true, data: updated, message: `Usado en ${count} cotización(es), se desactivó.` });
  } catch (e) { return handleError(e); }
});
