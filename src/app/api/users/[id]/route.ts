import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { withAdmin } from '@/lib/auth';
import { handleError, AppError } from '@/lib/errors';

export const PUT = withAdmin(async (req, { params }, user) => {
  try {
    const { nombre, correo, roleId, password } = await req.json();
    const found = await prisma.user.findUnique({ where: { id: params.id } });
    if (!found) throw new AppError('Usuario no encontrado', 404);

    if (correo && correo !== found.correo) {
      const dup = await prisma.user.findUnique({ where: { correo } });
      if (dup) throw new AppError('El correo ya está registrado', 409);
    }

    const data: any = {};
    if (nombre) data.nombre = nombre;
    if (correo) data.correo = correo;
    if (roleId) data.roleId = roleId;
    if (password) data.password = await bcrypt.hash(password, 10);

    const updated = await prisma.user.update({
      where: { id: params.id },
      data,
      select: { id: true, nombre: true, correo: true, activo: true, role: true, createdAt: true },
    });
    return NextResponse.json({ ok: true, data: updated });
  } catch (e) { return handleError(e); }
});

export const DELETE = withAdmin(async (_req, { params }, user) => {
  try {
    if (user.userId === params.id) throw new AppError('No podés eliminar tu propio usuario', 400);
    const found = await prisma.user.findUnique({ where: { id: params.id } });
    if (!found) throw new AppError('Usuario no encontrado', 404);
    await prisma.user.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true, message: 'Usuario eliminado' });
  } catch (e) { return handleError(e); }
});

export const PATCH = withAdmin(async (_req, { params }) => {
  try {
    const found = await prisma.user.findUnique({ where: { id: params.id } });
    if (!found) throw new AppError('Usuario no encontrado', 404);
    const updated = await prisma.user.update({
      where: { id: params.id },
      data: { activo: !found.activo },
      include: { role: true },
    });
    return NextResponse.json({ ok: true, data: updated });
  } catch (e) { return handleError(e); }
});
