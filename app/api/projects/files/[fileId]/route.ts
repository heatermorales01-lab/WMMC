import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';
import { handleError, AppError } from '@/lib/errors';

export const DELETE = withAuth(async (_req, { params }) => {
  try {
    const file = await (prisma as any).projectFile.findUnique({ where: { id: params.fileId } });
    if (!file) throw new AppError('Archivo no encontrado', 404);
    await (prisma as any).projectFile.delete({ where: { id: params.fileId } });
    return NextResponse.json({ ok: true, message: 'Archivo eliminado' });
  } catch (e) { return handleError(e); }
});
