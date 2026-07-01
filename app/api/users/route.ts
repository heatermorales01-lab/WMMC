import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { withAdmin } from '@/lib/auth';
import { handleError } from '@/lib/errors';
import { AppError } from '@/lib/errors';

export const GET = withAdmin(async () => {
  try {
    const users = await prisma.user.findMany({
      include: { role: true },
      orderBy: { nombre: 'asc' },
    });
    return NextResponse.json({ ok: true, data: users });
  } catch (e) { return handleError(e); }
});

export const POST = withAdmin(async (req) => {
  try {
    const { nombre, correo, password, roleId } = await req.json();
    if (!nombre || !correo || !password || !roleId) {
      throw new AppError('Todos los campos son requeridos', 400);
    }
    const exists = await prisma.user.findUnique({ where: { correo } });
    if (exists) throw new AppError('El correo ya está registrado', 409);

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { nombre, correo, password: hashed, roleId },
      include: { role: true },
    });
    return NextResponse.json({ ok: true, data: user }, { status: 201 });
  } catch (e) { return handleError(e); }
});
