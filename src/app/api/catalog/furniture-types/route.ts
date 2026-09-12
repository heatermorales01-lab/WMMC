import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, withAdmin } from '@/lib/auth';
import { handleError, AppError } from '@/lib/errors';
import { logCatalogChange } from '@/lib/audit';

export const GET = withAuth(async () => {
  try {
    const types = await prisma.furnitureType.findMany({ orderBy: { nombre: 'asc' } });
    return NextResponse.json({ ok: true, data: types });
  } catch (e) { return handleError(e); }
});

export const POST = withAdmin(async (req, _ctx, user) => {
  try {
    const { nombre, precioBase } = await req.json();
    if (!nombre) throw new AppError('nombre es requerido', 400);
    const ft = await prisma.furnitureType.create({ data: { nombre, precioBase: Number(precioBase) || 0 } });

    await logCatalogChange({
      userId: user.userId, modulo: 'TIPOS_MUEBLE', accion: 'CREAR',
      entidadId: ft.id, entidadNombre: ft.nombre, valorNuevo: { precioBase: ft.precioBase },
    });

    return NextResponse.json({ ok: true, data: ft }, { status: 201 });
  } catch (e) { return handleError(e); }
});
