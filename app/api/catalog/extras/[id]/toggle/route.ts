import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdmin } from '@/lib/auth';
import { handleError, AppError } from '@/lib/errors';

export const PATCH = withAdmin(async (_req, { params }) => {
  try {
    const extra = await prisma.extra.findUnique({ where: { id: params.id } });
    if (!extra) throw new AppError('Extra no encontrado', 404);
    const updated = await prisma.extra.update({ where: { id: params.id }, data: { activo: !extra.activo } });
    return NextResponse.json({ ok: true, data: updated });
  } catch (e) { return handleError(e); }
});
