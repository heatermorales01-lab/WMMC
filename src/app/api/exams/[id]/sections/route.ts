import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdmin } from '@/lib/auth';
import { handleError, AppError } from '@/lib/errors';

// POST — agrega una sección nueva al final del examen (ej. "Herramientas",
// "Casos prácticos"). `opcional: true` = no suma al puntaje de 100.
export const POST = withAdmin(async (req, { params }) => {
  try {
    const { nombre, opcional } = await req.json();
    if (!nombre?.trim()) throw new AppError('El nombre de la sección es obligatorio', 400);

    const exam = await (prisma as any).exam.findUnique({ where: { id: params.id } });
    if (!exam) throw new AppError('Examen no encontrado', 404);

    const ultima = await (prisma as any).examSection.findFirst({
      where: { examId: params.id },
      orderBy: { orden: 'desc' },
    });

    const section = await (prisma as any).examSection.create({
      data: {
        examId: params.id,
        nombre: nombre.trim(),
        opcional: !!opcional,
        orden: (ultima?.orden ?? -1) + 1,
      },
    });

    return NextResponse.json({ ok: true, data: section, message: 'Sección agregada' }, { status: 201 });
  } catch (e) { return handleError(e); }
});
