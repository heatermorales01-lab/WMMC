import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, withAdmin } from '@/lib/auth';
import { handleError, AppError } from '@/lib/errors';
import { logCatalogChange } from '@/lib/audit';

export const GET = withAuth(async () => {
  try {
    const extras = await prisma.extra.findMany({ orderBy: { nombre: 'asc' } });
    return NextResponse.json({ ok: true, data: extras });
  } catch (e) { return handleError(e); }
});

export const POST = withAdmin(async (req, _ctx, user) => {
  try {
    const { nombre, precio, unidad } = await req.json();
    if (!nombre) throw new AppError('nombre es requerido', 400);
    const extra = await prisma.extra.create({ data: { nombre, precio: Number(precio), unidad } });

    await logCatalogChange({
      userId: user.userId, modulo: 'EXTRAS', accion: 'CREAR',
      entidadId: extra.id, entidadNombre: extra.nombre, valorNuevo: { precio: extra.precio, unidad: extra.unidad },
    });

    return NextResponse.json({ ok: true, data: extra }, { status: 201 });
  } catch (e) { return handleError(e); }
});
