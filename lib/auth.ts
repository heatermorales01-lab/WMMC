import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { handleError } from './errors';

export interface JwtPayload {
  userId: string;
  roleId: string;
  roleName: string;
}

export function getTokenPayload(req: NextRequest): JwtPayload | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  try {
    return jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
  } catch {
    return null;
  }
}

type RouteHandler = (req: NextRequest, ctx: { params: any }, user: JwtPayload) => Promise<NextResponse>;

export function withAuth(handler: RouteHandler) {
  return async (req: NextRequest, ctx: { params: any }) => {
    const user = getTokenPayload(req);
    if (!user) return NextResponse.json({ ok: false, error: 'Token no proporcionado o inválido' }, { status: 401 });
    try { return await handler(req, ctx, user); } catch (e) { return handleError(e); }
  };
}

export function withAdmin(handler: RouteHandler) {
  return async (req: NextRequest, ctx: { params: any }) => {
    const user = getTokenPayload(req);
    if (!user) return NextResponse.json({ ok: false, error: 'No autenticado' }, { status: 401 });
    if (user.roleName !== 'ADMINISTRADOR') return NextResponse.json({ ok: false, error: 'Solo administradores' }, { status: 403 });
    try { return await handler(req, ctx, user); } catch (e) { return handleError(e); }
  };
}

export function withBlockTrabajador(handler: RouteHandler) {
  return async (req: NextRequest, ctx: { params: any }) => {
    const user = getTokenPayload(req);
    if (!user) return NextResponse.json({ ok: false, error: 'No autenticado' }, { status: 401 });
    if (user.roleName === 'TRABAJADOR') return NextResponse.json({ ok: false, error: 'Acceso denegado para este rol' }, { status: 403 });
    try { return await handler(req, ctx, user); } catch (e) { return handleError(e); }
  };
}
