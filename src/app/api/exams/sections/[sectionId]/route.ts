import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdmin } from '@/lib/auth';
import { handleError, AppError } from '@/lib/errors';

// PUT — edita nombre/orden/opcional de una sección.
export const PUT = withAdmin(async (req, { params }) => {
  try {
    const { nombre, opcional, orden } = await req.json();
    if (!nombre?.trim()) throw new AppError('El nombre de la sección es obligatorio', 400);

    const section = await (prisma as any).examSection.update({
      where: { id: params.sectionId },
      data: {
        nombre: nombre.trim(),
        opcional: !!opcional,
        ...(orden != null ? { orden: Number(orden) } : {}),
      },
    });

    return NextResponse.json({ ok: true, data: section, message: 'Sección actualizada' });
  } catch (e) { return handleError(e); }
});

// DELETE — borra la sección y, en cascada, sus preguntas/opciones (ver
// onDelete: Cascade en el schema). No borra intentos ya enviados: esas
// respuestas quedan huérfanas de su pregunta solo si se borra una
// sección que ya tenía intentos — por eso el constructor solo debería
// usarse para armar un examen ANTES de publicarlo; una vez con intentos,
// lo correcto es crear una versión nueva del examen en vez de editar la
// estructura de uno en uso.
export const DELETE = withAdmin(async (_req, { params }) => {
  try {
    await (prisma as any).examSection.delete({ where: { id: params.sectionId } });
    return NextResponse.json({ ok: true, message: 'Sección eliminada' });
  } catch (e) { return handleError(e); }
});
