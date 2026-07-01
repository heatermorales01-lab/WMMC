import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';
import { handleError } from '@/lib/errors';

export const GET = withAuth(async (_req: NextRequest, _ctx, user) => {
  try {
    const found = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { id: true, nombre: true, correo: true, activo: true, role: true, createdAt: true },
    });
    if (!found) return NextResponse.json({ ok: false, error: 'Usuario no encontrado' }, { status: 404 });
    return NextResponse.json({ ok: true, data: found });
  } catch (e) { return handleError(e); }
});
