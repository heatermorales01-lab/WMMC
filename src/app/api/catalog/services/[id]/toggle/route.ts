import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdmin } from '@/lib/auth';
import { handleError, AppError } from '@/lib/errors';

export const PATCH = withAdmin(async (_req, { params }) => {
  try {
    const svc = await prisma.service.findUnique({ where: { id: params.id } });
    if (!svc) throw new AppError('Servicio no encontrado', 404);
    const updated = await prisma.service.update({ where: { id: params.id }, data: { activo: !svc.activo } });
    return NextResponse.json({ ok: true, data: updated });
  } catch (e) { return handleError(e); }
});
