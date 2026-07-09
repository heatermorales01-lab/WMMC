import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, withAdmin } from '@/lib/auth';
import { handleError, AppError } from '@/lib/errors';

export const GET = withAuth(async () => {
  try {
    const types = await prisma.furnitureType.findMany({ orderBy: { nombre: 'asc' } });
    return NextResponse.json({ ok: true, data: types });
  } catch (e) { return handleError(e); }
});

export const POST = withAdmin(async (req) => {
  try {
    const { nombre, precioBase } = await req.json();
    if (!nombre) throw new AppError('nombre es requerido', 400);
    const ft = await prisma.furnitureType.create({ data: { nombre, precioBase: Number(precioBase) || 0 } });
    return NextResponse.json({ ok: true, data: ft }, { status: 201 });
  } catch (e) { return handleError(e); }
});
