import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withBlockTrabajador } from '@/lib/auth';
import { handleError, AppError } from '@/lib/errors';

export const GET = withBlockTrabajador(async () => {
  try {
    const clients = await prisma.client.findMany({
      include: { _count: { select: { projects: true } } },
      orderBy: { nombre: 'asc' },
    });
    return NextResponse.json({ ok: true, data: clients });
  } catch (e) { return handleError(e); }
});

export const POST = withBlockTrabajador(async (req) => {
  try {
    const { nombre, telefono, correo, direccion } = await req.json();
    if (!nombre) throw new AppError('El nombre es requerido', 400);
    const client = await prisma.client.create({ data: { nombre, telefono, correo, direccion } });
    return NextResponse.json({ ok: true, data: client }, { status: 201 });
  } catch (e) { return handleError(e); }
});
