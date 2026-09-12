import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, withAdmin } from '@/lib/auth';
import { handleError, AppError } from '@/lib/errors';
import { logCatalogChange } from '@/lib/audit';

export const GET = withAuth(async () => {
  try {
    const types = await prisma.countertopType.findMany({ orderBy: { nombre: 'asc' } });
    return NextResponse.json({ ok: true, data: types });
  } catch (e) { return handleError(e); }
});

export const POST = withAdmin(async (req, _ctx, user) => {
  try {
    const { nombre, precioM2 } = await req.json();
    if (!nombre) throw new AppError('nombre es requerido', 400);
    const ct = await prisma.countertopType.create({ data: { nombre, precioM2: Number(precioM2) } });

    await logCatalogChange({
      userId: user.userId, modulo: 'TABLETOPS', accion: 'CREAR',
      entidadId: ct.id, entidadNombre: ct.nombre, valorNuevo: { precioM2: ct.precioM2 },
    });

    return NextResponse.json({ ok: true, data: ct }, { status: 201 });
  } catch (e) { return handleError(e); }
});
