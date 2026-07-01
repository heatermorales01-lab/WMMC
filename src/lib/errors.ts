import { NextResponse } from 'next/server';

export class AppError extends Error {
  constructor(public message: string, public statusCode: number = 500) {
    super(message);
    this.name = 'AppError';
  }
}

export function handleError(err: unknown): NextResponse {
  console.error('API Error:', err);
  if (err instanceof AppError) {
    return NextResponse.json({ ok: false, error: err.message }, { status: err.statusCode });
  }
  const e = err as any;
  if (e?.code === 'P2002') return NextResponse.json({ ok: false, error: 'Registro duplicado' }, { status: 409 });
  if (e?.code === 'P2025') return NextResponse.json({ ok: false, error: 'Registro no encontrado' }, { status: 404 });
  return NextResponse.json({ ok: false, error: 'Error interno del servidor' }, { status: 500 });
}
