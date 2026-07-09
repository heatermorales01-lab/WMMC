import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, withAdmin } from '@/lib/auth';
import { handleError, AppError } from '@/lib/errors';

export const GET = withAuth(async () => {
  try {
    const services = await prisma.service.findMany({ orderBy: { nombre: 'asc' } });
    return NextResponse.json({ ok: true, data: services });
  } catch (e) { return handleError(e); }
});

export const POST = withAdmin(async (req) => {
  try {
    const { nombre, precioBase } = await req.json();
    if (!nombre) throw new AppError('nombre es requerido', 400);
    const svc = await prisma.service.create({ data: { nombre, precioBase: Number(precioBase) } });
    return NextResponse.json({ ok: true, data: svc }, { status: 201 });
  } catch (e) { return handleError(e); }
});
