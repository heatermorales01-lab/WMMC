import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';
import { handleError } from '@/lib/errors';

export async function POST(req: NextRequest) {
  try {
    const { correo, password } = await req.json();
    if (!correo || !password) {
      return NextResponse.json({ ok: false, error: 'Correo y contraseña son requeridos' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { correo }, include: { role: true } });
    if (!user || !user.activo) {
      return NextResponse.json({ ok: false, error: 'Credenciales inválidas' }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return NextResponse.json({ ok: false, error: 'Credenciales inválidas' }, { status: 401 });

    const token = jwt.sign(
      { userId: user.id, roleId: user.roleId, roleName: user.role.nombre },
      process.env.JWT_SECRET!,
      { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any }
    );

    return NextResponse.json({
      ok: true,
      data: { token, user: { id: user.id, nombre: user.nombre, correo: user.correo, role: user.role.nombre } },
    });
  } catch (e) { return handleError(e); }
}
